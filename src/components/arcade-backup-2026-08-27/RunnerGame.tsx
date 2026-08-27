import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeControlBar from './ArcadeControlBar';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOperationBanner from './ArcadeOperationBanner';
import ArcadeOverlay from './ArcadeOverlay';
import { useArcadeCollectEffect } from './ArcadeCollectEffect';
import { useArcadeOperationVoice } from './useArcadeOperationVoice';
import { useVoice } from '../../contexts/VoiceContext';
import { buildMultiplicationResultSpeech } from '../../utils/voiceFeedback';
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
const LANES = 3;
const RUNNER_Y = HEIGHT - 34;
const SIGN_H = 20;
const BASE_SIGN_SPEED = 1.7;
const MAX_SIGN_SPEED = 3.1;
const SIGN_INTERVAL_MS = 2000;

function laneX(lane: number): number {
  const slotW = WIDTH / LANES;
  return slotW * lane + slotW / 2;
}

interface SignRow { y: number; scored: boolean; kind: 'sign' | 'cone'; lanes: { value: number; correct: boolean }[]; }

/** Costruisce una fila di 3 cartelli (uno per corsia): uno col risultato giusto, gli altri distrattori. */
function buildSignRow(op: MathOperation): SignRow {
  const distractors = generateDistractors(op.answer, LANES - 1);
  const values = [op.answer, ...distractors].sort(() => Math.random() - 0.5);
  return {
    y: -SIGN_H,
    scored: false,
    kind: 'sign',
    lanes: values.map(value => ({ value, correct: value === op.answer })),
  };
}

/** Fila "di allenamento" (fase di lettura): un cono verde (sicuro) in una corsia casuale, rossi (pericolo) le altre. */
function buildConeRow(): SignRow {
  const safeLane = Math.floor(Math.random() * LANES);
  return {
    y: -SIGN_H,
    scored: false,
    kind: 'cone',
    lanes: Array.from({ length: LANES }, (_, i) => ({ value: 0, correct: i === safeLane })),
  };
}

/** Mini-gioco arcade: Corsa dei Numeri, cambia corsia per raggiungere il cartello col risultato giusto. */
export default function RunnerGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const laneRef = useRef(1);
  const rowsRef = useRef<SignRow[]>([]);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const [operation, setOperation] = useState(opRef.current);
  const [lane, setLane] = useState(1);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('corsa'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);
  const { triggerCollect, CollectEffectOverlay } = useArcadeCollectEffect();
  const { speak } = useVoice();
  useArcadeOperationVoice(operation);

  const reset = useCallback(() => {
    laneRef.current = 1;
    setLane(1);
    rowsRef.current = [];
    opRef.current = generateOperation(tableId);
    setOperation(opRef.current);
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  const moveLane = useCallback((dir: -1 | 1) => {
    laneRef.current = Math.max(0, Math.min(LANES - 1, laneRef.current + dir));
    setLane(laneRef.current);
    sound.playTick();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveLane(-1);
      if (e.key === 'ArrowRight') moveLane(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [moveLane]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let elapsedSinceRow = SIGN_INTERVAL_MS;
    let elapsedTotal = 0;
    let lastTs = performance.now();
    let localScore = 0;

    const draw = () => {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      for (let i = 1; i < LANES; i += 1) {
        const x = (WIDTH / LANES) * i;
        ctx.beginPath();
        ctx.setLineDash([8, 10]);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      rowsRef.current.forEach(row => {
        row.lanes.forEach((s, i) => {
          const x = laneX(i);
          if (row.kind === 'cone') {
            ctx.fillStyle = s.correct ? '#16a34a' : '#dc2626';
            ctx.beginPath();
            ctx.moveTo(x, row.y);
            ctx.lineTo(x - 16, row.y + SIGN_H);
            ctx.lineTo(x + 16, row.y + SIGN_H);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            return;
          }
          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(x - 22, row.y, 44, SIGN_H);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - 22, row.y, 44, SIGN_H);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(String(s.value), x, row.y + SIGN_H / 2 + 1);
        });
      });

      ctx.font = '24px sans-serif';
      ctx.fillText('🏃', laneX(laneRef.current), RUNNER_Y);
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedSinceRow += dt;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      const speed = Math.min(MAX_SIGN_SPEED, BASE_SIGN_SPEED + level * 0.35);

      if (elapsedSinceRow >= SIGN_INTERVAL_MS) {
        elapsedSinceRow = 0;
        rowsRef.current.push(isReadyRef.current ? buildSignRow(opRef.current) : buildConeRow());
      }

      rowsRef.current = rowsRef.current
        .map(r => ({ ...r, y: r.y + speed }))
        .filter(r => r.y < HEIGHT + SIGN_H);

      rowsRef.current.forEach(row => {
        if (!row.scored && row.y + SIGN_H >= RUNNER_Y - 10 && row.y <= RUNNER_Y - 10) {
          row.scored = true;
          const picked = row.lanes[laneRef.current];
          if (picked.correct) {
            sound.playCorrect();
            triggerCollect(laneX(laneRef.current), RUNNER_Y - 10, row.kind === 'sign' ? '🎉' : '⭐');
            if (row.kind === 'sign') {
              localScore += 1;
              setScore(localScore);
              speak(buildMultiplicationResultSpeech(opRef.current.a, opRef.current.b, opRef.current.answer));
              const nextOp = generateOperation(tableId, opRef.current);
              opRef.current = nextOp;
              setOperation(nextOp);
              setRoundId(id => id + 1);
            }
          } else {
            sound.playError();
            setStatus('over');
            stopped = true;
            const updated = updateHighScore('corsa', localScore);
            setIsNewRecord(updated === localScore && (record === null || localScore > record));
            setRecord(updated);
            return;
          }
        }
      });

      if (stopped) return;

      draw();
      raf = requestAnimationFrame(step);
    };

    draw();
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [runId, tableId, record, isReadyRef, triggerCollect, speak]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🏃" title="Corsa dei Numeri" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block"
        />
        <ArcadeInGameScore label={`Punti: ${score}`} record={record} isNewRecord={isNewRecord} />
        <CollectEffectOverlay />
        {status === 'over' && (
          <ArcadeOverlay
            emoji="🏃"
            title="Game Over!"
            subtitle={`Punteggio: ${score}`}
            onRetry={reset}
            reasonSpeech="Game over: hai preso l'ostacolo sbagliato!"
          />
        )}
      </div>
      <ArcadeControlBar onLeft={() => moveLane(-1)} onRight={() => moveLane(1)} />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: resta sul cono verde per prendere il ritmo!'
          : 'Premi ◀ ▶ (o le frecce da tastiera) per cambiare corsia verso il risultato giusto!'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
