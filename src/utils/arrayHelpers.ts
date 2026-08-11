/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fisher-Yates shuffle - returns a new array, does not mutate the input
export const shuffleArray = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const toAscendingOptions = (values: number[]): number[] => [...values].sort((a, b) => a - b);

// Picks up to `count` random, non-repeating elements from `source` via shuffle.
export const takeRandom = (source: number[], count: number): number[] => {
  if (count <= 0) return [];
  return shuffleArray(source).slice(0, count);
};
