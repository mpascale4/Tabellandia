/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useSaltoFlyCheat - self-contained logic for the "Mosca Cheat" (fly auto-jump)
 * feature of the Salto exercise in WorldDetail. Extracted out of WorldDetail.tsx
 * to reduce that file's size and isolate this side-effect-heavy sub-feature.
 *
 * The fly appears after a period of inactivity while the frog is mid-game; tapping
 * it makes the frog automatically hop through all remaining stones to the finish.
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { sound } from '../components/SoundManager';

const SALTO_FLY_TRAVEL_MS = 5800;

interface UseSaltoFlyCheatParams {
  activeStep: string;
  saltoFlowStage: 'objective' | 'game';
  saltoSelectedFactor: number | null;
  saltoGameCompleted: boolean;
  isFrogSplashing: boolean;
  saltoFrogPosition: number;
  saltoIndex: number;
  saltoEnemySteps: number[];
  worldId: number;
  prefersReducedMotion: boolean;
  announceWithFallback: (message: string) => void;
  setSaltoJumpedEnemySteps: Dispatch<SetStateAction<Set<number>>>;
  setSaltoLeap: Dispatch<SetStateAction<{ from: number; to: number } | null>>;
  setSaltoCorrectClicks: Dispatch<SetStateAction<Set<number>>>;
  setSaltoFrogPosition: Dispatch<SetStateAction<number>>;
  setSaltoIndex: Dispatch<SetStateAction<number>>;
  setSaltoGameCompleted: Dispatch<SetStateAction<boolean>>;
  setShowSaltoCompletionEffect: Dispatch<SetStateAction<boolean>>;
  setSaltoCompleted: Dispatch<SetStateAction<Set<number>>>;
}

