/**
 * Tipi e costanti condivise dai 9 mini-giochi retro-arcade sbloccati con un
 * 10/10 in Allenamento (vedi TrainingHub.tsx + ArcadeMenuModal.tsx).
 */

export interface ArcadeGameProps {
  onExit: () => void;
}

export const ARCADE_CANVAS_WIDTH = 270;
export const ARCADE_CANVAS_HEIGHT = 270;

// Difficolta progressiva: ogni RAMP_INTERVAL_MS trascorsi in partita la
// difficolta sale di un gradino, fino a un massimo di MAX_DIFFICULTY_LEVEL,
// poi si stabilizza (Flappy, Dino Run, Invasori, Snake, Breakout, Talpa).
export const RAMP_INTERVAL_MS = 12000;
export const MAX_DIFFICULTY_LEVEL = 4;

export function getDifficultyLevel(elapsedMs: number): number {
  return Math.min(MAX_DIFFICULTY_LEVEL, Math.floor(elapsedMs / RAMP_INTERVAL_MS));
}

// Record personali dei mini-giochi: salvati globalmente sul dispositivo
// (non per singolo profilo bambino) in localStorage, cosi restano anche
// dopo un refresh. 'max' = punteggio piu alto vince (default), 'min' = va
// bene il valore piu basso (es. Memory: meno mosse e meglio).
const HIGH_SCORE_PREFIX = 'tabellandia_arcade_record_';
export type HighScoreMode = 'max' | 'min';

export function getHighScore(gameId: string): number | null {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_PREFIX + gameId);
    return raw !== null ? Number(raw) : null;
  } catch {
    return null;
  }
}

/** Salva il nuovo valore come record solo se migliora quello esistente; restituisce il record aggiornato. */
export function updateHighScore(gameId: string, value: number, mode: HighScoreMode = 'max'): number {
  const current = getHighScore(gameId);
  const isBetter = current === null || (mode === 'max' ? value > current : value < current);
  const next = isBetter ? value : current;
  try {
    localStorage.setItem(HIGH_SCORE_PREFIX + gameId, String(next));
  } catch {
    // localStorage non disponibile (es. modalità privata): il record non viene persistito.
  }
  return next;
}
