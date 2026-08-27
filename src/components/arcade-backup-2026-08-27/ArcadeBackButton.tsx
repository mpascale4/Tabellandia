import React from 'react';

interface ArcadeBackButtonProps {
  onExit: () => void;
}

/**
 * Pulsante "Indietro" in fondo, coerente con lo stile usato nelle altre
 * schermate del progetto (es. TrainingSession "Indietro").
 */
export default function ArcadeBackButton({ onExit }: ArcadeBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onExit}
      className="w-full rounded-2xl bg-slate-200 py-3 text-sm font-bold text-slate-800 shadow-md transition-colors hover:bg-slate-300 cursor-pointer
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      aria-label="Torna alla lista delle tabelline"
    >
      Indietro
    </button>
  );
}
