const RESULT_ENCOURAGEMENTS = [
  'bravissimo!',
  'ottimo lavoro!',
  'grande!',
  'sei fortissimo!',
  'continua così!'
] as const;

/** Annuncia l'operazione da risolvere (es. "due per tre"), letta ad alta voce non appena compare. */
export const buildOperationSpeech = (a: number, b: number) => `${a} per ${b}`;

export const buildMultiplicationResultSpeech = (a: number, b: number, result: number) => {
  const encouragement = RESULT_ENCOURAGEMENTS[Math.floor(Math.random() * RESULT_ENCOURAGEMENTS.length)];
  return `${a} per ${b} ${result}. ${encouragement}`;
};
