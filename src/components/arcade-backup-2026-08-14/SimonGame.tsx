import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOverlay from './ArcadeOverlay';
import { ARCADE_CANVAS_WIDTH, getHighScore, updateHighScore } from './arcadeShared';
import type { ArcadeGameProps } from './arcadeShared';

const COLORS = [
  { id: 0, label: 'Rosso', base: 'bg-red-500', active: 'bg-red-300' },
  { id: 1, label: 'Blu', base: 'bg-sky-500', active: 'bg-sky-300' },
  { id: 2, label: 'Giallo', base: 'bg-amber-400', active: 'bg-amber-200' },
  { id: 3, label: 'Verde', base: 'bg-emerald-500', active: 'bg-emerald-300' },
];
const SHOW_MS = 550;
const PAUSE_MS = 250;
const PRESS_MS = 350;

/** Mini-gioco arcade: Simon, ripeti la sequenza di colori che si allunga. */
export default function SimonGame({ onExit }: ArcadeGameProps) {
  const [sequence, setSequence] = useState<number[]>(() => [Math.floor(Math.random() * COLORS.length)]);
  const [playerStep, setPlayerStep] = useState(0);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [pressedColor, setPressedColor] = useState<number | null>(null);
  const [status, setStatus] = useState<'showing' | 'playing' | 'over'>('showing');
  const [runId, setRunId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('simon'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(id => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  const reset = useCallback(() => {
    clearTimeouts();
    setSequence([Math.floor(Math.random() * COLORS.length)]);
    setPlayerStep(0);
    setActiveColor(null);
    setPressedColor(null);
    setStatus('showing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
  }, []);

  useEffect(() => {
    if (status !== 'showing') return undefined;
    clearTimeouts();
    sequence.forEach((colorId, i) => {
      const showAt = i * (SHOW_MS + PAUSE_MS);
      timeoutsRef.current.push(window.setTimeout(() => {
        setActiveColor(colorId);
        sound.playTick();
      }, showAt));
      timeoutsRef.current.push(window.setTimeout(() => setActiveColor(null), showAt + SHOW_MS));
    });
    const endAt = sequence.length * (SHOW_MS + PAUSE_MS);
    timeoutsRef.current.push(window.setTimeout(() => {
      setPlayerStep(0);
      setStatus('playing');
    }, endAt));
    return clearTimeouts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, runId]);

  const handlePress = (colorId: number) => {
    if (status !== 'playing') return;
    // Feedback ben visibile al tocco: colore acceso più a lungo, con
    // ingrandimento e bordo bianco, cosi si vede chiaramente quale bottone
    // è stato premuto (indipendentemente dal risultato giusto/sbagliato).
    setPressedColor(colorId);
    window.setTimeout(() => setPressedColor(null), PRESS_MS);

    if (colorId !== sequence[playerStep]) {
      sound.playError();
      setStatus('over');
      const updated = updateHighScore('simon', sequence.length);
      setIsNewRecord(updated === sequence.length && (record === null || sequence.length > record));
      setRecord(updated);
      return;
    }
    sound.playCorrect();
    const nextStep = playerStep + 1;
    if (nextStep === sequence.length) {
      const grown = [...sequence, Math.floor(Math.random() * COLORS.length)];
      setSequence(grown);
      setStatus('showing');
    } else {
      setPlayerStep(nextStep);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🎵" title="Simon" />
      <div
        className="relative rounded-2xl border-2 border-slate-700 bg-slate-900 p-3 shadow-md"
        style={{ width: ARCADE_CANVAS_WIDTH }}
      >
        <ArcadeInGameScore label={`Livello: ${sequence.length}`} record={record} isNewRecord={isNewRecord} />
        <div className="grid grid-cols-2 gap-2">
          {COLORS.map(color => (
            <button
              key={color.id}
              type="button"
              onClick={() => handlePress(color.id)}
              disabled={status !== 'playing'}
              className={`aspect-square rounded-xl shadow-md transition-all cursor-pointer disabled:cursor-not-allowed
                ${activeColor === color.id || pressedColor === color.id ? color.active : color.base}
                ${pressedColor === color.id ? 'scale-95 ring-4 ring-white' : ''}
                focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white`}
              aria-label={`Colore ${color.label}`}
            />
          ))}
        </div>
        {status === 'over' && (
          <ArcadeOverlay
            emoji="🎵"
            title="Sequenza sbagliata!"
            subtitle={`Livello raggiunto: ${sequence.length}`}
            onRetry={reset}
          />
        )}
      </div>
      <p className="text-xs font-bold text-sky-700/70 text-center">Guarda la sequenza e poi ripetila toccando i colori</p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
