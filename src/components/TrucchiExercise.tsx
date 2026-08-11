/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import InteractionGuidanceHint from './InteractionGuidanceHint';
import OperationPromptCard from './layout/OperationPromptCard';
import RetryButton from './layout/RetryButton';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';
import { shuffleArray } from '../utils/arrayHelpers';

const TRUCCHI_PYRAMID_ROWS = [1, 2, 3, 4] as const;
const TRUCCHI_PREVIEW_MS = 1000;
const TRUCCHI_REVEAL_MS = 260;
const TRUCCHI_COLLAPSE_MS = 620;
const TRUCCHI_HAMMER_START_FACTOR = 1;
const TRUCCHI_HAMMER_TRAVEL_MS = 520;
const TRUCCHI_PREVIEW_SCALE_MIN = 0.48;
const DIFFICULTY_FACTOR_MIN = 1;
const DIFFICULTY_FACTOR_MAX = 10;
const GAMEPLAY_AUDIO_MESSAGES = {
  trucchiWrong: 'Riprova. Prova un altro numero.',
  trucchiCollapse: 'Oh no, la piramide e caduta! Riproviamo.',
  trucchiHammer: 'Oh no! Il martello ha distrutto il mattone giusto!',
} as const;

interface TrucchiExerciseProps {
  key?: React.Key;
  worldId: number;
  factor: number;
  compactLayout?: boolean;
  trucchiGameCompleted: boolean;
  showTrucchiCompletionEffect: boolean;
  showTrucchiTouchGuidance: boolean;
  showTrucchiAvoidGuidance: boolean;
  onConsumeTouchGuidance: () => void;
  onConsumeAvoidGuidance: () => void;
  onAnnounce: (message: string) => void;
  onSpeakOperation: () => void;
  setTrucchiGameCompleted: Dispatch<SetStateAction<boolean>>;
  setShowTrucchiCompletionEffect: Dispatch<SetStateAction<boolean>>;
  setTrucchiCompleted: Dispatch<SetStateAction<Set<number>>>;
}

