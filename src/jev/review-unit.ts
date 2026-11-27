import { canonicalStringify, cyrb53Hex } from './cyrb53.js';

/**
 * One node of the argument tree. A statement (a point or a sub-point) always carries `label`, `typeInt`
 * and `sources`. A grouping heading (`group: true`, such as "Pros" or "Cons") leaves them out. `support`
 * holds the node's children: sub-points under a point, or points under a grouping.
 */
export interface ReviewNode {
  id: string;
  text: string;
  label?: string;
  typeInt?: number;
  sources?: readonly string[];
  /** Absent when unused. */
  support?: readonly ReviewNode[];
  /** `true` on a grouping heading, absent otherwise. */
  group?: true;
}

export interface ReviewUnit {
  nodeId: string;
  /** Every unit is one Idea under a Question, reviewed as one argument (a tree). */
  kind: 'idea';
  question: { text: string };
  context: readonly { text: string }[];
  subject: ReviewNode;
  /**
   * The Idea's points, as a tree: each point may carry sub-points in its own `support`. When the Idea's
   * supports are groupings, `support` holds the groupings (`group: true`) and the points sit inside them.
   */
  support: readonly ReviewNode[];
  /**
   * The ∴ line of an Argument-style unit, left out of `support`. Optional: units without one are
   * unchanged. Groupings and a conclusion are never both present.
   */
  conclusion?: ReviewNode;
}

/** `typeInt` 0-3 is the Question band. A Question child is read by Jev but is not a supporting statement. */
function isQuestionBand(typeInt: number | undefined): boolean {
  return typeInt !== undefined && typeInt >= 0 && typeInt <= 3;
}

/**
 * The argument's points: the top-level `support` items, or, for a grouping, the items inside it (the
 * grouping level is not counted). Sub-points are not points.
 */
export function argumentPoints(unit: Pick<ReviewUnit, 'support'>): ReviewNode[] {
  return unit.support.flatMap((item) => (item.group ? [...(item.support ?? [])] : [item]));
}

/**
 * Number of points (see `argumentPoints`) that are statements, i.e. whose `typeInt` is not in the
 * Question band (0-3). Sub-points and grouping headings are not counted.
 */
export function supportingCount(unit: Pick<ReviewUnit, 'support'>): number {
  return argumentPoints(unit).filter((item) => !isQuestionBand(item.typeInt)).length;
}

type FingerprintNode = {
  group?: true;
  label?: string;
  sources?: readonly string[];
  support?: FingerprintNode[];
  text: string;
  typeInt?: number;
};

/** Optional keys are left out when absent, so a flat node hashes by its own four fields. */
function fingerprintNode(node: ReviewNode): FingerprintNode {
  const out: FingerprintNode = { text: node.text };
  if (node.label !== undefined) out.label = node.label;
  if (node.sources !== undefined) out.sources = node.sources;
  if (node.typeInt !== undefined) out.typeInt = node.typeInt;
  if (node.group) out.group = true;
  if (node.support && node.support.length > 0) out.support = node.support.map(fingerprintNode);
  return out;
}

/**
 * Content fingerprint for review staleness (P2, P3, S7): the Question text, the context texts, the
 * subject and every `support` node, in order and with their nested `support` and `group` flag, plus the
 * `conclusion` when the unit has one (SR2). Computed on the unit as received, before glyph strip in
 * builders.
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
