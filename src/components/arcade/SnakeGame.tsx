import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeControlBar from './ArcadeControlBar';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOperationBanner from './ArcadeOperationBanner';
import ArcadeOverlay from './ArcadeOverlay';
import { useArcadeReadyPhase } from '../../hooks/useArcadeReadyPhase';
import {
  ArcadeGameProps,
  generateDistractors,
  generateOperation,
  getDifficultyLevel,
  getHighScore,
  MathOperation,
  updateHighScore,
} from './arcadeShared';

const CELL = 27;
const COLS = 10;
const ROWS = 10;
const WIDTH = CELL * COLS;
const HEIGHT = CELL * ROWS;
const BASE_TICK_MS = 340;
const MIN_TICK_MS = 220;
const APPLE_COUNT = 2;

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';
interface Apple extends Point { value: number; correct: boolean; }

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function randomEmptyCell(taken: Point[]): Point {
  // Righe centrali escluse: ci sta sopra il banner con l'operazione (ora al centro), per non sovrapporsi.
  const forbiddenRows = [Math.floor(ROWS / 2) - 1, Math.floor(ROWS / 2)];
  for (;;) {
    const y = Math.floor(Math.random() * ROWS);
    if (forbiddenRows.includes(y)) continue;
    const candidate = { x: Math.floor(Math.random() * COLS), y };
    if (!taken.some(s => s.x === candidate.x && s.y === candidate.y)) return candidate;
  }
}

/** Genera APPLE_COUNT mele: una con il risultato corretto, le altre con distrattori, su celle libere. */
function spawnApples(op: MathOperation, snake: Point[]): Apple[] {
  const distractors = generateDistractors(op.answer, APPLE_COUNT - 1);
  const values = [op.answer, ...distractors].sort(() => Math.random() - 0.5);
  const taken: Point[] = [...snake];
  const apples: Apple[] = [];
  values.forEach(value => {
    const pos = randomEmptyCell(taken);
    taken.push(pos);
    apples.push({ ...pos, value, correct: value === op.answer });
  });
  return apples;
}

/** Mini-gioco arcade: "Snake dei numeri", mangia solo la mela col risultato giusto dell'operazione mostrata. */
export default function SnakeGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>([{ x: 4, y: 4 }]);
  const dirRef = useRef<Direction>('right');
  const nextDirRef = useRef<Direction>('right');
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const applesRef = useRef<Apple[]>(spawnApples(opRef.current, snakeRef.current));
  const [score, setScore] = useState(0);
  const [operation, setOperation] = useState(opRef.current);
  const [gameOver, setGameOver] = useState(false);
  const [runId, setRunId] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('snake'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 4, y: 4 }];
    dirRef.current = 'right';
    nextDirRef.current = 'right';
    opRef.current = generateOperation(tableId);
    applesRef.current = spawnApples(opRef.current, snakeRef.current);
    setOperation(opRef.current);
    setScore(0);
    setGameOver(false);
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  const setDirection = useCallback((dir: Direction) => {
    if (OPPOSITE[dir] === dirRef.current) return; // no inversione a 180°
    nextDirRef.current = dir;
  }, []);

  // Frecce da tastiera come alternativa accessibile al D-pad su schermo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setDirection('up');
      if (e.key === 'ArrowDown') setDirection('down');
      if (e.key === 'ArrowLeft') setDirection('left');
      if (e.key === 'ArrowRight') setDirection('right');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setDirection]);

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

      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      applesRef.current.forEach(apple => {
        const cx = apple.x * CELL + CELL / 2;
        const cy = apple.y * CELL + CELL / 2;
        ctx.beginPath();
        ctx.fillStyle = '#f43f5e';
        ctx.arc(cx, cy, CELL / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(isReadyRef.current ? String(apple.value) : (apple.correct ? '🍎' : '💣'), cx, cy + 1);
      });

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

      const hitApple = applesRef.current.find(a => a.x === next.x && a.y === next.y);
      const newSnake = [next, ...snakeRef.current];
      if (hitApple) {
        if (hitApple.correct) {
          sound.playCorrect();
          if (isReadyRef.current) {
            localScore += 1;
            setScore(localScore);
            const nextOp = generateOperation(tableId);
            opRef.current = nextOp;
            setOperation(nextOp);
            setRoundId(id => id + 1);
            applesRef.current = spawnApples(nextOp, newSnake);
            snakeRef.current = newSnake;
          } else {
            // Fase di lettura: mangiare la mela 🍎 e' un semplice allenamento, il serpente non cresce.
            newSnake.pop();
            applesRef.current = spawnApples(opRef.current, newSnake);
            snakeRef.current = newSnake;
          }
        } else {
          // Mela sbagliata (o 💣 in allenamento): game over, come sbattere contro il muro.
          stopped = true;
          sound.playError();
          setGameOver(true);
          const updated = updateHighScore('snake', localScore);
          setIsNewRecord(updated === localScore && (record === null || localScore > record));
          setRecord(updated);
          return;
        }
      } else {
        newSnake.pop();
        snakeRef.current = newSnake;
      }
      draw();

      // Difficolta progressiva: il serpente accelera col passare del tempo.
      const tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - getDifficultyLevel(elapsedTotal) * 25);
      elapsedTotal += tickMs;
      timeoutId = window.setTimeout(tick, tickMs);
    };

    draw();
    timeoutId = window.setTimeout(tick, BASE_TICK_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timeoutId);
    };
  }, [runId, tableId, record, isReadyRef]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🐍" title="Snake dei Numeri" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block"
        />
        <ArcadeInGameScore label={`Punti: ${score}`} record={record} isNewRecord={isNewRecord} />
        {gameOver && (
          <ArcadeOverlay
            emoji="🐍"
            title="Game Over!"
            subtitle={`Punteggio: ${score}`}
            onRetry={reset}
          />
        )}
      </div>
      <ArcadeControlBar
        onUp={() => setDirection('up')}
        onDown={() => setDirection('down')}
        onLeft={() => setDirection('left')}
        onRight={() => setDirection('right')}
      />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: mangia la 🍎 ed evita la 💣 per prendere il ritmo!'
          : 'Usa il D-pad (o le frecce da tastiera) per cambiare direzione. Mangia solo la mela col risultato giusto!'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
