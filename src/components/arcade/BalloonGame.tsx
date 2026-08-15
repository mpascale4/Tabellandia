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
const LANE_COUNT = 3;
const BALLOON_Y = 62;
const BALLOON_R = 26;
const SHOOTER_Y = HEIGHT - 26;
const DART_R = 6;
const BASE_DART_SPEED = 4.4;
const MAX_DART_SPEED = 6.6;
const MAX_LIVES = 3;
const BALLOON_COLORS = ['#ef4444', '#3b82f6', '#22c55e'];

interface Balloon { value: number; correct: boolean; centerX: number; }
interface Dart { x: number; y: number; vy: number; }

function laneX(lane: number): number {
  const slotW = WIDTH / LANE_COUNT;
  return slotW * lane + slotW / 2;
}

/** Costruisce i palloncini (1 corretto + distrattori), uno per corsia, in ordine casuale. */
function buildBalloons(op: MathOperation): Balloon[] {
  const distractors = generateDistractors(op.answer, LANE_COUNT - 1);
  const values = [op.answer, ...distractors].sort(() => Math.random() - 0.5);
  return values.map((value, i) => ({ value, correct: value === op.answer, centerX: laneX(i) }));
}

/**
 * Mini-gioco arcade: Palloncini dei Numeri. Sostituisce Snake (troppo complicato
 * da controllare) con una meccanica semplice, identica per struttura a Canestro/
 * Talpa: muovi il lanciatore con ◀ ▶ e premi "Lancia" per far scoppiare il
 * palloncino col risultato giusto tra i 3 fermi in alto.
 */
export default function BalloonGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const laneRef = useRef(1);
  const balloonsRef = useRef<Balloon[]>([]);
  const dartRef = useRef<Dart | null>(null);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const starIndexRef = useRef(0);
  const [operation, setOperation] = useState(opRef.current);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('palloncini'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);
  const { triggerCollect, CollectEffectOverlay } = useArcadeCollectEffect();
  const { speak } = useVoice();
  useArcadeOperationVoice(operation);

  const reset = useCallback(() => {
    laneRef.current = 1;
    opRef.current = generateOperation(tableId);
    balloonsRef.current = buildBalloons(opRef.current);
    starIndexRef.current = Math.floor(Math.random() * LANE_COUNT);
    dartRef.current = null;
    setOperation(opRef.current);
    setScore(0);
    setLives(MAX_LIVES);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  const nudgeLauncher = useCallback((direction: -1 | 1) => {
    laneRef.current = Math.max(0, Math.min(LANE_COUNT - 1, laneRef.current + direction));
    sound.playTick();
  }, []);

  const dartSpeedRef = useRef(BASE_DART_SPEED);
  const launch = useCallback(() => {
    if (dartRef.current) return; // un dardo per volta
    dartRef.current = { x: laneX(laneRef.current), y: SHOOTER_Y, vy: -dartSpeedRef.current };
    sound.playShoot();
  }, []);

  useEffect(() => {
    balloonsRef.current = buildBalloons(opRef.current);
    starIndexRef.current = Math.floor(Math.random() * LANE_COUNT);
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
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      balloonsRef.current.forEach((b, i) => {
        ctx.beginPath();
        ctx.fillStyle = BALLOON_COLORS[i % BALLOON_COLORS.length];
        ctx.ellipse(b.centerX, BALLOON_Y, BALLOON_R * 0.78, BALLOON_R, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // filo del palloncino
        ctx.beginPath();
        ctx.moveTo(b.centerX, BALLOON_Y + BALLOON_R);
        ctx.lineTo(b.centerX, BALLOON_Y + BALLOON_R + 14);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        const label = isReadyRef.current ? String(b.value) : (i === starIndexRef.current ? '⭐' : '✖️');
        ctx.fillText(label, b.centerX, BALLOON_Y + 1);
      });

      // Lanciatore: si sposta subito sulla corsia scelta con ◀ ▶.
      const shooterX = laneX(laneRef.current);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(shooterX - 14, SHOOTER_Y, 28, 8);

      if (dartRef.current) {
        ctx.beginPath();
        ctx.fillStyle = '#f97316';
        ctx.arc(dartRef.current.x, dartRef.current.y, DART_R, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const startNextRound = () => {
      const nextOp = generateOperation(tableId, opRef.current);
      opRef.current = nextOp;
      balloonsRef.current = buildBalloons(nextOp);
      starIndexRef.current = Math.floor(Math.random() * LANE_COUNT);
      setOperation(nextOp);
      setRoundId(id => id + 1);
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      dartSpeedRef.current = Math.min(MAX_DART_SPEED, BASE_DART_SPEED + level * 0.5);

      if (dartRef.current) {
        dartRef.current.y += dartRef.current.vy;
        if (dartRef.current.y <= BALLOON_Y + BALLOON_R) {
          const dartX = dartRef.current.x;
          const targetIndex = balloonsRef.current.findIndex(b => Math.abs(dartX - b.centerX) <= BALLOON_R);
          const isHit = isReadyRef.current
            ? targetIndex >= 0 && balloonsRef.current[targetIndex].correct
            : targetIndex === starIndexRef.current;
          if (isHit) {
            const hitBalloon = targetIndex >= 0 ? balloonsRef.current[targetIndex] : null;
            const hitX = hitBalloon ? hitBalloon.centerX : dartX;
            triggerCollect(hitX, BALLOON_Y, isReadyRef.current ? '🎉' : '⭐');
            sound.playCorrect();
            if (isReadyRef.current) {
              localScore += 1;
              setScore(localScore);
              speak(buildMultiplicationResultSpeech(opRef.current.a, opRef.current.b, opRef.current.answer));
              startNextRound();
            }
          } else {
            localLives -= 1;
            setLives(localLives);
            sound.playError();
            if (localLives <= 0) {
              setStatus('over');
              stopped = true;
              const updated = updateHighScore('palloncini', localScore);
              setIsNewRecord(updated === localScore && (record === null || localScore > record));
              setRecord(updated);
              return;
            }
          }
          dartRef.current = null;
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
  }, [runId, tableId, record, isReadyRef, triggerCollect, speak]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🎈" title="Palloncini dei Numeri" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block"
        />
        <ArcadeInGameScore label={`Punti: ${score} · Vite: ${lives}`} record={record} isNewRecord={isNewRecord} />
        <CollectEffectOverlay />
        {status === 'over' && (
          <ArcadeOverlay
            emoji="🎈"
            title="Game Over!"
            subtitle={`Punteggio: ${score}`}
            onRetry={reset}
            reasonSpeech="Game over: hai bucato troppi palloncini sbagliati!"
          />
        )}
      </div>
      <ArcadeControlBar
        onLeft={() => nudgeLauncher(-1)}
        onRight={() => nudgeLauncher(1)}
        actionEmoji="🎯"
        actionLabel="Lancia"
        onAction={launch}
      />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: colpisci la ⭐ per prendere il ritmo!'
          : 'Muovi il lanciatore con ◀ ▶ e premi Lancia sul palloncino col risultato giusto!'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
