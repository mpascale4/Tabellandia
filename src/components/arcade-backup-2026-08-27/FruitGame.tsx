import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../SoundManager';
import ArcadeBackButton from './ArcadeBackButton';
import ArcadeControlBar from './ArcadeControlBar';
import ArcadeGameHeader from './ArcadeGameHeader';
import ArcadeInGameScore from './ArcadeInGameScore';
import ArcadeOperationBanner from './ArcadeOperationBanner';
import ArcadeOverlay from './ArcadeOverlay';
import { useArcadeCollectEffect } from './ArcadeCollectEffect';
import { useArcadeOperationVoice } from './useArcadeOperationVoice';
import { useVoice } from '../../contexts/VoiceContext';
import { buildMultiplicationResultSpeech } from '../../utils/voiceFeedback';
import { useArcadeReadyPhase } from '../../hooks/useArcadeReadyPhase';
import {
  ARCADE_CANVAS_HEIGHT,
  ARCADE_CANVAS_WIDTH,
  ArcadeGameProps,
  generateDistractors,
  generateOperation,
  getDifficultyLevel,
  getHighScore,
  MathOperation,
  updateHighScore,
} from './arcadeShared';

const WIDTH = ARCADE_CANVAS_WIDTH;
const HEIGHT = ARCADE_CANVAS_HEIGHT;
const FRUIT_R = 16;
const GRAVITY = 0.16;
const BASE_SPAWN_MS = 1300;
const MIN_SPAWN_MS = 700;
const FRUIT_BOMB_DELAY_MS = 450; // ritardo minimo tra il lancio del frutto giusto e quello della bomba: non devono mai arrivare insieme.
const FRUIT_EMOJIS = ['🍉', '🍎', '🍊', '🍇', '🍓', '🍋'];
const BOMB_EMOJI = '💣';
const RETICLE_STEP = 34;

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  correct: boolean;
  emoji: string;
  sliced: boolean;
}

let fruitIdCounter = 0;

function spawnFruit(op: MathOperation, correct: boolean): Fruit {
  const value = correct ? op.answer : generateDistractors(op.answer, 1)[0];
  const emoji = correct ? FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)] : BOMB_EMOJI;
  const x = 30 + Math.random() * (WIDTH - 60);
  return {
    id: fruitIdCounter++,
    x,
    y: HEIGHT + FRUIT_R,
    vx: (WIDTH / 2 - x) * 0.01 + (Math.random() - 0.5) * 1.2,
    vy: -(6.4 + Math.random() * 1.2),
    value,
    correct,
    emoji,
    sliced: false,
  };
}