export default function TrucchiExercise({
  worldId,
  factor,
  compactLayout = false,
  trucchiGameCompleted,
  showTrucchiCompletionEffect,
  showTrucchiTouchGuidance,
  showTrucchiAvoidGuidance,
  onConsumeTouchGuidance,
  onConsumeAvoidGuidance,
  onAnnounce,
  onSpeakOperation,
  setTrucchiGameCompleted,
  setShowTrucchiCompletionEffect,
  setTrucchiCompleted,
}: TrucchiExerciseProps) {
  const { speak } = useVoice();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [trucchiBrickValues, setTrucchiBrickValues] = useState<number[]>([]);
  const [trucchiRemovedBricks, setTrucchiRemovedBricks] = useState<Set<number>>(new Set());
  const [trucchiWrongChoices, setTrucchiWrongChoices] = useState<number>(0);
  const [trucchiPyramidCollapsed, setTrucchiPyramidCollapsed] = useState<boolean>(false);
  const [trucchiPreviewActive, setTrucchiPreviewActive] = useState<boolean>(false);
  const [trucchiRevealedBrickIndex, setTrucchiRevealedBrickIndex] = useState<number | null>(null);
  const [trucchiHammerActive, setTrucchiHammerActive] = useState<boolean>(false);
  const [trucchiHammerHitBricks, setTrucchiHammerHitBricks] = useState<Set<number>>(new Set());
  const [trucchiHammerTargetIndex, setTrucchiHammerTargetIndex] = useState<number | null>(null);
  const [trucchiHammerTraveling, setTrucchiHammerTraveling] = useState<boolean>(false);
  const [trucchiHammerHasStruck, setTrucchiHammerHasStruck] = useState<boolean>(false);
  const [trucchiHammerPose, setTrucchiHammerPose] = useState<{ x: number; y: number; visible: boolean; striking: boolean }>({
    x: 0,
    y: 0,
    visible: false,
    striking: false,
  });
  const [trucchiCollapseReason, setTrucchiCollapseReason] = useState<'wrong' | 'hammer' | null>(null);
  const [trucchiQuestionSolved, setTrucchiQuestionSolved] = useState<boolean>(false);

  const trucchiPreviewTimeoutRef = useRef<number | null>(null);
  const trucchiRevealTimeoutRef = useRef<number | null>(null);
  const trucchiCollapseTimeoutRef = useRef<number | null>(null);
  const trucchiHammerStrikeTimeoutRef = useRef<number | null>(null);
  const trucchiHammerHitClearTimeoutRef = useRef<number | null>(null);
  const trucchiHammerResolveTimeoutRef = useRef<number | null>(null);
  const trucchiArenaRef = useRef<HTMLDivElement | null>(null);
  const trucchiBrickRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const trucchiHammerActiveRef = useRef<boolean>(false);
  const trucchiQuestionSolvedRef = useRef<boolean>(false);
  const trucchiPyramidCollapsedRef = useRef<boolean>(false);

  useEffect(() => {
    trucchiHammerActiveRef.current = trucchiHammerActive;
  }, [trucchiHammerActive]);

  useEffect(() => {
    trucchiQuestionSolvedRef.current = trucchiQuestionSolved;
  }, [trucchiQuestionSolved]);

  useEffect(() => {
    trucchiPyramidCollapsedRef.current = trucchiPyramidCollapsed;
  }, [trucchiPyramidCollapsed]);

  const randomInRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const getFactorProgress = (currentFactor: number) => {
    const clamped = Math.max(DIFFICULTY_FACTOR_MIN, Math.min(DIFFICULTY_FACTOR_MAX, currentFactor));
    return (clamped - DIFFICULTY_FACTOR_MIN) / (DIFFICULTY_FACTOR_MAX - DIFFICULTY_FACTOR_MIN);
  };

  const scaleDurationByFactor = (baseMs: number, currentFactor: number, minScale: number) => {
    const progress = getFactorProgress(currentFactor);
    const scale = 1 - ((1 - minScale) * progress);
    return Math.max(140, Math.floor(baseMs * scale));
  };

  const clearTrucchiRoundTimeouts = () => {
    if (trucchiPreviewTimeoutRef.current !== null) {
      window.clearTimeout(trucchiPreviewTimeoutRef.current);
      trucchiPreviewTimeoutRef.current = null;
    }
    if (trucchiRevealTimeoutRef.current !== null) {
      window.clearTimeout(trucchiRevealTimeoutRef.current);
      trucchiRevealTimeoutRef.current = null;
    }
    if (trucchiCollapseTimeoutRef.current !== null) {
      window.clearTimeout(trucchiCollapseTimeoutRef.current);
      trucchiCollapseTimeoutRef.current = null;
    }
    if (trucchiHammerStrikeTimeoutRef.current !== null) {
      window.clearTimeout(trucchiHammerStrikeTimeoutRef.current);
      trucchiHammerStrikeTimeoutRef.current = null;
    }
    if (trucchiHammerHitClearTimeoutRef.current !== null) {
      window.clearTimeout(trucchiHammerHitClearTimeoutRef.current);
      trucchiHammerHitClearTimeoutRef.current = null;
    }
    if (trucchiHammerResolveTimeoutRef.current !== null) {
      window.clearTimeout(trucchiHammerResolveTimeoutRef.current);
      trucchiHammerResolveTimeoutRef.current = null;
    }
  };

  const getTrucchiHammerDelayRange = (currentFactor: number): [number, number] => {
    if (currentFactor >= 8) return [950, 1350];
    if (currentFactor >= 6) return [1350, 1850];
    if (currentFactor >= 4) return [1850, 2500];
    return [3200, 4100];
  };

  const getTrucchiHammerFirstDelayRange = (currentFactor: number): [number, number] => {
    if (currentFactor >= 8) return [280, 520];
    if (currentFactor >= 6) return [420, 700];
    if (currentFactor >= 4) return [650, 950];
    return [1200, 1800];
  };

  const getTrucchiHammerStartPoint = useCallback(() => {
    const arena = trucchiArenaRef.current;
    if (!arena) {
      return { x: 280, y: 34 };
    }
    return { x: Math.max(22, arena.clientWidth - 28), y: 34 };
  }, []);

  const getTrucchiBrickCenter = useCallback((brickIndex: number) => {
    const arena = trucchiArenaRef.current;
    const brick = trucchiBrickRefs.current[brickIndex];
    if (!arena || !brick) {
      return null;
    }
    const arenaRect = arena.getBoundingClientRect();
    const brickRect = brick.getBoundingClientRect();
    return {
      x: (brickRect.left - arenaRect.left) + (brickRect.width / 2),
      y: (brickRect.top - arenaRect.top) + (brickRect.height / 2),
    };
  }, []);

  const generateTrucchiBrickValues = (currentWorldId: number, currentFactor: number) => {
    const correct = currentWorldId * currentFactor;
    return shuffleArray([
      correct,
      ...Array.from({ length: 10 }, (_, index) => index + 1)
        .filter(candidate => candidate !== currentFactor)
        .map(candidate => currentWorldId * candidate),
    ]);
  };

  const speakMultiplicationSuccess = (a: number, b: number, result: number) => speak(buildMultiplicationResultSpeech(a, b, result));

  const resetTrucchiRound = useCallback((currentFactor: number = factor) => {
    clearTrucchiRoundTimeouts();
    setTrucchiBrickValues(generateTrucchiBrickValues(worldId, currentFactor));
    setTrucchiRemovedBricks(new Set());
    setTrucchiWrongChoices(0);
    setTrucchiPyramidCollapsed(false);
    setTrucchiPreviewActive(true);
    setTrucchiRevealedBrickIndex(null);
    setTrucchiQuestionSolved(false);
    setTrucchiGameCompleted(false);
    setShowTrucchiCompletionEffect(false);
    setTrucchiHammerActive(false);
    setTrucchiHammerHitBricks(new Set());
    setTrucchiHammerTargetIndex(null);
    setTrucchiHammerTraveling(false);
    setTrucchiHammerHasStruck(false);
    setTrucchiHammerPose({ ...getTrucchiHammerStartPoint(), visible: false, striking: false });
    setTrucchiCollapseReason(null);

    const previewDurationMs = scaleDurationByFactor(TRUCCHI_PREVIEW_MS, currentFactor, TRUCCHI_PREVIEW_SCALE_MIN);
    trucchiPreviewTimeoutRef.current = window.setTimeout(() => {
      setTrucchiPreviewActive(false);
      trucchiPreviewTimeoutRef.current = null;
      if (currentFactor >= TRUCCHI_HAMMER_START_FACTOR) {
        const start = getTrucchiHammerStartPoint();
        setTrucchiHammerPose({ ...start, visible: true, striking: false });
        setTrucchiHammerHasStruck(false);
        setTrucchiHammerActive(true);
      }
    }, previewDurationMs);
  }, [factor, getTrucchiHammerStartPoint, setShowTrucchiCompletionEffect, setTrucchiGameCompleted, worldId]);

  const resolveTrucchiHammerStrike = useCallback((currentFactor: number, targetIndex: number) => {
    if (!trucchiHammerActiveRef.current || trucchiQuestionSolvedRef.current || trucchiPyramidCollapsedRef.current) {
      setTrucchiHammerTraveling(false);
      setTrucchiHammerTargetIndex(null);
      setTrucchiHammerPose({ ...getTrucchiHammerStartPoint(), visible: false, striking: false });
      return;
    }

    setTrucchiHammerTraveling(false);
    setTrucchiHammerTargetIndex(null);
    setTrucchiHammerHasStruck(true);
    setTrucchiHammerPose(prev => ({ ...prev, striking: false }));
    setTrucchiHammerHitBricks(new Set([targetIndex]));
    sound.playHammerBrickHit();

    if (trucchiHammerHitClearTimeoutRef.current !== null) {
      window.clearTimeout(trucchiHammerHitClearTimeoutRef.current);
    }
    trucchiHammerHitClearTimeoutRef.current = window.setTimeout(() => {
      setTrucchiHammerHitBricks(new Set());
      trucchiHammerHitClearTimeoutRef.current = null;
    }, 420);

    const hitCorrectBrick = trucchiBrickValues[targetIndex] === worldId * currentFactor;
    if (hitCorrectBrick) {
      setTrucchiHammerActive(false);
      setTrucchiCollapseReason('hammer');
      sound.playError();
      speak(GAMEPLAY_AUDIO_MESSAGES.trucchiHammer);
      setTrucchiPyramidCollapsed(true);
      setTrucchiGameCompleted(false);
      setTrucchiHammerPose({ ...getTrucchiHammerStartPoint(), visible: false, striking: false });
      trucchiCollapseTimeoutRef.current = window.setTimeout(() => {
        setTrucchiRemovedBricks(new Set(Array.from({ length: trucchiBrickValues.length }, (_, index) => index)));
        trucchiCollapseTimeoutRef.current = null;
      }, TRUCCHI_COLLAPSE_MS);
      return;
    }

    setTrucchiRemovedBricks(prev => {
      const next = new Set(prev);
      next.add(targetIndex);
      return next;
    });
    setTrucchiHammerPose({ ...getTrucchiHammerStartPoint(), visible: trucchiHammerActiveRef.current, striking: false });
  }, [getTrucchiHammerStartPoint, speak, setTrucchiGameCompleted, trucchiBrickValues, worldId]);

  const strikeTrucchiHammer = useCallback((currentFactor: number) => {
    if (
      trucchiPreviewActive
      || trucchiPyramidCollapsed
      || trucchiQuestionSolved
      || trucchiRevealedBrickIndex !== null
      || trucchiHammerTraveling
      || !trucchiHammerActive
    ) {
      return;
    }

    const availableBrickIndexes = trucchiBrickValues
      .map((_, index) => index)
      .filter(index => !trucchiRemovedBricks.has(index));

    if (availableBrickIndexes.length === 0) return;

    const targetIndex = shuffleArray(availableBrickIndexes)[0];
    if (targetIndex === undefined) return;

    const start = getTrucchiHammerStartPoint();
    const target = getTrucchiBrickCenter(targetIndex);
    if (!target) {
      resolveTrucchiHammerStrike(currentFactor, targetIndex);
      return;
    }

    setTrucchiHammerTraveling(true);
    setTrucchiHammerTargetIndex(targetIndex);
    setTrucchiHammerHitBricks(new Set());
    setTrucchiHammerPose({ ...start, visible: true, striking: false });
    window.requestAnimationFrame(() => {
      setTrucchiHammerPose({ x: target.x, y: target.y, visible: true, striking: true });
    });

    if (trucchiHammerResolveTimeoutRef.current !== null) {
      window.clearTimeout(trucchiHammerResolveTimeoutRef.current);
    }
    trucchiHammerResolveTimeoutRef.current = window.setTimeout(() => {
      trucchiHammerResolveTimeoutRef.current = null;
      resolveTrucchiHammerStrike(currentFactor, targetIndex);
    }, prefersReducedMotion ? 120 : TRUCCHI_HAMMER_TRAVEL_MS);
  }, [getTrucchiBrickCenter, getTrucchiHammerStartPoint, prefersReducedMotion, resolveTrucchiHammerStrike, trucchiBrickValues, trucchiHammerActive, trucchiHammerTraveling, trucchiPreviewActive, trucchiPyramidCollapsed, trucchiQuestionSolved, trucchiRemovedBricks, trucchiRevealedBrickIndex]);

  useEffect(() => {
    if (
      !trucchiHammerActive
      || trucchiPreviewActive
      || trucchiRevealedBrickIndex !== null
      || trucchiHammerTraveling
      || trucchiPyramidCollapsed
      || trucchiQuestionSolved
    ) {
      return;
    }

    const [minDelayMs, maxDelayMs] = trucchiHammerHasStruck
      ? getTrucchiHammerDelayRange(factor)
      : getTrucchiHammerFirstDelayRange(factor);
    const strikeDelayMs = randomInRange(minDelayMs, maxDelayMs);
    trucchiHammerStrikeTimeoutRef.current = window.setTimeout(() => {
      trucchiHammerStrikeTimeoutRef.current = null;
      strikeTrucchiHammer(factor);
    }, strikeDelayMs);

    return () => {
      if (trucchiHammerStrikeTimeoutRef.current !== null) {
        window.clearTimeout(trucchiHammerStrikeTimeoutRef.current);
        trucchiHammerStrikeTimeoutRef.current = null;
      }
    };
  }, [factor, strikeTrucchiHammer, trucchiHammerActive, trucchiHammerHasStruck, trucchiHammerTraveling, trucchiPreviewActive, trucchiPyramidCollapsed, trucchiQuestionSolved, trucchiRemovedBricks, trucchiRevealedBrickIndex]);

  useEffect(() => {
    resetTrucchiRound(factor);
    return () => {
      clearTrucchiRoundTimeouts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const correctValue = worldId * factor;
  const firstTrucchiWrongIndex = trucchiBrickValues.findIndex((value, index) => !trucchiRemovedBricks.has(index) && value !== correctValue);
  const hasTrucchiTouchTarget = trucchiBrickValues.some((value, index) => !trucchiRemovedBricks.has(index) && value === correctValue);
  const hasTrucchiAvoidTarget = firstTrucchiWrongIndex !== -1;
  const shouldShowTouchGuidance = showTrucchiTouchGuidance && !trucchiQuestionSolved && !trucchiPyramidCollapsed && hasTrucchiTouchTarget;
  const shouldShowAvoidGuidance = showTrucchiAvoidGuidance && !trucchiQuestionSolved && !trucchiPyramidCollapsed && hasTrucchiAvoidTarget;
  const rootClasses = `relative bg-white rounded-3xl border border-amber-100 shadow-xl ${compactLayout ? 'p-3 space-y-4' : 'p-4 sm:p-5 space-y-5'}`;

  return (
    <div ref={trucchiArenaRef} className={rootClasses}>
      {trucchiHammerPose.visible && !trucchiPyramidCollapsed && (
        <motion.div
          aria-hidden="true"
          className="absolute z-30 pointer-events-none select-none"
          style={{ left: 0, top: 0 }}
          initial={false}
          animate={{
            x: trucchiHammerPose.x - 16,
            y: trucchiHammerPose.y - 16,
            rotate: trucchiHammerPose.striking ? 24 : -24,
            scale: trucchiHammerPose.striking ? 1.18 : 1,
          }}
          transition={{
            duration: prefersReducedMotion ? 0.08 : TRUCCHI_HAMMER_TRAVEL_MS / 1000,
            ease: 'easeInOut',
          }}
        >
          <div className="relative">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-white text-xl shadow-lg">🔨</span>
            {shouldShowAvoidGuidance && <InteractionGuidanceHint kind="avoid" reducedMotion={prefersReducedMotion} />}
          </div>
        </motion.div>
      )}

      <OperationPromptCard
        tone="amber"
        icon="🔨"
        eyebrow="Completa questa operazione"
        operation={`${worldId} × ${factor} = ?`}
        onSpeakOperation={onSpeakOperation}
        operationAriaLabel={`Ascolta operazione ${worldId} per ${factor}`}
      />

      {(() => {
        let brickCursor = 0;

        return (
          <div className="mx-auto flex h-[15.5rem] w-full max-w-[22rem] flex-col items-center justify-start gap-1.5 pt-1 sm:gap-2" role="list" aria-label="Piramide di mattoni 4 3 2 1">
            {TRUCCHI_PYRAMID_ROWS.map((rowLength, rowIndex) => {
              const rowStart = brickCursor;
              brickCursor += rowLength;

              return (
                <div key={`trucchi-row-${rowLength}`} className="flex h-12 items-center justify-center gap-1.5 sm:gap-2">
                  <AnimatePresence mode="popLayout">
                    {Array.from({ length: rowLength }).map((_, brickIndex) => {
                      const globalIndex = rowStart + brickIndex;
                      const hiddenValue = trucchiBrickValues[globalIndex];
                      const isRemoved = trucchiRemovedBricks.has(globalIndex);

                      if (hiddenValue === undefined || isRemoved) return null;

                      const isCorrectBrick = hiddenValue === correctValue;
                      const isRevealed = trucchiPreviewActive || trucchiRevealedBrickIndex === globalIndex || (trucchiQuestionSolved && isCorrectBrick);
                      const isBrickLocked = trucchiPreviewActive || trucchiQuestionSolved || trucchiPyramidCollapsed || trucchiRevealedBrickIndex !== null;
                      const isHammerHit = trucchiHammerHitBricks.has(globalIndex);
                      const isHammerTarget = trucchiHammerTargetIndex === globalIndex;
                      const tiltDirection = (brickIndex + rowIndex) % 2 === 0 ? -1 : 1;
                      const isBaseRow = rowIndex === TRUCCHI_PYRAMID_ROWS.length - 1;
                      const restingRotate = trucchiWrongChoices === 0 ? 0 : tiltDirection * (trucchiWrongChoices * (isBaseRow ? 2.4 : 1.5));
                      const collapsedX = tiltDirection * (26 + brickIndex * 10);
                      const collapsedY = 80 + (rowIndex * 16) + (brickIndex * 4);
                      const collapsedRotate = tiltDirection * (18 + rowIndex * 5);
                      const isLightBrick = globalIndex % 3 === 1 || globalIndex % 5 === 4;
                      const closedBrickClass = isLightBrick
                        ? 'border-orange-500 bg-gradient-to-b from-orange-200 via-orange-300 to-orange-500 text-orange-50'
                        : 'border-orange-700 bg-gradient-to-b from-orange-400 via-orange-500 to-orange-700 text-orange-50';

                      return (
                        <div key={`trucchi-brick-${globalIndex}`} className="relative">
                          <motion.button
                            type="button"
                            role="listitem"
                            ref={(node) => {
                              trucchiBrickRefs.current[globalIndex] = node;
                            }}
                            initial={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.72, y: 18 }}
                            animate={trucchiPyramidCollapsed
                              ? { x: collapsedX, y: collapsedY, rotate: collapsedRotate, opacity: 0 }
                              : { x: 0, y: trucchiWrongChoices >= 2 && isBaseRow ? 4 : 0, rotate: restingRotate, opacity: 1, scale: 1 }}
                            transition={trucchiPyramidCollapsed
                              ? { duration: 0.55, ease: 'easeIn' }
                              : { duration: 0.22, ease: 'easeOut' }}
                            disabled={isBrickLocked}
                            onClick={() => {
                              if (isBrickLocked) return;
                              if (isCorrectBrick) onConsumeTouchGuidance();
                              else if (globalIndex === firstTrucchiWrongIndex) onConsumeAvoidGuidance();

                              setTrucchiRevealedBrickIndex(globalIndex);

                              if (isCorrectBrick) {
                                clearTrucchiRoundTimeouts();
                                sound.playSuccess();
                                void speakMultiplicationSuccess(worldId, factor, hiddenValue);
                                setTrucchiHammerActive(false);
                                setTrucchiHammerHitBricks(new Set());
                                setTrucchiHammerTargetIndex(null);
                                setTrucchiHammerTraveling(false);
                                setTrucchiHammerHasStruck(false);
                                setTrucchiHammerPose({ ...getTrucchiHammerStartPoint(), visible: false, striking: false });
                                setTrucchiQuestionSolved(true);
                                setTrucchiGameCompleted(true);
                                setShowTrucchiCompletionEffect(true);
                                setTrucchiCompleted(prev => new Set(prev).add(factor));
                                onAnnounce(`Bravo! ${worldId} per ${factor} fa ${hiddenValue}.`);
                                return;
                              }

                              sound.playError();
                              const nextWrongChoices = trucchiWrongChoices + 1;
                              setTrucchiWrongChoices(nextWrongChoices);

                              trucchiRevealTimeoutRef.current = window.setTimeout(() => {
                                setTrucchiRevealedBrickIndex(current => (current === globalIndex ? null : current));

                                if (nextWrongChoices >= 3) {
                                  clearTrucchiRoundTimeouts();
                                  setTrucchiHammerActive(false);
                                  setTrucchiHammerHitBricks(new Set());
                                  setTrucchiHammerTargetIndex(null);
                                  setTrucchiHammerTraveling(false);
                                  setTrucchiHammerHasStruck(false);
                                  setTrucchiHammerPose({ ...getTrucchiHammerStartPoint(), visible: false, striking: false });
                                  setTrucchiCollapseReason('wrong');
                                  setTrucchiPyramidCollapsed(true);
                                  setTrucchiGameCompleted(false);
                                  speak(GAMEPLAY_AUDIO_MESSAGES.trucchiCollapse);
                                  trucchiCollapseTimeoutRef.current = window.setTimeout(() => {
                                    setTrucchiRemovedBricks(new Set(Array.from({ length: trucchiBrickValues.length }, (_, index) => index)));
                                    trucchiCollapseTimeoutRef.current = null;
                                  }, TRUCCHI_COLLAPSE_MS);
                                } else {
                                  setTrucchiRemovedBricks(prev => {
                                    const next = new Set(prev);
                                    next.add(globalIndex);
                                    return next;
                                  });
                                  speak(GAMEPLAY_AUDIO_MESSAGES.trucchiWrong);
                                }

                                trucchiRevealTimeoutRef.current = null;
                              }, TRUCCHI_REVEAL_MS);
                            }}
                            className={`relative flex h-12 w-[clamp(3.4rem,17vw,4.9rem)] items-center justify-center overflow-hidden rounded-none border shadow-[0_10px_16px_rgba(15,23,42,0.12)] transition-colors ${isBrickLocked ? 'cursor-not-allowed' : 'cursor-pointer'} ${isRevealed ? 'border-stone-300 bg-gradient-to-b from-stone-50 via-orange-50 to-stone-100 text-stone-700' : closedBrickClass} ${isHammerTarget ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                            aria-label={isRevealed ? `Mattone con risultato ${hiddenValue}` : 'Mattone chiuso'}
                          >
                            {shouldShowTouchGuidance && isCorrectBrick && (
                              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                                <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} placement="center" />
                              </div>
                            )}
                            {isRevealed ? (
                              <>
                                {isHammerHit && <span className="absolute top-1 right-1 text-sm" aria-hidden="true">??</span>}
                                <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/60" aria-hidden="true" />
                                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-orange-800/80" aria-hidden="true" />
                                <span className="absolute left-1/3 top-[0.65rem] bottom-[0.65rem] w-px bg-orange-800/45" aria-hidden="true" />
                                <span className="absolute left-2/3 top-[0.65rem] bottom-[0.65rem] w-px bg-orange-800/45" aria-hidden="true" />
                                <span className="absolute inset-x-0 bottom-[0.38rem] h-px bg-orange-800/35" aria-hidden="true" />
                                <span className="text-base font-black sm:text-lg">{hiddenValue}</span>
                              </>
                            ) : (
                              <>
                                {isHammerHit && <span className="absolute top-1 right-1 text-sm" aria-hidden="true">??</span>}
                                <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/25" aria-hidden="true" />
                                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-orange-800/50" aria-hidden="true" />
                                <span className="absolute left-1/3 top-[0.65rem] bottom-[0.65rem] w-px bg-orange-800/45" aria-hidden="true" />
                                <span className="absolute left-2/3 top-[0.65rem] bottom-[0.65rem] w-px bg-orange-800/45" aria-hidden="true" />
                                <span className="absolute inset-x-0 bottom-[0.38rem] h-px bg-orange-800/35" aria-hidden="true" />
                              </>
                            )}
                          </motion.button>
                        </div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        );
      })()}

      {trucchiPyramidCollapsed && !trucchiQuestionSolved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/30 backdrop-blur-[1px]"
        >
          <div className="rounded-2xl border-2 border-rose-200 bg-white/95 px-5 py-4 text-center shadow-xl">
            <p className="text-sm font-black text-rose-700">
              {trucchiCollapseReason === 'hammer' ? 'Il martello ha colpito il mattone giusto!' : 'La piramide e caduta!'}
            </p>
            <RetryButton
              tone="amber"
              className="mt-3"
              onClick={() => {
                sound.playClick();
                void speak('Riproviamo.');
                resetTrucchiRound();
              }}
            />
          </div>
        </motion.div>
      )}

      {showTrucchiCompletionEffect && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-3xl bg-black/30 backdrop-blur-[1px]">
          <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
            <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
          </div>
        </div>
      )}
    </div>
  );
}
