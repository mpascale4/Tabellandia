/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure helpers for the Salto exercise's obstacle ("antagonist") layout.
 * Extracted from WorldDetail.tsx: no React state involved, safe to unit test in isolation.
 */
import { shuffleArray } from './arrayHelpers';

const SALTO_OBSTACLE_START_FACTOR = 1;

export const SALTO_ANTAGONISTS = [
  { id: 'snake', label: 'serpente', emoji: '🐍' },
  { id: 'bat', label: 'pipistrello', emoji: '🦇' },
  { id: 'spider', label: 'ragno', emoji: '🕷️' },
  { id: 'scorpion', label: 'scorpione', emoji: '🦂' },
] as const;

export type SaltoAntagonist = typeof SALTO_ANTAGONISTS[number];

export const pickRandomSaltoAntagonist = (): SaltoAntagonist => {
  const index = Math.floor(Math.random() * SALTO_ANTAGONISTS.length);
  return SALTO_ANTAGONISTS[index];
};

export const buildSaltoEnemyLayout = (factor: number): { steps: number[]; antagonistsByStep: Record<number, SaltoAntagonist> } => {
  if (factor < SALTO_OBSTACLE_START_FACTOR) {
    return { steps: [], antagonistsByStep: {} };
  }
  if (factor === 1) {
    const antagonist = pickRandomSaltoAntagonist();
    return { steps: [1], antagonistsByStep: { 1: antagonist } };
  }
  const enemyCountTarget =
    factor >= 8
      ? 3
      : factor >= 6
        ? 2
        : 1;
  const availableSteps = Array.from({ length: Math.max(0, factor - 2) }).map((_, idx) => idx + 2);
  const selectedSteps = shuffleArray(availableSteps)
    .slice(0, Math.min(enemyCountTarget, availableSteps.length))
    .sort((a, b) => a - b);
  const antagonistsByStep: Record<number, SaltoAntagonist> = {};
  selectedSteps.forEach((step) => {
    antagonistsByStep[step] = pickRandomSaltoAntagonist();
  });
  return { steps: selectedSteps, antagonistsByStep };
};
