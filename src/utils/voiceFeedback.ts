const RESULT_ENCOURAGEMENTS = [
  'bravissimo!',
  'ottimo lavoro!',
  'grande!',
  'sei fortissimo!',
  'continua così!'
] as const;

export const buildMultiplicationResultSpeech = (a: number, b: number, result: number) => {
  const encouragement = RESULT_ENCOURAGEMENTS[Math.floor(Math.random() * RESULT_ENCOURAGEMENTS.length)];
  return `${a} per ${b} ${result}. ${encouragement}`;
};
