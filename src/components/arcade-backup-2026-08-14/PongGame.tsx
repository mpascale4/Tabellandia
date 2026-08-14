import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_HEIGHT, ARCADE_CANVAS_WIDTH, ArcadeGameProps } from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const PADDLE_W = 60;
const PADDLE_H = 10;
const BALL_R = 6;
const CPU_SPEED = 1.6;
const CPU_AIM_ERROR_MAX = 22;
const POINTS_TO_WIN = 5;

interface Ball { x: number; y: number; vx: number; vy: number; }

/** Mini-gioco arcade: Pong verticale, giocatore in basso, CPU in alto. */
export default function PongGame({ onExit }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerXRef = useRef(WIDTH / 2 - PADDLE_W / 2);
  const cpuXRef = useRef(WIDTH / 2 - PADDLE_W / 2);
  const ballRef = useRef<Ball>({ x: WIDTH / 2, y: HEIGHT / 2, vx: 2.2, vy: 2.6 });
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [runId, setRunId] = useState(0);

  const reset = useCallback(() => {
    playerXRef.current = WIDTH / 2 - PADDLE_W / 2;
    cpuXRef.current = WIDTH / 2 - PADDLE_W / 2;
    ballRef.current = { x: WIDTH / 2, y: HEIGHT / 2, vx: 2.2, vy: 2.6 };
    setPlayerScore(0);
    setCpuScore(0);
    setStatus('playing');
    setRunId(id => id + 1);
  }, []);

  const movePlayer = useCallback((clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left - PADDLE_W / 2;
    playerXRef.current = Math.max(0, Math.min(WIDTH - PADDLE_W, x));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let pScore = 0;
    let cScore = 0;
    // Imprecisione della CPU: mira a un punto spostato casualmente rispetto
    // al centro esatto della palla, cosi ogni tanto la prende di striscio o
    // la manca, rendendola battibile.
    let aimError = (Math.random() - 0.5) * 2 * CPU_AIM_ERROR_MAX;

    const serve = (towardsPlayer: boolean) => {
      ballRef.current = {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: towardsPlayer ? 2.6 : -2.6,
      };
      aimError = (Math.random() - 0.5) * 2 * CPU_AIM_ERROR_MAX;
    };

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#a855f7';
      ctx.fillRect(cpuXRef.current, 8, PADDLE_W, PADDLE_H);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(playerXRef.current, HEIGHT - 18, PADDLE_W, PADDLE_H);

      ctx.beginPath();
      ctx.fillStyle = '#e2e8f0';
      ctx.arc(ballRef.current.x, ballRef.current.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    };

    const step = () => {
      if (stopped) return;
      const b = ballRef.current;
      b.x += b.vx;
      b.y += b.vy;

      if (b.x <= BALL_R || b.x >= WIDTH - BALL_R) b.vx *= -1;

      // CPU tracking (velocità ridotta e con margine d'errore per restare battibile)
      const cpuCenter = cpuXRef.current + PADDLE_W / 2;
      const cpuTarget = b.x + aimError;
      if (Math.abs(cpuCenter - cpuTarget) > 4) {
        cpuXRef.current += cpuCenter < cpuTarget ? CPU_SPEED : -CPU_SPEED;
        cpuXRef.current = Math.max(0, Math.min(WIDTH - PADDLE_W, cpuXRef.current));
      }

      // Collisione paddle CPU (in alto)
      if (b.vy < 0 && b.y - BALL_R <= 18 && b.x >= cpuXRef.current && b.x <= cpuXRef.current + PADDLE_W) {
        b.vy *= -1;
        sound.playTick();
      }
      // Collisione paddle player (in basso)
      if (b.vy > 0 && b.y + BALL_R >= HEIGHT - 18 && b.x >= playerXRef.current && b.x <= playerXRef.current + PADDLE_W) {
        b.vy *= -1;
        const hitPos = (b.x - (playerXRef.current + PADDLE_W / 2)) / (PADDLE_W / 2);
        b.vx = hitPos * 3;
        sound.playTick();
        // Nuovo errore di mira per la CPU ad ogni rilancio verso di lei.
        aimError = (Math.random() - 0.5) * 2 * CPU_AIM_ERROR_MAX;
      }

      // Punto CPU (palla sfugge in basso)
      if (b.y > HEIGHT + BALL_R) {
        cScore += 1;
        setCpuScore(cScore);
        sound.playError();
        if (cScore >= POINTS_TO_WIN) {
          setStatus('lost');
          stopped = true;
          return;
        }
        serve(false);
      }
      // Punto giocatore (palla sfugge in alto)
      if (b.y < -BALL_R) {
        pScore += 1;
        setPlayerScore(pScore);
        sound.playCorrect();
        if (pScore >= POINTS_TO_WIN) {
          sound.playRewardFanfare();
          setStatus('won');
          stopped = true;
          return;
        }
        serve(true);
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
    movePlayer(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🏓" title="Pong" scoreLabel={`Tu ${playerScore} · CPU ${cpuScore}`} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block touch-none cursor-pointer"
          onPointerMove={handlePointerMove}
        />
        {status === 'won' && (
          <ArcadeOverlay emoji="🏆" title="Hai vinto!" subtitle={`${playerScore} a ${cpuScore}`} onRetry={reset} />
        )}
        {status === 'lost' && (
          <ArcadeOverlay emoji="🤖" title="Ha vinto la CPU!" subtitle={`${cpuScore} a ${playerScore}, riprova!`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Muovi il dito o il mouse per spostare la tua racchetta in basso</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
