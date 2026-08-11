/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useCostruiscoShieldBonus - self-contained logic for the "Scudo anti-bomba"
 * helper bonus in the Scoppia (Costruisco) mini-game. A floating shield icon
 * appears after a period of inactivity; tapping it arms a one-shot shield.
 * While armed, the next tap on a bomb balloon is converted into a win instead
 * of a failure (see CostruiscoExercise's tap handler for the consumption side).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../components/SoundManager';

const SHIELD_SPAWN_DELAY_MS = 2000;
const SHIELD_TRAVEL_MS = 5200;
const SHIELD_TRAVEL_MS_REDUCED_MOTION = 1400;

interface UseCostruiscoShieldBonusParams {
  isGameActive: boolean;
  prefersReducedMotion: boolean;
}

export function useCostruiscoShieldBonus({ isGameActive, prefersReducedMotion }: UseCostruiscoShieldBonusParams) {
  const [isShieldVisible, setIsShieldVisible] = useState<boolean>(false);
  const [isShieldArmed, setIsShieldArmed] = useState<boolean>(false);
  const [shieldUsedThisRound, setShieldUsedThisRound] = useState<boolean>(false);
  const [shieldLane, setShieldLane] = useState<number>(0);
  const [shieldDirection, setShieldDirection] = useState<'leftToRight' | 'rightToLeft'>('leftToRight');

  const spawnTimeoutRef = useRef<number | null>(null);
  const travelTimeoutRef = useRef<number | null>(null);

  const clearSpawnTimer = () => {
    if (spawnTimeoutRef.current !== null) {
      window.clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
  };

  const clearTravelTimer = () => {
    if (travelTimeoutRef.current !== null) {
      window.clearTimeout(travelTimeoutRef.current);
      travelTimeoutRef.current = null;
    }
  };

  const hideShield = useCallback(() => {
    clearSpawnTimer();
    clearTravelTimer();
    setIsShieldVisible(false);
  }, []);

  // Resets all shield state for a brand-new round (called by the exercise's
  // own round-start logic) and schedules the shield to appear exactly
  // SHIELD_SPAWN_DELAY_MS after the round starts.
  const resetShieldForNewRound = useCallback(() => {
    hideShield();
    setIsShieldArmed(false);
    setShieldUsedThisRound(false);

    clearSpawnTimer();
    spawnTimeoutRef.current = window.setTimeout(() => {
      setShieldLane(Math.floor(Math.random() * 3));
      setShieldDirection(Math.random() < 0.5 ? 'leftToRight' : 'rightToLeft');
      setIsShieldVisible(true);
    }, SHIELD_SPAWN_DELAY_MS);
  }, [hideShield]);

  const armShield = useCallback(() => {
    if (!isShieldVisible || isShieldArmed) return;
    hideShield();
    sound.playPowerUp();
    setIsShieldArmed(true);
    setShieldUsedThisRound(true);
  }, [hideShield, isShieldArmed, isShieldVisible]);

  // Consumes the armed shield; returns true if it was armed (i.e. the caller
  // should treat the current bomb tap as a win instead of a failure).
  const consumeShield = useCallback((): boolean => {
    if (!isShieldArmed) return false;
    setIsShieldArmed(false);
    return true;
  }, [isShieldArmed]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      hideShield();
    };
  }, [hideShield]);

  // Hide/cleanup the shield if the game becomes inactive (failed/completed).
  useEffect(() => {
    if (!isGameActive) {
      hideShield();
    }
  }, [hideShield, isGameActive]);

  // Make the shield travel across the play area and disappear if untouched
  useEffect(() => {
    if (!isShieldVisible) return;
    clearTravelTimer();
    travelTimeoutRef.current = window.setTimeout(() => {
      setShieldUsedThisRound(true);
      hideShield();
    }, prefersReducedMotion ? SHIELD_TRAVEL_MS_REDUCED_MOTION : SHIELD_TRAVEL_MS);

    return () => {
      clearTravelTimer();
    };
  }, [hideShield, prefersReducedMotion, isShieldVisible]);

  return {
    isShieldVisible,
    isShieldArmed,
    shieldLane,
    shieldDirection,
    armShield,
    consumeShield,
    resetShieldForNewRound,
    SHIELD_TRAVEL_MS,
  };
}
