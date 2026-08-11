/**
 * TrainingHub – Modalità Allenamento libero.
 * Routing interno: lista tabelline → sessione esercizio con scelta multipla.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, WorldConfig, QuestionAttempt } from '../types';
import { WORLDS_DATA } from '../data';
import { sound } from './SoundManager';
import ActionGrid from './layout/ActionGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';
import { getStoryDraftForEquation } from '../utils/storyMarkdown';
import { useVoice } from '../contexts/VoiceContext';

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

const TRAINING_SESSION_LENGTH = 10;
// Servono almeno alcuni tentativi storici su una specifica operazione prima di
// considerarla "debole" e darle un peso maggiore nell'estrazione casuale.
const WEAK_COMBO_MIN_ATTEMPTS = 3;
const WEAK_COMBO_MAX_WEIGHT_BOOST = 4; // un'operazione con 0% di accuratezza pesa fino a 5x rispetto a una piena

// Calcola il peso di un'operazione m×w per l'estrazione casuale: più bassa è
// l'accuratezza storica su quella combinazione, più alto è il peso (quindi più
// probabile che venga riproposta), pur lasciando sempre una probabilità base
// a tutte le combinazioni.
function weightForCombo(profile: UserProfile, m: number, w: number): number {
  const attempts = profile.history.filter(
    a => (a.a === m && a.b === w) || (a.a === w && a.b === m)
  );
  if (attempts.length < WEAK_COMBO_MIN_ATTEMPTS) return 1;
  const accuracy = attempts.filter(a => a.correct).length / attempts.length;
  return 1 + (1 - accuracy) * WEAK_COMBO_MAX_WEIGHT_BOOST;
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Costruisce una sessione di allenamento di TRAINING_SESSION_LENGTH domande,
// pescate con ripetizione e peso maggiore per le combinazioni più deboli.
function buildQuestionDeck(profile: UserProfile, worldId: number): Question[] {
  const candidates: Array<{ m: number; w: number }> = [];
  if (worldId === 0) {
    for (let m = 1; m <= 9; m++) {
      for (let w = 2; w <= 9; w++) {
        candidates.push({ m, w });
      }
    }
  } else {
    for (let m = 1; m <= 9; m++) {
      candidates.push({ m, w: worldId });
    }
  }
  const weights = candidates.map(({ m, w }) => weightForCombo(profile, m, w));

  const deck: Question[] = [];
  for (let i = 0; i < TRAINING_SESSION_LENGTH; i++) {
    const { m, w } = pickWeighted(candidates, weights);
    const answer = m * w;
    deck.push({ multiplier: m, worldId: w, answer, options: generateOptions(answer) });
  }
  return deck;
}

// ─── Helper: stelle per mondo ─────────────────────────────────────────────────

function getStars(profile: UserProfile, worldId: number): number {
  return profile.worldProgress?.[worldId]?.stars ?? 0;
}

// Soglie per considerare una tabellina "da rinforzare": servono almeno alcuni
// tentativi storici per evitare falsi positivi su dati troppo scarsi.
const WEAK_TABLE_MIN_ATTEMPTS = 4;
const WEAK_TABLE_ACCURACY_THRESHOLD = 0.6;

function isWeakWorld(profile: UserProfile, worldId: number): boolean {
  const attempts = profile.history.filter(a => a.a === worldId || a.b === worldId);
  if (attempts.length < WEAK_TABLE_MIN_ATTEMPTS) return false;
  const correctCount = attempts.filter(a => a.correct).length;
  return correctCount / attempts.length < WEAK_TABLE_ACCURACY_THRESHOLD;
}

// ─── Card singola tabellina ───────────────────────────────────────────────────

function WorldCard({ world, stars, isWeak, onSelect, compactLayout }: {
  world: WorldConfig; stars: number; isWeak: boolean; onSelect: (id: number) => void; compactLayout?: boolean;
}) {
  const isTrained = stars > 0;
  const worldIcon = TRAINING_WORLD_ICON[world.id] ?? '🦁';
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => onSelect(world.id)}
        className={`training-home-card w-full h-full min-h-[7.5rem] sm:min-h-[9rem] rounded-2xl border-2 sm:border-3 ${isWeak ? 'border-amber-400/90' : 'border-indigo-300/80'} bg-gradient-to-b from-indigo-50 to-indigo-100/90 shadow-sm
                   hover:shadow-md hover:border-indigo-400 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer
                   focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                   flex flex-col items-center justify-center p-2 sm:p-3 gap-1 min-w-0`}
        aria-label={`Allena tabellina del ${world.id}: ${world.name}${isTrained ? ', già allenata' : ''}${isWeak ? ', da rinforzare' : ''}`}
      >
        {isTrained && (
          <span
            className="absolute top-1 right-1 inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] sm:text-xs font-black shadow-md z-10"
            aria-hidden="true"
          >
            ✓
          </span>
        )}
        {isWeak && (
          <span
            className="absolute top-1 left-1 inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white bg-amber-500 text-white text-[10px] sm:text-xs font-black shadow-md z-10"
            aria-hidden="true"
            title="Tabellina da rinforzare"
          >
            💪
          </span>
        )}
        <span className={`training-card-icon ${compactLayout ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'} leading-none drop-shadow-xs shrink-0`} aria-hidden="true">{worldIcon}</span>
        <div className="flex flex-col items-center leading-tight min-w-0 w-full px-1">
          <span className={`training-card-mul ${compactLayout ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-black font-mono text-indigo-900`}>×{world.id}</span>
          <span className="w-full text-center text-[10px] sm:text-xs font-bold text-indigo-700/90 tracking-tight leading-tight whitespace-normal break-words">{world.name}</span>
        </div>
      </button>
    </div>
  );
}

// ─── Sessione di allenamento ──────────────────────────────────────────────────

type FeedbackState = { correct: boolean; optionIndex: number } | null;

function TrainingSession({
  world,
  profile,
  updateProfile,
  onBack,
  compactLayout,
  pendingAnnouncement,
}: {
  world: WorldConfig;
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  onBack: () => void;
  compactLayout?: boolean;
  pendingAnnouncement?: Promise<void> | null;
}) {
  // Deck nello state con init lazy: evita primo render vuoto ed e piu leggibile.
  const [deck, setDeck] = useState<Question[]>(() => buildQuestionDeck(profile, world.id));
  const [deckIndex, setDeckIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  // Conteggio errori della sessione corrente, per operazione (chiave "m x w"),
  // usato per mostrare a fine sessione il numero totale di errori e le
  // operazioni sbagliate più spesso.
  const [sessionMistakes, setSessionMistakes] = useState<Record<string, { multiplier: number; worldId: number; count: number }>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak } = useVoice();

  // Inizializza il mazzo al montaggio o cambio mondo
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDeck(buildQuestionDeck(profile, world.id));
    setDeckIndex(0);
    setFeedback(null);
    setSessionComplete(false);
    setSessionMistakes({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- il deck va rigenerato solo al cambio mondo, non ad ogni variazione di profile.history
  }, [world.id]);

  const startNewSession = useCallback(() => {
    setDeck(buildQuestionDeck(profile, world.id));
    setDeckIndex(0);
    setFeedback(null);
    setSessionComplete(false);
    setSessionMistakes({});
  }, [profile, world.id]);

  const currentQuestion: Question | undefined = sessionComplete ? undefined : deck[deckIndex];

  const handleAnswer = useCallback((opt: number, optIndex: number) => {
    if (feedback) return; // blocca doppio click durante feedback
    if (!currentQuestion) return;

    const isCorrect = opt === currentQuestion.answer;

    // Registra il tentativo in profile.history, cosi anche le risposte date
    // in Allenamento libero contribuiscono al calcolo delle tabelline piu deboli.
    const attempt: QuestionAttempt = {
      a: currentQuestion.multiplier,
      b: currentQuestion.worldId,
      correct: isCorrect,
      responseTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
    updateProfile(p => ({ ...p, history: [...p.history, attempt] }));

    if (isCorrect) {
      sound.playSuccess();
      updateProfile(p => {
        const wp = p.worldProgress[world.id] || {
          worldId: world.id,
          completedSteps: [],
          rebuiltMonuments: [],
          creatureEvolution: 'egg',
          highScore: 0,
          stars: 0
        };
        const currentCoins = wp.coins ?? wp.devCoins ?? 0;
        return {
          ...p,
          worldProgress: {
            ...p.worldProgress,
            [world.id]: {
              ...wp,
              coins: currentCoins + 1,
              devCoins: currentCoins + 1,
            }
          }
        };
      });
      setFeedback({
        correct: true,
        optionIndex: optIndex,
      });
    } else {
      sound.playError();
      setSessionMistakes(prev => {
        const key = `${currentQuestion.multiplier}x${currentQuestion.worldId}`;
        const existing = prev[key];
        return {
          ...prev,
          [key]: {
            multiplier: currentQuestion.multiplier,
            worldId: currentQuestion.worldId,
            count: (existing?.count ?? 0) + 1,
          },
        };
      });
      setFeedback({
        correct: false,
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
        // Sessione di TRAINING_SESSION_LENGTH domande completata
        setSessionComplete(true);
      } else {
        setDeckIndex(nextIndex);
      }
    }, 150);
  }, [feedback, currentQuestion, updateProfile, world.id, deckIndex, deck.length]);

  // Cleanup timeout on unmount
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // Annuncia vocalmente la nuova operazione all'ingresso di ogni domanda.
  // Attende prima che l'eventuale annuncio "Tabellina del N" / "Allenamento
  // casuale" (pronunciato al momento della selezione) sia completato, cosi
  // da non troncarlo con la successiva chiamata a speak() (che cancella
  // sempre l'utterance in corso). Va dichiarato prima di ogni return
  // condizionale per non violare le regole degli hook (ordine stabile).
  useEffect(() => {
    if (!currentQuestion) return;
    let cancelled = false;
    const announce = () => {
      if (!cancelled) void speak(`${currentQuestion.multiplier} per ${currentQuestion.worldId}`);
    };
    Promise.resolve(pendingAnnouncement).then(announce, announce);
    return () => {
      cancelled = true;
    };
  }, [currentQuestion, speak, pendingAnnouncement]);

  const speakCurrentOperation = useCallback(() => {
    if (!currentQuestion) return;
    void speak(`${currentQuestion.multiplier} per ${currentQuestion.worldId}`);
  }, [currentQuestion, speak]);

  if (!currentQuestion) {
    if (sessionComplete) {
      type Mistake = { multiplier: number; worldId: number; count: number };
      const mistakesList: Mistake[] = Object.values(sessionMistakes);
      mistakesList.sort((a, b) => b.count - a.count);
      const totalMistakes = mistakesList.reduce((sum, m) => sum + m.count, 0);
      const topMistakes = mistakesList.slice(0, 3);
      return (
        <div className="flex w-full min-h-full flex-col gap-4">
          <div className="flex flex-1 flex-col justify-center gap-3">
            <SurfaceCard
              aria-live="polite"
              tone="soft"
              padding="lg"
              className="min-h-65 w-full flex flex-col items-center justify-center gap-2 text-center"
            >
              <p className="text-2xl" aria-hidden="true">🎉</p>
              <p className="text-sm font-bold text-sky-900">Sessione completata! Hai risposto a 10 operazioni.</p>
              <p className="text-sm font-bold text-sky-900">
                {totalMistakes === 0
                  ? 'Nessun errore, complimenti! 🌟'
                  : `Errori totali: ${totalMistakes}`}
              </p>
            </SurfaceCard>
            {topMistakes.length > 0 && (
              <SurfaceCard tone="soft" padding="md" className="w-full text-left">
                <p className="text-xs font-bold text-sky-700/70 uppercase tracking-widest mb-2">
                  Operazioni da rivedere
                </p>
                <div role="list" className="grid grid-cols-1 gap-1.5">
                  {topMistakes.map(m => (
                    <div
                      key={`${m.multiplier}x${m.worldId}`}
                      role="listitem"
                      className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-3 py-1.5"
                    >
                      <span className="text-sm font-black text-red-700">{m.multiplier} × {m.worldId}</span>
                      <span className="text-xs font-bold text-red-600">
                        {m.count} {m.count === 1 ? 'errore' : 'errori'}
                      </span>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            )}
          </div>
          <div className="flex flex-row gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-2xl bg-slate-200 py-3 text-sm font-bold text-slate-800 shadow-md transition-colors hover:bg-slate-300 cursor-pointer
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              aria-label="Torna alla lista delle tabelline"
            >
              Indietro
            </button>
            <button
              type="button"
              onClick={startNewSession}
              className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-600 cursor-pointer
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              aria-label="Inizia un'altra sessione di 10 operazioni"
            >
              Altre 10
            </button>
          </div>
        </div>
      );
    }
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

  return (
    <div className="flex w-full min-h-full flex-col gap-4">
      <div className="flex flex-1 flex-col gap-4">

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

        {/* Equazione numerica (cliccabile per riascoltare l'operazione) */}
        <button
          type="button"
          id="question-label"
          onClick={speakCurrentOperation}
          aria-label={`Ascolta operazione ${multiplier} per ${worldId}`}
          className="rounded px-1 text-3xl sm:text-4xl font-black text-sky-800/85 font-mono leading-none tracking-[0.22em] text-center my-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500"
        >
          {multiplier} × {worldId} = ?
        </button>

        {/* Equazione visiva con mnemotecnica (es. 🦢 × 🦢 = 🪑) */}
        <div className="w-full max-w-sm rounded-2xl border border-sky-200/90 bg-sky-50 px-3 py-2.5 text-center text-sky-900 shadow-xs flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 mt-0.5 overflow-hidden">
          <span className="shrink-0 text-2xl sm:text-3xl drop-shadow-xs" aria-label={`Mnemotecnico ${multiplier}`}>
            {DIGIT_EMOJI[multiplier] ?? multiplier}
          </span>
          <span className="shrink-0 text-lg sm:text-xl font-black font-sans text-sky-600 select-none">×</span>
          <span className="shrink-0 text-2xl sm:text-3xl drop-shadow-xs" aria-label={`Mnemotecnico ${worldId}`}>
            {DIGIT_EMOJI[worldId] ?? worldId}
          </span>
          <span className="shrink-0 text-lg sm:text-xl font-black font-sans text-sky-600 select-none">=</span>
          <span className="shrink-0 text-2xl sm:text-3xl drop-shadow-xs" aria-label={`Risultato mnemotecnico ${answer}`}>
            {getMnemonicResult(answer)}
          </span>
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
                          ${cls}`}
              aria-label={`Risposta ${opt}`}
            >
              {opt}
            </button>
          );
        })}
      </ActionGrid>
      </div>

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
          description="Scegli una tabellina da allenare o affidati al caso 🎲 · 💪 = tabellina da rinforzare"
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
            <span className="text-base sm:text-lg font-black text-purple-950">
              Allenamento Casuale
            </span>
            <p className="text-xs sm:text-sm font-medium text-purple-900/80 leading-snug truncate">
              Metti alla prova la tua memoria con domande scelte a caso da ogni tabellina!
            </p>
          </div>
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
              isWeak={isWeakWorld(profile, world.id)}
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
  const { speak } = useVoice();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const scrollables = document.querySelectorAll('.overflow-y-auto');
    scrollables.forEach(el => {
      el.scrollTop = 0;
    });
  }, [selectedId]);

  const selectedWorld = selectedId !== null
    ? (selectedId === 0 ? RANDOM_WORLD : WORLDS_DATA.find(w => w.id === selectedId) ?? null)
    : null;

  const selectAnnouncementRef = useRef<Promise<void> | null>(null);

  const handleSelectWorld = useCallback((id: number) => {
    setSelectedId(id);
    selectAnnouncementRef.current = speak(id === 0 ? 'Allenamento casuale' : `Tabellina del ${id}`);
  }, [speak]);

  if (selectedWorld) {
    return (
      <TrainingSession
        world={selectedWorld}
        profile={profile}
        updateProfile={updateProfile}
        onBack={() => setSelectedId(null)}
        compactLayout={compactLayout}
        pendingAnnouncement={selectAnnouncementRef.current}
      />
    );
  }

  return (
    <TrainingHome
      profile={profile}
      compactLayout={compactLayout}
      onSelect={handleSelectWorld}
    />
  );
}
