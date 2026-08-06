/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AvatarConfig {
  emoji: string; // Avatar emoji
  gender?: 'kid1' | 'kid2';
  hairStyle?: string;
  hairColor?: string;
  shirtColor?: string;
  pantsColor?: string;
  hat?: string;
  backpack?: string;
  mascot?: string;
}

export interface RebuiltMonument {
  id: string;
  name: string;
  cost: number;
  completed: boolean;
}

export interface WorldProgress {
  worldId: number; // 2 to 9
  completedSteps: string[]; // ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida']
  lockedSteps?: string[]; // Step IDs blocked by dev tools
  praticoCyclesCompleted?: number; // Number of completed Pratico streak cycles in this world
  sfidaUnlocked?: boolean; // Permanent unlock for Sfida in this world/tabellina
  rebuiltMonuments: string[]; // IDs of monuments rebuilt
  lockedMonuments?: string[]; // Clue IDs blocked by dev tools
  devCoins?: number; // Dev-only per-world coin counter
  devLightDrops?: number; // Dev-only per-world droplet counter
  creatureEvolution: 'egg' | 'child' | 'adult';
  highScore: number; // Max correct answers in Time Trial
  stars: number; // 0 to 3 stars
  completedFactors?: {
    comprendo?: number[];
    salto?: number[];
    costruisco?: number[];
    trucchi?: number[];
  };
}

export interface QuestionAttempt {
  a: number;
  b: number;
  correct: boolean;
  responseTimeMs: number;
  timestamp: string;
}

export type HelperGuidanceKey =
  | 'comprendoTouch'
  | 'comprendoAvoid'
  | 'comprendoBonus'
  | 'saltoTouch'
  | 'saltoAvoid'
  | 'costruiscoTouch'
  | 'costruiscoAvoid'
  | 'trucchiTouch'
  | 'trucchiAvoid'
  | 'sfidaStart';

export type HelperGuidanceState = Record<HelperGuidanceKey, boolean>;

export interface UserProfile {
  id?: string;
  birthYear?: number | null;
  deletedAt?: string | null;
  scheduledPermanentDeletionAt?: string | null;
  name: string;
  level: number;
  xp: number;
  coins: number; // Currency earned by correct answers to spend in the shop
  lightDrops: number; // Currency earned to restore Tabellandia
  avatar: AvatarConfig;
  unlockedWorlds: number[]; // [2, 3, etc.]
  unlockedAccessories: string[]; // list of item IDs unlocked in shop
  worldProgress: { [worldId: number]: WorldProgress };
  history: QuestionAttempt[];
  completedOnboardingGame?: boolean;
  helperGuidanceSeen?: Partial<HelperGuidanceState>;
}

export interface WorldConfig {
  id: number; // 2 to 9
  name: string;
  locationName: string; // e.g. "Foresta del 2"
  color: string; // Tailwind class
  accentColor: string; // Tailwind accent border/bg class
  symbol: string; // Unicode or icon key
  mascotName: string;
  mascotRole: string;
  creatureName: string;
  creatureDescription: string;
  filastrocca: string;
  trickTitle: string;
  trickDescription: string;
  trickVisualExplanation: string;
  itemsToCount: string; // Emoji representing the item (e.g. "🌳", "💧", "⛰️", "🍄", "🔥", "🔑", "⚙️", "🐢", "👑")
  monuments: { id: string; name: string; cost: number; description: string; emoji: string }[];
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'hair' | 'shirt' | 'pants' | 'hat' | 'backpack';
  cost: number;
  value: string; // HEX color or style ID
  previewEmoji?: string;
}
