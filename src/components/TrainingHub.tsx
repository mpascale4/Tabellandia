/**
 * TrainingHub – Modalità Allenamento libero.
 * Routing interno: lista tabelline → sessione esercizio con scelta multipla.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, WorldConfig } from '../types';
import { WORLDS_DATA } from '../data';
import { sound } from './SoundManager';

// ─── Emoji mnemoniche per cifra (similitudine visiva + fonetica) ──────────────
// 1 🕯️ candela (dritta come l'1)
// 2 🐂 bue (forma delle corna)
// 3 👂 orecchio (profilo simile al 3)
// 4 ⛵ barca (la vela forma un 4)
// 5 ⭐ stella (5 punte)
// 6 🐌 lumaca (spirale come il 6)
// 7 🏒 mazza da hockey (angolo come il 7)
// 8 🕷️ ragno (8 zampe)
// 9 🎈 palloncino con filo (forma del 9)

const DIGIT_EMOJI: Record<number, string> = {
  1: '🕯️',
  2: '🐂',
  3: '👂',
  4: '⛵',
  5: '⭐',
  6: '🐌',
  7: '🏒',
  8: '🕷️',
  9: '🎈',
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
  const compactCard = !!compactLayout;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(world.id)}
        className={`training-home-card w-full aspect-square border-2 border-white/60 bg-white/50 backdrop-blur-sm shadow-md
                   hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer
                   focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                   flex flex-col items-center justify-center px-2 ${compactCard ? 'rounded-2xl py-2 gap-1' : 'rounded-3xl py-3 gap-1.5'}`}
        aria-label={`Allena tabellina del ${world.id}: ${world.name}`}
      >
        <span className={`training-card-emoji ${compactCard ? 'text-3xl' : 'text-4xl'} leading-none select-none`} aria-hidden="true">{world.symbol}</span>
        <span className={`training-card-mul ${compactCard ? 'text-lg' : 'text-xl'} font-black text-sky-950 leading-none`}>×{world.id}</span>
        <span className={`training-card-mascot ${compactCard ? 'hidden' : 'text-[11px]'} font-bold text-sky-700/80 font-sans text-center leading-tight`}>
          {world.mascotName}
        </span>
        {stars > 0 && <StarRow stars={stars} className="training-card-stars" />}
      </button>
    </li>
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
      sound.playCorrect?.();
      setScore(s => s + 1);
      updateProfile(p => ({ ...p, coins: p.coins + 1 }));
      setFeedback({
        correct: true,
        message: pickRandom(MOTIVATIONAL_CORRECT),
        optionIndex: optIndex,
      });
    } else {
      sound.playWrong?.();
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
      <section
        aria-live="polite"
        className="min-h-[260px] w-full rounded-3xl border border-white/50 bg-white/40 backdrop-blur-sm shadow-md p-6 flex items-center justify-center text-center"
      >
        <p className="text-sm font-bold text-sky-900">Prepariamo la prossima domanda...</p>
      </section>
    );
  }

  const { multiplier, worldId, answer, options } = currentQuestion;
  const digitEmojis = `${DIGIT_EMOJI[multiplier] ?? multiplier} × ${DIGIT_EMOJI[worldId] ?? worldId}`;

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
      <section
        aria-labelledby="question-label"
        className="bg-white/50 backdrop-blur-sm rounded-3xl border border-white/50 shadow-md p-6 flex flex-col items-center gap-3"
      >
        {/* Titolo tabellina */}
        <p className="text-xs font-bold text-sky-700/70 uppercase tracking-widest font-sans">
          Tabellina del {worldId}
        </p>

        {/* Emoji della domanda */}
        <p id="question-label" className="text-4xl font-black text-sky-950 select-none leading-snug text-center">
          {digitEmojis} = ?
        </p>

        {/* Equazione numerica */}
        <p className="text-lg font-black text-sky-800/70 font-mono leading-none">
          {multiplier} × {worldId} = ?
        </p>

        {/* Griglia visiva */}
        <div className="mt-1 p-3 bg-white/50 rounded-2xl border border-white/40">
          <EmojiGrid rows={gridRows} cols={gridCols} emoji={world.itemsToCount} />
        </div>
      </section>

      {/* Opzioni */}
      <div
        role="group"
        aria-label="Scegli la risposta"
        className="grid grid-cols-2 gap-3"
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
      </div>

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
    <div className={`training-home ${compactLayout ? 'training-home--compact space-y-3' : 'space-y-5'}`}>
      <div className={`training-home-head bg-white/40 backdrop-blur-sm rounded-3xl border border-white/40 shadow-sm ${compactLayout ? 'p-3' : 'p-4 md:p-5'} ${compactLayout ? 'space-y-0.5' : 'space-y-1'}`}>
        <span className="inline-block text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-sans">
          Allenamento libero
        </span>
        <h2 className={`${compactLayout ? 'text-lg' : 'text-xl'} font-black text-sky-950 font-sans`}>
          Quale tabellina vuoi allenare?
        </h2>
        <p className={`${compactLayout ? 'text-[11px]' : 'text-xs'} text-sky-900/75 font-medium leading-relaxed`}>
          Tutte le tabelline sono disponibili. Scegli quella che vuoi esercitare!
        </p>
      </div>

      <ul
        role="list"
        aria-label="Lista tabelline disponibili"
        className={`training-home-grid grid auto-rows-max ${compactLayout ? 'grid-cols-[repeat(auto-fit,minmax(4.1rem,1fr))] gap-1.5' : 'grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2.5'}`}
      >
        {WORLDS_DATA.map(world => (
          <WorldCard
            key={world.id}
            world={world}
            stars={getStars(profile, world.id)}
            onSelect={onSelect}
            compactLayout={compactLayout}
          />
        ))}
      </ul>
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
