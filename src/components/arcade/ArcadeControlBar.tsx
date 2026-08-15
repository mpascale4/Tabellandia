import React from 'react';

interface ArcadeControlBarProps {
  /** Attiva il pulsante ◀ (sinistra). */
  onLeft?: () => void;
  /** Attiva il pulsante ▶ (destra). */
  onRight?: () => void;
  /** Attiva il pulsante ▲ (su): se presente insieme a onDown, il layout diventa un D-pad a croce. */
  onUp?: () => void;
  /** Attiva il pulsante ▼ (giù). */
  onDown?: () => void;
  /** Etichetta testuale del pulsante di azione principale (es. "Spara", "Salta", "Vola", "Taglia"). */
  actionLabel?: string;
  /** Emoji del pulsante di azione principale. */
  actionEmoji?: string;
  onAction?: () => void;
}

const DIRECTION_BTN_CLASS =
  'flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-2xl font-black text-slate-800 shadow-md transition-transform cursor-pointer ' +
  'hover:bg-slate-300 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';

const ACTION_BTN_CLASS =
  'flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-md transition-transform cursor-pointer ' +
  'hover:bg-emerald-600 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';

/**
 * Riga di comandi compatta (~56-64px) sotto l'arena di gioco: sostituisce il
 * tocco/trascinamento diretto sul canvas con pulsanti espliciti (frecce +
 * pulsante d'azione), cosi il gioco resta giocabile senza dover toccare
 * l'arena stessa. Usata da tutti i mini-giochi arcade che richiedevano un
 * movimento continuo o uno sparo/salto/taglio con tocco sul canvas.
 */
export default function ArcadeControlBar({ onLeft, onRight, onUp, onDown, actionLabel, actionEmoji, onAction }: ArcadeControlBarProps) {
  const hasVertical = onUp || onDown;

  return (
    <div className="flex w-full items-center justify-center gap-2.5" role="group" aria-label="Comandi di gioco">
      {hasVertical ? (
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5" style={{ width: 'fit-content' }}>
          <div />
          <button type="button" onClick={onUp} className={DIRECTION_BTN_CLASS} aria-label="Su">▲</button>
          <div />
          <button type="button" onClick={onLeft} className={DIRECTION_BTN_CLASS} aria-label="Sinistra">◀</button>
          <button type="button" onClick={onDown} className={DIRECTION_BTN_CLASS} aria-label="Giù">▼</button>
          <button type="button" onClick={onRight} className={DIRECTION_BTN_CLASS} aria-label="Destra">▶</button>
        </div>
      ) : (
        <>
          {onLeft && (
            <button type="button" onClick={onLeft} className={DIRECTION_BTN_CLASS} aria-label="Sinistra">◀</button>
          )}
          {onAction && (
            <button type="button" onClick={onAction} className={ACTION_BTN_CLASS}>
              {actionEmoji && <span aria-hidden="true">{actionEmoji}</span>}
              {actionLabel}
            </button>
          )}
          {onRight && (
            <button type="button" onClick={onRight} className={DIRECTION_BTN_CLASS} aria-label="Destra">▶</button>
          )}
        </>
      )}
    </div>
  );
}
