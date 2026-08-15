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
const BIRD_X = 60;
const BIRD_R = 10;
const GRAVITY = 0.22;
const FLAP_VY = -5.4;
const PIPE_W = 44;
const BASE_GAP_H = 78;
const MIN_GAP_H = 62;
const BASE_PIPE_SPEED = 1.5;
const MAX_PIPE_SPEED = 2.5;
const MAX_FALL_VY = 4.2;

interface Gap { y: number; h: number; value: number; correct: boolean; }
interface Pipe { x: number; gaps: Gap[]; scored: boolean; isPractice: boolean; }

/** Genera un muro con 2 varchi (uno con il risultato giusto, uno con un distrattore), non sovrapposti. */
function buildGaps(op: MathOperation, gapH: number): Gap[] {
  const distractor = generateDistractors(op.answer, 1)[0];
  const values = [op.answer, distractor].sort(() => Math.random() - 0.5);
  const margin = 30;
  const y1 = margin + gapH / 2 + Math.random() * (HEIGHT / 2 - gapH - margin);
  const y2 = HEIGHT / 2 + gapH / 2 + Math.random() * (HEIGHT / 2 - gapH - margin);
  return [
    { y: y1, h: gapH, value: values[0], correct: values[0] === op.answer },
    { y: y2, h: gapH, value: values[1], correct: values[1] === op.answer },
  ];
}

/** Muro "di allenamento" (fase di lettura): un solo varco fisso al centro, senza numeri. */
function buildPracticeGap(gapH: number): Gap[] {
  return [{ y: HEIGHT / 2, h: gapH, value: 0, correct: true }];
}

/** Mini-gioco arcade: Flappy a tema tabelline, vola nel varco col risultato giusto dell'operazione.
 * Un solo muro alla volta e' legato all'operazione corrente: il muro successivo (e la prossima
 * operazione) compare solo dopo aver superato o colpito quello attuale, mai su un timer cieco,
 * cosi il banner mostra sempre l'operazione giusta per il muro davanti al pulcino. */
export default function FlappyGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const birdYRef = useRef(HEIGHT / 2);
  const birdVyRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const [operation, setOperation] = useState(opRef.current);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('flappy'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);

  const reset = useCallback(() => {
    birdYRef.current = HEIGHT / 2;
    birdVyRef.current = 0;
    pipesRef.current = [];
    opRef.current = generateOperation(tableId);
    setOperation(opRef.current);
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  const flap = useCallback(() => {
    if (status !== 'playing') return;
    birdVyRef.current = FLAP_VY;
    sound.playFlap();
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let pipeActive = false;
    let elapsedTotal = 0;
    let lastTs = performance.now();
    let localScore = 0;

    const draw = () => {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      pipesRef.current.forEach(p => {
        ctx.fillStyle = '#22c55e';
        let cursor = 0;
        const sortedGaps = [...p.gaps].sort((a, b) => a.y - b.y);
        sortedGaps.forEach(g => {
          const top = g.y - g.h / 2;
          ctx.fillRect(p.x, cursor, PIPE_W, Math.max(0, top - cursor));
          cursor = g.y + g.h / 2;
        });
        ctx.fillRect(p.x, cursor, PIPE_W, HEIGHT - cursor);

        // Etichetta al centro di ogni varco: stellina in fase di lettura, numero vero dopo.
        p.gaps.forEach(g => {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(p.isPractice ? '⭐' : String(g.value), p.x + PIPE_W / 2, g.y);
        });
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
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      const currentGapH = Math.max(MIN_GAP_H, BASE_GAP_H - level * 4);
      const currentSpeed = Math.min(MAX_PIPE_SPEED, BASE_PIPE_SPEED + level * 0.25);

      birdVyRef.current = Math.min(birdVyRef.current + GRAVITY, MAX_FALL_VY);
      birdYRef.current += birdVyRef.current;

      // Spawna il prossimo muro solo quando non ce n'e' uno attivo (superato/colpito il precedente).
      if (!pipeActive) {
        const isPractice = !isReadyRef.current;
        pipesRef.current.push({
          x: WIDTH,
          gaps: isPractice ? buildPracticeGap(currentGapH) : buildGaps(opRef.current, currentGapH),
          scored: false,
          isPractice,
        });
        pipeActive = true;
      }

      pipesRef.current = pipesRef.current
        .map(p => ({ ...p, x: p.x - currentSpeed }))
        .filter(p => p.x > -PIPE_W);

      let hit = birdYRef.current - BIRD_R <= 0 || birdYRef.current + BIRD_R >= HEIGHT;
      pipesRef.current.forEach(p => {
        const withinX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
        if (withinX) {
          const inCorrectGap = p.gaps.some(
            g => g.correct && birdYRef.current - BIRD_R > g.y - g.h / 2 && birdYRef.current + BIRD_R < g.y + g.h / 2
          );
          if (!inCorrectGap) hit = true;
        }
        if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
          p.scored = true;
          pipeActive = false;
          if (p.isPractice) {
            sound.playTick();
          } else {
            localScore += 1;
            setScore(localScore);
            sound.playCorrect();
            const nextOp = generateOperation(tableId);
            opRef.current = nextOp;
            setOperation(nextOp);
            setRoundId(id => id + 1);
          }
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
  }, [runId, tableId, record, isReadyRef]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🐤" title="Flappy dei Numeri" />
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
          <ArcadeOverlay emoji="🐤" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <ArcadeControlBar actionEmoji="🐤" actionLabel="Vola" onAction={flap} />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: vola nel varco con la ⭐ per prendere il ritmo!'
          : "Premi Vola per volare nel varco col risultato giusto dell'operazione!"}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}

