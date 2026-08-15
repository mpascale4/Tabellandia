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
  getHighScore,
  MathOperation,
  updateHighScore,
} from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const BUBBLE_R = 20;
const SLOT_W = BUBBLE_R * 2 + 8;
const BUBBLE_COUNT = Math.max(3, Math.floor(WIDTH / SLOT_W));
const ROW_LEFT = (WIDTH - SLOT_W * BUBBLE_COUNT) / 2;
const TOP_Y = 56;
const STEP_Y = 22;
const MAX_STEPS = 8; // dopo 8 passi (1 al secondo, o prima se si sbaglia) la riga raggiunge il cannone: game over
const CANNON_Y = HEIGHT - 26;
const CANNON_W = 34;
const CANNON_STEP = SLOT_W;

interface Bubble { value: number; correct: boolean; }

const ROW_COLORS = [
  'bg-sky-500',
  'bg-fuchsia-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
];

function colX(col: number): number {
  return ROW_LEFT + SLOT_W * col + SLOT_W / 2;
}

/** Costruisce la riga di bolle: una col risultato giusto, le altre distrattori, in ordine casuale. */
function buildRow(op: MathOperation): Bubble[] {
  const distractors = generateDistractors(op.answer, BUBBLE_COUNT - 1);
  const values = [op.answer, ...distractors].sort(() => Math.random() - 0.5);
  return values.map(value => ({ value, correct: value === op.answer }));
}

/** Mini-gioco arcade: Bolle con i Risultati. I pulsanti ◀ ▶ muovono il cannone in fondo all'arena;
 * il pulsante Spara colpisce la bolla più vicina alla posizione del cannone. Una sola riga di
 * bolle scende dall'alto (un passo ogni secondo, fino a un massimo di 5): colpisci quella col
 * risultato giusto per farla disgregare (arriva una nuova riga con colore e operazione nuovi);
 * se colpisci quella sbagliata la riga scende subito di un passo verso di te; se ti raggiunge, game over. */
