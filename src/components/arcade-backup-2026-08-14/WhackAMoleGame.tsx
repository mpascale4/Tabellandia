import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_HEIGHT, ARCADE_CANVAS_WIDTH, ArcadeGameProps, getDifficultyLevel, getHighScore, updateHighScore } from './arcadeShared';

const HOLES = 9;
const SESSION_MS = 20000;
const BASE_MOLE_MIN_MS = 550;
const BASE_MOLE_MAX_MS = 1100;
const MIN_MOLE_MIN_MS = 300;
const MIN_MOLE_MAX_MS = 600;

/** Mini-gioco arcade: acchiappa le talpe che spuntano a caso in 20 secondi. */
export default function WhackAMoleGame({ onExit }: ArcadeGameProps) {
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_MS);
  const [status, setStatus] = useState<'playing' | 'ended'>('playing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('whack'));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const reset = useCallback(() => {
    setActiveHole(null);
    setScore(0);
    scoreRef.current = 0;
    setTimeLeftMs(SESSION_MS);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, []);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    let stopped = false;
    let moleTimeout: number | null = null;
    let elapsedTotal = 0;

    const popMole = () => {
      if (stopped) return;
      setActiveHole(Math.floor(Math.random() * HOLES));
      const level = getDifficultyLevel(elapsedTotal);
      const moleMin = Math.max(MIN_MOLE_MIN_MS, BASE_MOLE_MIN_MS - level * 60);
      const moleMax = Math.max(MIN_MOLE_MAX_MS, BASE_MOLE_MAX_MS - level * 120);
      const visibleMs = moleMin + Math.random() * (moleMax - moleMin);
      moleTimeout = window.setTimeout(() => {
        setActiveHole(null);
        moleTimeout = window.setTimeout(popMole, 300);
      }, visibleMs);
    };
    popMole();

    const countdown = window.setInterval(() => {
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
  }, [runId, status]);

  const whack = (holeIndex: number) => {
    if (holeIndex !== activeHole) return;
    sound.playCorrect();
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setActiveHole(null);
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🔨" title="Acchiappa la Talpa" />
      <div
        className="relative rounded-2xl border-2 border-amber-800/60 bg-gradient-to-b from-amber-100 to-amber-200 p-3 shadow-md"
        style={{ width: ARCADE_CANVAS_WIDTH, height: ARCADE_CANVAS_HEIGHT }}
      >
        <div className="grid grid-cols-3 gap-2.5 h-full">
          {Array.from({ length: HOLES }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => whack(i)}
              className="relative aspect-square rounded-full bg-amber-900/80 border-2 border-amber-950 shadow-inner overflow-hidden cursor-pointer flex items-end justify-center"
              aria-label={activeHole === i ? 'Talpa! Colpiscila' : 'Buca vuota'}
            >
              {activeHole === i && (
                <span className="text-3xl leading-none translate-y-1" aria-hidden="true">🐹</span>
              )}
            </button>
          ))}
        </div>
        <ArcadeInGameScore label={`Colpi: ${score} · ${Math.ceil(timeLeftMs / 1000)}s`} record={record} isNewRecord={isNewRecord} />
        {status === 'ended' && (
          <ArcadeOverlay
            emoji="🎉"
            title="Tempo scaduto!"
            subtitle={`Talpe colpite: ${score}`}
            onRetry={reset}
          />
        )}
      </div>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
