import type { DecisionPrompt, DecisionQuestion } from '../render/decision-questions.js';

import { stripSymthinkGlyphs } from './glyphs.js';
import {
  JEV_REVIEW_QUESTIONS,
  weakItemOptionId,
  type ReviewQuestionContext,
  type ReviewQuestionEntry,
  type ReviewQuestionKind,
  type ReviewStateKeys,
} from './review-questions.js';
import { supportingCount, type ReviewNode, type ReviewUnit } from './review-unit.js';

export type BuildReviewRequestOptions = {
  includeFallacies?: boolean;
  /**
   * Ask the scheme, structure and critical questions (set 3.2.0). Defaults to `false`, so a request
   * built without it has exactly the 3.1.0 question keys.
   */
  includeScheme?: boolean;
};

const SCHEME_KINDS: ReadonlySet<ReviewQuestionKind> = new Set(['scheme', 'structure', 'critical']);

/** What `buildReviewRequest` returns: the System One request, plus what the app needs to read the answers. */
export type BuiltReviewRequest = Omit<DecisionPrompt, 'state'> & {
  /** Always an object: `{ question, idea, support, conclusion? }`. */
  state: Record<string, unknown>;
  /**
   * Maps each `weak_item` option id (`i1`, `i2`, ...) to the id of the point it names, so the app can turn
   * the answer back into a node. Empty when `weak_item` is not asked. Not part of the request sent to Jev:
   * send only `state` and `questions`.
   */
  weakItemOptions: Record<string, string>;
};

function resolveQuestion(
  entry: ReviewQuestionEntry,
  keys: ReviewStateKeys,
  context: ReviewQuestionContext,
): DecisionQuestion {
  const question = entry.question;
  return typeof question === 'function' ? question(keys, context) : question;
}

/** The subject of every unit is an Idea (one Idea under a Question), so it is always sent as `idea`. */
export function reviewStateKeys(_unit?: Pick<ReviewUnit, 'kind' | 'subject'>): ReviewStateKeys {
  return { subject: 'idea' };
}

/** A node with glyphs stripped and blank items dropped. Ids stay here, and are not sent to Jev. */
type CleanNode = { id: string; text: string; group?: true; support?: CleanNode[] };

function cleanNode(node: ReviewNode): CleanNode | undefined {
  const text = stripSymthinkGlyphs(node.text.trim()).trim();
  if (text.length === 0) return undefined;
  const support = (node.support ?? [])
    .map(cleanNode)
    .filter((child): child is CleanNode => child !== undefined);
  // A grouping with nothing under it says nothing, so it is dropped (as tree does).
  if (node.group && support.length === 0) return undefined;
  const clean: CleanNode = { id: node.id, text };
  if (node.group) clean.group = true;
  if (support.length > 0) clean.support = support;
  return clean;
}

type StateItem = { text: string; group?: true; support?: StateItem[] };

/** The nested JSON Jev reads: `{ text, group?, support? }`, with no ids. */
function stateItem(node: CleanNode): StateItem {
  const item: StateItem = { text: node.text };
  if (node.group) item.group = true;
  if (node.support) item.support = node.support.map(stateItem);
  return item;
}

/** Build the Jev review request for one Idea, reviewed as one argument (a tree). */
export function buildReviewRequest(
  unit: ReviewUnit,
  options: BuildReviewRequestOptions = {},
): BuiltReviewRequest {
  const { includeFallacies = true, includeScheme = false } = options;
  const keys = reviewStateKeys(unit);

  const support = unit.support
    .map(cleanNode)
    .filter((item): item is CleanNode => item !== undefined);

  const state: Record<string, unknown> = {
    question: stripSymthinkGlyphs(unit.question.text),
    [keys.subject]: stripSymthinkGlyphs(unit.subject.text),
    support: support.map(stateItem),
  };

  // The points that have sub-points, in tree order: the candidates for `weak_item`.
  const weakItems = support
    .flatMap((item) => (item.group ? (item.support ?? []) : [item]))
    .filter((point) => point.support !== undefined);
  const weakItemOptions: Record<string, string> = {};
  weakItems.forEach((point, index) => {
    weakItemOptions[weakItemOptionId(index)] = point.id;
  });
  const context: ReviewQuestionContext = { weakItemTexts: weakItems.map((point) => point.text) };

  // The ∴ line is sent whenever the unit has one, whether or not the scheme questions are asked.
  const conclusionText = unit.conclusion ? stripSymthinkGlyphs(unit.conclusion.text).trim() : '';
  const hasConclusion = conclusionText.length > 0;
  if (hasConclusion) state.conclusion = conclusionText;

  const supporting = supportingCount(unit);
  const questions: Record<string, DecisionQuestion> = {};

  for (const entry of JEV_REVIEW_QUESTIONS) {
    if (!entry.enabled) continue;
    if (entry.kind === 'fallacy' && !includeFallacies) continue;
    if (SCHEME_KINDS.has(entry.kind) && !includeScheme) continue;
    if (entry.requiresConclusion && !hasConclusion) continue;
    if (entry.minSupporting !== undefined && supporting < entry.minSupporting) continue;
    if (entry.requiresSubPoints && weakItems.length === 0) continue;
    if (entry.sentWith !== undefined && questions[entry.sentWith] === undefined) continue;
    questions[entry.key] = resolveQuestion(entry, keys, context);
  }

  // `weak_item` is only asked alongside `sub_support_backs`, so its options are only handed back then.
  return { state, questions, weakItemOptions: questions.weak_item ? weakItemOptions : {} };
}