export function useSaltoFlyCheat({
  activeStep,
  saltoFlowStage,
  saltoSelectedFactor,
  saltoGameCompleted,
  isFrogSplashing,
  saltoFrogPosition,
  saltoIndex,
  saltoEnemySteps,
  worldId,
  prefersReducedMotion,
  announceWithFallback,
  setSaltoJumpedEnemySteps,
  setSaltoLeap,
  setSaltoCorrectClicks,
  setSaltoFrogPosition,
  setSaltoIndex,
  setSaltoGameCompleted,
  setShowSaltoCompletionEffect,
  setSaltoCompleted,
}: UseSaltoFlyCheatParams) {
  const [isFlyAutoJumping, setIsFlyAutoJumping] = useState<boolean>(false);
  const [saltoFlyVisible, setSaltoFlyVisible] = useState<boolean>(false);
  const [saltoFlyLane, setSaltoFlyLane] = useState<number>(0);
  const [saltoFlyDirection, setSaltoFlyDirection] = useState<'leftToRight' | 'rightToLeft'>('leftToRight');
  const [saltoFlyUsedThisRound, setSaltoFlyUsedThisRound] = useState<boolean>(false);
  const flyAutoJumpIntervalRef = useRef<number | null>(null);
  const saltoFlySpawnTimeoutRef = useRef<number | null>(null);
  const saltoFlyTravelTimeoutRef = useRef<number | null>(null);

  const clearSaltoFlySpawnTimer = () => {
    if (saltoFlySpawnTimeoutRef.current !== null) {
      window.clearTimeout(saltoFlySpawnTimeoutRef.current);
      saltoFlySpawnTimeoutRef.current = null;
    }
  };

  const clearSaltoFlyTravelTimer = () => {
    if (saltoFlyTravelTimeoutRef.current !== null) {
      window.clearTimeout(saltoFlyTravelTimeoutRef.current);
      saltoFlyTravelTimeoutRef.current = null;
    }
  };

  const hideSaltoFly = useCallback(() => {
    clearSaltoFlySpawnTimer();
    clearSaltoFlyTravelTimer();
    setSaltoFlyVisible(false);
  }, []);

  const clearFlyAutoJump = useCallback(() => {
    if (flyAutoJumpIntervalRef.current !== null) {
      window.clearTimeout(flyAutoJumpIntervalRef.current);
      flyAutoJumpIntervalRef.current = null;
    }
    setIsFlyAutoJumping(false);
    setSaltoLeap(null);
  }, [setSaltoLeap]);

  const resetFlyUsage = useCallback(() => {
    setSaltoFlyUsedThisRound(false);
  }, []);

  const triggerFlyAutoJumpCheat = useCallback(() => {
    if (
      saltoGameCompleted
      || isFrogSplashing
      || isFlyAutoJumping
      || saltoSelectedFactor === null
      || !saltoFlyVisible
    ) {
      return;
    }

    hideSaltoFly();
    sound.playSuccess();
    setSaltoFlyUsedThisRound(true);
    setIsFlyAutoJumping(true);

    const totalSteps = saltoSelectedFactor;
    let currentStep = saltoFrogPosition;

    const runNextFlyJump = () => {
      const nextStep = currentStep + 1;
      if (nextStep > totalSteps) {
        clearFlyAutoJump();
        return;
      }

      if (saltoEnemySteps.includes(nextStep)) {
        setSaltoJumpedEnemySteps(prev => new Set(prev).add(nextStep));
      }

      sound.playFrogCroak();
      setSaltoLeap({ from: currentStep, to: nextStep });

      const leapMs = prefersReducedMotion ? 160 : 520;
      flyAutoJumpIntervalRef.current = window.setTimeout(() => {
        const expectedVal = worldId * nextStep;
        setSaltoCorrectClicks(prev => new Set(prev).add(expectedVal));
        setSaltoFrogPosition(nextStep);
        setSaltoLeap(null);
        setSaltoIndex(nextStep);
        announceWithFallback(expectedVal.toString());

        if (nextStep >= totalSteps) {
          clearFlyAutoJump();
          setSaltoGameCompleted(true);
          setShowSaltoCompletionEffect(true);
          setSaltoCompleted(prev => new Set([...prev, totalSteps]));
          return;
        }

        currentStep = nextStep;
        flyAutoJumpIntervalRef.current = window.setTimeout(runNextFlyJump, prefersReducedMotion ? 140 : 220);
      }, leapMs);
    };

    runNextFlyJump();
  }, [
    announceWithFallback,
    clearFlyAutoJump,
    hideSaltoFly,
    isFlyAutoJumping,
    isFrogSplashing,
    prefersReducedMotion,
    saltoEnemySteps,
    saltoFlyVisible,
    saltoFrogPosition,
    saltoGameCompleted,
    saltoSelectedFactor,
    setSaltoCompleted,
    setSaltoCorrectClicks,
    setSaltoFrogPosition,
    setSaltoGameCompleted,
    setSaltoIndex,
    setSaltoJumpedEnemySteps,
    setSaltoLeap,
    setShowSaltoCompletionEffect,
    worldId,
  ]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      clearFlyAutoJump();
      hideSaltoFly();
    };
  }, [clearFlyAutoJump, hideSaltoFly]);

  // Spawn the fly after a period of inactivity, once per round
  useEffect(() => {
    const shouldManageFly =
      activeStep === 'salto'
      && saltoFlowStage === 'game'
      && saltoSelectedFactor !== null
      && !saltoGameCompleted
      && !isFrogSplashing
      && !isFlyAutoJumping
      && !saltoFlyUsedThisRound;

    if (!shouldManageFly) {
      hideSaltoFly();
      return;
    }

    if (saltoFlyVisible) {
      return;
    }

    clearSaltoFlySpawnTimer();
    saltoFlySpawnTimeoutRef.current = window.setTimeout(() => {
      setSaltoFlyLane(Math.floor(Math.random() * 3));
      setSaltoFlyDirection(Math.random() < 0.5 ? 'leftToRight' : 'rightToLeft');
      setSaltoFlyVisible(true);
    }, 6000);

    return () => {
      clearSaltoFlySpawnTimer();
    };
  }, [
    activeStep,
    hideSaltoFly,
    isFlyAutoJumping,
    isFrogSplashing,
    saltoFlyUsedThisRound,
    saltoFlyVisible,
    saltoFlowStage,
    saltoFrogPosition,
    saltoGameCompleted,
    saltoIndex,
    saltoSelectedFactor,
  ]);

  // Make the fly travel across the stream and disappear if untouched
  useEffect(() => {
    if (!saltoFlyVisible || isFlyAutoJumping) return;
    clearSaltoFlyTravelTimer();
    saltoFlyTravelTimeoutRef.current = window.setTimeout(() => {
      setSaltoFlyUsedThisRound(true);
      hideSaltoFly();
    }, prefersReducedMotion ? 1400 : SALTO_FLY_TRAVEL_MS);

    return () => {
      clearSaltoFlyTravelTimer();
    };
  }, [hideSaltoFly, isFlyAutoJumping, prefersReducedMotion, saltoFlyVisible]);

  return {
    isFlyAutoJumping,
    saltoFlyVisible,
    saltoFlyLane,
    saltoFlyDirection,
    saltoFlyUsedThisRound,
    triggerFlyAutoJumpCheat,
    clearFlyAutoJump,
    hideSaltoFly,
    resetFlyUsage,
    SALTO_FLY_TRAVEL_MS,
  };
}
