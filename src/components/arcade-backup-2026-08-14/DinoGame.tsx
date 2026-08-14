import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_HEIGHT, ARCADE_CANVAS_WIDTH, ArcadeGameProps, getDifficultyLevel, getHighScore, updateHighScore } from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const GROUND_Y = HEIGHT - 30;
const DINO_X = 40;
const DINO_SIZE = 26;
const GRAVITY = 0.55;
const JUMP_VY = -9.5;
const OBSTACLE_W = 16;
const OBSTACLE_H = 26;
const BASE_OBSTACLE_SPEED = 2.6;
const MAX_OBSTACLE_SPEED = 4.2;
const BASE_INTERVAL_MIN_MS = 1100;
const BASE_INTERVAL_MAX_MS = 1900;
const MIN_INTERVAL_MIN_MS = 650;
const MIN_INTERVAL_MAX_MS = 1150;

interface Obstacle { x: number; scored: boolean; }

/** Mini-gioco arcade: Dino Run, salta gli ostacoli con un tap/click. */
export default function DinoGame({ onExit }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dinoYRef = useRef(GROUND_Y - DINO_SIZE);
  const dinoVyRef = useRef(0);
  const onGroundRef = useRef(true);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('dino'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const reset = useCallback(() => {
    dinoYRef.current = GROUND_Y - DINO_SIZE;
    dinoVyRef.current = 0;
    onGroundRef.current = true;
    obstaclesRef.current = [];
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, []);

  const jump = useCallback(() => {
    if (status !== 'playing') return;
    if (!onGroundRef.current) return;
    dinoVyRef.current = JUMP_VY;
    onGroundRef.current = false;
    sound.playTick();
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let elapsedSinceObstacle = 0;
    let elapsedTotal = 0;
    let nextObstacleMs = BASE_INTERVAL_MIN_MS;
    let lastTs = performance.now();
    let localScore = 0;

    const draw = () => {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 2);
      ctx.lineTo(WIDTH, GROUND_Y + 2);
      ctx.stroke();

      ctx.fillStyle = '#4d7c0f';
      obstaclesRef.current.forEach(o => {
        ctx.fillRect(o.x, GROUND_Y - OBSTACLE_H, OBSTACLE_W, OBSTACLE_H);
      });

      ctx.font = `${DINO_SIZE}px sans-serif`;
      ctx.textBaseline = 'bottom';
      // L'emoji 🦖 guarda di default a sinistra: la capovolgiamo per farla
      // guardare verso destra, direzione di corsa e degli ostacoli in arrivo.
      ctx.save();
      ctx.translate(DINO_X + DINO_SIZE, 0);
      ctx.scale(-1, 1);
      ctx.fillText('🦖', 0, dinoYRef.current + DINO_SIZE);
      ctx.restore();
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedSinceObstacle += dt;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      const currentSpeed = Math.min(MAX_OBSTACLE_SPEED, BASE_OBSTACLE_SPEED + level * 0.4);

      dinoVyRef.current += GRAVITY;
      dinoYRef.current += dinoVyRef.current;
      if (dinoYRef.current >= GROUND_Y - DINO_SIZE) {
        dinoYRef.current = GROUND_Y - DINO_SIZE;
        dinoVyRef.current = 0;
        onGroundRef.current = true;
      }

      if (elapsedSinceObstacle >= nextObstacleMs) {
        elapsedSinceObstacle = 0;
        const intervalMin = Math.max(MIN_INTERVAL_MIN_MS, BASE_INTERVAL_MIN_MS - level * 110);
        const intervalMax = Math.max(MIN_INTERVAL_MAX_MS, BASE_INTERVAL_MAX_MS - level * 190);
        nextObstacleMs = intervalMin + Math.random() * (intervalMax - intervalMin);
        obstaclesRef.current.push({ x: WIDTH, scored: false });
      }

      obstaclesRef.current = obstaclesRef.current
        .map(o => ({ ...o, x: o.x - currentSpeed }))
        .filter(o => o.x > -OBSTACLE_W);

      let hit = false;
      obstaclesRef.current.forEach(o => {
        const withinX = DINO_X + DINO_SIZE * 0.6 > o.x && DINO_X + DINO_SIZE * 0.2 < o.x + OBSTACLE_W;
        const dinoBottom = dinoYRef.current + DINO_SIZE;
        const withinY = dinoBottom > GROUND_Y - OBSTACLE_H + 6;
        if (withinX && withinY) hit = true;
        if (!o.scored && o.x + OBSTACLE_W < DINO_X) {
          o.scored = true;
          localScore += 1;
          setScore(localScore);
        }
      });

      if (hit) {
        sound.playError();
        setStatus('over');
        stopped = true;
        const updated = updateHighScore('dino', localScore);
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
      <ArcadeGameHeader emoji="🦖" title="Dino Run" />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block touch-none cursor-pointer"
          onPointerDown={jump}
        />
        <ArcadeInGameScore label={`Punti: ${score}`} record={record} isNewRecord={isNewRecord} />
        {status === 'over' && (
          <ArcadeOverlay emoji="🦖" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Tocca o clicca il riquadro per far saltare il dinosauro</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
