import React, { useState } from 'react';
import { sound } from '../SoundManager';
import SnakeGame from './SnakeGame';
import BubbleGame from './BubbleGame';
import WhackAMoleGame from './WhackAMoleGame';
import BasketGame from './BasketGame';
import FlappyGame from './FlappyGame';
import DinoGame from './DinoGame';
import RunnerGame from './RunnerGame';
import MemoryGame from './MemoryGame';
import FruitGame from './FruitGame';

export type GameId = 'snake' | 'bolle' | 'whack' | 'canestro' | 'flappy' | 'dino' | 'corsa' | 'memory' | 'frutta';

interface ArcadeMenuModalProps {
  onExit: () => void;
  /** Se presente, salta la scelta e mostra direttamente questo gioco (allenamento su una tabellina specifica). */
  onlyGame?: GameId;
  /** Tabellina assegnata (2..9). Se assente o 0, i giochi pescano le operazioni da tutte le tabelline (modalità Casuale). */
  tableId?: number;
}

export const ARCADE_GAMES: Array<{ id: GameId; emoji: string; name: string }> = [
  { id: 'snake', emoji: '🐍', name: 'Snake dei Numeri' },
  { id: 'bolle', emoji: '🫧', name: 'Bolle con i Risultati' },
  { id: 'whack', emoji: '🔨', name: 'Acchiappa la Talpa' },
  { id: 'canestro', emoji: '🏀', name: 'Canestro dei Numeri' },
  { id: 'flappy', emoji: '🐤', name: 'Flappy dei Numeri' },
  { id: 'dino', emoji: '🦖', name: 'Dino Run' },
  { id: 'corsa', emoji: '🏃', name: 'Corsa dei Numeri' },
  { id: 'memory', emoji: '🧠', name: 'Memory' },
  { id: 'frutta', emoji: '🍉', name: 'Frutta Matematica' },
];

function renderGame(id: GameId, onExit: () => void, tableId?: number) {
  switch (id) {
    case 'snake': return <SnakeGame onExit={onExit} tableId={tableId} />;
    case 'bolle': return <BubbleGame onExit={onExit} tableId={tableId} />;
    case 'whack': return <WhackAMoleGame onExit={onExit} tableId={tableId} />;
    case 'canestro': return <BasketGame onExit={onExit} tableId={tableId} />;
    case 'flappy': return <FlappyGame onExit={onExit} tableId={tableId} />;
    case 'dino': return <DinoGame onExit={onExit} tableId={tableId} />;
    case 'corsa': return <RunnerGame onExit={onExit} tableId={tableId} />;
    case 'memory': return <MemoryGame onExit={onExit} tableId={tableId} />;
    case 'frutta': return <FruitGame onExit={onExit} tableId={tableId} />;
    default: return null;
  }
}

/**
 * Sala Giochi: modale premio sbloccato con un 10/10 in Allenamento. Se
 * `onlyGame` è passato (allenamento su una tabellina specifica o scelta da
 * Casuale) mostra direttamente quel mini-gioco; altrimenti mostra il menù
 * con tutti i mini-giochi retro-arcade. Uscendo dal menù o da una partita
 * si chiama `onExit`, che nel flusso di Allenamento riporta alla schermata
 * di selezione dei giochini (non fuori dall'allenamento).
 */
export default function ArcadeMenuModal({ onExit, onlyGame, tableId }: ArcadeMenuModalProps) {
  const [selected, setSelected] = useState<GameId | null>(onlyGame ?? null);
  const games = onlyGame ? ARCADE_GAMES.filter(g => g.id === onlyGame) : ARCADE_GAMES;

  const handleSelect = (id: GameId) => {
    sound.playClick();
    setSelected(id);
  };

  const handleGameExit = () => {
    if (onlyGame) {
      onExit();
    } else {
      setSelected(null);
    }
  };

  // Durante una partita l'overlay deve essere davvero a schermo intero e opaco
  // (niente sfondo semi-trasparente che lascia intravedere l'interfaccia sotto,
  // footer Mappa/Allenamento/Genitori incluso): nel menù di scelta resta invece
  // il riquadro centrato come prima.
  const isPlaying = selected !== null;

  return (
    <div
      className={
        isPlaying
          ? 'fixed inset-0 z-50 flex bg-slate-50 overflow-y-auto'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto'
      }
    >
      <div
        className={
          isPlaying
            ? 'relative flex w-full flex-col bg-white'
            : 'relative w-full max-w-md bg-white rounded-2xl border-2 border-indigo-300 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]'
        }
      >
        <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 p-3.5 sm:p-4 text-white flex items-center gap-2 shadow-md shrink-0">
          <h2 className="text-base sm:text-lg font-black tracking-tight font-sans flex items-center gap-2">
            <span aria-hidden="true">🎮</span> Sala Giochi
          </h2>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto bg-slate-50 flex-1 flex flex-col gap-4">
          {selected === null ? (
            <div role="list" className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
              {games.map(game => (
                <button
                  key={game.id}
                  type="button"
                  role="listitem"
                  onClick={() => handleSelect(game.id)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-indigo-200 bg-white p-4 shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-indigo-400 hover:scale-[1.03] active:scale-[0.98]
                             focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                  aria-label={`Gioca a ${game.name}`}
                >
                  <span className="text-4xl" aria-hidden="true">{game.emoji}</span>
                  <span className="text-xs font-bold text-indigo-900 text-center">{game.name}</span>
                </button>
              ))}
            </div>
          ) : (
            renderGame(selected, handleGameExit, tableId)
          )}
          {selected === null && (
            <button
              type="button"
              onClick={onExit}
              className="w-full rounded-2xl bg-slate-200 py-3 text-sm font-bold text-slate-800 shadow-md transition-colors hover:bg-slate-300 cursor-pointer
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              aria-label="Torna alla lista delle tabelline"
            >
              Indietro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
