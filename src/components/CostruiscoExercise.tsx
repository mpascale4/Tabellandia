/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'motion/react';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import InteractionGuidanceHint from './InteractionGuidanceHint';
import OperationPromptCard from './layout/OperationPromptCard';
import RetryButton from './layout/RetryButton';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';
import { shuffleArray } from '../utils/arrayHelpers';
import { getGenderedText } from '../utils/playerCopy';

const COSTRUISCO_BALLOON_SPAWN_MIN_MS = 260;
const COSTRUISCO_BALLOON_SPAWN_MAX_MS = 650;
const COSTRUISCO_BALLOON_FLIGHT_MIN_MS = 4500;
const COSTRUISCO_BALLOON_FLIGHT_MAX_MS = 6500;
const COSTRUISCO_BALLOON_MAX_ACTIVE = 5;
const COSTRUISCO_BALLOON_EXIT_Y = -340;
const COSTRUISCO_CORRECT_FAIL_PROGRESS = 0.75;
const COSTRUISCO_BOMB_START_FACTOR = 1;
const DIFFICULTY_FACTOR_MIN = 1;
const DIFFICULTY_FACTOR_MAX = 10;
const COSTRUISCO_SPAWN_SCALE_MIN = 0.45;
const COSTRUISCO_FLIGHT_SCALE_MIN = 0.5;
const GAMEPLAY_AUDIO_MESSAGES = {
  costruiscoBomb: 'Trappola! Il numero era giusto ma era una bomba. Cerca il palloncino colorato!',
  costruiscoTooHigh: 'Oh no il palloncino e volato via.',
} as const;

const COSTRUISCO_BALLOON_PALETTES = [
  {
    body: 'bg-gradient-to-b from-sky-300 to-sky-500 text-white border-white hover:from-sky-400 hover:to-sky-600',
    knot: 'bg-sky-600',
    string: 'bg-sky-300',
  },
  {
    body: 'bg-gradient-to-b from-fuchsia-300 to-fuchsia-500 text-white border-white hover:from-fuchsia-400 hover:to-fuchsia-600',
    knot: 'bg-fuchsia-600',
    string: 'bg-fuchsia-300',
  },
  {
    body: 'bg-gradient-to-b from-amber-300 to-orange-500 text-white border-white hover:from-amber-400 hover:to-orange-600',
    knot: 'bg-orange-600',
    string: 'bg-amber-300',
  },
  {
    body: 'bg-gradient-to-b from-violet-300 to-violet-500 text-white border-white hover:from-violet-400 hover:to-violet-600',
    knot: 'bg-violet-600',
    string: 'bg-violet-300',
  },
] as const;

type CostruiscoBalloonPalette = typeof COSTRUISCO_BALLOON_PALETTES[number];
type CostruiscoActiveBalloon = {
  id: number;
  value: number;
  lane: number;
  flightMs: number;
  palette: CostruiscoBalloonPalette;
  isCorrect: boolean;
  isTrap?: boolean;
};

interface CostruiscoExerciseProps {
  key?: React.Key;
  worldId: number;
  factor: number;
  playerGender: 'male' | 'female';
  compactLayout?: boolean;
  costruiscoGameCompleted: boolean;
  showCostruiscoCompletionEffect: boolean;
  showCostruiscoTouchGuidance: boolean;
  showCostruiscoAvoidGuidance: boolean;
  onConsumeTouchGuidance: () => void;
  onConsumeAvoidGuidance: () => void;
  onAnnounce: (message: string) => void;
  onSpeakOperation: () => void;
  setCostruiscoGameCompleted: Dispatch<SetStateAction<boolean>>;
  setShowCostruiscoCompletionEffect: Dispatch<SetStateAction<boolean>>;
  setCostruiscoCompleted: Dispatch<SetStateAction<Set<number>>>;
}

