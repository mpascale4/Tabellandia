import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOperationBanner from './ArcadeOperationBanner';
import ArcadeOverlay from './ArcadeOverlay';
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

/** Mini-gioco arcade: Bolle con i Risultati. Un cannone in fondo all'arena segue il mouse/dito;
 * tocca/clicca per sparare verso la bolla più vicina alla posizione del cannone. Una sola riga di
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
  const arenaRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    const nextOp = generateOperation(tableId);
    setOperation(nextOp);
    setRow(buildRow(nextOp));
    setRowColor(ROW_COLORS[Math.floor(Math.random() * ROW_COLORS.length)]);
    setStep(0);
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setBullet(null);
    setPopping(false);
  }, [tableId]);

  const nextRow = useCallback(() => {
    const nextOp = generateOperation(tableId);
    setOperation(nextOp);
    setRow(buildRow(nextOp));
    setRowColor(prev => {
      const others = ROW_COLORS.filter(c => c !== prev);
      return others[Math.floor(Math.random() * others.length)];
    });
    setStep(0);
  }, [tableId]);

  const popBubble = useCallback((bubble: Bubble) => {
    setStatus(currentStatus => {
      if (currentStatus !== 'playing') return currentStatus;

      if (bubble.correct) {
        sound.playCorrect();
        setScore(s => s + 1);
        setPopping(true);
        window.setTimeout(() => {
          setPopping(false);
          nextRow();
        }, 260);
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
  }, [record, nextRow]);

  // La riga scende di un passo automaticamente ogni secondo (fino al massimo consentito).
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

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(CANNON_W / 2, Math.min(WIDTH - CANNON_W / 2, e.clientX - rect.left));
    setCannonX(x);
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
    setBullet({ x: cannonX, targetY });
    window.setTimeout(() => {
      setBullet(null);
      if (targetBubble) popBubble(targetBubble);
    }, 160);
  }, [status, bullet, popping, row, cannonX, step, popBubble]);

  const currentY = TOP_Y + step * STEP_Y;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🫧" title="Bolle con i Risultati" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} />
      <div
        ref={arenaRef}
        className={`relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md bg-sky-950 touch-none cursor-crosshair ${shake ? 'animate-pulse' : ''}`}
        style={{ width: WIDTH, height: HEIGHT }}
        onPointerMove={handlePointerMove}
        onPointerDown={fire}
      >
        <ArcadeInGameScore label={`Punti: ${score} · Passi: ${step}/${MAX_STEPS}`} record={record} isNewRecord={isNewRecord} />

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
            {b.value}
          </div>
        ))}

        {bullet && (
          <div
            className="absolute rounded-full bg-amber-300 shadow-md pointer-events-none"
            style={{ width: 8, height: 8, left: bullet.x - 4, top: bullet.targetY, transition: 'top 160ms linear' }}
            aria-hidden="true"
          />
        )}

        {/* Cannone in fondo, segue il mouse/dito */}
        <div
          className="absolute pointer-events-none"
          style={{ left: cannonX - CANNON_W / 2, top: CANNON_Y, width: CANNON_W, height: 22 }}
          aria-hidden="true"
        >
          <div className="mx-auto rounded-t-full bg-emerald-500 border-2 border-white shadow-md" style={{ width: 12, height: 20, marginLeft: (CANNON_W - 12) / 2 }} />
          <div className="rounded-full bg-emerald-600 border-2 border-white shadow-md" style={{ width: CANNON_W, height: 12 }} />
        </div>

        {status === 'over' && (
          <ArcadeOverlay emoji="🫧" title="Game Over!" subtitle={`Punteggio: ${score}`} onRetry={reset} />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Muovi il cannone e tocca per sparare al risultato giusto! Se sbagli la riga scende di un passo: attento a non farti raggiungere.</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
