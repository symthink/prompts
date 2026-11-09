import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PROMPTS_DIR = path.join(ROOT, 'prompts');
export const PARTIALS_DIR = path.join(PROMPTS_DIR, '_partials');
export const GENERATED_DIR = path.join(ROOT, 'src', 'generated');

export const DELIVERIES = ['external-chat', 'symthink-api'];
export const OUTPUTS = { single: ['prompt'], system_user: ['system', 'user'], decision: ['state'] };
const DECISION_QUESTION_TYPES = ['boolean', 'choice', 'score', 'box'];
export const USAGE_STATUSES = ['active', 'mirrored', 'experimental', 'deprecated', 'reference'];

const PARTIAL_REF = /\{\{>\s*([\w-]+)\s*\}\}/g;
const OUTPUT_FORMATS = ['paste-back-markdown', 'json', 'text', 'decision'];
const PROMPT_CAPABILITIES = ['web_search'];

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
  if (!OUTPUT_FORMATS.includes(meta.outputFormat)) {
    problems.push(`outputFormat must be one of ${OUTPUT_FORMATS.join(', ')}`);
  }
  if (meta.output === 'decision' && meta.outputFormat !== 'decision') {
    problems.push('decision prompts must set outputFormat to "decision"');
  }
  if (meta.output !== 'decision' && meta.outputFormat === 'decision') {
    problems.push('outputFormat "decision" is only valid when output is "decision"');
  }
  if (!Array.isArray(meta.requires)) {
    problems.push('requires must be an array');
  } else if (!meta.requires.every((item) => PROMPT_CAPABILITIES.includes(item))) {
    problems.push(`requires entries must be one of ${PROMPT_CAPABILITIES.join(', ')}`);
  }
  if (problems.length) {
    throw new Error(`${path.relative(ROOT, metaPath)}: ${problems.join('; ')}`);
  }
}

function assertDecisionQuestions(questions, dir) {
  if (!questions || typeof questions !== 'object' || Array.isArray(questions)) {
    throw new Error(`${path.relative(ROOT, dir)}: questions.json must be a non-array object`);
  }
  for (const [key, question] of Object.entries(questions)) {
    if (!key) throw new Error(`${path.relative(ROOT, dir)}: questions.json has an empty key`);
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      throw new Error(`${path.relative(ROOT, dir)}: questions.${key} must be an object`);
    }
    if (!DECISION_QUESTION_TYPES.includes(question.type)) {
      throw new Error(
        `${path.relative(ROOT, dir)}: questions.${key}.type must be one of ${DECISION_QUESTION_TYPES.join(', ')}`,
      );
    }
    if (typeof question.instructions !== 'string') {
      throw new Error(`${path.relative(ROOT, dir)}: questions.${key}.instructions must be a string`);
    }
    if (question.choices != null && !Array.isArray(question.choices)) {
      throw new Error(`${path.relative(ROOT, dir)}: questions.${key}.choices must be an array when present`);
    }
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
      if (meta.output === 'decision') {
        for (const part of OUTPUTS.decision) {
          const file = path.join(dir, `${part}.md`);
          if (!existsSync(file)) {
            throw new Error(`${path.relative(ROOT, dir)} (output "decision") is missing ${part}.md`);
          }
          templates[part] = await readFile(file, 'utf8');
        }
        const questionsPath = path.join(dir, 'questions.json');
        if (!existsSync(questionsPath)) {
          throw new Error(`${path.relative(ROOT, dir)} (output "decision") is missing questions.json`);
        }
        templates.questions = JSON.parse(await readFile(questionsPath, 'utf8'));
        assertDecisionQuestions(templates.questions, dir);
      } else {
        for (const part of OUTPUTS[meta.output]) {
          const file = path.join(dir, `${part}.md`);
          if (!existsSync(file)) {
            throw new Error(`${path.relative(ROOT, dir)} (output "${meta.output}") is missing ${part}.md`);
          }
          templates[part] = await readFile(file, 'utf8');
        }
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
