import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_WIDTH, generateOperation, getHighScore, updateHighScore } from './arcadeShared';
import type { ArcadeGameProps } from './arcadeShared';

const PAIR_COUNT = 8;

interface Card { pairId: number; label: string; matched: boolean; }

/** Genera un mazzo di coppie operazione↔risultato (es. "6×7" con "42"), invece di simboli uguali. */
function shuffledDeck(tableId?: number): Card[] {
  const cards: Card[] = [];
  const usedAnswers = new Set<number>();
  let attempts = 0;
  while (cards.length < PAIR_COUNT * 2 && attempts < 200) {
    attempts += 1;
    const op = generateOperation(tableId);
    if (usedAnswers.has(op.answer)) continue;
    usedAnswers.add(op.answer);
    const pairId = cards.length / 2;
    cards.push({ pairId, label: `${op.a}×${op.b}`, matched: false });
    cards.push({ pairId, label: String(op.answer), matched: false });
  }
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Mini-gioco arcade: Memory, trova le coppie operazione↔risultato corrispondenti. */
export default function MemoryGame({ onExit, tableId }: ArcadeGameProps) {
  const [cards, setCards] = useState<Card[]>(() => shuffledDeck(tableId));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('memory'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const won = useMemo(() => cards.every(c => c.matched), [cards]);

  const reset = useCallback(() => {
    setCards(shuffledDeck(tableId));
    setFlipped([]);
    setMoves(0);
    setLocked(false);
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, [tableId]);

  const flip = (index: number) => {
    if (locked || won) return;
    if (cards[index].matched || flipped.includes(index)) return;
    if (flipped.length === 2) return;

    const next = [...flipped, index];
    setFlipped(next);
    sound.playClick();

    if (next.length === 2) {
      setLocked(true);
      setMoves(m => m + 1);
      const [a, b] = next;
      if (cards[a].pairId === cards[b].pairId) {
        window.setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setFlipped([]);
          setLocked(false);
          sound.playCorrect();
        }, 400);
      } else {
        window.setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 700);
      }
    }
  };

  useEffect(() => {
    if (!won) return;
    sound.playRewardFanfare();
    const updated = updateHighScore('memory', moves, 'min');
    setIsNewRecord(updated === moves && (record === null || moves < record));
    setRecord(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🧠" title="Memory" />
      <div
        className="relative rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 shadow-md"
        style={{ width: ARCADE_CANVAS_WIDTH }}
        key={runId}
      >
        <ArcadeInGameScore label={`Mosse: ${moves}`} record={record} isNewRecord={isNewRecord} />
        <div role="list" className="grid grid-cols-4 gap-1.5">
          {cards.map((card, i) => {
            const isVisible = card.matched || flipped.includes(i);
            return (
              <button
                key={i}
                type="button"
                role="listitem"
                onClick={() => flip(i)}
                disabled={card.matched}
                className={`aspect-square rounded-lg text-sm font-black flex items-center justify-center shadow-sm transition-all cursor-pointer
                  ${isVisible ? 'bg-white text-slate-800' : 'bg-indigo-500 hover:bg-indigo-400'}
                  ${card.matched ? 'opacity-60' : ''}
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400`}
                aria-label={isVisible ? `Carta ${card.label}` : 'Carta coperta'}
              >
                {isVisible ? <span aria-hidden="true">{card.label}</span> : <span aria-hidden="true">❓</span>}
              </button>
            );
          })}
        </div>
        {won && (
          <ArcadeOverlay emoji="🎉" title="Tutte le coppie trovate!" subtitle={`Mosse: ${moves}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Trova le coppie operazione↔risultato (es. 6×7 con 42)</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
