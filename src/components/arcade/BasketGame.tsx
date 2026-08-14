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
const BASKET_Y = 56;
const BASKET_W = 62;
const BASKET_H = 22;
const SHOOTER_Y = HEIGHT - 26;
const BALL_R = 7;
const BASE_BALL_SPEED = 4.2;
const MAX_BALL_SPEED = 6.4;
const MAX_LIVES = 3;
const BASE_SWAY_SPEED = 0.015;
const MAX_SWAY_SPEED = 0.04;

interface Basket { value: number; correct: boolean; centerX: number; phase: number; }
interface Ball { x: number; y: number; vy: number; }

/** Posizione X attuale del canestro tenendo conto dell'oscillazione (sway). */
function getBasketSwayX(basket: Basket, elapsed: number, swaySpeed: number): number {
  return basket.centerX + Math.sin(elapsed * 0.001 * swaySpeed + basket.phase) * 8;
}

/** Costruisce i 3 canestri (1 corretto + 2 distrattori) equidistanti. */
function buildBaskets(op: MathOperation): Basket[] {
  const distractors = generateDistractors(op.answer, 2);
  const values = [op.answer, ...distractors].sort(() => Math.random() - 0.5);
  const slotW = WIDTH / 3;
  return values.map((value, i) => ({
    value,
    correct: value === op.answer,
    centerX: slotW * i + slotW / 2,
    phase: Math.random() * Math.PI * 2,
  }));
}

/** Mini-gioco arcade: Canestro dei Numeri, tira la palla nel canestro col risultato giusto. */
export default function BasketGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shooterXRef = useRef(WIDTH / 2);
  const basketsRef = useRef<Basket[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const [operation, setOperation] = useState(opRef.current);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('canestro'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const reset = useCallback(() => {
    shooterXRef.current = WIDTH / 2;
    opRef.current = generateOperation(tableId);
    basketsRef.current = buildBaskets(opRef.current);
    ballRef.current = null;
    setOperation(opRef.current);
    setScore(0);
    setLives(MAX_LIVES);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, [tableId]);

  const moveShooter = useCallback((clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    shooterXRef.current = Math.max(10, Math.min(WIDTH - 10, x));
  }, []);

  const shoot = useCallback((currentSpeed: number) => {
    if (ballRef.current) return; // una palla per volta
    ballRef.current = { x: shooterXRef.current, y: SHOOTER_Y, vy: -currentSpeed };
    sound.playTick();
  }, []);

  useEffect(() => {
    basketsRef.current = buildBaskets(opRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let elapsedTotal = 0;
    let lastTs = performance.now();
    let localScore = 0;
    let localLives = MAX_LIVES;
    let speedForCurrentBall = BASE_BALL_SPEED;

    const draw = () => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      basketsRef.current.forEach(b => {
        const cx = getBasketSwayX(b, elapsedTotal, getSwaySpeed(elapsedTotal));
        ctx.fillStyle = '#b45309';
        ctx.fillRect(cx - BASKET_W / 2, BASKET_Y - BASKET_H / 2, BASKET_W, BASKET_H);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - BASKET_W / 2, BASKET_Y - BASKET_H / 2, BASKET_W, BASKET_H);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(b.value), cx, BASKET_Y + 1);
      });

      // Tiratore
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(shooterXRef.current - 14, SHOOTER_Y, 28, 8);

      if (ballRef.current) {
        ctx.beginPath();
        ctx.fillStyle = '#fbbf24';
        ctx.arc(ballRef.current.x, ballRef.current.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const getSwaySpeed = (elapsed: number) => {
      const level = getDifficultyLevel(elapsed);
      return BASE_SWAY_SPEED + (level / 4) * (MAX_SWAY_SPEED - BASE_SWAY_SPEED) * 60;
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      speedForCurrentBall = Math.min(MAX_BALL_SPEED, BASE_BALL_SPEED + level * 0.5);

      if (ballRef.current) {
        ballRef.current.y += ballRef.current.vy;
        if (ballRef.current.y <= BASKET_Y) {
          const swaySpeed = getSwaySpeed(elapsedTotal);
          const ballX = ballRef.current.x;
          const target = basketsRef.current.find(
            b => Math.abs(ballX - getBasketSwayX(b, elapsedTotal, swaySpeed)) <= BASKET_W / 2
          );
          if (target?.correct) {
            localScore += 1;
            setScore(localScore);
            sound.playCorrect();
            const nextOp = generateOperation(tableId);
            opRef.current = nextOp;
            basketsRef.current = buildBaskets(nextOp);
            setOperation(nextOp);
          } else {
            localLives -= 1;
            setLives(localLives);
            sound.playError();
            if (localLives <= 0) {
              setStatus('over');
              stopped = true;
              const updated = updateHighScore('canestro', localScore);
              setIsNewRecord(updated === localScore && (record === null || localScore > record));
              setRecord(updated);
              return;
            }
          }
          ballRef.current = null;
        }
      }

      draw();
      raf = requestAnimationFrame(step);
    };

    draw();
    raf = requestAnimationFrame(step);
    const shootHandler = () => shoot(speedForCurrentBall);
    canvas.addEventListener('pointerdown', shootHandler);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', shootHandler);
    };
  }, [runId, tableId, shoot, record]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    moveShooter(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🏀" title="Canestro dei Numeri" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block touch-none cursor-pointer"
          onPointerMove={handlePointerMove}
        />
        <ArcadeInGameScore label={`Punti: ${score} · Vite: ${lives}`} record={record} isNewRecord={isNewRecord} />
        {status === 'over' && (
          <ArcadeOverlay emoji="🏀" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Muovi il tiratore e tocca per lanciare nel canestro col risultato giusto!</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
