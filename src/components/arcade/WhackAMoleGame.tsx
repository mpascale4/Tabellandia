import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
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

const HOLES = 9;
const SESSION_MS = 25000;
const MOLE_COUNT = 3; // talpe attive contemporaneamente: 1 corretta + distrattori
const BASE_MOLE_MIN_MS = 1050;
const BASE_MOLE_MAX_MS = 1750;
const MIN_MOLE_MIN_MS = 650;
const MIN_MOLE_MAX_MS = 1100;

interface Mole { hole: number; value: number; correct: boolean; }

function spawnMoles(op: MathOperation): Mole[] {
  const distractors = generateDistractors(op.answer, MOLE_COUNT - 1);
  const values = [op.answer, ...distractors].sort(() => Math.random() - 0.5);
  const holes = new Set<number>();
  while (holes.size < values.length) {
    holes.add(Math.floor(Math.random() * HOLES));
  }
  const holeList = Array.from(holes);
  return values.map((value, i) => ({ hole: holeList[i], value, correct: value === op.answer }));
}

/** Mini-gioco arcade: colpisci solo la talpa col risultato corretto dell'operazione mostrata. */
export default function WhackAMoleGame({ onExit, tableId }: ArcadeGameProps) {
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const [operation, setOperation] = useState(opRef.current);
  const [moles, setMoles] = useState<Mole[]>(() => spawnMoles(opRef.current));
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_MS);
  const [status, setStatus] = useState<'playing' | 'ended'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('whack'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [roundId, setRoundId] = useState(0);
  const starHoleRef = useRef(0);
  const { isReady, secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);

  useEffect(() => {
    starHoleRef.current = moles[Math.floor(Math.random() * moles.length)]?.hole ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    opRef.current = generateOperation(tableId);
    setOperation(opRef.current);
    const newMoles = spawnMoles(opRef.current);
    setMoles(newMoles);
    starHoleRef.current = newMoles[Math.floor(Math.random() * newMoles.length)].hole;
    setScore(0);
    scoreRef.current = 0;
    setTimeLeftMs(SESSION_MS);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    let stopped = false;
    let moleTimeout: number | null = null;
    let elapsedTotal = 0;

    const popMoles = () => {
      if (stopped) return;
      // le talpe cambiano posizione, ma l'operazione resta la stessa finché non si
      // colpisce quella giusta (o quella sbagliata): cambia solo dopo errore o successo.
      const newMoles = spawnMoles(opRef.current);
      setMoles(newMoles);
      starHoleRef.current = newMoles[Math.floor(Math.random() * newMoles.length)].hole;
      const level = getDifficultyLevel(elapsedTotal);
      const moleMin = Math.max(MIN_MOLE_MIN_MS, BASE_MOLE_MIN_MS - level * 90);
      const moleMax = Math.max(MIN_MOLE_MAX_MS, BASE_MOLE_MAX_MS - level * 140);
      const visibleMs = moleMin + Math.random() * (moleMax - moleMin);
      moleTimeout = window.setTimeout(popMoles, visibleMs);
    };
    popMoles();

    const countdown = window.setInterval(() => {
      if (!isReadyRef.current) return; // il tempo resta fermo durante la fase di lettura
      elapsedTotal += 200;
      setTimeLeftMs(prev => {
        const next = prev - 200;
        if (next <= 0) {
          stopped = true;
          if (moleTimeout) window.clearTimeout(moleTimeout);
          sound.playRewardFanfare();
          setStatus('ended');
          const updated = updateHighScore('whack', scoreRef.current);
          setIsNewRecord(updated === scoreRef.current && (record === null || scoreRef.current > record));
          setRecord(updated);
          return 0;
        }
        return next;
      });
    }, 200);

    return () => {
      stopped = true;
      if (moleTimeout) window.clearTimeout(moleTimeout);
      window.clearInterval(countdown);
    };
  }, [runId, status, tableId, record, isReadyRef]);

  const whack = (holeIndex: number) => {
    const mole = moles.find(m => m.hole === holeIndex);
    if (!mole) return;
    const isHit = isReadyRef.current ? mole.correct : holeIndex === starHoleRef.current;
    if (isHit) {
      sound.playCorrect();
      if (isReadyRef.current) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        const nextOp = generateOperation(tableId);
        opRef.current = nextOp;
        setOperation(nextOp);
        const newMoles = spawnMoles(nextOp);
        setMoles(newMoles);
        starHoleRef.current = newMoles[Math.floor(Math.random() * newMoles.length)].hole;
        setRoundId(id => id + 1);
      }
      return;
    }
    sound.playError();
    const nextOp = generateOperation(tableId);
    opRef.current = nextOp;
    setOperation(nextOp);
    const newMoles = spawnMoles(nextOp);
    setMoles(newMoles);
    starHoleRef.current = newMoles[Math.floor(Math.random() * newMoles.length)].hole;
    setRoundId(id => id + 1);
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🔨" title="Acchiappa la Talpa" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div
        className="relative rounded-2xl border-2 border-amber-800/60 bg-gradient-to-b from-amber-100 to-amber-200 p-3 shadow-md"
        style={{ width: ARCADE_CANVAS_WIDTH, height: ARCADE_CANVAS_HEIGHT }}
      >
        <div className="grid grid-cols-3 gap-2.5 h-full">
          {Array.from({ length: HOLES }).map((_, i) => {
            const mole = moles.find(m => m.hole === i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => whack(i)}
                className="relative aspect-square rounded-full bg-amber-900/80 border-2 border-amber-950 shadow-inner overflow-hidden cursor-pointer flex items-center justify-center"
                aria-label={mole ? (isReady ? `Talpa con il numero ${mole.value}` : (mole.hole === starHoleRef.current ? 'Talpa con la stella' : 'Talpa senza stella')) : 'Buca vuota'}
              >
                {mole && (
                  <span className="relative flex items-center justify-center" aria-hidden="true">
                    <span className="text-3xl leading-none">🐹</span>
                    <span className="absolute flex items-center justify-center h-5 w-5 rounded-full bg-white border-2 border-slate-800 text-[11px] font-black text-slate-900 -translate-y-1">
                      {isReady ? mole.value : (mole.hole === starHoleRef.current ? '⭐' : '✖️')}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ArcadeInGameScore label={`Punti: ${score} · ${Math.ceil(timeLeftMs / 1000)}s`} record={record} isNewRecord={isNewRecord} />
        {status === 'ended' && (
          <ArcadeOverlay
            emoji="🎉"
            title="Tempo scaduto!"
            subtitle={`Punteggio: ${score}`}
            onRetry={reset}
          />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0 ? 'Allenati: colpisci la ⭐ per prendere il ritmo!' : 'Colpisci solo la talpa col risultato giusto!'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
