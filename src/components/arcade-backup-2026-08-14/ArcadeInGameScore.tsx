import React from 'react';

interface ArcadeInGameScoreProps {
  label: string;
  record: number | null;
  isNewRecord?: boolean;
}

/**
 * Punteggio + record mostrati come overlay in alto a destra dentro l'arena
 * di gioco (canvas o area di gioco), sempre leggibili anche da screen reader.
 */
export default function ArcadeInGameScore({ label, record, isNewRecord }: ArcadeInGameScoreProps) {
  return (
    <div
      className="pointer-events-none absolute top-1.5 right-1.5 z-[5] flex flex-col items-end gap-0.5 rounded-lg bg-slate-950/55 px-2 py-1 text-right"
      aria-live="polite"
    >
      <span className="text-xs font-black text-white leading-none">{label}</span>
      {record !== null && (
        <span className={`text-[10px] font-bold leading-none ${isNewRecord ? 'text-amber-300' : 'text-slate-200'}`}>
          {isNewRecord ? '🏅 Nuovo record! ' : '🏅 Record: '}{record}
        </span>
      )}
    </div>
  );
}
