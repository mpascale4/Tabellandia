import React from 'react';

interface ArcadeGameHeaderProps {
  emoji: string;
  title: string;
  /** Facoltativo: solo per i giochi che non mostrano il punteggio dentro l'arena (es. Pong). */
  scoreLabel?: string;
}

/**
 * Header condiviso dai mini-giochi arcade: titolo (ed eventuale punteggio,
 * solo dove non è già mostrato dentro l'arena di gioco). Il pulsante di
 * uscita non sta qui: vive in fondo alla pagina come "Indietro", coerente
 * con le altre schermate del progetto.
 */
export default function ArcadeGameHeader({ emoji, title, scoreLabel }: ArcadeGameHeaderProps) {
  return (
    <div className="w-full flex items-center justify-between gap-2">
      <p className="text-sm font-black text-sky-900 flex items-center gap-1.5">
        <span aria-hidden="true">{emoji}</span> {title}
      </p>
      {scoreLabel && <p className="text-xs font-bold text-sky-700/80" aria-live="polite">{scoreLabel}</p>}
    </div>
  );
}
