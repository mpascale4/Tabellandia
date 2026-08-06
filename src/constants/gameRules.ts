/**
 * Game Rules, Costs, Rewards and Dynamic Message Constants
 */

export const MONUMENT_CLUE_COST = 15; // Cost in Light Drops for each clue/monument

export const PRATICO_REWARD_COINS = 1; // Each Pratico cycle rewards 1 coin
export const PRATICO_REWARD_DROPS = 0;

export const SFIDA_UNLOCK_COST = 1; // Coins required to play Sfida
export const SFIDA_FEEDBACK_HOLD_MS = 120;

export const SFIDA_DROPS_LOW_THRESHOLD = 10;
export const SFIDA_DROPS_MID_THRESHOLD = 14;
export const SFIDA_DROPS_HIGH_THRESHOLD = 17;

export const SFIDA_DROPS_LOW_REWARD = 15;  // 10 to 13 correct
export const SFIDA_DROPS_MID_REWARD = 30;  // 14 to 16 correct
export const SFIDA_DROPS_HIGH_REWARD = 45; // 17+ correct

export const SFIDA_RECORD_THRESHOLD = 15;  // Threshold for record bonus (2x)

export const GAME_REWARDS_CONFIG = {
  comprendo: { coins: 0, drops: 0 },
  salto: { coins: 0, drops: 0 },
  costruisco: { coins: 0, drops: 0 },
  trucchi: { coins: 0, drops: 0 },
  pratico: { coins: PRATICO_REWARD_COINS, drops: PRATICO_REWARD_DROPS },
  sfida: { coins: 0, drops: 0 },
};

export function getMonumentCostMissingMessage(monumentName: string, cost: number, currentDrops: number): string {
  const missing = Math.max(0, cost - currentDrops);
  return `Per aprire ${monumentName} ti mancano ${missing} Gocce di Luce.`;
}

export function getSfidaUnlockMissingCoinsMessage(currentCoins: number): string {
  const missing = Math.max(0, SFIDA_UNLOCK_COST - currentCoins);
  return `Ti servono ancora ${missing} monete per entrare nella Sfida.`;
}

export function getSfidaDropsRewardForScore(score: number, isNewRecord: boolean = false): number {
  let baseReward = 0;
  if (score >= SFIDA_DROPS_HIGH_THRESHOLD) {
    baseReward = SFIDA_DROPS_HIGH_REWARD;
  } else if (score >= SFIDA_DROPS_MID_THRESHOLD) {
    baseReward = SFIDA_DROPS_MID_REWARD;
  } else if (score >= SFIDA_DROPS_LOW_THRESHOLD) {
    baseReward = SFIDA_DROPS_LOW_REWARD;
  }

  return isNewRecord ? baseReward * 2 : baseReward;
}
