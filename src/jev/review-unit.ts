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
  kind: 'idea' | 'nested_claim';
  question: { text: string };
  context: readonly { text: string }[];
  subject: ReviewNode;
  claims: readonly ReviewNode[];
  truncatedClaims: number;
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

/** Content fingerprint for review staleness (P2, P3). Computed on the unit as received, before glyph strip in builders. */
export function fingerprintReviewUnit(unit: ReviewUnit): string {
  const payload = {
    claims: unit.claims.map(fingerprintNode),
    context: unit.context.map((item) => item.text),
    question: unit.question.text,
    subject: fingerprintNode(unit.subject),
  };
  return cyrb53Hex(canonicalStringify(payload));
}