export default function BubbleGame({ onExit, tableId }: ArcadeGameProps) {
  const [operation, setOperation] = useState<MathOperation>(() => generateOperation(tableId));
  const [row, setRow] = useState<Bubble[]>(() => buildRow(operation));
  const [rowColor, setRowColor] = useState(() => ROW_COLORS[0]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [record, setRecord] = useState(() => getHighScore('bolle'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [shake, setShake] = useState(false);
  const [popping, setPopping] = useState(false);
  const [cannonX, setCannonX] = useState(WIDTH / 2);
  const [bullet, setBullet] = useState<{ x: number; targetY: number } | null>(null);
  const [roundId, setRoundId] = useState(0);
  const starIndexRef = useRef(0);
  const opRef = useRef<MathOperation>(operation);
  const arenaRef = useRef<HTMLDivElement>(null);
  const { isReady, secondsLeft } = useArcadeReadyPhase(roundId);
  const { triggerCollect, CollectEffectOverlay } = useArcadeCollectEffect();
  const { speak } = useVoice();
  useArcadeOperationVoice(operation);

  const reset = useCallback(() => {
    const nextOp = generateOperation(tableId);
    opRef.current = nextOp;
    setOperation(nextOp);
    const nextRowValue = buildRow(nextOp);
    setRow(nextRowValue);
    starIndexRef.current = Math.floor(Math.random() * nextRowValue.length);
    setRowColor(ROW_COLORS[Math.floor(Math.random() * ROW_COLORS.length)]);
    setStep(0);
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setBullet(null);
    setPopping(false);
    setRoundId(id => id + 1);
  }, [tableId]);

  const nextRow = useCallback(() => {
    const nextOp = generateOperation(tableId, opRef.current);
    opRef.current = nextOp;
    setOperation(nextOp);
    const nextRowValue = buildRow(nextOp);
    setRow(nextRowValue);
    starIndexRef.current = Math.floor(Math.random() * nextRowValue.length);
    setRowColor(prev => {
      const others = ROW_COLORS.filter(c => c !== prev);
      return others[Math.floor(Math.random() * others.length)];
    });
    setStep(0);
    setRoundId(id => id + 1);
  }, [tableId]);

  const popBubble = useCallback((bubbleIndex: number, bubble: Bubble, hitX: number, hitY: number) => {
    setStatus(currentStatus => {
      if (currentStatus !== 'playing') return currentStatus;

      const isHit = isReady ? bubble.correct : bubbleIndex === starIndexRef.current;
      if (isHit) {
        sound.playCorrect();
        triggerCollect(hitX, hitY, isReady ? '🎉' : '⭐');
        if (isReady) {
          setScore(s => s + 1);
          speak(buildMultiplicationResultSpeech(opRef.current.a, opRef.current.b, opRef.current.answer));
          setPopping(true);
          window.setTimeout(() => {
            setPopping(false);
            nextRow();
          }, 260);
        }
        return currentStatus;
      }

      sound.playError();
      setShake(true);
      window.setTimeout(() => setShake(false), 200);
      let gameOver = false;
      setStep(s => {
        const next = s + 1;
        if (next >= MAX_STEPS) gameOver = true;
        return next;
      });
      if (gameOver) {
        setScore(currentScore => {
          const updated = updateHighScore('bolle', currentScore);
          setIsNewRecord(updated === currentScore && (record === null || currentScore > record));
          setRecord(updated);
          return currentScore;
        });
        return 'over';
      }
      return currentStatus;
    });
  }, [record, nextRow, isReady, triggerCollect, speak]);

  // La riga scende di un passo automaticamente ogni secondo, anche durante la fase di allenamento con la ⭐.
  useEffect(() => {
    if (status !== 'playing' || popping) return;
    const id = window.setInterval(() => {
      setStep(s => {
        const next = s + 1;
        if (next >= MAX_STEPS) {
          setStatus('over');
          setScore(currentScore => {
            const updated = updateHighScore('bolle', currentScore);
            setIsNewRecord(updated === currentScore && (record === null || currentScore > record));
            setRecord(updated);
            return currentScore;
          });
          return MAX_STEPS;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, popping, record]);

  const nudgeCannon = useCallback((direction: -1 | 1) => {
    setCannonX(prev => Math.max(CANNON_W / 2, Math.min(WIDTH - CANNON_W / 2, prev + direction * CANNON_STEP)));
  }, []);

  const fire = useCallback(() => {
    if (status !== 'playing' || bullet || popping) return;
    // individua la bolla della colonna più vicina alla posizione del cannone
    let closestIndex = 0;
    let closestDist = Infinity;
    row.forEach((_, i) => {
      const dist = Math.abs(colX(i) - cannonX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });
    const targetBubble = row[closestIndex];
    const targetY = TOP_Y + step * STEP_Y;
    sound.playShoot();
    setBullet({ x: cannonX, targetY });
    window.setTimeout(() => {
      setBullet(null);
      if (targetBubble) popBubble(closestIndex, targetBubble, colX(closestIndex), targetY);
    }, 160);
  }, [status, bullet, popping, row, cannonX, step, popBubble]);

  const currentY = TOP_Y + step * STEP_Y;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🫧" title="Bolle con i Risultati" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div
        ref={arenaRef}
        className={`relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md bg-sky-950 ${shake ? 'animate-pulse' : ''}`}
        style={{ width: WIDTH, height: HEIGHT }}
      >
        <ArcadeInGameScore label={`Punti: ${score} · Passi: ${step}/${MAX_STEPS}`} record={record} isNewRecord={isNewRecord} />
        <CollectEffectOverlay />

        {row.map((b, i) => (
          <div
            key={`${operation.a}-${operation.b}-${i}`}
            className={`absolute flex items-center justify-center rounded-full ${rowColor} border-2 border-white shadow-md font-black text-white pointer-events-none transition-all ${popping ? 'duration-200 scale-0 opacity-0' : 'duration-300'}`}
            style={{
              width: BUBBLE_R * 2,
              height: BUBBLE_R * 2,
              left: colX(i) - BUBBLE_R,
              top: currentY - BUBBLE_R,
              fontSize: 16,
            }}
            aria-hidden="true"
          >
            {isReady ? b.value : (i === starIndexRef.current ? '⭐' : '✖️')}
          </div>
        ))}

        {bullet && (
          <div
            className="absolute rounded-full bg-amber-300 shadow-md pointer-events-none"
            style={{ width: 8, height: 8, left: bullet.x - 4, top: bullet.targetY, transition: 'top 160ms linear' }}
            aria-hidden="true"
          />
        )}

        {/* Cannone in fondo, mosso dai pulsanti ◀ ▶ */}
        <div
          className="absolute pointer-events-none"
          style={{ left: cannonX - CANNON_W / 2, top: CANNON_Y, width: CANNON_W, height: 22 }}
          aria-hidden="true"
        >
          <div className="mx-auto rounded-t-full bg-emerald-500 border-2 border-white shadow-md" style={{ width: 12, height: 20, marginLeft: (CANNON_W - 12) / 2 }} />
          <div className="rounded-full bg-emerald-600 border-2 border-white shadow-md" style={{ width: CANNON_W, height: 12 }} />
        </div>

        {status === 'over' && (
          <ArcadeOverlay
            emoji="🫧"
            title="Game Over!"
            subtitle={`Punteggio: ${score}`}
            onRetry={reset}
            reasonSpeech="Game over: la fila di bolle ti ha raggiunto!"
          />
        )}
      </div>
      <ArcadeControlBar
        onLeft={() => nudgeCannon(-1)}
        onRight={() => nudgeCannon(1)}
        actionEmoji="🫧"
        actionLabel="Spara"
        onAction={fire}
      />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: colpisci la ⭐ per prendere il ritmo!'
          : 'Muovi il cannone con ◀ ▶ e premi Spara al risultato giusto! Se sbagli la riga scende di un passo: attento a non farti raggiungere.'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
