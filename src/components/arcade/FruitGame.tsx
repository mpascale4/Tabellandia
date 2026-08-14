import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOperationBanner from './ArcadeOperationBanner';
import ArcadeOverlay from './ArcadeOverlay';
import {
  ARCADE_CANVAS_HEIGHT,
  ARCADE_CANVAS_WIDTH,
  ArcadeGameProps,
  generateDistractors,
  generateOperation,
  getDifficultyLevel,
  getHighScore,
  MathOperation,
  updateHighScore,
} from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const FRUIT_R = 16;
const GRAVITY = 0.16;
const BASE_SPAWN_MS = 1300;
const MIN_SPAWN_MS = 700;
const FRUIT_EMOJIS = ['🍉', '🍎', '🍊', '🍇', '🍓', '🍋'];
const BOMB_EMOJI = '💣';

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  correct: boolean;
  emoji: string;
  sliced: boolean;
}

let fruitIdCounter = 0;

function spawnFruit(op: MathOperation, correct: boolean): Fruit {
  const value = correct ? op.answer : generateDistractors(op.answer, 1)[0];
  const emoji = correct ? FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)] : BOMB_EMOJI;
  const x = 30 + Math.random() * (WIDTH - 60);
  return {
    id: fruitIdCounter++,
    x,
    y: HEIGHT + FRUIT_R,
    vx: (WIDTH / 2 - x) * 0.01 + (Math.random() - 0.5) * 1.2,
    vy: -(6.4 + Math.random() * 1.2),
    value,
    correct,
    emoji,
    sliced: false,
  };
}

/** Mini-gioco arcade: Frutta Matematica (stile Fruit Ninja), affetta solo la frutta col risultato giusto, evita le bombe sbagliate. Riservato alla modalità Casuale. */
export default function FruitGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const [operation, setOperation] = useState(opRef.current);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('frutta'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const reset = useCallback(() => {
    fruitsRef.current = [];
    opRef.current = generateOperation(tableId);
    setOperation(opRef.current);
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, [tableId]);

  const sliceAt = useCallback(
    (clientX: number, clientY: number, rect: DOMRect, onGameOver: (finalScore: number) => void, currentScoreRef: { v: number }) => {
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const hit = fruitsRef.current.find(f => !f.sliced && Math.hypot(f.x - x, f.y - y) < FRUIT_R + 6);
      if (!hit) return;
      hit.sliced = true;
      if (hit.correct) {
        currentScoreRef.v += 1;
        setScore(currentScoreRef.v);
        sound.playCorrect();
        const nextOp = generateOperation(tableId);
        opRef.current = nextOp;
        setOperation(nextOp);
      } else {
        sound.playError();
        onGameOver(currentScoreRef.v);
      }
    },
    [tableId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let elapsedSinceSpawn = 0;
    let elapsedTotal = 0;
    let lastTs = performance.now();
    const localScore = { v: 0 };

    const gameOver = (finalScore: number) => {
      setStatus('over');
      stopped = true;
      const updated = updateHighScore('frutta', finalScore);
      setIsNewRecord(updated === finalScore && (record === null || finalScore > record));
      setRecord(updated);
    };

    const draw = () => {
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fruitsRef.current.forEach(f => {
        if (f.sliced) return;
        ctx.fillText(f.emoji, f.x, f.y);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = f.correct ? '#bbf7d0' : '#fecaca';
        ctx.fillText(String(f.value), f.x, f.y + 18);
        ctx.font = '26px sans-serif';
      });
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedSinceSpawn += dt;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      const spawnInterval = Math.max(MIN_SPAWN_MS, BASE_SPAWN_MS - level * 130);

      if (elapsedSinceSpawn >= spawnInterval) {
        elapsedSinceSpawn = 0;
        // Garantisce sempre almeno un frutto giusto e una bomba distrattore in campo insieme.
        const correctPresent = fruitsRef.current.some(f => !f.sliced && f.correct);
        const bombPresent = fruitsRef.current.some(f => !f.sliced && !f.correct);
        if (!correctPresent) fruitsRef.current.push(spawnFruit(opRef.current, true));
        if (!bombPresent) fruitsRef.current.push(spawnFruit(opRef.current, false));
      }

      fruitsRef.current = fruitsRef.current
        .map(f => ({ ...f, x: f.x + f.vx, y: f.y + f.vy, vy: f.vy + GRAVITY }))
        .filter(f => f.sliced ? false : f.y < HEIGHT + FRUIT_R * 3);

      // Game Over immediato se il frutto corretto cade a terra senza essere affettato.
      fruitsRef.current.forEach(f => {
        if (!f.sliced && f.correct && f.y > HEIGHT + FRUIT_R * 2.9) {
          f.sliced = true;
          sound.playError();
          gameOver(localScore.v);
        }
      });

      if (stopped) return;

      draw();
      raf = requestAnimationFrame(step);
    };

    draw();
    raf = requestAnimationFrame(step);

    const pointerHandler = (e: PointerEvent) => {
      sliceAt(e.clientX, e.clientY, canvas.getBoundingClientRect(), gameOver, localScore);
    };
    canvas.addEventListener('pointerdown', pointerHandler);
    canvas.addEventListener('pointermove', e => {
      if (e.buttons > 0) pointerHandler(e);
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', pointerHandler);
    };
  }, [runId, sliceAt, record]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🍉" title="Frutta Matematica" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block touch-none cursor-crosshair" />
        <ArcadeInGameScore label={`Punti: ${score}`} record={record} isNewRecord={isNewRecord} />
        {status === 'over' && (
          <ArcadeOverlay emoji="🍉" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Affetta solo la frutta col risultato giusto, evita le bombe sbagliate!</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
