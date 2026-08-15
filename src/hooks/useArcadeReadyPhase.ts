import { useEffect, useRef, useState } from 'react';

export const ARCADE_READY_PHASE_MS = 5000;

/**
 * Fase di lettura fissa (default 5s) ad ogni cambio di operazione nei mini-giochi
 * arcade: durante questa fase i giochi mostrano bersagli "generici" (senza legame
 * con l'operazione, es. una stellina in posizione casuale) cosi il bambino ha il
 * tempo di leggere e calcolare la risposta, ma il rischio di sbagliare/game over
 * resta reale. `key` identifica il "round" corrente (es. un contatore incrementato
 * ad ogni nuova operazione): cambiandolo la fase riparte da capo.
 */
export function useArcadeReadyPhase(key: string | number, durationMs: number = ARCADE_READY_PHASE_MS) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.ceil(durationMs / 1000));
  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(false);

  useEffect(() => {
    setIsReady(false);
    isReadyRef.current = false;
    setSecondsLeft(Math.ceil(durationMs / 1000));
    const start = performance.now();
    const intervalId = window.setInterval(() => {
      const remainingMs = Math.max(0, durationMs - (performance.now() - start));
      setSecondsLeft(Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) {
        setIsReady(true);
        isReadyRef.current = true;
        window.clearInterval(intervalId);
      }
    }, 200);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, durationMs]);

  return { isReady, secondsLeft, isReadyRef };
}
