/**
 * TrainingHub – Modalità Allenamento libero.
 * Routing interno: lista tabelline → sessione esercizio con scelta multipla.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, WorldConfig } from '../types';
import { WORLDS_DATA } from '../data';
import { withTableIcon } from '../utils/tableLabels';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';
import ActionGrid from './layout/ActionGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';

// ─── Emoji mnemoniche per cifra (sistema fonetico-semantico italiano) ─────────
// Tecnica: ancoraggio fonetico sulla parola italiana del numero (Major System IT)
// 1 🕯️ Candela → forma verticale = 1
// 2 🐂 Bue      → b-UE, rima con DUE
// 3 👑 Re       → t-RE
// 4 🐈 Gatto    → quatto → gatto (iconico per bambini)
// 5 ✋ Mano     → 5 dita = mano
// 6 🐌 Chiocciola → spirale visiva del 6
// 7 🧙 Nano     → SETTE nani (Biancaneve)
// 8 🛶 Canotto  → can-OTTO
// 9 🚢 Nave     → n-OVE → nave

const DIGIT_EMOJI: Record<number, string> = {
  1: '🕯️',
  2: '🐂',
  3: '👑',
  4: '🐈',
  5: '✋',
  6: '🐌',
  7: '🧙',
  8: '🛶',
  9: '🚢',
};

const DIGIT_WORD: Record<number, string> = {
  1: 'candela',
  2: 'bue',
  3: 're',
  4: 'gatto',
  5: 'mano',
  6: 'chiocciola',
  7: 'nano',
  8: 'canotto',
  9: 'nave',
};

const RESULT_DIGIT_EMOJI: Record<number, string> = {
  0: '⭕',
  ...DIGIT_EMOJI,
};

const RESULT_DIGIT_WORD: Record<number, string> = {
  0: 'zero',
  ...DIGIT_WORD,
};

const TRAINING_WORLD_ICON: Record<number, string> = {
  2: '🐂',
  3: '👑',
  4: '🐈',
  5: '✋',
  6: '🐌',
  7: '🧙',
  8: '🛶',
  9: '🚢',
};

const MOTIVATIONAL_CORRECT = [
  'Fantastico! 🎉', 'Bravo/a! 🌟', 'Perfetto! ✨', 'Esatto! 🏆',
  'Ottimo lavoro! 💪', 'Sei fortissimo/a! 🚀', 'Continua così! 🌈',
];

const MOTIVATIONAL_WRONG = [
  'Quasi! Riprova! 💪', 'Non mollare! 🌟', 'Ci puoi riuscire! ✨',
  'Sbagliando si impara! 🧠', 'La prossima ce la fai! 🚀',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildResultMnemonic(answer: number): string {
  if (answer < 10) {
    return `${RESULT_DIGIT_EMOJI[answer]} ${RESULT_DIGIT_WORD[answer]}`;
  }

  const tens = Math.floor(answer / 10);
  const units = answer % 10;
  return `${RESULT_DIGIT_EMOJI[tens]} ${RESULT_DIGIT_WORD[tens]} e ${RESULT_DIGIT_EMOJI[units]} ${RESULT_DIGIT_WORD[units]}`;
}

function buildMnemonicPair(a: number, b: number, answer: number): string {
  const leftWord = DIGIT_WORD[a] ?? `${a}`;
  const rightWord = DIGIT_WORD[b] ?? `${b}`;
  const leftEmoji = DIGIT_EMOJI[a] ?? `${a}`;
  const rightEmoji = DIGIT_EMOJI[b] ?? `${b}`;
  return `${leftWord} ${leftEmoji} × ${rightWord} ${rightEmoji} = ${buildResultMnemonic(answer)}`;
}

// ─── Tipi interni ─────────────────────────────────────────────────────────────

interface TrainingHubProps {
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  compactLayout?: boolean;
}

interface Question {
  multiplier: number; // es. 3 in 3×world.id
  worldId: number;
  answer: number;
  options: number[];
}

// ─── Generazione domande ──────────────────────────────────────────────────────

function generateOptions(correct: number): number[] {
  const set = new Set<number>([correct]);
  const deltas = [1, 2, 3, 5, 7, 10, 11];
  while (set.size < 4) {
    const delta = pickRandom(deltas) * (Math.random() < 0.5 ? 1 : -1);
    const candidate = correct + delta;
    if (candidate > 0 && !set.has(candidate)) set.add(candidate);
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

function buildQuestionDeck(worldId: number): Question[] {
  const deck: Question[] = [];
  for (let m = 1; m <= 9; m++) {
    const answer = m * worldId;
    deck.push({ multiplier: m, worldId, answer, options: generateOptions(answer) });
  }
  return deck.sort(() => Math.random() - 0.5);
}

// ─── Helper: stelle per mondo ─────────────────────────────────────────────────

function getStars(profile: UserProfile, worldId: number): number {
  return profile.worldProgress?.[worldId]?.stars ?? 0;
}

function StarRow({ stars, className = '' }: { stars: number; className?: string }) {
  return (
    <span aria-label={`${stars} stelle su 3`} className={`flex gap-0.5 justify-center ${className}`}>
      {[1, 2, 3].map(n => (
        <span key={n} aria-hidden="true"
          className={`text-base leading-none ${n <= stars ? 'opacity-100' : 'opacity-20'}`}>
          ⭐
        </span>
      ))}
    </span>
  );
}

// ─── Card singola tabellina ───────────────────────────────────────────────────

function WorldCard({ world, stars, onSelect, compactLayout }: {
  world: WorldConfig; stars: number; onSelect: (id: number) => void; compactLayout?: boolean;
}) {
  const isTrained = stars > 0;
  const worldIcon = TRAINING_WORLD_ICON[world.id] ?? '🦁';
  return (
    <button
      type="button"
      onClick={() => onSelect(world.id)}
      className={`training-home-card relative w-full aspect-square rounded-2xl border-2 border-indigo-300 bg-indigo-100/70 shadow-sm
                 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer
                 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                 flex flex-col items-center justify-center ${compactLayout ? 'py-1 gap-0.5' : 'py-2 gap-1'}`}
      aria-label={`Allena tabellina del ${world.id}: ${world.name}${isTrained ? ', già allenata' : ''}`}
    >
      {isTrained && (
        <span
          className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] font-black shadow-md"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
      <span className={`training-card-icon ${compactLayout ? 'text-2xl' : 'text-[2rem]'} leading-none`} aria-hidden="true">{worldIcon}</span>
      <span className={`training-card-mul ${compactLayout ? 'text-lg' : 'text-xl'} font-black font-mono text-indigo-800 leading-none`}>×{world.id}</span>
    </button>
  );
}

// ─── Griglia visiva emoji A × B ───────────────────────────────────────────────

function EmojiGrid({ rows, cols, emoji }: { rows: number; cols: number; emoji: string }) {
  // Limita la visualizzazione per non saturare lo schermo
  const MAX_CELLS = 36;
  const total = rows * cols;
  const overflow = total > MAX_CELLS;
  const displayRows = overflow ? Math.min(rows, Math.ceil(MAX_CELLS / cols)) : rows;

  return (
    <div
      aria-label={`Visualizzazione: ${rows} righe da ${cols} ${emoji}`}
      className="flex flex-col items-center gap-1"
    >
      {Array.from({ length: displayRows }, (_, r) => (
        <div key={r} className="flex gap-1 flex-wrap justify-center">
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} aria-hidden="true" className="text-xl leading-none select-none">
              {emoji}
            </span>
          ))}
        </div>
      ))}
      {overflow && (
        <span className="text-xs text-sky-700/60 font-sans">…e altri</span>
      )}
    </div>
  );
}

// ─── Sessione di allenamento ──────────────────────────────────────────────────

type FeedbackState = { correct: boolean; message: string; optionIndex: number } | null;

function TrainingSession({
  world,
  updateProfile,
  onBack,
}: {
  world: WorldConfig;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  onBack: () => void;
}) {
  // Deck nello state con init lazy: evita primo render vuoto ed e piu leggibile.
  const [deck, setDeck] = useState<Question[]>(() => buildQuestionDeck(world.id));
  const [deckIndex, setDeckIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak } = useVoice();

  // Inizializza il mazzo al montaggio o cambio mondo
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDeck(buildQuestionDeck(world.id));
    setDeckIndex(0);
    setScore(0);
    setFeedback(null);
  }, [world.id]);

  const currentQuestion: Question | undefined = deck[deckIndex];

  const handleAnswer = useCallback((opt: number, optIndex: number) => {
    if (feedback) return; // blocca doppio click durante feedback
    if (!currentQuestion) return;

    const isCorrect = opt === currentQuestion.answer;

    if (isCorrect) {
      sound.playSuccess();
      speak(currentQuestion.answer.toString());
      setScore(s => s + 1);
      updateProfile(p => ({ ...p, coins: p.coins + 1 }));
      setFeedback({
        correct: true,
        message: pickRandom(MOTIVATIONAL_CORRECT),
        optionIndex: optIndex,
      });
    } else {
      sound.playError();
      setFeedback({
        correct: false,
        message: pickRandom(MOTIVATIONAL_WRONG),
        optionIndex: optIndex,
      });
      // Resta sulla stessa domanda finche non viene data la risposta corretta.
      timeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, 1400);
      return;
    }

    // Avanza alla prossima domanda dopo 1.4s
    timeoutRef.current = setTimeout(() => {
      setFeedback(null);
      const nextIndex = deckIndex + 1;
      if (nextIndex >= deck.length) {
        // Rimescola e riparte da capo
        setDeck(buildQuestionDeck(world.id));
        setDeckIndex(0);
      } else {
        setDeckIndex(nextIndex);
      }
    }, 1400);
  }, [feedback, currentQuestion, updateProfile, world.id, deckIndex, deck.length]);

  // Cleanup timeout on unmount
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  if (!currentQuestion) {
    return (
      <SurfaceCard
        aria-live="polite"
        tone="soft"
        padding="lg"
        className="min-h-[260px] w-full flex items-center justify-center text-center"
      >
        <p className="text-sm font-bold text-sky-900">Prepariamo la prossima domanda...</p>
      </SurfaceCard>
    );
  }

  const { multiplier, worldId, answer, options } = currentQuestion;
  const digitEmojis = `${DIGIT_EMOJI[multiplier] ?? multiplier} × ${DIGIT_EMOJI[worldId] ?? worldId}`;
  const mnemonicPair = buildMnemonicPair(multiplier, worldId, answer);

  // Griglia visiva: multiplier righe da worldId colonne (o inverso se più compatto)
  const [gridRows, gridCols] = multiplier <= worldId
    ? [multiplier, worldId]
    : [worldId, multiplier];

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">

      {/* Header: back + punteggio */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-sky-950 bg-white/40 border border-white/60
                     px-3 py-1.5 rounded-xl hover:bg-white/60 cursor-pointer transition-colors
                     focus-visible:outline-2 focus-visible:outline-sky-500"
          aria-label="Torna alla lista delle tabelline"
        >
          ← Indietro
        </button>
        <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-sm border border-white/50
                        rounded-xl px-3 py-1.5 text-xs font-black text-sky-950">
          <span aria-hidden="true">🪙</span>
          <span>{score} <span className="font-medium text-sky-700/70">in questa sessione</span></span>
        </div>
      </div>

      {/* Domanda */}
      <SurfaceCard
        aria-labelledby="question-label"
        tone="soft"
        padding="lg"
        className="flex flex-col items-center gap-3"
      >
        {/* Titolo tabellina */}
        <p className="text-xs font-bold text-sky-700/70 uppercase tracking-widest font-sans">
          {withTableIcon(worldId, `Tabellina del ${worldId}`)}
        </p>

        {/* Emoji della domanda */}
        <p id="question-label" className="text-4xl sm:text-5xl font-black text-sky-950 select-none leading-none text-center">
          {digitEmojis} = ?
        </p>

        {/* Equazione numerica */}
        <p className="text-3xl sm:text-4xl font-black text-sky-800/85 font-mono leading-none tracking-[0.22em]">
          {multiplier} × {worldId} = ?
        </p>

        {/* Equazione visiva mnemonica */}
        <div className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sky-900 shadow-sm">
          <p className="text-sm sm:text-base font-black font-sans leading-tight">
            {mnemonicPair}
          </p>
        </div>

        {/* Griglia visiva */}
        <div className="mt-1 p-2.5 bg-white/50 rounded-2xl border border-white/40">
          <EmojiGrid rows={gridRows} cols={gridCols} emoji={world.itemsToCount} />
        </div>
      </SurfaceCard>

      {/* Opzioni */}
      <ActionGrid
        role="group"
        aria-label="Scegli la risposta"
        columns={2}
      >
        {options.map((opt, i) => {
          const isFeedbackOpt = feedback?.optionIndex === i;
          const isCorrectOpt = opt === answer;
          let cls = 'bg-white/50 border-white/60 text-sky-950 hover:bg-white/70 hover:scale-105';
          if (feedback) {
            if (isFeedbackOpt) {
              cls = feedback.correct
                ? 'bg-emerald-400 border-emerald-500 text-white scale-105'
                : 'bg-red-400 border-red-500 text-white';
            } else if (!feedback.correct && isCorrectOpt) {
              cls = 'bg-white/30 border-white/30 text-sky-950/40';
            } else {
              cls = 'bg-white/30 border-white/30 text-sky-950/40';
            }
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleAnswer(opt, i)}
              disabled={!!feedback}
              className={`rounded-2xl border-2 font-black text-2xl py-4 shadow-sm transition-all cursor-pointer
                          focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                          disabled:cursor-not-allowed ${cls}`}
              aria-label={`Risposta ${opt}`}
            >
              {opt}
            </button>
          );
        })}
      </ActionGrid>

      {/* Feedback motivazionale */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`text-center rounded-2xl py-3 px-4 font-black text-sm transition-all
            ${feedback.correct
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {feedback.message}
          {feedback.correct && <span className="ml-1" aria-hidden="true">+1 🪙</span>}
        </div>
      )}
    </div>
  );
}

// ─── Home: lista tabelline ────────────────────────────────────────────────────

function TrainingHome({
  profile,
  compactLayout,
  onSelect,
}: {
  profile: UserProfile;
  compactLayout?: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <div className={`training-home w-full h-full ${compactLayout ? 'training-home--compact space-y-3' : 'space-y-5'}`}>
      <SurfaceCard tone="soft" padding={compactLayout ? 'sm' : 'md'} className="training-home-head">
        <SectionHeader
          eyebrow="Allenamento libero"
          title="Quale tabellina vuoi allenare?"
          description="Tutte le tabelline sono disponibili. Scegli quella che vuoi esercitare!"
        />
      </SurfaceCard>

      <div
        role="list"
        aria-label="Lista tabelline disponibili"
        className={`training-home-grid w-full grid grid-cols-[repeat(auto-fit,minmax(clamp(4.4rem,18vw,6.2rem),1fr))] ${compactLayout ? 'gap-1.5' : 'gap-2.5'}`}
      >
        {WORLDS_DATA.map(world => (
          <div key={world.id} role="listitem">
            <WorldCard
              world={world}
              stars={getStars(profile, world.id)}
              onSelect={onSelect}
              compactLayout={compactLayout}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hub principale ───────────────────────────────────────────────────────────

export default function TrainingHub({ profile, updateProfile, compactLayout }: TrainingHubProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedWorld = selectedId !== null
    ? WORLDS_DATA.find(w => w.id === selectedId) ?? null
    : null;

  if (selectedWorld) {
    return (
      <TrainingSession
        world={selectedWorld}
        updateProfile={updateProfile}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <TrainingHome
      profile={profile}
      compactLayout={compactLayout}
      onSelect={setSelectedId}
    />
  );
}
