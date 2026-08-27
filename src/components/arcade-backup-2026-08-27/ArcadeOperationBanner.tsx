import React from 'react';

interface ArcadeOperationBannerProps {
  a: number;
  b: number;
  /** Se presente e > 0, mostra il countdown della fase di lettura (es. "⏳ 3s"). */
  secondsLeft?: number;
}

/**
 * Banner con l'operazione corrente (es. "6 × 7 = ?"), mostrato SEMPRE nel
 * flusso normale del layout (non in overlay sopra l'arena), cosi non si
 * sovrappone mai a nessun elemento di gioco in nessun mini-gioco. Sempre
 * leggibile da screen reader tramite aria-live.
 */
export default function ArcadeOperationBanner({ a, b, secondsLeft }: ArcadeOperationBannerProps) {
  return (
    <div
      className="w-full flex justify-center items-center gap-2"
      aria-live="polite"
    >
      <div className="rounded-xl bg-white shadow-md px-5 py-2 border-2 border-indigo-400">
        <span className="text-xl font-black text-indigo-900 leading-none tracking-wide">{a} × {b} = ?</span>
      </div>
      {!!secondsLeft && secondsLeft > 0 && (
        <div className="rounded-full bg-amber-400 shadow-md px-3 py-1.5 border-2 border-amber-600" aria-label={`Il gioco vero inizia tra ${secondsLeft} secondi`}>
          <span className="text-xs font-black text-amber-950">⏳ {secondsLeft}s</span>
        </div>
      )}
    </div>
  );
}
