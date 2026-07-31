/**
 * TrainingHub – Modalità Allenamento libero.
 * Routing interno: lista tabelline → sessione esercizio con scelta multipla.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, WorldConfig } from '../types';
import { WORLDS_DATA } from '../data';
import { sound } from './SoundManager';
import ActionGrid from './layout/ActionGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';
import { getStoryDraftForEquation } from '../utils/storyMarkdown';

// ─── Emoji mnemoniche per cifra — basate sulla forma visiva della cifra ────────
// 0 🥚 Uovo      → ovale chiuso
// 1 ⛏️ Piccone   → linea verticale + tratto in cima
// 2 🦢 Cigno     → collo curvo che scende
// 3 💶 Euro      → doppia curva aperta + stanghette
// 4 🪑 Sedia     → schienale + seduta orizzontale
// 5 🐍 Serpente  → corpo piegato ad angolo
// 6 🐌 Chiocciola→ spirale chiusa in basso
// 7 ⚡ Fulmine   → zig-zag con angolo acuto
// 8 ♾️ Infinito  → due cerchi sovrapposti
// 9 🎈 Palloncino→ cerchio in alto + filo in basso

const DIGIT_INFO: Record<number, { name: string; emoji: string; artName: string }> = {
  0: { name: 'Uovo',        emoji: '🥚',  artName: "l'Uovo" },
  1: { name: 'Piccone',     emoji: '⛏️',  artName: 'il Piccone' },
  2: { name: 'Cigno',       emoji: '🦢',  artName: 'il Cigno' },
  3: { name: 'Euro',        emoji: '💶',  artName: "l'Euro" },
  4: { name: 'Sedia',       emoji: '🪑',  artName: 'la Sedia' },
  5: { name: 'Serpente',    emoji: '🐍',  artName: 'il Serpente' },
  6: { name: 'Chiocciola',  emoji: '🐌',  artName: 'la Chiocciola' },
  7: { name: 'Fulmine',     emoji: '⚡',  artName: 'il Fulmine' },
  8: { name: 'Infinito',    emoji: '♾️',  artName: "l'Infinito" },
  9: { name: 'Palloncino',  emoji: '🎈',  artName: 'il Palloncino' },
};

const DIGIT_EMOJI: Record<number, string> = Object.fromEntries(
  Object.entries(DIGIT_INFO).map(([k, v]) => [Number(k), v.emoji])
);

interface MnemonicStory {
  title: string;
  premise: string;
  climax: string;
  equationText: string;
}

function getMnemonicStory(a: number, b: number): MnemonicStory {
  const ans = a * b;
  const storyData = getStoryDraftForEquation(a, b);

  const itemA = DIGIT_INFO[a] ?? { name: `${a}`, emoji: `${a}`, artName: `${a}` };
  const itemB = DIGIT_INFO[b] ?? { name: `${b}`, emoji: `${b}`, artName: `${b}` };

  let premise = '';
  let climax = '';
  let title = `La storia di ${a} × ${b}`;

  if (storyData) {
    title = storyData.title;
    premise = storyData.premise;
    climax = storyData.climax;
  } else {
    if (ans < 10) {
      const resItem = DIGIT_INFO[ans] ?? { name: `${ans}`, emoji: `${ans}`, artName: `${ans}` };
      premise = `${itemA.artName} (${itemA.emoji}) e ${itemB.artName} (${itemB.emoji}) si incontrarono nei prati di Tabellandia per una nuova sfida.`;
      climax = `Lavorando insieme in perfetta armonia, fecero apparire ${resItem.artName} (${resItem.emoji})!`;
    } else {
      const tens = Math.floor(ans / 10);
      const units = ans % 10;
      const resTens = DIGIT_INFO[tens] ?? { name: `${tens}`, emoji: `${tens}`, artName: `${tens}` };
      const resUnits = DIGIT_INFO[units] ?? { name: `${units}`, emoji: `${units}`, artName: `${units}` };
      premise = `${itemA.artName} (${itemA.emoji}) e ${itemB.artName} (${itemB.emoji}) partirono insieme per una grande avventura.`;
      climax = `Alla fine del percorso trovarono ad attenderli ${resTens.artName} (${resTens.emoji}) e ${resUnits.artName} (${resUnits.emoji})!`;
    }
  }

  const equationText = `${a} (${itemA.emoji}) × ${b} (${itemB.emoji}) = ${ans} (${getMnemonicResult(ans)})`;

  return { title, premise, climax, equationText };
}

const RESULT_DIGIT_EMOJI: Record<number, string> = {
  0: '⭕',
  ...DIGIT_EMOJI,
};

function getMnemonicResult(ans: number): string {
  if (ans < 10) {
    return RESULT_DIGIT_EMOJI[ans] ?? `${ans}`;
  }
  const tens = Math.floor(ans / 10);
  const units = ans % 10;
  const tensEmoji = RESULT_DIGIT_EMOJI[tens] ?? `${tens}`;
  const unitsEmoji = RESULT_DIGIT_EMOJI[units] ?? `${units}`;
  return `${tensEmoji} ${unitsEmoji}`;
}

const TRAINING_WORLD_ICON: Record<number, string> = Object.fromEntries(
  Object.entries(DIGIT_INFO).filter(([k]) => Number(k) >= 2).map(([k, v]) => [Number(k), v.emoji])
);

function withTableIcon(worldId: number, label: string): string {
  const icon = TRAINING_WORLD_ICON[worldId] ?? '🔢';
  return label.trimEnd().endsWith(icon) ? label : `${label} ${icon}`;
}

const RANDOM_WORLD: WorldConfig = {
  id: 0,
  name: 'Allenamento Casuale',
  locationName: 'Regno Misto di Tabellandia',
  color: 'from-purple-500 to-indigo-600',
  accentColor: 'border-purple-400 text-purple-600 bg-purple-50',
  symbol: '🎲',
  mascotName: 'Tutti i Mnemocuccioli',
  mascotRole: 'Gli spiriti di Tabellandia',
  creatureName: 'Dado Magico',
  creatureDescription: 'Un dado incantato che mescola tutte le tabelline!',
  filastrocca: 'Gira il dado, salta il numero, impara tutto e sarai il più sicuro!',
  trickTitle: 'Meteora di Risposte',
  trickDescription: 'Concentrati su ogni singola moltiplicazione!',
  trickVisualExplanation: 'Ogni domanda usa la mnemotecnica visiva per aiutarti.',
  itemsToCount: '🎲',
  monuments: [],
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

function buildRandomQuestionDeck(count = 12): Question[] {
  const deck: Question[] = [];
  const usedKeys = new Set<string>();
  while (deck.length < count) {
    const m = Math.floor(Math.random() * 9) + 1; // 1..9
    const w = Math.floor(Math.random() * 8) + 2; // 2..9
    const key = `${m}x${w}`;
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      const answer = m * w;
      deck.push({ multiplier: m, worldId: w, answer, options: generateOptions(answer) });
    }
  }
  return deck;
}

function buildQuestionDeck(worldId: number): Question[] {
  if (worldId === 0) {
    return buildRandomQuestionDeck(12);
  }
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

// ─── Card singola tabellina ───────────────────────────────────────────────────

function WorldCard({ world, stars, onSelect, onStory, compactLayout }: {
  world: WorldConfig; stars: number; onSelect: (id: number) => void; onStory: (id: number) => void; compactLayout?: boolean;
}) {
  const isTrained = stars > 0;
  const worldIcon = TRAINING_WORLD_ICON[world.id] ?? '🦁';
  return (
    <div className="relative w-full aspect-square">
      <button
        type="button"
        onClick={() => onSelect(world.id)}
        className={`training-home-card w-full h-full rounded-2xl border-2 sm:border-3 border-indigo-300/80 bg-gradient-to-b from-indigo-50 to-indigo-100/90 shadow-sm
                   hover:shadow-md hover:border-indigo-400 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer
                   focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                   flex flex-col items-center justify-center p-2 sm:p-3 gap-1 overflow-hidden min-w-0`}
        aria-label={`Allena tabellina del ${world.id}: ${world.name}${isTrained ? ', già allenata' : ''}`}
      >
        {isTrained && (
          <span
            className="absolute top-1 right-1 inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] sm:text-xs font-black shadow-md z-10"
            aria-hidden="true"
          >
            ✓
          </span>
        )}
        <span className={`training-card-icon ${compactLayout ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'} leading-none drop-shadow-xs shrink-0`} aria-hidden="true">{worldIcon}</span>
        <div className="flex flex-col items-center leading-tight min-w-0 w-full px-1">
          <span className={`training-card-mul ${compactLayout ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-black font-mono text-indigo-900`}>×{world.id}</span>
          <span className="text-[10px] sm:text-xs font-bold text-indigo-700/90 tracking-tight truncate w-full text-center">{world.name}</span>
        </div>
      </button>

      {/* Bottone storia — sovrapposto in alto a sinistra */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onStory(world.id); }}
        className="absolute top-1 left-1 z-10 inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-amber-100 border border-amber-300 text-base shadow-sm hover:bg-amber-200 hover:scale-110 active:scale-95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500"
        aria-label={`Leggi le storie della tabellina del ${world.id}`}
        title="Leggi le storie"
      >
        <span aria-hidden="true" className="leading-none text-sm">📖</span>
      </button>
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
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inizializza il mazzo al montaggio o cambio mondo
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDeck(buildQuestionDeck(world.id));
    setDeckIndex(0);
    setFeedback(null);
    setShowStoryModal(false);
  }, [world.id]);

  const currentQuestion: Question | undefined = deck[deckIndex];

  const handleAnswer = useCallback((opt: number, optIndex: number) => {
    if (feedback) return; // blocca doppio click durante feedback
    if (!currentQuestion) return;

    const isCorrect = opt === currentQuestion.answer;

    if (isCorrect) {
      sound.playSuccess();
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
      // Resta sulla stessa domanda finche non viene data la risposta corretta (clear feedback breve dopo 350ms).
      timeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, 350);
      return;
    }

    // Avanza immediatamente alla prossima domanda dopo 150ms per la massima fluidità (come Pratico e Sfida)
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
    }, 150);
  }, [feedback, currentQuestion, updateProfile, world.id, deckIndex, deck.length]);

  // Cleanup timeout on unmount
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  if (!currentQuestion) {
    return (
      <SurfaceCard
        aria-live="polite"
        tone="soft"
        padding="lg"
        className="min-h-65 w-full flex items-center justify-center text-center"
      >
        <p className="text-sm font-bold text-sky-900">Prepariamo la prossima domanda...</p>
      </SurfaceCard>
    );
  }

  const { multiplier, worldId, answer, options } = currentQuestion;
  const story = getMnemonicStory(multiplier, worldId);

  return (
    <div className="flex w-full flex-col gap-4 relative">

      {/* Domanda */}
      <SurfaceCard
        aria-labelledby="question-label"
        tone="soft"
        padding="lg"
        className="w-full flex flex-col items-center gap-2.5"
      >
        {/* Titolo tabellina */}
        <p className="text-xs font-bold text-sky-700/70 uppercase tracking-widest font-sans">
          {world.id === 0
            ? `🎲 Allenamento Casuale • Tabellina del ${worldId}`
            : withTableIcon(worldId, `Tabellina del ${worldId}`)}
        </p>

        {/* Equazione numerica */}
        <p id="question-label" className="text-3xl sm:text-4xl font-black text-sky-800/85 font-mono leading-none tracking-[0.22em] text-center my-0.5">
          {multiplier} × {worldId} = ?
        </p>

        {/* Equazione visiva con mnemotecnica (es. 🦢 × 🦢 = 🪑) */}
        <div className="w-full max-w-sm rounded-2xl border border-sky-200/90 bg-sky-50 px-4 py-2.5 text-center text-sky-900 shadow-xs flex items-center justify-center gap-2.5 sm:gap-3.5 mt-0.5">
          <span className="text-4xl sm:text-5xl drop-shadow-xs" aria-label={`Mnemotecnico ${multiplier}`}>
            {DIGIT_EMOJI[multiplier] ?? multiplier}
          </span>
          <span className="text-2xl sm:text-3xl font-black font-sans text-sky-600 select-none">×</span>
          <span className="text-4xl sm:text-5xl drop-shadow-xs" aria-label={`Mnemotecnico ${worldId}`}>
            {DIGIT_EMOJI[worldId] ?? worldId}
          </span>
          <span className="text-2xl sm:text-3xl font-black font-sans text-sky-600 select-none">=</span>
          <span className="text-4xl sm:text-5xl drop-shadow-xs" aria-label={`Risultato mnemotecnico ${answer}`}>
            {getMnemonicResult(answer)}
          </span>
        </div>

        {/* Bottone per aprire la storia mnemotecnica */}
        <button
          type="button"
          onClick={() => setShowStoryModal(true)}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-100 to-amber-200/90 hover:from-amber-200 hover:to-amber-300 text-amber-900 border border-amber-300/80 px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          aria-label={`Leggi la storia mnemotecnica di ${multiplier} × ${worldId}`}
        >
          <span className="text-base sm:text-lg">📖</span>
          <span>Scopri la storia mnemotecnica</span>
        </button>
      </SurfaceCard>

      {/* Modal Popup Storia */}
      {showStoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowStoryModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border-3 border-amber-300 bg-gradient-to-b from-amber-50 via-amber-50 to-orange-50 p-5 sm:p-6 shadow-2xl text-slate-800 flex flex-col gap-3.5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bottone di chiusura */}
            <button
              type="button"
              onClick={() => setShowStoryModal(false)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-black text-sm transition-colors cursor-pointer"
              aria-label="Chiudi storia"
            >
              ✕
            </button>

            {/* Intestazione */}
            <div className="flex items-center gap-3 border-b border-amber-200/80 pb-3 pr-8">
              <span className="text-3xl sm:text-4xl shrink-0">📖</span>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-amber-950 leading-tight">
                  {story.title}
                </h3>
                <p className="text-xs font-bold text-amber-800/80 mt-0.5">
                  Mnemotecnica di {multiplier} × {worldId}
                </p>
              </div>
            </div>

            {/* Contenuto storia */}
            <div className="flex flex-col gap-2.5 text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
              {/* Premessa con fattori */}
              <div className="rounded-2xl bg-white/90 p-3.5 border border-amber-200 shadow-2xs">
                <p className="font-extrabold text-amber-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>1. La Premessa</span>
                  <span className="text-xs font-mono font-normal text-amber-700">({DIGIT_EMOJI[multiplier] ?? multiplier} × {DIGIT_EMOJI[worldId] ?? worldId})</span>
                </p>
                <p className="text-slate-800 text-sm leading-relaxed">{story.premise}</p>
              </div>

              {/* Climax e Finale con risultato */}
              <div className="rounded-2xl bg-amber-100/90 p-3.5 border border-amber-300/80 shadow-2xs">
                <p className="font-extrabold text-amber-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>2. Il Finale</span>
                  <span className="text-xs font-mono font-normal text-amber-700">({getMnemonicResult(answer)})</span>
                </p>
                <p className="text-amber-950 text-sm leading-relaxed font-medium">{story.climax}</p>
              </div>

              {/* Equazione finale */}
              <div className="rounded-2xl bg-amber-200/90 p-2.5 text-center border border-amber-400/60 shadow-xs mt-0.5">
                <p className="text-[10px] sm:text-xs font-bold text-amber-950 uppercase tracking-widest mb-0.5">
                  Formula Magica:
                </p>
                <p className="text-lg sm:text-xl font-black font-mono text-amber-950">
                  {story.equationText}
                </p>
              </div>
            </div>

            {/* Bottone Ok */}
            <button
              type="button"
              onClick={() => setShowStoryModal(false)}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-2.5 text-sm shadow-md transition-all cursor-pointer active:scale-95 mt-1"
            >
              Ho capito! ✨
            </button>
          </div>
        </div>
      )}

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
                          ${cls}`}
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
          className={`w-full text-center rounded-2xl py-3 px-4 font-black text-sm transition-all
            ${feedback.correct
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {feedback.message}
          {feedback.correct && <span className="ml-1" aria-hidden="true">+1 🪙</span>}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-2xl bg-slate-200 py-3 text-sm font-bold text-slate-800 shadow-md transition-colors hover:bg-slate-300 cursor-pointer
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        aria-label="Torna alla lista delle tabelline"
      >
        Indietro
      </button>
    </div>
  );
}

