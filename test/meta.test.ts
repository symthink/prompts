import Mustache from 'mustache';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { bundle as externalChatBundle } from '../src/generated/external-chat.js';
import { bundle as symthinkApiBundle } from '../src/generated/symthink-api.js';
import { promptMetaSchema } from '../src/registry/meta-schema.js';
import { promptRegistry } from '../src/registry/index.js';
import { buildView } from '../src/render/engine.js';
import { definitionsByDelivery, loadFixtures } from './helpers.js';

const bundles = { 'external-chat': externalChatBundle, 'symthink-api': symthinkApiBundle };
const fixtures = loadFixtures();

function objectShape(schema: z.ZodType): Record<string, z.ZodType> {
  if (!(schema instanceof z.ZodObject)) throw new Error('Prompt schemas must be z.strictObject(...)');
  return schema.shape as Record<string, z.ZodType>;
}

/** Every key at any depth of a value, so nested section names (e.g. `{{name}}` inside `{{#districts}}`) count. */
function collectKeys(value: unknown, keys: Set<string>): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

interface SchemaDef {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  innerType?: z.ZodType;
  options?: z.ZodType[];
  in?: z.ZodType;
}

/** Every object key the schema can produce, at any depth (optional fields included). */
function schemaKeys(schema: z.ZodType, keys: Set<string>): Set<string> {
  const def = (schema as unknown as { def: SchemaDef }).def;
  if (def.shape) {
    for (const [key, child] of Object.entries(def.shape)) {
      keys.add(key);
      schemaKeys(child, keys);
    }
  }
  for (const child of [def.element, def.innerType, def.in, ...(def.options ?? [])]) {
    if (child) schemaKeys(child, keys);
  }
  return keys;
}

type Token = [string, string, number, number, Token[]?];

/** First path segment of every variable and section tag in a template, plus the partials it includes. */
function templateNames(template: string) {
  const names = new Set<string>();
  const partials = new Set<string>();
  const walk = (tokens: Token[]) => {
    for (const [type, value, , , children] of tokens) {
      if (type === 'name' || type === '&' || type === '#' || type === '^') {
        if (value !== '.') names.add(value.split('.')[0]!);
      } else if (type === '>') {
        partials.add(value);
      }
      if (children) walk(children);
    }
  };
  walk(Mustache.parse(template) as Token[]);
  return { names, partials };
}

/** Names a prompt's templates can resolve: schema keys at any depth plus everything its view produces. */
function availableNames(meta: (typeof promptRegistry)[number]): Set<string> {
  const definition = definitionsByDelivery[meta.delivery]![meta.id]!;
  const available = schemaKeys(definition.schema, new Set());
  for (const fixture of fixtures.filter((item) => item.promptId === meta.id)) {
    const data = definition.schema.parse(fixture.vars) as Record<string, unknown>;
    collectKeys(buildView(definition, data), available);
  }
  return available;
}

describe.each(promptRegistry)('$id', (meta) => {
  const definition = definitionsByDelivery[meta.delivery]?.[meta.id];

  it('has valid meta.json', () => {
    expect(promptMetaSchema.safeParse(meta).error?.issues ?? []).toEqual([]);
  });

  it(`is registered in the ${meta.delivery} entrypoint with matching id and output`, () => {
    expect(definition, `add ${meta.id} to src/${meta.delivery}/index.ts`).toBeDefined();
    expect(definition!.id).toBe(meta.id);
    expect(definition!.output).toBe(meta.output);
  });

  it('documents exactly the schema variables, with matching required flags', () => {
    const shape = objectShape(definition!.schema);
    expect(meta.variables.map((variable) => variable.name).sort()).toEqual(Object.keys(shape).sort());
    for (const variable of meta.variables) {
      const required = !shape[variable.name]!.safeParse(undefined).success;
      expect(required, `meta.json "required" for ${variable.name}`).toBe(variable.required);
    }
  });

  it('only uses template names that the variables or view provide', () => {
    const available = availableNames(meta);
    const unknown = Object.values(bundles[meta.delivery].templates[meta.id] ?? {}).flatMap((template) =>
      [...templateNames(template).names].filter((name) => !available.has(name)),
    );
    expect(unknown).toEqual([]);
  });
});

describe('partials', () => {
  // A partial may read optional names that only some including prompts define
  // (e.g. `contestTitle` in ballot-context), so each name needs at least one provider.
  const includers = new Map<string, Set<string>>();
  const partialSources = new Map<string, string>();
  for (const meta of promptRegistry) {
    const bundle = bundles[meta.delivery];
    for (const [name, source] of Object.entries(bundle.partials)) partialSources.set(name, source);
    for (const template of Object.values(bundle.templates[meta.id] ?? {})) {
      for (const partial of templateNames(template).partials) {
        if (!includers.has(partial)) includers.set(partial, new Set());
        includers.get(partial)!.add(meta.id);
      }
    }
  }

  it.each([...partialSources.keys()])('%s only uses names some including prompt provides', (partial) => {
    const metas = promptRegistry.filter((meta) => includers.get(partial)?.has(meta.id));
    const available = new Set(metas.flatMap((meta) => [...availableNames(meta)]));
    const unknown = [...templateNames(partialSources.get(partial)!).names].filter((name) => !available.has(name));
    expect(unknown).toEqual([]);
  });
});

describe('entrypoints', () => {
  it('register no prompt without a meta.json of the same delivery', () => {
    const registered = Object.entries(definitionsByDelivery).flatMap(([delivery, definitions]) =>
      Object.keys(definitions).map((id) => `${delivery}:${id}`),
    );
    const expected = promptRegistry.map((meta) => `${meta.delivery}:${meta.id}`);
    expect(registered.sort()).toEqual(expected.sort());
  });
});
