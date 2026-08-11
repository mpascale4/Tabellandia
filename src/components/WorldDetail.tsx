/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSaltoFlyCheat } from '../hooks/useSaltoFlyCheat';
import { shuffleArray, toAscendingOptions, takeRandom } from '../utils/arrayHelpers';
import { toItalianWord } from '../utils/italianWords';
import { HelperGuidanceKey, WorldConfig, UserProfile, QuestionAttempt, createDefaultWorldProgress } from '../types';
import {
  MONUMENT_CLUE_COST,
  PRATICO_REWARD_COINS,
  PRATICO_REWARD_DROPS,
  SFIDA_UNLOCK_COST,
  SFIDA_FEEDBACK_HOLD_MS,
  SFIDA_RECORD_THRESHOLD,
  SFIDA_DROPS_LOW_THRESHOLD,
  GAME_REWARDS_CONFIG,
  getMonumentCostMissingMessage,
  getSfidaUnlockMissingCoinsMessage
} from '../constants/gameRules';
import { sound } from './SoundManager';
import { AlertCircle, Award, Compass } from 'lucide-react';
import ComprendoBasketGame, { type ComprendoBasketGameHandle } from './ComprendoBasketGame';
import SaltoExercise from './SaltoExercise';
import CostruiscoExercise from './CostruiscoExercise';
import TrucchiExercise from './TrucchiExercise';
import PraticoQuizCard from './PraticoQuizCard';
import SfidaQuizCard from './SfidaQuizCard';
import RewardPopup from './RewardPopup';
import FireworksOverlay from './FireworksOverlay';
import InteractionGuidanceHint from './InteractionGuidanceHint';
import ActionGrid from './layout/ActionGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';
import RetryButton from './layout/RetryButton';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';
import { useVoice } from '../contexts/VoiceContext';
import { getGenderedText, getPlayerGender } from '../utils/playerCopy';
import { WORLDS_DATA } from '../data';

interface WorldDetailProps {
  world: WorldConfig;
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  onBack: (targetWorldId?: number) => void;
  compactLayout?: boolean;
  initialExercise?: string | null;
}

type CorrectRankTracker = {
  counts: [number, number, number, number];
  lastRank: number | null;
  repeatCount: number;
};

const createCorrectRankTracker = (): CorrectRankTracker => ({
  counts: [0, 0, 0, 0],
  lastRank: null,
  repeatCount: 0,
});

const buildAscendingOptionsWithBalancedRank = (
  correct: number,
  candidatePool: number[],
  unitStep: number,
  tracker: CorrectRankTracker,
): number[] => {
  const normalizedStep = Math.max(1, Math.floor(unitStep));
  const uniquePool = Array.from(
    new Set(
      candidatePool
        .map(n => Math.floor(n))
        .filter(n => Number.isInteger(n) && n > 0 && n !== correct)
    )
  );

  for (let step = 1; uniquePool.length < 12 && step <= 10; step++) {
    const low = correct - step * normalizedStep;
    const high = correct + step * normalizedStep;
    if (low > 0) uniquePool.push(low);
    uniquePool.push(high);
  }

  const below = Array.from(new Set(uniquePool.filter(n => n < correct)));
  const above = Array.from(new Set(uniquePool.filter(n => n > correct)));
  const rankOrder = [0, 1, 2, 3].sort((a, b) => tracker.counts[a] - tracker.counts[b]);
  const rankCandidates = (tracker.lastRank !== null && tracker.repeatCount >= 2)
    ? rankOrder.filter(rank => rank !== tracker.lastRank)
    : rankOrder;
  const fallbackRanks = [0, 1, 2, 3].filter(rank => !rankCandidates.includes(rank as 0 | 1 | 2 | 3));
  const tryRanks = [...rankCandidates, ...fallbackRanks];

  let chosenRank = 0;
  for (const rank of tryRanks) {
    const neededBelow = rank;
    const neededAbove = 3 - rank;
    if (below.length >= neededBelow && above.length >= neededAbove) {
      chosenRank = rank;
      break;
    }
  }

  const neededBelow = chosenRank;
  const neededAbove = 3 - chosenRank;
  let distractors = [
    ...takeRandom(below, neededBelow),
    ...takeRandom(above, neededAbove),
  ];

  if (distractors.length < 3) {
    const orderedByDistance = Array.from(new Set(uniquePool))
      .sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct));
    for (const value of orderedByDistance) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(value) && value !== correct && value > 0) {
        distractors.push(value);
      }
    }
  }

  const options = toAscendingOptions([correct, ...distractors].slice(0, 4));
  while (options.length < 4) {
    const candidate = correct + (options.length + 1) * normalizedStep;
    if (!options.includes(candidate)) options.push(candidate);
  }
  const finalized = toAscendingOptions(options);
  const actualRank = finalized.findIndex(value => value === correct);

  if (actualRank >= 0 && actualRank <= 3) {
    tracker.counts[actualRank] += 1;
    if (tracker.lastRank === actualRank) {
      tracker.repeatCount += 1;
    } else {
      tracker.lastRank = actualRank;
      tracker.repeatCount = 1;
    }
  }

  return finalized;
};

const TRUCCHI_PYRAMID_ROWS = [1, 2, 3, 4] as const;
const TRUCCHI_PREVIEW_MS = 1000;
const TRUCCHI_REVEAL_MS = 260;
const TRUCCHI_COLLAPSE_MS = 620;
const TRUCCHI_HAMMER_START_FACTOR = 1;
const TRUCCHI_HAMMER_TRAVEL_MS = 520;
const TRUCCHI_PREVIEW_SCALE_MIN = 0.48;
const SFIDA_FIXED_DROPS_REWARD = 15;
const INTERACTION_GUIDANCE_VISIBLE_MS = 5000;
const STEP_MOTIVATION_MESSAGES = {
  male: [
    'Bravissimo! Stai andando alla grande!',
    'Che campione! Hai completato tutte le tabelline di questo passo!',
    'Fantastico lavoro! Continua così!',
    'Sei fortissimo! Hai fatto 10 su 10!',
    'Grandissimo! Hai conquistato questo passo!',
  ],
  female: [
    'Bravissima! Stai andando alla grande!',
    'Che campionessa! Hai completato tutte le tabelline di questo passo!',
    'Fantastico lavoro! Continua così!',
    'Sei fortissima! Hai fatto 10 su 10!',
    'Grandissima! Hai conquistato questo passo!',
  ],
} as const;

const STEP_UNLOCK_MESSAGES = {
  male: {
    salto: 'Il passo successivo Salta è sbloccato! 🐸',
    costruisco: 'Il passo successivo Scoppia è sbloccato! 🎈',
    trucchi: 'Il passo successivo Trova è sbloccato! 🧱',
    pratico: 'La Sfida è sbloccata! ⚔️ Raccogli le monete per entrare!',
  },
  female: {
    salto: 'Il passo successivo Salta è sbloccato! 🐸',
    costruisco: 'Il passo successivo Scoppia è sbloccato! 🎈',
    trucchi: 'Il passo successivo Trova è sbloccato! 🧱',
    pratico: 'La Sfida è sbloccata! ⚔️ Raccogli le monete per entrare!',
  },
} as const;

const STEP_LABELS = {
  salto: { title: '2. Salta', icon: '🐸', short: 'Salta' },
  costruisco: { title: '3. Scoppia', icon: '🎈', short: 'Scoppia' },
  trucchi: { title: '4. Trova', icon: '🧱', short: 'Trova' },
  pratico: { title: '5. Pratico (Avventura)', icon: '🛡️', short: 'Pratico' },
} as const;

const GAMEPLAY_AUDIO_MESSAGES = {
  saltoFall: 'Oh no, la ranocchia e caduta! Riproviamo.',
  saltoObstacleBlocked: "Oh no! Ti ha fermato l'antagonista.",
  quizWrong: 'Quasi. Riprova con calma.',
  sfidaWrong: 'Ops, risposta sbagliata.',
  trucchiWrong: 'Riprova. Prova un altro numero.',
  trucchiCollapse: 'Oh no, la piramide e caduta! Riproviamo.',
  trucchiHammer: 'Oh no! Il martello ha distrutto il mattone giusto!',
  combinationLocked: 'Questa combinazione e ancora bloccata.',
  stepLocked: 'Completa prima tutti i passi precedenti!',
  sfidaLocked: 'Completa prima tutti i passi precedenti per sbloccare la Sfida.',
  notEnoughLightDrops: 'Non hai ancora abbastanza gocce di luce.',
  monumentDiscovered: 'Ottimo! Hai scoperto un nuovo indizio.',
  monumentAlreadyDiscovered: 'Hai già scoperto questo indizio. Rileggiamolo insieme.',
} as const;

