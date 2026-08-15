import { useEffect, useRef } from 'react';
import { useVoice } from '../../contexts/VoiceContext';
import { buildOperationSpeech } from '../../utils/voiceFeedback';
import { MathOperation } from './arcadeShared';

/**
 * Regola generale per tutti i mini-giochi arcade: annuncia via voce la nuova
 * operazione ("2 per 3") ogni volta che cambia, cosi il bambino la sente
 * mentre la legge sul banner. Il "due per tre uguale sei" alla risposta
 * corretta va invocato a parte con `speak(buildMultiplicationResultSpeech(...))`
 * nel punto in cui il gioco gestisce il colpo giusto.
 */
export function useArcadeOperationVoice(operation: MathOperation) {
  const { speak } = useVoice();
  const lastSpokenRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${operation.a}x${operation.b}`;
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;
    speak(buildOperationSpeech(operation.a, operation.b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation.a, operation.b]);
}
