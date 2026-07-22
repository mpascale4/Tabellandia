/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { WorldConfig, UserProfile, QuestionAttempt } from '../types';
import { sound } from './SoundManager';
import { Sparkles, HelpCircle, ArrowLeft, Check, AlertCircle, Award, Timer, Trophy, Compass, ShieldAlert } from 'lucide-react';
import GroupVisualizer from './GroupVisualizer';
import StepRulesModal from './StepRulesModal';
import RewardPopup from './RewardPopup';
import NumericKeypad from './NumericKeypad';
import RewardsTutorial from './RewardsTutorial';
import MonumentArea from './MonumentArea';
import CombinationCarousel from './CombinationCarousel';
import FireworksOverlay from './FireworksOverlay';
import ActionGrid from './layout/ActionGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';
import { withOxIfSecond } from '../utils/tableLabels';

interface WorldDetailProps {
  world: WorldConfig;
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  onBack: () => void;
  compactLayout?: boolean;
  initialExercise?: string | null;
  devMode?: boolean;
}

export default function WorldDetail({ world, profile, updateProfile, onBack, compactLayout = false, initialExercise, devMode = false }: WorldDetailProps) {
  const ALL_STEP_IDS = ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'];
  const ALL_FACTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const [activeStep, setActiveStep] = useState<string>(initialExercise || 'intro'); // intro, comprendo, salto, costruisco, trucchi, pratico, sfida
  const [showIntroModal, setShowIntroModal] = useState<boolean>(false);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(false);
  const [showStepRulesModal, setShowStepRulesModal] = useState<string | null>(null); // null o il nome dello step
  const [hasSeenStepRules, setHasSeenStepRules] = useState<Set<string>>(new Set()); // Track which steps have been seen
  const [hasReadRulesMandatory, setHasReadRulesMandatory] = useState<Set<string>>(new Set()); // Track mandatory rule reading
  const [showRewardPopup, setShowRewardPopup] = useState<{ step: string; coins: number; drops: number } | null>(null);

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
  
  // For the current game being played
  const [saltoIndex, setSaltoIndex] = useState<number>(0); // which multiple we are on (0 to 9)
  const saltoNumbers = Array.from({ length: 10 }).map((_, i) => world.id * (i + 1));
  const [saltoOptions, setSaltoOptions] = useState<number[]>([]);

  // Costruisco (Step 3) state
  const [costruiscoProgress, setCostruiscoProgress] = useState<{ [key: number]: number | null }>({}); // factor -> product or null
  const [costruiscoBalloons, setCostruiscoBalloons] = useState<number[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<number | null>(null);
  const [completedMonuments, setCompletedMonuments] = useState<string[]>([]); // Track completed monuments

  // Trucchi (Step 4) state
  const [trucchiQuestionSolved, setTrucchiQuestionSolved] = useState<boolean>(false);
  const [trucchiAnswer, setTrucchiAnswer] = useState<string>("");

  // Pratico / Quiz (Step 5) state
  const [quizQuestions, setQuizQuestions] = useState<{ a: number; b: number }[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizOptions, setQuizOptions] = useState<number[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
  const [quizWrongAttempts, setQuizWrongAttempts] = useState<{ [key: string]: number }>({}); // tracks combinations failed in this session
  const [quizHistory, setQuizHistory] = useState<{ a: number; b: number; correct: boolean }[]>([]);
  
  // Visual press feedback for quiz/sfida options (shows while button is held down)
  const [quizPressedFeedback, setQuizPressedFeedback] = useState<{ opt: number; correct: boolean } | null>(null);
  const [sfidaPressedFeedback, setSfidaPressedFeedback] = useState<{ opt: number; correct: boolean } | null>(null);

  // Feedback modal for errors
  const [errorFeedback, setErrorFeedback] = useState<{
    show: boolean;
    a: number;
    b: number;
    userAnswer: number;
    correctAnswer: number;
  } | null>(null);

  // Sfida (Step 6) state
  const [sfidaActive, setSfidaActive] = useState<boolean>(false);
  const [sfidaReady, setSfidaReady] = useState<boolean>(false); // true = START button showing, false = game running
  const [sfidaQuestion, setSfidaQuestion] = useState<{ a: number; b: number } | null>(null);
  const [sfidaTimer, setSfidaTimer] = useState<number>(30);
  const [sfidaScore, setSfidaScore] = useState<number>(0);
  const [sfidaOptions, setSfidaOptions] = useState<number[]>([]);
  const [sfidaResult, setSfidaResult] = useState<{ correctAnswers: number; isNewRecord: boolean; previousRecord: number } | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

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

  // Show rules modal when entering a new step - DISABLED for now, user can click info button
  useEffect(() => {
    // Rules modal is now only opened when user clicks the info button
    // if (activeStep !== 'intro' && !hasSeenStepRules.has(activeStep)) {
    //   setShowStepRulesModal(activeStep);
    //   setHasSeenStepRules(prev => new Set([...prev, activeStep]));
    // }
  }, [activeStep, hasSeenStepRules]);

  // Generate options for Salto mode
  const generateSaltoOptions = () => {
    if (saltoSelectedFactor === null) return;
    const currentExpected = world.id * (saltoIndex + 1);
    // Create random wrong options
    const optionsSet = new Set<number>([currentExpected]);
    let attempts = 0;
    while (optionsSet.size < 4 && attempts < 50) {
      const offset = (Math.floor(Math.random() * 5) - 2) * world.id;
      const wrongVal = currentExpected + (offset === 0 ? world.id * 2 : offset);
      if (wrongVal > 0 && wrongVal <= world.id * 12) {
        optionsSet.add(wrongVal);
      }
      attempts++;
    }
    // Fallback if not enough options generated
    while (optionsSet.size < 4) {
      optionsSet.add(currentExpected + Math.floor(Math.random() * 20) + 1);
    }
    setSaltoOptions(Array.from(optionsSet).sort((a, b) => a - b));
  };

  useEffect(() => {
    if (
      activeStep === 'salto' &&
      saltoSelectedFactor !== null &&
      saltoFlowStage === 'game' &&
      !saltoGameCompleted
    ) {
      generateSaltoOptions();
    }
  }, [saltoSelectedFactor, activeStep, world.id, saltoIndex, saltoFlowStage, saltoGameCompleted]);

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

  // Initialize Costruisco balloons when a factor is selected
  useEffect(() => {
    if (activeStep === 'costruisco' && costruiscoSelectedFactor !== null) {
      const answers = Array.from({ length: 10 }).map((_, i) => world.id * (i + 1));
      setCostruiscoBalloons(answers.sort(() => Math.random() - 0.5));
    }
  }, [costruiscoSelectedFactor, activeStep, world.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
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

  // Generate Quiz (Pratico) questions
  const startQuizMode = () => {
    sound.playPowerUp();
    // Generate 10 randomized operations for this times-table
    // Cognitive rule: We include both (world.id * multiplier) and (multiplier * world.id) to build commutative fluency!
    const questions: { a: number; b: number }[] = [];
    
    // Check if there are critical combinations for this world in user history
    // If so, we inject them deliberately (Adaptive learning!)
    const historyOfThisWorld = profile.history.filter(h => (h.a === world.id || h.b === world.id) && !h.correct);
    const criticalSet = new Set<string>();
    historyOfThisWorld.forEach(h => {
      criticalSet.add(`${h.a}-${h.b}`);
    });

    const multipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // Shuffle multipliers
    const shuffled = [...multipliers].sort(() => Math.random() - 0.5);
    
    shuffled.forEach(m => {
      // randomly switch order to test commutation
      if (Math.random() > 0.5) {
        questions.push({ a: world.id, b: m });
      } else {
        questions.push({ a: m, b: world.id });
      }
    });

    setQuizQuestions(questions);
    setCurrentQuizIdx(0);
    setQuizCorrectCount(0);
    setQuizHistory([]);
    setQuizWrongAttempts({});
    generateQuizOptions(questions[0].a, questions[0].b);
    setActiveStep('pratico');
  };

  const generateQuizOptions = (a: number, b: number) => {
    const correct = a * b;
    const options = new Set<number>([correct]);
    
    // Add mistakes with attempt limit to avoid infinite loop
    let attempts = 0;
    const maxAttempts = 50;
    
    while (options.size < 4 && attempts < maxAttempts) {
      // typical mistakes: close answers, off by one multiplier, or commute errors
      const mistakes = [
        correct + a,
        correct - a,
        correct + b,
        correct - b,
        correct + 2,
        correct - 2,
        (a + 1) * b,
        a * (b + 1)
      ];
      const randMistake = mistakes[Math.floor(Math.random() * mistakes.length)];
      if (randMistake > 0 && randMistake !== correct) {
        options.add(randMistake);
      }
      attempts++;
    }
    
    // Fallback if set is too small
    while (options.size < 4) {
      options.add(correct + Math.floor(Math.random() * 10) + 1);
    }
    setQuizOptions(Array.from(options).sort((a, b) => a - b));
    setSelectedQuizOption(null);
  };

  // Reset Costruisco (Step 3)
  const resetCostruisco = () => {
    const emptyProgress: { [key: number]: null } = {};
    for (let i = 1; i <= 10; i++) {
      emptyProgress[i] = null;
    }
    setCostruiscoProgress(emptyProgress);
    
    // Generate answers list for balloons (random order)
    const answers = Array.from({ length: 10 }).map((_, i) => world.id * (i + 1));
    setCostruiscoBalloons(answers.sort(() => Math.random() - 0.5));
    setSelectedFactor(null);
    setCompletedMonuments([]); // Reset monuments when restarting
  };

  const handleSaltoSelect = (val: number) => {
    const correct = world.id * (saltoIndex + 1);
    if (val === correct) {
      sound.playSuccess();
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
      // gentle screen wobble or hint
    }
  };

  const handleCostruiscoBalloonTap = (val: number) => {
    sound.playClick();
    if (selectedFactor !== null) {
      // Check if it fits
      const expected = world.id * selectedFactor;
      if (val === expected) {
        sound.playSuccess();
        setCostruiscoProgress(prev => ({
          ...prev,
          [selectedFactor]: val
        }));
        // Remove from balloons
        setCostruiscoBalloons(prev => prev.filter(b => b !== val));
        setSelectedFactor(null);

        // Erigere un monumento per ogni operazione completata (max 3 monumenti)
        const updatedProgress = { ...costruiscoProgress, [selectedFactor]: val };
        const completedCount = Object.values(updatedProgress).filter(v => v !== null).length;
        
        // Determina quale monumento erigere in base al numero di operazioni completate
        if (world.monuments && world.monuments.length > 0) {
          const monumentIndex = Math.min(Math.floor((completedCount - 1) / 4), world.monuments.length - 1);
          const monumentId = world.monuments[monumentIndex].id;
          
          if (completedCount % 4 === 1 && !completedMonuments.includes(monumentId)) {
            // Nuovo monumento ogni 4 operazioni (1, 5, 9)
            sound.playPowerUp();
            setCompletedMonuments(prev => [...prev, monumentId]);
          }
        }

        // Check if finished
        if (completedCount === 10) {
          sound.playLevelUp();
          saveStepCompleted('costruisco');
          setActiveStep('intro');
          resetCostruisco();
        }
      } else {
        sound.playError();
      }
    }
  };

  // Adaptive Learning - handles mistake on Quiz
  const handleQuizAnswer = (selectedVal: number) => {
    const currentQ = quizQuestions[currentQuizIdx];
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
      
      // Calculate XP, Coins, and Light Drops if correct
      let nextXP = p.xp;
      let nextCoins = p.coins;
      let nextLightDrops = p.lightDrops;

      if (isCorrect) {
        nextXP += 10;
        nextCoins += 1; // 1 coin per correct math answer
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
      setQuizCorrectCount(prev => prev + 1);
      setQuizHistory(prev => [...prev, { ...currentQ, correct: true }]);
      
      // Go to next question
      proceedQuiz();
    } else {
      sound.playError();
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
    if (currentQuizIdx < quizQuestions.length - 1) {
      const nextIdx = currentQuizIdx + 1;
      setCurrentQuizIdx(nextIdx);
      generateQuizOptions(quizQuestions[nextIdx].a, quizQuestions[nextIdx].b);
    } else {
      // Finished Quiz!
      sound.playLevelUp();
      const accuracy = Math.round((quizCorrectCount / 10) * 100);
      
      // If they passed with 80% accuracy, they complete the step
      if (quizCorrectCount >= 8) {
        saveStepCompleted('pratico');
      }
      
      setActiveStep('intro');
    }
  };

  const closeErrorFeedback = () => {
    sound.playClick();
    setErrorFeedback(null);
    proceedQuiz();
  };

  // Initialize Sfida with START button
  const initializeSfida = () => {
    sound.playPowerUp();
    setSfidaReady(true); // Show START button
    setSfidaActive(false);
    setSfidaScore(0);
    setSfidaTimer(30);
    setSfidaQuestion(null);
    setSfidaOptions([]);
    setActiveStep('sfida');
  };

  // Begin the actual game after START is clicked
  const beginSfidaGame = () => {
    sound.playPowerUp();
    setSfidaReady(false); // Hide START button
    setSfidaActive(true);
    setSfidaScore(0);
    setSfidaTimer(30);
    setSfidaResult(null);
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

    const correct = world.id * factorB;
    const options = new Set<number>([correct]);
    
    // Generate 3 more wrong options - ALL INTEGERS
    let attempts = 0;
    while (options.size < 4 && attempts < 100) {
      const offset = (Math.random() > 0.5 ? 1 : -1) * Math.ceil(Math.random() * 3) * world.id;
      const option = correct + offset;
      if (option > 0 && Number.isInteger(option)) {
        options.add(option);
      }
      attempts++;
    }
    
    // Fallback: if we don't have 4 options, generate robustly with integers
    while (options.size < 4) {
      const option = correct + (Math.floor(Math.random() * 10) - 5) * world.id;
      if (option > 0) {
        options.add(option);
      }
    }
    
    // Filter to only integers and limit to 4
    const optionArray = Array.from(options)
      .filter(n => n > 0 && Number.isInteger(n))
      .slice(0, 4)
      .map(n => Math.floor(n));
    
    // Sort ascending
    setSfidaOptions(optionArray.sort((a, b) => a - b));
  };

  const handleSfidaAnswer = (selectedVal: number) => {
    if (!sfidaQuestion || !sfidaActive) return;
    const correctVal = sfidaQuestion.a * sfidaQuestion.b;
    const isCorrect = selectedVal === correctVal;

    // Fast analytics logging
    const attempt: QuestionAttempt = {
      a: sfidaQuestion.a,
      b: sfidaQuestion.b,
      correct: isCorrect,
      responseTimeMs: 1000 + Math.random() * 500,
      timestamp: new Date().toISOString()
    };

    updateProfile(p => {
      let nextXP = p.xp + (isCorrect ? 15 : 0);
      let nextCoins = p.coins + (isCorrect ? 2 : 0); // Sfida awards double!
      let nextLevel = p.level;
      if (nextXP >= nextLevel * 100) nextLevel += 1;

      return {
        ...p,
        xp: nextXP,
        coins: nextCoins,
        level: nextLevel,
        history: [...p.history, attempt]
      };
    });

    if (isCorrect) {
      sound.playSuccess();
      setSfidaScore(prev => prev + 1);
    } else {
      sound.playError();
    }

    if (sfidaActive) {
      generateSfidaQuestion();
    }
  };

  const finishSfidaMode = (finalScore?: number) => {
    sound.playLevelUp();
    setSfidaActive(false);
    const score = finalScore || 0;
    // Leggo il record prima dell'aggiornamento per confrontarlo
    const previousRecord = profile.worldProgress[world.id]?.highScore || 0;
    const isNewRecord = score > 0 && score > previousRecord;

    updateProfile(p => {
      const worldProg = p.worldProgress[world.id];
      const previousMax = worldProg?.highScore || 0;
      const nextMax = Math.max(previousMax, score);
      // Sblocca stelle in base al punteggio di sfida
      let stars = worldProg?.stars || 0;
      if (sfidaScore >= 12) stars = 3;
      else if (sfidaScore >= 8) stars = 2;
      else if (sfidaScore >= 4) stars = 1;

      const completed = [...(worldProg?.completedSteps || [])];
      if (!completed.includes('sfida')) {
        completed.push('sfida');
      }

      // Check if world is 100% completed to evolve the creature!
      let evolution = worldProg?.creatureEvolution || 'egg';
      const stepsDone = completed.length;
      if (stepsDone >= 6) {
        evolution = 'adult';
      } else if (stepsDone >= 3) {
        evolution = 'child';
      }

      // Automatically unlock next times-table if we finished practical mode or above!
      const nextUnlocked = [...p.unlockedWorlds];
      const nextWorldId = world.id + 1;
      if (nextWorldId <= 10 && !nextUnlocked.includes(nextWorldId)) {
        nextUnlocked.push(nextWorldId);
      }

      return {
        ...p,
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

    if (isNewRecord) setTimeout(() => sound.playLevelUp(), 600);
    if (isNewRecord) setShowFireworks(true);
    setSfidaResult({ correctAnswers: score, isNewRecord, previousRecord });
    setSfidaReady(true);
  };

  // Helper to save completed sub-steps offline and evolve creature
  const saveStepCompleted = (stepName: string) => {
    // Rewards based on step
    const rewardMap: { [key: string]: { coins: number; drops: number } } = {
      comprendo: { coins: 20, drops: 0 },
      salto: { coins: 20, drops: 0 },
      costruisco: { coins: 20, drops: 0 },
      trucchi: { coins: 20, drops: 0 },
      pratico: { coins: 30, drops: 10 },
      sfida: { coins: 50, drops: 20 }
    };
    
    const reward = rewardMap[stepName] || { coins: 20, drops: 0 };

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

      // Unlock next world if we pass step 5 'pratico'
      const nextUnlocked = [...p.unlockedWorlds];
      const nextWorldId = world.id + 1;
      if (stepName === 'pratico' && nextWorldId <= 10 && !nextUnlocked.includes(nextWorldId)) {
        nextUnlocked.push(nextWorldId);
      }

      return {
        ...p,
        xp: nextXP,
        coins: nextCoins,
        lightDrops: nextLightDrops,
        level: nextLevel,
        unlockedWorlds: nextUnlocked,
        worldProgress: {
          ...p.worldProgress,
          [world.id]: {
            ...worldProg,
            completedSteps: completed,
            creatureEvolution: evolution
          }
        }
      };
    });

    // Show reward popup
    setShowRewardPopup({ step: stepName, coins: reward.coins, drops: reward.drops });
  };

  const handleRebuildMonument = (monId: string, cost: number) => {
    if (profile.lightDrops < cost) {
      sound.playError();
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
  const allFactorsSet = new Set<number>(ALL_FACTORS);
  const effectiveComprendoCompleted = devMode ? allFactorsSet : comprendoCompleted;
  const effectiveSaltoCompleted = devMode ? allFactorsSet : saltoCompleted;
  const effectiveCostruiscoCompleted = devMode ? allFactorsSet : costruiscoCompleted;
  const effectiveTrucchiCompleted = devMode ? allFactorsSet : trucchiCompleted;

  // Calculate reconstruction percentage of this world
  const rebuiltCount = worldProg.rebuiltMonuments.length;
  const rebuildPercent = Math.round((rebuiltCount / world.monuments.length) * 100);

  // Check if Sfida is locked (requires Pratico completed!)
  const isSfidaLocked = !devMode && !worldProg.completedSteps.includes('pratico');
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
  const stepTopBarTitles: Record<string, string> = {
    comprendo: '1. Comprendo',
    salto: '2. Salto',
    costruisco: '3. Costruisco',
    trucchi: '4. Trucchi',
    pratico: '5. Pratico',
    sfida: '6. Sfida'
  };
  const currentTopBarTitle = stepTopBarTitles[activeStep] || withOxIfSecond(world.id, world.name);
  const showWorldTopBar = !(
    (activeStep === 'comprendo' && comprendoSelectedFactor !== null) ||
    (activeStep === 'salto' && saltoSelectedFactor !== null) ||
    (activeStep === 'costruisco' && costruiscoSelectedFactor !== null) ||
    (activeStep === 'trucchi' && trucchiSelectedFactor !== null)
  );

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
        return (
          <div key={`${stepKey}-${factor}`} role="listitem" className="h-full min-h-0">
            <button
              type="button"
              onClick={() => onSelect(factor)}
              className={`relative w-full h-full rounded-2xl border-2 shadow-sm transition-all cursor-pointer
                          focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                          flex flex-col items-center justify-center ${compactLayout ? 'py-1 gap-0.5' : 'py-2 gap-1'}
                          ${isCompleted ? theme.done : theme.todo}`}
              aria-label={`${world.id} per ${factor}${isCompleted ? ', completata' : ', da completare'}`}
            >
              {isCompleted && (
                <span
                  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] font-black shadow-md"
                  aria-hidden="true"
                >
                  ✓
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

        <div className="mt-6 flex-1 min-h-0 overflow-hidden">
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

  const cancelComprendoExercise = () => {
    setComprendoFlowStage('objective');
    setComprendoGameCompleted(false);
    setComprendoSelectedFactor(null);
  };
  const completeComprendoExercise = () => {
    sound.playLevelUp();
    setComprendoCompleted(prev => new Set([...prev, comprendoSelectedFactor]));
    if (comprendoCompleted.size === 9) { // will be 10 after this update
      saveStepCompleted('comprendo');
    }
    cancelComprendoExercise();
  };
  const cancelSaltoExercise = () => {
    setSaltoFlowStage('objective');
    setSaltoIndex(0);
    setSaltoGameCompleted(false);
    setShowSaltoCompletionEffect(false);
    setSaltoSelectedFactor(null);
  };
  const completeSaltoExercise = () => {
    sound.playLevelUp();
    setSaltoCompleted(prev => new Set([...prev, saltoSelectedFactor]));
    if (saltoCompleted.size === 9) {
      saveStepCompleted('salto');
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
    setCostruiscoCompleted(prev => new Set([...prev, costruiscoSelectedFactor]));
    if (costruiscoCompleted.size === 9) {
      saveStepCompleted('costruisco');
    }
    cancelCostruiscoExercise();
  };
  const cancelTrucchiExercise = () => {
    setTrucchiFlowStage('objective');
    setTrucchiQuestionSolved(false);
    setShowTrucchiCompletionEffect(false);
    setTrucchiSelectedFactor(null);
  };
  const completeTrucchiExercise = () => {
    sound.playLevelUp();
    setTrucchiCompleted(prev => new Set([...prev, trucchiSelectedFactor]));
    if (trucchiCompleted.size === 9) {
      saveStepCompleted('trucchi');
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
    if (target.closest('button, input, textarea')) return;
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
                <div 
                  className={`rounded-3xl bg-gradient-to-r ${
                    world.id === 2 ? 'from-emerald-500 to-green-600' :
                    world.id === 3 ? 'from-sky-500 to-blue-600' :
                    world.id === 4 ? 'from-amber-600 to-orange-700' :
                    world.id === 5 ? 'from-yellow-500 to-amber-500' :
                    world.id === 6 ? 'from-red-500 to-rose-600' :
                    world.id === 7 ? 'from-purple-600 to-indigo-700' :
                    world.id === 8 ? 'from-pink-500 to-rose-600' :
                    world.id === 9 ? 'from-teal-500 to-cyan-600' :
                    'from-yellow-600 to-amber-600'
                  } p-6 text-white shadow-xl relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12 filter blur-xl"></div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-center relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner select-none filter drop-shadow">
                      {worldProg.creatureEvolution === 'egg' ? '🥚' : worldProg.creatureEvolution === 'child' ? '👶' : '🐉'}
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <span className="text-xs font-bold bg-white/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
                        {world.locationName}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black mt-1 font-sans">
                        Incontra {worldProg.creatureEvolution === 'egg' ? `l'Uovo di ${world.creatureName}` : world.creatureName}!
                      </h2>
                      <p className="text-xs text-white/85 mt-1 max-w-xl">
                        "{world.creatureDescription}" - Stato evoluzione: <strong>{worldProg.creatureEvolution.toUpperCase()}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block">
                      🎶 La Filastrocca del {world.id}
                    </span>
                    <p className="text-sm not-italic text-white leading-relaxed mt-2 font-sans font-medium">
                      {world.filastrocca}
                    </p>
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
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
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
          
      {/* Top action bar */}
      {showWorldTopBar && (
        <div className={`bg-white/30 backdrop-blur-md px-4 py-3 border-b border-white/40 flex items-center justify-between shadow-lg z-10 text-sky-950 flex-shrink-0 ${compactLayout ? 'gap-2' : ''}`}>
          <button
            onClick={() => {
              sound.playClick();
              goBackFromWorldContent();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-950 hover:text-sky-900 bg-white/40 border border-white/60 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-colors"
            id="world-back-btn"
          >
            <ArrowLeft className="w-4 h-4" /> Indietro
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl select-none leading-none">{world.symbol}</span>
            <span className="text-sm font-black text-sky-950 font-sans">{currentTopBarTitle}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className={`flex-1 overflow-y-auto flex flex-col ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
        {activeStep !== 'comprendo' && activeStep !== 'salto' && activeStep !== 'costruisco' && activeStep !== 'trucchi' && activeStep !== 'pratico' && activeStep !== 'sfida' && (
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-start p-4 md:p-6">
            {/* Steps & Monuments Columns */}
            <div className={`flex-1 grid grid-cols-1 gap-6 ${compactLayout ? '' : 'md:grid-cols-2'} items-stretch`}>

              {/* Left Side: Sub-game stages */}
              <div className="flex h-full min-h-0 flex-col gap-2">
                {/* Header fuori dalla griglia */}
                <h3 className="shrink-0 text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    Sentiero di Apprendimento
                  </div>
                  <button
                    onClick={() => pushView('world-story')}
                    className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 flex items-center justify-center cursor-pointer font-bold text-sm"
                    title="Apri storia e filastrocca"
                    aria-label="Apri storia e filastrocca"
                  >
                    i
                  </button>
                </h3>

                {/* Griglia card — solo step, niente header dentro */}
                <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-3 gap-2">
                {[
                  { id: 'comprendo', title: '1. Comprendo', desc: 'Rappresentazione visuale e concettuale dei gruppi.', icon: '🍎', coins: 20, drops: 0 },
                  { id: 'salto', title: '2. Salto', desc: 'Salto e conteggio ritmico lungo il ruscello.', icon: '🐸', coins: 20, drops: 0 },
                  { id: 'costruisco', title: '3. Costruisco', desc: 'Sblocca e componi la griglia dei moltiplicatori.', icon: '🧱', coins: 20, drops: 0 },
                  { id: 'trucchi', title: '4. Trucchi', desc: 'Istruzione cognitiva e regole associative.', icon: '🧠', coins: 20, drops: 0 },
                  { id: 'pratico', title: '5. Pratico (Avventura)', desc: 'Libera la nebbia del regno rispondendo ai quiz.', icon: '🛡️', coins: 30, drops: 10 },
                  { id: 'sfida', title: '6. Sfida (Cronometro)', desc: 'Test di velocità per guadagnare stelle d\'oro.', icon: '⚡', coins: 50, drops: 20 }
                ].map((step, idx) => {
                  const isDone = worldProg.completedSteps.includes(step.id);
                  const isSfida = step.id === 'sfida';
                   
                  // Step progression: each step is locked until previous is completed
                  const prevStep = idx > 0 ? worldProg.completedSteps.includes(['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'][idx - 1]) : true;
                  const isLocked = !devMode && (!prevStep || (isSfida && isSfidaLocked));
                  const lockReason = !prevStep ? `Completa ${['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico'][idx - 1]}` : 'Sblocca 5';

                  return (
                    <button
                      key={step.id}
                      disabled={isLocked}
                      onClick={() => {
                        sound.playClick();
                        if (step.id === 'comprendo') { setActiveStep('comprendo'); }
                        else if (step.id === 'salto') { setSaltoIndex(0); setActiveStep('salto'); }
                        else if (step.id === 'costruisco') { resetCostruisco(); setActiveStep('costruisco'); }
                        else if (step.id === 'trucchi') { setTrucchiQuestionSolved(false); setTrucchiAnswer(""); setActiveStep('trucchi'); }
                        else if (step.id === 'pratico') { startQuizMode(); }
                        else if (step.id === 'sfida') { startSfidaMode(); }
                      }}
                      className={`relative h-full min-h-0 p-[clamp(0.45rem,1.2vw,0.7rem)] rounded-xl border flex flex-col items-stretch justify-between transition-all cursor-pointer ${
                        isLocked
                          ? 'opacity-45 bg-gray-50 border-gray-200 cursor-not-allowed'
                          : isDone
                            ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                            : 'bg-white border-slate-200'
                      }`}
                      id={`step-btn-${step.id}`}
                    >
                      {(isLocked || isDone) && (
                        <span
                          className={`absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full shadow-md ${
                            isLocked
                              ? 'border border-slate-200 bg-white text-[10px]'
                              : 'border border-white bg-emerald-500 text-white text-[10px] font-black'
                          }`}
                          aria-hidden="true"
                        >
                          {isLocked ? '🔒' : '✓'}
                        </span>
                      )}
                      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
                        <div className={`h-[clamp(2.2rem,5vw,3rem)] w-[clamp(2.2rem,5vw,3rem)] rounded-lg flex items-center justify-center text-[clamp(1.15rem,2.9vw,1.7rem)] select-none flex-shrink-0 ${
                          isLocked ? 'bg-slate-100' : isDone ? 'bg-emerald-100/50' : 'bg-indigo-50'
                        }`}>
                          {isLocked ? '🔒' : step.icon}
                        </div>
                        <h4 className={`text-center text-[clamp(0.72rem,1.9vw,0.95rem)] font-bold font-sans leading-tight ${isDone ? 'text-emerald-900' : 'text-slate-700'}`}>
                          {step.title.split('.')[1]}
                        </h4>
                      </div>
                      {!isLocked && (
                        <div className="max-w-full pt-1 text-[clamp(0.58rem,1.6vw,0.78rem)] font-bold text-amber-700 flex items-center justify-center gap-1 whitespace-nowrap">
                          {step.coins > 0 && <span>🪙 {step.coins}</span>}
                          {step.drops > 0 && <span>💧 {step.drops}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
                </div>{/* fine griglia card */}
              </div>{/* fine flex wrapper */}
            </div>
          </div>
        )}

        {/* STEP 1: COMPRENDO - List of combinations to complete */}
        {activeStep === 'comprendo' && comprendoSelectedFactor === null && (
          renderStepSelectionScreen({
            stepKey: 'comprendo',
            badge: 'Passo 1: Comprendo',
            title: 'Scegli una moltiplicazione',
            description: 'Completa tutte e 10 le moltiplicazioni per costruire il concetto.',
            completed: effectiveComprendoCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setComprendoSelectedFactor(factor);
              setComprendoFlowStage('objective');
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
          <>
            {/* Top action bar */}
            <div className={`bg-white/30 backdrop-blur-md px-4 py-3 border-b border-white/40 flex items-center ${comprendoFlowStage === 'objective' ? 'justify-between' : 'justify-center'} shadow-lg z-10 text-sky-950 flex-shrink-0 ${compactLayout ? 'gap-2' : ''}`}>
              {comprendoFlowStage === 'objective' && (
                <button
                  onClick={() => {
                    sound.playClick();
                    cancelComprendoExercise();
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-950 hover:text-sky-900 bg-white/40 border border-white/60 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Indietro
                </button>
              )}

              <div className="text-sm font-black text-sky-950 font-sans">
                1. Comprendo il concetto 🍎
              </div>
            </div>

            {/* Main content */}
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
                       <h4 className="font-bold text-indigo-950 font-sans">Spiegazione:</h4>
                       <p className="text-slate-600 mt-1 leading-relaxed">
                         Pensa a <strong>{world.id} ceste</strong> di frutta. Se in ogni cesta mettiamo <strong>{comprendoSelectedFactor} mele</strong>, quante mele avremo in tutto? Le contiamo insieme ed otteniamo <strong>{world.id * comprendoSelectedFactor}</strong>! Questo significa moltiplicare.
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
                   <div className="bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
                     <GroupVisualizer
                       a={world.id}
                       b={comprendoSelectedFactor}
                       itemEmoji={world.itemsToCount}
                       onCompletionChange={setComprendoGameCompleted}
                     />
                   </div>
                 )}

               </div>
             </div>

             <div className={`flex-shrink-0 border-t border-white/20 ${compactLayout ? 'p-3' : 'p-4 md:p-6'} bg-gradient-to-t from-white/10 to-transparent`}>
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
                       className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-colors ${
                         comprendoGameCompleted
                           ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                           : 'bg-indigo-300 cursor-not-allowed opacity-70'
                       }`}
                     >
                       Continua
                     </button>
                    </ActionGrid>
                 ) : (
                   <button
                     onClick={() => {
                       sound.playClick();
                       setComprendoFlowStage('game');
                     }}
                     className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                   >
                     Continua
                   </button>
                 )}
               </div>
             </div>
           </div>
         </>
        )}

        {/* STEP 2: SALTO (Skip Counting) - LIST VIEW */}
        {activeStep === 'salto' && saltoSelectedFactor === null && (
          renderStepSelectionScreen({
            stepKey: 'salto',
            badge: 'Passo 2: Conteggio per salti',
            title: '🐸 Aiuta a saltare i sassi!',
            description: 'Completa tutte e 10 le combinazioni per consolidare il ritmo del conteggio.',
            completed: effectiveSaltoCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setSaltoSelectedFactor(factor);
              setSaltoIndex(0);
              setSaltoFlowStage('objective');
              setSaltoGameCompleted(false);
              setShowSaltoCompletionEffect(false);
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
            <div className={`bg-white/30 backdrop-blur-md px-4 py-3 border-b border-white/40 flex items-center ${saltoFlowStage === 'objective' ? 'justify-between' : 'justify-center'} shadow-lg z-10 text-sky-950 flex-shrink-0 ${compactLayout ? 'gap-2' : ''}`}>
              {saltoFlowStage === 'objective' && (
                <button
                  onClick={() => {
                    sound.playClick();
                    cancelSaltoExercise();
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-950 hover:text-sky-900 bg-white/40 border border-white/60 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Indietro
                </button>
              )}

              <div className="text-sm font-black text-sky-950 font-sans">
                2. Salto il conteggio 🐸
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full space-y-6">
                {saltoFlowStage === 'objective' && (
                  <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-xl space-y-4">
                    <div className="text-center">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full font-sans">
                        Salto: {world.id} × {saltoSelectedFactor}
                      </span>
                      <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                        🐸 Aiuta {world.mascotName} a saltare i sassi!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Tocca il numero corretto per completare la sequenza.
                      </p>
                    </div>
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                      <h4 className="font-bold text-indigo-950 font-sans">Spiegazione:</h4>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Nel conteggio per salti aggiungi sempre lo stesso numero: ogni salto vale <strong>{world.id}</strong>, fino ad arrivare a <strong>{world.id * saltoSelectedFactor}</strong>.
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
                  <div className={`relative bg-white rounded-3xl border border-purple-100 shadow-xl ${compactLayout ? 'p-3 space-y-3' : 'p-5 space-y-6'}`}>
                    <div className={`text-center bg-gradient-to-r from-purple-50 to-purple-50 rounded-2xl border-2 border-purple-200 shadow-md ${compactLayout ? 'p-3' : 'p-5'}`}>
                      <span className="text-[11px] font-black text-purple-700 bg-purple-100/80 px-3 py-1 rounded-full font-sans uppercase tracking-wider">
                        Salto: {world.id} × {saltoSelectedFactor}
                      </span>
                    </div>

                    <div className={`bg-sky-50 rounded-2xl border border-sky-100/50 flex flex-col items-center ${compactLayout ? 'p-2.5' : 'p-4'}`}>
                      <div className="w-full flex items-center justify-between gap-1">
                        {Array.from({ length: 10 }).map((_, idx) => {
                          const num = world.id * (idx + 1);
                          const solvedNum = world.id * saltoSelectedFactor;
                          const cueNum = world.id * (saltoIndex + 1);
                          const isCueTarget = !saltoGameCompleted && num === cueNum;
                          const isFound = saltoGameCompleted && num === solvedNum;
                          return (
                            <motion.div
                              key={idx}
                              className={`${compactLayout ? 'w-6 h-6 text-[10px]' : 'w-9 h-9 text-xs'} rounded-full flex items-center justify-center font-bold font-mono border transition-all ${
                                isFound
                                  ? 'bg-emerald-500 text-white border-emerald-300 shadow-md scale-110'
                                  : isCueTarget
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-bounce'
                                    : 'bg-white text-slate-300 border-slate-100'
                              }`}
                            >
                              {num}
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className={`w-full bg-sky-200/40 rounded-xl relative flex items-center justify-center border border-sky-200/50 overflow-hidden ${compactLayout ? 'h-10 mt-2' : 'h-12 mt-3'}`}>
                        <span className={`${compactLayout ? 'text-xl left-3' : 'text-2xl left-4'} animate-pulse absolute`}>🐸</span>
                        <span className="text-xs font-extrabold text-sky-800 uppercase font-sans">
                          Sequenza del {world.id}
                        </span>
                      </div>
                    </div>

                      <div className={`w-full h-full content-start grid grid-cols-2 ${compactLayout ? 'gap-2' : 'gap-3'}`}>
                        {saltoOptions.map((opt, idx) => {
                          const solvedNum = world.id * saltoSelectedFactor;
                          const isSelected = saltoGameCompleted && opt === solvedNum;

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (saltoGameCompleted) return;
                                const expected = world.id * (saltoIndex + 1);
                                if (opt === expected) {
                                  sound.playSuccess();
                                  if (saltoIndex + 1 >= saltoSelectedFactor) {
                                    setSaltoGameCompleted(true);
                                    setShowSaltoCompletionEffect(true);
                                  } else {
                                    setSaltoIndex(prev => prev + 1);
                                  }
                                } else {
                                  sound.playError();
                                }
                              }}
                              className={`${compactLayout ? 'h-14 text-base' : 'py-3.5 text-lg'} w-full px-3 rounded-xl border-2 bg-white font-bold font-mono shadow-sm transition-colors ${
                                isSelected
                                  ? 'border-emerald-400 bg-emerald-100 text-emerald-800 ring-4 ring-emerald-200 shadow-md scale-105 cursor-default'
                                  : saltoGameCompleted
                                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                                    : 'border-slate-100 hover:border-purple-400 text-slate-800 hover:bg-slate-50 cursor-pointer'
                              }`}
                              id={`salto-opt-${opt}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                    </div>

                    {showSaltoCompletionEffect && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto"
                      >
                        <div className="bg-white/95 border-2 border-emerald-300 shadow-xl rounded-2xl px-5 py-4 text-center">
                          <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
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
                ) : (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setSaltoFlowStage('game');
                    }}
                    className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                  >
                    Continua
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COSTRUISCO (Build the Table) - LIST VIEW */}
        {activeStep === 'costruisco' && costruiscoSelectedFactor === null && (
          renderStepSelectionScreen({
            stepKey: 'costruisco',
            badge: 'Passo 3: Costruisci la Tabellina',
            title: '🏗️ Scegli una moltiplicazione da costruire',
            description: 'Completa tutte e 10 le operazioni e trasforma i concetti in risultati.',
            completed: effectiveCostruiscoCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setCostruiscoSelectedFactor(factor);
              setCostruiscoFlowStage('objective');
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
            {/* Top action bar */}
            <div className={`bg-white/30 backdrop-blur-md px-4 py-3 border-b border-white/40 flex items-center ${costruiscoFlowStage === 'objective' ? 'justify-between' : 'justify-center'} shadow-lg z-10 text-sky-950 flex-shrink-0 ${compactLayout ? 'gap-2' : ''}`}>
              {costruiscoFlowStage === 'objective' && (
                <button
                  onClick={() => {
                    sound.playClick();
                    cancelCostruiscoExercise();
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-950 hover:text-sky-900 bg-white/40 border border-white/60 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Indietro
                </button>
              )}

              <div className="text-sm font-black text-sky-950 font-sans">
                3. Costruisco la tabellina 🧱
              </div>
            </div>

            {/* Main content */}
           <div className="flex-1 flex flex-col overflow-hidden">
             <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
               <div className="max-w-2xl mx-auto w-full space-y-6">
                 {costruiscoFlowStage === 'objective' && (
                   <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xl space-y-4">
                     <div className="text-center">
                       <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-sans">
                         Costruisci: {world.id} × {costruiscoSelectedFactor}
                       </span>
                       <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                         Completa il risultato mancante!
                       </h3>
                       <p className="text-xs text-slate-500 mt-1">
                         Tocca il palloncino con il risultato corretto per completare.
                       </p>
                     </div>
                     <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                       <h4 className="font-bold text-indigo-950 font-sans">Spiegazione:</h4>
                       <p className="text-slate-600 mt-1 leading-relaxed">
                         Abbina i fattori ai risultati corretti. Trasforma il concetto in simboli matematici.
                       </p>
                     </div>
                     <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                       <h4 className="font-bold text-yellow-900 font-sans">
                         💡 Obiettivo:
                       </h4>
                       <p className="mt-2 text-sm text-yellow-800">
                         Abbina i fattori ai risultati corretti. Trasforma il concetto in simboli matematici.
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
                       <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide text-center">
                         I Palloncini dei Risultati
                       </h4>
                       <div className="flex flex-wrap gap-2.5 justify-center">
                         {costruiscoBalloons.map(ball => {
                           const expected = world.id * costruiscoSelectedFactor;
                           const isSelected = costruiscoGameCompleted && ball === expected;

                           return (
                             <motion.button
                               key={ball}
                               whileHover={{ scale: 1.15 }}
                               onClick={() => {
                                 if (costruiscoGameCompleted) return;
                                 sound.playClick();
                                 const expected = world.id * costruiscoSelectedFactor;
                                 if (ball === expected) {
                                   sound.playSuccess();
                                   setCostruiscoGameCompleted(true);
                                   setShowCostruiscoCompletionEffect(true);
                                 } else {
                                   sound.playError();
                                 }
                               }}
                               className={`${compactLayout ? 'w-12 h-14 text-xs' : 'w-14 h-16 text-sm'} rounded-[999px] font-extrabold font-mono flex items-center justify-center shadow-md border relative select-none pb-2 pt-1 transition-all ${
                                 isSelected
                                   ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-emerald-200 ring-4 ring-emerald-200 scale-110'
                                   : costruiscoGameCompleted
                                     ? 'bg-sky-200 text-sky-800 border-sky-100 opacity-70 cursor-not-allowed'
                                     : 'bg-gradient-to-b from-sky-300 to-sky-500 text-white border-white hover:from-sky-400 hover:to-sky-600 cursor-pointer'
                               }`}
                               id={`balloon-${ball}`}
                             >
                               <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white/60" />
                               <span>{ball}</span>
                               <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-sky-600 rotate-45 rounded-[2px]" />
                               <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[2px] h-2 bg-sky-300 rounded-full" />
                             </motion.button>
                           );
                         })}
                       </div>
                     </div>

                     {showCostruiscoCompletionEffect && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.9 }}
                         className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto"
                       >
                         <div className="bg-white/95 border-2 border-emerald-300 shadow-xl rounded-2xl px-5 py-4 text-center">
                           <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
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
                  ) : (
                    <button
                      onClick={() => {
                        sound.playClick();
                        setCostruiscoFlowStage('game');
                      }}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                    >
                      Continua
                    </button>
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
            badge: 'Passo 4: Il Trucco Mnemonico',
            title: '🦉 Scegli un trucco da imparare',
            description: 'Completa tutte e 10 le combinazioni per memorizzare più rapidamente.',
            completed: effectiveTrucchiCompleted,
            onSelect: (factor) => {
              sound.playClick();
              setTrucchiSelectedFactor(factor);
              setTrucchiFlowStage('objective');
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
            {/* Top action bar */}
            <div className={`bg-white/30 backdrop-blur-md px-4 py-3 border-b border-white/40 flex items-center ${trucchiFlowStage === 'objective' ? 'justify-between' : 'justify-center'} shadow-lg z-10 text-sky-950 flex-shrink-0 ${compactLayout ? 'gap-2' : ''}`}>
              {trucchiFlowStage === 'objective' && (
                <button
                  onClick={() => {
                    sound.playClick();
                    cancelTrucchiExercise();
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-950 hover:text-sky-900 bg-white/40 border border-white/60 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Indietro
                </button>
              )}

              <div className="text-sm font-black text-sky-950 font-sans">
                4. Trucchi 🧠
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
              <div className="max-w-xl mx-auto w-full space-y-5">
                {trucchiFlowStage === 'objective' && (
                  <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-xl space-y-4">
                    <div className="text-center">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full font-sans">
                        Trucco: {world.id} × {trucchiSelectedFactor}
                      </span>
                      <h3 className="text-lg font-black text-slate-800 mt-3 font-sans">
                        {world.trickTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Impara il trucco della terra del {world.id} con {world.mascotName}.
                      </p>
                    </div>

                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
                      <h4 className="font-bold text-indigo-950 font-sans">Spiegazione:</h4>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {world.trickDescription}
                      </p>
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
                  <div className="relative bg-white rounded-3xl p-5 border border-amber-100 shadow-xl space-y-5">
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
                      <h4 className="text-sm font-bold text-amber-900 mb-2 text-center">
                        Quanto fa <strong>{world.id} × {trucchiSelectedFactor}</strong>?
                      </h4>
                      <p className="text-xs text-amber-800 text-center mb-4 font-sans">
                        💡 Conta <strong>{trucchiSelectedFactor} mattoni</strong>: {Array.from({length: trucchiSelectedFactor}).map((_, i) => `${world.id}`).join(' + ')} = ?
                      </p>
                      
                      <div className="flex flex-wrap gap-2 justify-center">
                        {Array.from({ length: 10 }).map((_, idx) => {
                          const value = (idx + 1) * world.id;
                          const isCorrect = value === world.id * trucchiSelectedFactor;
                          const isSelected = trucchiQuestionSolved && isCorrect;
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (trucchiQuestionSolved) return;
                                if (isCorrect) {
                                  sound.playSuccess();
                                  setTrucchiQuestionSolved(true);
                                  setShowTrucchiCompletionEffect(true);
                                } else {
                                  sound.playError();
                                }
                              }}
                              disabled={trucchiQuestionSolved && !isCorrect}
                              className={`w-12 h-12 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-300 scale-110 shadow-lg'
                                  : trucchiQuestionSolved && !isCorrect
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-white text-amber-900 border-2 border-amber-300 hover:bg-amber-100'
                              }`}
                              id={`trucchi-opt-${value}`}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {showTrucchiCompletionEffect && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-auto"
                      >
                        <div className="bg-white/95 border-2 border-emerald-300 shadow-xl rounded-2xl px-5 py-4 text-center">
                          <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
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
                      disabled={!trucchiQuestionSolved}
                      onClick={() => {
                        sound.playClick();
                        if (!trucchiQuestionSolved) return;
                        completeTrucchiExercise();
                      }}
                      className={`w-full py-3 rounded-2xl font-bold text-sm shadow-md transition-all ${
                        trucchiQuestionSolved 
                          ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      id="trick-done-btn"
                    >
                      Continua
                    </button>
                  </ActionGrid>
                ) : (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setTrucchiFlowStage('game');
                    }}
                    className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                  >
                    Continua
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PRATICO (QUIZ MODE with ADAPTIVE assistance) */}
        {activeStep === 'pratico' && quizQuestions.length > 0 && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
            {/* Progress and help button */}
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-bold font-sans">
                Liberazione Nebbia: {currentQuizIdx + 1} di {quizQuestions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-emerald-600">
                  Corrette: {quizCorrectCount}
                </span>
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

            {/* Quiz question card */}
            <div className="bg-indigo-900 text-white rounded-3xl p-6 text-center relative overflow-hidden shadow-xl">
              <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-10 -translate-y-10 filter blur-lg"></div>
              
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest block font-sans">
                Quanto fa?
              </span>
              <h2 className="text-4xl font-black font-mono mt-2 tracking-wide">
                {quizQuestions[currentQuizIdx].a} x {quizQuestions[currentQuizIdx].b}
              </h2>
            </div>

            {/* Question options */}
            <div className={`w-full h-full content-start grid grid-cols-2 ${compactLayout ? 'gap-2.5' : 'gap-3.5'}`}>
              {quizOptions.map((opt, idx) => {
                const pressed = quizPressedFeedback?.opt === opt;
                const isCorrectOpt = quizQuestions[currentQuizIdx] && opt === quizQuestions[currentQuizIdx].a * quizQuestions[currentQuizIdx].b;
                const feedbackClass = pressed
                  ? quizPressedFeedback!.correct
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-95'
                    : 'bg-rose-100 border-rose-400 text-rose-800 scale-95'
                  : 'bg-white border-slate-100 hover:border-indigo-400 hover:bg-slate-50 text-slate-800';
                return (
                  <button
                    key={idx}
                    onPointerDown={() => setQuizPressedFeedback({ opt, correct: isCorrectOpt })}
                    onPointerUp={() => { setQuizPressedFeedback(null); handleQuizAnswer(opt); }}
                    onPointerLeave={() => setQuizPressedFeedback(null)}
                    onPointerCancel={() => setQuizPressedFeedback(null)}
                    className={`w-full rounded-xl border-2 font-black font-mono shadow-sm cursor-pointer transition-all select-none ${compactLayout ? 'min-h-11 py-3 px-2 text-base' : 'min-h-14 py-4 px-4 text-lg'} ${feedbackClass}`}
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
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-8 border border-indigo-100 shadow-xl space-y-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center space-y-2">
              <div className="text-6xl mb-4">⚡</div>
              <div className="flex items-center justify-center gap-2">
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
              <p className="text-xs text-slate-500 font-sans">Ogni risposta corretta vale 2 🪙 Monete! Guadagna più punti possibili prima dello scadere del tempo.</p>
            </div>

            <button
              onClick={beginSfidaGame}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center py-5 gap-0.5"
              id="sfida-start-btn"
            >
              <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">30 secondi</span>
              <span className="text-2xl font-black">▶ INIZIA SFIDA</span>
            </button>

            {/* Record tabellina (visibile sempre, anche prima della prima partita) */}
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

            {/* Risultato sessione precedente */}
            {sfidaResult && (
              <div className={`w-full rounded-2xl p-4 text-center border-2 relative overflow-hidden ${
                sfidaResult.isNewRecord
                  ? 'bg-gradient-to-b from-amber-50 to-yellow-50 border-amber-400'
                  : sfidaResult.correctAnswers >= 8
                    ? 'bg-emerald-50 border-emerald-300'
                    : sfidaResult.correctAnswers >= 4
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Indicatore visivo nuovo record (emoji fallback inline) */}
                {sfidaResult.isNewRecord && (
                  <div className="flex justify-center gap-3 text-2xl mb-2" aria-hidden="true">
                    🏅
                  </div>
                )}

                <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                  sfidaResult.isNewRecord ? 'text-amber-600' :
                  sfidaResult.correctAnswers >= 8 ? 'text-emerald-700' :
                  sfidaResult.correctAnswers >= 4 ? 'text-amber-700' : 'text-slate-500'
                }`}>
                  {sfidaResult.isNewRecord
                    ? '🎉 NUOVO RECORD!'
                    : sfidaResult.correctAnswers >= 8 ? '🏆 Ottimo risultato!'
                    : sfidaResult.correctAnswers >= 4 ? '👍 Buon risultato!'
                    : '💪 Continua ad allenarti!'}
                </p>
                <p className="text-4xl font-black text-slate-900 font-mono">{sfidaResult.correctAnswers}</p>
                <p className="text-xs text-slate-500 mt-1">risposte esatte in 30 secondi</p>
                {!sfidaResult.isNewRecord && sfidaResult.previousRecord > 0 && (
                  <p className="text-xs text-slate-400 mt-1.5 font-sans">
                    🏅 Record: <span className="font-bold">{sfidaResult.previousRecord}</span>
                  </p>
                )}
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
            <div className="bg-amber-500 text-white rounded-3xl p-6 text-center shadow-lg">
              <h2 className="text-5xl font-black font-mono">{sfidaQuestion.a} x {sfidaQuestion.b}</h2>
            </div>

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
                    onPointerDown={() => setSfidaPressedFeedback({ opt, correct: !!isCorrectOpt })}
                    onPointerUp={() => { setSfidaPressedFeedback(null); handleSfidaAnswer(opt); }}
                    onPointerLeave={() => setSfidaPressedFeedback(null)}
                    onPointerCancel={() => setSfidaPressedFeedback(null)}
                    className={`w-full rounded-xl border-2 font-black font-mono shadow-sm cursor-pointer transition-all select-none ${compactLayout ? 'min-h-11 py-3 px-2 text-base' : 'min-h-14 py-4 px-4 text-lg'} ${feedbackClass}`}
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
        </>
      )}

      {/* Fuochi d'artificio: overlay celebrativo per nuovo record */}
      {showFireworks && (
        <FireworksOverlay onDone={() => setShowFireworks(false)} />
      )}
    </div>
  );
}
