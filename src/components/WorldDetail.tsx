/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WorldConfig, UserProfile, QuestionAttempt } from '../types';
import { sound } from './SoundManager';
import { Sparkles, HelpCircle, Check, AlertCircle, Award, Timer, Trophy, Compass, ShieldAlert, RotateCcw } from 'lucide-react';
import ComprendoBasketGame from './ComprendoBasketGame';
import StepRulesModal from './StepRulesModal';
import RewardPopup from './RewardPopup';
import NumericKeypad from './NumericKeypad';
import RewardsTutorial from './RewardsTutorial';
import CombinationCarousel from './CombinationCarousel';
import FireworksOverlay from './FireworksOverlay';
import CurrencyInfoModal from './CurrencyInfoModal';
import ActionGrid from './layout/ActionGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';
import { withTableIcon } from '../utils/tableLabels';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';
import { useVoice } from '../contexts/VoiceContext';

interface WorldDetailProps {
  world: WorldConfig;
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  onBack: () => void;
  compactLayout?: boolean;
  initialExercise?: string | null;
  devMode?: boolean;
}

// Helper function to shuffle an array randomly (Fisher-Yates)
const shuffleArray = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const toAscendingOptions = (values: number[]): number[] => [...values].sort((a, b) => a - b);
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

const takeRandom = (source: number[], count: number): number[] => {
  if (count <= 0) return [];
  return shuffleArray(source).slice(0, count);
};

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
const TRUCCHI_GHOST_START_FACTOR = 4;
const SFIDA_FEEDBACK_HOLD_MS = 380;
const SFIDA_UNLOCK_COST = 1;
const SFIDA_RECORD_THRESHOLD = 15;
const SFIDA_DROPS_LOW_THRESHOLD = 10;
const SFIDA_DROPS_MID_THRESHOLD = 14;
const SFIDA_DROPS_HIGH_THRESHOLD = 17;
const SFIDA_DROPS_LOW_REWARD = 15;
const SFIDA_DROPS_MID_REWARD = 30;
const SFIDA_DROPS_HIGH_REWARD = 45;
const COSTRUISCO_BALLOON_SPAWN_MIN_MS = 260;
const COSTRUISCO_BALLOON_SPAWN_MAX_MS = 650;
const COSTRUISCO_BALLOON_FLIGHT_MIN_MS = 4500;
const COSTRUISCO_BALLOON_FLIGHT_MAX_MS = 6500;
const COSTRUISCO_BALLOON_MAX_ACTIVE = 5;
const COSTRUISCO_BALLOON_EXIT_Y = -340;
const COSTRUISCO_CORRECT_FAIL_PROGRESS = 0.75;
const COSTRUISCO_BOMB_START_FACTOR = 4;
const COSTRUISCO_BOMB_PALETTE = {
  body: 'bg-gradient-to-b from-slate-600 to-slate-900 text-white border-slate-500 hover:from-slate-700 hover:to-black',
  knot: 'bg-slate-900',
  string: 'bg-slate-400',
} as const;
const DIFFICULTY_FACTOR_MIN = 1;
const DIFFICULTY_FACTOR_MAX = 10;
const COSTRUISCO_SPAWN_SCALE_MIN = 0.45;
const COSTRUISCO_FLIGHT_SCALE_MIN = 0.5;
const TRUCCHI_PREVIEW_SCALE_MIN = 0.48;
const SALTO_OBSTACLE_START_FACTOR = 4;
const SALTO_ANTAGONISTS = [
  { id: 'snake', label: 'serpente', emoji: '🐍' },
  { id: 'bat', label: 'pipistrello', emoji: '🦇' },
  { id: 'spider', label: 'ragno', emoji: '🕷️' },
  { id: 'scorpion', label: 'scorpione', emoji: '🦂' },
] as const;
const OPERATION_CARD_THEMES = [
  'bg-gradient-to-r from-[#3c358f] to-[#4d46b5]',
  'bg-gradient-to-r from-[#ff9d08] to-[#ffb11f]',
  'bg-gradient-to-r from-[#0ea5e9] to-[#22d3ee]',
  'bg-gradient-to-r from-[#c026d3] to-[#7c3aed]',
] as const;
const STEP_MOTIVATION_MESSAGES = [
  'Bravissimo! Stai andando alla grande!',
  'Che campione! Hai completato tutte le tabelline di questo passo!',
  'Fantastico lavoro! Continua cosi!',
  'Sei fortissimo! Hai fatto 10 su 10!',
  'Grandissimo! Hai conquistato questo passo!',
] as const;
const GAMEPLAY_AUDIO_MESSAGES = {
  saltoFall: 'Oh no, la ranocchia e caduta! Riproviamo.',
  saltoObstacleBlocked: 'Oh no! L antagonista ti ha fermato.',
  saltoObstacleSuccess: 'Salto perfetto!',
  costruiscoWrong: 'Non questo. Cerca il numero giusto.',
  costruiscoCorrect: 'Bravo, ma scoppia tutti gli altri palloncini.',
  costruiscoTooHigh: 'Oh no il palloncino e volato via.',
  costruiscoBomb: 'Trappola! Il numero era giusto ma era una bomba. Cerca il palloncino colorato!',
  quizWrong: 'Quasi. Riprova con calma.',
  sfidaWrong: 'Ops, risposta sbagliata.',
  trucchiWrong: 'Riprova. Prova un altro numero.',
  trucchiCollapse: 'Oh no, la piramide e caduta! Riproviamo.',
  trucchiGhost: 'Il fantasma ha fatto crollare la piramide! Riproviamo.',
  combinationLocked: 'Questa combinazione e ancora bloccata.',
  stepLocked: 'Questo passo e ancora bloccato.',
  sfidaLocked: 'La sfida finale non e ancora pronta.',
  notEnoughLightDrops: 'Non hai ancora abbastanza gocce di luce.',
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
type SaltoAntagonist = typeof SALTO_ANTAGONISTS[number];
type CostruiscoActiveBalloon = {
  id: number;
  value: number;
  lane: number;
  flightMs: number;
  palette: CostruiscoBalloonPalette;
  isCorrect: boolean;
  isTrap?: boolean;
};

export default function WorldDetail({ world, profile, updateProfile, onBack, compactLayout = false, initialExercise, devMode = false }: WorldDetailProps) {
  const { speak } = useVoice();
  const ALL_STEP_IDS = ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'];
  const ALL_FACTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const [activeStep, setActiveStep] = useState<string>(initialExercise || 'intro'); // intro, comprendo, salto, costruisco, trucchi, pratico, sfida
  const [showIntroModal, setShowIntroModal] = useState<boolean>(false);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(false);
  const [showStepRulesModal, setShowStepRulesModal] = useState<string | null>(null); // null o il nome dello step
  const [hasSeenStepRules, setHasSeenStepRules] = useState<Set<string>>(new Set()); // Track which steps have been seen
  const [hasReadRulesMandatory, setHasReadRulesMandatory] = useState<Set<string>>(new Set()); // Track mandatory rule reading
  const [showRewardPopup, setShowRewardPopup] = useState<{ step: string; coins: number; drops: number } | null>(null);
  const [motivationPopup, setMotivationPopup] = useState<{ stepName: 'comprendo' | 'salto' | 'costruisco' | 'trucchi'; message: string } | null>(null);
  const [currencyModalType, setCurrencyModalType] = useState<'drops' | 'coins' | null>(null);

  // View stack for modal-to-page conversion
  const [viewStack, setViewStack] = useState<string[]>([]); // Stack of views, e.g. ['rules-comprendo', 'intro']
  
  const currentView = viewStack.length > 0 ? viewStack[viewStack.length - 1] : null;
  const pushView = (view: string) => setViewStack([...viewStack, view]);
  const popView = () => setViewStack(viewStack.slice(0, -1));
  const replaceTopView = (view: string) => setViewStack(prev => prev.length > 0 ? [...prev.slice(0, -1), view] : [view]);
  const activePlayableStep = ALL_STEP_IDS.includes(activeStep) ? activeStep : 'comprendo';
  
  // States for sub-games
  const [stepScore, setStepScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  
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
  const [trucchiBrickValues, setTrucchiBrickValues] = useState<number[]>([]);
  const [trucchiRemovedBricks, setTrucchiRemovedBricks] = useState<Set<number>>(new Set());
  const [trucchiWrongChoices, setTrucchiWrongChoices] = useState<number>(0);
  const [trucchiPyramidCollapsed, setTrucchiPyramidCollapsed] = useState<boolean>(false);
  const [trucchiPreviewActive, setTrucchiPreviewActive] = useState<boolean>(false);
  const [trucchiRevealedBrickIndex, setTrucchiRevealedBrickIndex] = useState<number | null>(null);
  const [trucchiGhostActive, setTrucchiGhostActive] = useState<boolean>(false);
  
  // For the current game being played
  const [saltoIndex, setSaltoIndex] = useState<number>(0); // which multiple we are on (0 to 9)
  const saltoNumbers = Array.from({ length: 10 }).map((_, i) => world.id * (i + 1));
  const [saltoOptions, setSaltoOptions] = useState<number[]>([]);
  const [saltoCorrectClicks, setSaltoCorrectClicks] = useState<Set<number>>(new Set());
  const [isFrogSplashing, setIsFrogSplashing] = useState<boolean>(false);
  const [saltoEnemySteps, setSaltoEnemySteps] = useState<number[]>([]);
  const [saltoJumpedEnemySteps, setSaltoJumpedEnemySteps] = useState<Set<number>>(new Set());
  const [saltoAntagonistsByStep, setSaltoAntagonistsByStep] = useState<Record<number, SaltoAntagonist>>({});
  const [saltoFrogPosition, setSaltoFrogPosition] = useState<number>(0);
  const [saltoLeap, setSaltoLeap] = useState<{ from: number; to: number } | null>(null);

  // Costruisco (Step 3) state
  const [costruiscoProgress, setCostruiscoProgress] = useState<{ [key: number]: number | null }>({}); // factor -> product or null
  const [costruiscoBalloonPool, setCostruiscoBalloonPool] = useState<number[]>([]);
  const [costruiscoActiveBalloons, setCostruiscoActiveBalloons] = useState<CostruiscoActiveBalloon[]>([]);
  const [costruiscoPopBursts, setCostruiscoPopBursts] = useState<{ id: number; lane: number }[]>([]);
  const [costruiscoFailed, setCostruiscoFailed] = useState<boolean>(false);
  const [costruiscoFailReason, setCostruiscoFailReason] = useState<'wrong-tap' | 'correct-escaped' | null>(null);
  const [costruiscoWrongTappedValue, setCostruiscoWrongTappedValue] = useState<number | null>(null);
  const [completedMonuments, setCompletedMonuments] = useState<string[]>([]); // Track completed monuments
  const costruiscoBalloonTokenRef = useRef<number>(0);
  const costruiscoSpawnTimeoutRef = useRef<number | null>(null);
  const costruiscoBombTimeoutRef = useRef<number | null>(null);
  const costruiscoEscapeTimeoutsRef = useRef<Record<number, number>>({});
  const costruiscoActiveBalloonsRef = useRef<CostruiscoActiveBalloon[]>([]);
  const costruiscoBalloonPoolRef = useRef<number[]>([]);
  const costruiscoFailedRef = useRef<boolean>(false);
  const costruiscoGameCompletedRef = useRef<boolean>(false);
  const trucchiPreviewTimeoutRef = useRef<number | null>(null);
  const trucchiRevealTimeoutRef = useRef<number | null>(null);
  const trucchiCollapseTimeoutRef = useRef<number | null>(null);

  const speakMultiplicationSuccess = (a: number, b: number, result: number) => {
    return speak(buildMultiplicationResultSpeech(a, b, result));
  };

  const speakSaltoSuccess = (a: number, b: number, result: number) => {
    return speakMultiplicationSuccess(a, b, result);
  };

  const speakPraticoOperation = (a: number, b: number) => speak(`${a} per ${b}`);
  const stepMotivationLabels: Record<'comprendo' | 'salto' | 'costruisco' | 'trucchi', string> = {
    comprendo: 'Raccogli',
    salto: 'Salta',
    costruisco: 'Scoppia',
    trucchi: 'Trova',
  };

  const showStepMotivationPopup = (stepName: 'comprendo' | 'salto' | 'costruisco' | 'trucchi') => {
    const localStorageKey = `tabellandia-step-motivation-${world.id}-${stepName}`;
    if (localStorage.getItem(localStorageKey) === 'true') {
      return;
    }
    const message = STEP_MOTIVATION_MESSAGES[Math.floor(Math.random() * STEP_MOTIVATION_MESSAGES.length)];
    setMotivationPopup({ stepName, message });
    localStorage.setItem(localStorageKey, 'true');
    speak(message);
  };

  const getOperationCardTheme = (index: number) => OPERATION_CARD_THEMES[((index % OPERATION_CARD_THEMES.length) + OPERATION_CARD_THEMES.length) % OPERATION_CARD_THEMES.length];
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Trucchi (Step 4) state
  const [trucchiQuestionSolved, setTrucchiQuestionSolved] = useState<boolean>(false);
  const [trucchiAnswer, setTrucchiAnswer] = useState<string>("");

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
  } | null>(null);
  const [showMonumentUnlockList, setShowMonumentUnlockList] = useState<boolean>(false);
  const [shouldReturnToPraticoCongratsAfterMonuments, setShouldReturnToPraticoCongratsAfterMonuments] = useState<boolean>(false);
  const [shouldReturnToMonumentsListAfterModal, setShouldReturnToMonumentsListAfterModal] = useState<boolean>(false);
  const [showSfidaFromCoinsConfirm, setShowSfidaFromCoinsConfirm] = useState<boolean>(false);

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
    recordBonusApplied: boolean;
    didCompleteWorldNow: boolean;
  } | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const praticoAnnouncementTimeoutRef = useRef<number | null>(null);
  const sfidaAnnouncementTimeoutRef = useRef<number | null>(null);
  const sfidaFeedbackTimeoutRef = useRef<number | null>(null);
  const quizStreakResetTimeoutRef = useRef<number | null>(null);
  const quizInteractionLockedRef = useRef(false);
  const praticoCorrectRankTrackerRef = useRef<CorrectRankTracker>(createCorrectRankTracker());
  const sfidaCorrectRankTrackerRef = useRef<CorrectRankTracker>(createCorrectRankTracker());
  const lastPraticoAnnouncementKeyRef = useRef<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const currentPraticoQuestion = quizQuestions[currentQuizIdx] ?? null;
  const praticoOperationCardTheme = getOperationCardTheme(currentQuizIdx);
  const sfidaOperationCardTheme = getOperationCardTheme(sfidaQuestionVersion);
  const touchStartYRef = useRef<number | null>(null);
  const saltoStoneRef = useRef<HTMLDivElement | null>(null);
  const saltoContainerRef = useRef<HTMLDivElement | null>(null);
  const saltoFinishRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the stream stones so the frog stays centered in view as it moves
  useEffect(() => {
    if (activeStep === 'salto' && saltoFlowStage === 'game') {
      const timer = setTimeout(() => {
        if (saltoContainerRef.current) {
          const container = saltoContainerRef.current;
          let targetStone: HTMLElement | null = null;
          
          if (saltoGameCompleted && saltoFinishRef.current) {
            targetStone = saltoFinishRef.current;
          } else if (saltoStoneRef.current) {
            targetStone = saltoStoneRef.current;
          } else if (saltoFrogPosition === 0) {
            // If on Riva (index 0), scroll to start (0)
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
    }
  }, [saltoIndex, saltoFrogPosition, activeStep, saltoFlowStage, isFrogSplashing, saltoGameCompleted]);

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
    showIntroModal,
    showStepRulesModal,
  ]);

  // Initialize and generate options
  useEffect(() => {
    resetCostruisco();
    
    // Check if user has seen intro for this world
    const introKey = `intro-seen-${world.id}`;
    const hasSeen = localStorage.getItem(introKey) === 'true';
    setHasSeenIntro(hasSeen);
    
    // Show intro as full-screen page on first access
    if (!hasSeen && !initialExercise) {
      pushView(`guide-intro-${activePlayableStep}`);
      localStorage.setItem(introKey, 'true');
    }
  }, [world, initialExercise, activePlayableStep]);

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

  // Show rules modal when entering a new step - DISABLED for now, user can click info button
  useEffect(() => {
    // Rules modal is now only opened when user clicks the info button
    // if (activeStep !== 'intro' && !hasSeenStepRules.has(activeStep)) {
    //   setShowStepRulesModal(activeStep);
    //   setHasSeenStepRules(prev => new Set([...prev, activeStep]));
    // }
  }, [activeStep, hasSeenStepRules]);

  // Generate a fixed option pool for the whole Salto run.
  const generateSaltoOptions = (factor: number) => {
    const optionsSet = new Set<number>();
    const minOptionCount = Math.max(4, factor);

    for (let step = 1; step <= factor; step++) {
      optionsSet.add(world.id * step);
    }

    let attempts = 0;
    while (optionsSet.size < minOptionCount && attempts < 200) {
      const randomMultiplier = Math.floor(Math.random() * 14) + 1;
      optionsSet.add(world.id * randomMultiplier);
      attempts++;
    }

    let fallbackMultiplier = factor + 1;
    while (optionsSet.size < minOptionCount) {
      optionsSet.add(world.id * fallbackMultiplier);
      fallbackMultiplier++;
    }

    setSaltoOptions(shuffleArray(Array.from(optionsSet)));
  };

  const pickRandomSaltoAntagonist = (): SaltoAntagonist => {
    const index = Math.floor(Math.random() * SALTO_ANTAGONISTS.length);
    return SALTO_ANTAGONISTS[index];
  };

  const buildSaltoEnemyLayout = (factor: number): { steps: number[]; antagonistsByStep: Record<number, SaltoAntagonist> } => {
    if (factor < SALTO_OBSTACLE_START_FACTOR) {
      return { steps: [], antagonistsByStep: {} };
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

  useEffect(() => {
    if (
      activeStep === 'salto' &&
      saltoSelectedFactor !== null &&
      saltoFlowStage === 'game' &&
      !saltoGameCompleted &&
      saltoOptions.length === 0
    ) {
      generateSaltoOptions(saltoSelectedFactor);
    }
  }, [saltoSelectedFactor, activeStep, world.id, saltoFlowStage, saltoGameCompleted, saltoOptions.length]);

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
    clearCostruiscoFlightTimeout();
  }, [costruiscoSelectedFactor]);

  useEffect(() => {
    if (trucchiSelectedFactor === null) {
      setTrucchiFlowStage('objective');
    }
  }, [trucchiSelectedFactor]);

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
  };

  const getTrucchiGhostSpeedMs = (factor: number): number => {
    if (factor >= 10) return 1300;
    if (factor >= 8) return 1800;
    if (factor >= 6) return 2500;
    return 3500;
  };

  const generateTrucchiBrickValues = (worldId: number, factor: number) => {
    const correct = worldId * factor;
    return shuffleArray([
      correct,
      ...ALL_FACTORS.filter(candidate => candidate !== factor).map(candidate => worldId * candidate),
    ]);
  };

  const resetTrucchiRound = (factor: number | null = trucchiSelectedFactor) => {
    clearTrucchiRoundTimeouts();

    if (factor === null) {
      setTrucchiBrickValues([]);
      setTrucchiRemovedBricks(new Set());
      setTrucchiWrongChoices(0);
      setTrucchiPyramidCollapsed(false);
      setTrucchiPreviewActive(false);
      setTrucchiRevealedBrickIndex(null);
      setTrucchiGhostActive(false);
      return;
    }

    setTrucchiBrickValues(generateTrucchiBrickValues(world.id, factor));
    setTrucchiRemovedBricks(new Set());
    setTrucchiWrongChoices(0);
    setTrucchiPyramidCollapsed(false);
    setTrucchiPreviewActive(true);
    setTrucchiRevealedBrickIndex(null);
    setTrucchiQuestionSolved(false);
    setShowTrucchiCompletionEffect(false);
    setTrucchiGhostActive(false); // ghost activates after preview ends

    const previewDurationMs = scaleDurationByFactor(TRUCCHI_PREVIEW_MS, factor, TRUCCHI_PREVIEW_SCALE_MIN);
    trucchiPreviewTimeoutRef.current = window.setTimeout(() => {
      setTrucchiPreviewActive(false);
      trucchiPreviewTimeoutRef.current = null;
      if (factor >= TRUCCHI_GHOST_START_FACTOR) {
        setTrucchiGhostActive(true);
      }
    }, previewDurationMs);
  };

  useEffect(() => {
    resetTrucchiRound(trucchiSelectedFactor);
  }, [trucchiSelectedFactor, world.id]);

  // Helper to generate candidate balloon numbers pool (1 correct answer + many distractors)
  const generateCostruiscoBalloonPool = (worldId: number, factor: number): number[] => {
    const correct = worldId * factor;
    const distractors = new Set<number>();
    const targetDistractorsCount = 9;

    // Add close multiples and nearby numbers
    if (factor > 1) distractors.add(worldId * (factor - 1));
    distractors.add(worldId * (factor + 1));
    if (factor > 2) distractors.add(worldId * (factor - 2));
    distractors.add(worldId * (factor + 2));
    if (factor > 3) distractors.add(worldId * (factor - 3));
    distractors.add(worldId * (factor + 3));

    distractors.add(correct + 1);
    if (correct > 1) distractors.add(correct - 1);
    distractors.add(correct + 2);
    if (correct > 2) distractors.add(correct - 2);
    distractors.add(correct + 3);
    if (correct > 3) distractors.add(correct - 3);
    distractors.add(correct + worldId);
    if (correct - worldId > 0) distractors.add(correct - worldId);

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

  const getBombCountForFactor = (factor: number): number => {
    if (factor < COSTRUISCO_BOMB_START_FACTOR) return 0;
    if (factor >= 6) return 2;
    return 1;
  };

  const queueCostruiscoBombSpawn = (factor: number, bombsLeft: number) => {
    if (bombsLeft <= 0) return;
    if (costruiscoBombTimeoutRef.current !== null) return;
    const delayMs = randomInRange(2000, 4000);
    costruiscoBombTimeoutRef.current = window.setTimeout(() => {
      costruiscoBombTimeoutRef.current = null;
      if (costruiscoFailedRef.current || costruiscoGameCompletedRef.current) return;
      const bombId = ++costruiscoBalloonTokenRef.current;
      const flightMs = randomInRange(
        scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MIN_MS, factor, COSTRUISCO_FLIGHT_SCALE_MIN),
        scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MAX_MS, factor, COSTRUISCO_FLIGHT_SCALE_MIN),
      );
      const bomb: CostruiscoActiveBalloon = {
        id: bombId,
        value: world.id * factor,
        lane: randomInRange(8, 92),
        flightMs,
        palette: COSTRUISCO_BOMB_PALETTE,
        isCorrect: false,
        isTrap: true,
      };
      setCostruiscoActiveBalloons(prev => [...prev, bomb]);
      const escapeMs = Math.floor(flightMs * COSTRUISCO_CORRECT_FAIL_PROGRESS);
      costruiscoEscapeTimeoutsRef.current[bombId] = window.setTimeout(() => {
        delete costruiscoEscapeTimeoutsRef.current[bombId];
        setCostruiscoActiveBalloons(prev => prev.filter(b => b.id !== bombId));
      }, escapeMs);
      queueCostruiscoBombSpawn(factor, bombsLeft - 1);
    }, delayMs);
  };

  const clearSfidaFeedbackTimeout = () => {
    if (sfidaFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(sfidaFeedbackTimeoutRef.current);
      sfidaFeedbackTimeoutRef.current = null;
    }
  };

  const randomInRange = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const getFactorProgress = (factor: number) => {
    const clamped = Math.max(DIFFICULTY_FACTOR_MIN, Math.min(DIFFICULTY_FACTOR_MAX, factor));
    return (clamped - DIFFICULTY_FACTOR_MIN) / (DIFFICULTY_FACTOR_MAX - DIFFICULTY_FACTOR_MIN);
  };

  const scaleDurationByFactor = (baseMs: number, factor: number, minScale: number) => {
    const progress = getFactorProgress(factor);
    const scale = 1 - ((1 - minScale) * progress);
    return Math.max(140, Math.floor(baseMs * scale));
  };

  const queueCostruiscoSpawn = (factor: number) => {
    if (costruiscoSpawnTimeoutRef.current !== null) return;
    const spawnMinMs = scaleDurationByFactor(COSTRUISCO_BALLOON_SPAWN_MIN_MS, factor, COSTRUISCO_SPAWN_SCALE_MIN);
    const spawnMaxMs = scaleDurationByFactor(COSTRUISCO_BALLOON_SPAWN_MAX_MS, factor, COSTRUISCO_SPAWN_SCALE_MIN);
    const delayMs = randomInRange(spawnMinMs, spawnMaxMs);
    costruiscoSpawnTimeoutRef.current = window.setTimeout(() => {
      costruiscoSpawnTimeoutRef.current = null;

      if (costruiscoFailedRef.current || costruiscoGameCompletedRef.current) return;
      if (costruiscoBalloonPoolRef.current.length === 0) return;

      if (costruiscoActiveBalloonsRef.current.length >= COSTRUISCO_BALLOON_MAX_ACTIVE) {
        queueCostruiscoSpawn(factor);
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
          scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MIN_MS, factor, COSTRUISCO_FLIGHT_SCALE_MIN),
          scaleDurationByFactor(COSTRUISCO_BALLOON_FLIGHT_MAX_MS, factor, COSTRUISCO_FLIGHT_SCALE_MIN),
        ),
        palette: COSTRUISCO_BALLOON_PALETTES[Math.floor(Math.random() * COSTRUISCO_BALLOON_PALETTES.length)],
        isCorrect: nextVal === world.id * factor,
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
        queueCostruiscoSpawn(factor);
      }
    }, delayMs);
  };

  const startCostruiscoSingleBalloonGame = (factor?: number) => {
    const activeFactor = factor ?? costruiscoSelectedFactor ?? 1;
    clearCostruiscoFlightTimeout();
    setCostruiscoFlowStage('game');
    setCostruiscoGameCompleted(false);
    setCostruiscoFailed(false);
    setCostruiscoFailReason(null);
    setCostruiscoWrongTappedValue(null);
    setShowCostruiscoCompletionEffect(false);
    setCostruiscoPopBursts([]);
    setCostruiscoActiveBalloons([]);

    const pool = generateCostruiscoBalloonPool(world.id, activeFactor);
    costruiscoBalloonPoolRef.current = pool;
    setCostruiscoBalloonPool(pool);

    queueCostruiscoSpawn(activeFactor);
    queueCostruiscoBombSpawn(activeFactor, getBombCountForFactor(activeFactor));
  };

  const handleCostruiscoSingleBalloonTap = (balloon: CostruiscoActiveBalloon) => {
    if (costruiscoGameCompleted || costruiscoFailed) return;

    sound.playClick();
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

    // Bomb trap: immediate fail
    if (balloon.isTrap) {
      sound.playError();
      speak(GAMEPLAY_AUDIO_MESSAGES.costruiscoBomb);
      setCostruiscoFailReason('wrong-tap');
      setCostruiscoWrongTappedValue(null);
      setCostruiscoFailed(true);
      setCostruiscoGameCompleted(false);
      clearCostruiscoFlightTimeout();
      return;
    }

    const factor = costruiscoSelectedFactor || 1;
    const expected = world.id * factor;

    if (balloon.isCorrect) {
      clearCostruiscoFlightTimeout();
      sound.playSuccess();
      speakMultiplicationSuccess(world.id, factor, expected);
      setCostruiscoGameCompleted(true);
      setCostruiscoFailed(false);
      setShowCostruiscoCompletionEffect(true);
      return;
    }

    sound.playError();
    speak('Ops, numero sbagliato! Riprova da capo.');
    setCostruiscoFailReason('wrong-tap');
    setCostruiscoWrongTappedValue(balloon.value);
    setCostruiscoFailed(true);
    setCostruiscoGameCompleted(false);
    clearCostruiscoFlightTimeout();
  };

  const handleCostruiscoRetry = () => {
    sound.playClick();
    if (costruiscoSelectedFactor !== null) {
      startCostruiscoSingleBalloonGame(costruiscoSelectedFactor);
    }
  };

  // Initialize Costruisco balloons when a factor is selected or stage changes
  useEffect(() => {
    if (activeStep !== 'costruisco' || costruiscoSelectedFactor === null) {
      clearCostruiscoFlightTimeout();
      return;
    }
    if (costruiscoFlowStage === 'game') {
      if (!costruiscoGameCompleted && !costruiscoFailed && costruiscoActiveBalloons.length === 0 && costruiscoBalloonPool.length === 0) {
        startCostruiscoSingleBalloonGame(costruiscoSelectedFactor);
      }
      return;
    }
    clearCostruiscoFlightTimeout();
    setCostruiscoActiveBalloons([]);
    setCostruiscoBalloonPool([]);
    setCostruiscoPopBursts([]);
    setCostruiscoFailed(false);
    setCostruiscoFailReason(null);
    setCostruiscoWrongTappedValue(null);
    setCostruiscoGameCompleted(false);
  }, [costruiscoSelectedFactor, activeStep, world.id, costruiscoFlowStage, costruiscoActiveBalloons.length, costruiscoBalloonPool.length, costruiscoFailed, costruiscoGameCompleted]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTrucchiRoundTimeouts();
      clearCostruiscoFlightTimeout();
      clearSfidaFeedbackTimeout();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start Sfida when entering sfida step (for training mode)
  useEffect(() => {
    console.log('[Sfida Init] activeStep:', activeStep, 'sfidaActive:', sfidaActive);
    if (activeStep === 'sfida' && !sfidaActive) {
      console.log('[Sfida Init] Starting Sfida mode...');
      startSfidaMode();
    }
  }, [activeStep]);

  // Generate initial Sfida question when sfidaActive is set
  useEffect(() => {
    console.log('[Sfida Question] sfidaActive:', sfidaActive, 'sfidaQuestion:', sfidaQuestion);
    if (sfidaActive && !sfidaQuestion) {
      console.log('[Sfida Question] Generating question...');
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
    const emptyProgress: { [key: number]: null } = {};
    for (let i = 1; i <= 10; i++) {
      emptyProgress[i] = null;
    }
    setCostruiscoProgress(emptyProgress);
    clearCostruiscoFlightTimeout();
    setCostruiscoBalloonPool([]);
    setCostruiscoActiveBalloons([]);
    setCostruiscoPopBursts([]);
    setCostruiscoFailed(false);
    setCostruiscoFailReason(null);
    setCostruiscoWrongTappedValue(null);
    setCostruiscoGameCompleted(false);
    setShowCostruiscoCompletionEffect(false);
    setCostruiscoFlowStage('objective');
    setCompletedMonuments([]); // Reset monuments when restarting
  };

  const handleSaltoSelect = (val: number) => {
    const correct = world.id * (saltoIndex + 1);
    if (val === correct) {
      sound.playSuccess();
      speakSaltoSuccess(world.id, saltoIndex + 1, val);
      if (saltoIndex === 9) {
        // Mastered Salto!
        sound.playLevelUp();
        saveStepCompleted('salto');
        setActiveStep('intro');
        setSaltoIndex(0);
      } else {
        setSaltoIndex(prev => prev + 1);
      }
    } else {
      sound.playError();
      speak(GAMEPLAY_AUDIO_MESSAGES.saltoFall);
      // gentle screen wobble or hint
    }
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
    const startTime = Date.now(); // simplified response logging duration

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
      
      // Calculate XP and Light Drops if correct
      let nextXP = p.xp;
      let nextCoins = p.coins;
      let nextLightDrops = p.lightDrops;

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
        coins: nextCoins,
        lightDrops: nextLightDrops,
        level: nextLevel,
        history: nextHistory
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
  };

  const beginSfidaFromUnlockFlow = () => {
    if (profile.coins < SFIDA_UNLOCK_COST) {
      sound.playError();
      setSfidaUnlockModalMode('insufficient');
      return;
    }
    updateProfile(p => ({
      ...p,
      coins: p.coins - SFIDA_UNLOCK_COST,
    }));
    setSfidaUnlockModalMode(null);
    beginSfidaGame();
  };

  const handleSfidaStartClick = () => {
    if (profile.coins < SFIDA_UNLOCK_COST) {
      sound.playError();
      setSfidaUnlockModalMode('insufficient');
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
      setSfidaScore(prev => prev + 1);
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
    const passedSfida = score >= SFIDA_RECORD_THRESHOLD;
    const currentWorldProgress = profile.worldProgress[world.id];
    const currentCompletedSteps = [...(currentWorldProgress?.completedSteps || [])];
    const nextCompletedSteps = passedSfida && !currentCompletedSteps.includes('sfida')
      ? [...currentCompletedSteps, 'sfida']
      : currentCompletedSteps;
    const didCompleteWorldNow = !currentCompletedSteps.includes('sfida') && nextCompletedSteps.includes('sfida');

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

      let sfidaDropsEarned = 0;
      if (score >= SFIDA_DROPS_HIGH_THRESHOLD) {
        sfidaDropsEarned = SFIDA_DROPS_HIGH_REWARD;
      } else if (score >= SFIDA_DROPS_MID_THRESHOLD) {
        sfidaDropsEarned = SFIDA_DROPS_MID_REWARD;
      } else if (score >= SFIDA_DROPS_LOW_THRESHOLD) {
        sfidaDropsEarned = SFIDA_DROPS_LOW_REWARD;
      }
      const canApplyRecordBonus = score > previousMax && score >= SFIDA_RECORD_THRESHOLD && previousMax >= SFIDA_RECORD_THRESHOLD;
      if (canApplyRecordBonus && sfidaDropsEarned > 0) {
        sfidaDropsEarned *= 2;
      }
      const nextLightDrops = p.lightDrops + sfidaDropsEarned;
      const nextCoins = p.coins;

      let evolution = worldProg?.creatureEvolution || 'egg';
      if (completed.length >= 6) {
        evolution = 'adult';
      } else if (completed.length >= 3) {
        evolution = 'child';
      }

      return {
        ...p,
        coins: nextCoins,
        lightDrops: nextLightDrops,
        unlockedWorlds: nextUnlocked,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...worldProg,
            completedSteps: completed,
            highScore: nextMax,
            stars: Math.max(stars, worldProg?.stars || 0),
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
      dropsEarned: (() => {
        if (score >= SFIDA_DROPS_HIGH_THRESHOLD) {
          return isNewRecord ? SFIDA_DROPS_HIGH_REWARD * 2 : SFIDA_DROPS_HIGH_REWARD;
        }
        if (score >= SFIDA_DROPS_MID_THRESHOLD) {
          return isNewRecord ? SFIDA_DROPS_MID_REWARD * 2 : SFIDA_DROPS_MID_REWARD;
        }
        if (score >= SFIDA_DROPS_LOW_THRESHOLD) {
          return isNewRecord ? SFIDA_DROPS_LOW_REWARD * 2 : SFIDA_DROPS_LOW_REWARD;
        }
        return 0;
      })(),
      recordBonusApplied: isNewRecord,
      didCompleteWorldNow
    });
    setShowSfidaResultPopup(true);
    setSfidaReady(true);
  };

  // Helper to save completed sub-steps offline and evolve creature
  const saveStepCompleted = (stepName: string) => {
    // Rewards based on step
    const rewardMap: { [key: string]: { coins: number; drops: number } } = {
      comprendo: { coins: 0, drops: 0 },
      salto: { coins: 0, drops: 0 },
      costruisco: { coins: 0, drops: 0 },
      trucchi: { coins: 0, drops: 0 },
      pratico: { coins: 3, drops: 0 },
      sfida: { coins: 0, drops: 0 }
    };
    
    const reward = rewardMap[stepName] || { coins: 0, drops: 0 };

    updateProfile(p => {
      const worldProg = p.worldProgress[world.id] || {
        worldId: world.id,
        completedSteps: [],
        rebuiltMonuments: [],
        creatureEvolution: 'egg',
        highScore: 0,
        stars: 0
      };

      const completed = [...worldProg.completedSteps];
      if (!completed.includes(stepName)) {
        completed.push(stepName);
      }
      const currentPraticoCycles = worldProg.praticoCyclesCompleted
        ?? (worldProg.completedSteps.includes('pratico') ? 1 : 0);
      const nextPraticoCycles = stepName === 'pratico'
        ? currentPraticoCycles + 1
        : currentPraticoCycles;

      // XP and Coin rewards for world steps completed! (Gamification)
      let nextXP = p.xp + 50;
      let nextCoins = p.coins + reward.coins;
      let nextLightDrops = p.lightDrops + reward.drops;
      let nextLevel = p.level;
      if (nextXP >= nextLevel * 100) nextLevel += 1;

      // Evolve creature depending on step count
      let evolution = worldProg.creatureEvolution;
      if (completed.length >= 6) {
        evolution = 'adult';
      } else if (completed.length >= 3) {
        evolution = 'child';
      }

      // Note: Next world is NOT unlocked here. It requires passing Sfida (>14) and building all monuments!
      return {
        ...p,
        xp: nextXP,
        coins: nextCoins,
        lightDrops: nextLightDrops,
        level: nextLevel,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...worldProg,
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

  const handleRebuildMonument = (monId: string, cost: number) => {
    if (profile.lightDrops < cost) {
      sound.playError();
      speak(GAMEPLAY_AUDIO_MESSAGES.notEnoughLightDrops);
      return;
    }

    sound.playPowerUp();
    updateProfile(p => {
      const worldProg = p.worldProgress[world.id];
      const monuments = [...(worldProg?.rebuiltMonuments || [])];
      if (!monuments.includes(monId)) {
        monuments.push(monId);
      }

      return {
        ...p,
        lightDrops: p.lightDrops - cost,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...worldProg,
            rebuiltMonuments: monuments
          }
        }
      };
    });
  };

  const closeMotivationPopup = () => {
    sound.playClick();
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
  const worldProg = devMode
    ? { ...worldProgBase, completedSteps: [...ALL_STEP_IDS] }
    : worldProgBase;
  const blockedMonuments = world.monuments.filter(monument => !worldProg.rebuiltMonuments.includes(monument.id));
  const canSuggestSfidaFromMonuments = blockedMonuments.length === 0 && profile.lightDrops <= 0 && profile.coins >= SFIDA_UNLOCK_COST;
  const allFactorsSet = new Set<number>(ALL_FACTORS);

  const getEffectiveCompletedFactors = (stepKey: 'comprendo' | 'salto' | 'costruisco' | 'trucchi', stateSet: Set<number>) => {
    if (devMode) return allFactorsSet;
    const saved = worldProg.completedFactors?.[stepKey];
    if (saved && Array.isArray(saved)) {
      return new Set([...saved, ...stateSet]);
    }
    if (worldProg.completedSteps.includes(stepKey)) return allFactorsSet;
    return new Set([...stateSet]);
  };

  const effectiveComprendoCompleted = getEffectiveCompletedFactors('comprendo', comprendoCompleted);
  const effectiveSaltoCompleted = getEffectiveCompletedFactors('salto', saltoCompleted);
  const effectiveCostruiscoCompleted = getEffectiveCompletedFactors('costruisco', costruiscoCompleted);
  const effectiveTrucchiCompleted = getEffectiveCompletedFactors('trucchi', trucchiCompleted);

  const isComprendoDone = devMode || effectiveComprendoCompleted.size >= 10;
  const isSaltoDone = devMode || effectiveSaltoCompleted.size >= 10;
  const isCostruiscoDone = devMode || effectiveCostruiscoCompleted.size >= 10;
  const isTrucchiDone = devMode || effectiveTrucchiCompleted.size >= 10;
  const isPraticoDone = devMode || worldProg.completedSteps.includes('pratico');
  const praticoCyclesCompleted = worldProg.praticoCyclesCompleted
    ?? (worldProg.completedSteps.includes('pratico') ? 1 : 0);
  const targetPraticoStreak = 10 + praticoCyclesCompleted * 2;
  const isSfidaDone = devMode || worldProg.completedSteps.includes('sfida');
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
  const hasErectableBlockedMonuments = blockedMonuments.some(monument => profile.lightDrops >= monument.cost);
  const canGoToSfidaFromCoins = profile.coins >= SFIDA_UNLOCK_COST && areSfidaPrerequisitesDone;

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
  const isSfidaPathLocked = !devMode && !areSfidaPrerequisitesDone;
  const shouldHighlightSfidaCta = canGoToSfidaFromCoins && !isSfidaDone && !isSfidaPathLocked && nextStepToPlay === 'sfida';
  const previousView = viewStack.length > 1 ? viewStack[viewStack.length - 2] : null;
  const isGuideStoryView = currentView === 'world-story';
  const isGuideIntroView = currentView === 'intro' || currentView?.startsWith('guide-intro-');
  const isGuideHelpView = currentView?.startsWith('guide-help-') || currentView?.startsWith('rules-');
  const isGuideView = isGuideIntroView || isGuideHelpView || isGuideStoryView;
  const guideStep = currentView === 'intro'
    ? activePlayableStep
    : (currentView?.startsWith('guide-intro-')
        ? currentView.replace('guide-intro-', '')
        : (currentView?.startsWith('guide-help-')
            ? currentView.replace('guide-help-', '')
            : (currentView?.startsWith('rules-') ? currentView.replace('rules-', '') : activePlayableStep)));
  const isInPlayableStepView = ALL_STEP_IDS.includes(activeStep);
  const guideIntroCopy: Record<string, { title: string; lead: string; bullets: string[] }> = {
    comprendo: {
      title: 'Raccogli: partiamo dal significato',
      lead: 'Qui scopri che la moltiplicazione nasce da gruppi uguali di mele.',
      bullets: [
        'Osserva i cesti e le mele che volano.',
        'Conta e collega il risultato all operazione.'
      ]
    },
    salto: {
      title: 'Salta: conta a ritmo',
      lead: 'In questo passo alleni il conteggio per salti con una sequenza chiara.',
      bullets: [
        'Segui il ritmo della tabellina.',
        'Usa la sequenza per trovare il risultato.'
      ]
    },
    costruisco: {
      title: 'Scoppia: mira al numero giusto',
      lead: 'Scoppia il palloncino che porta il risultato corretto prima che voli via.',
      bullets: [
        'Cerca il palloncino giusto tra quelli in volo.',
        'Completa lo schema un passaggio alla volta.'
      ]
    },
    trucchi: {
      title: 'Trova: strategia veloce',
      lead: 'Impari a trovare il mattone giusto usando scorciatoie e pattern mnemonici.',
      bullets: [
        'Memorizza una regola per volta.',
        'Prima precisione, poi velocita.'
      ]
    },
    pratico: {
      title: 'Pratico: avventura di concentrazione',
      lead: 'Metti insieme tutto quello che hai imparato in una serie continua.',
      bullets: [
        'Rispondi a una domanda alla volta.',
        'Punta a 10 risposte corrette consecutive.'
      ]
    },
    sfida: {
      title: 'Sfida: cronometro acceso',
      lead: 'Hai poco tempo per fare piu punti possibili e migliorare il record.',
      bullets: [
        'Rispondi veloce ma con attenzione.',
        'Da 15 in su puoi puntare al record.'
      ]
    }
  };
  const currentGuideIntro = guideIntroCopy[guideStep] || guideIntroCopy[activePlayableStep] || guideIntroCopy.comprendo;
  const showWorldFooterBack = !(
    (activeStep === 'comprendo' && comprendoSelectedFactor !== null) ||
    (activeStep === 'salto' && saltoSelectedFactor !== null) ||
    (activeStep === 'costruisco' && costruiscoSelectedFactor !== null) ||
    (activeStep === 'trucchi' && trucchiSelectedFactor !== null)
  );
  const shouldShowWorldFooterContinue =
    (activeStep === 'comprendo' && comprendoSelectedFactor === null && effectiveComprendoCompleted.size >= 10) ||
    (activeStep === 'salto' && saltoSelectedFactor === null && effectiveSaltoCompleted.size >= 10) ||
    (activeStep === 'costruisco' && costruiscoSelectedFactor === null && effectiveCostruiscoCompleted.size >= 10) ||
    (activeStep === 'trucchi' && trucchiSelectedFactor === null && effectiveTrucchiCompleted.size >= 10);
  const isKingdomCompleted = allMonumentsErected && isComprendoDone && isSaltoDone && isCostruiscoDone && isTrucchiDone && isPraticoDone && isSfidaDone;
  const shouldShowWorldFooterCompletedContinue = activeStep === 'intro' && isKingdomCompleted;
  const shouldShowWorldFooterAnyContinue = shouldShowWorldFooterContinue || shouldShowWorldFooterCompletedContinue;

  const explainPraticoRewardAndPossibilities = () => {
    const sfidaPart = canGoToSfidaFromCoins
      ? 'Con le monete puoi andare alla Sfida.'
      : 'Con le monete potrai andare alla Sfida quando avrai monete sufficienti e prerequisiti completati.';
    const monumentPart = hasErectableBlockedMonuments
      ? 'Con le gocce puoi erigere monumenti adesso.'
      : 'Con le gocce erigerai monumenti quando saranno sufficienti ai costi.';
    const targetReached = praticoCongratsTarget ?? targetPraticoStreak;
    void speak(`Complimenti. Hai raggiunto l'obiettivo di ${targetReached} consecutive. ${sfidaPart} ${monumentPart}`);
  };

  const handleMoneteBadgeClick = () => {
    sound.playClick();
    if (canGoToSfidaFromCoins) {
      setShowSfidaFromCoinsConfirm(true);
      void speak('Vuoi andare alla Sfida adesso?');
      return;
    }

    const reason = profile.coins < SFIDA_UNLOCK_COST
      ? `Ti servono ancora ${SFIDA_UNLOCK_COST - profile.coins} monete per poter andare alla Sfida.`
      : 'Completa prima tutti i prerequisiti della Sfida nei passi precedenti.';
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

  const handleGocceBadgeClick = () => {
    sound.playClick();
    if (hasErectableBlockedMonuments) {
      setShowPraticoCongrats(false);
      setShouldReturnToPraticoCongratsAfterMonuments(true);
      setShowMonumentUnlockList(true);
      void speak('Ottimo. Hai gocce sufficienti per erigere monumenti.');
      return;
    }

    let reason = 'Non ci sono monumenti da erigere in questo momento.';
    if (blockedMonuments.length > 0) {
      const minCost = Math.min(...blockedMonuments.map(monument => monument.cost));
      const missing = Math.max(0, minCost - profile.lightDrops);
      reason = missing > 0
        ? `Ti mancano almeno ${missing} gocce per erigere il prossimo monumento.`
        : 'I monumenti sono presenti ma non ancora erigibili adesso.';
    }
    setPathLockModalMessage(`🏛️ Monumenti non ancora erigibili\n\n${reason}`);
    void speak(reason);
  };

  const handleHeaderGocceBadgeClick = () => {
    sound.playClick();
    if (hasErectableBlockedMonuments) {
      setShouldReturnToPraticoCongratsAfterMonuments(false);
      setShowMonumentUnlockList(true);
      void speak('Ottimo. Hai gocce sufficienti per erigere monumenti.');
      return;
    }

    let reason = 'Non ci sono monumenti da erigere in questo momento.';
    if (blockedMonuments.length > 0) {
      const minCost = Math.min(...blockedMonuments.map(monument => monument.cost));
      const missing = Math.max(0, minCost - profile.lightDrops);
      reason = missing > 0
        ? `Ti mancano almeno ${missing} gocce per erigere il prossimo monumento.`
        : 'I monumenti sono presenti ma non ancora erigibili adesso.';
    }
    setPathLockModalMessage(`🏛️ Monumenti non ancora erigibili\n\n${reason}`);
    void speak(reason);
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
      className={`w-full h-full grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(clamp(4.4rem,18vw,6.2rem),1fr))] ${compactLayout ? 'gap-1.5' : 'gap-2.5'}`}
    >
      {ALL_FACTORS.map(factor => {
        const isCompleted = completed.has(factor);
        const isUnlocked = devMode || factor === 1 || completed.has(factor - 1);
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
                speak(`${world.id} per ${factor}`);
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
                  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-slate-600 text-[10px] font-black shadow-xs"
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
    onHelp,
    theme,
  }: {
    stepKey: 'comprendo' | 'salto' | 'costruisco' | 'trucchi';
    badge: string;
    title: string;
    description: string;
    completed: Set<number>;
    onSelect: (factor: number) => void;
    onHelp: () => void;
    theme: StepSelectionTheme;
  }) => (
    <div className="max-w-4xl mx-auto w-full h-full min-h-0">
      <SurfaceCard padding="lg" className={`h-full min-h-0 shadow-lg border-2 ${theme.panel} flex flex-col`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={`text-xs font-bold px-3 py-1 rounded-full font-sans ${theme.badge}`}>
            {badge}
          </span>
          <button
            onClick={onHelp}
            className={`rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
              !hasReadRulesMandatory.has(stepKey) ? theme.helpPrimary : theme.helpSecondary
            }`}
            aria-label={`Apri aiuto per ${title}`}
          >
            <HelpCircle className={!hasReadRulesMandatory.has(stepKey) ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
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
    let didReachTenForFirstTime = false;

    updateProfile(p => {
      const worldProg = p.worldProgress[world.id] || {
        worldId: world.id,
        completedSteps: [],
        rebuiltMonuments: [],
        creatureEvolution: 'egg',
        highScore: 0,
        stars: 0
      };

      const existingFactors = worldProg.completedFactors?.[stepName] || [];
      const nextFactors = existingFactors.includes(factor) ? existingFactors : [...existingFactors, factor];
      didReachTenForFirstTime = existingFactors.length < 10 && nextFactors.length >= 10;
      const newCompletedFactors = {
        ...(worldProg.completedFactors || {}),
        [stepName]: nextFactors
      };

      let nextCompletedSteps = [...worldProg.completedSteps];
      if (nextFactors.length >= 10 && !nextCompletedSteps.includes(stepName)) {
        nextCompletedSteps.push(stepName);
      }

      let evolution = worldProg.creatureEvolution;
      if (nextCompletedSteps.length >= 6) {
        evolution = 'adult';
      } else if (nextCompletedSteps.length >= 3) {
        evolution = 'child';
      }

      const nextXP = p.xp + 15;
      const nextCoins = p.coins + 5;
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
            creatureEvolution: evolution
          }
        }
      };
    });

    if (didReachTenForFirstTime) {
      setShowFireworks(true);
      showStepMotivationPopup(stepName);
    }
  };

  const handleComprendoCompletionChange = (isCompleted: boolean) => {
    setComprendoGameCompleted(isCompleted);
    setShowComprendoCompletionEffect(isCompleted);
  };

  const cancelComprendoExercise = () => {
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
    setSaltoIndex(0);
    setSaltoOptions([]);
    setSaltoCorrectClicks(new Set());
    setSaltoGameCompleted(false);
    setShowSaltoCompletionEffect(false);
    setIsFrogSplashing(false);
    setSaltoEnemySteps([]);
    setSaltoJumpedEnemySteps(new Set());
    setSaltoAntagonistsByStep({});
    setSaltoFrogPosition(0);
    setSaltoLeap(null);
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
    clearCostruiscoFlightTimeout();
    setCostruiscoFlowStage('objective');
    setCostruiscoGameCompleted(false);
    setShowCostruiscoCompletionEffect(false);
    setCostruiscoBalloonPool([]);
    setCostruiscoActiveBalloons([]);
    setCostruiscoPopBursts([]);
    setCostruiscoFailed(false);
    setCostruiscoFailReason(null);
    setCostruiscoWrongTappedValue(null);
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
    clearTrucchiRoundTimeouts();
    setTrucchiFlowStage('objective');
    setTrucchiQuestionSolved(false);
    setShowTrucchiCompletionEffect(false);
    setTrucchiBrickValues([]);
    setTrucchiRemovedBricks(new Set());
    setTrucchiWrongChoices(0);
    setTrucchiPyramidCollapsed(false);
    setTrucchiPreviewActive(false);
    setTrucchiRevealedBrickIndex(null);
    setTrucchiGhostActive(false);
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
    } else if (costruiscoSelectedFactor !== null) {
      if (costruiscoFlowStage === 'game') {
        setCostruiscoFlowStage('objective');
      } else {
        cancelCostruiscoExercise();
      }
    } else if (trucchiSelectedFactor !== null) {
      if (trucchiFlowStage === 'game') {
        setTrucchiFlowStage('objective');
      } else {
        cancelTrucchiExercise();
      }
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
    if (isGuideHelpView) {
      if (previousView?.startsWith('guide-intro-') || previousView === 'intro') {
        replaceTopView(`guide-intro-${guideStep}`);
      } else {
        popView();
      }
      return;
    }
    if (isGuideStoryView) {
      popView();
      return;
    }
    if (isGuideIntroView) {
      popView();
      return;
    }
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
    (isGuideIntroView) ||
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
      (trucchiFlowStage === 'game' && trucchiQuestionSolved)
    ));
  const handleSwipeContinue = () => {
    if (!canSwipeRightContinue) return;
    sound.playClick();
    if (isGuideIntroView) {
      replaceTopView(`guide-help-${guideStep}`);
      return;
    }
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
        startCostruiscoSingleBalloonGame();
      } else if (costruiscoFlowStage === 'game' && costruiscoGameCompleted) {
        completeCostruiscoExercise();
      }
      return;
    }
    if (activeStep === 'trucchi' && trucchiSelectedFactor !== null) {
      if (trucchiFlowStage === 'objective') {
        setTrucchiFlowStage('game');
      } else if (trucchiFlowStage === 'game' && trucchiQuestionSolved) {
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
      {/* Show intro/help guide pages in viewStack */}
      {isGuideView && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
            <div className="max-w-2xl mx-auto w-full">
            {(isGuideIntroView || isGuideStoryView) && (
                <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 text-slate-900 shadow-xl">
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                    <p className="mt-1 inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-900 motion-safe:animate-pulse">
                      Work in progress
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-indigo-950">
                      {currentGuideIntro.title}
                    </h2>
                    <p className="mt-2 text-sm text-indigo-900">
                      {currentGuideIntro.lead}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Prima di iniziare
                    </p>
                    <div role="list" className="mt-2 grid grid-cols-1 gap-2">
                      {currentGuideIntro.bullets.map((item) => (
                        <div key={item} role="listitem" className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isGuideHelpView && (
                <StepRulesModal 
                  step={guideStep} 
                  world={world} 
                  onClose={() => {}} 
                  isMandatory={false}
                  isPage={true}
                />
              )}
            </div>
          </div>

          <div className={`flex-shrink-0 border-t border-white/20 ${compactLayout ? 'p-3' : 'p-4 md:p-6'} bg-gradient-to-t from-white/10 to-transparent`}>
            <div className="max-w-2xl mx-auto w-full">
              <button
                onClick={() => {
                  sound.playClick();
                  if (isGuideIntroView) {
                    replaceTopView(`guide-help-${guideStep}`);
                    return;
                  }
                  if (isGuideStoryView) {
                    popView();
                    return;
                  }

                  popView();
                  setHasReadRulesMandatory(prev => new Set([...prev, guideStep]));
                }}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
              >
                {isGuideIntroView ? 'Continua' : isGuideStoryView ? 'Chiudi' : 'Ho Capito! ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content - only show if no view is pushed */}
      {!currentView && (
        <>
          
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
                    <p className="text-xs text-slate-500 font-sans">Completa gli step, erigi tutti i monumenti e supera la Sfida per sbloccare il prossimo Regno!</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => pushView('world-story')}
                  className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center justify-center cursor-pointer font-bold text-sm shadow-2xs transition-colors"
                  title="Apri storia e filastrocca"
                >
                  i
                </button>
              </div>
              <div role="list" className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2.5">
                <button
                  type="button"
                  role="listitem"
                  onClick={handleMoneteBadgeClick}
                  className={`rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center shadow-sm transition-all ${
                    shouldHighlightSfidaCta
                      ? 'cursor-pointer border-amber-500 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 text-amber-950 font-black animate-monument-glow ring-2 ring-amber-400'
                      : 'cursor-pointer hover:border-amber-300 hover:bg-amber-100/70'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Monete</p>
                  <p className="text-lg font-black text-amber-800">🪙 {profile.coins}</p>
                  <p className={`text-[11px] font-black ${shouldHighlightSfidaCta ? 'text-amber-950 animate-badge-blink' : 'text-amber-900'}`}>
                    {shouldHighlightSfidaCta ? '✨ Vai alla Sfida! ⚔️' : 'Vai alla Sfida'}
                  </p>
                </button>
                <button
                  type="button"
                  role="listitem"
                  onClick={handleHeaderGocceBadgeClick}
                  className={`rounded-2xl border px-3 py-2 text-center shadow-sm transition-all ${
                    hasErectableBlockedMonuments
                      ? 'cursor-pointer border-amber-500 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 text-amber-950 font-black animate-monument-glow ring-2 ring-amber-400'
                      : 'cursor-pointer border-sky-200 bg-sky-50 hover:border-sky-300 hover:bg-sky-100/70'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Gocce</p>
                  <p className="text-lg font-black text-sky-800">💧 {profile.lightDrops}</p>
                  <p className={`text-[11px] font-black ${hasErectableBlockedMonuments ? 'text-amber-950 animate-badge-blink' : 'text-sky-900'}`}>
                    {hasErectableBlockedMonuments ? '✨ Sblocca Monumenti! 🏛️' : 'Erigi monumenti'}
                  </p>
                </button>
              </div>

              <div className="mt-3 rounded-2xl border border-indigo-100 bg-white/80 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider font-sans">
                    Monumenti del Regno ({rebuiltCount}/{world.monuments.length})
                  </h4>
                </div>
                <div role="list" className="flex gap-2 overflow-x-auto pb-1">
                  {world.monuments.map(monument => {
                    const isErected = devMode || worldProg.rebuiltMonuments.includes(monument.id);
                    const canAfford = profile.lightDrops >= monument.cost;

                    return (
                      <button
                        key={`compact-monument-${monument.id}`}
                        type="button"
                        role="listitem"
                        onClick={() => {
                          sound.playClick();
                          setShouldReturnToMonumentsListAfterModal(false);
                          setMonumentModal({ monument, canAfford, isErected });
                        }}
                        className={`w-[6.5rem] shrink-0 rounded-2xl border px-2 py-2 text-left shadow-sm transition-all cursor-pointer ${
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
                            {isErected ? '✓' : '🔒'}
                          </span>
                        </div>
                        <p className={`mt-0.5 text-xs font-black ${
                          isErected ? 'text-emerald-700' : canAfford ? 'text-amber-900 animate-badge-blink' : 'text-sky-800'
                        }`}>
                          💧 {monument.cost}
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
                  { id: 'pratico', title: '5. Pratico (Avventura)', desc: 'Sconfiggi la nebbia e raccogli monete per la Sfida.', icon: '🛡️', coins: 5, drops: 0, isFactorBased: false },
                ].map((step, idx) => {
                  const isDone = stepDoneMap[step.id] || false;
                  const prevStepId = idx > 0 ? ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico'][idx - 1] : null;
                  const prevStepDone = idx === 0 || (prevStepId ? (stepDoneMap[prevStepId] || false) : true);
                  const isLocked = !devMode && !prevStepDone;
                  const factorCount = stepFactorsCountMap[step.id] || 0;
                  const isNext = step.id === nextStepToPlay;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          sound.playError();
                          speak(GAMEPLAY_AUDIO_MESSAGES.stepLocked);
                          setPathLockModalMessage(`🔒 Step Bloccato!\n\nCompleta prima il passo precedente per accedere a ${step.title}.`);
                          return;
                        }
                        sound.playClick();
                        if (step.id === 'comprendo') setActiveStep('comprendo');
                        else if (step.id === 'salto') { setSaltoIndex(0); setActiveStep('salto'); }
                        else if (step.id === 'costruisco') { resetCostruisco(); setActiveStep('costruisco'); }
                        else if (step.id === 'trucchi') { setTrucchiQuestionSolved(false); setTrucchiAnswer(""); setActiveStep('trucchi'); }
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
                        {!isLocked && !isDone && step.id !== 'pratico' && (
                          <span className="text-[9px] font-semibold text-indigo-600">Avvia ➔</span>
                        )}
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
                    type="button"
                    onClick={() => {
                      if (isSfidaLocked) {
                        sound.playError();
                        speak(GAMEPLAY_AUDIO_MESSAGES.sfidaLocked);
                        setPathLockModalMessage(`🔒 Sfida Bloccata!\n\nCompleta prima tutti i passi didattici precedenti (1-5) sul Sentiero.`);
                        return;
                      }
                      sound.playClick();
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
                          {isSfidaDone && (
                            <span className="text-[10px] font-black text-emerald-900 bg-emerald-200 px-2.5 py-0.5 rounded-full font-sans">
                              🏆 REGNO SUPERATO!
                            </span>
                          )}
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
            badge: 'Passo 1: Raccogli',
            title: 'Scegli una moltiplicazione',
            description: 'Completa tutte e 10 le moltiplicazioni per costruire il concetto.',
            completed: effectiveComprendoCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setComprendoSelectedFactor(factor);
              setComprendoFlowStage('game');
              setShowComprendoCompletionEffect(false);
            },
            onHelp: () => pushView('guide-help-comprendo'),
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
           <div className="flex-1 flex flex-col overflow-hidden">
             <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
               <div className={`${comprendoFlowStage === 'game' ? 'max-w-2xl' : 'max-w-xl'} mx-auto w-full space-y-6`}>
                 {comprendoFlowStage === 'objective' && (
                   <div className="bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-4">
                     <div className="text-center">
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-sans">
                         Comprendo: {world.id} × {comprendoSelectedFactor}
                       </span>
                       <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                         Che cos'è {world.id} × {comprendoSelectedFactor}?
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
                         Quando hai contato tutto, collega il totale all'operazione <strong>{world.id} × {comprendoSelectedFactor} = {world.id * comprendoSelectedFactor}</strong>.
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
                       a={world.id}
                       b={comprendoSelectedFactor}
                       itemEmoji={world.itemsToCount}
                       onCompletionChange={handleComprendoCompletionChange}
                     />
                     {showComprendoCompletionEffect && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.9 }}
                         className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto"
                       >
                         <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
                           <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
                           <p className="mt-2 text-xs font-bold text-slate-700">Prosegui con il bottone Continua nel footer.</p>
                         </div>
                       </motion.div>
                     )}
                   </div>
                 )}

               </div>
             </div>

             <div className={`flex-shrink-0 border-t border-white/20 ${compactLayout ? 'p-3' : 'p-4 md:p-6'} bg-gradient-to-t from-white/10 to-transparent`}>
               <div className={`${comprendoFlowStage === 'game' ? 'max-w-2xl' : 'max-w-xl'} mx-auto w-full`}>
                 {comprendoFlowStage === 'game' ? (
                   comprendoGameCompleted ? (
                     <button
                       onClick={() => {
                         sound.playClick();
                         completeComprendoExercise();
                       }}
                       className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                     >
                       Continua
                     </button>
                   ) : (
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
                         className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-colors ${
                           comprendoGameCompleted
                             ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                             : 'bg-indigo-300 cursor-not-allowed opacity-70'
                         }`}
                       >
                         Continua
                       </button>
                     </ActionGrid>
                   )
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
                       className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
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
            badge: 'Passo 2: Salta',
            title: '🐸 Fai saltare la rana sui sassi!',
            description: 'Completa tutte e 10 le combinazioni per consolidare il ritmo del conteggio.',
            completed: effectiveSaltoCompleted,
            onSelect: (factor) => {
              sound.playClick();
              const enemyLayout = buildSaltoEnemyLayout(factor);
              setSaltoSelectedFactor(factor);
              setSaltoIndex(0);
              setSaltoOptions([]);
              setSaltoCorrectClicks(new Set());
              setSaltoFlowStage('game');
              setSaltoGameCompleted(false);
              setShowSaltoCompletionEffect(false);
              setIsFrogSplashing(false);
              setSaltoEnemySteps(enemyLayout.steps);
              setSaltoJumpedEnemySteps(new Set());
              setSaltoAntagonistsByStep(enemyLayout.antagonistsByStep);
              setSaltoFrogPosition(0);
              setSaltoLeap(null);
            },
            onHelp: () => pushView('guide-help-salto'),
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full space-y-6">
                {saltoFlowStage === 'objective' && saltoSelectedFactor !== 1 && (
                  <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-xl space-y-4">
                    <div className="text-center">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full font-sans">
                        Salto: {world.id} × {saltoSelectedFactor}
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
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                      <h4 className="font-bold text-yellow-900 flex items-center gap-2 font-sans">
                        💡 Obiettivo:
                      </h4>
                      <p className="mt-2 text-sm text-yellow-800">
                        Completa il salto corretto per {world.id} × {saltoSelectedFactor} e consolida il conteggio ritmico.
                      </p>
                    </div>
                  </div>
                )}

                {saltoFlowStage === 'game' && (
                  <div className={`relative bg-white rounded-3xl border border-purple-100 shadow-xl ${compactLayout ? 'p-3 space-y-3' : 'p-5 space-y-5'}`}>
                    {/* Header badge / operation touch speech */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-2xl border border-purple-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => speak(`${world.id} per ${saltoSelectedFactor}`)}
                        className="flex items-center gap-2 text-left cursor-pointer hover:scale-[1.02] transition-transform"
                        title="Tocca per ascoltare l'operazione"
                      >
                        <span className="text-xl">🐸</span>
                        <div>
                          <p className="text-[10px] font-bold text-purple-600 uppercase font-sans">
                            Salta {saltoIndex + 1} di {saltoSelectedFactor}
                          </p>
                          <p className="text-base font-black text-indigo-950 font-mono">
                            {world.id} × {saltoSelectedFactor} = {saltoGameCompleted ? world.id * saltoSelectedFactor : '?'}
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* River Stream with Stepping Stones & Frog */}
                    <div className="relative w-full rounded-2xl bg-gradient-to-b from-sky-400 via-sky-500 to-teal-600 border-2 border-sky-300 shadow-inner p-3 min-h-[160px] flex flex-col justify-between">
                      {/* Water sparkles background */}
                      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:16px_16px]" />
                      <button
                        type="button"
                        onClick={() => {
                          if (saltoGameCompleted || isFrogSplashing || saltoLeap !== null) return;
                          sound.playClick();
                          const currentEnemyStep = saltoIndex + 1;
                          const isJumpWindowOpen =
                            saltoEnemySteps.includes(currentEnemyStep) &&
                            !saltoJumpedEnemySteps.has(currentEnemyStep);
                          if (!isJumpWindowOpen) return;
                          const fromStep = saltoFrogPosition;
                          const toStep = currentEnemyStep;
                          const leapMs = prefersReducedMotion ? 140 : 420;
                          setSaltoLeap({ from: fromStep, to: toStep });
                          speak(GAMEPLAY_AUDIO_MESSAGES.saltoObstacleSuccess);
                          window.setTimeout(() => {
                            setSaltoJumpedEnemySteps(prev => new Set(prev).add(currentEnemyStep));
                            setSaltoFrogPosition(toStep);
                            setSaltoLeap(null);
                          }, leapMs);
                        }}
                        className="absolute left-3 bottom-3 z-20 h-11 w-11 rounded-2xl border-2 border-purple-200 bg-white text-xl text-purple-900 shadow-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                        aria-label="Salta"
                        title="Salta"
                      >
                        🐸
                      </button>

                      {/* River Stream Container */}
                      <div className="relative z-10 my-1 flex min-w-0 items-center justify-between gap-1 px-2 py-2 bg-sky-900/30 backdrop-blur-xs rounded-2xl border border-sky-200/30">
                        {/* Stepping Stones Container (Riva + Stones 1 to saltoSelectedFactor) */}
                        <div
                          ref={saltoContainerRef}
                          data-touch-swipe-lock="true"
                          className="relative flex min-w-0 flex-1 items-center justify-start gap-2.5 overflow-x-auto scroll-smooth px-2 pt-8 pb-2 sm:gap-3.5"
                          style={{ touchAction: 'pan-x' }}
                        >
                          {/* Start Bank (Riva / Partenza) - Frog starts here! */}
                          <div
                            ref={saltoFrogPosition === 0 && !saltoGameCompleted ? saltoStoneRef : null}
                            className="relative flex flex-col items-center justify-end shrink-0 min-w-[50px] pt-8 pb-2 px-1"
                          >
                            {/* Frog sitting on Riva when starting (saltoIndex === 0) */}
                            {saltoFrogPosition === 0 && !saltoGameCompleted && (
                              <motion.div
                                key={`frog-start-${isFrogSplashing}-${saltoLeap ? 'leap' : 'idle'}`}
                                initial={isFrogSplashing ? { y: -10, rotate: 0 } : { y: -10, scale: 0.8 }}
                                animate={
                                  isFrogSplashing
                                    ? { y: 28, rotate: 180, scale: 1.15 }
                                    : saltoLeap?.from === 0
                                      ? { x: [0, 24, 52], y: [0, -20, 0], rotate: [0, -8, 0], opacity: [1, 1, 0] }
                                      : { y: [0, -6, 0], scale: 1 }
                                }
                                transition={
                                  isFrogSplashing
                                    ? { duration: 0.4, ease: "easeOut" }
                                    : saltoLeap?.from === 0
                                      ? { duration: prefersReducedMotion ? 0.14 : 0.42, ease: "easeInOut" }
                                      : { y: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } }
                                }
                                className="absolute -top-7 z-30 pointer-events-none flex flex-col items-center"
                              >
                                <span className="text-3xl sm:text-4xl filter drop-shadow-lg select-none">🐸</span>
                                {isFrogSplashing && (
                                  <span className="absolute -bottom-2 text-xl select-none animate-ping">💦</span>
                                )}
                              </motion.div>
                            )}
                            <span className="text-xl">🌱</span>
                            <span className="text-[9px] font-black text-sky-950 bg-amber-100 px-1.5 py-0.5 rounded shadow-xs font-sans">
                              Riva
                            </span>
                          </div>

                          {/* Stepping Stones (1 to saltoSelectedFactor) */}
                          {Array.from({ length: saltoSelectedFactor }).map((_, idx) => {
                            const stoneStep = idx + 1;
                            const stoneNum = world.id * (idx + 1);
                            const isLastStone = idx === saltoSelectedFactor - 1;
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
                                        speak(`Antagonista ${enemyForStep.label}`);
                                      }}
                                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shadow-sm transition-all cursor-pointer ${
                                        isEnemyStepPending
                                          ? 'bg-rose-100 border-rose-400 ring-4 ring-rose-200 motion-safe:animate-pulse'
                                          : 'bg-slate-100 border-slate-300 opacity-65'
                                      }`}
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
                                  {/* Frog sitting on current stone during jumps */}
                                  {isFrogHere && (
                                    <motion.div
                                      key={`frog-${idx}-${isFrogSplashing}-${saltoLeap ? 'leap' : 'idle'}`}
                                      initial={isFrogSplashing ? { y: -10, rotate: 0 } : { y: -10, scale: 0.8 }}
                                      animate={
                                        isFrogSplashing
                                          ? { y: 28, rotate: 180, scale: 1.15 }
                                          : saltoLeap?.from === stoneStep
                                            ? { x: [0, 24, 52], y: [0, -20, 0], rotate: [0, -8, 0], opacity: [1, 1, 0] }
                                            : { y: [0, -6, 0], scale: 1 }
                                      }
                                      transition={
                                        isFrogSplashing
                                          ? { duration: 0.4, ease: "easeOut" }
                                          : saltoLeap?.from === stoneStep
                                            ? { duration: prefersReducedMotion ? 0.14 : 0.42, ease: "easeInOut" }
                                            : { y: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } }
                                      }
                                      className="absolute -top-7 z-30 pointer-events-none flex flex-col items-center"
                                    >
                                      <span className="text-3xl sm:text-4xl filter drop-shadow-lg select-none">🐸</span>
                                      {isFrogSplashing && (
                                        <span className="absolute -bottom-2 text-xl select-none animate-ping">💦</span>
                                      )}
                                    </motion.div>
                                  )}

                                  {/* Frog sitting on final stone on completion */}
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
                                    onClick={() => speak(isReached ? stoneNum.toString() : `Sasso ${idx + 1}`)}
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
                                        : 'bg-indigo-100 text-indigo-900 border border-indigo-200 font-sans'
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
                    </div>

                    {/* Options Grid or Splash Retry Button */}
                    {isFrogSplashing ? (
                      <motion.button
                        type="button"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => {
                          sound.playClick();
                          setIsFrogSplashing(false);
                          setSaltoIndex(0);
                          setSaltoCorrectClicks(new Set());
                          setSaltoFrogPosition(0);
                          setSaltoLeap(null);
                          if (saltoSelectedFactor !== null) {
                            const enemyLayout = buildSaltoEnemyLayout(saltoSelectedFactor);
                            setSaltoEnemySteps(enemyLayout.steps);
                            setSaltoJumpedEnemySteps(new Set());
                            setSaltoAntagonistsByStep(enemyLayout.antagonistsByStep);
                          }
                        }}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm text-center py-3.5 px-4 rounded-2xl border-2 border-rose-300 shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 font-sans"
                      >
                        <span className="text-lg sm:text-xl">💦</span>
                        <span>Riprova</span>
                      </motion.button>
                    ) : (
                      <div className="w-full space-y-2.5">
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {saltoOptions.map((opt, idx) => {
                          const solvedNum = world.id * saltoSelectedFactor;
                          const isSelected = saltoGameCompleted && opt === solvedNum;
                          const isCorrectlyClicked = saltoCorrectClicks.has(opt);

                          return (
                            <button
                              key={idx}
                              disabled={saltoGameCompleted}
                              onClick={() => {
                                if (saltoGameCompleted || isFrogSplashing || saltoLeap !== null) return;
                                const isObstacleBlocking =
                                  saltoEnemySteps.includes(saltoIndex + 1) &&
                                  !saltoJumpedEnemySteps.has(saltoIndex + 1);
                                if (isObstacleBlocking) {
                                  sound.playError();
                                  speak(GAMEPLAY_AUDIO_MESSAGES.saltoObstacleBlocked);
                                  setIsFrogSplashing(true);
                                  return;
                                }
                                const expected = world.id * (saltoIndex + 1);
                                if (opt === expected) {
                                  sound.playSuccess();
                                  setSaltoCorrectClicks(prev => new Set([...prev, opt]));
                                  setSaltoFrogPosition(saltoIndex + 1);
                                  setSaltoLeap(null);
                                  if (saltoIndex + 1 >= saltoSelectedFactor) {
                                    speakSaltoSuccess(world.id, saltoSelectedFactor, opt);
                                    setSaltoGameCompleted(true);
                                    setShowSaltoCompletionEffect(true);
                                    setSaltoCompleted(prev => new Set([...prev, saltoSelectedFactor]));
                                  } else {
                                    setSaltoIndex(prev => prev + 1);
                                  }
                                } else {
                                  sound.playError();
                                  speak(GAMEPLAY_AUDIO_MESSAGES.saltoFall);
                                  setIsFrogSplashing(true);
                                }
                              }}
                              className={`py-3 sm:py-3.5 text-base sm:text-xl font-black font-mono w-full px-1 rounded-2xl border-2 bg-white shadow-sm transition-all ${
                                isSelected
                                  ? 'border-emerald-400 bg-emerald-100 text-emerald-800 ring-4 ring-emerald-200 shadow-md scale-105 cursor-default'
                                  : isCorrectlyClicked
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm cursor-pointer'
                                  : saltoGameCompleted
                                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                                    : 'border-purple-100 hover:border-purple-400 text-purple-950 hover:bg-purple-50 cursor-pointer shadow-xs active:scale-95'
                              }`}
                              id={`salto-opt-${opt}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                        </div>
                      </div>
                    )}

                    {showSaltoCompletionEffect && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto"
                      >
                        <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
                          <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
                          <p className="mt-2 text-xs font-bold text-slate-700">Prosegui con il bottone Continua nel footer.</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`flex-shrink-0 border-t border-white/20 ${compactLayout ? 'p-3' : 'p-4 md:p-6'} bg-gradient-to-t from-white/10 to-transparent`}>
              <div className="max-w-xl mx-auto w-full">
                {saltoFlowStage === 'game' ? (
                  saltoGameCompleted ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        completeSaltoExercise();
                      }}
                      className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
                    >
                      Continua
                    </button>
                  ) : (
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
                        className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-colors ${
                          saltoGameCompleted
                            ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                            : 'bg-purple-300 cursor-not-allowed opacity-70'
                        }`}
                      >
                        Continua
                      </button>
                    </ActionGrid>
                  )
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
                      className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
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
            badge: 'Passo 3: Scoppia',
            title: '🎈 Scegli una moltiplicazione da scoppiare',
            description: 'Completa tutte e 10 le operazioni e trasforma i concetti in risultati.',
            completed: effectiveCostruiscoCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setCostruiscoSelectedFactor(factor);
              setCostruiscoBalloonPool([]);
              setCostruiscoActiveBalloons([]);
              setCostruiscoPopBursts([]);
              setCostruiscoFailed(false);
              setCostruiscoFailReason(null);
              setCostruiscoWrongTappedValue(null);
              setCostruiscoFlowStage('game');
              setCostruiscoGameCompleted(false);
              setShowCostruiscoCompletionEffect(false);
            },
            onHelp: () => pushView('guide-help-costruisco'),
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
          <div className="flex-1 flex flex-col overflow-hidden">
           <div className="flex-1 flex flex-col overflow-hidden">
             <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
               <div className="max-w-2xl mx-auto w-full space-y-6">
                 {costruiscoFlowStage === 'objective' && (
                   <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xl space-y-4">
                     <div className="text-center">
                       <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-sans">
                         Scoppia: {world.id} × {costruiscoSelectedFactor}
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
                         Tocca il palloncino con il risultato giusto di <b>{world.id} × {costruiscoSelectedFactor}</b>.
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

                 {costruiscoFlowStage === 'game' && (
                   <div className="relative bg-white rounded-3xl p-5 border border-emerald-100 shadow-xl space-y-6">
                     <div className="text-center bg-emerald-100 rounded-2xl p-5 border-2 border-emerald-300">
                       <p className="text-xs text-emerald-700 font-bold uppercase">Completa questa operazione</p>
                       <p className="text-3xl font-black text-emerald-900 mt-2 font-mono">
                         {world.id} × {costruiscoSelectedFactor} = ?
                       </p>
                     </div>

                     <div>
                       <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide text-center">
                         Palloncini in volo
                       </h4>
                       <div className="relative mx-auto w-full max-w-md h-64 overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 via-cyan-50 to-sky-100 flex items-center justify-center">
                         {costruiscoFailed ? (
                           <div className="text-center p-4 bg-white/95 backdrop-blur-xs rounded-2xl border border-rose-200 shadow-xl mx-4 space-y-2">
                             <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                               💥
                             </div>
                             <h3 className="text-base font-black text-rose-800">Fallimento!</h3>
                             <p className="text-xs text-slate-600 leading-relaxed">
                               {costruiscoFailReason === 'wrong-tap' ? (
                                 costruiscoWrongTappedValue === null ? (
                                   <>💣 Palloncino trappola! Il numero era giusto, ma era una bomba.<br />Il palloncino vero aveva lo stesso numero ma era colorato!</>
                                 ) : (
                                   <>
                                     Hai scoppiato il palloncino sbagliato (<b>{costruiscoWrongTappedValue}</b>)!<br />
                                     Per <b>{world.id} × {costruiscoSelectedFactor}</b> il risultato era un altro.
                                   </>
                                 )
                               ) : (
                                 <>
                                   Oh no il palloncino e volato via!<br />
                                   Riprova a prenderlo prima che arrivi ai 3/4 dell arena.
                                 </>
                               )}
                             </p>
                             <button
                               type="button"
                               onClick={handleCostruiscoRetry}
                               className="mt-2 py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
                             >
                               <RotateCcw className="w-4 h-4" /> Riprova
                             </button>
                           </div>
                         ) : costruiscoGameCompleted ? (
                           <div className="text-center p-4 bg-white/95 backdrop-blur-xs rounded-2xl border border-emerald-200 shadow-xl mx-4 space-y-2">
                             <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                               🎉
                             </div>
                             <h3 className="text-base font-black text-emerald-800">Successo!</h3>
                             <p className="text-xs text-slate-600">
                               Bravo! Risposta esatta:<br />
                               <b className="text-sm text-emerald-900 font-mono">{world.id} × {costruiscoSelectedFactor} = {world.id * (costruiscoSelectedFactor || 1)}</b>
                             </p>
                           </div>
                         ) : (
                           <>
                             {costruiscoPopBursts.map((burst) => (
                               <motion.div
                                 key={`pop-${burst.id}`}
                                 initial={{ scale: 1, opacity: 1 }}
                                 animate={{ scale: [1, 1.6, 0], opacity: [1, 1, 0] }}
                                 transition={{ duration: 0.35, ease: "easeOut" }}
                                 className="absolute bottom-2 -translate-x-1/2 text-5xl select-none pointer-events-none"
                                 style={{ left: `${burst.lane}%` }}
                               >
                                 💥
                               </motion.div>
                             ))}
                             {costruiscoActiveBalloons.map((balloon) => (
                               <motion.button
                                 key={`multi-balloon-${balloon.id}`}
                                 whileHover={{ scale: 1.1 }}
                                 whileTap={{ scale: 0.95 }}
                                 initial={{ y: 80, opacity: 1 }}
                                 animate={prefersReducedMotion ? { y: 0, opacity: 1 } : { y: [80, COSTRUISCO_BALLOON_EXIT_Y], opacity: [1, 1, 0.95] }}
                                 transition={prefersReducedMotion ? { duration: 0.1 } : { duration: balloon.flightMs / 1000, ease: "linear" }}
                                 onClick={() => handleCostruiscoSingleBalloonTap(balloon)}
                                 className={`${compactLayout ? "w-16 h-20 text-base" : "w-20 h-24 text-lg"} absolute bottom-2 rounded-[999px] font-extrabold font-mono flex items-center justify-center shadow-lg border select-none pb-2 pt-1 transition-all -translate-x-1/2 cursor-pointer ${balloon.palette.body}`}
                                 style={{ left: `${balloon.lane}%` }}
                                 id={`balloon-single-${balloon.id}`}
                                 aria-label={balloon.isTrap ? 'Palloncino bomba — non toccare!' : `Palloncino ${balloon.value}`}
                               >
                                 {balloon.isTrap ? (
                                   <>
                                     <span className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full bg-white/20" />
                                     <span className="text-xl font-black">{balloon.value}</span>
                                     <span
                                       className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-[9px] shadow-md"
                                       aria-hidden="true"
                                     >💣</span>
                                   </>
                                 ) : (
                                   <>
                                     <span className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full bg-white/60" />
                                     <span className="text-xl font-black">{balloon.value}</span>
                                   </>
                                 )}
                                 <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 rounded-[2px] ${balloon.palette.knot}`} />
                                 <span className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-[2px] h-3 rounded-full ${balloon.palette.string}`} />
                               </motion.button>
                             ))}
                             {costruiscoActiveBalloons.length === 0 && costruiscoPopBursts.length === 0 && (
                               <p className="text-[11px] font-bold text-sky-700 bg-white/75 border border-sky-200 rounded-full px-3 py-1">
                                 Nuovo palloncino in arrivo...
                               </p>
                             )}
                           </>
                         )}
                       </div>
                     </div>

                     {showCostruiscoCompletionEffect && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.9 }}
                         className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto"
                       >
                         <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
                           <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
                           <p className="mt-2 text-xs font-bold text-slate-700">Prosegui con il bottone Continua nel footer.</p>
                         </div>
                       </motion.div>
                     )}
                   </div>
                 )}
               </div>
             </div>

             <div className={`flex-shrink-0 border-t border-white/20 ${compactLayout ? 'p-3' : 'p-4 md:p-6'} bg-gradient-to-t from-white/10 to-transparent`}>
               <div className="max-w-2xl mx-auto w-full">
                 {costruiscoFlowStage === 'game' ? (
                   costruiscoGameCompleted ? (
                     <button
                       onClick={() => {
                         sound.playClick();
                         completeCostruiscoExercise();
                       }}
                       className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
                     >
                       Continua
                     </button>
                   ) : (
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
                         className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-colors ${
                           costruiscoGameCompleted
                             ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                             : 'bg-emerald-300 cursor-not-allowed opacity-70'
                         }`}
                       >
                         Continua
                       </button>
                     </ActionGrid>
                   )
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
                         startCostruiscoSingleBalloonGame();
                       }}
                       className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                     >
                       Inizia Gioco 🎈
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
            badge: 'Passo 4: Trova',
            title: '🧱 Scegli un mattone da trovare',
            description: 'Completa tutte e 10 le combinazioni per memorizzare più rapidamente.',
            completed: effectiveTrucchiCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setTrucchiSelectedFactor(factor);
              setTrucchiFlowStage('game');
              setTrucchiQuestionSolved(false);
              setShowTrucchiCompletionEffect(false);
              setTrucchiAnswer('');
            },
            onHelp: () => pushView('guide-help-trucchi'),
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 overflow-hidden ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full space-y-5">
                {trucchiFlowStage === 'objective' && (
                  <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-xl space-y-4">
                    <div className="text-center">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full font-sans">
                        Trova: {world.id} × {trucchiSelectedFactor}
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
                      {(trucchiSelectedFactor ?? 0) >= TRUCCHI_GHOST_START_FACTOR && (
                        <p className="text-rose-700 font-semibold mt-1 leading-relaxed">
                          ⚠️ Attenzione al 👻 fantasma: se lo tocchi, la piramide crolla!
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
                  <div className="relative min-h-[25rem] bg-white rounded-3xl border border-amber-100 shadow-xl p-4 sm:p-5 space-y-5">
                    {/* 👻 Ghost obstacle — appears from factor 4+ after preview */}
                    {trucchiGhostActive && !trucchiPyramidCollapsed && !trucchiQuestionSolved && (
                      <motion.button
                        initial={{ x: '-5%' }}
                        animate={{ x: ['-5%', '105%'] }}
                        transition={{ repeat: Infinity, repeatType: 'mirror', duration: getTrucchiGhostSpeedMs(trucchiSelectedFactor || 4) / 1000, ease: 'linear' }}
                        onClick={() => {
                          setTrucchiGhostActive(false);
                          sound.playError();
                          speak(GAMEPLAY_AUDIO_MESSAGES.trucchiGhost);
                          setTrucchiPyramidCollapsed(true);
                          trucchiCollapseTimeoutRef.current = window.setTimeout(() => {
                            setTrucchiRemovedBricks(new Set(Array.from({ length: trucchiBrickValues.length }, (_, i) => i)));
                            trucchiCollapseTimeoutRef.current = null;
                          }, 820);
                        }}
                        className="absolute left-0 z-20 text-3xl cursor-pointer select-none"
                        style={{ top: '42%' }}
                        aria-label="Fantasma — non toccare, fa crollare la piramide!"
                      >
                        👻
                      </motion.button>
                    )}
                    <div className="text-center space-y-2">
                      <h4 className="text-sm font-bold text-amber-900">
                        Quanto fa <strong>{world.id} × {trucchiSelectedFactor}</strong>?
                      </h4>
                      <p className="text-xs text-amber-800 font-sans">
                        {trucchiPreviewActive
                          ? 'Guarda bene i risultati nascosti: tra un attimo i mattoni si richiudono.'
                          : 'Tocca un mattone e scopri se nasconde il risultato giusto.'}
                      </p>
                      <p className="text-[11px] font-black uppercase tracking-wide text-amber-600">
                        Equilibrio rimasto: {Math.max(0, 3 - trucchiWrongChoices)}/3
                      </p>
                    </div>

                    {(() => {
                      const correctValue = world.id * trucchiSelectedFactor;
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

                                    if (hiddenValue === undefined || isRemoved) {
                                      return null;
                                    }

                                    const isCorrectBrick = hiddenValue === correctValue;
                                    const isRevealed = trucchiPreviewActive || trucchiRevealedBrickIndex === globalIndex || (trucchiQuestionSolved && isCorrectBrick);
                                    const isBrickLocked = trucchiPreviewActive || trucchiQuestionSolved || trucchiPyramidCollapsed || trucchiRevealedBrickIndex !== null;
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
                                      <motion.button
                                        key={`trucchi-brick-${globalIndex}`}
                                        type="button"
                                        role="listitem"
                                        initial={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                                        exit={{ opacity: 0, scale: 0.72, y: 18 }}
                                        animate={trucchiPyramidCollapsed
                                          ? { x: collapsedX, y: collapsedY, rotate: collapsedRotate, opacity: 0 }
                                          : { x: 0, y: trucchiWrongChoices >= 2 && isBaseRow ? 4 : 0, rotate: restingRotate, opacity: 1, scale: 1 }
                                        }
                                        transition={trucchiPyramidCollapsed
                                          ? { duration: 0.55, ease: 'easeIn' }
                                          : { duration: 0.22, ease: 'easeOut' }
                                        }
                                        disabled={isBrickLocked}
                                        onClick={() => {
                                          if (isBrickLocked) return;

                                          setTrucchiRevealedBrickIndex(globalIndex);

                                          if (isCorrectBrick) {
                                            sound.playSuccess();
                                            speakMultiplicationSuccess(world.id, trucchiSelectedFactor, hiddenValue);
                                            setTrucchiQuestionSolved(true);
                                            setShowTrucchiCompletionEffect(true);
                                            return;
                                          }

                                          sound.playError();
                                          const nextWrongChoices = trucchiWrongChoices + 1;
                                          setTrucchiWrongChoices(nextWrongChoices);

                                          trucchiRevealTimeoutRef.current = window.setTimeout(() => {
                                            setTrucchiRevealedBrickIndex(current => (current === globalIndex ? null : current));

                                            if (nextWrongChoices >= 3) {
                                              setTrucchiPyramidCollapsed(true);
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
                                        className={`relative flex h-12 w-[clamp(3.4rem,17vw,4.9rem)] items-center justify-center overflow-hidden rounded-none border shadow-[0_10px_16px_rgba(15,23,42,0.12)] transition-colors ${isBrickLocked ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                                          isRevealed
                                            ? 'border-stone-300 bg-gradient-to-b from-stone-50 via-orange-50 to-stone-100 text-stone-700'
                                            : closedBrickClass
                                        }`}
                                        aria-label={isRevealed ? `Mattone con risultato ${hiddenValue}` : 'Mattone chiuso'}
                                      >
                                        {isRevealed ? (
                                          <>
                                            <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/60" aria-hidden="true" />
                                            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-stone-300/80" aria-hidden="true" />
                                            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-stone-300/60" aria-hidden="true" />
                                            <span className="text-base font-black sm:text-lg">{hiddenValue}</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/25" aria-hidden="true" />
                                            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-orange-800/50" aria-hidden="true" />
                                            <span className="absolute left-1/3 top-[0.65rem] bottom-[0.65rem] w-px bg-orange-800/45" aria-hidden="true" />
                                            <span className="absolute left-2/3 top-[0.65rem] bottom-[0.65rem] w-px bg-orange-800/45" aria-hidden="true" />
                                            <span className="absolute inset-x-0 bottom-[0.38rem] h-px bg-orange-800/35" aria-hidden="true" />
                                          </>
                                        )}
                                      </motion.button>
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
                          <p className="text-sm font-black text-rose-700">La piramide e caduta!</p>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              resetTrucchiRound();
                            }}
                            className="mt-3 rounded-2xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-amber-700"
                          >
                            Riprova
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {showTrucchiCompletionEffect && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto"
                      >
                        <div className="rounded-2xl border-2 border-emerald-300 bg-white/95 px-6 py-4 text-center shadow-xl">
                          <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
                          <p className="mt-2 text-xs font-bold text-slate-700">Prosegui con il bottone Continua nel footer.</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`flex-shrink-0 border-t border-white/20 ${compactLayout ? 'p-3' : 'p-4 md:p-6'} bg-gradient-to-t from-white/10 to-transparent`}>
              <div className="max-w-xl mx-auto w-full">
                {trucchiFlowStage === 'game' ? (
                  trucchiQuestionSolved ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        completeTrucchiExercise();
                      }}
                      className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors motion-safe:animate-pulse"
                      id="trick-done-btn"
                    >
                      Continua
                    </button>
                  ) : (
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
                        disabled
                        className="w-full py-3 rounded-2xl font-bold text-sm shadow-md transition-all bg-slate-100 text-slate-400 cursor-not-allowed"
                        id="trick-done-btn"
                      >
                        Continua
                      </button>
                    </ActionGrid>
                  )
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
                      className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
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
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
            {/* Progress and help button */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs">
              <div aria-hidden="true" />
              <div className="w-36 text-center">
                <motion.div
                  key={`quiz-streak-${quizCorrectStreak}-${quizStreakJustReset ? 'reset' : 'steady'}`}
                  initial={quizStreakJustReset ? { scale: 0.92, y: -4 } : false}
                  animate={quizStreakJustReset ? { scale: [0.92, 1.08, 1], y: [-4, 0, 0] } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`mb-1 text-lg font-black font-mono leading-none ${
                    quizStreakJustReset ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                  aria-live="polite"
                >
                  {quizCorrectStreak}/{targetPraticoStreak}
                </motion.div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Progresso pratico"
                  aria-valuemin={0}
                  aria-valuemax={targetPraticoStreak}
                  aria-valuenow={quizCorrectStreak}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      quizStreakJustReset ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (quizCorrectStreak / Math.max(1, targetPraticoStreak)) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => pushView('guide-help-pratico')}
                  className={`rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
                    !hasReadRulesMandatory.has('pratico')
                      ? 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700'
                      : 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400'
                  }`}
                  title="Visualizza regole"
                  aria-label="Visualizza regole"
                >
                  <HelpCircle className={!hasReadRulesMandatory.has('pratico') ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
              <h4 className="font-bold text-indigo-950 font-sans">Come si gioca:</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Rispondi in sequenza alle operazioni scegliendo l'opzione corretta tra le quattro proposte.
              </p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Mantieni una serie positiva: più risposte corrette consecutive fai, più avanzi nel pratico.
              </p>
            </div>

            {/* Quiz question card */}
            <motion.div
              key={`pratico-card-${currentQuizIdx}-${currentPraticoQuestion.a}-${currentPraticoQuestion.b}`}
              initial={{ opacity: 0.8, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className={`${praticoOperationCardTheme} relative overflow-hidden rounded-3xl p-6 text-center text-white shadow-xl`}
            >
              <div className="absolute left-0 top-0 h-24 w-24 -translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-lg" />
              <div className="absolute right-0 bottom-0 h-20 w-20 translate-x-8 translate-y-8 rounded-full bg-black/10 blur-xl" />
              <h2 className="relative text-5xl font-black font-mono tracking-wide">
                {currentPraticoQuestion.a} x {currentPraticoQuestion.b}
              </h2>
            </motion.div>

            {/* Question options */}
            <div className={`w-full h-full content-start grid grid-cols-2 ${compactLayout ? 'gap-2.5' : 'gap-3.5'}`}>
              {quizOptions.map((opt, idx) => {
                const pressed = quizPressedFeedback?.opt === opt;
                const isCorrectOpt = opt === currentPraticoQuestion.a * currentPraticoQuestion.b;
                const feedbackClass = pressed
                  ? quizPressedFeedback!.correct
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-95'
                    : 'bg-rose-100 border-rose-400 text-rose-800 scale-95'
                  : 'bg-white border-slate-100 hover:border-indigo-400 hover:bg-slate-50 text-slate-800';
                return (
                  <button
                    key={idx}
                    disabled={quizInteractionLocked}
                    onPointerDown={() => {
                      if (quizInteractionLocked) return;
                      setQuizPressedFeedback({ opt, correct: isCorrectOpt });
                    }}
                    onPointerUp={() => {
                      setQuizPressedFeedback(null);
                      if (quizInteractionLocked) return;
                      handleQuizAnswer(opt);
                    }}
                    onPointerLeave={() => setQuizPressedFeedback(null)}
                    onPointerCancel={() => setQuizPressedFeedback(null)}
                    className={`w-full rounded-xl border-2 font-black font-mono shadow-sm transition-all select-none disabled:cursor-not-allowed disabled:opacity-70 ${compactLayout ? 'min-h-11 py-3 px-2 text-base' : 'min-h-14 py-4 px-4 text-lg'} ${feedbackClass} ${quizInteractionLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    id={`quiz-opt-${opt}`}
                    aria-label={`Risposta ${opt}`}
                  >
                    {opt}
                  </button>
                );
              })}
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
                <button
                  onClick={() => pushView('guide-help-sfida')}
                  className={`rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
                    !hasReadRulesMandatory.has('sfida')
                      ? 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700'
                      : 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400'
                  }`}
                  aria-label="Apri regole della sfida"
                  title="Apri regole della sfida"
                >
                  <span className={!hasReadRulesMandatory.has('sfida') ? 'text-base leading-none' : 'text-sm leading-none'} aria-hidden="true">?</span>
                </button>
              </div>
              <p className="text-sm text-slate-600">Risolvi il maggior numero di operazioni prima che il tempo finisca!</p>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-left text-xs text-slate-700 font-sans space-y-1">
                <p className="font-black text-indigo-900">Ogni Sfida costa: {SFIDA_UNLOCK_COST} 🪙 moneta</p>
                <p>La Sfida non assegna monete: le monete si vincono nel Pratico.</p>
                <p>Da 10 a 13 corrette: <b>+{SFIDA_DROPS_LOW_REWARD} 💧</b></p>
                <p>Da 14 a 16 corrette: <b>+{SFIDA_DROPS_MID_REWARD} 💧</b></p>
                <p>Da 17 in su: <b>+{SFIDA_DROPS_HIGH_REWARD} 💧</b></p>
                <p>Se fai record valido: <b className="text-indigo-900">gocce x2</b>.</p>
              </div>
            </div>

            <button
              onClick={handleSfidaStartClick}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center py-4 gap-0.5"
              id="sfida-start-btn"
            >
              <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">30 secondi</span>
              <span className="text-xl sm:text-2xl font-black">
                {sfidaResult ? `▶ GIOCA ANCORA (${SFIDA_UNLOCK_COST} 🪙)` : `▶ INIZIA SFIDA (${SFIDA_UNLOCK_COST} 🪙)`}
              </span>
            </button>

            {/* Record tabellina (visibile sempre quando non c'è un risultato recente) */}
            {!sfidaResult && worldProg.highScore > 0 && (
              <p className="text-xs text-slate-400 text-center font-sans">
                🏅 Il tuo record: <span className="font-black text-slate-600">{worldProg.highScore}</span> risposte esatte
              </p>
            )}

            {/* DEV toolbar – visibile solo in modalità sviluppo */}
            {devMode && (
              <div
                aria-hidden="true"
                className="w-full rounded-xl border-2 border-dashed border-orange-400 bg-orange-50 px-4 py-3 flex flex-col gap-2"
              >
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">🛠 Dev tools</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      updateProfile(p => ({
                        ...p,
                        worldProgress: {
                          ...p.worldProgress,
                          [world.id]: {
                            ...p.worldProgress[world.id],
                            highScore: 0,
                          },
                        },
                      }));
                      setSfidaResult(null);
                    }}
                    className="flex-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-2 px-3 cursor-pointer transition-colors"
                  >
                    🔴 Azzera record
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFireworks(true)}
                    className="flex-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold py-2 px-3 cursor-pointer transition-colors"
                  >
                    🎆 Test fuochi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: SFIDA (Timed challenge) */}
        {activeStep === 'sfida' && sfidaActive && sfidaQuestion && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              {/* Countdown */}
              <div className="flex items-center gap-1.5 text-rose-600 font-bold font-mono bg-rose-50 px-3 py-1 rounded-full text-sm">
                <Timer className="w-4 h-4 animate-spin" />
                Tempo: {sfidaTimer}s
              </div>

              {/* Score */}
              <div className="flex items-center gap-1.5 text-amber-600 font-bold font-mono bg-amber-50 px-3 py-1 rounded-full text-sm">
                <Trophy className="w-4 h-4" />
                Punti: {sfidaScore}
              </div>
            </div>

            {/* Large formula */}
            <motion.div
              key={`sfida-card-${sfidaQuestionVersion}-${sfidaQuestion.a}-${sfidaQuestion.b}`}
              initial={{ opacity: 0.8, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className={`${sfidaOperationCardTheme} relative overflow-hidden rounded-3xl p-6 text-center text-white shadow-lg`}
            >
              <div className="absolute left-0 top-0 h-24 w-24 -translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-lg" />
              <div className="absolute right-0 bottom-0 h-20 w-20 translate-x-8 translate-y-8 rounded-full bg-black/10 blur-xl" />
              <h2 className="relative text-5xl font-black font-mono">{sfidaQuestion.a} x {sfidaQuestion.b}</h2>
            </motion.div>

            {/* Answers options */}
            <div className={`w-full h-full content-start grid grid-cols-2 ${compactLayout ? 'gap-2.5' : 'gap-3.5'}`}>
              {sfidaOptions.map((opt, idx) => {
                const pressed = sfidaPressedFeedback?.opt === opt;
                const isCorrectOpt = sfidaQuestion && opt === sfidaQuestion.a * sfidaQuestion.b;
                const feedbackClass = pressed
                  ? sfidaPressedFeedback!.correct
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-95'
                    : 'bg-rose-100 border-rose-400 text-rose-800 scale-95'
                  : 'bg-white border-slate-100 hover:border-amber-400 hover:bg-slate-50 text-slate-800';
                return (
                  <button
                    key={idx}
                    aria-disabled={sfidaInteractionLocked}
                    onPointerDown={() => {
                      if (sfidaInteractionLocked) return;
                      setSfidaPressedFeedback({ opt, correct: !!isCorrectOpt });
                    }}
                    onPointerUp={() => {
                      if (sfidaInteractionLocked) return;
                      setSfidaPressedFeedback({ opt, correct: !!isCorrectOpt });
                      handleSfidaAnswer(opt);
                    }}
                    onPointerLeave={() => setSfidaPressedFeedback(null)}
                    onPointerCancel={() => setSfidaPressedFeedback(null)}
                    className={`w-full rounded-xl border-2 font-black font-mono shadow-sm transition-all select-none ${compactLayout ? 'min-h-11 py-3 px-2 text-base' : 'min-h-14 py-4 px-4 text-lg'} ${feedbackClass} cursor-pointer`}
                    id={`sfida-opt-${opt}`}
                    aria-label={`Risposta ${opt}`}
                  >
                    {opt}
                  </button>
                );
              })}
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
        </>
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
              className="w-full rounded-xl bg-rose-600 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-rose-700 cursor-pointer"
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
              Bravissimo!
            </h3>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Hai completato 10/10 in <span className="text-emerald-700">{stepMotivationLabels[motivationPopup.stepName]}</span>.
            </p>
            <p className="mb-5 text-sm text-slate-600">
              {motivationPopup.message}
            </p>
            <button
              type="button"
              onClick={closeMotivationPopup}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 cursor-pointer"
            >
              Continua
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
                className={`rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center shadow-sm transition-all ${
                  shouldHighlightSfidaCta
                    ? 'cursor-pointer border-amber-500 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 text-amber-950 font-black animate-monument-glow ring-2 ring-amber-400'
                    : 'cursor-pointer hover:border-amber-300 hover:bg-amber-100/70'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Monete vinte</p>
                <p className="text-lg font-black text-amber-800">🪙 +3</p>
                <p className={`text-[11px] font-black ${shouldHighlightSfidaCta ? 'text-amber-950 animate-badge-blink' : 'text-amber-900'}`}>
                  {shouldHighlightSfidaCta ? '✨ Vai alla Sfida! ⚔️' : 'Vai alla Sfida'}
                </p>
              </button>
              <button
                type="button"
                role="listitem"
                onClick={handleGocceBadgeClick}
                className={`rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-center shadow-sm transition-all ${
                  hasErectableBlockedMonuments
                    ? 'cursor-pointer hover:border-sky-300 hover:bg-sky-100 motion-safe:animate-pulse'
                    : 'cursor-pointer hover:border-sky-300 hover:bg-sky-100/70'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Gocce vinte</p>
                <p className="text-lg font-black text-sky-800">💧 +0</p>
                <p className="text-[11px] font-black text-sky-900">Le gocce arrivano dalla Sfida</p>
              </button>
            </div>
            <p className="mb-1 text-xs text-slate-600">
              🪙 Con le monete sblocchi outfit e accessori nel Sarto del Regno.
            </p>
            <p className="mb-3 text-xs text-slate-600">
              💧 Con le gocce erigi i monumenti del Regno.
            </p>
            <p className="mb-5 text-xs text-slate-500">
              Prossimo obiettivo: <span className="font-mono text-emerald-700">{(praticoCongratsTarget ?? targetPraticoStreak) + 2} consecutive</span>.
            </p>
            <button
              type="button"
              onClick={closePraticoCongrats}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 cursor-pointer"
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
            <h3 id="sfida-confirm-title" className="mb-2 text-base font-black text-amber-900">
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
                sfidaResult.passedSfida ? 'text-emerald-800' : 'text-rose-700'
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
                  : sfidaResult.recordBonusApplied
                  ? <>✨ Record valido! <b>Gocce x2</b>: +{sfidaResult.dropsEarned} 💧 Gocce di Luce.</>
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
                  Hai guadagnato <b>+{sfidaResult.dropsEarned} 💧</b>. Per superare lo step Sfida e sbloccare il prossimo Regno sul Sentiero servono <b>almeno 15 risposte corrette</b>. Ti mancavano {Math.max(1, 15 - sfidaResult.correctAnswers)} risposte!
                </div>
              </div>
            )}

            {sfidaResult.isNewRecord && (
              <p className="mt-2 text-xs font-black text-amber-700">🏅 NUOVO RECORD PERSONALE!</p>
            )}

            <button
              type="button"
              onClick={closeSfidaResultPopup}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-black text-white shadow-md transition-colors cursor-pointer ${
                sfidaResult.passedSfida ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
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
              Ogni Sfida costa <b>{SFIDA_UNLOCK_COST} moneta</b>. Al momento ne hai <b>{profile.coins}</b>.
            </p>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setSfidaUnlockModalMode(null);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
            >
              Ho capito
            </button>
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
            <h3 className="text-base font-black text-indigo-950 mb-1">Monumenti da erigere</h3>
            <p className="text-xs text-slate-600 mb-4">
              Usa le tue gocce per sbloccare i monumenti bloccati del Regno.
            </p>

            {blockedMonuments.length > 0 ? (
              <>
                <div role="list" className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1 text-left">
                  {blockedMonuments.map(monument => {
                    const canAfford = profile.lightDrops >= monument.cost;
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
                            <p className="text-[11px] font-bold text-amber-900">Costo: 💧 {monument.cost} Gocce</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            canAfford
                              ? 'bg-amber-300 text-amber-950 border border-amber-400 animate-badge-blink shadow-2xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {canAfford ? '✨ Sbloccabile!' : '🔒 Bloccato'}
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
                              });
                            }}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-black shadow-md transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-white animate-bounce ring-2 ring-amber-300'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            }`}
                          >
                            {canAfford ? '✨ Erigi ora! 🏛️' : 'Dettagli'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {profile.lightDrops <= 0 && profile.coins >= SFIDA_UNLOCK_COST && (
                  <p className="mt-3 text-xs text-indigo-800 text-left">
                    Suggerimento: al momento non hai gocce, ma hai almeno <b>{SFIDA_UNLOCK_COST} monete</b>. Puoi provare la <b>Sfida</b> per puntare a nuove ricompense.
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-left">
                <p className="text-xs font-bold text-indigo-900">Hai già eretto tutti i monumenti di questo Regno. Ottimo lavoro! 🏛️</p>
                {canSuggestSfidaFromMonuments ? (
                  <p className="mt-2 text-xs text-indigo-800">
                    Non hai gocce al momento, ma hai almeno <b>{SFIDA_UNLOCK_COST} monete</b>: puoi provare la <b>Sfida</b> per puntare a nuove ricompense.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-indigo-800">
                    Continua il Sentiero per guadagnare risorse e completare il Regno.
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

      {/* Monument Unlock Confirmation / Insufficient Drops Modal */}
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
                  🏛️ ERETTO CON SUCCESSO ✓
                </span>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  {monumentModal.monument.description}
                </p>
                <button
                  type="button"
                  onClick={closeMonumentFlowAndMaybeReturnToPraticoCongrats}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                >
                  Chiudi
                </button>
              </>
            ) : monumentModal.canAfford ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-sm">
                  {monumentModal.monument.emoji}
                </div>
                <h3 className="text-base font-black text-indigo-950 mb-1">
                  Erigi {monumentModal.monument.name}?
                </h3>
                <div className="inline-flex items-center gap-1 text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full mb-3">
                  💧 Costo: <b>{monumentModal.monument.cost} Gocce</b>
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Hai a disposizione <b>{profile.lightDrops} Gocce di Luce</b>. Vuoi spendere {monumentModal.monument.cost} Gocce per erigere questo monumento nel Regno?
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
                      handleRebuildMonument(monumentModal.monument.id, monumentModal.monument.cost);
                      if (shouldReturnToMonumentsListAfterModal) {
                        setMonumentModal(null);
                        setShowMonumentUnlockList(true);
                        return;
                      }
                      setMonumentModal(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition-colors active:scale-95"
                  >
                    🏛️ Si, Erigi Ora!
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-3xl shadow-sm">
                  💧
                </div>
                <h3 className="text-base font-black text-rose-950 mb-1">
                  Gocce Insufficienti!
                </h3>
                <div className="inline-flex items-center gap-1 text-xs font-black text-rose-900 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full mb-3">
                  Costo: 💧 {monumentModal.monument.cost} (Ne hai {profile.lightDrops})
                </div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Per erigere <b>{monumentModal.monument.name}</b> ti mancano <b>{monumentModal.monument.cost - profile.lightDrops} Gocce di Luce</b>.
                  <br /><br />
                  Gioca nel passo <b>"Pratico (Avventura)"</b> per sconfiggere la nebbia e raccogliere le gocce necessarie!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMonumentModal(null);
                    setCurrencyModalType('drops');
                  }}
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold underline mb-4 block mx-auto cursor-pointer"
                >
                  A cosa servono le Gocce? 💧
                </button>
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
                      setMonumentModal(null);
                      startQuizMode();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                  >
                    🛡️ Vai al Pratico
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      <CurrencyInfoModal
        type={currencyModalType}
        isOpen={!!currencyModalType}
        onClose={() => setCurrencyModalType(null)}
        lightDrops={profile.lightDrops}
        coins={profile.coins}
      />
    </div>
  );
}
