import React from 'react';

interface ArcadeOverlayProps {
  emoji: string;
  title: string;
  subtitle?: string;
  onRetry: () => void;
}

/**
 * Overlay di fine partita (vittoria o game over) condiviso dai mini-giochi
 * arcade: mostra esito + "Rigioca". Per uscire c'e sempre il pulsante
 * "Indietro" in fondo alla pagina (vedi ArcadeBackButton).
 */
export default function ArcadeOverlay({ emoji, title, subtitle, onRetry }: ArcadeOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/80 backdrop-blur-sm p-4 text-center"
      role="alertdialog"
      aria-live="assertive"
    >
      <span className="text-5xl" aria-hidden="true">{emoji}</span>
      <p className="text-lg font-black text-white">{title}</p>
      {subtitle && <p className="text-sm font-bold text-slate-200">{subtitle}</p>}
      <div className="flex flex-row gap-2 mt-1">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-600 cursor-pointer
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          aria-label="Rigioca"
        >
          🔁 Rigioca
        </button>
      </div>
    </div>
  );
}
