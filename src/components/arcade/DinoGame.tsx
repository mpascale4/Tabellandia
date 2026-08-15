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
const GROUND_Y = HEIGHT - 30;
const DINO_X = 40;
const DINO_SIZE = 26;
const GRAVITY = 0.55;
const JUMP_VY = -9.5;
const NUMBERED_W = 26;
const CACTUS_W = 22;
const BASE_OBSTACLE_SPEED = 2.6;
const MAX_OBSTACLE_SPEED = 4.2;
const BASE_INTERVAL_MIN_MS = 1100;
const BASE_INTERVAL_MAX_MS = 1900;
const MIN_INTERVAL_MIN_MS = 650;
const MIN_INTERVAL_MAX_MS = 1150;

interface Obstacle {
  x: number;
  scored: boolean;
  kind: 'cactus' | 'numbered';
  numbered?: { value: number; correct: boolean };
}

/** Mini-gioco arcade: Dino Run, salta gli ostacoli col pulsante "Salta". Ogni ostacolo mostra un
 * numero: quello sbagliato va saltato, mentre quello con il risultato corretto dell'operazione
 * va "raccolto" (bonus, nessun danno) correndoci semplicemente sopra. Nei primi 5s dopo ogni nuova
 * operazione arrivano cactus 🌵 generici (sempre da saltare, rischio reale) per dare il tempo di
 * leggere e calcolare, prima che compaiano i numeri veri. */
export default function DinoGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dinoYRef = useRef(GROUND_Y - DINO_SIZE);
  const dinoVyRef = useRef(0);
  const onGroundRef = useRef(true);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const obstacleCountRef = useRef(0);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const [operation, setOperation] = useState(opRef.current);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('dino'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);

  const reset = useCallback(() => {
    dinoYRef.current = GROUND_Y - DINO_SIZE;
    dinoVyRef.current = 0;
    onGroundRef.current = true;
    obstaclesRef.current = [];
    obstacleCountRef.current = 0;
    opRef.current = generateOperation(tableId);
    setOperation(opRef.current);
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  const jump = useCallback(() => {
    if (status !== 'playing') return;
    if (!onGroundRef.current) return;
    dinoVyRef.current = JUMP_VY;
    onGroundRef.current = false;
    sound.playJump();
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

      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      obstaclesRef.current.forEach(o => {
        if (o.kind === 'cactus') {
          ctx.font = `${CACTUS_W}px sans-serif`;
          ctx.fillText('🌵', o.x + CACTUS_W / 2, GROUND_Y - CACTUS_W / 2 + 4);
          ctx.font = 'bold 13px sans-serif';
          return;
        }
        ctx.fillStyle = '#4d7c0f';
        ctx.beginPath();
        ctx.arc(o.x + NUMBERED_W / 2, GROUND_Y - NUMBERED_W / 2, NUMBERED_W / 2, 0, Math.PI * 2);
        ctx.fill();
        // Contorno scuro dietro al numero per una migliore leggibilita' (contrasto) sul cerchio verde.
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#14290a';
        ctx.strokeText(String(o.numbered?.value), o.x + NUMBERED_W / 2, GROUND_Y - NUMBERED_W / 2 + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(o.numbered?.value), o.x + NUMBERED_W / 2, GROUND_Y - NUMBERED_W / 2 + 1);
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

        if (!isReadyRef.current) {
          // Fase di lettura: cactus generico, sempre da saltare (rischio reale, nessun numero).
          obstaclesRef.current.push({ x: WIDTH, scored: false, kind: 'cactus' });
        } else {
          obstacleCountRef.current += 1;
          if (obstacleCountRef.current % 2 === 1) {
            // Risultato sbagliato dell'operazione corrente: va saltato.
            const wrongValue = generateDistractors(opRef.current.answer, 1)[0];
            obstaclesRef.current.push({ x: WIDTH, scored: false, kind: 'numbered', numbered: { value: wrongValue, correct: false } });
          } else {
            // Risultato corretto: va raccolto senza saltare.
            obstaclesRef.current.push({ x: WIDTH, scored: false, kind: 'numbered', numbered: { value: opRef.current.answer, correct: true } });
          }
        }
      }

      obstaclesRef.current = obstaclesRef.current
        .map(o => ({ ...o, x: o.x - currentSpeed }))
        .filter(o => o.x > -NUMBERED_W);

      let hit = false;
      obstaclesRef.current.forEach(o => {
        const w = o.kind === 'cactus' ? CACTUS_W : NUMBERED_W;
        const withinX = DINO_X + DINO_SIZE * 0.6 > o.x && DINO_X + DINO_SIZE * 0.2 < o.x + w;
        const dinoBottom = dinoYRef.current + DINO_SIZE;
        const withinY = dinoBottom > GROUND_Y - w + 6;
        if (withinX && withinY) {
          if (o.kind === 'numbered' && o.numbered?.correct) {
            // Raccolta del risultato giusto: bonus, nessun danno.
            if (!o.scored) {
              o.scored = true;
              sound.playCorrect();
              localScore += 2;
              setScore(localScore);
              const nextOp = generateOperation(tableId);
              opRef.current = nextOp;
              setOperation(nextOp);
              setRoundId(id => id + 1);
            }
          } else {
            hit = true;
          }
        }
        if (!o.scored && o.x + w < DINO_X) {
          o.scored = true;
          if (o.kind === 'numbered' && !o.numbered?.correct) {
            localScore += 1;
            setScore(localScore);
          }
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
  }, [runId, tableId, isReadyRef]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🦖" title="Dino Run" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block"
        />
        <ArcadeInGameScore label={`Punti: ${score}`} record={record} isNewRecord={isNewRecord} />
        {status === 'over' && (
          <ArcadeOverlay emoji="🦖" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <ArcadeControlBar actionEmoji="🦖" actionLabel="Salta" onAction={jump} />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: salta i cactus 🌵 per prendere il ritmo!'
          : 'Premi Salta per superare i numeri sbagliati, raccogli il risultato giusto correndoci sopra!'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}