export default function CostruiscoExercise({
  worldId,
  factor,
  playerGender,
  compactLayout = false,
  costruiscoGameCompleted,
  showCostruiscoCompletionEffect,
  showCostruiscoTouchGuidance,
  showCostruiscoAvoidGuidance,
  onConsumeTouchGuidance,
  onConsumeAvoidGuidance,
  onAnnounce,
  onSpeakOperation,
  setCostruiscoGameCompleted,
  setShowCostruiscoCompletionEffect,
  setCostruiscoCompleted,
}: CostruiscoExerciseProps) {
  const { speak } = useVoice();
  const [costruiscoBalloonPool, setCostruiscoBalloonPool] = useState<number[]>([]);
  const [costruiscoActiveBalloons, setCostruiscoActiveBalloons] = useState<CostruiscoActiveBalloon[]>([]);
  const [costruiscoPopBursts, setCostruiscoPopBursts] = useState<{ id: number; lane: number }[]>([]);
  const [costruiscoFailed, setCostruiscoFailed] = useState<boolean>(false);
  const [costruiscoFailReason, setCostruiscoFailReason] = useState<'wrong-tap' | 'correct-escaped' | null>(null);
  const [costruiscoWrongTappedValue, setCostruiscoWrongTappedValue] = useState<number | null>(null);
  const [costruiscoBlinkBonusRoundActive, setCostruiscoBlinkBonusRoundActive] = useState<boolean>(false);
  const [costruiscoBlinkOn, setCostruiscoBlinkOn] = useState<boolean>(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const costruiscoBalloonTokenRef = useRef<number>(0);
  const costruiscoSpawnTimeoutRef = useRef<number | null>(null);
  const costruiscoBombTimeoutRef = useRef<number | null>(null);
  const costruiscoEscapeTimeoutsRef = useRef<Record<number, number>>({});
  const costruiscoActiveBalloonsRef = useRef<CostruiscoActiveBalloon[]>([]);
  const costruiscoBalloonPoolRef = useRef<number[]>([]);
  const costruiscoFailedRef = useRef<boolean>(false);
  const costruiscoGameCompletedRef = useRef<boolean>(false);
  const costruiscoBlinkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    costruiscoActiveBalloonsRef.current = costruiscoActiveBalloons;
  }, [costruiscoActiveBalloons]);

  useEffect(() => {
    costruiscoBalloonPoolRef.current = costruiscoBalloonPool;
  }, [costruiscoBalloonPool]);

  useEffect(() => {
    costruiscoFailedRef.current = costruiscoFailed;
  }, [costruiscoFailed]);

  useEffect(() => {
    costruiscoGameCompletedRef.current = costruiscoGameCompleted;
  }, [costruiscoGameCompleted]);

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

  const clearCostruiscoFlightTimeout = () => {
    if (costruiscoSpawnTimeoutRef.current !== null) {
      window.clearTimeout(costruiscoSpawnTimeoutRef.current);
      costruiscoSpawnTimeoutRef.current = null;
    }
    if (costruiscoBombTimeoutRef.current !== null) {
      window.clearTimeout(costruiscoBombTimeoutRef.current);
      costruiscoBombTimeoutRef.current = null;
    }
    (Object.values(costruiscoEscapeTimeoutsRef.current) as number[]).forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });
    costruiscoEscapeTimeoutsRef.current = {};
  };

  const clearCostruiscoBlinkTimeout = () => {
    if (costruiscoBlinkTimeoutRef.current !== null) {
      window.clearTimeout(costruiscoBlinkTimeoutRef.current);
      costruiscoBlinkTimeoutRef.current = null;
    }
  };

  const speakMultiplicationSuccess = (a: number, b: number, result: number) => {
    return speak(buildMultiplicationResultSpeech(a, b, result));
  };

  const generateCostruiscoBalloonPool = (currentWorldId: number, currentFactor: number): number[] => {
    const correct = currentWorldId * currentFactor;
    const distractors = new Set<number>();
    const targetDistractorsCount = 9;

    if (currentFactor > 1) distractors.add(currentWorldId * (currentFactor - 1));
    distractors.add(currentWorldId * (currentFactor + 1));
    if (currentFactor > 2) distractors.add(currentWorldId * (currentFactor - 2));
    distractors.add(currentWorldId * (currentFactor + 2));
    if (currentFactor > 3) distractors.add(currentWorldId * (currentFactor - 3));
    distractors.add(currentWorldId * (currentFactor + 3));

    distractors.add(correct + 1);
    if (correct > 1) distractors.add(correct - 1);
    distractors.add(correct + 2);
    if (correct > 2) distractors.add(correct - 2);
    distractors.add(correct + 3);
    if (correct > 3) distractors.add(correct - 3);
    distractors.add(correct + currentWorldId);
    if (correct - currentWorldId > 0) distractors.add(correct - currentWorldId);

    distractors.delete(correct);

    let fillerStep = 1;
    while (distractors.size < targetDistractorsCount) {
      const high = correct + fillerStep;
      const low = correct - fillerStep;
      if (high !== correct) distractors.add(high);
      if (low > 0 && low !== correct) distractors.add(low);
      fillerStep++;
    }

    const shuffledDistractors = shuffleArray(Array.from(distractors)).slice(0, targetDistractorsCount);
    return shuffleArray([correct, ...shuffledDistractors]);
  };

  const getBombCountForFactor = (currentFactor: number) => {
    if (currentFactor < COSTRUISCO_BOMB_START_FACTOR) return 0;
    if (currentFactor >= 10) return 4;
    if (currentFactor >= 8) return 3;
    if (currentFactor >= 6) return 2;
    return 1;
  };

  const getBombSpawnDelayMs = (currentFactor: number): [number, number] => {
    if (currentFactor >= 10) return [600, 1200];
    if (currentFactor >= 8) return [900, 1800];
    if (currentFactor >= 6) return [1400, 2800];
    return [2000, 4000];
  };

  const queueCostruiscoBombSpawn = (currentFactor: number, bombsLeft: number) => {
    if (bombsLeft <= 0 || costruiscoBombTimeoutRef.current !== null) return;
    const [minDelay, maxDelay] = getBombSpawnDelayMs(currentFactor);
    const delayMs = randomInRange(minDelay, maxDelay);
    costruiscoBombTimeoutRef.current = window.setTimeout(() => {
      costruiscoBombTimeoutRef.current = null;
      if (costruiscoFailedRef.current || costruiscoGameCompletedRef.current) return;
      const bombId = ++costruiscoBalloonTokenRef.current;
      const flightMs = randomInRange(
        scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MIN_MS, currentFactor, COSTRUISCO_FLIGHT_SCALE_MIN),
        scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MAX_MS, currentFactor, COSTRUISCO_FLIGHT_SCALE_MIN),
      );
      const bomb: CostruiscoActiveBalloon = {
        id: bombId,
        value: worldId * currentFactor,
        lane: randomInRange(8, 92),
        flightMs,
        palette: COSTRUISCO_BALLOON_PALETTES[Math.floor(Math.random() * COSTRUISCO_BALLOON_PALETTES.length)],
        isCorrect: false,
        isTrap: true,
      };
      setCostruiscoActiveBalloons(prev => [...prev, bomb]);
      const escapeMs = Math.floor(flightMs * COSTRUISCO_CORRECT_FAIL_PROGRESS);
      costruiscoEscapeTimeoutsRef.current[bombId] = window.setTimeout(() => {
        delete costruiscoEscapeTimeoutsRef.current[bombId];
        setCostruiscoActiveBalloons(prev => prev.filter(b => b.id !== bombId));
      }, escapeMs);

      if (bombsLeft > 1) {
        queueCostruiscoBombSpawn(currentFactor, bombsLeft - 1);
      }
    }, delayMs);
  };

  const queueCostruiscoSpawn = (currentFactor: number) => {
    if (costruiscoSpawnTimeoutRef.current !== null) return;
    const spawnMinMs = scaleDurationByFactor(COSTRUISCO_BALLOON_SPAWN_MIN_MS, currentFactor, COSTRUISCO_SPAWN_SCALE_MIN);
    const spawnMaxMs = scaleDurationByFactor(COSTRUISCO_BALLOON_SPAWN_MAX_MS, currentFactor, COSTRUISCO_SPAWN_SCALE_MIN);
    const delayMs = randomInRange(spawnMinMs, spawnMaxMs);
    costruiscoSpawnTimeoutRef.current = window.setTimeout(() => {
      costruiscoSpawnTimeoutRef.current = null;

      if (costruiscoFailedRef.current || costruiscoGameCompletedRef.current) return;
      if (costruiscoBalloonPoolRef.current.length === 0) return;

      if (costruiscoActiveBalloonsRef.current.length >= COSTRUISCO_BALLOON_MAX_ACTIVE) {
        queueCostruiscoSpawn(currentFactor);
        return;
      }

      const [nextVal, ...remainingPool] = costruiscoBalloonPoolRef.current;
      costruiscoBalloonPoolRef.current = remainingPool;
      setCostruiscoBalloonPool(remainingPool);

      const balloonId = ++costruiscoBalloonTokenRef.current;
      const balloon: CostruiscoActiveBalloon = {
        id: balloonId,
        value: nextVal,
        lane: randomInRange(8, 92),
        flightMs: randomInRange(
          scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MIN_MS, currentFactor, COSTRUISCO_FLIGHT_SCALE_MIN),
          scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MAX_MS, currentFactor, COSTRUISCO_FLIGHT_SCALE_MIN),
        ),
        palette: COSTRUISCO_BALLOON_PALETTES[Math.floor(Math.random() * COSTRUISCO_BALLOON_PALETTES.length)],
        isCorrect: nextVal === worldId * currentFactor,
      };

      setCostruiscoActiveBalloons(prev => [...prev, balloon]);

      const correctFailTimeoutMs = Math.floor(balloon.flightMs * COSTRUISCO_CORRECT_FAIL_PROGRESS);
      costruiscoEscapeTimeoutsRef.current[balloon.id] = window.setTimeout(() => {
        delete costruiscoEscapeTimeoutsRef.current[balloon.id];
        setCostruiscoActiveBalloons(prev => prev.filter(active => active.id !== balloon.id));
        if (!balloon.isCorrect || costruiscoFailedRef.current || costruiscoGameCompletedRef.current) {
          return;
        }
        sound.playError();
        speak(GAMEPLAY_AUDIO_MESSAGES.costruiscoTooHigh);
        setCostruiscoFailReason('correct-escaped');
        setCostruiscoWrongTappedValue(null);
        setCostruiscoFailed(true);
        setCostruiscoGameCompleted(false);
        clearCostruiscoFlightTimeout();
      }, correctFailTimeoutMs);

      if (remainingPool.length > 0) {
        queueCostruiscoSpawn(currentFactor);
      }
    }, delayMs);
  };

  const startCostruiscoSingleBalloonGame = (currentFactor = factor) => {
    clearCostruiscoFlightTimeout();
    setCostruiscoGameCompleted(false);
    setCostruiscoFailed(false);
    setCostruiscoFailReason(null);
    setCostruiscoWrongTappedValue(null);
    setShowCostruiscoCompletionEffect(false);
    setCostruiscoPopBursts([]);
    setCostruiscoActiveBalloons([]);
    clearCostruiscoBlinkTimeout();
    setCostruiscoBlinkOn(false);
    setCostruiscoBlinkBonusRoundActive(Math.random() < 0.5);

    const pool = generateCostruiscoBalloonPool(worldId, currentFactor);
    costruiscoBalloonPoolRef.current = pool;
    setCostruiscoBalloonPool(pool);

    queueCostruiscoSpawn(currentFactor);
    queueCostruiscoBombSpawn(currentFactor, getBombCountForFactor(currentFactor));
  };

  const handleCostruiscoSingleBalloonTap = (balloon: CostruiscoActiveBalloon) => {
    if (costruiscoGameCompleted || costruiscoFailed) return;
    if (balloon.isTrap) onConsumeAvoidGuidance();
    else if (balloon.isCorrect) onConsumeTouchGuidance();

    sound.playBalloonPop();
    const timeoutId = costruiscoEscapeTimeoutsRef.current[balloon.id];
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      delete costruiscoEscapeTimeoutsRef.current[balloon.id];
    }

    setCostruiscoActiveBalloons(prev => prev.filter(active => active.id !== balloon.id));
    setCostruiscoPopBursts(prev => [...prev, { id: balloon.id, lane: balloon.lane }]);
    window.setTimeout(() => {
      setCostruiscoPopBursts(prev => prev.filter(burst => burst.id !== balloon.id));
    }, 380);

    if (balloon.isTrap) {
      sound.playBombTrapFailure();
      speak(GAMEPLAY_AUDIO_MESSAGES.costruiscoBomb);
      setCostruiscoFailReason('wrong-tap');
      setCostruiscoWrongTappedValue(null);
      setCostruiscoFailed(true);
      setCostruiscoGameCompleted(false);
      clearCostruiscoFlightTimeout();
      return;
    }

    const expected = worldId * factor;
    if (balloon.isCorrect) {
      clearCostruiscoFlightTimeout();
      sound.playSuccess();
      void speakMultiplicationSuccess(worldId, factor, expected);
      setCostruiscoGameCompleted(true);
      setCostruiscoFailed(false);
      setShowCostruiscoCompletionEffect(true);
      setCostruiscoCompleted(prev => new Set(prev).add(factor));
      onAnnounce(`Bravo! ${worldId} per ${factor} fa ${expected}.`);
      return;
    }

    sound.playError();
    void speak('Ops, numero sbagliato! Riprova da capo.');
    setCostruiscoFailReason('wrong-tap');
    setCostruiscoWrongTappedValue(balloon.value);
    setCostruiscoFailed(true);
    setCostruiscoGameCompleted(false);
    clearCostruiscoFlightTimeout();
  };

  const handleCostruiscoRetry = () => {
    sound.playClick();
    startCostruiscoSingleBalloonGame(factor);
  };

  const hasCostruiscoCorrectBalloonOnScreen = costruiscoActiveBalloons.some(balloon => balloon.isCorrect && !balloon.isTrap);

  // Random-blink bonus: when active for this round, periodically flash the
  // correct balloon's outline at unpredictable intervals (purely visual aid).
  useEffect(() => {
    const shouldSchedule =
      costruiscoBlinkBonusRoundActive &&
      hasCostruiscoCorrectBalloonOnScreen &&
      !costruiscoFailed &&
      !costruiscoGameCompleted &&
      !prefersReducedMotion;

    if (!shouldSchedule) {
      clearCostruiscoBlinkTimeout();
      return;
    }

    const scheduleNextBlink = () => {
      const delay = 900 + Math.random() * 2600;
      costruiscoBlinkTimeoutRef.current = window.setTimeout(() => {
        setCostruiscoBlinkOn(true);
        window.setTimeout(() => setCostruiscoBlinkOn(false), 350);
        scheduleNextBlink();
      }, delay);
    };
    scheduleNextBlink();

    return () => {
      clearCostruiscoBlinkTimeout();
    };
  }, [costruiscoBlinkBonusRoundActive, hasCostruiscoCorrectBalloonOnScreen, costruiscoFailed, costruiscoGameCompleted, prefersReducedMotion]);

  const hasCostruiscoTouchTarget = costruiscoActiveBalloons.some(balloon => balloon.isCorrect && !balloon.isTrap);
  const hasCostruiscoAvoidTarget = costruiscoActiveBalloons.some(balloon => balloon.isTrap);
  const shouldShowTouchGuidance = showCostruiscoTouchGuidance && !costruiscoFailed && !costruiscoGameCompleted && hasCostruiscoTouchTarget;
  const shouldShowAvoidGuidance = showCostruiscoAvoidGuidance && !costruiscoFailed && !costruiscoGameCompleted && hasCostruiscoAvoidTarget;

  useEffect(() => {
    startCostruiscoSingleBalloonGame(factor);
    return () => {
      clearCostruiscoFlightTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative bg-white rounded-3xl border border-emerald-100 shadow-xl ${compactLayout ? 'p-3 space-y-3' : 'p-5 space-y-6'}`}>
      <OperationPromptCard
        tone="emerald"
        icon="🎈"
        eyebrow="Completa questa operazione"
        operation={`${worldId} × ${factor} = ?`}
        onSpeakOperation={onSpeakOperation}
        operationAriaLabel={`Ascolta operazione ${worldId} per ${factor}`}
      />

      <div>
        <div className="relative mx-auto flex h-64 w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 via-cyan-50 to-sky-100">
          {costruiscoFailed ? (
            <div className="mx-4 space-y-2 rounded-2xl border border-rose-200 bg-white/95 p-4 text-center shadow-xl backdrop-blur-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl text-rose-600">💥</div>
              <p className="text-xs leading-relaxed text-slate-600">
                {costruiscoFailReason === 'wrong-tap' ? (
                  costruiscoWrongTappedValue === null ? (
                    <>💣 Palloncino trappola! Il numero era giusto, ma era una bomba.<br />Il palloncino vero aveva lo stesso numero ma era colorato!</>
                  ) : (
                    <>
                      Hai scoppiato il palloncino sbagliato (<b>{costruiscoWrongTappedValue}</b>)!<br />
                      Per <b>{worldId} × {factor}</b> il risultato era un altro.
                    </>
                  )
                ) : (
                  <>Oh no il palloncino è volato via!</>
                )}
              </p>
              <RetryButton
                tone="rose"
                className="mt-2"
                onClick={() => {
                  void speak('Riproviamo.');
                  handleCostruiscoRetry();
                }}
              />
            </div>
          ) : costruiscoGameCompleted ? (
            <div className="mx-4 space-y-2 rounded-2xl border border-emerald-200 bg-white/95 p-4 text-center shadow-xl backdrop-blur-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">🎉</div>
              <h3 className="text-base font-black text-emerald-800">Successo!</h3>
              <p className="text-xs text-slate-600">
                {getGenderedText(playerGender, 'Bravo! Risposta esatta:', 'Brava! Risposta esatta:')}<br />
                <b className="text-sm font-mono text-emerald-900">
                  <button
                    type="button"
                    onClick={onSpeakOperation}
                    className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-emerald-500"
                    aria-label={`Ascolta operazione ${worldId} per ${factor}`}
                  >
                    {worldId} × {factor} = {worldId * factor}
                  </button>
                </b>
              </p>
            </div>
          ) : (
            <>
              {costruiscoPopBursts.map((burst) => (
                <motion.div
                  key={`pop-${burst.id}`}
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: [1, 1.6, 0], opacity: [1, 1, 0] }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="pointer-events-none absolute bottom-2 -translate-x-1/2 select-none text-5xl"
                  style={{ left: `${burst.lane}%` }}
                >
                  💥
                </motion.div>
              ))}
              {costruiscoActiveBalloons.map((balloon) => (
                <div
                  key={`multi-balloon-${balloon.id}`}
                  className={`absolute bottom-2 -translate-x-1/2 ${balloon.isCorrect && !balloon.isTrap ? 'z-40' : balloon.isTrap ? 'z-20' : 'z-10'}`}
                  style={{ left: `${balloon.lane}%` }}
                >
                  {shouldShowTouchGuidance && balloon.isCorrect && !balloon.isTrap && (
                    <div className="pointer-events-none absolute left-1/2 top-0 z-30">
                      <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} />
                    </div>
                  )}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ y: 80, opacity: 1 }}
                    animate={prefersReducedMotion ? { y: 0, opacity: 1 } : { y: [80, COSTRUISCO_BALLOON_EXIT_Y], opacity: [1, 1, 0.95] }}
                    transition={prefersReducedMotion ? { duration: 0.1 } : { duration: balloon.flightMs / 1000, ease: 'linear' }}
                    onClick={() => handleCostruiscoSingleBalloonTap(balloon)}
                    className={`${compactLayout ? 'h-20 w-16 text-base' : 'h-24 w-20 text-lg'} relative cursor-pointer select-none rounded-[999px] border pb-2 pt-1 font-mono font-extrabold shadow-lg transition-all ${balloon.palette.body} ${costruiscoBlinkOn && balloon.isCorrect && !balloon.isTrap ? 'ring-4 ring-amber-300 ring-offset-2' : ''}`}
                    id={`balloon-single-${balloon.id}`}
                    aria-label={balloon.isTrap ? 'Palloncino bomba — non toccare!' : `Palloncino ${balloon.value}`}
                  >
                    {shouldShowAvoidGuidance && balloon.isTrap && (
                      <InteractionGuidanceHint kind="avoid" reducedMotion={prefersReducedMotion} />
                    )}
                    {balloon.isTrap ? (
                      <>
                        <span className="absolute left-2.5 top-2.5 h-3 w-3 rounded-full bg-white/60" />
                        <span className="text-xl font-black">{balloon.value}</span>
                        <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-[13px] shadow-lg" aria-hidden="true">💣</span>
                      </>
                    ) : (
                      <>
                        <span className="absolute left-2.5 top-2.5 h-3 w-3 rounded-full bg-white/60" />
                        <span className="text-xl font-black">{balloon.value}</span>
                      </>
                    )}
                    <span className={`absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] ${balloon.palette.knot}`} />
                    <span className={`absolute -bottom-3 left-1/2 h-3 w-[2px] -translate-x-1/2 rounded-full ${balloon.palette.string}`} />
                  </motion.button>
                </div>
              ))}
              {costruiscoActiveBalloons.length === 0 && costruiscoPopBursts.length === 0 && (
                <p className="rounded-full border border-sky-200 bg-white/75 px-3 py-1 text-[11px] font-bold text-sky-700">
                  Nuovo palloncino in arrivo...
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {showCostruiscoCompletionEffect && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-3xl bg-black/30 backdrop-blur-[1px]">
          <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
            <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
          </div>
        </div>
      )}
    </div>
  );
}