// ─── Lettore di storie sequenziale ───────────────────────────────────────────

function StoryReader({ worldId, onBack }: { worldId: number; onBack: () => void }) {
  const [index, setIndex] = useState(0); // 0-8
  const TOTAL = 9;
  const multiplier = index + 1;
  const story = getMnemonicStory(multiplier, worldId);
  const fullText = [story.premise, story.climax].filter(Boolean).join(' ');
  const worldIcon = TRAINING_WORLD_ICON[worldId] ?? '🔢';

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(TOTAL - 1, i + 1));

  return (
    <div className="flex w-full flex-col gap-4">

      {/* Header */}
      <SurfaceCard tone="soft" padding="sm" className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl" aria-hidden="true">{worldIcon}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-sky-700/70 uppercase tracking-widest">Storie della tabellina</p>
            <p className="text-base font-black text-sky-900 leading-tight">×{worldId}</p>
          </div>
        </div>
        <span
          className="text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5 tabular-nums shrink-0"
          aria-live="polite"
          aria-label={`Storia ${multiplier} di ${TOTAL}`}
        >
          {multiplier} / {TOTAL}
        </span>
      </SurfaceCard>

      {/* Card storia */}
      <SurfaceCard tone="soft" padding="lg" className="w-full flex flex-col gap-3">

        {/* Titolo operazione */}
        <div className="flex items-center gap-3 border-b border-amber-200 pb-3">
          <span className="text-3xl sm:text-4xl" aria-hidden="true">📖</span>
          <div>
            <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest">
              {multiplier} × {worldId} = {multiplier * worldId}
            </p>
            <h2 className="text-base sm:text-lg font-black text-amber-950 leading-tight">
              {story.title}
            </h2>
          </div>
        </div>

        {/* Equazione visiva */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 rounded-2xl border border-sky-200/90 bg-sky-50 px-4 py-2.5">
          <span className="text-3xl sm:text-4xl drop-shadow-xs" aria-label={`Mnemotecnico ${multiplier}`}>
            {DIGIT_EMOJI[multiplier] ?? multiplier}
          </span>
          <span className="text-xl font-black text-sky-600 select-none">×</span>
          <span className="text-3xl sm:text-4xl drop-shadow-xs" aria-label={`Mnemotecnico ${worldId}`}>
            {DIGIT_EMOJI[worldId] ?? worldId}
          </span>
          <span className="text-xl font-black text-sky-600 select-none">=</span>
          <span className="text-3xl sm:text-4xl drop-shadow-xs" aria-label={`Risultato ${multiplier * worldId}`}>
            {getMnemonicResult(multiplier * worldId)}
          </span>
        </div>

        {/* Testo narrativo */}
        <div
          className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-slate-800 text-sm sm:text-base leading-relaxed font-medium"
          aria-live="polite"
        >
          {fullText || <span className="text-slate-400 italic">Nessuna storia disponibile.</span>}
        </div>

        {/* Formula magica */}
        <div className="rounded-2xl bg-amber-200/80 border border-amber-400/60 px-3 py-2 text-center">
          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest mb-0.5">Formula Magica</p>
          <p className="text-base sm:text-lg font-black font-mono text-amber-950">{story.equationText}</p>
        </div>
      </SurfaceCard>

      {/* Navigazione */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="flex-1 rounded-2xl bg-slate-200 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all cursor-pointer hover:bg-slate-300 active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          aria-label="Storia precedente"
        >
          ← Precedente
        </button>
        <button
          type="button"
          onClick={next}
          disabled={index === TOTAL - 1}
          className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition-all cursor-pointer hover:bg-indigo-700 active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          aria-label="Storia successiva"
        >
          Successiva →
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-2xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-200 cursor-pointer
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        aria-label="Torna alla lista delle tabelline"
      >
        Indietro
      </button>
    </div>
  );
}

// ─── Home: lista tabelline ────────────────────────────────────────────────────

function TrainingHome({
  profile,
  compactLayout,
  onSelect,
  onStory,
}: {
  profile: UserProfile;
  compactLayout?: boolean;
  onSelect: (id: number) => void;
  onStory: (id: number) => void;
}) {
  return (
    <div className={`training-home w-full h-full ${compactLayout ? 'training-home--compact space-y-3' : 'space-y-5'}`}>
      <SurfaceCard tone="soft" padding={compactLayout ? 'sm' : 'md'} className="training-home-head">
        <SectionHeader
          eyebrow="Allenamento libero"
          title="Quale tabellina vuoi allenare?"
          description="Scegli una tabellina, gioca in modalità casuale o premi 📖 per le storie!"
        />
      </SurfaceCard>

      {/* Banner Allenamento Casuale */}
      <button
        type="button"
        onClick={() => onSelect(0)}
        className="w-full rounded-2xl border-2 sm:border-3 border-purple-300/90 bg-gradient-to-r from-purple-100 via-indigo-100 to-pink-100 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-purple-400 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 text-left focus-visible:outline-4 focus-visible:outline-sky-500"
        aria-label="Avvia Allenamento Casuale con domande scelte a caso da tutte le tabelline"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-2xl sm:text-3xl text-white shadow-md shrink-0">
            🎲
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-purple-950">
                Allenamento Casuale
              </span>
              <span className="rounded-full bg-purple-200/90 px-2 py-0.5 text-[10px] sm:text-xs font-extrabold text-purple-900 border border-purple-300">
                Tutte le tabelline
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-purple-900/80 leading-snug truncate">
              Metti alla prova la tua memoria con domande scelte a caso da ogni tabellina!
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-black text-purple-950 bg-white/90 rounded-xl px-3 py-2 border border-purple-200 shadow-2xs shrink-0">
          <span>Inizia</span>
          <span>🎲</span>
        </div>
      </button>

      <div
        role="list"
        aria-label="Lista tabelline disponibili"
        className={`training-home-grid w-full grid grid-cols-2 sm:grid-cols-4 ${compactLayout ? 'gap-2' : 'gap-3 sm:gap-4'}`}
      >
        {WORLDS_DATA.map(world => (
          <div key={world.id} role="listitem">
            <WorldCard
              world={world}
              stars={getStars(profile, world.id)}
              onSelect={onSelect}
              onStory={onStory}
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
  const [storyId, setStoryId] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const scrollables = document.querySelectorAll('.overflow-y-auto');
    scrollables.forEach(el => {
      el.scrollTop = 0;
    });
  }, [selectedId, storyId]);

  const selectedWorld = selectedId !== null
    ? (selectedId === 0 ? RANDOM_WORLD : WORLDS_DATA.find(w => w.id === selectedId) ?? null)
    : null;

  if (storyId !== null) {
    return (
      <StoryReader
        worldId={storyId}
        onBack={() => setStoryId(null)}
      />
    );
  }

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
      onStory={setStoryId}
    />
  );
}
