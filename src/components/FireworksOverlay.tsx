/**
 * FireworksOverlay - animazione fuochi d'artificio celebrativa su canvas.
 * - aria-hidden: decorativo, non rilevante per screen reader
 * - prefers-reduced-motion: salta l'animazione canvas, mostra solo emoji statiche
 * - pointer-events: none, non blocca l'interazione
 * - Si auto-rimuove dopo ~3.5 s chiamando onDone()
 */

import { useEffect, useRef } from 'react';

interface FireworksOverlayProps {
  /** Chiamata quando l'animazione è terminata */
  onDone: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  radius: number;
}

interface Burst {
  particles: Particle[];
}

const COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF6FCF', '#FFA63D', '#A29BFE', '#00CEC9',
];

const DURATION_MS = 3500;
const BURST_INTERVAL_MS = 600;
const BURST_COUNT = 6; // quanti burst lanciare in totale
const PARTICLES_PER_BURST = 60;
const GRAVITY = 0.06;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createBurst(cx: number, cy: number): Burst {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const color2 = COLORS[Math.floor(Math.random() * COLORS.length)];
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLES_PER_BURST; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLES_PER_BURST;
    const speed = randomBetween(2, 7);
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: i % 3 === 0 ? color2 : color,
      radius: randomBetween(2, 4),
    });
  }
  return { particles };
}

export default function FireworksOverlay({ onDone }: FireworksOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    // Se riduzione movimento attiva, salta l'animazione canvas
    const timer = setTimeout(onDone, DURATION_MS);

    if (prefersReduced) return () => clearTimeout(timer);

    const canvas = canvasRef.current;
    if (!canvas) return () => clearTimeout(timer);

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => clearTimeout(timer);

    // Adatta canvas alla viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const bursts: Burst[] = [];
    let burstsFired = 0;
    let rafId = 0;

    // Lancia burst a intervalli regolari
    const burstTimer = setInterval(() => {
      if (burstsFired >= BURST_COUNT) {
        clearInterval(burstTimer);
        return;
      }
      const cx = randomBetween(canvas.width * 0.15, canvas.width * 0.85);
      const cy = randomBetween(canvas.height * 0.1, canvas.height * 0.55);
      bursts.push(createBurst(cx, cy));
      burstsFired++;
    }, BURST_INTERVAL_MS);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const burst of bursts) {
        for (const p of burst.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += GRAVITY;
          p.vx *= 0.98;
          p.alpha -= 0.012;

          if (p.alpha <= 0) continue;

          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      clearTimeout(timer);
      clearInterval(burstTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [onDone, prefersReduced]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {prefersReduced ? (
        // Fallback statico per prefers-reduced-motion
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '15vh',
            fontSize: '3rem',
            letterSpacing: '0.5rem',
          }}
        >
          🎆🏅🎆
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}
    </div>
  );
}


