import React, { useCallback, useRef, useState } from 'react';

interface Burst { id: number; x: number; y: number; emoji: string; }

/**
 * Effetto visivo di "raccolta" condiviso da tutti i mini-giochi arcade: un
 * breve burst (emoji che si ingrandisce e sfuma) nel punto esatto in cui si
 * colpisce/raccoglie il bersaglio giusto (stella in allenamento o risultato
 * corretto). Regola generale: va usato ovunque si "prende" qualcosa di giusto,
 * non solo in un singolo mini-gioco.
 */
export function useArcadeCollectEffect() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const idRef = useRef(0);

  const triggerCollect = useCallback((x: number, y: number, emoji: string = '✨') => {
    const id = idRef.current++;
    setBursts(prev => [...prev, { id, x, y, emoji }]);
    window.setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id));
    }, 420);
  }, []);

  const CollectEffectOverlay = useCallback(() => (
    <>
      {bursts.map(b => (
        <span
          key={b.id}
          className="absolute pointer-events-none select-none arcade-collect-burst"
          style={{ left: b.x, top: b.y, fontSize: 22 }}
          aria-hidden="true"
        >
          {b.emoji}
        </span>
      ))}
    </>
  ), [bursts]);

  return { triggerCollect, CollectEffectOverlay };
}
