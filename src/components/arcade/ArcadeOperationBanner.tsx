import React from 'react';

interface ArcadeOperationBannerProps {
  a: number;
  b: number;
}

/**
 * Banner con l'operazione corrente (es. "6 × 7 = ?"), mostrato SEMPRE nel
 * flusso normale del layout (non in overlay sopra l'arena), cosi non si
 * sovrappone mai a nessun elemento di gioco in nessun mini-gioco. Sempre
 * leggibile da screen reader tramite aria-live.
 */
export default function ArcadeOperationBanner({ a, b }: ArcadeOperationBannerProps) {
  return (
    <div
      className="w-full flex justify-center"
      aria-live="polite"
    >
      <div className="rounded-xl bg-white shadow-md px-5 py-2 border-2 border-indigo-400">
        <span className="text-xl font-black text-indigo-900 leading-none tracking-wide">{a} × {b} = ?</span>
      </div>
    </div>
  );
}
