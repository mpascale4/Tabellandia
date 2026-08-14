import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_WIDTH, getHighScore, updateHighScore } from './arcadeShared';
import type { ArcadeGameProps } from './arcadeShared';

const SYMBOLS = ['🍎', '🐸', '⭐', '🎈', '🐝', '🌈', '🍓', '🐢'];

interface Card { symbol: string; matched: boolean; }

function shuffledDeck(): Card[] {
  const pairs = [...SYMBOLS, ...SYMBOLS].map(symbol => ({ symbol, matched: false }));
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

/** Mini-gioco arcade: Memory, trova tutte le coppie di carte uguali. */
export default function MemoryGame({ onExit }: ArcadeGameProps) {
  const [cards, setCards] = useState<Card[]>(() => shuffledDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('memory'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const won = useMemo(() => cards.every(c => c.matched), [cards]);

  const reset = useCallback(() => {
    setCards(shuffledDeck());
    setFlipped([]);
    setMoves(0);
    setLocked(false);
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, []);

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
      if (cards[a].symbol === cards[b].symbol) {
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
                className={`aspect-square rounded-lg text-lg flex items-center justify-center shadow-sm transition-all cursor-pointer
                  ${isVisible ? 'bg-white' : 'bg-indigo-500 hover:bg-indigo-400'}
                  ${card.matched ? 'opacity-60' : ''}
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400`}
                aria-label={isVisible ? `Carta ${card.symbol}` : 'Carta coperta'}
              >
                {isVisible ? <span aria-hidden="true">{card.symbol}</span> : <span aria-hidden="true">❓</span>}
              </button>
            );
          })}
        </div>
        {won && (
          <ArcadeOverlay emoji="🎉" title="Tutte le coppie trovate!" subtitle={`Mosse: ${moves}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Tocca due carte per volta e trova tutte le coppie</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
