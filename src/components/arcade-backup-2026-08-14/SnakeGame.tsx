import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ArcadeGameProps, getDifficultyLevel, getHighScore, updateHighScore } from './arcadeShared';

const CELL = 18;
const COLS = 15;
const ROWS = 15;
const WIDTH = CELL * COLS;
const HEIGHT = CELL * ROWS;
const BASE_TICK_MS = 320;
const MIN_TICK_MS = 190;

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function randomFood(snake: Point[]): Point {
  let candidate: Point;
  do {
    candidate = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === candidate.x && s.y === candidate.y));
  return candidate;
}

/** Mini-gioco arcade: Snake su griglia, controlli a frecce touch/mouse. */
export default function SnakeGame({ onExit }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>([{ x: 7, y: 7 }]);
  const dirRef = useRef<Direction>('right');
  const nextDirRef = useRef<Direction>('right');
  const foodRef = useRef<Point>(randomFood(snakeRef.current));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('snake'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 7, y: 7 }];
    dirRef.current = 'right';
    nextDirRef.current = 'right';
    foodRef.current = randomFood(snakeRef.current);
    setScore(0);
    setGameOver(false);
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, []);

  const setDirection = useCallback((dir: Direction) => {
    if (OPPOSITE[dir] === dirRef.current) return; // no inversione a 180°
    nextDirRef.current = dir;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let stopped = false;
    let elapsedTotal = 0;
    let timeoutId = 0;
    let localScore = 0;

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(foodRef.current.x * CELL + 2, foodRef.current.y * CELL + 2, CELL - 4, CELL - 4);

      snakeRef.current.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#34d399' : '#10b981';
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      });
    };

    const tick = () => {
      if (stopped) return;
      dirRef.current = nextDirRef.current;
      const head = snakeRef.current[0];
      let next: Point;
      switch (dirRef.current) {
        case 'up': next = { x: head.x, y: head.y - 1 }; break;
        case 'down': next = { x: head.x, y: head.y + 1 }; break;
        case 'left': next = { x: head.x - 1, y: head.y }; break;
        default: next = { x: head.x + 1, y: head.y };
      }

      const hitsWall = next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS;
      const hitsSelf = snakeRef.current.some(s => s.x === next.x && s.y === next.y);
      if (hitsWall || hitsSelf) {
        stopped = true;
        sound.playError();
        setGameOver(true);
        const updated = updateHighScore('snake', localScore);
        setIsNewRecord(updated === localScore && (record === null || localScore > record));
        setRecord(updated);
        return;
      }

      const ateFood = next.x === foodRef.current.x && next.y === foodRef.current.y;
      const newSnake = [next, ...snakeRef.current];
      if (ateFood) {
        sound.playCorrect();
        localScore += 1;
        setScore(localScore);
        foodRef.current = randomFood(newSnake);
      } else {
        newSnake.pop();
      }
      snakeRef.current = newSnake;
      draw();

      // Difficolta progressiva: il serpente accelera col passare del tempo.
      const tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - getDifficultyLevel(elapsedTotal) * 30);
      elapsedTotal += tickMs;
      timeoutId = window.setTimeout(tick, tickMs);
    };

    draw();
    timeoutId = window.setTimeout(tick, BASE_TICK_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timeoutId);
    };
  }, [runId]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🐍" title="Snake" />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block" />
        <ArcadeInGameScore label={`Mele: ${score}`} record={record} isNewRecord={isNewRecord} />
        {gameOver && (
          <ArcadeOverlay
            emoji="🐍"
            title="Game Over!"
            subtitle={`Hai mangiato ${score} ${score === 1 ? 'mela' : 'mele'}`}
            onRetry={reset}
          />
        )}
      </div>
      {/* D-pad touch/mouse */}
      <div className="grid grid-cols-3 gap-1.5 w-36" aria-label="Controlli direzione">
        <div />
        <button type="button" onClick={() => setDirection('up')} className="rounded-xl bg-indigo-200 py-2 text-lg font-black cursor-pointer hover:bg-indigo-300" aria-label="Su">⬆️</button>
        <div />
        <button type="button" onClick={() => setDirection('left')} className="rounded-xl bg-indigo-200 py-2 text-lg font-black cursor-pointer hover:bg-indigo-300" aria-label="Sinistra">⬅️</button>
        <div />
        <button type="button" onClick={() => setDirection('right')} className="rounded-xl bg-indigo-200 py-2 text-lg font-black cursor-pointer hover:bg-indigo-300" aria-label="Destra">➡️</button>
        <div />
        <button type="button" onClick={() => setDirection('down')} className="rounded-xl bg-indigo-200 py-2 text-lg font-black cursor-pointer hover:bg-indigo-300" aria-label="Giù">⬇️</button>
        <div />
      </div>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
