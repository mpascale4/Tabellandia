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
const BASKET_COUNT = 2;
const BASKET_Y = 56;
const BASKET_W = 66;
const BASKET_H = 22;
const SHOOTER_Y = HEIGHT - 26;
const BALL_R = 7;
const BASE_BALL_SPEED = 4.2;
const MAX_BALL_SPEED = 6.4;
const MAX_LIVES = 3;
const BASE_SWAY_SPEED = 0.022;
const MAX_SWAY_SPEED = 0.055;
const SWAY_AMPLITUDE = 14;

interface Basket { value: number; correct: boolean; centerX: number; phase: number; }
interface Ball { x: number; y: number; vy: number; }

/** Posizione X attuale del canestro tenendo conto dell'oscillazione (sway). */
function getBasketSwayX(basket: Basket, elapsed: number, swaySpeed: number): number {
  return basket.centerX + Math.sin(elapsed * 0.001 * swaySpeed + basket.phase) * SWAY_AMPLITUDE;
}

/** Costruisce i 2 canestri (1 corretto + 1 distrattore) equidistanti. */
function buildBaskets(op: MathOperation): Basket[] {
  const distractors = generateDistractors(op.answer, BASKET_COUNT - 1);
  const values = [op.answer, ...distractors].sort(() => Math.random() - 0.5);
  const slotW = WIDTH / BASKET_COUNT;
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
  const laneRef = useRef(0); // 0 = canestro sinistro, 1 = canestro destro
  const basketsRef = useRef<Basket[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const starIndexRef = useRef(0);
  const [operation, setOperation] = useState(opRef.current);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('canestro'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);

  const reset = useCallback(() => {
    laneRef.current = 0;
    opRef.current = generateOperation(tableId);
    basketsRef.current = buildBaskets(opRef.current);
    starIndexRef.current = Math.floor(Math.random() * BASKET_COUNT);
    ballRef.current = null;
    setOperation(opRef.current);
    setScore(0);
    setLives(MAX_LIVES);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  const nudgeShooter = useCallback((direction: -1 | 1) => {
    laneRef.current = Math.max(0, Math.min(BASKET_COUNT - 1, laneRef.current + direction));
  }, []);

  const ballSpeedRef = useRef(BASE_BALL_SPEED);
  const shoot = useCallback(() => {
    if (ballRef.current) return; // una palla per volta
    const slotW = WIDTH / BASKET_COUNT;
    const launchX = slotW * laneRef.current + slotW / 2;
    ballRef.current = { x: launchX, y: SHOOTER_Y, vy: -ballSpeedRef.current };
    sound.playShoot();
  }, []);

  useEffect(() => {
    basketsRef.current = buildBaskets(opRef.current);
    starIndexRef.current = Math.floor(Math.random() * BASKET_COUNT);
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

    const draw = () => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      basketsRef.current.forEach((b, i) => {
        const cx = getBasketSwayX(b, elapsedTotal, getSwaySpeed(elapsedTotal));
        ctx.fillStyle = '#b45309';
        ctx.fillRect(cx - BASKET_W / 2, BASKET_Y - BASKET_H / 2, BASKET_W, BASKET_H);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - BASKET_W / 2, BASKET_Y - BASKET_H / 2, BASKET_W, BASKET_H);
        ctx.fillStyle = '#ffffff';
        const label = isReadyRef.current ? String(b.value) : (i === starIndexRef.current ? '⭐' : '✖️');
        ctx.fillText(label, cx, BASKET_Y + 1);
      });

      // Tiratore: si sposta subito sulla corsia scelta con ◀ ▶ (nessuno spostamento a piccoli passi).
      const slotW = WIDTH / BASKET_COUNT;
      const shooterX = slotW * laneRef.current + slotW / 2;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(shooterX - 14, SHOOTER_Y, 28, 8);

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

    const startNextRound = () => {
      const nextOp = generateOperation(tableId);
      opRef.current = nextOp;
      basketsRef.current = buildBaskets(nextOp);
      starIndexRef.current = Math.floor(Math.random() * BASKET_COUNT);
      setOperation(nextOp);
      setRoundId(id => id + 1);
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      ballSpeedRef.current = Math.min(MAX_BALL_SPEED, BASE_BALL_SPEED + level * 0.5);

      if (ballRef.current) {
        ballRef.current.y += ballRef.current.vy;
        if (ballRef.current.y <= BASKET_Y) {
          const swaySpeed = getSwaySpeed(elapsedTotal);
          const ballX = ballRef.current.x;
          const targetIndex = basketsRef.current.findIndex(
            b => Math.abs(ballX - getBasketSwayX(b, elapsedTotal, swaySpeed)) <= BASKET_W / 2
          );
          const isHit = isReadyRef.current
            ? targetIndex >= 0 && basketsRef.current[targetIndex].correct
            : targetIndex === starIndexRef.current;
          if (isHit) {
            if (isReadyRef.current) {
              localScore += 1;
              setScore(localScore);
            }
            sound.playCorrect();
            if (isReadyRef.current) startNextRound();
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
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [runId, tableId, record, isReadyRef]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🏀" title="Canestro dei Numeri" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block"
        />
        <ArcadeInGameScore label={`Punti: ${score} · Vite: ${lives}`} record={record} isNewRecord={isNewRecord} />
        {status === 'over' && (
          <ArcadeOverlay emoji="🏀" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <ArcadeControlBar
        onLeft={() => nudgeShooter(-1)}
        onRight={() => nudgeShooter(1)}
        actionEmoji="🏀"
        actionLabel="Spara"
        onAction={shoot}
      />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: colpisci la ⭐ per prendere il ritmo!'
          : 'Muovi il tiratore con ◀ ▶ e premi Spara per lanciare nel canestro col risultato giusto!'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