/** Mini-gioco arcade: Frutta Matematica (stile Fruit Ninja), affetta solo la frutta col risultato giusto, evita le bombe sbagliate. Riservato alla modalità Casuale. */
export default function FruitGame({ onExit, tableId }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const opRef = useRef<MathOperation>(generateOperation(tableId));
  const reticleXRef = useRef(WIDTH / 2);
  const sliceActionRef = useRef<() => void>(() => {});
  const [operation, setOperation] = useState(opRef.current);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'over'>('playing');
  const [runId, setRunId] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [record, setRecord] = useState(() => getHighScore('frutta'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { secondsLeft, isReadyRef } = useArcadeReadyPhase(roundId);
  const { triggerCollect, CollectEffectOverlay } = useArcadeCollectEffect();
  const { speak } = useVoice();
  const gameOverReasonRef = useRef('Game over: hai tagliato il frutto sbagliato!');
  useArcadeOperationVoice(operation);

  const reset = useCallback(() => {
    fruitsRef.current = [];
    reticleXRef.current = WIDTH / 2;
    opRef.current = generateOperation(tableId);
    setOperation(opRef.current);
    setScore(0);
    setStatus('playing');
    setIsNewRecord(false);
    setRunId(id => id + 1);
    setRoundId(id => id + 1);
  }, [tableId]);

  const nudgeReticle = useCallback((direction: -1 | 1) => {
    reticleXRef.current = Math.max(FRUIT_R, Math.min(WIDTH - FRUIT_R, reticleXRef.current + direction * RETICLE_STEP));
  }, []);

  const taglia = useCallback(() => sliceActionRef.current(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let stopped = false;
    let elapsedSinceSpawn = 0;
    let elapsedTotal = 0;
    let lastCorrectSpawnAt = -Infinity;
    let lastBombSpawnAt = -Infinity;
    let lastTs = performance.now();
    const localScore = { v: 0 };

    const gameOver = (finalScore: number) => {
      setStatus('over');
      stopped = true;
      const updated = updateHighScore('frutta', finalScore);
      setIsNewRecord(updated === finalScore && (record === null || finalScore > record));
      setRecord(updated);
    };

    // Affetta il frutto/bomba attivo più vicino alla posizione X del mirino (spostato con ◀ ▶).
    sliceActionRef.current = () => {
      if (stopped) return;
      const candidates = fruitsRef.current.filter(f => !f.sliced);
      if (candidates.length === 0) return;
      const target = candidates.reduce((nearest, f) =>
        Math.abs(f.x - reticleXRef.current) < Math.abs(nearest.x - reticleXRef.current) ? f : nearest
      );
      sound.playSlice();
      target.sliced = true;
      if (target.correct) {
        sound.playCorrect();
        triggerCollect(target.x, target.y, isReadyRef.current ? '🎉' : '⭐');
        if (isReadyRef.current) {
          localScore.v += 1;
          setScore(localScore.v);
          speak(buildMultiplicationResultSpeech(opRef.current.a, opRef.current.b, opRef.current.answer));
          const nextOp = generateOperation(tableId, opRef.current);
          opRef.current = nextOp;
          setOperation(nextOp);
          setRoundId(id => id + 1);
        }
      } else {
        sound.playError();
        gameOverReasonRef.current = 'Game over: hai tagliato la bomba!';
        gameOver(localScore.v);
      }
    };

    const draw = () => {
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fruitsRef.current.forEach(f => {
        if (f.sliced) return;
        ctx.fillText(f.emoji, f.x, f.y);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = f.correct ? '#bbf7d0' : '#fecaca';
        const label = f.correct && !isReadyRef.current ? '⭐' : String(f.value);
        ctx.fillText(label, f.x, f.y + 18);
        ctx.font = '26px sans-serif';
      });

      // Mirino: linea verticale mossa con ◀ ▶, per indicare cosa verrà affettato con "Taglia".
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(reticleXRef.current, 0);
      ctx.lineTo(reticleXRef.current, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const step = (ts: number) => {
      if (stopped) return;
      const dt = ts - lastTs;
      lastTs = ts;
      elapsedSinceSpawn += dt;
      elapsedTotal += dt;
      const level = getDifficultyLevel(elapsedTotal);
      const spawnInterval = Math.max(MIN_SPAWN_MS, BASE_SPAWN_MS - level * 130);

      if (elapsedSinceSpawn >= spawnInterval) {
        elapsedSinceSpawn = 0;
        // Garantisce sempre almeno un frutto giusto e una bomba distrattore in campo insieme,
        // ma con un ritardo minimo tra i due lanci: non devono mai partire nello stesso istante,
        // altrimenti arrivano in basso insieme e non c'e' modo di prendere solo quello giusto.
        const correctPresent = fruitsRef.current.some(f => !f.sliced && f.correct);
        const bombPresent = fruitsRef.current.some(f => !f.sliced && !f.correct);
        if (!correctPresent && elapsedTotal - lastBombSpawnAt >= FRUIT_BOMB_DELAY_MS) {
          fruitsRef.current.push(spawnFruit(opRef.current, true));
          lastCorrectSpawnAt = elapsedTotal;
        }
        if (!bombPresent && elapsedTotal - lastCorrectSpawnAt >= FRUIT_BOMB_DELAY_MS) {
          fruitsRef.current.push(spawnFruit(opRef.current, false));
          lastBombSpawnAt = elapsedTotal;
        }
      }

      fruitsRef.current = fruitsRef.current
        .map(f => ({ ...f, x: f.x + f.vx, y: f.y + f.vy, vy: f.vy + GRAVITY }))
        .filter(f => f.sliced ? false : f.y < HEIGHT + FRUIT_R * 3);

      // Game Over immediato se il frutto corretto cade a terra senza essere affettato.
      fruitsRef.current.forEach(f => {
        if (!f.sliced && f.correct && f.y > HEIGHT + FRUIT_R * 2.9) {
          f.sliced = true;
          sound.playError();
          gameOverReasonRef.current = 'Game over: hai lasciato cadere il frutto giusto!';
          gameOver(localScore.v);
        }
      });

      if (stopped) return;

      draw();
      raf = requestAnimationFrame(step);
    };

    draw();
    raf = requestAnimationFrame(step);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [runId, tableId, record, isReadyRef, triggerCollect, speak]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ArcadeGameHeader emoji="🍉" title="Frutta Matematica" />
      <ArcadeOperationBanner a={operation.a} b={operation.b} secondsLeft={secondsLeft} />
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-md" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block" />
        <ArcadeInGameScore label={`Punti: ${score}`} record={record} isNewRecord={isNewRecord} />
        <CollectEffectOverlay />
        {status === 'over' && (
          <ArcadeOverlay
            emoji="🍉"
            title="Game Over!"
            subtitle={`Punteggio: ${score}`}
            onRetry={reset}
            reasonSpeech={gameOverReasonRef.current}
          />
        )}
      </div>
      <ArcadeControlBar
        onLeft={() => nudgeReticle(-1)}
        onRight={() => nudgeReticle(1)}
        actionEmoji="🔪"
        actionLabel="Taglia"
        onAction={taglia}
      />
      <p className="text-xs font-bold text-sky-700/70 text-center">
        {secondsLeft > 0
          ? 'Allenati: affetta la frutta con la ⭐!'
          : 'Muovi il mirino con ◀ ▶ e premi Taglia sul risultato giusto, evita le bombe sbagliate!'}
      </p>
      <ArcadeBackButton onExit={onExit} />
    </div>
  );
}
