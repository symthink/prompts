import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PROMPTS_DIR = path.join(ROOT, 'prompts');
export const PARTIALS_DIR = path.join(PROMPTS_DIR, '_partials');
export const GENERATED_DIR = path.join(ROOT, 'src', 'generated');

export const DELIVERIES = ['external-chat', 'symthink-api'];
export const OUTPUTS = { single: ['prompt'], system_user: ['system', 'user'] };
export const USAGE_STATUSES = ['active', 'mirrored', 'experimental', 'deprecated', 'reference'];

const PARTIAL_REF = /\{\{>\s*([\w-]+)\s*\}\}/g;

async function listDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export function partialRefs(template) {
  return [...template.matchAll(PARTIAL_REF)].map((match) => match[1]);
}

export async function loadPartials() {
  const entries = await readdir(PARTIALS_DIR);
  const partials = {};
  for (const file of entries.sort()) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    partials[file.slice(0, -3)] = await readFile(path.join(PARTIALS_DIR, file), 'utf8');
  }
  return partials;
}

function assertMeta(meta, expectedId, metaPath) {
  const problems = [];
  if (meta.id !== expectedId) problems.push(`id must be "${expectedId}" (got "${meta.id}")`);
  if (!DELIVERIES.includes(meta.delivery)) problems.push(`delivery must be one of ${DELIVERIES.join(', ')}`);
  if (!(meta.output in OUTPUTS)) problems.push(`output must be one of ${Object.keys(OUTPUTS).join(', ')}`);
  if (!USAGE_STATUSES.includes(meta.usage?.status)) {
    problems.push(`usage.status must be one of ${USAGE_STATUSES.join(', ')}`);
  }
  if (problems.length) {
    throw new Error(`${path.relative(ROOT, metaPath)}: ${problems.join('; ')}`);
  }
}

/** Reads every `prompts/<domain>/<slug>/` folder: its meta.json and template files. */
export async function loadPrompts() {
  const prompts = [];
  for (const domain of await listDirs(PROMPTS_DIR)) {
    for (const slug of await listDirs(path.join(PROMPTS_DIR, domain))) {
      const dir = path.join(PROMPTS_DIR, domain, slug);
      const metaPath = path.join(dir, 'meta.json');
      if (!existsSync(metaPath)) {
        throw new Error(`${path.relative(ROOT, dir)} is missing meta.json`);
      }
      const meta = JSON.parse(await readFile(metaPath, 'utf8'));
      assertMeta(meta, `${domain}.${slug}`, metaPath);

      const templates = {};
      for (const part of OUTPUTS[meta.output]) {
        const file = path.join(dir, `${part}.md`);
        if (!existsSync(file)) {
          throw new Error(`${path.relative(ROOT, dir)} (output "${meta.output}") is missing ${part}.md`);
        }
        templates[part] = await readFile(file, 'utf8');
      }
      prompts.push({ domain, slug, dir, meta: { ...meta, domain }, templates });
    }
  }
  return prompts;
}

/** Partials referenced by the given templates, including partials referenced from partials. */
export function resolvePartials(templates, partials, owner) {
  const needed = new Set();
  const queue = templates.flatMap((template) => partialRefs(template));
  while (queue.length) {
    const name = queue.shift();
    if (needed.has(name)) continue;
    if (!(name in partials)) {
      throw new Error(`${owner} references missing partial "${name}" (expected prompts/_partials/${name}.md)`);
    }
    needed.add(name);
    queue.push(...partialRefs(partials[name]));
  }
  return [...needed].sort();
}