export default function WorldDetail({ world, profile, updateProfile, onBack, compactLayout = false, initialExercise }: WorldDetailProps) {
  const { speak, voiceEnabled } = useVoice();
  const playerGender = getPlayerGender(profile);
  const ALL_STEP_IDS = ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'];
  const ALL_FACTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const [activeStep, setActiveStep] = useState<string>(initialExercise || 'intro'); // intro, comprendo, salto, costruisco, trucchi, pratico, sfida
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(false);
  const [showRewardPopup, setShowRewardPopup] = useState<{ step: string; coins: number; drops: number } | null>(null);
  const [motivationPopup, setMotivationPopup] = useState<{
    stepName: 'comprendo' | 'salto' | 'costruisco' | 'trucchi';
    message: string;
    unlockedStepId: 'salto' | 'costruisco' | 'trucchi' | 'pratico' | null;
    unlockedStepLabel: string | null;
  } | null>(null);

  // View stack for modal-to-page conversion
  const [viewStack, setViewStack] = useState<string[]>([]); // Stack of views, e.g. ['rules-comprendo', 'intro']
  const currentView = viewStack.length > 0 ? viewStack[viewStack.length - 1] : null;
  const pushView = (view: string) => setViewStack([...viewStack, view]);
  const popView = () => setViewStack(viewStack.slice(0, -1));
  const replaceTopView = (view: string) => setViewStack(prev => prev.length > 0 ? [...prev.slice(0, -1), view] : [view]);

  // Track completed combinations for each step (1-10 correspond to x1 to x10)
  const [comprendoCompleted, setComprendoCompleted] = useState<Set<number>>(new Set());
  const [saltoCompleted, setSaltoCompleted] = useState<Set<number>>(new Set());
  const [costruiscoCompleted, setCostruiscoCompleted] = useState<Set<number>>(new Set());
  const [trucchiCompleted, setTrucchiCompleted] = useState<Set<number>>(new Set());
  
  // Track which combination is currently being played (null = show list, 1-10 = playing that combination)
  const [comprendoSelectedFactor, setComprendoSelectedFactor] = useState<number | null>(null);
  const [comprendoFlowStage, setComprendoFlowStage] = useState<'objective' | 'game'>('objective');
  const [comprendoGameCompleted, setComprendoGameCompleted] = useState<boolean>(false);
  const [showComprendoCompletionEffect, setShowComprendoCompletionEffect] = useState<boolean>(false);
  const [saltoSelectedFactor, setSaltoSelectedFactor] = useState<number | null>(null);
  const [saltoFlowStage, setSaltoFlowStage] = useState<'objective' | 'game'>('objective');
  const [saltoGameCompleted, setSaltoGameCompleted] = useState<boolean>(false);
  const [showSaltoCompletionEffect, setShowSaltoCompletionEffect] = useState<boolean>(false);
  const [costruiscoSelectedFactor, setCostruiscoSelectedFactor] = useState<number | null>(null);
  const [costruiscoFlowStage, setCostruiscoFlowStage] = useState<'objective' | 'game'>('objective');
  const [costruiscoGameCompleted, setCostruiscoGameCompleted] = useState<boolean>(false);
  const [showCostruiscoCompletionEffect, setShowCostruiscoCompletionEffect] = useState<boolean>(false);
  const [trucchiSelectedFactor, setTrucchiSelectedFactor] = useState<number | null>(null);
  const [trucchiFlowStage, setTrucchiFlowStage] = useState<'objective' | 'game'>('objective');
  const [showTrucchiCompletionEffect, setShowTrucchiCompletionEffect] = useState<boolean>(false);
  const [trucchiGameCompleted, setTrucchiGameCompleted] = useState<boolean>(false);
  // Note: Salto's in-round mechanics (frog position, options, obstacles, fly cheat) live in SaltoExercise.tsx

  // Costruisco (Step 3) state
  const [completedMonuments, setCompletedMonuments] = useState<string[]>([]); // Track completed monuments
  const comprendoCompletionOverlayTimeoutRef = useRef<number | null>(null);
  const comprendoBasketGameRef = useRef<ComprendoBasketGameHandle | null>(null);
  const activeStepCardRef = useRef<HTMLButtonElement | null>(null);
  const COMPRENDO_COMPLETION_OVERLAY_MS = 1200;

  const speakMultiplicationSuccess = (a: number, b: number, result: number) => {
    return speak(buildMultiplicationResultSpeech(a, b, result));
  };

  const speakSaltoSuccess = (a: number, b: number, result: number) => {
    return speakMultiplicationSuccess(a, b, result);
  };

  const speakOperationOnly = (a: number, b: number) => {
    sound.playClick();
    return speak(`${toItalianWord(a)} per ${toItalianWord(b)}`);
  };

  const speakPraticoOperation = (a: number, b: number) => speak(`${a} per ${b}`);
  const stepMotivationLabels: Record<'comprendo' | 'salto' | 'costruisco' | 'trucchi', string> = {
    comprendo: 'Raccogli',
    salto: 'Salta',
    costruisco: 'Scoppia',
    trucchi: 'Trova',
  };

  const getNextStepAfterCompletion = (stepName: 'comprendo' | 'salto' | 'costruisco' | 'trucchi') => {
    if (stepName === 'comprendo') return 'salto';
    if (stepName === 'salto') return 'costruisco';
    if (stepName === 'costruisco') return 'trucchi';
    return 'pratico';
  };

  const showStepMotivationPopup = (stepName: 'comprendo' | 'salto' | 'costruisco' | 'trucchi') => {
    const nextStepId = getNextStepAfterCompletion(stepName) as 'salto' | 'costruisco' | 'trucchi' | 'pratico';
    const nextStepLabel = STEP_LABELS[nextStepId];
    const unlockedMessage = STEP_UNLOCK_MESSAGES[playerGender][nextStepId];
    setMotivationPopup({ stepName, message: unlockedMessage, unlockedStepId: nextStepId, unlockedStepLabel: nextStepLabel.title });
    speak(`${unlockedMessage}`);
  };

    const triggerFireworksAndMotivation = (stepName: 'comprendo' | 'salto' | 'costruisco' | 'trucchi') => {
    if (fireworksRestartTimeoutRef.current !== null) {
      window.clearTimeout(fireworksRestartTimeoutRef.current);
      fireworksRestartTimeoutRef.current = null;
    }

    setShowFireworks(false);

    // Delay di 600ms per permettere al suono playLevelUp() di completarsi prima della voce
    window.setTimeout(() => {
      showStepMotivationPopup(stepName);
    }, 600);

    fireworksRestartTimeoutRef.current = window.setTimeout(() => {
      setShowFireworks(true);
      fireworksRestartTimeoutRef.current = null;
    }, 0);
    };

    const announceWithFallback = useCallback((message: string, fallbackSound: 'none' | 'success' | 'levelUp' = 'none'): Promise<void> => {
      if (announcementClearTimeoutRef.current !== null) {
        window.clearTimeout(announcementClearTimeoutRef.current);
        announcementClearTimeoutRef.current = null;
      }

      setLiveAnnouncement(message);
      setVisibleAnnouncement(message);
      announcementClearTimeoutRef.current = window.setTimeout(() => {
        setLiveAnnouncement('');
        setVisibleAnnouncement('');
        announcementClearTimeoutRef.current = null;
      }, 1800);

      const canUseTts = voiceEnabled && typeof window !== 'undefined' && !!window.speechSynthesis;
      if (canUseTts) {
        return speak(message);
      }

      if (fallbackSound === 'success') {
        sound.playSuccess();
      } else if (fallbackSound === 'levelUp') {
        sound.playLevelUp();
      }
      return Promise.resolve();
    }, [speak, voiceEnabled]);

    useEffect(() => {
      return () => {
        if (announcementClearTimeoutRef.current !== null) {
          window.clearTimeout(announcementClearTimeoutRef.current);
        }
      };
    }, []);

  // Pratico / Quiz (Step 5) state
  const [quizQuestions, setQuizQuestions] = useState<{ a: number; b: number }[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizOptions, setQuizOptions] = useState<number[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
  const [quizCorrectStreak, setQuizCorrectStreak] = useState<number>(0);
  const [quizStreakJustReset, setQuizStreakJustReset] = useState<boolean>(false);
  const [quizInteractionLocked, setQuizInteractionLocked] = useState<boolean>(false);
  const [quizWrongAttempts, setQuizWrongAttempts] = useState<{ [key: string]: number }>({}); // tracks combinations failed in this session
  const [quizHistory, setQuizHistory] = useState<{ a: number; b: number; correct: boolean }[]>([]);
  
  // Visual press feedback for quiz/sfida options (shows while button is held down)
  const [quizPressedFeedback, setQuizPressedFeedback] = useState<{ opt: number; correct: boolean } | null>(null);
  const [sfidaPressedFeedback, setSfidaPressedFeedback] = useState<{ opt: number; correct: boolean } | null>(null);
  const [sfidaInteractionLocked, setSfidaInteractionLocked] = useState<boolean>(false);

  // Feedback modal for errors
  const [errorFeedback, setErrorFeedback] = useState<{
    show: boolean;
    a: number;
    b: number;
    userAnswer: number;
    correctAnswer: number;
  } | null>(null);
  const [showPraticoCongrats, setShowPraticoCongrats] = useState<boolean>(false);
  const [praticoCongratsTarget, setPraticoCongratsTarget] = useState<number | null>(null);
  const [showSfidaResultPopup, setShowSfidaResultPopup] = useState<boolean>(false);
  const [sfidaUnlockModalMode, setSfidaUnlockModalMode] = useState<'insufficient' | null>(null);

  // Path lock feedback modal message
  const [pathLockModalMessage, setPathLockModalMessage] = useState<string | null>(null);

  // Monument unlock confirmation or error modal state
  const [monumentModal, setMonumentModal] = useState<{
    monument: { id: string; name: string; cost: number; description: string; emoji: string };
    canAfford: boolean;
    isErected: boolean;
    justUnlocked?: boolean;
  } | null>(null);
  const [showMonumentUnlockList, setShowMonumentUnlockList] = useState<boolean>(false);
  const [shouldReturnToPraticoCongratsAfterMonuments, setShouldReturnToPraticoCongratsAfterMonuments] = useState<boolean>(false);
  const [shouldReturnToMonumentsListAfterModal, setShouldReturnToMonumentsListAfterModal] = useState<boolean>(false);
    const [showSfidaFromCoinsConfirm, setShowSfidaFromCoinsConfirm] = useState<boolean>(false);
    const [showSfidaMonumentsPrompt, setShowSfidaMonumentsPrompt] = useState<boolean>(false);
    const [newlyUnlockedWorldId, setNewlyUnlockedWorldId] = useState<number | null>(null);
    const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
    const [visibleAnnouncement, setVisibleAnnouncement] = useState<string>('');

  // Sfida (Step 6) state
  const [sfidaActive, setSfidaActive] = useState<boolean>(false);
  const [sfidaReady, setSfidaReady] = useState<boolean>(false); // true = START button showing, false = game running
  const [sfidaQuestion, setSfidaQuestion] = useState<{ a: number; b: number } | null>(null);
  const [sfidaQuestionVersion, setSfidaQuestionVersion] = useState<number>(0);
  const [sfidaTimer, setSfidaTimer] = useState<number>(30);
  const [sfidaScore, setSfidaScore] = useState<number>(0);
  const [sfidaOptions, setSfidaOptions] = useState<number[]>([]);
  const [sfidaResult, setSfidaResult] = useState<{
    correctAnswers: number;
    isNewRecord: boolean;
    previousRecord: number;
    passedSfida: boolean;
    dropsEarned: number;
    didCompleteWorldNow: boolean;
  } | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const fireworksRestartTimeoutRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const praticoAnnouncementTimeoutRef = useRef<number | null>(null);
  const sfidaAnnouncementTimeoutRef = useRef<number | null>(null);
  const sfidaFeedbackTimeoutRef = useRef<number | null>(null);
    const quizStreakResetTimeoutRef = useRef<number | null>(null);
    const celebratedWorldUnlocksRef = useRef<Set<number>>(new Set(profile.unlockedWorlds));
    const announcementClearTimeoutRef = useRef<number | null>(null);
    const quizInteractionLockedRef = useRef(false);
    const sfidaPassedThresholdSoundPlayedRef = useRef(false);
    const praticoCorrectRankTrackerRef = useRef<CorrectRankTracker>(createCorrectRankTracker());
    const sfidaCorrectRankTrackerRef = useRef<CorrectRankTracker>(createCorrectRankTracker());
    const lastPraticoAnnouncementKeyRef = useRef<string | null>(null);
    const touchStartXRef = useRef<number | null>(null);
    const currentPraticoQuestion = quizQuestions[currentQuizIdx] ?? null;
    const touchStartYRef = useRef<number | null>(null);
    const guidanceSeen = profile.helperGuidanceSeen ?? {};
    const guidanceTimeoutsRef = useRef<Partial<Record<HelperGuidanceKey, number>>>({});
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getFactorProgress = (factor: number) => {
    const clamped = Math.max(1, Math.min(10, factor));
    return (clamped - 1) / 9;
  };

  const scaleDurationByFactor = (baseMs: number, factor: number, minScale: number) => {
    const progress = getFactorProgress(factor);
    const scale = 1 - ((1 - minScale) * progress);
    return Math.max(140, Math.floor(baseMs * scale));
  };

  const consumeGuidance = useCallback((key: HelperGuidanceKey) => {
    if (guidanceSeen[key]) return;
    updateProfile((currentProfile) => {
      if (currentProfile.helperGuidanceSeen?.[key]) return currentProfile;
      return {
        ...currentProfile,
        helperGuidanceSeen: {
          ...currentProfile.helperGuidanceSeen,
          [key]: true,
        },
      };
    });
    const timeoutId = guidanceTimeoutsRef.current[key];
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      delete guidanceTimeoutsRef.current[key];
    }
  }, [guidanceSeen, updateProfile]);

  // Note: Auto-scroll for Salto stones now lives inside SaltoExercise.tsx

  const isComprendoFactorOne = comprendoSelectedFactor === 1;
  const isSaltoFactorOne = saltoSelectedFactor === 1;
  const isCostruiscoFactorOne = costruiscoSelectedFactor === 1;
  const isTrucchiFactorOne = trucchiSelectedFactor === 1;
  // Note: Salto frog-jump mechanics (triggerSaltoFrogJump, obstacle detection) now live inside SaltoExercise.tsx
  const showSaltoTouchGuidance = activeStep === 'salto' && saltoFlowStage === 'game' && !saltoGameCompleted && (isSaltoFactorOne || !guidanceSeen.saltoTouch);
  const showSaltoAvoidGuidance = activeStep === 'salto' && saltoFlowStage === 'game' && !saltoGameCompleted && (isSaltoFactorOne || !guidanceSeen.saltoAvoid);
  const showCostruiscoTouchGuidance = activeStep === 'costruisco' && costruiscoFlowStage === 'game' && !costruiscoGameCompleted && (isCostruiscoFactorOne || !guidanceSeen.costruiscoTouch);
  const showCostruiscoAvoidGuidance = activeStep === 'costruisco' && costruiscoFlowStage === 'game' && !costruiscoGameCompleted && (isCostruiscoFactorOne || !guidanceSeen.costruiscoAvoid);
  const showTrucchiTouchGuidance = activeStep === 'trucchi' && trucchiFlowStage === 'game' && !trucchiGameCompleted && (isTrucchiFactorOne || !guidanceSeen.trucchiTouch);
  const showTrucchiAvoidGuidance = activeStep === 'trucchi' && trucchiFlowStage === 'game' && !trucchiGameCompleted && (isTrucchiFactorOne || !guidanceSeen.trucchiAvoid);
  const showSfidaStartGuidance = activeStep === 'sfida' && sfidaReady && !sfidaActive && !guidanceSeen.sfidaStart;

  useEffect(() => {
    return () => {
      (Object.values(guidanceTimeoutsRef.current) as Array<number | undefined>).forEach((timeoutId) => {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      });
      guidanceTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const rules: Array<{ key: HelperGuidanceKey; show: boolean }> = [
      { key: 'saltoTouch', show: showSaltoTouchGuidance },
      { key: 'saltoAvoid', show: showSaltoAvoidGuidance },
      { key: 'costruiscoTouch', show: showCostruiscoTouchGuidance },
      { key: 'costruiscoAvoid', show: showCostruiscoAvoidGuidance },
      { key: 'trucchiTouch', show: showTrucchiTouchGuidance },
      { key: 'trucchiAvoid', show: showTrucchiAvoidGuidance },
      { key: 'sfidaStart', show: showSfidaStartGuidance },
    ];

    rules.forEach(({ key, show }) => {
      const existing = guidanceTimeoutsRef.current[key];
      if (!show) {
        if (existing !== undefined) {
          window.clearTimeout(existing);
          delete guidanceTimeoutsRef.current[key];
        }
        return;
      }
      if ((isSaltoFactorOne && (key === 'saltoTouch' || key === 'saltoAvoid'))
        || (isCostruiscoFactorOne && (key === 'costruiscoTouch' || key === 'costruiscoAvoid'))
        || (isTrucchiFactorOne && key === 'trucchiTouch')) {
        return;
      }
      if (existing !== undefined) return;
      guidanceTimeoutsRef.current[key] = window.setTimeout(() => {
        consumeGuidance(key);
      }, INTERACTION_GUIDANCE_VISIBLE_MS);
    });
  }, [
    consumeGuidance,
    showSaltoTouchGuidance,
    showSaltoAvoidGuidance,
    showCostruiscoTouchGuidance,
    showCostruiscoAvoidGuidance,
    showTrucchiTouchGuidance,
    showTrucchiAvoidGuidance,
    showSfidaStartGuidance,
    isSaltoFactorOne,
    isCostruiscoFactorOne,
    isTrucchiFactorOne,
  ]);

  // Reset scroll in alto ad ogni cambio di step o sotto-schermata
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const scrollables = document.querySelectorAll('.overflow-y-auto');
    scrollables.forEach(el => {
      el.scrollTop = 0;
    });
  }, [
    activeStep,
    comprendoSelectedFactor,
    comprendoFlowStage,
    saltoSelectedFactor,
    saltoFlowStage,
    costruiscoSelectedFactor,
    costruiscoFlowStage,
    trucchiSelectedFactor,
    trucchiFlowStage,
    showMonumentUnlockList,
    viewStack,
  ]);

  // Initialize and generate options
  useEffect(() => {
    resetCostruisco();

    const introKey = `intro-seen-${world.id}`;
    const hasSeen = localStorage.getItem(introKey) === 'true';
    setHasSeenIntro(hasSeen);
  }, [world]);

  // Sync completed factors from profile state whenever world or profile changes
  useEffect(() => {
    const worldProg = profile.worldProgress[world.id];
    const savedFactors = worldProg?.completedFactors;

    if (savedFactors?.comprendo && savedFactors.comprendo.length > 0) {
      setComprendoCompleted(new Set(savedFactors.comprendo));
    } else if (worldProg?.completedSteps?.includes('comprendo')) {
      setComprendoCompleted(new Set(ALL_FACTORS));
    } else {
      setComprendoCompleted(new Set());
    }

    if (savedFactors?.salto && savedFactors.salto.length > 0) {
      setSaltoCompleted(new Set(savedFactors.salto));
    } else if (worldProg?.completedSteps?.includes('salto')) {
      setSaltoCompleted(new Set(ALL_FACTORS));
    } else {
      setSaltoCompleted(new Set());
    }

    if (savedFactors?.costruisco && savedFactors.costruisco.length > 0) {
      setCostruiscoCompleted(new Set(savedFactors.costruisco));
    } else if (worldProg?.completedSteps?.includes('costruisco')) {
      setCostruiscoCompleted(new Set(ALL_FACTORS));
    } else {
      setCostruiscoCompleted(new Set());
    }

    if (savedFactors?.trucchi && savedFactors.trucchi.length > 0) {
      setTrucchiCompleted(new Set(savedFactors.trucchi));
    } else if (worldProg?.completedSteps?.includes('trucchi')) {
      setTrucchiCompleted(new Set(ALL_FACTORS));
    } else {
      setTrucchiCompleted(new Set());
    }
  }, [world.id, profile.worldProgress]);

  // Note: Salto's option-pool generation now lives inside SaltoExercise.tsx

  useEffect(() => {
    if (activeStep === 'salto' && saltoFlowStage === 'game') {
      sound.startSaltoAmbience();
      return () => {
        sound.stopSaltoAmbience();
      };
    }

    sound.stopSaltoAmbience();
  }, [activeStep, saltoFlowStage]);

  useEffect(() => {
    if (activeStep === 'costruisco' && costruiscoFlowStage === 'game') {
      sound.startCostruiscoAmbience();
      return () => {
        sound.stopCostruiscoAmbience();
      };
    }

    sound.stopCostruiscoAmbience();
  }, [activeStep, costruiscoFlowStage]);

  useEffect(() => {
    if (activeStep === 'trucchi' && trucchiFlowStage === 'game') {
      sound.startTrucchiAmbience();
      return () => {
        sound.stopTrucchiAmbience();
      };
    }

    sound.stopTrucchiAmbience();
  }, [activeStep, trucchiFlowStage]);

  useEffect(() => {
    if (activeStep === 'pratico') {
      sound.startPraticoAmbience?.();
      return () => {
        sound.stopPraticoAmbience?.();
      };
    }

    sound.stopPraticoAmbience?.();
  }, [activeStep]);

  useEffect(() => {
    if (comprendoSelectedFactor === null) {
      setComprendoFlowStage('objective');
    }
  }, [comprendoSelectedFactor]);

  useEffect(() => {
    setComprendoGameCompleted(false);
  }, [comprendoSelectedFactor]);

  useEffect(() => {
    if (saltoSelectedFactor === null) {
      setSaltoFlowStage('objective');
    }
  }, [saltoSelectedFactor]);

  useEffect(() => {
    setSaltoGameCompleted(false);
  }, [saltoSelectedFactor]);

  useEffect(() => {
    if (costruiscoSelectedFactor === null) {
      setCostruiscoFlowStage('objective');
    }
  }, [costruiscoSelectedFactor]);

  useEffect(() => {
    setCostruiscoGameCompleted(false);
  }, [costruiscoSelectedFactor]);

  useEffect(() => {
    if (trucchiSelectedFactor === null) {
      setTrucchiFlowStage('objective');
    }
  }, [trucchiSelectedFactor]);

  useEffect(() => {
    return () => {
      if (comprendoCompletionOverlayTimeoutRef.current !== null) {
        window.clearTimeout(comprendoCompletionOverlayTimeoutRef.current);
        comprendoCompletionOverlayTimeoutRef.current = null;
      }
    };
  }, []);



  const clearSfidaFeedbackTimeout = () => {
    if (sfidaFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(sfidaFeedbackTimeoutRef.current);
      sfidaFeedbackTimeoutRef.current = null;
    }
  };

  const randomInRange = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearSfidaFeedbackTimeout();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start Sfida when entering sfida step (for training mode)
  useEffect(() => {
    if (activeStep === 'sfida' && !sfidaActive) {
      startSfidaMode();
    }
  }, [activeStep]);

  // Generate initial Sfida question when sfidaActive is set
  useEffect(() => {
    if (sfidaActive && !sfidaQuestion) {
      generateSfidaQuestion();
    }
  }, [sfidaActive]);

  useEffect(() => {
    if (activeStep !== 'pratico' || !currentPraticoQuestion) {
      if (praticoAnnouncementTimeoutRef.current !== null) {
        window.clearTimeout(praticoAnnouncementTimeoutRef.current);
        praticoAnnouncementTimeoutRef.current = null;
      }
      lastPraticoAnnouncementKeyRef.current = null;
      return;
    }

    if (praticoAnnouncementTimeoutRef.current !== null) {
      window.clearTimeout(praticoAnnouncementTimeoutRef.current);
    }

    const announcementKey = `${currentQuizIdx}-${currentPraticoQuestion.a}-${currentPraticoQuestion.b}`;
    if (lastPraticoAnnouncementKeyRef.current === announcementKey) {
      praticoAnnouncementTimeoutRef.current = null;
      return;
    }

    lastPraticoAnnouncementKeyRef.current = announcementKey;
    void speakPraticoOperation(currentPraticoQuestion.a, currentPraticoQuestion.b);
    praticoAnnouncementTimeoutRef.current = null;

    return () => {
      if (praticoAnnouncementTimeoutRef.current !== null) {
        window.clearTimeout(praticoAnnouncementTimeoutRef.current);
        praticoAnnouncementTimeoutRef.current = null;
      }
    };
  }, [activeStep, currentPraticoQuestion, currentQuizIdx, quizHistory.length]);

  useEffect(() => {
    if (activeStep !== 'sfida' || !sfidaActive || !sfidaQuestion) {
      if (sfidaAnnouncementTimeoutRef.current !== null) {
        window.clearTimeout(sfidaAnnouncementTimeoutRef.current);
        sfidaAnnouncementTimeoutRef.current = null;
      }
      return;
    }

    if (sfidaAnnouncementTimeoutRef.current !== null) {
      window.clearTimeout(sfidaAnnouncementTimeoutRef.current);
    }

    void speakPraticoOperation(sfidaQuestion.a, sfidaQuestion.b);
    sfidaAnnouncementTimeoutRef.current = null;

    return () => {
      if (sfidaAnnouncementTimeoutRef.current !== null) {
        window.clearTimeout(sfidaAnnouncementTimeoutRef.current);
        sfidaAnnouncementTimeoutRef.current = null;
      }
    };
  }, [activeStep, sfidaActive, sfidaQuestion, sfidaQuestionVersion]);

  const didacticEntryAnnouncementRef = useRef<string | null>(null);
  useEffect(() => {
    let announcementKey: string | null = null;
    let operation: { a: number; b: number } | null = null;

    if (activeStep === 'comprendo' && comprendoSelectedFactor !== null && comprendoFlowStage === 'game') {
      announcementKey = `comprendo-${world.id}-${comprendoSelectedFactor}`;
      operation = { a: world.id, b: comprendoSelectedFactor };
    } else if (activeStep === 'salto' && saltoSelectedFactor !== null && saltoFlowStage === 'game') {
      announcementKey = `salto-${world.id}-${saltoSelectedFactor}`;
      operation = { a: world.id, b: saltoSelectedFactor };
    } else if (activeStep === 'costruisco' && costruiscoSelectedFactor !== null && costruiscoFlowStage === 'game') {
      announcementKey = `costruisco-${world.id}-${costruiscoSelectedFactor}`;
      operation = { a: world.id, b: costruiscoSelectedFactor };
    } else if (activeStep === 'trucchi' && trucchiSelectedFactor !== null && trucchiFlowStage === 'game') {
      announcementKey = `trucchi-${world.id}-${trucchiSelectedFactor}`;
      operation = { a: world.id, b: trucchiSelectedFactor };
    }

    if (!announcementKey || !operation) {
      didacticEntryAnnouncementRef.current = null;
      return;
    }

    if (didacticEntryAnnouncementRef.current === announcementKey) {
      return;
    }

    didacticEntryAnnouncementRef.current = announcementKey;
    void speakPraticoOperation(operation.a, operation.b);
  }, [
    activeStep,
    comprendoFlowStage,
    comprendoSelectedFactor,
    costruiscoFlowStage,
    costruiscoSelectedFactor,
    saltoFlowStage,
    saltoSelectedFactor,
    speakPraticoOperation,
    trucchiFlowStage,
    trucchiSelectedFactor,
    world.id,
  ]);

  useEffect(() => {
    if (activeStep !== 'pratico') {
      quizInteractionLockedRef.current = false;
      setQuizInteractionLocked(false);
    }
  }, [activeStep]);

  useEffect(() => {
    return () => {
      if (quizStreakResetTimeoutRef.current !== null) {
        window.clearTimeout(quizStreakResetTimeoutRef.current);
        quizStreakResetTimeoutRef.current = null;
      }
    };
  }, []);

  const buildPraticoQuestions = (count: number): { a: number; b: number }[] => {
    const multipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const questions: { a: number; b: number }[] = [];
    while (questions.length < count) {
      const shuffled = [...multipliers].sort(() => Math.random() - 0.5);
      shuffled.forEach(m => {
        if (questions.length < count) {
          questions.push({ a: world.id, b: m });
        }
      });
    }
    return questions;
  };

  // Generate Quiz (Pratico) questions
  const startQuizMode = () => {
    sound.playPowerUp();
    const questions = buildPraticoQuestions(Math.max(10, targetPraticoStreak));
    praticoCorrectRankTrackerRef.current = createCorrectRankTracker();

    setQuizQuestions(questions);
    setCurrentQuizIdx(0);
    setQuizCorrectCount(0);
    setQuizCorrectStreak(0);
    setQuizStreakJustReset(false);
    quizInteractionLockedRef.current = false;
    setQuizInteractionLocked(false);
    setQuizPressedFeedback(null);
    setQuizHistory([]);
    setQuizWrongAttempts({});
    generateQuizOptions(questions[0].a, questions[0].b);
    setActiveStep('pratico');
  };

  const generateQuizOptions = (a: number, b: number) => {
    const correct = a * b;
    const mistakes = [
      correct + a,
      correct - a,
      correct + b,
      correct - b,
      correct + 2,
      correct - 2,
      (a + 1) * b,
      a * (b + 1),
      correct + a * 2,
      correct - a * 2,
      correct + b * 2,
      correct - b * 2,
    ];
    setQuizOptions(
      buildAscendingOptionsWithBalancedRank(
        correct,
        mistakes,
        Math.max(1, a),
        praticoCorrectRankTrackerRef.current
      )
    );
    setSelectedQuizOption(null);
  };

  // Reset Costruisco (Step 3)
  const resetCostruisco = () => {
    setCostruiscoGameCompleted(false);
    setShowCostruiscoCompletionEffect(false);
    setCostruiscoFlowStage('objective');
    setCompletedMonuments([]); // Reset monuments when restarting
  };

  // Adaptive Learning - handles mistake on Quiz
  const handleQuizAnswer = (selectedVal: number) => {
    if (quizInteractionLockedRef.current || quizInteractionLocked) return;

    const currentQ = quizQuestions[currentQuizIdx];
    if (!currentQ) return;

    quizInteractionLockedRef.current = true;
    setQuizInteractionLocked(true);
    if (praticoAnnouncementTimeoutRef.current !== null) {
      window.clearTimeout(praticoAnnouncementTimeoutRef.current);
      praticoAnnouncementTimeoutRef.current = null;
    }

    const correctVal = currentQ.a * currentQ.b;
    const isCorrect = selectedVal === correctVal;

    const key = `${currentQ.a}x${currentQ.b}`;

    // Record question attempt
    const attempt: QuestionAttempt = {
      a: currentQ.a,
      b: currentQ.b,
      correct: isCorrect,
      responseTimeMs: 2000 + Math.random() * 1500, // Simulated exact pacing based on UX guidelines
      timestamp: new Date().toISOString()
    };

    updateProfile(p => {
      // Append attempt to history
      const nextHistory = [...p.history, attempt];
      
      const currentWp = p.worldProgress[world.id] || createDefaultWorldProgress(world.id);
      const currentWorldDrops = currentWp.lightDrops ?? currentWp.devLightDrops ?? 0;

      // Calculate XP and Light Drops if correct
      let nextXP = p.xp;
      let nextLightDrops = currentWorldDrops;

      if (isCorrect) {
        nextXP += 10;
        nextLightDrops += 1; // 1 Light Drop to restore Tabellandia!
      }

      // Check level up (every 100 XP is a level)
      let nextLevel = p.level;
      if (nextXP >= nextLevel * 100) {
        nextLevel += 1;
        // Trigger level up sound soon
        setTimeout(() => sound.playLevelUp(), 400);
      }

      return {
        ...p,
        xp: nextXP,
        level: nextLevel,
        history: nextHistory,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...currentWp,
            lightDrops: nextLightDrops,
            devLightDrops: nextLightDrops,
          }
        }
      };
    });

    if (isCorrect) {
      sound.playSuccess();
      const nextCorrectCount = quizCorrectCount + 1;
      const nextCorrectStreak = quizCorrectStreak + 1;
      setQuizCorrectCount(nextCorrectCount);
      setQuizCorrectStreak(nextCorrectStreak);
      setQuizStreakJustReset(false);
      setQuizHistory(prev => [...prev, { ...currentQ, correct: true }]);

      if (nextCorrectStreak >= targetPraticoStreak) {
        setPraticoCongratsTarget(targetPraticoStreak);
        saveStepCompleted('pratico');
        sound.playRewardFanfare();
        setShowFireworks(true);
        setShowPraticoCongrats(true);
        return;
      }

      proceedQuiz();
    } else {
      sound.playError();
      void speak('Oh no... ripartiamo da 0');
      setQuizCorrectStreak(0);
      setQuizStreakJustReset(true);
      if (quizStreakResetTimeoutRef.current !== null) {
        window.clearTimeout(quizStreakResetTimeoutRef.current);
      }
      quizStreakResetTimeoutRef.current = window.setTimeout(() => {
        setQuizStreakJustReset(false);
        quizStreakResetTimeoutRef.current = null;
      }, 1400);
      setQuizHistory(prev => [...prev, { ...currentQ, correct: false }]);
      
      // Adaptive learning engine triggers! 
      // If they miss, we increment wrong attempts
      setQuizWrongAttempts(prev => ({
        ...prev,
        [key]: (prev[key] || 0) + 1
      }));

      // Propose detailed explanatory error screen (Cognitive Science requirement!)
      setErrorFeedback({
        show: true,
        a: currentQ.a,
        b: currentQ.b,
        userAnswer: selectedVal,
        correctAnswer: correctVal
      });

      // Adaptive action: We will re-insert this missed question at the end of the array to give them another opportunity!
      setQuizQuestions(prev => {
        const nextQ = [...prev];
        // Insert at the end to re-try
        nextQ.push(currentQ);
        return nextQ;
      });
    }
  };

  const proceedQuiz = () => {
    quizInteractionLockedRef.current = false;
    setQuizInteractionLocked(false);
    setQuizPressedFeedback(null);
    if (currentQuizIdx < quizQuestions.length - 1) {
      const nextIdx = currentQuizIdx + 1;
      setCurrentQuizIdx(nextIdx);
      generateQuizOptions(quizQuestions[nextIdx].a, quizQuestions[nextIdx].b);
    } else {
      // Keep going automatically until target streak is reached.
      const extendedQuestions = [...quizQuestions, ...buildPraticoQuestions(10)];
      const nextIdx = currentQuizIdx + 1;
      setQuizQuestions(extendedQuestions);
      setCurrentQuizIdx(nextIdx);
      generateQuizOptions(extendedQuestions[nextIdx].a, extendedQuestions[nextIdx].b);
    }
  };

  const closeErrorFeedback = () => {
    sound.playClick();
    setErrorFeedback(null);
    proceedQuiz();
  };

  const closePraticoCongrats = () => {
    sound.playClick();
    setShowPraticoCongrats(false);
    setShowSfidaFromCoinsConfirm(false);
    setPraticoCongratsTarget(null);
    setShouldReturnToPraticoCongratsAfterMonuments(false);
    setActiveStep('intro');
  };

  const closeSfidaResultPopup = () => {
    sound.playClick();
    setShowSfidaResultPopup(false);
    if (!shouldPromptSfidaMonumentsAfterWin) return;
    setShowSfidaMonumentsPrompt(true);
    void speak('Hai indizi sbloccabili. Vuoi aprire ora la schermata indizi?');
  };

  const confirmSfidaMonumentsPrompt = () => {
    sound.playClick();
    setShowSfidaMonumentsPrompt(false);
    setActiveStep('intro');
    setShowMonumentUnlockList(false);
    void speak('Perfetto, torniamo alla mappa.');
  };

  const cancelSfidaMonumentsPrompt = () => {
    sound.playClick();
    setShowSfidaMonumentsPrompt(false);
  };

  const goToPraticoFromSfidaInsufficient = () => {
    sound.playClick();
    setSfidaUnlockModalMode(null);
    void speak('Perfetto. Andiamo in Pratico per guadagnare monete.');
    startQuizMode();
  };

  const stayOnSfidaFromInsufficientCoins = () => {
    sound.playClick();
    setSfidaUnlockModalMode(null);
    void speak('Va bene, restiamo qui.');
  };

  const beginSfidaFromUnlockFlow = () => {
    const currentWp = profile.worldProgress[world.id] || createDefaultWorldProgress(world.id);
    const currentWorldCoins = currentWp.coins ?? currentWp.devCoins ?? 0;
    if (currentWorldCoins < SFIDA_UNLOCK_COST) {
      sound.playError();
      setSfidaUnlockModalMode('insufficient');
      void speak('Non hai abbastanza monete per la Sfida. Vuoi andare in Pratico per guadagnarne?');
      return;
    }
    updateProfile(p => {
      const pWp = p.worldProgress[world.id] || createDefaultWorldProgress(world.id);
      const cCoins = pWp.coins ?? pWp.devCoins ?? 0;
      const nCoins = Math.max(0, cCoins - SFIDA_UNLOCK_COST);
      return {
        ...p,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...pWp,
            coins: nCoins,
            devCoins: nCoins,
          }
        }
      };
    });
    setSfidaUnlockModalMode(null);
    beginSfidaGame();
  };

  const handleSfidaStartClick = () => {
    consumeGuidance('sfidaStart');
    const currentWp = profile.worldProgress[world.id] || createDefaultWorldProgress(world.id);
    const currentWorldCoins = currentWp.coins ?? currentWp.devCoins ?? 0;
    if (currentWorldCoins < SFIDA_UNLOCK_COST) {
      sound.playError();
      setSfidaUnlockModalMode('insufficient');
      void speak('Non hai abbastanza monete per la Sfida. Vuoi andare in Pratico per guadagnarne?');
      return;
    }
    sound.playClick();
    beginSfidaFromUnlockFlow();
  };

  // Initialize Sfida with START button
  const initializeSfida = () => {
    sound.playPowerUp();
    setSfidaReady(true); // Show START button
    setSfidaActive(false);
    setSfidaInteractionLocked(false);
    setSfidaPressedFeedback(null);
    setSfidaScore(0);
    setSfidaTimer(30);
    setSfidaQuestion(null);
    setSfidaQuestionVersion(0);
    setSfidaOptions([]);
    sfidaPassedThresholdSoundPlayedRef.current = false;
    setShowSfidaMonumentsPrompt(false);
    setShowSfidaResultPopup(false);
    setSfidaUnlockModalMode(null);
    setActiveStep('sfida');
  };

  // Begin the actual game after START is clicked
  const beginSfidaGame = () => {
    sound.playPowerUp();
    sfidaCorrectRankTrackerRef.current = createCorrectRankTracker();
    setSfidaReady(false); // Hide START button
    setSfidaActive(true);
    setSfidaInteractionLocked(false);
    setSfidaPressedFeedback(null);
    setSfidaScore(0);
    setSfidaTimer(30);
    setSfidaResult(null);
    sfidaPassedThresholdSoundPlayedRef.current = false;
    setShowSfidaMonumentsPrompt(false);
    setShowSfidaResultPopup(false);
    setSfidaUnlockModalMode(null);
    generateSfidaQuestion();

    // Timer logic
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSfidaTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Pass score via state setter to avoid stale closure
          setSfidaScore(score => {
            setTimeout(() => finishSfidaMode(score), 0);
            return score;
          });
          return 0;
        }
        if (prev <= 5) sound.playTick(); // Tick-tock retro sounds for final 5s
        return prev - 1;
      });
    }, 1000);
  };

  // Old startSfidaMode now calls initializeSfida
  const startSfidaMode = () => {
    initializeSfida();
  };

  const generateSfidaQuestion = () => {
    const factorB = Math.floor(Math.random() * 9) + 2; // from 2 to 10
    const currentQ = { a: world.id, b: factorB };
    setSfidaQuestion(currentQ);
    setSfidaQuestionVersion(prev => prev + 1);

    const correct = world.id * factorB;
    const sfidaCandidates: number[] = [];
    for (let step = 1; step <= 6; step++) {
      sfidaCandidates.push(correct - step * world.id, correct + step * world.id);
    }
    setSfidaOptions(
      buildAscendingOptionsWithBalancedRank(
        correct,
        sfidaCandidates,
        Math.max(1, world.id),
        sfidaCorrectRankTrackerRef.current
      )
    );
  };

  const handleSfidaAnswer = (selectedVal: number) => {
    if (!sfidaQuestion || !sfidaActive || sfidaInteractionLocked) return;
    const correctVal = sfidaQuestion.a * sfidaQuestion.b;
    const isCorrect = selectedVal === correctVal;
    setSfidaInteractionLocked(true);
    clearSfidaFeedbackTimeout();

    updateProfile(p => {
      let nextXP = p.xp + (isCorrect ? 15 : 0);
      let nextCoins = p.coins;
      let nextLevel = p.level;
      if (nextXP >= nextLevel * 100) nextLevel += 1;

      return {
        ...p,
        xp: nextXP,
        coins: nextCoins,
        level: nextLevel
      };
    });

    if (isCorrect) {
      sound.playSuccess();
      setSfidaScore(prev => {
        const nextScore = prev + 1;
        if (!sfidaPassedThresholdSoundPlayedRef.current && nextScore === SFIDA_DROPS_LOW_THRESHOLD) {
          sound.playLevelUp();
          sfidaPassedThresholdSoundPlayedRef.current = true;
        }
        return nextScore;
      });
    } else {
      sound.playError();
      speak(GAMEPLAY_AUDIO_MESSAGES.sfidaWrong);
    }

    sfidaFeedbackTimeoutRef.current = window.setTimeout(() => {
      if (sfidaActive) {
        generateSfidaQuestion();
      }
      setSfidaPressedFeedback(null);
      setSfidaInteractionLocked(false);
      sfidaFeedbackTimeoutRef.current = null;
    }, SFIDA_FEEDBACK_HOLD_MS);
  };

  const finishSfidaMode = (finalScore?: number) => {
    sound.playLevelUp();
    setSfidaActive(false);
    setSfidaInteractionLocked(false);
    setSfidaPressedFeedback(null);
    clearSfidaFeedbackTimeout();
    const score = finalScore !== undefined ? finalScore : sfidaScore;
    const currentHighScore = profile.worldProgress[world.id]?.highScore || 0;
    const hasReachedRecordThresholdBefore = currentHighScore >= SFIDA_RECORD_THRESHOLD;
    const isNewRecord = score > currentHighScore && score >= SFIDA_RECORD_THRESHOLD && hasReachedRecordThresholdBefore;
    const passedSfida = score >= SFIDA_DROPS_LOW_THRESHOLD;
    const currentWorldProgress = profile.worldProgress[world.id];
    const currentCompletedSteps = [...(currentWorldProgress?.completedSteps || [])];
    const nextCompletedSteps = passedSfida && !currentCompletedSteps.includes('sfida')
      ? [...currentCompletedSteps, 'sfida']
      : currentCompletedSteps;
    const didCompleteWorldNow = !currentCompletedSteps.includes('sfida') && nextCompletedSteps.includes('sfida');

    const sfidDropsEarned = passedSfida ? SFIDA_FIXED_DROPS_REWARD : 0;

    updateProfile(p => {
      const worldProg = p.worldProgress[world.id] || {
        worldId: world.id,
        completedSteps: [],
        rebuiltMonuments: [],
        creatureEvolution: 'egg',
        highScore: 0,
        stars: 0
      };
      const previousMax = worldProg?.highScore || 0;
      const nextMax = Math.max(previousMax, score);

      let stars = worldProg?.stars || 0;
      if (score >= 15) stars = 3;
      else if (score >= 12) stars = 2;
      else if (score >= 8) stars = 1;

      const completed = [...(worldProg?.completedSteps || [])];
      if (passedSfida && !completed.includes('sfida')) {
        completed.push('sfida');
      }

      // Check if world is 100% completed: all 6 steps + all monuments rebuilt
      const rebuiltCount = worldProg?.rebuiltMonuments?.length || 0;
      const allMonumentsDone = rebuiltCount >= world.monuments.length;
      const allStepsDone = completed.includes('comprendo') && completed.includes('salto') && completed.includes('costruisco') && completed.includes('trucchi') && completed.includes('pratico') && completed.includes('sfida');

      // Unlock next world ONLY if passedSfida (>14), all steps done, and all monuments erected!
      const nextUnlocked = [...p.unlockedWorlds];
      const nextWorldId = world.id + 1;
      if (passedSfida && allMonumentsDone && allStepsDone && nextWorldId <= 9 && !nextUnlocked.includes(nextWorldId)) {
        nextUnlocked.push(nextWorldId);
      }

      const currentWp = p.worldProgress[world.id] || createDefaultWorldProgress(world.id);
      const currentWorldDrops = currentWp.lightDrops ?? currentWp.devLightDrops ?? 0;
      const currentWorldCoins = currentWp.coins ?? currentWp.devCoins ?? 0;
      const nextLightDrops = currentWorldDrops + sfidDropsEarned;

      let evolution = currentWp?.creatureEvolution || 'egg';
      if (completed.length >= 6) {
        evolution = 'adult';
      } else if (completed.length >= 3) {
        evolution = 'child';
      }

      return {
        ...p,
        unlockedWorlds: nextUnlocked,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...currentWp,
            coins: currentWorldCoins,
            devCoins: currentWorldCoins,
            lightDrops: nextLightDrops,
            devLightDrops: nextLightDrops,
            completedSteps: completed,
            highScore: nextMax,
            stars: Math.max(stars, currentWp?.stars || 0),
            creatureEvolution: evolution
          }
        }
      };
    });

    if (isNewRecord || didCompleteWorldNow) {
      setTimeout(() => sound.playLevelUp(), 600);
      setShowFireworks(true);
    }
    setSfidaResult({
      correctAnswers: score,
      isNewRecord,
      previousRecord: currentHighScore,
      passedSfida,
      dropsEarned: sfidDropsEarned,
      didCompleteWorldNow
    });
    setShowSfidaResultPopup(true);
    setSfidaReady(true);
  };

  // Helper to save completed sub-steps offline and evolve creature
  const saveStepCompleted = (stepName: string) => {
    // Rewards based on step
    const rewardMap = GAME_REWARDS_CONFIG;
    
    const reward = rewardMap[stepName as keyof typeof GAME_REWARDS_CONFIG] || { coins: 0, drops: 0 };

    updateProfile(p => {
      const currentWp = p.worldProgress[world.id] || createDefaultWorldProgress(world.id);
      const currentWorldCoins = currentWp.coins ?? currentWp.devCoins ?? 0;
      const currentWorldDrops = currentWp.lightDrops ?? currentWp.devLightDrops ?? 0;

      const completed = [...currentWp.completedSteps];
      if (!completed.includes(stepName)) {
        completed.push(stepName);
      }
      const currentPraticoCycles = currentWp.praticoCyclesCompleted
        ?? (currentWp.completedSteps.includes('pratico') ? 1 : 0);
      const nextPraticoCycles = stepName === 'pratico'
        ? currentPraticoCycles + 1
        : currentPraticoCycles;

      // XP and Coin rewards for world steps completed! (Gamification)
      let nextXP = p.xp + 50;
      let nextCoins = currentWorldCoins + reward.coins;
      let nextLightDrops = currentWorldDrops + reward.drops;
      let nextLevel = p.level;
      if (nextXP >= nextLevel * 100) nextLevel += 1;

      // Evolve creature depending on step count
      let evolution = currentWp.creatureEvolution;
      if (completed.length >= 6) {
        evolution = 'adult';
      } else if (completed.length >= 3) {
        evolution = 'child';
      }

      // Note: Next world is NOT unlocked here. It requires passing Sfida (>14) and building all monuments!
      return {
        ...p,
        xp: nextXP,
        level: nextLevel,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...currentWp,
            coins: nextCoins,
            devCoins: nextCoins,
            lightDrops: nextLightDrops,
            devLightDrops: nextLightDrops,
            completedSteps: completed,
            praticoCyclesCompleted: nextPraticoCycles,
            creatureEvolution: evolution
          }
        }
      };
    });

    if (stepName !== 'pratico' && (reward.coins > 0 || reward.drops > 0)) {
      setShowRewardPopup({ step: stepName, coins: reward.coins, drops: reward.drops });
    }
  };

    const handleRebuildMonument = (monId: string, cost: number): boolean => {
    const activeWp = profile.worldProgress[world.id] || createDefaultWorldProgress(world.id);
    const activeWorldDrops = activeWp.lightDrops ?? activeWp.devLightDrops ?? 0;
    if (activeWorldDrops < cost) {
      sound.playError();
      speak(GAMEPLAY_AUDIO_MESSAGES.notEnoughLightDrops);
      return false;
    }

    sound.playPowerUp();
    updateProfile(p => {
      const pWp = p.worldProgress[world.id] || createDefaultWorldProgress(world.id);
      const curDrops = pWp.lightDrops ?? pWp.devLightDrops ?? 0;
      const monuments = [...(pWp?.rebuiltMonuments || [])];
      if (!monuments.includes(monId)) {
        monuments.push(monId);
      }
      const nextDrops = Math.max(0, curDrops - cost);

      const nextUnlocked = [...p.unlockedWorlds];
      const nextWorldId = world.id + 1;
      const isAllMonumentsDone = monuments.length >= world.monuments.length;
      if (isAllMonumentsDone && nextWorldId <= 9 && !nextUnlocked.includes(nextWorldId)) {
        nextUnlocked.push(nextWorldId);
      }

      return {
        ...p,
        unlockedWorlds: nextUnlocked,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...pWp,
            lightDrops: nextDrops,
            devLightDrops: nextDrops,
            rebuiltMonuments: monuments
          }
        }
      };
    });

    return true;
    };

  const closeMotivationPopup = () => {
    sound.playClick();
    if (motivationPopup?.unlockedStepId) {
      setActiveStep('intro');
    }
    setMotivationPopup(null);
  };

  const worldProgBase = profile.worldProgress[world.id] || {
    worldId: world.id,
    completedSteps: [],
    rebuiltMonuments: [],
    creatureEvolution: 'egg',
    highScore: 0,
    stars: 0
  };
  const worldProg = worldProgBase;
  const worldCoins = worldProg.coins ?? worldProg.devCoins ?? 0;
  const worldLightDrops = worldProg.lightDrops ?? worldProg.devLightDrops ?? 0;
  const blockedMonuments = world.monuments.filter(monument => !worldProg.rebuiltMonuments.includes(monument.id));
  const unlockableMonumentsCount = blockedMonuments.filter(monument => worldLightDrops >= monument.cost).length;
  const shouldPromptSfidaMonumentsAfterWin = !!(
    sfidaResult
    && sfidaResult.passedSfida
    && sfidaResult.dropsEarned === SFIDA_FIXED_DROPS_REWARD
    && unlockableMonumentsCount > 0
  );
  const canSuggestSfidaFromMonuments = blockedMonuments.length === 0 && worldLightDrops <= 0 && worldCoins >= SFIDA_UNLOCK_COST;
  const allFactorsSet = new Set<number>(ALL_FACTORS);

  const getEffectiveCompletedFactors = (stepKey: 'comprendo' | 'salto' | 'costruisco' | 'trucchi', stateSet: Set<number>) => {
    const saved = worldProg.completedFactors?.[stepKey];
    if (saved && Array.isArray(saved)) {
      // Defensive normalization: old profiles may contain string values (e.g. "2")
      // that break numeric unlock checks like completed.has(factor - 1).
      const normalizedSaved = saved
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && ALL_FACTORS.includes(value));
      return new Set([...normalizedSaved, ...stateSet]);
    }
    if (worldProg.completedSteps.includes(stepKey)) return allFactorsSet;
    return new Set([...stateSet]);
  };

  const effectiveComprendoCompleted = getEffectiveCompletedFactors('comprendo', comprendoCompleted);
  const effectiveSaltoCompleted = getEffectiveCompletedFactors('salto', saltoCompleted);
  const effectiveCostruiscoCompleted = getEffectiveCompletedFactors('costruisco', costruiscoCompleted);
  const effectiveTrucchiCompleted = getEffectiveCompletedFactors('trucchi', trucchiCompleted);

  const isComprendoDone = effectiveComprendoCompleted.size >= 10;
  const isSaltoDone = effectiveSaltoCompleted.size >= 10;
  const isCostruiscoDone = effectiveCostruiscoCompleted.size >= 10;
  const isTrucchiDone = effectiveTrucchiCompleted.size >= 10;
  const isPraticoDone = worldProg.completedSteps.includes('pratico');
  const praticoCyclesCompleted = worldProg.praticoCyclesCompleted
    ?? (worldProg.completedSteps.includes('pratico') ? 1 : 0);
  const targetPraticoStreak = 10 + praticoCyclesCompleted * 2;
  const isSfidaDone = worldProg.completedSteps.includes('sfida');
  const areSfidaPrerequisitesDone = isComprendoDone && isSaltoDone && isCostruiscoDone && isTrucchiDone && isPraticoDone;
  const nextStepToPlay = !isComprendoDone
    ? 'comprendo'
    : !isSaltoDone
      ? 'salto'
      : !isCostruiscoDone
        ? 'costruisco'
        : !isTrucchiDone
          ? 'trucchi'
          : !isPraticoDone
            ? 'pratico'
            : (areSfidaPrerequisitesDone && !isSfidaDone)
              ? 'sfida'
              : null;
  const hasErectableBlockedMonuments = blockedMonuments.some(monument => worldLightDrops >= monument.cost);
  const canGoToSfidaFromCoins = worldCoins >= SFIDA_UNLOCK_COST && areSfidaPrerequisitesDone;
  const canGoToPratico = nextStepToPlay === 'pratico';
  const praticoLockedMessage = 'Completa prima tutti i passi precedenti per entrare in Pratico (Avventura).';
  const sfidaDropsGuidanceMessage = 'Completa prima tutti i passi, fai pratica e vinci la Sfida per guadagnare gocce.';
  const sfidaLockedMessage = 'Completa prima tutti i passi precedenti per sbloccare la Sfida.';

  const stepDoneMap: Record<string, boolean> = {
    comprendo: isComprendoDone,
    salto: isSaltoDone,
    costruisco: isCostruiscoDone,
    trucchi: isTrucchiDone,
    pratico: isPraticoDone,
    sfida: isSfidaDone,
  };

  const stepFactorsCountMap: Record<string, number> = {
    comprendo: effectiveComprendoCompleted.size,
    salto: effectiveSaltoCompleted.size,
    costruisco: effectiveCostruiscoCompleted.size,
    trucchi: effectiveTrucchiCompleted.size,
  };

  // Calculate reconstruction percentage of this world
  const rebuiltCount = worldProg.rebuiltMonuments.length;
  const rebuildPercent = Math.round((rebuiltCount / world.monuments.length) * 100);

  // Sfida path lock: all didactic steps (1-5) must be completed before accessing step 6
  const allMonumentsErected = rebuiltCount === world.monuments.length;
  const isSfidaPathLocked = !areSfidaPrerequisitesDone;
  const shouldHighlightSfidaCta = canGoToSfidaFromCoins && !isSfidaDone && !isSfidaPathLocked && nextStepToPlay === 'sfida';

  // Auto-scroll allo step attivo/prossimo quando ci si trova nella vista Sentiero ('intro')
  useEffect(() => {
    if (activeStep === 'intro' && nextStepToPlay) {
      const timer = setTimeout(() => {
        activeStepCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [activeStep, nextStepToPlay]);

  const isInPlayableStepView = ALL_STEP_IDS.includes(activeStep);
  const showWorldFooterBack = !(
    (activeStep === 'comprendo' && comprendoSelectedFactor !== null) ||
    (activeStep === 'salto' && saltoSelectedFactor !== null) ||
    (activeStep === 'costruisco' && costruiscoSelectedFactor !== null) ||
    (activeStep === 'trucchi' && trucchiSelectedFactor !== null) ||
    (activeStep === 'pratico' && currentPraticoQuestion !== null) ||
    (activeStep === 'sfida' && sfidaActive)
  );
  const shouldShowWorldFooterContinue =
    (activeStep === 'comprendo' && comprendoSelectedFactor === null && effectiveComprendoCompleted.size >= 10) ||
    (activeStep === 'salto' && saltoSelectedFactor === null && effectiveSaltoCompleted.size >= 10) ||
    (activeStep === 'costruisco' && costruiscoSelectedFactor === null && effectiveCostruiscoCompleted.size >= 10) ||
    (activeStep === 'trucchi' && trucchiSelectedFactor === null && effectiveTrucchiCompleted.size >= 10);
  const isKingdomCompleted = allMonumentsErected && isComprendoDone && isSaltoDone && isCostruiscoDone && isTrucchiDone && isPraticoDone && isSfidaDone;
  const shouldShowWorldFooterCompletedContinue = activeStep === 'intro' && isKingdomCompleted;
  const shouldShowWorldFooterAnyContinue = shouldShowWorldFooterContinue || shouldShowWorldFooterCompletedContinue;

  // Keep world unlocks in sync even when the final monument is erected after Sfida was already passed.
    useEffect(() => {
    const nextWorldId = world.id + 1;
    if (nextWorldId > 9) return;
    if (!allMonumentsErected || !isComprendoDone || !isSaltoDone || !isCostruiscoDone || !isTrucchiDone || !isPraticoDone || !isSfidaDone) return;
    if (profile.unlockedWorlds.includes(nextWorldId)) return;

    updateProfile((currentProfile) => {
      if (currentProfile.unlockedWorlds.includes(nextWorldId)) return currentProfile;
      return {
        ...currentProfile,
        unlockedWorlds: [...currentProfile.unlockedWorlds, nextWorldId],
      };
    });
    }, [
    allMonumentsErected,
    isComprendoDone,
    isCostruiscoDone,
    isPraticoDone,
    isSaltoDone,
    isSfidaDone,
    isTrucchiDone,
    profile.unlockedWorlds,
    updateProfile,
    world.id,
    ]);

    useEffect(() => {
    const nextWorldId = world.id + 1;
    if (nextWorldId > 9) return;
    if (!isKingdomCompleted) return;
    if (!profile.unlockedWorlds.includes(nextWorldId)) return;
    if (celebratedWorldUnlocksRef.current.has(nextWorldId)) return;

    celebratedWorldUnlocksRef.current.add(nextWorldId);
    setShowFireworks(true);
    setNewlyUnlockedWorldId(nextWorldId);

    const announceTimer = window.setTimeout(() => {
      announceWithFallback(`Fantastico! Hai completato questo regno e hai sbloccato il prossimo: tabellina del ${nextWorldId}.`, 'levelUp');
    }, 350);

    return () => {
      window.clearTimeout(announceTimer);
    };
    }, [announceWithFallback, isKingdomCompleted, profile.unlockedWorlds, world.id]);

  const explainPraticoRewardAndPossibilities = () => {
    const sfidaPart = canGoToSfidaFromCoins
      ? 'Ora puoi entrare nella Sfida usando le monete vinte in Pratico.'
      : 'Quando avrai abbastanza monete e avrai completato i passi richiesti, potrai entrare nella Sfida.';
    const indiziPart = hasErectableBlockedMonuments
      ? 'Le gocce che vincerai nella Sfida ti permetteranno di scoprire subito gli indizi.'
      : 'Le gocce arrivano dalla Sfida e servono per scoprire gli indizi.';
    const targetReached = praticoCongratsTarget ?? targetPraticoStreak;

    void speak(`Complimenti. Hai raggiunto l'obiettivo di ${targetReached} consecutive. ${sfidaPart} ${indiziPart}`);
  };

  const handleMoneteBadgeClick = () => {
    sound.playClick();
    if (canGoToSfidaFromCoins) {
      setShowSfidaFromCoinsConfirm(true);
      void speak('Vuoi andare alla Sfida adesso?');
      return;
    }

    const reason = worldCoins < SFIDA_UNLOCK_COST
      ? getSfidaUnlockMissingCoinsMessage(worldCoins)
      : sfidaLockedMessage;
    setPathLockModalMessage(`🏁 Sfida non ancora disponibile\n\n${reason}`);
    void speak(reason);
  };

  const confirmSfidaFromCoins = () => {
    sound.playClick();
    setShowSfidaFromCoinsConfirm(false);
    setShowPraticoCongrats(false);
    setShowMonumentUnlockList(false);
    setMonumentModal(null);
    setShouldReturnToPraticoCongratsAfterMonuments(false);
    initializeSfida();
    void speak('Perfetto. Ti porto alla Sfida.');
  };

  const cancelSfidaFromCoinsConfirm = () => {
    sound.playClick();
    setShowSfidaFromCoinsConfirm(false);
    void speak('Va bene. Restiamo qui.');
  };

  const closeMonumentFlowAndMaybeReturnToPraticoCongrats = () => {
    setShowMonumentUnlockList(false);
    setMonumentModal(null);
    setShouldReturnToMonumentsListAfterModal(false);
    if (shouldReturnToPraticoCongratsAfterMonuments) {
      setShowPraticoCongrats(true);
      setShouldReturnToPraticoCongratsAfterMonuments(false);
    }
  };

  const closeMonumentModalAndReturnToOrigin = () => {
    if (shouldReturnToMonumentsListAfterModal) {
      setMonumentModal(null);
      setShowMonumentUnlockList(true);
      return;
    }
    closeMonumentFlowAndMaybeReturnToPraticoCongrats();
  };

  useEffect(() => {
    if (showPraticoCongrats) {
      explainPraticoRewardAndPossibilities();
    }
  }, [showPraticoCongrats, praticoCongratsTarget, targetPraticoStreak, canGoToSfidaFromCoins, hasErectableBlockedMonuments]);

    useEffect(() => {
    if (!monumentModal) return;
    const description = monumentModal.monument.description?.trim() ?? '';

    if (monumentModal.isJustUnlocked) {
      const pWp = profile.worldProgress[world.id] || createDefaultWorldProgress(world.id);
      const rebuiltCount = pWp.rebuiltMonuments.length;
      const isLastClue = rebuiltCount >= world.monuments.length;
      const nextWorld = WORLDS_DATA.find(w => w.id === world.id + 1);
      const nextWorldName = nextWorld ? (nextWorld.locationName || nextWorld.name) : '';

      const clueText = description
        ? `Indizio sbloccato! ${monumentModal.monument.name}. ${description}`
        : `Indizio sbloccato! ${monumentModal.monument.name}.`;

      const realmText = isLastClue
        ? (nextWorldName
            ? ` Complimenti! Hai sbloccato tutti e 3 gli indizi! È stato sbloccato il nuovo regno: ${nextWorldName}!`
            : ' Complimenti! Hai sbloccato tutti e 3 gli indizi del regno!')
        : '';

      const fullMessage = `${clueText}${realmText}`;
      void speak(fullMessage);
      return;
    }

    if (monumentModal.isErected) {
      const baseMessage = monumentModal.justUnlocked ? 'Indizio sbloccato.' : 'Indizio già sbloccato.';
      announceWithFallback(description ? `${baseMessage} ${description}` : baseMessage, 'success');
      return;
    }
    if (monumentModal.canAfford) {
      const prompt = `Vuoi sbloccare l'indizio ${monumentModal.monument.name}?`;
      announceWithFallback(description ? `${prompt} ${description}` : prompt);
      return;
    }
    announceWithFallback(`Indizio non sbloccabile. ${sfidaDropsGuidanceMessage}`);
  }, [announceWithFallback, monumentModal, sfidaDropsGuidanceMessage]);

  useEffect(() => {
    if (!pathLockModalMessage) return;
    void speak('Completa prima tutti i passi precedenti!');
  }, [pathLockModalMessage, speak]);

  type StepFactorGridTheme = {
    done: string;
    todo: string;
    accent: string;
  };

  type StepSelectionTheme = StepFactorGridTheme & {
    panel: string;
    badge: string;
    progressTrack: string;
    progressFill: string;
    helpPrimary: string;
    helpSecondary: string;
  };

  const renderStepFactorGrid = ({
    stepKey,
    completed,
    onSelect,
    theme,
  }: {
    stepKey: string;
    completed: Set<number>;
    onSelect: (factor: number) => void;
    theme: StepFactorGridTheme;
  }) => (
    <div
      role="list"
      aria-label={`Lista moltiplicazioni ${stepKey}`}
      className={`w-full h-full grid auto-rows-fr grid-cols-5 ${compactLayout ? 'gap-1.5' : 'gap-2 sm:gap-2.5'}`}
    >
      {ALL_FACTORS.map(factor => {
        const isCompleted = completed.has(factor);
        const isUnlocked = factor === 1 || completed.has(factor - 1);
        const isLocked = !isUnlocked;
        const isNextFactor = !isCompleted && isUnlocked;

        return (
          <div key={`${stepKey}-${factor}`} role="listitem" className="h-full min-h-0">
            <button
              type="button"
              onClick={() => {
                if (isLocked) {
                  sound.playError();
                  speak(GAMEPLAY_AUDIO_MESSAGES.combinationLocked);
                  setPathLockModalMessage(
                    `🔒 Combinazione Bloccata!\n\nPer sbloccare ${world.id}×${factor}, devi prima completare la scheda ${world.id}×${factor - 1}.`
                  );
                  return;
                }
                sound.playClick();
                speak(`${toItalianWord(world.id)} per ${toItalianWord(factor)}`);
                onSelect(factor);
              }}
              className={`relative w-full h-full rounded-2xl border-2 shadow-sm transition-all cursor-pointer
                          focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                          flex flex-col items-center justify-center ${compactLayout ? 'py-1 gap-0.5' : 'py-2 gap-1'}
                          ${
                            isCompleted
                              ? theme.done
                              : isLocked
                                ? 'bg-slate-100/90 border-slate-200 text-slate-400 opacity-60 hover:border-slate-300'
                                : isNextFactor
                                  ? 'bg-amber-50 border-amber-500 ring-4 ring-amber-300 ring-inset text-amber-950 shadow-md animate-pulse'
                                  : theme.todo
                          }`}
              aria-label={`${world.id} per ${factor}${isCompleted ? ', completata' : isLocked ? ', bloccata' : ', da completare'}`}
            >
              {isCompleted && (
                <span
                  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] font-black shadow-md"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
              {isLocked && (
                <span
                  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-md"
                  aria-hidden="true"
                >
                  🔒
                </span>
              )}
              <span className={`${compactLayout ? 'text-sm' : 'text-base'} font-black font-mono leading-none`}>
                {world.id}×{factor}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderStepSelectionScreen = ({
    stepKey,
    badge,
    title,
    description,
    completed,
    onSelect,
    theme,
  }: {
    stepKey: 'comprendo' | 'salto' | 'costruisco' | 'trucchi';
    badge: string;
    title: string;
    description?: string;
    completed: Set<number>;
    onSelect: (factor: number) => void;
    theme: StepSelectionTheme;
  }) => (
    <div className="max-w-4xl mx-auto w-full h-full min-h-0 overflow-hidden">
      <SurfaceCard padding="lg" className={`h-full min-h-0 shadow-lg border-2 ${theme.panel} flex flex-col`}>
        <div className="flex items-center justify-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full font-sans ${theme.badge}`}>
            {badge}
          </span>
        </div>

        <SectionHeader centered title={title} description={description} />

        <div className="mt-6 flex-1 min-h-0 overflow-visible px-1 pt-1">
          {renderStepFactorGrid({
            stepKey,
            completed,
            onSelect,
            theme,
          })}
        </div>

        <div className="mt-4 shrink-0 text-center">
          <p className={`text-xs font-bold ${theme.accent}`}>
            Completate: {completed.size}/10
          </p>
          <div className={`w-full rounded-full h-2 mt-2 overflow-hidden ${theme.progressTrack}`}>
            <div
              className={`${theme.progressFill} h-full transition-all`}
              style={{ width: `${(completed.size / 10) * 100}%` }}
            />
          </div>
        </div>
      </SurfaceCard>
    </div>
  );

  // Helper to save completed factor/combination and update profile store
  const saveFactorCompleted = (stepName: 'comprendo' | 'salto' | 'costruisco' | 'trucchi', factor: number | null) => {
    if (factor === null) return;
    let didReachTenNow = false;

    updateProfile(p => {
      const worldProg = p.worldProgress[world.id] || {
        worldId: world.id,
        completedSteps: [],
        rebuiltMonuments: [],
        creatureEvolution: 'egg',
        highScore: 0,
        stars: 0
      };

      const existingFactors = (worldProg.completedFactors?.[stepName] || [])
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && ALL_FACTORS.includes(value));
      const nextFactors = existingFactors.includes(factor) ? existingFactors : [...existingFactors, factor];
      const wasAlreadyCompleted = existingFactors.length >= 10 || worldProg.completedSteps.includes(stepName);
      didReachTenNow = !wasAlreadyCompleted && nextFactors.length >= 10;
      const newCompletedFactors = {
        ...(worldProg.completedFactors || {}),
        [stepName]: nextFactors
      };

      let nextCompletedSteps = [...worldProg.completedSteps];
      if (nextFactors.length >= 10 && !nextCompletedSteps.includes(stepName)) {
        nextCompletedSteps.push(stepName);
      }
      const nextStepToUnlock = nextFactors.length >= 10 ? getNextStepAfterCompletion(stepName) : null;
      const nextLockedSteps = nextStepToUnlock
        ? (worldProg.lockedSteps || []).filter(lockedStepId => lockedStepId !== nextStepToUnlock)
        : (worldProg.lockedSteps || []);

      let evolution = worldProg.creatureEvolution;
      if (nextCompletedSteps.length >= 6) {
        evolution = 'adult';
      } else if (nextCompletedSteps.length >= 3) {
        evolution = 'child';
      }

      const nextXP = p.xp + 15;
      const nextCoins = p.coins;
      let nextLevel = p.level;
      if (nextXP >= nextLevel * 100) nextLevel += 1;

      return {
        ...p,
        xp: nextXP,
        coins: nextCoins,
        level: nextLevel,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...worldProg,
            completedSteps: nextCompletedSteps,
            completedFactors: newCompletedFactors,
            lockedSteps: nextLockedSteps,
            creatureEvolution: evolution
          }
        }
      };
    });

    if (didReachTenNow) {
      triggerFireworksAndMotivation(stepName);
    }
  };

  const handleComprendoCompletionChange = (isCompleted: boolean) => {
    setComprendoGameCompleted(isCompleted);
    if (comprendoCompletionOverlayTimeoutRef.current !== null) {
      window.clearTimeout(comprendoCompletionOverlayTimeoutRef.current);
      comprendoCompletionOverlayTimeoutRef.current = null;
    }

    if (!isCompleted) {
      setShowComprendoCompletionEffect(false);
      return;
    }

    setShowComprendoCompletionEffect(true);
    comprendoCompletionOverlayTimeoutRef.current = window.setTimeout(() => {
      setShowComprendoCompletionEffect(false);
      comprendoCompletionOverlayTimeoutRef.current = null;
    }, COMPRENDO_COMPLETION_OVERLAY_MS);
  };

  const cancelComprendoExercise = () => {
    if (comprendoCompletionOverlayTimeoutRef.current !== null) {
      window.clearTimeout(comprendoCompletionOverlayTimeoutRef.current);
      comprendoCompletionOverlayTimeoutRef.current = null;
    }
    setComprendoFlowStage('objective');
    setComprendoGameCompleted(false);
    setShowComprendoCompletionEffect(false);
    setComprendoSelectedFactor(null);
  };
  const completeComprendoExercise = () => {
    sound.playLevelUp();
    if (comprendoSelectedFactor !== null) {
      setComprendoCompleted(prev => new Set([...prev, comprendoSelectedFactor]));
      saveFactorCompleted('comprendo', comprendoSelectedFactor);
    }
    cancelComprendoExercise();
  };
  const cancelSaltoExercise = () => {
    setSaltoFlowStage('objective');
    setSaltoGameCompleted(false);
    setShowSaltoCompletionEffect(false);
    setSaltoSelectedFactor(null);
  };
  const completeSaltoExercise = () => {
    sound.playLevelUp();
    if (saltoSelectedFactor !== null) {
      setSaltoCompleted(prev => new Set([...prev, saltoSelectedFactor]));
      saveFactorCompleted('salto', saltoSelectedFactor);
    }
    cancelSaltoExercise();
  };
  const cancelCostruiscoExercise = () => {
    setCostruiscoFlowStage('objective');
    setCostruiscoGameCompleted(false);
    setShowCostruiscoCompletionEffect(false);
    setCostruiscoSelectedFactor(null);
  };
  const completeCostruiscoExercise = () => {
    sound.playLevelUp();
    if (costruiscoSelectedFactor !== null) {
      setCostruiscoCompleted(prev => new Set([...prev, costruiscoSelectedFactor]));
      saveFactorCompleted('costruisco', costruiscoSelectedFactor);
    }
    cancelCostruiscoExercise();
  };
  const cancelTrucchiExercise = () => {
    setTrucchiFlowStage('objective');
    setTrucchiGameCompleted(false);
    setShowTrucchiCompletionEffect(false);
    setTrucchiSelectedFactor(null);
  };
  const completeTrucchiExercise = () => {
    sound.playLevelUp();
    if (trucchiSelectedFactor !== null) {
      setTrucchiCompleted(prev => new Set([...prev, trucchiSelectedFactor]));
      saveFactorCompleted('trucchi', trucchiSelectedFactor);
    }
    cancelTrucchiExercise();
  };


  const goBackFromWorldContent = () => {
    if (activeStep === 'sfida' && sfidaActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSfidaActive(false);
      setSfidaReady(true);
      setSfidaQuestion(null);
      setSfidaTimer(30);
      setSfidaOptions([]);
      return;
    }

    if (comprendoSelectedFactor !== null) {
      setComprendoFlowStage('objective');
      setComprendoGameCompleted(false);
      setComprendoSelectedFactor(null);
    } else if (saltoSelectedFactor !== null) {
      if (saltoFlowStage === 'game') {
        setSaltoFlowStage('objective');
      } else {
        cancelSaltoExercise();
      }
      return;
    } else if (costruiscoSelectedFactor !== null) {
      if (costruiscoFlowStage === 'game') {
        setCostruiscoFlowStage('objective');
      } else {
        cancelCostruiscoExercise();
      }
      return;
    } else if (trucchiSelectedFactor !== null) {
      if (trucchiFlowStage === 'game') {
        setTrucchiFlowStage('objective');
      } else {
        cancelTrucchiExercise();
      }
      return;
    } else if (isInPlayableStepView) {
      if (activeStep === 'sfida') {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setSfidaActive(false);
        setSfidaReady(true);
        setSfidaQuestion(null);
        setSfidaTimer(30);
        setSfidaOptions([]);
      }
      setActiveStep('intro');
    } else {
      onBack();
    }
  };
  const handleSwipeBack = () => {
    sound.playClick();
    if (activeStep === 'comprendo' && comprendoSelectedFactor !== null) {
      if (comprendoFlowStage === 'game') {
        setComprendoFlowStage('objective');
      } else {
        cancelComprendoExercise();
      }
      return;
    }
    if (activeStep === 'salto' && saltoSelectedFactor !== null) {
      if (saltoFlowStage === 'game') {
        setSaltoFlowStage('objective');
      } else {
        cancelSaltoExercise();
      }
      return;
    }
    if (activeStep === 'costruisco' && costruiscoSelectedFactor !== null) {
      if (costruiscoFlowStage === 'game') {
        setCostruiscoFlowStage('objective');
      } else {
        cancelCostruiscoExercise();
      }
      return;
    }
    if (activeStep === 'trucchi' && trucchiSelectedFactor !== null) {
      if (trucchiFlowStage === 'game') {
        setTrucchiFlowStage('objective');
      } else {
        cancelTrucchiExercise();
      }
      return;
    }
    goBackFromWorldContent();
  };
  const canSwipeRightContinue =
    (activeStep === 'comprendo' && comprendoSelectedFactor !== null && (
      comprendoFlowStage === 'objective' ||
      (comprendoFlowStage === 'game' && comprendoGameCompleted)
    )) ||
    (activeStep === 'salto' && saltoSelectedFactor !== null && (
      saltoFlowStage === 'objective' ||
      (saltoFlowStage === 'game' && saltoGameCompleted)
    )) ||
    (activeStep === 'costruisco' && costruiscoSelectedFactor !== null && (
      costruiscoFlowStage === 'objective' ||
      (costruiscoFlowStage === 'game' && costruiscoGameCompleted)
    )) ||
    (activeStep === 'trucchi' && trucchiSelectedFactor !== null && (
      trucchiFlowStage === 'objective' ||
      (trucchiFlowStage === 'game' && trucchiGameCompleted)
    ));
  const handleSwipeContinue = () => {
    if (!canSwipeRightContinue) return;
    sound.playClick();
    if (activeStep === 'comprendo' && comprendoSelectedFactor !== null) {
      if (comprendoFlowStage === 'objective') {
        setComprendoFlowStage('game');
      } else if (comprendoFlowStage === 'game' && comprendoGameCompleted) {
        completeComprendoExercise();
      }
      return;
    }
    if (activeStep === 'salto' && saltoSelectedFactor !== null) {
      if (saltoFlowStage === 'objective') {
        setSaltoFlowStage('game');
      } else if (saltoFlowStage === 'game' && saltoGameCompleted) {
        completeSaltoExercise();
      }
      return;
    }
    if (activeStep === 'costruisco' && costruiscoSelectedFactor !== null) {
      if (costruiscoFlowStage === 'objective') {
        setCostruiscoFlowStage('game');
      } else if (costruiscoFlowStage === 'game' && costruiscoGameCompleted) {
        completeCostruiscoExercise();
      }
      return;
    }
    if (activeStep === 'trucchi' && trucchiSelectedFactor !== null) {
      if (trucchiFlowStage === 'objective') {
        setTrucchiFlowStage('game');
      } else if (trucchiFlowStage === 'game' && trucchiGameCompleted) {
        completeTrucchiExercise();
      }
    }
  };
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, [data-touch-swipe-lock="true"]')) return;
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    if (event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const horizontalThreshold = 70;
    const verticalThreshold = 45;
    if (Math.abs(deltaY) > verticalThreshold || Math.abs(deltaX) < horizontalThreshold) return;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.6) return;

    if (deltaX < 0) {
      handleSwipeBack();
      return;
    }

    handleSwipeContinue();
  };

  return (
    <div
      className="w-full h-full bg-transparent flex flex-col overflow-hidden"
      id={`world-panel-${world.id}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main content - only show if no view is pushed */}
      {!currentView && (
        <React.Fragment>
      {/* Main Container */}
      <div className={`flex-1 overflow-y-auto flex flex-col ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
        {activeStep !== 'comprendo' && activeStep !== 'salto' && activeStep !== 'costruisco' && activeStep !== 'trucchi' && activeStep !== 'pratico' && activeStep !== 'sfida' && (
          <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-start gap-5">
            {/* Header del Sentiero */}
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Compass className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-black text-indigo-950 font-sans">Sentiero del Regno del {world.id}</h3>
                    <p className="text-xs text-slate-500 font-sans">Sblocca i giochi fino a Pratico, usa le monete per entrare nella Sfida e ottieni le gocce per scoprire gli indizi.</p>
                  </div>
                </div>
              </div>
              <div role="list" className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2.5">
                <button
                  type="button"
                  role="listitem"
                  onClick={handleMoneteBadgeClick}
                  disabled={!canGoToSfidaFromCoins}
                  aria-disabled={!canGoToSfidaFromCoins}
                  className={`rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center shadow-sm transition-all ${
                    !canGoToSfidaFromCoins
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 opacity-70'
                      : shouldHighlightSfidaCta
                        ? 'cursor-pointer border-amber-500 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 text-amber-950 font-black animate-monument-glow ring-2 ring-amber-400'
                        : 'cursor-pointer hover:border-amber-300 hover:bg-amber-100/70'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Monete</p>
                  <p className="text-lg font-black text-amber-800">🪙 {worldCoins}</p>
                  <p className={`text-[11px] font-black ${
                    !canGoToSfidaFromCoins
                      ? 'text-slate-500'
                      : shouldHighlightSfidaCta
                        ? 'text-amber-950 animate-badge-blink'
                        : 'text-amber-900'
                  }`}>
                    {!canGoToSfidaFromCoins ? '🔒 Sfida bloccata' : shouldHighlightSfidaCta ? '✨ Vai alla Sfida! ⚔️' : 'Vai alla Sfida'}
                  </p>
                </button>
                <div
                  role="listitem"
                  className={`rounded-2xl border px-3 py-2 text-center shadow-sm transition-all ${
                    hasErectableBlockedMonuments
                      ? 'border-amber-500 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 ring-2 ring-amber-300 animate-monument-glow'
                      : 'border-sky-200 bg-sky-50'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Gocce</p>
                  <p className="text-lg font-black text-sky-800">💧 {worldLightDrops}</p>
                  <p className={`text-[11px] font-black ${hasErectableBlockedMonuments ? 'text-amber-950 animate-badge-blink' : 'text-sky-900'}`}>
                    {hasErectableBlockedMonuments ? '✨ Scopri Indizi! 🧭' : 'Indizi del Regno'}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-indigo-100 bg-white/80 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider font-sans">
                    Indizi del Regno ({rebuiltCount}/{world.monuments.length})
                  </h4>
                </div>
                <div role="list" className="grid grid-cols-3 gap-1.5 pb-1">
                  {world.monuments.map(monument => {
                    const isErected = worldProg.rebuiltMonuments.includes(monument.id);
                    const canAfford = worldLightDrops >= monument.cost;
                    const missingDrops = Math.max(monument.cost - worldLightDrops, 0);

                    return (
                      <button
                        key={`compact-monument-${monument.id}`}
                        type="button"
                        role="listitem"
                        onClick={() => {
                          sound.playClick();
                          setShouldReturnToMonumentsListAfterModal(false);
                          setMonumentModal({ monument, canAfford, isErected, justUnlocked: false });
                        }}
                        className={`rounded-2xl border px-2 py-2 text-left shadow-sm transition-all cursor-pointer min-w-0 ${
                          isErected
                            ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400'
                            : canAfford
                              ? 'border-amber-500 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 ring-2 ring-amber-300 animate-monument-glow'
                              : 'border-slate-200 border-dashed bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className={`text-lg leading-none ${isErected ? '' : canAfford ? 'scale-110' : 'grayscale opacity-60'}`}>
                            {monument.emoji}
                          </span>
                          <span className={`text-[10px] font-black ${
                            isErected ? 'text-emerald-700' : canAfford ? 'text-amber-900' : 'text-slate-600'
                          }`}>
                            {isErected ? '✓' : '🧭'}
                          </span>
                        </div>
                        <p className={`mt-0.5 text-xs font-black ${
                          isErected ? 'text-emerald-700' : canAfford ? 'text-amber-900 animate-badge-blink' : 'text-sky-800'
                        }`}>
                          {monument.name}
                        </p>
                        <p className={`mt-0.5 text-[10px] font-bold ${
                          isErected ? 'text-emerald-700' : canAfford ? 'text-amber-900' : 'text-slate-700'
                        }`}>
                          {isErected
                            ? 'Sbloccato'
                            : canAfford
                              ? `Costo: ${monument.cost} gocce`
                              : `Servono ancora ${missingDrops} gocce`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* PARTE 2: PASSI DIDATTICI (1 - 5) */}
            <div className="space-y-2 order-2">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider px-1 font-sans">
                Passi Didattici
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'comprendo', title: '1. Raccogli', desc: 'Raccogli le mele nei cesti.', icon: '🍎', coins: 0, drops: 0, isFactorBased: true },
                  { id: 'salto', title: '2. Salta', desc: 'Salta di sasso in sasso sul ruscello.', icon: '🐸', coins: 0, drops: 0, isFactorBased: true },
                  { id: 'costruisco', title: '3. Scoppia', desc: 'Scoppia il palloncino giusto.', icon: '🎈', coins: 0, drops: 0, isFactorBased: true },
                  { id: 'trucchi', title: '4. Trova', desc: 'Trova il mattone corretto.', icon: '🧱', coins: 0, drops: 0, isFactorBased: true },
                  { id: 'pratico', title: '5. Pratico (Avventura)', desc: 'Sconfiggi la nebbia e raccogli monete per la Sfida.', icon: '🛡️', coins: PRATICO_REWARD_COINS, drops: PRATICO_REWARD_DROPS, isFactorBased: false },
                ].map((step, idx) => {
                  const isDone = stepDoneMap[step.id] || false;
                  const prevStepId = idx > 0 ? ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico'][idx - 1] : null;
                  const prevStepDone = idx === 0 || (prevStepId ? (stepDoneMap[prevStepId] || false) : true);
                  const isLocked = (worldProg.lockedSteps?.includes(step.id) || false) || !prevStepDone;
                  const factorCount = stepFactorsCountMap[step.id] || 0;
                  const isNext = step.id === nextStepToPlay;

                  return (
                    <button
                      key={step.id}
                      ref={isNext ? activeStepCardRef : null}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          sound.playError();
                          speak(GAMEPLAY_AUDIO_MESSAGES.stepLocked);
                          setPathLockModalMessage(`🔒 Step Bloccato!\n\nCompleta prima tutti i passi precedenti per accedere a ${step.title}.`);
                          return;
                        }
                        sound.playClick();
                        void speak(`${step.desc}`);
                        if (step.id === 'comprendo') setActiveStep('comprendo');
                        else if (step.id === 'salto') { setActiveStep('salto'); }
                        else if (step.id === 'costruisco') { resetCostruisco(); setActiveStep('costruisco'); }
                        else if (step.id === 'trucchi') { setTrucchiGameCompleted(false); setActiveStep('trucchi'); }
                        else if (step.id === 'pratico') startQuizMode();
                      }}
                      className={`relative p-3.5 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer ${
                        isLocked
                          ? 'opacity-60 bg-slate-100 border-slate-200'
                          : isNext
                            ? 'bg-amber-50/90 border-amber-500 ring-4 ring-amber-300 shadow-md animate-pulse'
                            : isDone
                              ? 'bg-emerald-50/90 border-emerald-300 shadow-sm hover:border-emerald-400'
                              : 'bg-white border-indigo-100 hover:border-indigo-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{isLocked ? '🔒' : step.icon}</span>
                        {isDone ? (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ Fatto {step.isFactorBased ? '(10/10)' : ''}
                          </span>
                        ) : !isLocked && step.isFactorBased ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            factorCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {factorCount}/10
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-indigo-950 font-sans">{step.title}</h5>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5 font-sans">{step.desc}</p>
                      </div>

                      {!isLocked && !isDone && step.isFactorBased && (
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                          <div
                            className="bg-amber-400 h-full transition-all duration-300"
                            style={{ width: `${(factorCount / 10) * 100}%` }}
                          />
                        </div>
                      )}

                      <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-amber-700 font-sans">
                        <div className="flex items-center gap-2">
                          {step.coins > 0 && <span>🪙+{step.coins}</span>}
                          {step.drops > 0 && <span>💧+{step.drops} Gocce</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PARTE 3: SFIDA FINALE DEL REGNO */}
            <div className="space-y-2 order-3">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider px-1 font-sans">
                3. Prova Finale del Sentiero
              </h4>
              {(() => {
                const isSfidaDone = stepDoneMap['sfida'];
                const isSfidaLocked = isSfidaPathLocked;
                const isSfidaNext = nextStepToPlay === 'sfida';

                return (
                  <button
                    ref={isSfidaNext ? activeStepCardRef : null}
                    type="button"
                    onClick={() => {
                      if (isSfidaLocked) {
                        sound.playError();
                        speak(GAMEPLAY_AUDIO_MESSAGES.sfidaLocked);
                        setPathLockModalMessage(`🔒 Sfida Bloccata!\n\n${sfidaLockedMessage}`);
                        return;
                      }
                      sound.playClick();
                      void speak('Hai scelto 6. Sfida Finale. Preparati alla prova a tempo.');
                      startSfidaMode();
                    }}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSfidaLocked
                        ? 'opacity-60 bg-slate-100 border-slate-200'
                        : isSfidaNext
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-amber-400 ring-4 ring-amber-300 text-white shadow-xl animate-pulse'
                          : isSfidaDone
                            ? 'bg-gradient-to-r from-emerald-100 via-amber-50 to-emerald-50 border-emerald-400 shadow-md'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-lg hover:brightness-105'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{isSfidaLocked ? '🔒' : '⚡'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className={`text-sm font-black font-sans ${isSfidaLocked ? 'text-slate-700' : isSfidaDone ? 'text-emerald-950' : 'text-white'}`}>
                            6. Sfida Finale (Cronometro)
                          </h5>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-black px-3 py-2 rounded-xl whitespace-nowrap shadow-xs font-sans ${
                      isSfidaLocked ? 'bg-slate-200 text-slate-600' : 'bg-amber-400 text-amber-950 hover:bg-amber-300'
                    }`}>
                      {isSfidaDone ? `▶ Rigioca (${SFIDA_UNLOCK_COST} 🪙)` : `▶ Avvia Sfida (${SFIDA_UNLOCK_COST} 🪙)`}
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* STEP 1: COMPRENDO - List of combinations to complete */}
        {activeStep === 'comprendo' && comprendoSelectedFactor === null && (
          renderStepSelectionScreen({
              stepKey: 'comprendo',
              badge: 'Passo 1',
              title: '1. Raccogli 🍎',
              description: 'Raccogli le mele nei cesti.',
              completed: effectiveComprendoCompleted,
              onSelect: (factor) => {
                sound.playClick();
              setComprendoSelectedFactor(factor);
              setComprendoFlowStage('game');
              setShowComprendoCompletionEffect(false);
            },
            theme: {
              panel: 'bg-indigo-50 border-indigo-200',
              badge: 'text-indigo-600 bg-indigo-100',
              done: 'bg-indigo-100 border-indigo-300 text-indigo-800',
              todo: 'bg-white/90 border-indigo-200 text-slate-700 hover:border-indigo-400',
              accent: 'text-indigo-600',
              progressTrack: 'bg-indigo-200',
              progressFill: 'bg-emerald-500',
              helpPrimary: 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700',
              helpSecondary: 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400',
            },
          })
        )}

        {/* STEP 1: COMPRENDO - Game interface for selected combination */}
        {activeStep === 'comprendo' && comprendoSelectedFactor !== null && (
           <div className="flex-1 flex flex-col overflow-hidden bg-white">
             <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
               <div className={`${comprendoFlowStage === 'game' ? 'max-w-2xl' : 'max-w-xl'} mx-auto w-full space-y-6`}>
                 {comprendoFlowStage === 'objective' && (
                   <div className="bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-4">
                     <div className="text-center">
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-sans">
                          <button
                            type="button"
                            onClick={() => speakOperationOnly(world.id, comprendoSelectedFactor)}
                            className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-indigo-500"
                            aria-label={`Ascolta operazione ${world.id} per ${comprendoSelectedFactor}`}
                          >
                            Comprendo: {world.id} × {comprendoSelectedFactor}
                          </button>
                       </span>
                       <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                          Che cos'è{' '}
                          <button
                            type="button"
                            onClick={() => speakOperationOnly(world.id, comprendoSelectedFactor)}
                            className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-indigo-500"
                            aria-label={`Ascolta operazione ${world.id} per ${comprendoSelectedFactor}`}
                          >
                            {world.id} × {comprendoSelectedFactor}
                          </button>
                          ?
                       </h3>
                       <p className="text-xs text-slate-500 mt-1">
                         La moltiplicazione non è altro che addizione ripetuta dello stesso gruppo!
                       </p>
                     </div>
                     <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                       <h4 className="font-bold text-indigo-950 font-sans">Come si gioca:</h4>
                       <p className="text-slate-600 mt-1 leading-relaxed">
                         Tocca gli oggetti e contali uno alla volta: ogni gruppo contiene <strong>{comprendoSelectedFactor}</strong> elementi e ci sono <strong>{world.id}</strong> gruppi.
                       </p>
                       <p className="text-slate-600 mt-1 leading-relaxed">
                          Quando hai contato tutto, collega il totale all'operazione{' '}
                          <strong>
                            <button
                              type="button"
                              onClick={() => speakOperationOnly(world.id, comprendoSelectedFactor)}
                              className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-indigo-500"
                              aria-label={`Ascolta operazione ${world.id} per ${comprendoSelectedFactor}`}
                            >
                              {world.id} × {comprendoSelectedFactor} = {world.id * comprendoSelectedFactor}
                            </button>
                          </strong>
                          .
                       </p>
                     </div>
                     <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                       <h4 className="font-bold text-yellow-900 font-sans">
                         💡 Obiettivo:
                       </h4>
                       <p className="mt-2 text-sm text-yellow-800">
                         Tocca gli oggetti per contarli uno ad uno e capire il concetto di moltiplicazione!
                       </p>
                     </div>
                   </div>
                 )}

                 {comprendoFlowStage === 'game' && (
                   <div className="relative bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
                     <ComprendoBasketGame
                        ref={comprendoBasketGameRef}
                       a={world.id}
                       b={comprendoSelectedFactor}
                       itemEmoji={world.itemsToCount}
                       onCompletionChange={handleComprendoCompletionChange}
                        helperGuidanceSeen={profile.helperGuidanceSeen}
                        onConsumeGuidance={consumeGuidance}
                     />
                      {showComprendoCompletionEffect && (
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto">
                          <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
                            <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
                          </div>
                        </div>
                      )}
                   </div>
                 )}

               </div>
             </div>

             <div className={`sticky bottom-0 z-20 flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-xs ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
               <div className={`${comprendoFlowStage === 'game' ? 'max-w-2xl' : 'max-w-xl'} mx-auto w-full`}>
                  {comprendoFlowStage === 'game' ? (
                    <ActionGrid columns={2}>
                      <button
                        onClick={() => {
                          sound.playClick();
                          cancelComprendoExercise();
                        }}
                        className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => {
                          sound.playClick();
                          if (!comprendoGameCompleted) return;
                          completeComprendoExercise();
                        }}
                        disabled={!comprendoGameCompleted}
                        className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-colors motion-safe:animate-pulse ${
                          comprendoGameCompleted
                            ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                            : 'bg-indigo-300 cursor-not-allowed opacity-70'
                        }`}
                      >
                        Continua
                      </button>
                    </ActionGrid>
                 ) : (
                   <div className="space-y-2">
                     <button
                       onClick={() => {
                         sound.playClick();
                         cancelComprendoExercise();
                       }}
                       className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                     >
                       Torna alle combinazioni
                     </button>
                     <button
                       onClick={() => {
                         sound.playClick();
                         setComprendoFlowStage('game');
                       }}
                       className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
                     >
                       Continua
                     </button>
                   </div>
                 )}
               </div>
             </div>
            </div>
        )}

        {/* STEP 2: SALTO (Skip Counting) - LIST VIEW */}
        {activeStep === 'salto' && saltoSelectedFactor === null && (
          renderStepSelectionScreen({
            stepKey: 'salto',
            badge: 'Passo 2',
            title: '2. Salta 🐸',
            description: 'Salta di sasso in sasso sul ruscello.',
            completed: effectiveSaltoCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setSaltoSelectedFactor(factor);
              setSaltoFlowStage('game');
              setSaltoGameCompleted(false);
              setShowSaltoCompletionEffect(false);
            },
            theme: {
              panel: 'bg-purple-50 border-purple-200',
              badge: 'text-purple-600 bg-purple-100',
              done: 'bg-purple-100 border-purple-300 text-purple-800',
              todo: 'bg-white/90 border-purple-200 text-slate-700 hover:border-purple-400',
              accent: 'text-purple-600',
              progressTrack: 'bg-purple-200',
              progressFill: 'bg-emerald-500',
              helpPrimary: 'w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700',
              helpSecondary: 'w-6 h-6 bg-purple-300 hover:bg-purple-400',
            },
          })
        )}

        {/* STEP 2: SALTO - GAME VIEW */}
        {activeStep === 'salto' && saltoSelectedFactor !== null && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full space-y-5">
                {saltoFlowStage === 'objective' && saltoSelectedFactor !== 1 && (
                  <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-xl space-y-4">
                    <div className="text-center">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full font-sans">
                        <button
                          type="button"
                          onClick={() => speakOperationOnly(world.id, saltoSelectedFactor)}
                          className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-purple-500"
                          aria-label={`Ascolta operazione ${world.id} per ${saltoSelectedFactor}`}
                        >
                          Salto: {world.id} × {saltoSelectedFactor}
                        </button>
                      </span>
                      <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                        🐸 Fai saltare {world.mascotName} sui sassi!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Tocca il numero corretto per completare la sequenza.
                      </p>
                    </div>
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                      <h4 className="font-bold text-indigo-950 font-sans">Come si gioca:</h4>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Osserva l'operazione e scegli il risultato corretto tra le opzioni: ogni salto aggiunge sempre <strong>{world.id}</strong>.
                      </p>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Continua finché completi il percorso e arrivi al totale giusto <strong>{world.id * saltoSelectedFactor}</strong>.
                      </p>
                      {(saltoSelectedFactor ?? 0) >= TRUCCHI_HAMMER_START_FACTOR && (
                        <p className="text-rose-700 font-semibold mt-1 leading-relaxed">
                          ⚠️ Il 🔨 martello parte gia da ×1: e lento all'inizio, accelera da ×4, ×6 e ×8. Se colpisce il mattone giusto, perdi!
                        </p>
                      )}
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                      <h4 className="font-bold text-yellow-900 font-sans">
                        💡 Obiettivo:
                      </h4>
                      <p className="mt-2 text-sm text-yellow-800">
                        Completa il salto corretto per {world.id} × {saltoSelectedFactor} e consolida il conteggio ritmico.
                      </p>
                    </div>
                  </div>
                )}

                {saltoFlowStage === 'game' && (
                  <SaltoExercise
                    key={saltoSelectedFactor}
                    worldId={world.id}
                    factor={saltoSelectedFactor}
                    compactLayout={compactLayout}
                    saltoGameCompleted={saltoGameCompleted}
                    showSaltoCompletionEffect={showSaltoCompletionEffect}
                    showSaltoTouchGuidance={(isSaltoFactorOne || !guidanceSeen.saltoTouch)}
                    showSaltoAvoidGuidance={(isSaltoFactorOne || !guidanceSeen.saltoAvoid)}
                    onConsumeTouchGuidance={() => consumeGuidance('saltoTouch')}
                    onConsumeAvoidGuidance={() => consumeGuidance('saltoAvoid')}
                    onAnnounce={announceWithFallback}
                    onSpeakOperation={() => speakOperationOnly(world.id, saltoSelectedFactor)}
                    setSaltoGameCompleted={setSaltoGameCompleted}
                    setShowSaltoCompletionEffect={setShowSaltoCompletionEffect}
                    setSaltoCompleted={setSaltoCompleted}
                  />
                )}
              </div>
            </div>

            <div className={`sticky bottom-0 z-20 flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-xs ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-2xl mx-auto w-full">
                {saltoFlowStage === 'game' ? (
                  <ActionGrid columns={2}>
                    <button
                      onClick={() => {
                        sound.playClick();
                        cancelSaltoExercise();
                      }}
                      className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        if (!saltoGameCompleted) return;
                        completeSaltoExercise();
                      }}
                      disabled={!saltoGameCompleted}
                      className={`w-full py-3 rounded-2xl font-bold text-sm shadow-md transition-all motion-safe:animate-pulse ${
                        saltoGameCompleted
                          ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      id="salto-continue-btn"
                    >
                      Continua
                    </button>
                  </ActionGrid>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        cancelSaltoExercise();
                      }}
                      className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                    >
                      Torna alle combinazioni
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setSaltoFlowStage('game');
                      }}
                      className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
                    >
                      Continua
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COSTRUISCO (Build the Table) - LIST VIEW */}
        {activeStep === 'costruisco' && costruiscoSelectedFactor === null && (
          renderStepSelectionScreen({
              stepKey: 'costruisco',
              badge: 'Passo 3',
              title: '3. Scoppia 🎈',
              description: 'Scoppia il palloncino giusto.',
              completed: effectiveCostruiscoCompleted,
              onSelect: (factor) => {
                sound.playClick();
                setCostruiscoSelectedFactor(factor);
                setCostruiscoFlowStage('game');
                setCostruiscoGameCompleted(false);
                setShowCostruiscoCompletionEffect(false);
            },
            theme: {
              panel: 'bg-emerald-50 border-emerald-200',
              badge: 'text-emerald-600 bg-emerald-100',
              done: 'bg-emerald-100 border-emerald-300 text-emerald-800',
              todo: 'bg-white/90 border-emerald-200 text-slate-700 hover:border-emerald-400',
              accent: 'text-emerald-600',
              progressTrack: 'bg-emerald-200',
              progressFill: 'bg-emerald-500',
              helpPrimary: 'w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700',
              helpSecondary: 'w-6 h-6 bg-emerald-300 hover:bg-emerald-400',
            },
          })
        )}

        {/* STEP 3: COSTRUISCO (Build the Table) - GAME VIEW */}
        {activeStep === 'costruisco' && costruiscoSelectedFactor !== null && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
           <div className="flex-1 flex flex-col overflow-hidden bg-white">
             <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
               <div className="max-w-2xl mx-auto w-full space-y-6">
                 {costruiscoFlowStage === 'objective' && (
                   <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xl space-y-4">
                     <div className="text-center">
                       <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-sans">
                          <button
                            type="button"
                            onClick={() => speakOperationOnly(world.id, costruiscoSelectedFactor)}
                            className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-emerald-500"
                            aria-label={`Ascolta operazione ${world.id} per ${costruiscoSelectedFactor}`}
                          >
                            Scoppia: {world.id} × {costruiscoSelectedFactor}
                          </button>
                       </span>
                       <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                         Scoppia il palloncino col risultato giusto!
                       </h3>
                       <p className="text-xs text-slate-500 mt-1">
                         Possono salire fino a 3 palloncini insieme, con ingressi casuali.
                       </p>
                     </div>
                     <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                       <h4 className="font-bold text-indigo-950 font-sans">Come si gioca:</h4>
                       <p className="text-slate-600 mt-1 leading-relaxed">
                          Tocca il palloncino con il risultato giusto di{' '}
                          <b>
                            <button
                              type="button"
                              onClick={() => speakOperationOnly(world.id, costruiscoSelectedFactor)}
                              className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-emerald-500"
                              aria-label={`Ascolta operazione ${world.id} per ${costruiscoSelectedFactor}`}
                            >
                              {world.id} × {costruiscoSelectedFactor}
                            </button>
                          </b>
                          .
                       </p>
                       <p className="text-slate-600 mt-1 leading-relaxed text-rose-700 font-semibold">
                         ⚠️ Attenzione: c'è un 💣 palloncino trappola col numero corretto! Cerca quello <b>colorato</b>, non quello scuro.
                       </p>
                     </div>
                     <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                       <h4 className="font-bold text-yellow-900 font-sans">
                         💡 Obiettivo:
                       </h4>
                       <p className="mt-2 text-sm text-yellow-800">
                         Identifica il prodotto corretto fra i vari numeri proposti nei palloncini.
                       </p>
                     </div>
                   </div>
                 )}

                 {costruiscoFlowStage === 'game' && costruiscoSelectedFactor !== null && (
                   <CostruiscoExercise
                     key={costruiscoSelectedFactor}
                     worldId={world.id}
                     factor={costruiscoSelectedFactor}
                     playerGender={playerGender}
                     compactLayout={compactLayout}
                     costruiscoGameCompleted={costruiscoGameCompleted}
                     showCostruiscoCompletionEffect={showCostruiscoCompletionEffect}
                     showCostruiscoTouchGuidance={(isCostruiscoFactorOne || !guidanceSeen.costruiscoTouch)}
                     showCostruiscoAvoidGuidance={(isCostruiscoFactorOne || !guidanceSeen.costruiscoAvoid)}
                     onConsumeTouchGuidance={() => consumeGuidance('costruiscoTouch')}
                     onConsumeAvoidGuidance={() => consumeGuidance('costruiscoAvoid')}
                     onAnnounce={announceWithFallback}
                     onSpeakOperation={() => speakOperationOnly(world.id, costruiscoSelectedFactor)}
                     setCostruiscoGameCompleted={setCostruiscoGameCompleted}
                     setShowCostruiscoCompletionEffect={setShowCostruiscoCompletionEffect}
                     setCostruiscoCompleted={setCostruiscoCompleted}
                   />
                 )}
               </div>
             </div>

             <div className={`sticky bottom-0 z-20 flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-xs ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
               <div className="max-w-2xl mx-auto w-full">
                 {costruiscoFlowStage === 'game' ? (
                     <ActionGrid columns={2}>
                       <button
                         onClick={() => {
                           sound.playClick();
                           cancelCostruiscoExercise();
                         }}
                         className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                       >
                         Annulla
                       </button>
                       <button
                         onClick={() => {
                           sound.playClick();
                           if (!costruiscoGameCompleted) return;
                           completeCostruiscoExercise();
                         }}
                         disabled={!costruiscoGameCompleted}
                         className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-colors motion-safe:animate-pulse ${
                           costruiscoGameCompleted
                             ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                             : 'bg-emerald-300 cursor-not-allowed opacity-70'
                         }`}
                       >
                         Continua
                       </button>
                     </ActionGrid>
                 ) : (
                   <div className="space-y-2">
                     <button
                       onClick={() => {
                         sound.playClick();
                         cancelCostruiscoExercise();
                       }}
                       className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                     >
                       Torna alle combinazioni
                     </button>
                     <button
                       onClick={() => {
                         sound.playClick();
                         setCostruiscoFlowStage('game');
                       }}
                       className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
                     >
                       Continua
                     </button>
                   </div>
                 )}
               </div>
             </div>
            </div>
          </div>
        )}

         {/* STEP 4: TRUCCHI (Interactive strategies and associate rules) - LIST VIEW */}
        {activeStep === 'trucchi' && trucchiSelectedFactor === null && (
          renderStepSelectionScreen({
            stepKey: 'trucchi',
            badge: 'Passo 4',
            title: '4. Trova 🧱',
            description: 'Trova il mattone corretto.',
            completed: effectiveTrucchiCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setTrucchiSelectedFactor(factor);
              setTrucchiFlowStage('game');
              setTrucchiGameCompleted(false);
              setShowTrucchiCompletionEffect(false);
            },
            theme: {
              panel: 'bg-amber-50 border-amber-200',
              badge: 'text-amber-600 bg-amber-100',
              done: 'bg-amber-100 border-amber-300 text-amber-800',
              todo: 'bg-white/90 border-amber-200 text-slate-700 hover:border-amber-400',
              accent: 'text-amber-600',
              progressTrack: 'bg-amber-200',
              progressFill: 'bg-emerald-500',
              helpPrimary: 'w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700',
              helpSecondary: 'w-6 h-6 bg-amber-300 hover:bg-amber-400',
            },
          })
        )}

        {/* STEP 4: TRUCCHI (Interactive strategies and associate rules) - GAME VIEW */}
        {activeStep === 'trucchi' && trucchiSelectedFactor !== null && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className={`flex-1 overflow-hidden ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full space-y-5">
                {trucchiFlowStage === 'objective' && (
                  <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-xl space-y-4">
                    <div className="text-center">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full font-sans">
                        <button
                          type="button"
                          onClick={() => speakOperationOnly(world.id, trucchiSelectedFactor)}
                          className="cursor-pointer rounded px-1 focus-visible:outline-2 focus-visible:outline-amber-500"
                          aria-label={`Ascolta operazione ${world.id} per ${trucchiSelectedFactor}`}
                        >
                          Trova: {world.id} × {trucchiSelectedFactor}
                        </button>
                      </span>
                      <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                        {world.trickTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Impara il trucco della terra del {world.id} con {world.mascotName}.
                      </p>
                    </div>

                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                      <h4 className="font-bold text-indigo-950 font-sans">Come si gioca:</h4>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Leggi il trucco, poi applicalo subito alla domanda del turno.
                      </p>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Per completare, usa la strategia giusta e individua il risultato corretto senza perdere equilibrio.
                      </p>
                      {(trucchiSelectedFactor ?? 0) >= TRUCCHI_HAMMER_START_FACTOR && (
                        <p className="text-rose-700 font-semibold mt-1 leading-relaxed">
                          ⚠️ Il 🔨 martello parte gia da ×1: e lento all'inizio, accelera da ×4, ×6 e ×8. Se colpisce il mattone giusto, perdi!
                        </p>
                      )}
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                      <h4 className="font-bold text-yellow-900 font-sans">
                        💡 Obiettivo:
                      </h4>
                      <p className="mt-2 text-sm text-yellow-800">
                        Scopri scorciatoie e pattern per memorizzare le tabelline più velocemente.
                      </p>
                    </div>
                  </div>
                )}

                {trucchiFlowStage === 'game' && (
                  <TrucchiExercise
                    key={trucchiSelectedFactor}
                    worldId={world.id}
                    factor={trucchiSelectedFactor}
                    compactLayout={compactLayout}
                    trucchiGameCompleted={trucchiGameCompleted}
                    showTrucchiCompletionEffect={showTrucchiCompletionEffect}
                    showTrucchiTouchGuidance={showTrucchiTouchGuidance}
                    showTrucchiAvoidGuidance={showTrucchiAvoidGuidance}
                    onConsumeTouchGuidance={() => consumeGuidance('trucchiTouch')}
                    onConsumeAvoidGuidance={() => consumeGuidance('trucchiAvoid')}
                    onAnnounce={announceWithFallback}
                    onSpeakOperation={() => speakOperationOnly(world.id, trucchiSelectedFactor)}
                    setTrucchiGameCompleted={setTrucchiGameCompleted}
                    setShowTrucchiCompletionEffect={setShowTrucchiCompletionEffect}
                    setTrucchiCompleted={setTrucchiCompleted}
                  />
                )}
              </div>
            </div>

            <div className={`sticky bottom-0 z-20 flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-xs ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full">
                {trucchiFlowStage === 'game' ? (
                  <ActionGrid columns={2}>
                    <button
                      onClick={() => {
                        sound.playClick();
                        cancelTrucchiExercise();
                      }}
                      className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        if (!trucchiGameCompleted) return;
                        completeTrucchiExercise();
                      }}
                      disabled={!trucchiGameCompleted}
                      className={`w-full py-3 rounded-2xl font-bold text-sm shadow-md transition-all motion-safe:animate-pulse ${
                        trucchiGameCompleted
                          ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      id="trick-done-btn"
                    >
                      Continua
                    </button>
                  </ActionGrid>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        cancelTrucchiExercise();
                      }}
                      className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                    >
                      Torna alle combinazioni
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setTrucchiFlowStage('game');
                      }}
                      className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
                    >
                      Continua
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PRATICO (QUIZ MODE with ADAPTIVE assistance) */}
        {activeStep === 'pratico' && currentPraticoQuestion && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <PraticoQuizCard
                currentQuestion={currentPraticoQuestion}
                quizOptions={quizOptions}
                quizCorrectStreak={quizCorrectStreak}
                targetPraticoStreak={targetPraticoStreak}
                quizStreakJustReset={quizStreakJustReset}
                quizPressedFeedback={quizPressedFeedback}
                quizInteractionLocked={quizInteractionLocked}
                compactLayout={compactLayout}
                onSpeakOperation={() => speakOperationOnly(currentPraticoQuestion.a, currentPraticoQuestion.b)}
                onAnswerSelect={(opt) => {
                  if (quizInteractionLocked) return;
                  setQuizPressedFeedback({ opt, correct: opt === currentPraticoQuestion.a * currentPraticoQuestion.b });
                  handleQuizAnswer(opt);
                }}
              />
            </div>

            <div className={`sticky bottom-0 z-20 flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-xs ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full">
                <ActionGrid columns={2}>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      goBackFromWorldContent();
                    }}
                    className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full py-3 rounded-2xl bg-slate-100 text-slate-400 font-bold text-sm shadow-md cursor-not-allowed"
                  >
                    Continua
                  </button>
                </ActionGrid>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: SFIDA START SCREEN */}
        {activeStep === 'sfida' && sfidaReady && !sfidaActive && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 sm:p-6 border border-indigo-100 shadow-xl space-y-5 flex flex-col items-center justify-center">
            <div className="text-center space-y-1.5 w-full">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl sm:text-4xl" aria-hidden="true">⚡</span>
                <h2 className="text-2xl font-black text-indigo-950">SFIDA VELOCISSIMA</h2>
              </div>
              <p className="text-sm text-slate-600">Risolvi il maggior numero di operazioni prima che il tempo finisca!</p>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-left text-xs text-slate-700 font-sans space-y-1">
                <p className="font-black text-indigo-900">Ogni Sfida costa: {SFIDA_UNLOCK_COST} 🪙 moneta</p>
                <p>La Sfida non assegna monete: le monete si vincono nel Pratico.</p>
                <p>Se superi la soglia, vinci sempre <b>{SFIDA_FIXED_DROPS_REWARD} 💧</b> Gocce di Luce.</p>
              </div>
            </div>

            <div className="relative w-full">
              {showSfidaStartGuidance && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} placement="center" />
                </div>
              )}
              <button
                onClick={handleSfidaStartClick}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center py-4 gap-0.5 relative"
                id="sfida-start-btn"
              >
                <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">30 secondi</span>
                <span className="text-xl sm:text-2xl font-black">
                  {sfidaResult ? `▶ GIOCA ANCORA (${SFIDA_UNLOCK_COST} 🪙)` : `▶ INIZIA SFIDA (${SFIDA_UNLOCK_COST} 🪙)`}
                </span>
              </button>
            </div>

            {/* Record tabellina (visibile sempre quando non c'è un risultato recente) */}
            {!sfidaResult && worldProg.highScore > 0 && (
              <p className="text-xs text-slate-400 text-center font-sans">
                🏅 Il tuo record: <span className="font-black text-slate-600">{worldProg.highScore}</span> risposte esatte
              </p>
            )}

          </div>
        )}

        {/* STEP 6: SFIDA (Timed challenge) */}
        {activeStep === 'sfida' && sfidaActive && sfidaQuestion && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <SfidaQuizCard
                sfidaQuestion={sfidaQuestion}
                sfidaOptions={sfidaOptions}
                sfidaTimer={sfidaTimer}
                sfidaScore={sfidaScore}
                sfidaPressedFeedback={sfidaPressedFeedback}
                sfidaInteractionLocked={sfidaInteractionLocked}
                compactLayout={compactLayout}
                onSpeakOperation={() => speakOperationOnly(sfidaQuestion.a, sfidaQuestion.b)}
                onAnswerSelect={(opt) => {
                  if (sfidaInteractionLocked) return;
                  setSfidaPressedFeedback({ opt, correct: opt === sfidaQuestion.a * sfidaQuestion.b });
                  handleSfidaAnswer(opt);
                }}
              />
            </div>

            <div className={`sticky bottom-0 z-20 flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-xs ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full">
                <ActionGrid columns={2}>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      goBackFromWorldContent();
                    }}
                    className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full py-3 rounded-2xl bg-slate-100 text-slate-400 font-bold text-sm shadow-md cursor-not-allowed"
                  >
                    Continua
                  </button>
                </ActionGrid>
              </div>
            </div>

          </div>
        )}

        {/* Reward Popup */}
        {showRewardPopup && (
          <RewardPopup
            isOpen={!!showRewardPopup}
            stepName={showRewardPopup.step}
            coins={showRewardPopup.coins}
            drops={showRewardPopup.drops}
            profile={profile}
            onClose={() => setShowRewardPopup(null)}
          />
        )}
      </div>

      {showWorldFooterBack && (
        <div className={`flex-shrink-0 border-t border-white/20 ${compactLayout ? 'p-3' : 'p-4 md:p-6'} bg-gradient-to-t from-white/10 to-transparent`}>
          <div className="max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                if (shouldShowWorldFooterContinue) {
                  setActiveStep('intro');
                  return;
                }
                if (shouldShowWorldFooterCompletedContinue) {
                  goBackFromWorldContent();
                  return;
                }
                goBackFromWorldContent();
              }}
              className={`w-full py-3 rounded-2xl font-bold text-sm shadow-md cursor-pointer transition-colors ${
                shouldShowWorldFooterAnyContinue
                  ? 'bg-amber-500 hover:bg-amber-600 text-white motion-safe:animate-pulse'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
              id={shouldShowWorldFooterAnyContinue ? 'world-continue-btn' : 'world-back-btn'}
            >
              {shouldShowWorldFooterAnyContinue ? 'Continua' : 'Indietro'}
            </button>
          </div>
        </div>
      )}

      <p aria-live="assertive" aria-atomic="true" className="sr-only">{liveAnnouncement}</p>
      {visibleAnnouncement && (
        <div className="pointer-events-none fixed left-1/2 top-3 z-[80] w-[min(92vw,30rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-white/95 px-4 py-2 text-center text-sm font-black text-emerald-900 shadow-lg">
          {visibleAnnouncement}
        </div>
      )}
        </React.Fragment>
      )}

      {errorFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pratico-error-title"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-3xl">
              <AlertCircle className="h-7 w-7 text-rose-600" aria-hidden="true" />
            </div>
            <h3 id="pratico-error-title" className="mb-2 text-base font-black text-rose-950">
              Oh no... ripartiamo da 0
            </h3>
            <p className="mb-4 text-sm font-bold text-slate-700">
              Hai scelto <span className="font-mono text-rose-700">{errorFeedback.userAnswer}</span>, ma la risposta giusta era <span className="font-mono text-emerald-700">{errorFeedback.correctAnswer}</span>.
            </p>
            <p className="mb-5 text-xs text-slate-500">
              L'operazione tornera' piu' avanti per allenarti ancora.
            </p>
            <button
              type="button"
              onClick={closeErrorFeedback}
              className="w-full rounded-xl bg-rose-600 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-rose-700 cursor-pointer motion-safe:animate-pulse"
            >
              Continua
            </button>
          </motion.div>
        </div>
      )}

      {motivationPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="step-motivation-title"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-3xl">
              <Award className="h-7 w-7 text-emerald-600" aria-hidden="true" />
            </div>
            <h3 id="step-motivation-title" className="mb-2 text-base font-black text-emerald-900">
              {getGenderedText(playerGender, 'Bravissimo!', 'Bravissima!')}
            </h3>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Hai completato 10/10 in <span className="text-emerald-700">{stepMotivationLabels[motivationPopup.stepName]}</span>.
            </p>
            <p className="mb-5 text-sm text-slate-600">
              {motivationPopup.message}
            </p>
            {motivationPopup.unlockedStepLabel && (
              <div className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">Nuovo passo sbloccato</p>
                <div className="mt-2 flex items-center gap-2.5">
                  <span className="text-2xl">{motivationPopup.unlockedStepId ? STEP_LABELS[motivationPopup.unlockedStepId as keyof typeof STEP_LABELS].icon : '✨'}</span>
                  <p className="text-sm font-black text-indigo-950">{motivationPopup.unlockedStepLabel}</p>
                </div>
                <p className="mt-2 text-xs text-indigo-800">Lo trovi ora nel Sentiero del Regno.</p>
              </div>
            )}
            <button
              type="button"
              onClick={closeMotivationPopup}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 cursor-pointer motion-safe:animate-pulse"
            >
              {motivationPopup.unlockedStepId ? 'Vai al Sentiero' : 'Continua'}
            </button>
          </motion.div>
        </div>
      )}

      {showPraticoCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pratico-congrats-title"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-3xl">
              <Award className="h-7 w-7 text-emerald-600" aria-hidden="true" />
            </div>
            <h3 id="pratico-congrats-title" className="mb-2 text-base font-black text-emerald-900">
              Complimenti!
            </h3>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Hai raggiunto l'obiettivo: <span className="font-mono text-emerald-700">{praticoCongratsTarget ?? targetPraticoStreak} consecutive</span>.
            </p>
            <div role="list" className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2.5">
              <button
                type="button"
                role="listitem"
                onClick={handleMoneteBadgeClick}
                disabled={!canGoToSfidaFromCoins}
                aria-disabled={!canGoToSfidaFromCoins}
                className={`rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center shadow-sm transition-all ${
                  !canGoToSfidaFromCoins
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 opacity-70'
                    : shouldHighlightSfidaCta
                      ? 'cursor-pointer border-amber-500 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 text-amber-950 font-black animate-monument-glow ring-2 ring-amber-400'
                      : 'cursor-pointer hover:border-amber-300 hover:bg-amber-100/70'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Monete vinte</p>
                <p className="text-lg font-black text-amber-800">🪙 +1</p>
                <p className={`text-[11px] font-black ${
                  !canGoToSfidaFromCoins
                    ? 'text-slate-500'
                    : shouldHighlightSfidaCta
                      ? 'text-amber-950 animate-badge-blink'
                      : 'text-amber-900'
                }`}>
                  {!canGoToSfidaFromCoins ? '🔒 Sfida bloccata' : shouldHighlightSfidaCta ? '✨ Vai alla Sfida! ⚔️' : 'Vai alla Sfida'}
                </p>
              </button>
              <div
                role="listitem"
                className={`rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-center shadow-sm transition-all ${
                  hasErectableBlockedMonuments
                    ? 'motion-safe:animate-pulse'
                    : ''
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Gocce vinte</p>
                <p className="text-lg font-black text-sky-800">💧 +0</p>
                <p className="text-[11px] font-black text-sky-900">Le gocce arrivano dalla Sfida</p>
              </div>
            </div>
            <p className="mb-1 text-xs text-slate-600">
              🪙 Con le monete sblocchi outfit e accessori nel Sarto del Regno.
            </p>
            <p className="mb-3 text-xs text-slate-600">
              💧 Con le gocce scopri gli indizi del Regno.
            </p>
            <p className="mb-5 text-xs text-slate-500">
              Prossimo obiettivo: <span className="font-mono text-emerald-700">{(praticoCongratsTarget ?? targetPraticoStreak) + 2} consecutive</span>.
            </p>
            <button
              type="button"
              onClick={closePraticoCongrats}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 cursor-pointer motion-safe:animate-pulse"
            >
              Continua
            </button>
          </motion.div>
        </div>
      )}

      {showSfidaFromCoinsConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sfida-confirm-title"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-3xl">
              🪙
            </div>
            <h3 id="sfida-confirm-title" className="mb-5 text-base font-black text-amber-900">
              Vai alla Sfida?
            </h3>
            <p className="mb-5 text-sm text-slate-700">
              Uscirai dal Pratico e passerai alla Sfida del Regno.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={cancelSfidaFromCoinsConfirm}
                className="w-full rounded-xl bg-slate-200 py-2.5 text-sm font-black text-slate-800 shadow-sm transition-colors hover:bg-slate-300 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmSfidaFromCoins}
                className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-amber-700 cursor-pointer"
              >
                Vai alla Sfida
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showSfidaMonumentsPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-sky-200 bg-white p-6 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sfida-monuments-prompt-title"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-3xl">
              🧭
            </div>
            <h3 id="sfida-monuments-prompt-title" className="mb-2 text-base font-black text-sky-900">
              Indizi sbloccabili disponibili
            </h3>
            <p className="mb-5 text-sm text-slate-700">
              Hai vinto {SFIDA_FIXED_DROPS_REWARD} 💧 e ora puoi sbloccare {unlockableMonumentsCount} indizi. Vuoi aprire la schermata indizi?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={cancelSfidaMonumentsPrompt}
                className="w-full rounded-xl bg-slate-200 py-2.5 text-sm font-black text-slate-800 shadow-sm transition-colors hover:bg-slate-300 cursor-pointer"
              >
                Dopo
              </button>
              <button
                type="button"
                onClick={confirmSfidaMonumentsPrompt}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-sky-700 cursor-pointer"
              >
                Apri indizi
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showSfidaResultPopup && sfidaResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-3xl border-2 p-6 text-center shadow-2xl ${
              sfidaResult.passedSfida
                ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 via-teal-50 to-amber-50'
                : 'border-rose-200 bg-rose-50'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sfida-result-title"
          >
            <div className="mb-1 text-3xl" aria-hidden="true">
              {sfidaResult.passedSfida ? '🏆' : '⚡'}
            </div>
            <h3
              id="sfida-result-title"
              className={`mb-1 text-sm font-black uppercase tracking-wide ${
                sfidaResult.passedSfida
                  ? 'text-emerald-800' : 'text-rose-700'
              }`}
            >
              {sfidaResult.passedSfida
                ? sfidaResult.didCompleteWorldNow
                  ? '🎉 SFIDA SUPERATA! REGNO COMPLETATO!'
                  : '🎉 SFIDA SUPERATA!'
                : '⚡ OBIETTIVO NON RAGGIUNTO'}
            </h3>
            <p className="text-4xl font-black font-mono text-slate-900">{sfidaResult.correctAnswers}</p>
            <p className="mt-0.5 text-xs text-slate-500">risposte esatte in 30 secondi</p>

            {sfidaResult.passedSfida ? (
              <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-100/90 p-2 text-xs font-bold text-emerald-900">
                {sfidaResult.didCompleteWorldNow
                  ? <>🎆 Hai completato tutte le tabelline di questo Regno! Hai guadagnato +{sfidaResult.dropsEarned} 💧.</>
                  : <>✅ Sfida superata! Hai guadagnato +{sfidaResult.dropsEarned} 💧 Gocce di Luce.</>}
              </div>
            ) : (
              <div className="mt-2.5 space-y-2.5">
                <div className="flex justify-center">
                  <motion.span
                    initial={{ scale: 0.96, opacity: 0.9 }}
                    animate={prefersReducedMotion ? { scale: 1, opacity: 1 } : { scale: [1, 1.03, 1], opacity: [0.95, 1, 0.95] }}
                    transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-900"
                  >
                    💪 Quasi! Ci sei vicino
                  </motion.span>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-100/90 p-2 text-xs font-medium leading-relaxed text-rose-900">
                  Hai guadagnato <b>+{sfidaResult.dropsEarned} 💧</b>. Per superare lo step Sfida e sbloccare il prossimo Regno sul Sentiero servono <b>almeno 10 risposte corrette</b>. Ti mancavano {Math.max(1, SFIDA_DROPS_LOW_THRESHOLD - sfidaResult.correctAnswers)} risposte!
                </div>
              </div>
            )}

            {sfidaResult.isNewRecord && (
              <p className="mt-2 text-xs font-black text-amber-700">🏅 NUOVO RECORD PERSONALE!</p>
            )}

            <button
              type="button"
              onClick={closeSfidaResultPopup}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-black text-white shadow-md transition-colors cursor-pointer motion-safe:animate-pulse ${
                sfidaResult.passedSfida ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Continua
            </button>
          </motion.div>
        </div>
      )}

      {newlyUnlockedWorldId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border-2 border-emerald-300 bg-white p-6 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kingdom-unlocked-title"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-3xl" aria-hidden="true">
              🔓
            </div>
            <h3 id="kingdom-unlocked-title" className="mb-2 text-base font-black text-emerald-900">
              Nuovo Regno sbloccato!
            </h3>
            <p className="mb-5 text-sm text-slate-700">
              Hai completato il regno corrente. Ora puoi entrare nella tabellina del <b>{newlyUnlockedWorldId}</b>.
            </p>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setNewlyUnlockedWorldId(null);
              }}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 cursor-pointer"
            >
              Continua
            </button>
          </motion.div>
        </div>
      )}

      {/* Fuochi d'artificio: overlay celebrativo per 10/10, record e completamento regno */}
      {showFireworks && (
        <FireworksOverlay onDone={() => setShowFireworks(false)} />
      )}

      {sfidaUnlockModalMode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-indigo-100 text-center relative font-sans"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sfida-unlock-title"
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-3xl shadow-sm">
              🪙
            </div>
            <h3 id="sfida-unlock-title" className="text-base font-black text-rose-950 mb-1">
              Monete insufficienti
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Ogni Sfida costa <b>{SFIDA_UNLOCK_COST} moneta</b>. Al momento ne hai <b>{worldCoins}</b>.
              <br />
              Vuoi andare in <b>Pratico</b> per guadagnare monete?
            </p>
            <ActionGrid columns={2}>
              <button
                type="button"
                onClick={stayOnSfidaFromInsufficientCoins}
                className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs shadow-md cursor-pointer transition-colors"
              >
                Resta qui
              </button>
              <button
                type="button"
                onClick={goToPraticoFromSfidaInsufficient}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
              >
                Vai a Pratico
              </button>
            </ActionGrid>
          </motion.div>
        </div>
      )}

      {/* Path Lock Feedback Modal */}
      {pathLockModalMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-indigo-100 text-center relative"
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl">
              🏛️
            </div>
            <h3 className="text-base font-black text-indigo-950 mb-2">Sentiero Bloccato</h3>
            <p className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">
              {pathLockModalMessage}
            </p>
            <button
              onClick={() => setPathLockModalMessage(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
            >
              Ho Capito! ✓
            </button>
          </motion.div>
        </div>
      )}

      {showMonumentUnlockList && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-indigo-100 text-center relative font-sans"
          >
        <div className="mb-1 flex items-center justify-center gap-2">
          <h3 className="text-base font-black text-indigo-950">Indizi da scoprire</h3>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-800">
            💧 {worldLightDrops}
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Tocca una card per aprire l'indizio e segnalarlo come trovato.
        </p>

            {blockedMonuments.length > 0 ? (
              <>
                <div role="list" className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1 text-left">
                  {blockedMonuments.map(monument => {
                    const canAfford = worldLightDrops >= monument.cost;
                    return (
                      <div
                        key={monument.id}
                        role="listitem"
                        className={`rounded-2xl border px-3.5 py-3 transition-all ${
                          canAfford
                            ? 'border-amber-500 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-50 animate-monument-glow shadow-md'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-slate-900">{monument.emoji} {monument.name}</p>
                            <p className="text-[11px] font-bold text-amber-900">{monument.description}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            canAfford
                              ? 'bg-amber-300 text-amber-950 border border-amber-400 animate-badge-blink shadow-2xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {canAfford ? '✨ Pronto!' : '🔒 Bloccato'}
                          </span>
                        </div>
                        <div className="mt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setShouldReturnToMonumentsListAfterModal(true);
                              setShowMonumentUnlockList(false);
                              setMonumentModal({
                                monument,
                                canAfford,
                                isErected: false,
                                justUnlocked: false,
                              });
                            }}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-black shadow-md transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-white animate-bounce ring-2 ring-amber-300'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            }`}
                          >
                            {canAfford ? '🔍 Apri indizio' : 'Dettagli'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {worldLightDrops <= 0 && worldCoins >= SFIDA_UNLOCK_COST && (
                  <p className="mt-3 text-xs text-indigo-800 text-left">
                    Suggerimento: al momento non hai gocce, ma hai almeno <b>{SFIDA_UNLOCK_COST} monete</b>. Puoi provare la <b>Sfida</b> per puntare a nuove ricompense.
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-left">
                <p className="text-xs font-bold text-indigo-900">Hai già scoperto tutti gli indizi di questo Regno. Ottimo lavoro! 🧭</p>
                {canSuggestSfidaFromMonuments ? (
                  <p className="mt-2 text-xs text-indigo-800">
                    Non hai gocce al momento, ma hai almeno <b>{SFIDA_UNLOCK_COST} monete</b>: puoi provare la <b>Sfida</b> per puntare a nuove ricompense.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-indigo-800">
                    Continua il Sentiero per completare gli indizi e chiudere il Regno.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                closeMonumentFlowAndMaybeReturnToPraticoCongrats();
              }}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
            >
              Chiudi
            </button>
          </motion.div>
        </div>
      )}

      {/* Indizio Unlock Confirmation / Insufficient Drops Modal */}
      {monumentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-indigo-100 text-center relative font-sans"
          >
            {monumentModal.isErected ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-sm">
                  {monumentModal.monument.emoji}
                </div>
                <h3 className="text-base font-black text-indigo-950 mb-1">
                  {monumentModal.monument.name}
                </h3>
                <span className="inline-block text-[10px] font-black text-amber-900 bg-amber-200 px-3 py-1 rounded-full mb-3">
                  🔍 INDIZIO TROVATO ✓
                </span>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {monumentModal.monument.description}
                </p>
                {worldProg.rebuiltMonuments.length >= world.monuments.length && (
                  <div className="mb-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold shadow-sm animate-bounce">
                    🎉 Hai trovato tutti i 3 indizi!
                    {WORLDS_DATA.find(w => w.id === world.id + 1) ? (
                      <div className="mt-1 text-emerald-700 font-extrabold">
                        ✨ Nuovo regno sbloccato: {WORLDS_DATA.find(w => w.id === world.id + 1)?.locationName || WORLDS_DATA.find(w => w.id === world.id + 1)?.name}!
                      </div>
                    ) : (
                      <div className="mt-1 text-emerald-700 font-extrabold">
                        🏆 Hai completato tutti gli indizi dell'ultimo regno!
                      </div>
                    )}
                  </div>
                )}
                {worldProg.rebuiltMonuments.length >= world.monuments.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      closeMonumentFlowAndMaybeReturnToPraticoCongrats();
                      const nextWorldId = Math.min(9, world.id + 1);
                      onBack(nextWorldId);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>Continua</span>
                    <span className="text-base">➔</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeMonumentFlowAndMaybeReturnToPraticoCongrats}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                  >
                    Chiudi
                  </button>
                )}
              </>
            ) : monumentModal.canAfford ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-sm">
                  {monumentModal.monument.emoji}
                </div>
                <h3 className="text-base font-black text-indigo-950 mb-1">
                  Aprire indizio: {monumentModal.monument.name}?
                </h3>
                <div className="inline-flex items-center gap-1 text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full mb-3">
                  🔍 Pronto da aprire
                </div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Questo indizio completa il sentiero narrativo del regno. Toccalo per segnarlo come trovato.
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={closeMonumentModalAndReturnToOrigin}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const didUnlockMonument = handleRebuildMonument(monumentModal.monument.id, monumentModal.monument.cost);
                      if (!didUnlockMonument) {
                        return;
                      }
                      setMonumentModal({
                        monument: monumentModal.monument,
                        canAfford: true,
                        isErected: true,
                        justUnlocked: true,
                      });
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                  >
                    🔍 Segna trovato
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-3xl shadow-sm">
                  💧
                </div>
                <h3 className="text-base font-black text-rose-950 mb-1">
                  Indizio Bloccato!
                </h3>
                <div className="inline-flex items-center gap-1 text-xs font-black text-rose-900 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full mb-3">
                  Costo indizio: 💧 {monumentModal.monument.cost} (Ne hai {worldLightDrops})
                </div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Per aprire <b>{monumentModal.monument.name}</b> ti mancano <b>{monumentModal.monument.cost - worldLightDrops} Gocce di Luce</b>.
                  <br /><br />
                  {sfidaDropsGuidanceMessage}
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={closeMonumentModalAndReturnToOrigin}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled={!canGoToSfidaFromCoins}
                    aria-disabled={!canGoToSfidaFromCoins}
                    onClick={() => {
                      setMonumentModal(null);
                      initializeSfida();
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-colors ${
                      canGoToSfidaFromCoins
                        ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                        : 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    ⚡ Vai alla Sfida
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
