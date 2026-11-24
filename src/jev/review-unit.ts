import { canonicalStringify, cyrb53Hex } from './cyrb53.js';

export interface ReviewNode {
  id: string;
  text: string;
  label: string;
  typeInt: number;
  sources: readonly string[];
}

export interface ReviewUnit {
  nodeId: string;
  kind: 'idea' | 'nested';
  question: { text: string };
  context: readonly { text: string }[];
  subject: ReviewNode;
  support: readonly ReviewNode[];
  /**
   * The ∴ line of an Argument-style unit, left out of `support`. Optional: units without one are
   * unchanged, and keep their 3.1.0 fingerprint.
   */
  conclusion?: ReviewNode;
}

/** `typeInt` 0-3 is the Question band. A Question child is read by Jev but is not a supporting statement. */
function isQuestionBand(typeInt: number): boolean {
  return typeInt >= 0 && typeInt <= 3;
}

/** Number of `support` items that are statements, i.e. whose `typeInt` is not in the Question band (0-3). */
export function supportingCount(unit: Pick<ReviewUnit, 'support'>): number {
  return unit.support.filter((item) => !isQuestionBand(item.typeInt)).length;
}

type FingerprintNode = {
  label: string;
  sources: readonly string[];
  text: string;
  typeInt: number;
};

function fingerprintNode(node: ReviewNode): FingerprintNode {
  return {
    label: node.label,
    sources: node.sources,
    text: node.text,
    typeInt: node.typeInt,
  };
}

/**
 * Content fingerprint for review staleness (P2, P3, S7): the Question text, the context texts, the
 * subject and every `support` child, in order, plus the `conclusion` when the unit has one (SR2). A unit
 * without a conclusion hashes exactly as it did in 3.1.0. Computed on the unit as received, before glyph
 * strip in builders.
 */
export function fingerprintReviewUnit(unit: ReviewUnit): string {
  const payload: {
    conclusion?: FingerprintNode;
    context: string[];
    question: string;
    subject: FingerprintNode;
    support: FingerprintNode[];
  } = {
    context: unit.context.map((item) => item.text),
    question: unit.question.text,
    subject: fingerprintNode(unit.subject),
    support: unit.support.map(fingerprintNode),
  };
  if (unit.conclusion) payload.conclusion = fingerprintNode(unit.conclusion);
  return cyrb53Hex(canonicalStringify(payload));
}