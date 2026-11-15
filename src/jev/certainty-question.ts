export const CERTAINTY_CRITERIA = [
  'Asks: poses something to be answered or wondered about',
  'Proposes: offers a possibility, suggestion or hypothesis, using words such as might, could, probably, perhaps, or what if',
  'Asserts: states something as true or settled, without hedging',
] as const;

export const CERTAINTY_INSTRUCTIONS_FOR = (stateKey: string) =>
  `How certain does the wording of \`${stateKey}\` present itself as being? Judge the wording only, not whether the statement is true.`;