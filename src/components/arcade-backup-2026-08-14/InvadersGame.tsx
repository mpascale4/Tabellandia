import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_HEIGHT, ARCADE_CANVAS_WIDTH, ArcadeGameProps, getDifficultyLevel, getHighScore, updateHighScore } from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const SHIP_W = 26;
const SHIP_Y = HEIGHT - 20;
const BULLET_SPEED = 4.5;
const ALIEN_COLS = 5;
const ALIEN_ROWS = 3;
const ALIEN_SIZE = 20;
const ALIEN_GAP_X = 10;
const ALIEN_GAP_Y = 16;
const ALIEN_START_Y = 26;
const BASE_ALIEN_SPEED_X = 0.5;
const MAX_ALIEN_SPEED_X = 1.3;
const ALIEN_DROP = 14;
const BASE_ALIEN_FIRE_INTERVAL_MS = 1300;
const MIN_ALIEN_FIRE_INTERVAL_MS = 650;
const ENEMY_BULLET_SPEED = 2.2;

interface Bullet { x: number; y: number; }
interface Alien { x: number; y: number; alive: boolean; }

/** Mini-gioco arcade: Invasori Spaziali, muovi la nave e spara agli alieni. */
export default function InvadersGame({ onExit }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shipXRef = useRef(WIDTH / 2 - SHIP_W / 2);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('invaders'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const buildAliens = useCallback((): Alien[] => {
    const aliens: Alien[] = [];
    const totalW = ALIEN_COLS * ALIEN_SIZE + (ALIEN_COLS - 1) * ALIEN_GAP_X;
    const startX = (WIDTH - totalW) / 2;
    for (let row = 0; row < ALIEN_ROWS; row += 1) {
      for (let col = 0; col < ALIEN_COLS; col += 1) {
        aliens.push({
          x: startX + col * (ALIEN_SIZE + ALIEN_GAP_X),
          y: ALIEN_START_Y + row * (ALIEN_SIZE + ALIEN_GAP_Y),
          alive: true,
        });
      }
    }
    return aliens;
  }, []);

  const aliensRef = useRef<Alien[]>(buildAliens());
  const alienDirRef = useRef(1);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<Bullet[]>([]);

  const reset = useCallback(() => {
    shipXRef.current = WIDTH / 2 - SHIP_W / 2;
    aliensRef.current = buildAliens();
    alienDirRef.current = 1;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, [buildAliens]);

  const moveShip = useCallback((clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left - SHIP_W / 2;
    shipXRef.current = Math.max(0, Math.min(WIDTH - SHIP_W, x));
  }, []);

  const shoot = useCallback(() => {
    if (status !== 'playing') return;
    bulletsRef.current.push({ x: shipXRef.current + SHIP_W / 2, y: SHIP_Y });
    sound.playTick();
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let elapsedSinceFire = 0;
    let elapsedTotal = 0;
    let lastTs = performance.now();
    let localScore = 0;

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(shipXRef.current + SHIP_W / 2, SHIP_Y - 10);
      ctx.lineTo(shipXRef.current, SHIP_Y + 8);
      ctx.lineTo(shipXRef.current + SHIP_W, SHIP_Y + 8);
      ctx.closePath();
      ctx.fill();

      ctx.font = `${ALIEN_SIZE}px sans-serif`;
      ctx.textBaseline = 'top';
      aliensRef.current.forEach(a => {
        if (a.alive) ctx.fillText('👾', a.x, a.y);
      });

      ctx.fillStyle = '#fde047';
      bulletsRef.current.forEach(b => ctx.fillRect(b.x - 1.5, b.y - 8, 3, 8));
      ctx.fillStyle = '#f87171';
      enemyBulletsRef.current.forEach(b => ctx.fillRect(b.x - 1.5, b.y, 3, 8));
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedSinceFire += dt;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      const currentAlienSpeed = Math.min(MAX_ALIEN_SPEED_X, BASE_ALIEN_SPEED_X + level * 0.2);
      const currentFireInterval = Math.max(MIN_ALIEN_FIRE_INTERVAL_MS, BASE_ALIEN_FIRE_INTERVAL_MS - level * 160);

      const aliveAliens = aliensRef.current.filter(a => a.alive);
      if (aliveAliens.length === 0) {
        sound.playRewardFanfare();
        setStatus('won');
        stopped = true;
        const updated = updateHighScore('invaders', localScore);
        setIsNewRecord(updated === localScore && (record === null || localScore > record));
        setRecord(updated);
        return;
      }

      const minX = Math.min(...aliveAliens.map(a => a.x));
      const maxX = Math.max(...aliveAliens.map(a => a.x)) + ALIEN_SIZE;
      let dropNow = false;
      if ((maxX >= WIDTH - 4 && alienDirRef.current > 0) || (minX <= 4 && alienDirRef.current < 0)) {
        alienDirRef.current *= -1;
        dropNow = true;
      }
      aliensRef.current.forEach(a => {
        if (!a.alive) return;
        a.x += currentAlienSpeed * alienDirRef.current;
        if (dropNow) a.y += ALIEN_DROP;
      });

      if (aliveAliens.some(a => a.y + ALIEN_SIZE >= SHIP_Y)) {
        sound.playError();
        setStatus('lost');
        stopped = true;
        const updated = updateHighScore('invaders', localScore);
        setIsNewRecord(updated === localScore && (record === null || localScore > record));
        setRecord(updated);
        return;
      }

      if (elapsedSinceFire >= currentFireInterval && aliveAliens.length > 0) {
        elapsedSinceFire = 0;
        const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
        enemyBulletsRef.current.push({ x: shooter.x + ALIEN_SIZE / 2, y: shooter.y + ALIEN_SIZE });
      }

      bulletsRef.current = bulletsRef.current
        .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
        .filter(b => b.y > -10);
      enemyBulletsRef.current = enemyBulletsRef.current
        .map(b => ({ ...b, y: b.y + ENEMY_BULLET_SPEED }))
        .filter(b => b.y < HEIGHT + 10);

      bulletsRef.current = bulletsRef.current.filter(b => {
        const hitAlien = aliensRef.current.find(
          a => a.alive && b.x > a.x && b.x < a.x + ALIEN_SIZE && b.y > a.y && b.y < a.y + ALIEN_SIZE
        );
        if (hitAlien) {
          hitAlien.alive = false;
          localScore += 1;
          setScore(localScore);
          sound.playCorrect();
          return false;
        }
        return true;
      });

      const shipHit = enemyBulletsRef.current.some(
        b => b.y + 8 >= SHIP_Y - 10 && b.x > shipXRef.current && b.x < shipXRef.current + SHIP_W
      );
      if (shipHit) {
        sound.playError();
        setStatus('lost');
        stopped = true;
        const updated = updateHighScore('invaders', localScore);
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

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    moveShip(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="👾" title="Invasori Spaziali" />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block touch-none cursor-pointer"
          onPointerMove={handlePointerMove}
          onPointerDown={shoot}
        />
        <ArcadeInGameScore label={`Colpiti: ${score}`} record={record} isNewRecord={isNewRecord} />
        {status === 'won' && (
          <ArcadeOverlay emoji="🏆" title="Hai vinto!" subtitle={`Alieni colpiti: ${score}`} onRetry={reset} />
        )}
        {status === 'lost' && (
          <ArcadeOverlay emoji="💥" title="Game Over!" subtitle={`Alieni colpiti: ${score}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Muovi il dito per spostare la nave, tocca per sparare</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
