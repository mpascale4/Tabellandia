/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Italian number words and article helpers used for text-to-speech feedback across mini-games
export const ITALIAN_NUMBER_WORDS: Record<number, string> = {
  0: 'zero',
  1: 'uno',
  2: 'due',
  3: 'tre',
  4: 'quattro',
  5: 'cinque',
  6: 'sei',
  7: 'sette',
  8: 'otto',
  9: 'nove',
  10: 'dieci',
  11: 'undici',
  12: 'dodici',
  13: 'tredici',
  14: 'quattordici',
  15: 'quindici',
  16: 'sedici',
  17: 'diciassette',
  18: 'diciotto',
  19: 'diciannove',
  20: 'venti',
};

export const toItalianWord = (value: number): string => ITALIAN_NUMBER_WORDS[value] ?? value.toString();

const startsWithLoArticle = (word: string): boolean => /^(z|x|y|ps|pn|gn|s[^aeiou])/i.test(word.trim());

export const withItalianArticle = (word: string): string => {
  const normalized = word.trim();
  if (!normalized) return "l'ostacolo";
  return `${startsWithLoArticle(normalized) ? 'lo' : 'il'} ${normalized}`;
};
