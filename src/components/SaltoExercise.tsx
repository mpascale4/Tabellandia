/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SaltoExercise - self-contained "Salta" (skip counting) mini-game.
 * Extracted from WorldDetail.tsx following the pattern already established by
 * ComprendoBasketGame.tsx: the parent (WorldDetail) keeps ownership of the
 * "public" lifted state (selected factor, flow stage, gameCompleted, completion
 * effect, completedFactors set) since those are read by shared cross-step systems
 * (back-button handling, world-completion checks, footer buttons, guidance
 * auto-dismiss). Everything else - river/stones/frog mechanics, obstacles, the
 * fly cheat, and per-round option generation - lives here.
 */
import React, { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';
import InteractionGuidanceHint from './InteractionGuidanceHint';
import OperationPromptCard from './layout/OperationPromptCard';
import RetryButton from './layout/RetryButton';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';
import { shuffleArray } from '../utils/arrayHelpers';
import { withItalianArticle } from '../utils/italianWords';
import { SaltoAntagonist, buildSaltoEnemyLayout } from '../utils/saltoAntagonists';
import { useSaltoFlyCheat } from '../hooks/useSaltoFlyCheat';

const GAMEPLAY_AUDIO_MESSAGES = {
  saltoFall: 'Oh no, la ranocchia e caduta! Riproviamo.',
} as const;

interface SaltoExerciseProps {
  key?: React.Key;
  worldId: number;
  factor: number;
  compactLayout?: boolean;
  saltoGameCompleted: boolean;
  showSaltoCompletionEffect: boolean;
  showSaltoTouchGuidance: boolean;
  showSaltoAvoidGuidance: boolean;
  onConsumeTouchGuidance: () => void;
  onConsumeAvoidGuidance: () => void;
  onAnnounce: (message: string) => void;
  onSpeakOperation: () => void;
  setSaltoGameCompleted: Dispatch<SetStateAction<boolean>>;
  setShowSaltoCompletionEffect: Dispatch<SetStateAction<boolean>>;
  setSaltoCompleted: Dispatch<SetStateAction<Set<number>>>;
}

export default function SaltoExercise({
  worldId,
  factor,
  compactLayout = false,
  saltoGameCompleted,
  showSaltoCompletionEffect,
  showSaltoTouchGuidance,
  showSaltoAvoidGuidance,
  onConsumeTouchGuidance,
  onConsumeAvoidGuidance,
  onAnnounce,
  onSpeakOperation,
  setSaltoGameCompleted,
  setShowSaltoCompletionEffect,
  setSaltoCompleted,
}: SaltoExerciseProps) {
  const { speak } = useVoice();
  const isFactorOne = factor === 1;

  const [saltoIndex, setSaltoIndex] = useState<number>(0);
  const [saltoOptions, setSaltoOptions] = useState<number[]>([]);
  const [saltoCorrectClicks, setSaltoCorrectClicks] = useState<Set<number>>(new Set());
  const [isFrogSplashing, setIsFrogSplashing] = useState<boolean>(false);
  const [saltoFailReason, setSaltoFailReason] = useState<'obstacle' | 'fall' | null>(null);
  const [saltoEnemySteps, setSaltoEnemySteps] = useState<number[]>([]);
  const [saltoJumpedEnemySteps, setSaltoJumpedEnemySteps] = useState<Set<number>>(new Set());
  const [saltoAntagonistsByStep, setSaltoAntagonistsByStep] = useState<Record<number, SaltoAntagonist>>({});
  const [saltoFrogPosition, setSaltoFrogPosition] = useState<number>(0);
  const [saltoLeap, setSaltoLeap] = useState<{ from: number; to: number } | null>(null);
  const [saltoTapHop, setSaltoTapHop] = useState<{ step: number; token: number } | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const saltoStoneRef = useRef<HTMLDivElement | null>(null);
  const saltoContainerRef = useRef<HTMLDivElement | null>(null);
  const saltoFinishRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const generateSaltoOptions = (currentFactor: number) => {
    const optionsSet = new Set<number>();
    const minOptionCount = Math.max(4, currentFactor);

    for (let step = 1; step <= currentFactor; step++) {
      optionsSet.add(worldId * step);
    }

    let attempts = 0;
    while (optionsSet.size < minOptionCount && attempts < 200) {
      const randomMultiplier = Math.floor(Math.random() * 14) + 1;
      optionsSet.add(worldId * randomMultiplier);
      attempts++;
    }

    let fallbackMultiplier = currentFactor + 1;
    while (optionsSet.size < minOptionCount) {
      optionsSet.add(worldId * fallbackMultiplier);
      fallbackMultiplier++;
    }

    return shuffleArray(Array.from(optionsSet));
  };

  const startNewRound = (currentFactor: number) => {
    const enemyLayout = buildSaltoEnemyLayout(currentFactor);
    setSaltoEnemySteps(enemyLayout.steps);
    setSaltoJumpedEnemySteps(new Set());
    setSaltoAntagonistsByStep(enemyLayout.antagonistsByStep);
    setSaltoOptions(generateSaltoOptions(currentFactor));
  };

  // Initialize the round once when this component mounts for a newly selected factor.
  // (The parent mounts/unmounts this component per round, so this runs exactly once per round.)
  useEffect(() => {
    startNewRound(factor);
    sound.startSaltoAmbience();
    return () => {
      sound.stopSaltoAmbience();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll the stream stones so the frog stays centered in view as it moves
  useEffect(() => {
    const timer = setTimeout(() => {
      if (saltoContainerRef.current) {
        const container = saltoContainerRef.current;
        let targetStone: HTMLElement | null = null;

        if (saltoGameCompleted && saltoFinishRef.current) {
          targetStone = saltoFinishRef.current;
        } else if (saltoStoneRef.current) {
          targetStone = saltoStoneRef.current;
        } else if (saltoFrogPosition === 0) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
          return;
        }

        if (targetStone) {
          const containerWidth = container.clientWidth;
          const stoneLeft = targetStone.offsetLeft;
          const stoneWidth = targetStone.offsetWidth;
          const targetScrollLeft = stoneLeft - containerWidth / 2 + stoneWidth / 2;
          container.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: 'smooth'
          });
        }
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [saltoIndex, saltoFrogPosition, isFrogSplashing, saltoGameCompleted]);

  const saltoExpectedValue = worldId * (saltoIndex + 1);
  const saltoCurrentObstacleLabel = withItalianArticle(saltoAntagonistsByStep[saltoIndex + 1]?.label ?? 'ostacolo');

  const {
    isFlyAutoJumping,
    saltoFlyVisible,
    saltoFlyLane,
    saltoFlyDirection,
    triggerFlyAutoJumpCheat,
    clearFlyAutoJump,
    hideSaltoFly,
    resetFlyUsage,
    SALTO_FLY_TRAVEL_MS,
  } = useSaltoFlyCheat({
    activeStep: 'salto',
    saltoFlowStage: 'game',
    saltoSelectedFactor: factor,
    saltoGameCompleted,
    isFrogSplashing,
    saltoFrogPosition,
    saltoIndex,
    saltoEnemySteps,
    worldId,
    prefersReducedMotion,
    announceWithFallback: onAnnounce,
    setSaltoJumpedEnemySteps,
    setSaltoLeap,
    setSaltoCorrectClicks,
    setSaltoFrogPosition,
    setSaltoIndex,
    setSaltoGameCompleted,
    setShowSaltoCompletionEffect,
    setSaltoCompleted,
  });

  const showSaltoFrogTouchGuidance = showSaltoAvoidGuidance;
  const showSaltoFlyTouchGuidance = isFactorOne && saltoFlyVisible && !saltoGameCompleted && !isFrogSplashing;

  const triggerSaltoFrogJump = (fromStep: number) => {
    if (saltoGameCompleted || isFrogSplashing || saltoLeap !== null || isFlyAutoJumping) return;
    sound.playFrogCroak();
    const currentEnemyStep = saltoIndex + 1;
    const isJumpWindowOpen =
      saltoEnemySteps.includes(currentEnemyStep) &&
      !saltoJumpedEnemySteps.has(currentEnemyStep);

    if (isJumpWindowOpen) {
      onConsumeAvoidGuidance();
      const toStep = currentEnemyStep;
      const jumpedAntagonist = saltoAntagonistsByStep[currentEnemyStep];
      const jumpedLabel = withItalianArticle(jumpedAntagonist?.label ?? 'ostacolo');
      const leapMs = prefersReducedMotion ? 140 : 420;
      setSaltoLeap({ from: fromStep, to: toStep });
      speak(`Ottimo! Hai saltato ${jumpedLabel}.`);
      window.setTimeout(() => {
        setSaltoJumpedEnemySteps(prev => new Set(prev).add(currentEnemyStep));
        setSaltoFrogPosition(toStep);
        setSaltoLeap(null);
      }, leapMs);
      return;
    }

    const token = Date.now();
    const hopMs = prefersReducedMotion ? 120 : 260;
    setSaltoTapHop({ step: fromStep, token });
    window.setTimeout(() => {
      setSaltoTapHop(current => (current?.token === token ? null : current));
    }, hopMs);
  };

  const speakSaltoSuccess = (a: number, b: number, result: number) => {
    return speak(buildMultiplicationResultSpeech(a, b, result));
  };

  return (
    <div className={`relative bg-white rounded-3xl border border-purple-100 shadow-xl ${compactLayout ? 'p-3 space-y-3' : 'p-5 space-y-5'}`}>
      <OperationPromptCard
        tone="purple"
        icon="🐸"
        eyebrow="Completa questa operazione"
        operation={`${worldId} × ${factor} = ${saltoGameCompleted ? worldId * factor : '?'}`}
        onSpeakOperation={onSpeakOperation}
        operationAriaLabel={`Ascolta operazione ${worldId} per ${factor}`}
      />

      {/* River Stream with Stepping Stones & Frog */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-sky-400 via-sky-500 to-teal-600 border-2 border-sky-300 shadow-inner p-3 min-h-[160px] flex flex-col justify-between overflow-hidden">
        <AnimatePresence>
          {saltoFlyVisible && !saltoGameCompleted && !isFrogSplashing && (
            <motion.button
              type="button"
              key={`salto-fly-${saltoFlyLane}-${saltoFlyDirection}`}
              initial={{
                opacity: 0,
                scale: 0.95,
                x: saltoFlyDirection === 'leftToRight' ? -44 : 316,
                y: 0,
              }}
              animate={prefersReducedMotion
                ? {
                    opacity: 1,
                    x: saltoFlyDirection === 'leftToRight' ? 316 : -44,
                    y: 0,
                  }
                : {
                    opacity: 1,
                    x: saltoFlyDirection === 'leftToRight'
                      ? [-44, 8, 54, 100, 146, 192, 238, 284, 316]
                      : [316, 264, 218, 172, 126, 80, 34, -12, -44],
                    y: [0, -3, 2, -4, 2, -3, 2, -2, 0],
                    rotate: [0, -4, 3, -5, 3, -4, 2, -3, 0],
                  }}
              exit={{ opacity: 0 }}
              transition={prefersReducedMotion
                ? { duration: 1.4, ease: 'linear' }
                : {
                    duration: SALTO_FLY_TRAVEL_MS / 1000,
                    ease: 'linear',
                    times: [0, 0.12, 0.24, 0.36, 0.5, 0.64, 0.78, 0.9, 1],
                  }}
              onClick={triggerFlyAutoJumpCheat}
              className="absolute z-40 inline-flex h-10 w-10 items-center justify-center border-0 bg-transparent text-3xl transition hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-100"
              style={{ top: `${18 + saltoFlyLane * 28}px`, left: 0 }}
              aria-label="Tocca la mosca per aiutare la rana a completare tutti i salti rimanenti"
              title="Tocca la mosca"
            >
              {showSaltoFlyTouchGuidance && (
                <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2">
                  <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} />
                </div>
              )}
              <span aria-hidden="true" className="select-none">🪰</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Water sparkles background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:16px_16px]" />
        {/* River Stream Container */}
        <div className="relative z-10 my-1 flex min-w-0 items-center justify-between gap-1 px-2 py-2 bg-sky-900/30 backdrop-blur-xs rounded-2xl border border-sky-200/30">
          {/* Stepping Stones Container (Riva + Stones 1 to factor) */}
          <div
            ref={saltoContainerRef}
            data-touch-swipe-lock="true"
            className="relative flex min-w-0 flex-1 items-center justify-start gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-2 pt-8 pb-2 sm:gap-3.5"
            style={{ touchAction: 'pan-x' }}
          >
            {/* Start Bank (Riva / Partenza) - Frog starts here! */}
            <div
              ref={saltoFrogPosition === 0 && !saltoGameCompleted ? saltoStoneRef : null}
              className="relative flex flex-col items-center justify-end shrink-0 min-w-[50px] pt-8 pb-2 px-1"
            >
              {saltoFrogPosition === 0 && !saltoGameCompleted && (
                <motion.button
                  type="button"
                  onClick={() => triggerSaltoFrogJump(0)}
                  aria-label="Salta con la rana"
                  key={`frog-start-${isFrogSplashing}-${saltoLeap ? 'leap' : 'idle'}`}
                  initial={isFrogSplashing ? { y: -10, rotate: 0 } : { y: -10, scale: 0.8 }}
                  animate={
                    isFrogSplashing
                      ? { y: [0, 28, 72], rotate: [0, 12, 20], scale: [1, 1.06, 0.96], opacity: [1, 1, 0] }
                      : saltoLeap?.from === 0
                        ? { x: [0, 24, 52], y: [0, -20, 0], rotate: [0, -8, 0], opacity: [1, 1, 0] }
                        : saltoTapHop?.step === 0
                          ? { y: [0, -16, 0], scale: [1, 1.08, 1] }
                          : { y: [0, -6, 0], scale: 1 }
                  }
                  transition={
                    isFrogSplashing
                      ? { duration: prefersReducedMotion ? 0.2 : 0.42, ease: "easeIn" }
                      : saltoLeap?.from === 0
                        ? { duration: prefersReducedMotion ? 0.14 : 0.42, ease: "easeInOut" }
                        : saltoTapHop?.step === 0
                          ? { duration: prefersReducedMotion ? 0.12 : 0.26, ease: "easeOut" }
                          : { y: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } }
                  }
                  className="absolute -top-7 z-30 flex flex-col items-center cursor-pointer"
                >
                  <span className="text-3xl sm:text-4xl filter drop-shadow-lg select-none">🐸</span>
                  {showSaltoFrogTouchGuidance && (
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 translate-y-0.5">
                      <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} />
                    </span>
                  )}
                </motion.button>
              )}
              {saltoFrogPosition === 0 && isFrogSplashing && (
                <span className="pointer-events-none absolute bottom-1 z-20 text-xl select-none" aria-hidden="true">💦</span>
              )}
              <span className="text-xl">🌱</span>
              <span className="text-[9px] font-black text-sky-950 bg-amber-100 px-1.5 py-0.5 rounded shadow-xs font-sans">
                Riva
              </span>
            </div>

            {/* Stepping Stones (1 to factor) */}
            {Array.from({ length: factor }).map((_, idx) => {
              const stoneStep = idx + 1;
              const stoneNum = worldId * (idx + 1);
              const isLastStone = idx === factor - 1;
              const isFrogHere = !saltoGameCompleted && saltoFrogPosition === stoneStep;
              const isFrogOnFinish = saltoGameCompleted && isLastStone;
              const isReached = (stoneStep <= saltoIndex) || saltoGameCompleted;
              const hasEnemyStep = saltoEnemySteps.includes(idx + 1);
              const isEnemyStepPending = hasEnemyStep && !saltoJumpedEnemySteps.has(stoneStep) && !isReached;
              const isNextTarget = !saltoGameCompleted && idx === saltoIndex && !isEnemyStepPending;
              const enemyForStep = saltoAntagonistsByStep[idx + 1];

              return (
                <React.Fragment key={idx}>
                  {hasEnemyStep && (
                    <div className="relative flex flex-col items-center justify-end min-w-[40px] shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (!enemyForStep) return;
                          onConsumeAvoidGuidance();
                          sound.playSaltoAntagonistSound(enemyForStep.id);
                          speak(enemyForStep.label);
                        }}
                        className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shadow-sm transition-all cursor-pointer ${
                          isEnemyStepPending
                            ? 'bg-rose-100 border-rose-400 ring-4 ring-rose-200 motion-safe:animate-pulse'
                            : 'bg-slate-100 border-slate-300 opacity-65'
                        } relative`}
                        aria-label={enemyForStep ? `Step antagonista ${enemyForStep.label}` : 'Step antagonista'}
                      >
                        <span className="text-base leading-none" role="img" aria-hidden="true">
                          {enemyForStep ? enemyForStep.emoji : '👾'}
                        </span>
                      </button>
                    </div>
                  )}
                  <div
                    ref={isFrogHere ? saltoStoneRef : isFrogOnFinish ? saltoFinishRef : null}
                    className="relative flex flex-col items-center justify-end min-w-[46px] shrink-0"
                  >
                    {isFrogHere && (
                      <motion.button
                        type="button"
                        onClick={() => triggerSaltoFrogJump(stoneStep)}
                        aria-label="Salta con la rana"
                        key={`frog-${idx}-${isFrogSplashing}-${saltoLeap ? 'leap' : 'idle'}`}
                        initial={isFrogSplashing ? { y: -10, rotate: 0 } : { y: -10, scale: 0.8 }}
                        animate={
                          isFrogSplashing
                            ? { y: [0, 28, 72], rotate: [0, 12, 20], scale: [1, 1.06, 0.96], opacity: [1, 1, 0] }
                            : saltoLeap?.from === stoneStep
                              ? isFlyAutoJumping
                                ? { x: [0, 26, 58], y: [0, -34, -12, 0], rotate: [0, -12, 10, 0], scale: [1, 1.08, 1.12, 1], opacity: [1, 1, 1, 0] }
                                : { x: [0, 24, 52], y: [0, -20, 0], rotate: [0, -8, 0], opacity: [1, 1, 0] }
                              : saltoTapHop?.step === stoneStep
                                ? { y: [0, -16, 0], scale: [1, 1.08, 1] }
                                : { y: [0, -6, 0], scale: 1 }
                        }
                        transition={
                          isFrogSplashing
                            ? { duration: prefersReducedMotion ? 0.2 : 0.42, ease: "easeIn" }
                            : saltoLeap?.from === stoneStep
                              ? { duration: prefersReducedMotion ? 0.18 : isFlyAutoJumping ? 0.52 : 0.42, ease: "easeInOut" }
                              : saltoTapHop?.step === stoneStep
                                ? { duration: prefersReducedMotion ? 0.12 : 0.26, ease: "easeOut" }
                                : { y: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } }
                        }
                        className="absolute -top-7 z-30 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-3xl sm:text-4xl filter drop-shadow-lg select-none">🐸</span>
                        {showSaltoFrogTouchGuidance && (
                          <span className="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 translate-y-0.5">
                            <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} />
                          </span>
                        )}
                      </motion.button>
                    )}
                    {isFrogHere && isFrogSplashing && (
                      <span className="pointer-events-none absolute bottom-1 z-20 text-xl select-none" aria-hidden="true">💦</span>
                    )}

                    {isFrogOnFinish && (
                      <motion.div
                        initial={{ scale: 0, y: -15 }}
                        animate={{ scale: [1, 1.2, 1], y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
                        className="absolute -top-7 z-30 flex flex-col items-center pointer-events-none"
                      >
                        <span className="text-3xl sm:text-4xl filter drop-shadow-lg select-none">🐸</span>
                        <span className="absolute -top-2.5 -right-1.5 text-base animate-bounce">👑</span>
                      </motion.div>
                    )}

                    {/* Stepping Stone 🪨 */}
                    <motion.button
                      type="button"
                      onClick={() => {
                        if (isLastStone) {
                          speak('Traguardo');
                          return;
                        }
                        speak(isReached ? stoneNum.toString() : `Sasso ${idx + 1}`);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-mono font-black text-xs sm:text-sm border-2 shadow-sm transition-all cursor-pointer relative ${
                        isFrogOnFinish
                          ? 'bg-amber-300 border-amber-500 text-amber-950 ring-4 ring-amber-300 shadow-lg scale-105'
                          : isReached
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-md ring-2 ring-emerald-300/50'
                            : isNextTarget
                              ? 'bg-amber-50 border-amber-400 text-amber-900 ring-4 ring-amber-300/80 shadow-md animate-pulse'
                              : 'bg-slate-200/90 border-slate-300 text-slate-600'
                      }`}
                    >
                      {isReached ? stoneNum : isNextTarget ? '?' : '🪨'}
                    </motion.button>

                    {/* Badge below last stone */}
                    {isLastStone && (
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 shadow-2xs ${
                        isFrogOnFinish
                          ? 'bg-amber-300 text-amber-950 border border-amber-400 font-sans'
                          : 'bg-slate-200 text-slate-600 border border-slate-300 font-sans'
                      }`}>
                        {isFrogOnFinish ? 'Traguardo! 👑' : `Traguardo ${stoneNum}`}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Options Grid or Splash Retry Button */}
        {isFrogSplashing ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full rounded-2xl border-2 border-rose-200 bg-white/95 px-4 py-4 text-center shadow-lg"
          >
            <p className="text-sm font-black text-rose-700">
              {saltoFailReason === 'obstacle'
                ? `Oh no! Ti ha fermato ${saltoCurrentObstacleLabel}.`
                : 'Oh no, la ranocchia e caduta!'}
            </p>
            <RetryButton
              tone="rose"
              className="mt-3"
              onClick={() => {
                sound.playClick();
                clearFlyAutoJump();
                hideSaltoFly();
                void speak('Riproviamo.');
                setIsFrogSplashing(false);
                setSaltoFailReason(null);
                setSaltoIndex(0);
                setSaltoCorrectClicks(new Set());
                resetFlyUsage();
                setSaltoFrogPosition(0);
                setSaltoLeap(null);
                setSaltoTapHop(null);
                startNewRound(factor);
              }}
            />
          </motion.div>
        ) : (
          <div className="w-full space-y-2.5">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {saltoOptions.map((opt, idx) => {
                const solvedNum = worldId * factor;
                const isSelected = saltoGameCompleted && opt === solvedNum;
                const isCorrectlyClicked = saltoCorrectClicks.has(opt);

                return (
                  <div key={idx} className="relative">
                    {showSaltoTouchGuidance && opt === saltoExpectedValue && (
                      <div className="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 translate-y-1">
                        <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} />
                      </div>
                    )}
                    <button
                      disabled={saltoGameCompleted || isFlyAutoJumping}
                      onClick={() => {
                        if (saltoGameCompleted || isFrogSplashing || saltoLeap !== null || isFlyAutoJumping) return;
                        onConsumeTouchGuidance();
                        const isObstacleBlocking =
                          saltoEnemySteps.includes(saltoIndex + 1) &&
                          !saltoJumpedEnemySteps.has(saltoIndex + 1);
                        if (isObstacleBlocking) {
                          onConsumeAvoidGuidance();
                          sound.playError();
                          const blockingAntagonist = saltoAntagonistsByStep[saltoIndex + 1];
                          const blockingLabel = withItalianArticle(blockingAntagonist?.label ?? 'ostacolo');
                          speak(`Oh no! Ti ha fermato ${blockingLabel}.`);
                          setSaltoFailReason('obstacle');
                          setIsFrogSplashing(true);
                          return;
                        }
                        const expected = worldId * (saltoIndex + 1);
                        if (opt === expected) {
                          sound.playSuccess();
                          setSaltoCorrectClicks(prev => new Set([...prev, opt]));
                          setSaltoFrogPosition(saltoIndex + 1);
                          setSaltoLeap(null);
                          const landedNumberSpeech = opt.toString();
                          onAnnounce(landedNumberSpeech);
                          if (saltoIndex + 1 >= factor) {
                            window.setTimeout(() => {
                              speakSaltoSuccess(worldId, factor, opt);
                            }, 320);
                            setSaltoGameCompleted(true);
                            setShowSaltoCompletionEffect(true);
                            setSaltoCompleted(prev => new Set([...prev, factor]));
                          } else {
                            setSaltoIndex(prev => prev + 1);
                          }
                        } else {
                          sound.playError();
                          speak(GAMEPLAY_AUDIO_MESSAGES.saltoFall);
                          setSaltoFailReason('fall');
                          setIsFrogSplashing(true);
                        }
                      }}
                      className={`py-3 sm:py-3.5 text-base sm:text-xl font-black font-mono w-full px-1 rounded-2xl border-2 bg-white shadow-sm transition-all ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-200 text-emerald-950 ring-4 ring-emerald-300 shadow-lg scale-105 cursor-default'
                          : isCorrectlyClicked
                            ? 'border-emerald-700 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-300 shadow-md cursor-pointer'
                          : saltoGameCompleted
                            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                            : 'border-purple-100 hover:border-purple-400 text-purple-950 hover:bg-purple-50 cursor-pointer shadow-xs active:scale-95'
                      } relative`}
                      id={`salto-opt-${opt}`}
                    >
                      {isCorrectlyClicked && (
                        <span
                          className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] font-black shadow-md"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                      {opt}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showSaltoCompletionEffect && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto">
          <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
            <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
          </div>
        </div>
      )}
    </div>
  );
}
