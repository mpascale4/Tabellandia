import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_HEIGHT, ARCADE_CANVAS_WIDTH, ArcadeGameProps, getDifficultyLevel, getHighScore, updateHighScore } from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const BIRD_X = 60;
const BIRD_R = 10;
const GRAVITY = 0.22;
const FLAP_VY = -5.4;
const PIPE_W = 44;
const BASE_PIPE_GAP = 140;
const MIN_PIPE_GAP = 105;
const BASE_PIPE_SPEED = 1.7;
const MAX_PIPE_SPEED = 2.9;
const PIPE_INTERVAL_MS = 1700;
const MAX_FALL_VY = 4.2;

interface Pipe { x: number; gapY: number; gap: number; scored: boolean; }

/** Mini-gioco arcade: Flappy semplice, tap/click per volare tra i tubi. */
export default function FlappyGame({ onExit }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const birdYRef = useRef(HEIGHT / 2);
  const birdVyRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('flappy'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const reset = useCallback(() => {
    birdYRef.current = HEIGHT / 2;
    birdVyRef.current = 0;
    pipesRef.current = [];
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, []);

  const flap = useCallback(() => {
    if (status !== 'playing') return;
    birdVyRef.current = FLAP_VY;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let elapsedSincePipe = PIPE_INTERVAL_MS; // spawna subito il primo tubo
    let elapsedTotal = 0;
    let lastTs = performance.now();
    let localScore = 0;

    const draw = () => {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = '#22c55e';
      pipesRef.current.forEach(p => {
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY - p.gap / 2);
        ctx.fillRect(p.x, p.gapY + p.gap / 2, PIPE_W, HEIGHT - (p.gapY + p.gap / 2));
      });

      ctx.beginPath();
      ctx.fillStyle = '#fef08a';
      ctx.arc(BIRD_X, birdYRef.current, BIRD_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedSincePipe += dt;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      const currentGap = Math.max(MIN_PIPE_GAP, BASE_PIPE_GAP - level * 9);
      const currentSpeed = Math.min(MAX_PIPE_SPEED, BASE_PIPE_SPEED + level * 0.3);

      birdVyRef.current = Math.min(birdVyRef.current + GRAVITY, MAX_FALL_VY);
      birdYRef.current += birdVyRef.current;

      if (elapsedSincePipe >= PIPE_INTERVAL_MS) {
        elapsedSincePipe = 0;
        const gapY = 70 + Math.random() * (HEIGHT - 140);
        pipesRef.current.push({ x: WIDTH, gapY, gap: currentGap, scored: false });
      }

      pipesRef.current = pipesRef.current
        .map(p => ({ ...p, x: p.x - currentSpeed }))
        .filter(p => p.x > -PIPE_W);

      let hit = birdYRef.current - BIRD_R <= 0 || birdYRef.current + BIRD_R >= HEIGHT;
      pipesRef.current.forEach(p => {
        const withinX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
        if (withinX) {
          const inGap = birdYRef.current - BIRD_R > p.gapY - p.gap / 2 && birdYRef.current + BIRD_R < p.gapY + p.gap / 2;
          if (!inGap) hit = true;
        }
        if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
          p.scored = true;
          localScore += 1;
          setScore(localScore);
          sound.playTick();
        }
      });

      if (hit) {
        sound.playError();
        setStatus('over');
        stopped = true;
        const updated = updateHighScore('flappy', localScore);
        setIsNewRecord(updated === localScore && (record === null || localScore > record));
        setRecord(updated);
        return;
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
  }, [runId]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🐤" title="Flappy" />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block touch-none cursor-pointer"
          onPointerDown={flap}
        />
        <ArcadeInGameScore label={`Punti: ${score}`} record={record} isNewRecord={isNewRecord} />
        {status === 'over' && (
          <ArcadeOverlay emoji="🐤" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Tocca o clicca il riquadro per far volare l'uccellino</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
