import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_HEIGHT, ARCADE_CANVAS_WIDTH, ArcadeGameProps, getDifficultyLevel, getHighScore, updateHighScore } from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const PADDLE_W = 64;
const PADDLE_H = 10;
const BALL_R = 6;
const BRICK_ROWS = 4;
const BRICK_COLS = 6;
const BRICK_W = WIDTH / BRICK_COLS;
const BRICK_H = 16;
const BRICK_TOP = 30;
const START_LIVES = 3;
const MAX_SPEED_MULTIPLIER = 1.6;

interface Ball { x: number; y: number; vx: number; vy: number; }

/** Mini-gioco arcade: Breakout con paddle mosso da mouse/touch. */
export default function BreakoutGame({ onExit }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paddleXRef = useRef(WIDTH / 2 - PADDLE_W / 2);
  const ballRef = useRef<Ball>({ x: WIDTH / 2, y: HEIGHT - 40, vx: 2.4, vy: -2.8 });
  const bricksRef = useRef<boolean[]>(Array(BRICK_ROWS * BRICK_COLS).fill(true));
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('breakout'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const reset = useCallback(() => {
    paddleXRef.current = WIDTH / 2 - PADDLE_W / 2;
    ballRef.current = { x: WIDTH / 2, y: HEIGHT - 40, vx: 2.4, vy: -2.8 };
    bricksRef.current = Array(BRICK_ROWS * BRICK_COLS).fill(true);
    setScore(0);
    setLives(START_LIVES);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, []);

  const movePaddle = useCallback((clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left - PADDLE_W / 2;
    paddleXRef.current = Math.max(0, Math.min(WIDTH - PADDLE_W, x));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let livesLeft = START_LIVES;
    let elapsedTotal = 0;
    let lastTs = performance.now();
    let localScore = 0;

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      bricksRef.current.forEach((alive, i) => {
        if (!alive) return;
        const col = i % BRICK_COLS;
        const row = Math.floor(i / BRICK_COLS);
        ctx.fillStyle = ['#f59e0b', '#f97316', '#ef4444', '#a855f7'][row % 4];
        ctx.fillRect(col * BRICK_W + 1, BRICK_TOP + row * BRICK_H + 1, BRICK_W - 2, BRICK_H - 2);
      });

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(paddleXRef.current, HEIGHT - 16, PADDLE_W, PADDLE_H);

      ctx.beginPath();
      ctx.fillStyle = '#e2e8f0';
      ctx.arc(ballRef.current.x, ballRef.current.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedTotal += dt;
      const speedMultiplier = Math.min(MAX_SPEED_MULTIPLIER, 1 + getDifficultyLevel(elapsedTotal) * 0.15);

      const b = ballRef.current;
      b.x += b.vx * speedMultiplier;
      b.y += b.vy * speedMultiplier;

      if (b.x <= BALL_R || b.x >= WIDTH - BALL_R) b.vx *= -1;
      if (b.y <= BALL_R) b.vy *= -1;

      // Paddle collision
      if (
        b.y + BALL_R >= HEIGHT - 16 &&
        b.y + BALL_R <= HEIGHT - 16 + PADDLE_H &&
        b.x >= paddleXRef.current &&
        b.x <= paddleXRef.current + PADDLE_W &&
        b.vy > 0
      ) {
        b.vy *= -1;
        const hitPos = (b.x - (paddleXRef.current + PADDLE_W / 2)) / (PADDLE_W / 2);
        b.vx = hitPos * 3.2;
      }

      // Brick collision
      const col = Math.floor(b.x / BRICK_W);
      const row = Math.floor((b.y - BRICK_TOP) / BRICK_H);
      if (row >= 0 && row < BRICK_ROWS && col >= 0 && col < BRICK_COLS) {
        const idx = row * BRICK_COLS + col;
        if (bricksRef.current[idx]) {
          bricksRef.current[idx] = false;
          b.vy *= -1;
          sound.playHammerBrickHit();
          localScore += 1;
          setScore(localScore);
          if (bricksRef.current.every(alive => !alive)) {
            sound.playRewardFanfare();
            setStatus('won');
            stopped = true;
            const updated = updateHighScore('breakout', localScore);
            setIsNewRecord(updated === localScore && (record === null || localScore > record));
            setRecord(updated);
          }
        }
      }

      // Ball out of bounds (missed paddle)
      if (b.y > HEIGHT + BALL_R) {
        livesLeft -= 1;
        setLives(livesLeft);
        if (livesLeft <= 0) {
          sound.playError();
          setStatus('lost');
          stopped = true;
          const updated = updateHighScore('breakout', localScore);
          setIsNewRecord(updated === localScore && (record === null || localScore > record));
          setRecord(updated);
          return;
        }
        b.x = WIDTH / 2;
        b.y = HEIGHT - 40;
        b.vx = 2.4;
        b.vy = -2.8;
      }

      draw();
      if (!stopped) raf = requestAnimationFrame(step);
    };

    draw();
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [runId]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    movePaddle(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🧱" title="Breakout" scoreLabel={`Mattoni: ${score} · Vite: ${lives}`} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block touch-none cursor-pointer"
          onPointerMove={handlePointerMove}
        />
        {status === 'won' && (
          <ArcadeOverlay emoji="🏆" title="Hai vinto!" subtitle="Tutti i mattoni distrutti" onRetry={reset} />
        )}
        {status === 'lost' && (
          <ArcadeOverlay emoji="💥" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Muovi il dito o il mouse sul riquadro per spostare la racchetta</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
