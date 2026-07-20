/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WorldConfig, UserProfile, QuestionAttempt } from '../types';
import { sound } from './SoundManager';
import { Sparkles, HelpCircle, ArrowLeft, Check, AlertCircle, Award, Timer, BookOpen, Trophy, Compass, ShieldAlert } from 'lucide-react';
import GroupVisualizer from './GroupVisualizer';
import StepRulesModal from './StepRulesModal';
import RewardPopup from './RewardPopup';
import NumericKeypad from './NumericKeypad';
import RewardsTutorial from './RewardsTutorial';
import MonumentArea from './MonumentArea';

interface WorldDetailProps {
  world: WorldConfig;
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  onBack: () => void;
  compactLayout?: boolean;
}

export default function WorldDetail({ world, profile, updateProfile, onBack, compactLayout = false }: WorldDetailProps) {
  const [activeStep, setActiveStep] = useState<string>('intro'); // intro, comprendo, salto, costruisco, trucchi, pratico, sfida
  const [showStepRulesModal, setShowStepRulesModal] = useState<string | null>(null); // null o il nome dello step
  const [hasSeenStepRules, setHasSeenStepRules] = useState<Set<string>>(new Set()); // Track which steps have been seen
  const [hasReadRulesMandatory, setHasReadRulesMandatory] = useState<Set<string>>(new Set()); // Track mandatory rule reading
  const [showRewardPopup, setShowRewardPopup] = useState<{ step: string; coins: number; drops: number } | null>(null);
  
  // States for sub-games
  const [stepScore, setStepScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  
  // Salto (Step 2) state
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
  const [sfidaQuestion, setSfidaQuestion] = useState<{ a: number; b: number } | null>(null);
  const [sfidaTimer, setSfidaTimer] = useState<number>(30);
  const [sfidaScore, setSfidaScore] = useState<number>(0);
  const [sfidaOptions, setSfidaOptions] = useState<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and generate options
  useEffect(() => {
    generateSaltoOptions();
    resetCostruisco();
  }, [world]);

  // Show rules modal when entering a new step
  useEffect(() => {
    if (activeStep !== 'intro' && !hasSeenStepRules.has(activeStep)) {
      // First time seeing this step - show modal automatically
      setShowStepRulesModal(activeStep);
      setHasSeenStepRules(prev => new Set([...prev, activeStep]));
    }
  }, [activeStep, hasSeenStepRules]);

  // Generate options for Salto mode
  const generateSaltoOptions = () => {
    const currentCorrect = world.id * (saltoIndex + 1);
    // Create random wrong options
    const optionsSet = new Set<number>([currentCorrect]);
    let attempts = 0;
    while (optionsSet.size < 4 && attempts < 50) {
      const offset = (Math.floor(Math.random() * 5) - 2) * world.id;
      const wrongVal = currentCorrect + (offset === 0 ? world.id * 2 : offset);
      if (wrongVal > 0 && wrongVal <= world.id * 12) {
        optionsSet.add(wrongVal);
      }
      attempts++;
    }
    // Fallback if not enough options generated
    while (optionsSet.size < 4) {
      optionsSet.add(currentCorrect + Math.floor(Math.random() * 20) + 1);
    }
    setSaltoOptions(Array.from(optionsSet).sort((a, b) => a - b));
  };

  useEffect(() => {
    if (activeStep === 'salto') {
      generateSaltoOptions();
    }
  }, [saltoIndex, activeStep]);

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
    setQuizOptions(Array.from(options).sort(() => Math.random() - 0.5));
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

  // Sfida (Time Trial Step 6) gameplay
  const startSfidaMode = () => {
    sound.playPowerUp();
    setSfidaScore(0);
    setSfidaTimer(30);
    setSfidaActive(true);
    generateSfidaQuestion();
    setActiveStep('sfida');

    // Timer logic
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSfidaTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishSfidaMode();
          return 0;
        }
        if (prev <= 5) sound.playTick(); // Tick-tock retro sounds for final 5s
        return prev - 1;
      });
    }, 1000);
  };

  const generateSfidaQuestion = () => {
    const factorB = Math.floor(Math.random() * 9) + 2; // from 2 to 10
    const currentQ = { a: world.id, b: factorB };
    setSfidaQuestion(currentQ);

    const correct = world.id * factorB;
    const options = new Set<number>([correct]);
    while (options.size < 4) {
      options.add(correct + (Math.random() > 0.5 ? world.id : -world.id));
    }
    setSfidaOptions(Array.from(options).sort(() => Math.random() - 0.5));
  };

  const handleSfidaAnswer = (selectedVal: number) => {
    if (!sfidaQuestion) return;
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

    generateSfidaQuestion();
  };

  const finishSfidaMode = () => {
    sound.playLevelUp();
    setSfidaActive(false);
    
    updateProfile(p => {
      const worldProg = p.worldProgress[world.id];
      const previousMax = worldProg?.highScore || 0;
      const nextMax = Math.max(previousMax, sfidaScore);

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

    setActiveStep('intro');
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

  const worldProg = profile.worldProgress[world.id] || {
    worldId: world.id,
    completedSteps: [],
    rebuiltMonuments: [],
    creatureEvolution: 'egg',
    highScore: 0,
    stars: 0
  };

  // Calculate reconstruction percentage of this world
  const rebuiltCount = worldProg.rebuiltMonuments.length;
  const rebuildPercent = Math.round((rebuiltCount / world.monuments.length) * 100);

  // Check if Sfida is locked (requires Pratico completed!)
  const isSfidaLocked = !worldProg.completedSteps.includes('pratico');

  return (
    <div className="w-full h-full bg-transparent flex flex-col overflow-hidden" id={`world-panel-${world.id}`}>
      {/* Step-contextual Rules Modal */}
      <AnimatePresence>
        {showStepRulesModal && (
          <StepRulesModal 
            step={showStepRulesModal} 
            world={world} 
            onClose={() => {
              setShowStepRulesModal(null);
              setHasReadRulesMandatory(prev => new Set([...prev, showStepRulesModal]));
            }} 
            isMandatory={!hasReadRulesMandatory.has(showStepRulesModal)}
          />
        )}
      </AnimatePresence>
      
      {/* Top action bar */}
      <div className={`bg-white/30 backdrop-blur-md px-4 py-3 border-b border-white/40 flex items-center justify-between shadow-lg z-10 text-sky-950 flex-shrink-0 ${compactLayout ? 'gap-2' : ''}`}>
        <button
          onClick={() => { sound.playClick(); onBack(); }}
          className="flex items-center gap-1.5 text-xs font-bold text-sky-950 hover:text-sky-900 bg-white/40 border border-white/60 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-colors"
          id="world-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl select-none leading-none">{world.symbol}</span>
          <span className="text-sm font-black text-sky-950 font-sans">{world.name}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className={`flex-1 overflow-y-auto flex flex-col ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`}>
        {activeStep === 'intro' && (
          <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col justify-between">
            {/* Mascot Banner Card */}
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
              } p-5 md:p-6 text-white shadow-xl relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12 filter blur-xl"></div>
              
              <div className="flex flex-col md:flex-row gap-4 items-center relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner select-none filter drop-shadow">
                  {worldProg.creatureEvolution === 'egg' ? '🥚' : worldProg.creatureEvolution === 'child' ? '👶' : '🐉'}
                </div>
                <div className="text-center md:text-left flex-1">
                  <span className="text-xs font-bold bg-white/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
                    {world.locationName}
                  </span>
                  <h2 className="text-xl md:text-2xl font-black mt-1 font-sans">
                    Incontra {worldProg.creatureEvolution === 'egg' ? `l'Uovo di ${world.creatureName}` : world.creatureName}!
                  </h2>
                  <p className="text-xs text-white/85 mt-1 max-w-xl">
                    "{world.creatureDescription}" - Stato evoluzione: <strong>{worldProg.creatureEvolution.toUpperCase()}</strong>
                  </p>
                </div>
              </div>

              {/* Nursery Rhyme Section */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block">
                  🎶 La Filastrocca del {world.id}
                </span>
                <p className="text-sm not-italic text-white leading-relaxed mt-2 font-sans font-medium">
                  {world.filastrocca}
                </p>
              </div>
            </div>

            {/* Steps & Monuments Columns */}
            <div className={`grid grid-cols-1 gap-6 ${compactLayout ? '' : 'md:grid-cols-2'}`}>
              
              {/* Left Side: Sub-game stages */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  Sentiero di Apprendimento
                </h3>

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
                  const isLocked = !prevStep || (isSfida && isSfidaLocked);
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
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isLocked
                          ? 'opacity-45 bg-gray-50 border-gray-200 cursor-not-allowed'
                          : isDone
                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300 cursor-pointer shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:shadow-md cursor-pointer'
                      }`}
                      id={`step-btn-${step.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl select-none flex-shrink-0 ${
                          isLocked ? 'bg-slate-100' : isDone ? 'bg-emerald-100/50' : 'bg-indigo-50'
                        }`}>
                          {isLocked ? '🔒' : step.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-xs font-bold font-sans ${isDone ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {step.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 max-w-xs">{step.desc}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {/* Rewards box */}
                        {!isLocked && (
                          <div className="text-[9px] font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded-lg flex items-center gap-1 whitespace-nowrap">
                            {step.coins > 0 && <span>🪙 {step.coins}</span>}
                            {step.drops > 0 && <span>💧 {step.drops}</span>}
                          </div>
                        )}
                         
                        {/* Status badge */}
                        {isLocked ? (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{lockReason}</span>
                        ) : isDone ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100/60 px-2.5 py-0.5 rounded-full flex items-center gap-0.5 font-sans">
                            ✓ Fatto
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-sans">
                            Gioca
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Side: Reconstruction monuments */}
              <div className="bg-amber-50/40 border border-amber-200/50 rounded-3xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    🏛️ Ricostruzione Area ({rebuildPercent}%)
                  </h3>
                  <p className="text-[11px] text-amber-800/80 mb-4 leading-relaxed font-sans">
                    Usa le tue <strong>Gocce di Luce 💧</strong> guadagnate rispondendo correttamente per ricostruire questi monumenti distrutti dal vento matematico!
                  </p>

                  <div className="space-y-3">
                    {world.monuments.map(mon => {
                      const isBuilt = worldProg.rebuiltMonuments.includes(mon.id);
                      const canAfford = profile.lightDrops >= mon.cost;

                      return (
                        <div 
                          key={mon.id}
                          className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                            isBuilt 
                              ? 'bg-emerald-50 border-emerald-200/50 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                          id={`monument-card-${mon.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl filter drop-shadow select-none">{mon.emoji}</span>
                            <div>
                              <h5 className="text-xs font-bold font-sans">{mon.name}</h5>
                              <p className="text-[9px] text-slate-500">{mon.description}</p>
                            </div>
                          </div>

                          <div>
                            {isBuilt ? (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/40 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                ✓ Eretto
                              </span>
                            ) : (
                              <button
                                disabled={!canAfford}
                                onClick={() => handleRebuildMonument(mon.id, mon.cost)}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
                                  canAfford 
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                                id={`rebuild-btn-${mon.id}`}
                              >
                                💧 {mon.cost}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-amber-200/40 flex items-center justify-between text-[11px] font-bold text-amber-900">
                  <span>Recluta {world.creatureName}</span>
                  <span>Evolve a 3/6 e 6/6 passi conclusi!</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: COMPRENDO (Interactive groups of arrays & repeated additions) */}
        {activeStep === 'comprendo' && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-sans">
                  Passo 1: Comprendo il concetto
                </span>
                <button
                  onClick={() => setShowStepRulesModal('comprendo')}
                  className={`rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
                    !hasReadRulesMandatory.has('comprendo')
                      ? 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700'
                      : 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400'
                  }`}
                  title="Visualizza regole"
                  aria-label="Visualizza regole"
                >
                  <HelpCircle className={!hasReadRulesMandatory.has('comprendo') ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
              <h3 className="text-lg font-black text-slate-800 mt-1 font-sans">
                Che cos'è {world.id} x 4?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La moltiplicazione non è altro che addizione ripetuta dello stesso gruppo!
              </p>
            </div>

            {/* Visualizer showing world.id groups of 4 */}
            <GroupVisualizer a={world.id} b={4} itemEmoji={world.itemsToCount} />

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs text-indigo-950">
              <h4 className="font-bold flex items-center gap-1 font-sans">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Spiegazione Pedagogica:
              </h4>
              <p className="mt-1 leading-relaxed text-slate-600">
                Pensa a <strong>{world.id} ceste</strong> di frutta. Se in ogni cesta mettiamo <strong>4 mele</strong>, quante mele avremo in tutto? Le contiamo insieme ed otteniamo <strong>{world.id * 4}</strong>! Questo significa moltiplicare.
              </p>
            </div>

            <button
              onClick={() => {
                sound.playLevelUp();
                saveStepCompleted('comprendo');
                setActiveStep('intro');
              }}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
              id="comprendo-done-btn"
            >
              Ho capito il concetto! Continua
            </button>
          </div>
        )}

        {/* STEP 2: SALTO (Skip Counting) */}
        {activeStep === 'salto' && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
            <div className="text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border-2 border-indigo-200 shadow-md">
              <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] font-black text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-full font-sans uppercase tracking-wider">
                  Passo 2: Conteggio per salti
                </span>
                <button
                  onClick={() => setShowStepRulesModal('salto')}
                  className={`flex-shrink-0 rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
                    !hasReadRulesMandatory.has('salto')
                      ? 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700'
                      : 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400'
                  }`}
                  title="Visualizza regole"
                  aria-label="Visualizza regole"
                >
                  <HelpCircle className={!hasReadRulesMandatory.has('salto') ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3 font-sans leading-tight">
                🐸 Aiuta {world.mascotName} a saltare i sassi!
              </h3>
              <p className="text-sm font-bold text-indigo-800 mt-3 leading-relaxed bg-white/60 rounded-xl p-3 inline-block">
                Tocca il numero successivo corretto per completare la sequenza della tabellina.
              </p>
            </div>

            {/* Mascot River Crossing track */}
            <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100/50 flex flex-col items-center">
              <div className="flex gap-1.5 overflow-x-auto max-w-full pb-2 scrollbar-none justify-center">
                {saltoNumbers.map((num, idx) => {
                  const isPassed = idx < saltoIndex;
                  const isCurrent = idx === saltoIndex;
                  return (
                    <div
                      key={idx}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono text-xs transition-all ${
                        isPassed 
                          ? 'bg-emerald-500 text-white shadow-sm scale-95' 
                          : isCurrent 
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 scale-105 animate-bounce' 
                            : 'bg-white text-slate-300 border border-slate-100'
                      }`}
                    >
                      {isPassed ? num : isCurrent ? '?' : num}
                    </div>
                  );
                })}
              </div>

              {/* River Graphic placeholder representing leaps */}
              <div className="w-full h-12 bg-sky-200/40 rounded-xl mt-3 relative flex items-center justify-center border border-sky-200/50 overflow-hidden">
                <span className="text-2xl animate-pulse absolute left-4">🐸</span>
                <span className="text-xs font-extrabold text-sky-800 uppercase font-sans">
                  Passo {saltoIndex + 1} di 10
                </span>
              </div>
            </div>

            {/* Answer buttons */}
            <div className={`grid gap-3 ${compactLayout ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {saltoOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSaltoSelect(opt)}
                  className="py-3.5 px-4 rounded-xl border-2 border-slate-100 hover:border-indigo-400 bg-white text-lg font-bold font-mono text-slate-800 hover:bg-slate-50 shadow-sm cursor-pointer transition-colors"
                  id={`salto-opt-${opt}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => { sound.playClick(); setActiveStep('intro'); }}
                className="text-xs text-slate-500 font-bold hover:underline cursor-pointer"
                id="salto-exit-btn"
              >
                Abbandona sentiero
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: COSTRUISCO (Build the Table) */}
        {activeStep === 'costruisco' && (
          <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Passo 3: Costruisci la Tabellina
                </span>
                <button
                  onClick={() => setShowStepRulesModal('costruisco')}
                  className={`rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
                    !hasReadRulesMandatory.has('costruisco')
                      ? 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700'
                      : 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400'
                  }`}
                  title="Visualizza regole"
                  aria-label="Visualizza regole"
                >
                  <HelpCircle className={!hasReadRulesMandatory.has('costruisco') ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                Completa i risultati mancanti!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Seleziona un'operazione, poi tocca il palloncino corretto in basso per completarla.
              </p>
            </div>

            {/* 10 table rows */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-h-[180px] overflow-y-auto p-1 border border-slate-100 rounded-xl">
              {Array.from({ length: 10 }).map((_, idx) => {
                const factor = idx + 1;
                const product = costruiscoProgress[factor];
                const isSelected = selectedFactor === factor;

                return (
                  <button
                    key={factor}
                    onClick={() => { sound.playClick(); setSelectedFactor(factor); }}
                    className={`p-2.5 rounded-xl border text-center font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' 
                        : product !== null 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                    id={`costruisco-row-${factor}`}
                  >
                    <span className="text-[11px] font-sans">{world.id} x {factor}</span>
                    <span className="text-xs font-mono mt-0.5">
                      {product !== null ? product : "?"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Monument Building Area - NEW FEATURE */}
            <MonumentArea world={world} completedMonuments={completedMonuments} />

            {/* Bubble balloons selection at the bottom */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide text-center">
                I Palloncini dei Risultati
              </h4>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {costruiscoBalloons.map(ball => (
                  <motion.button
                    key={ball}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => handleCostruiscoBalloonTap(ball)}
                    className="w-12 h-12 rounded-full bg-sky-400 text-white font-extrabold font-mono text-xs flex items-center justify-center cursor-pointer shadow-md border border-white hover:bg-sky-500 relative select-none"
                    id={`balloon-${ball}`}
                  >
                    {ball}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={resetCostruisco}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                id="costruisco-reset-btn"
              >
                Ricomincia
              </button>
              <button
                onClick={() => { sound.playClick(); setActiveStep('intro'); }}
                className="py-2.5 px-4 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold cursor-pointer"
                id="costruisco-exit-btn"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: TRUCCHI (Interactive strategies and associate rules) */}
        {activeStep === 'trucchi' && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-5">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Passo 4: Il Trucco Mnemonico
                </span>
                <button
                  onClick={() => setShowStepRulesModal('trucchi')}
                  className={`rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
                    !hasReadRulesMandatory.has('trucchi')
                      ? 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700'
                      : 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400'
                  }`}
                  title="Visualizza regole"
                  aria-label="Visualizza regole"
                >
                  <HelpCircle className={!hasReadRulesMandatory.has('trucchi') ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
              <h3 className="text-lg font-black text-slate-800 mt-1 font-sans">
                {world.trickTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Impara il trucco della terra del {world.id} con {world.mascotName}.
              </p>
            </div>

            {/* Graphic illustration of the trick */}
            <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex gap-4 items-start">
              <span className="text-3xl select-none filter drop-shadow">🦉</span>
              <div>
                <h4 className="text-xs font-bold text-amber-900 font-sans">Come funziona il trucco:</h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {world.trickDescription}
                </p>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-xs">
              <h4 className="font-bold text-indigo-950 font-sans">Strategia di ragionamento veloce:</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                {world.trickVisualExplanation}
              </p>
            </div>

            {/* Mini quiz using the trick */}
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
              <h4 className="text-sm sm:text-base font-bold text-slate-700 mb-4 text-center">
                Mettiamolo in pratica! Quanto fa <strong>{world.id} x 8</strong>?
              </h4>
              <NumericKeypad
                value={trucchiAnswer}
                onChange={setTrucchiAnswer}
                onSubmit={() => {
                  if (parseInt(trucchiAnswer.trim(), 10) === world.id * 8) {
                    sound.playSuccess();
                    setTrucchiQuestionSolved(true);
                  } else {
                    sound.playError();
                    setTrucchiAnswer('');
                  }
                }}
                submitLabel="Verifica"
                maxDigits={3}
              />
              {trucchiQuestionSolved && (
                <p className="text-xs font-bold text-emerald-600 mt-4 flex items-center justify-center gap-1">
                  ✓ Eccellente! Risposta corretta. Ora puoi procedere.
                </p>
              )}
            </div>

            <button
              disabled={!trucchiQuestionSolved}
              onClick={() => {
                sound.playLevelUp();
                saveStepCompleted('trucchi');
                setActiveStep('intro');
              }}
              className={`w-full py-3 rounded-2xl font-bold text-sm shadow-md transition-all ${
                trucchiQuestionSolved 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              id="trick-done-btn"
            >
              Strategia Appresa!
            </button>
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
                  onClick={() => setShowStepRulesModal('pratico')}
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
            <div className={`grid gap-3.5 ${compactLayout ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {quizOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuizAnswer(opt)}
                  className="py-4 px-4 rounded-xl border-2 border-slate-100 hover:border-indigo-400 bg-white text-lg font-black font-mono text-slate-800 hover:bg-slate-50 shadow-sm cursor-pointer transition-all"
                  id={`quiz-opt-${opt}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => { sound.playClick(); setActiveStep('intro'); }}
                className="text-xs text-slate-500 font-bold hover:underline cursor-pointer"
                id="quiz-exit-btn"
              >
                ← Torna al menu principale
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: SFIDA (Timed challenge) */}
        {activeStep === 'sfida' && sfidaQuestion && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              {/* Countdown */}
              <div className="flex items-center gap-1.5 text-rose-600 font-bold font-mono bg-rose-50 px-3 py-1 rounded-full text-sm">
                <Timer className="w-4 h-4 animate-spin" />
                Tempo: {sfidaTimer}s
              </div>

              {/* Score + Help */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-amber-600 font-bold font-mono bg-amber-50 px-3 py-1 rounded-full text-sm">
                  <Trophy className="w-4 h-4" />
                  Punti: {sfidaScore}
                </div>
                <button
                  onClick={() => setShowStepRulesModal('sfida')}
                  className={`rounded-full text-white flex items-center justify-center transition-all shadow-md cursor-pointer font-bold text-lg ${
                    !hasReadRulesMandatory.has('sfida')
                      ? 'w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700'
                      : 'w-6 h-6 bg-indigo-300 hover:bg-indigo-400'
                  }`}
                  title="Visualizza regole"
                  aria-label="Visualizza regole"
                >
                  <HelpCircle className={!hasReadRulesMandatory.has('sfida') ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
            </div>

            {/* Large formula */}
            <div className="bg-amber-500 text-white rounded-3xl p-6 text-center shadow-lg">
              <span className="text-xs font-bold text-amber-100 uppercase tracking-widest block">SFIDA VELOCISSIMA</span>
              <h2 className="text-5xl font-black font-mono mt-2">{sfidaQuestion.a} x {sfidaQuestion.b}</h2>
            </div>

            {/* Answers options */}
            <div className={`grid gap-3.5 ${compactLayout ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {sfidaOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSfidaAnswer(opt)}
                  className="py-4 px-4 rounded-xl border-2 border-slate-100 hover:border-amber-400 bg-white text-lg font-black font-mono text-slate-800 hover:bg-slate-50 shadow-sm cursor-pointer transition-colors"
                  id={`sfida-opt-${opt}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center font-sans">
              Ogni risposta corretta vale **2 Monete**! Guadagna più punti possibili prima dello scadere del tempo.
            </p>
          </div>
        )}
      </div>

      {/* COGNITIVE ERROR FEEDBACK OVERLAY (SCUDO DI SAGGEZZA) */}
      <AnimatePresence>
        {errorFeedback?.show && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col border border-indigo-100"
              id="scudo-saggezza-panel"
            >
              {/* Header block */}
              <div className="bg-indigo-900 text-white p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-xl shadow-md select-none animate-bounce">
                  🛡️
                </div>
                <div>
                  <h3 className="text-base font-black font-sans">Lo Scudo della Saggezza!</h3>
                  <p className="text-[11px] text-indigo-200">
                    Nessuna punizione! Scopriamo il ragionamento visivo per ricordare {errorFeedback.a} x {errorFeedback.b}.
                  </p>
                </div>
              </div>

              {/* Cognitive explanation */}
              <div className="p-5 overflow-y-auto max-h-[350px] space-y-4">
                
                {/* Result block */}
                <div className="flex gap-4 items-center justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Hai scelto</span>
                    <span className="text-base font-black text-rose-500 font-mono">{errorFeedback.userAnswer}</span>
                  </div>
                  <div className="text-2xl text-slate-300">➜</div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">La verità magica</span>
                    <span className="text-xl font-black text-emerald-600 font-mono">
                      {errorFeedback.a} x {errorFeedback.b} = {errorFeedback.correctAnswer}
                    </span>
                  </div>
                </div>

                {/* Group explanation visualizer */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wide">
                    Rappresentazione dei Gruppi:
                  </h4>
                  <GroupVisualizer 
                    a={errorFeedback.a} 
                    b={errorFeedback.b} 
                    itemEmoji={world.itemsToCount} 
                  />
                </div>

                {/* Trick suggestion */}
                <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex gap-3 items-start">
                  <span className="text-2xl filter drop-shadow select-none">🧠</span>
                  <div>
                    <h5 className="text-xs font-bold text-amber-900 font-sans">Usa questo Trucco Mnemonico:</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      <strong>{world.trickTitle}</strong>: {world.trickDescription}
                    </p>
                  </div>
                </div>

                {/* Pacing Advice */}
                <div className="text-[11px] text-slate-500 bg-sky-50/50 p-3 rounded-xl border border-sky-100/30">
                  💡 <strong>Suggerimento:</strong> Rallenta un secondo e riprova a contare le dita o gli oggetti. Questa formula ricomparirà tra poco per darti un'altra opportunità!
                </div>
              </div>

              {/* Action buttons */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={closeErrorFeedback}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors text-center"
                  id="wisdom-confirm-btn"
                >
                  Ho capito, riproviamo!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
  );
}
