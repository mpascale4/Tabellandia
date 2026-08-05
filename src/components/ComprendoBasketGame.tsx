import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';

interface ComprendoBasketGameProps {
  a: number;
  b: number;
  itemEmoji: string;
  onCompletionChange?: (isCompleted: boolean) => void;
}

interface ArenaSize {
  width: number;
  height: number;
}

interface BasketParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface BeeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface ArenaRipple {
  id: number;
  x: number;
  y: number;
}

interface AppleBurst {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const BASKET_SIZE = 84;
const BOOST_DURATION_MS = 3000;
const BOOST_COOLDOWN_MS = 420;
const BOOST_MAX_MULTIPLIER = 5;
const BOOST_MIN_MULTIPLIER = 1;
const BOOST_FACTOR_MAX_STEP = 10;
const BOOST_FACTOR_ACCELERATION_MAX = 0.7;
const BEE_START_FACTOR = 4;
const BEE_SIZE = 42;
const BEE_ATTRACT_DURATION_MS = 850;
const BEE_IDLE_INNER_PADDING_RATIO = 0.18;
const BEE_IDLE_CENTER_PULL = 64;
const BEE_IDLE_EDGE_AVOIDANCE = 110;
const BEE_IDLE_EDGE_MARGIN = 30;
const COMPRENDO_AUDIO_MESSAGES = {
  turbo: 'Riempi la cesta con le mele.',
  basketFull: 'Questa cesta e gia piena.',
  bee: 'Oh no! Hai toccato il calabrone.',
} as const;
const createEmptyCounts = (count: number) => Array.from({ length: count }, () => 0);
const FINAL_BASKET_MAX_SIZE = 68;
const FINAL_BASKET_MIN_SIZE = 42;
const FINAL_BASKET_GAP = 8;
const ARENA_HEIGHT_CLASS = 'h-64';

const createInitialParticles = (count: number, arena: ArenaSize): BasketParticle[] => {
  const usableWidth = Math.max(BASKET_SIZE, arena.width - BASKET_SIZE);
  const usableHeight = Math.max(BASKET_SIZE, arena.height - BASKET_SIZE);
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = usableWidth / columns;
  const cellHeight = usableHeight / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const centerX = Math.min(usableWidth, column * cellWidth + (cellWidth - BASKET_SIZE) / 2);
    const centerY = Math.min(usableHeight, row * cellHeight + (cellHeight - BASKET_SIZE) / 2);

    return {
      x: Math.max(0, centerX),
      y: Math.max(0, centerY),
      vx: (Math.random() > 0.5 ? 1 : -1) * (36 + ((index * 11) % 18)),
      vy: (Math.random() > 0.5 ? 1 : -1) * (32 + ((index * 13) % 16)),
    };
  });
};

const createReducedMotionLayout = (count: number, arena: ArenaSize): BasketParticle[] => {
  const usableWidth = Math.max(BASKET_SIZE, arena.width - BASKET_SIZE);
  const usableHeight = Math.max(BASKET_SIZE, arena.height - BASKET_SIZE);
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = usableWidth / columns;
  const cellHeight = usableHeight / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: Math.max(0, Math.min(usableWidth, column * cellWidth + (cellWidth - BASKET_SIZE) / 2)),
      y: Math.max(0, Math.min(usableHeight, row * cellHeight + (cellHeight - BASKET_SIZE) / 2)),
      vx: 0,
      vy: 0,
    };
  });
};

const createBeeParticles = (count: number, arena: ArenaSize, factor: number, reducedMotion: boolean): BeeParticle[] => {
  const maxX = Math.max(0, arena.width - BEE_SIZE);
  const maxY = Math.max(0, arena.height - BEE_SIZE);
  const innerPaddingX = maxX * BEE_IDLE_INNER_PADDING_RATIO;
  const innerPaddingY = maxY * BEE_IDLE_INNER_PADDING_RATIO;
  const idleMinX = Math.max(0, innerPaddingX);
  const idleMaxX = Math.max(idleMinX, maxX - innerPaddingX);
  const idleMinY = Math.max(0, innerPaddingY);
  const idleMaxY = Math.max(idleMinY, maxY - innerPaddingY);
  const speedBase = 96 + (factor * 12);

  return Array.from({ length: count }, (_, index) => {
    const x = Math.floor(idleMinX + (Math.random() * Math.max(1, idleMaxX - idleMinX)));
    const y = Math.floor(idleMinY + (Math.random() * Math.max(1, idleMaxY - idleMinY)));
    if (reducedMotion) {
      return { x, y, vx: 0, vy: 0 };
    }

    const drift = speedBase + (index * 18);
    return {
      x,
      y,
      vx: (Math.random() > 0.5 ? 1 : -1) * drift,
      vy: (Math.random() > 0.5 ? 1 : -1) * (drift * 0.85),
    };
  });
};

export default function ComprendoBasketGame({ a: propA, b: propB, itemEmoji, onCompletionChange }: ComprendoBasketGameProps) {
  const displayA = propA;
  const displayB = propB;
  const a = propB; // number of baskets
  const b = propA; // items per basket
  const { speak, voiceEnabled } = useVoice();
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<BasketParticle[]>([]);
  const frameRef = useRef<number | null>(null);
  const beeFrameRef = useRef<number | null>(null);
  const boostTimeoutRef = useRef<number | null>(null);
  const cooldownTimeoutRef = useRef<number | null>(null);
  const beeAttractTimeoutRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const rippleIdRef = useRef<number>(0);
  const rippleTimeoutsRef = useRef<number[]>([]);
  const appleBurstIdRef = useRef<number>(0);
  const appleBurstTimeoutsRef = useRef<number[]>([]);
  const isOutsidePromptSpeakingRef = useRef<boolean>(false);
  const beeParticlesRef = useRef<BeeParticle[]>([]);
  const beeAttractTargetRef = useRef<{ x: number; y: number } | null>(null);
  const [arenaSize, setArenaSize] = useState<ArenaSize>({ width: 0, height: 0 });
  const [basketCounts, setBasketCounts] = useState<number[]>(() => createEmptyCounts(a));
  const [positions, setPositions] = useState<BasketParticle[]>([]);
  const [celebratingBasket, setCelebratingBasket] = useState<number | null>(null);
  const [errorBasket, setErrorBasket] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [arenaRipples, setArenaRipples] = useState<ArenaRipple[]>([]);
  const [arenaPulseActive, setArenaPulseActive] = useState<boolean>(false);
  const [appleBursts, setAppleBursts] = useState<AppleBurst[]>([]);
  const [beePositions, setBeePositions] = useState<BeeParticle[]>([]);
  const [beeHit, setBeeHit] = useState<boolean>(false);
  const [beeDefeat, setBeeDefeat] = useState<boolean>(false);
  const clampedFactor = Math.max(1, Math.min(BOOST_FACTOR_MAX_STEP, displayB));
  const factorProgress = (clampedFactor - 1) / (BOOST_FACTOR_MAX_STEP - 1);
  const boostMaxForFactor = BOOST_MAX_MULTIPLIER + (BOOST_FACTOR_ACCELERATION_MAX * factorProgress);

  const totalItems = a * b;
  const completedBaskets = basketCounts.filter(count => count === b).length;
  const isCompleted = completedBaskets === a;
  const isFailed = beeDefeat;
  const finalBasketLayout = useMemo(() => {
    const availableWidth = Math.max(0, arenaSize.width - 32);
    const availableHeight = Math.max(0, arenaSize.height - 32);

    if (a === 0 || availableWidth === 0 || availableHeight === 0) {
      return {
        itemSize: FINAL_BASKET_MIN_SIZE,
        iconSize: 18,
        textSize: 9,
        checkSize: 16,
        columns: 1,
      };
    }

    let bestSize = FINAL_BASKET_MIN_SIZE;
    let bestColumns = 1;

    for (let columns = 1; columns <= a; columns += 1) {
      const rows = Math.ceil(a / columns);
      const widthPerItem = (availableWidth - (Math.max(0, columns - 1) * FINAL_BASKET_GAP)) / columns;
      const heightPerItem = (availableHeight - (Math.max(0, rows - 1) * FINAL_BASKET_GAP)) / rows;
      const candidateSize = Math.floor(Math.min(widthPerItem, heightPerItem, FINAL_BASKET_MAX_SIZE));

      if (candidateSize >= FINAL_BASKET_MIN_SIZE && candidateSize > bestSize) {
        bestSize = candidateSize;
        bestColumns = columns;
      }
    }

    const itemSize = Math.max(FINAL_BASKET_MIN_SIZE, Math.min(FINAL_BASKET_MAX_SIZE, bestSize));

    return {
      itemSize,
      iconSize: Math.max(16, Math.floor(itemSize * 0.34)),
      textSize: Math.max(8, Math.floor(itemSize * 0.14)),
      checkSize: Math.max(14, Math.floor(itemSize * 0.24)),
      columns: bestColumns,
    };
  }, [a, arenaSize.height, arenaSize.width]);
  useEffect(() => {
    setBasketCounts(createEmptyCounts(a));
    setCelebratingBasket(null);
    setErrorBasket(null);
    setSpeedMultiplier(1);
    setAppleBursts([]);
    setBeeDefeat(false);
    setBeeHit(false);
  }, [a, b]);

  useEffect(() => {
    return () => {
      isOutsidePromptSpeakingRef.current = false;
      if (boostTimeoutRef.current !== null) {
        window.clearTimeout(boostTimeoutRef.current);
      }
      if (cooldownTimeoutRef.current !== null) {
        window.clearTimeout(cooldownTimeoutRef.current);
      }
      if (pulseTimeoutRef.current !== null) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
      if (beeAttractTimeoutRef.current !== null) {
        window.clearTimeout(beeAttractTimeoutRef.current);
      }
      rippleTimeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
      appleBurstTimeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
      if (beeFrameRef.current !== null) {
        window.cancelAnimationFrame(beeFrameRef.current);
      }
    };
  }, []);

  const triggerAppleBurst = (basketIndex: number) => {
    const basketPosition = positions[basketIndex];
    const burstId = appleBurstIdRef.current + 1;
    appleBurstIdRef.current = burstId;
    const basketCenterX = (basketPosition?.x ?? (arenaSize.width / 2)) + (BASKET_SIZE / 2);
    const basketCenterY = (basketPosition?.y ?? (arenaSize.height / 2)) + (BASKET_SIZE / 2);

    const burst: AppleBurst = {
      id: burstId,
      startX: basketCenterX,
      startY: Math.max(8, basketCenterY - 52),
      endX: basketCenterX,
      endY: basketCenterY - 2,
    };

    setAppleBursts(current => [...current, burst]);

    const timeoutId = window.setTimeout(() => {
      setAppleBursts(current => current.filter(item => item.id !== burstId));
      appleBurstTimeoutsRef.current = appleBurstTimeoutsRef.current.filter(item => item !== timeoutId);
    }, 420);

    appleBurstTimeoutsRef.current.push(timeoutId);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    handleMotionPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMotionPreference);
      return () => mediaQuery.removeEventListener('change', handleMotionPreference);
    }

    mediaQuery.addListener(handleMotionPreference);
    return () => mediaQuery.removeListener(handleMotionPreference);
  }, []);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    const updateArenaSize = () => {
      setArenaSize({
        width: arena.clientWidth,
        height: arena.clientHeight,
      });
    };

    updateArenaSize();
    const observer = new ResizeObserver(updateArenaSize);
    observer.observe(arena);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (arenaSize.width <= 0 || arenaSize.height <= 0) return;

    const nextParticles = prefersReducedMotion
      ? createReducedMotionLayout(a, arenaSize)
      : createInitialParticles(a, arenaSize);

    particlesRef.current = nextParticles;
    setPositions(nextParticles);
  }, [a, arenaSize, prefersReducedMotion]);

  useEffect(() => {
    const beeCount = displayB >= BEE_START_FACTOR ? getBeeCount(displayB) : 0;
    if (arenaSize.width <= 0 || arenaSize.height <= 0 || beeCount === 0 || isCompleted || isFailed) {
      beeParticlesRef.current = [];
      setBeePositions([]);
      return;
    }

    const nextBees = createBeeParticles(beeCount, arenaSize, displayB, prefersReducedMotion);
    beeParticlesRef.current = nextBees;
    setBeePositions(nextBees);
  }, [arenaSize, displayB, isCompleted, isFailed, prefersReducedMotion]);

  useEffect(() => {
    onCompletionChange?.(isCompleted);
  }, [isCompleted, onCompletionChange]);

  useEffect(() => {
    if (prefersReducedMotion || isCompleted || isFailed || arenaSize.width <= 0 || arenaSize.height <= 0 || positions.length !== a) return;

    let previousTime = performance.now();

    const animate = (time: number) => {
      const deltaSeconds = Math.min(0.04, (time - previousTime) / 1000);
      previousTime = time;

      const maxX = Math.max(0, arenaSize.width - BASKET_SIZE);
      const maxY = Math.max(0, arenaSize.height - BASKET_SIZE);

      const nextParticles = particlesRef.current.map((particle, index) => {
        if (basketCounts[index] >= b) {
          return particle;
        }

        let nextX = particle.x + (particle.vx * deltaSeconds * speedMultiplier);
        let nextY = particle.y + (particle.vy * deltaSeconds * speedMultiplier);
        let nextVx = particle.vx;
        let nextVy = particle.vy;

        if (nextX <= 0) {
          nextX = 0;
          nextVx = Math.abs(nextVx);
        } else if (nextX >= maxX) {
          nextX = maxX;
          nextVx = -Math.abs(nextVx);
        }

        if (nextY <= 0) {
          nextY = 0;
          nextVy = Math.abs(nextVy);
        } else if (nextY >= maxY) {
          nextY = maxY;
          nextVy = -Math.abs(nextVy);
        }

        return {
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
        };
      });

      particlesRef.current = nextParticles;
      setPositions(nextParticles);
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [a, arenaSize, basketCounts, b, isCompleted, isFailed, positions.length, prefersReducedMotion, speedMultiplier]);

  useEffect(() => {
    if (
      prefersReducedMotion
      || isCompleted
      || isFailed
      || displayB < BEE_START_FACTOR
      || arenaSize.width <= 0
      || arenaSize.height <= 0
      || beePositions.length === 0
    ) {
      return;
    }

    const maxBeeSpeed = 120 + (displayB * 12);
    const jitterStrength = 14 + (displayB * 1.1);
    const attractStrength = 320 + (displayB * 34);
    const agility = 0.72 + (displayB * 0.06);
    let previousTime = performance.now();

    const animateBees = (time: number) => {
      const deltaSeconds = Math.min(0.04, (time - previousTime) / 1000);
      previousTime = time;
      const maxX = Math.max(0, arenaSize.width - BEE_SIZE);
      const maxY = Math.max(0, arenaSize.height - BEE_SIZE);
      const centerX = maxX / 2;
      const centerY = maxY / 2;
      const innerPaddingX = maxX * BEE_IDLE_INNER_PADDING_RATIO;
      const innerPaddingY = maxY * BEE_IDLE_INNER_PADDING_RATIO;
      const idleMinX = Math.max(0, innerPaddingX);
      const idleMaxX = Math.max(idleMinX, maxX - innerPaddingX);
      const idleMinY = Math.max(0, innerPaddingY);
      const idleMaxY = Math.max(idleMinY, maxY - innerPaddingY);
      const attractTarget = beeAttractTargetRef.current;

      const nextBeeParticles = beeParticlesRef.current.map((bee) => {
        let ax = (Math.random() - 0.5) * jitterStrength * agility;
        let ay = (Math.random() - 0.5) * jitterStrength * agility;

        if (attractTarget) {
          const dx = attractTarget.x - bee.x;
          const dy = attractTarget.y - bee.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1) {
            const attraction = (attractStrength / Math.max(36, dist)) * agility;
            ax += (dx / dist) * attraction;
            ay += (dy / dist) * attraction;
          }
        } else {
          const centerDx = centerX - bee.x;
          const centerDy = centerY - bee.y;
          const centerDist = Math.hypot(centerDx, centerDy);
          if (centerDist > 1) {
            const centering = (BEE_IDLE_CENTER_PULL / Math.max(64, centerDist)) * agility;
            ax += (centerDx / centerDist) * centering;
            ay += (centerDy / centerDist) * centering;
          }

          // Keep idle movement more central and avoid outer borders unless user clicks the arena.
          if (bee.x < idleMinX + BEE_IDLE_EDGE_MARGIN) {
            ax += BEE_IDLE_EDGE_AVOIDANCE * agility;
          } else if (bee.x > idleMaxX - BEE_IDLE_EDGE_MARGIN) {
            ax -= BEE_IDLE_EDGE_AVOIDANCE * agility;
          }

          if (bee.y < idleMinY + BEE_IDLE_EDGE_MARGIN) {
            ay += BEE_IDLE_EDGE_AVOIDANCE * agility;
          } else if (bee.y > idleMaxY - BEE_IDLE_EDGE_MARGIN) {
            ay -= BEE_IDLE_EDGE_AVOIDANCE * agility;
          }
        }

        let nextVx = bee.vx + (ax * deltaSeconds);
        let nextVy = bee.vy + (ay * deltaSeconds);
        const speed = Math.hypot(nextVx, nextVy);
        if (speed > maxBeeSpeed) {
          const scale = maxBeeSpeed / speed;
          nextVx *= scale;
          nextVy *= scale;
        }

        let nextX = bee.x + (nextVx * deltaSeconds);
        let nextY = bee.y + (nextVy * deltaSeconds);

        if (nextX <= 0) {
          nextX = 0;
          nextVx = Math.abs(nextVx);
        } else if (nextX >= maxX) {
          nextX = maxX;
          nextVx = -Math.abs(nextVx);
        }

        if (nextY <= 0) {
          nextY = 0;
          nextVy = Math.abs(nextVy);
        } else if (nextY >= maxY) {
          nextY = maxY;
          nextVy = -Math.abs(nextVy);
        }

        return { x: nextX, y: nextY, vx: nextVx, vy: nextVy };
      });

      beeParticlesRef.current = nextBeeParticles;
      setBeePositions(nextBeeParticles);
      beeFrameRef.current = window.requestAnimationFrame(animateBees);
    };

    beeFrameRef.current = window.requestAnimationFrame(animateBees);

    return () => {
      if (beeFrameRef.current !== null) {
        window.cancelAnimationFrame(beeFrameRef.current);
        beeFrameRef.current = null;
      }
    };
  }, [arenaSize, beePositions.length, displayB, isCompleted, isFailed, prefersReducedMotion]);

  const speakOutsidePrompt = () => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isOutsidePromptSpeakingRef.current && window.speechSynthesis.speaking) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(COMPRENDO_AUDIO_MESSAGES.turbo);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;
    utterance.onend = () => {
      isOutsidePromptSpeakingRef.current = false;
    };
    utterance.onerror = () => {
      isOutsidePromptSpeakingRef.current = false;
    };

    isOutsidePromptSpeakingRef.current = true;
    window.speechSynthesis.speak(utterance);
  };

  const speakBasketLabel = (basketIndex: number) => {
    isOutsidePromptSpeakingRef.current = false;
    speak(`Cesta ${basketIndex + 1}`);
  };

  const getBeeSpeedMs = (factor: number): number => {
    if (factor >= 8) return 1600;
    if (factor >= 6) return 2400;
    return 3500;
  };

  const getBeeCount = (factor: number): number => {
    if (factor >= 8) return 3;
    if (factor >= 6) return 2;
    return 1;
  };

  const handleBeeTap = () => {
    if (isCompleted || isFailed || beeHit) return;
    setBeeHit(true);
    setBeeDefeat(true);
    beeAttractTargetRef.current = null;
    setSpeedMultiplier(BOOST_MIN_MULTIPLIER);
    if (boostTimeoutRef.current !== null) {
      window.clearTimeout(boostTimeoutRef.current);
      boostTimeoutRef.current = null;
    }
    if (cooldownTimeoutRef.current !== null) {
      window.clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    sound.playError();
    speak(COMPRENDO_AUDIO_MESSAGES.bee);
    window.setTimeout(() => setBeeHit(false), 600);
  };

  const triggerArenaBoost = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isCompleted || isFailed) return;

    sound.playTick();
    speakOutsidePrompt();
    setSpeedMultiplier(boostMaxForFactor);
    setArenaPulseActive(true);

    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current);
    }

    pulseTimeoutRef.current = window.setTimeout(() => {
      setArenaPulseActive(false);
      pulseTimeoutRef.current = null;
    }, 220);

    const rect = event.currentTarget.getBoundingClientRect();
    const rippleId = rippleIdRef.current + 1;
    rippleIdRef.current = rippleId;
    const nextRipple = {
      id: rippleId,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const maxBeeX = Math.max(0, arenaSize.width - BEE_SIZE);
    const maxBeeY = Math.max(0, arenaSize.height - BEE_SIZE);
    const clickX = Math.max(0, Math.min(maxBeeX, (event.clientX - rect.left) - (BEE_SIZE / 2)));
    const clickY = Math.max(0, Math.min(maxBeeY, (event.clientY - rect.top) - (BEE_SIZE / 2)));
    beeAttractTargetRef.current = { x: clickX, y: clickY };

    // Apply an immediate directional push so bees visibly converge right after the click.
    if (!prefersReducedMotion && beeParticlesRef.current.length > 0) {
      const chaseSpeed = 150 + (displayB * 16);
      const steeredBees = beeParticlesRef.current.map((bee) => {
        const dx = clickX - bee.x;
        const dy = clickY - bee.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return bee;
        const steerVx = (dx / dist) * chaseSpeed;
        const steerVy = (dy / dist) * chaseSpeed;
        return {
          ...bee,
          // Blend old and new vectors for a softer, less abrupt turn.
          vx: (bee.vx * 0.35) + (steerVx * 0.65),
          vy: (bee.vy * 0.35) + (steerVy * 0.65),
        };
      });
      beeParticlesRef.current = steeredBees;
      setBeePositions(steeredBees);
    }

    if (beeAttractTimeoutRef.current !== null) {
      window.clearTimeout(beeAttractTimeoutRef.current);
    }
    beeAttractTimeoutRef.current = window.setTimeout(() => {
      beeAttractTargetRef.current = null;
      beeAttractTimeoutRef.current = null;
    }, BEE_ATTRACT_DURATION_MS);

    setArenaRipples(current => [...current, nextRipple]);

    const rippleTimeoutId = window.setTimeout(() => {
      setArenaRipples(current => current.filter(ripple => ripple.id !== rippleId));
      rippleTimeoutsRef.current = rippleTimeoutsRef.current.filter(timeoutId => timeoutId !== rippleTimeoutId);
    }, 650);

    rippleTimeoutsRef.current.push(rippleTimeoutId);

    if (boostTimeoutRef.current !== null) {
      window.clearTimeout(boostTimeoutRef.current);
    }
    if (cooldownTimeoutRef.current !== null) {
      window.clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }

    boostTimeoutRef.current = window.setTimeout(() => {
      const cooldownStart = performance.now();

      const easeBack = () => {
        const progress = Math.min(1, (performance.now() - cooldownStart) / BOOST_COOLDOWN_MS);
        const easedProgress = 1 - Math.pow(1 - progress, 2);
        const nextMultiplier = boostMaxForFactor - ((boostMaxForFactor - BOOST_MIN_MULTIPLIER) * easedProgress);

        setSpeedMultiplier(nextMultiplier);

        if (progress < 1) {
          cooldownTimeoutRef.current = window.setTimeout(easeBack, 16);
          return;
        }

        setSpeedMultiplier(BOOST_MIN_MULTIPLIER);
        cooldownTimeoutRef.current = null;
      };

      easeBack();
      boostTimeoutRef.current = null;
    }, BOOST_DURATION_MS);
  };

  const handleFillBasket = (basketIndex: number) => {
    if (isFailed) return;
    const currentBasketCount = basketCounts[basketIndex];

    if (currentBasketCount >= b) {
      isOutsidePromptSpeakingRef.current = false;
      sound.playError();
      setErrorBasket(basketIndex);
      window.setTimeout(() => setErrorBasket(current => (current === basketIndex ? null : current)), 350);
      speak(COMPRENDO_AUDIO_MESSAGES.basketFull);
      return;
    }

    const nextCounts = [...basketCounts];
    nextCounts[basketIndex] = currentBasketCount + 1;
    const nextCompletedBaskets = nextCounts.filter(count => count === b).length;

    sound.playPowerUp();
    setBasketCounts(nextCounts);
    setCelebratingBasket(basketIndex);
    triggerAppleBurst(basketIndex);
    setErrorBasket(null);
    window.setTimeout(() => setCelebratingBasket(current => (current === basketIndex ? null : current)), 350);

    if (nextCompletedBaskets === a) {
      setSpeedMultiplier(1);
      if (boostTimeoutRef.current !== null) {
        window.clearTimeout(boostTimeoutRef.current);
        boostTimeoutRef.current = null;
      }
      if (cooldownTimeoutRef.current !== null) {
        window.clearTimeout(cooldownTimeoutRef.current);
        cooldownTimeoutRef.current = null;
      }
      sound.playLevelUp();
      isOutsidePromptSpeakingRef.current = false;
      speak(buildMultiplicationResultSpeech(displayA, displayB, totalItems));
      return;
    }

    speakBasketLabel(basketIndex);
  };

  return (
    <div className="w-full rounded-[2rem] border border-cyan-100 bg-white p-4 shadow-[0_18px_40px_rgba(34,211,238,0.24)]">
      <div className="rounded-[1.6rem] border border-violet-200 bg-gradient-to-b from-violet-50 to-fuchsia-50 px-4 py-3 shadow-[0_8px_18px_rgba(124,58,237,0.10)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-fuchsia-700">Raccogli</p>
            <p className="text-xl font-black text-slate-800">
              {displayA} x {displayB} = {isCompleted ? totalItems : '?'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.7rem] border-2 border-cyan-300 bg-cyan-500 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
        <div
          ref={arenaRef}
          role="list"
          aria-label={`Arena con ${a} cestini mobili`}
          onClick={triggerArenaBoost}
          className={`relative ${ARENA_HEIGHT_CLASS} overflow-hidden rounded-[1.35rem] border border-cyan-200/70 bg-gradient-to-b from-sky-500 via-sky-600 to-cyan-700`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_40%)]" />
          <div className="pointer-events-none absolute inset-[10px] rounded-[1rem] border border-cyan-300/35" />
          <div className={`pointer-events-none absolute inset-0 bg-cyan-100/20 transition-opacity duration-200 ${arenaPulseActive ? 'opacity-100' : 'opacity-0'}`} />
          <AnimatePresence>
            {arenaRipples.map((ripple) => (
              <motion.span
                key={`arena-ripple-${ripple.id}`}
                initial={{ scale: 0.2, opacity: 0.75 }}
                animate={{ scale: 6.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="pointer-events-none absolute rounded-full border-2 border-cyan-100/90 bg-cyan-100/20"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: 28,
                  height: 28,
                  marginLeft: -14,
                  marginTop: -14,
                }}
              />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {appleBursts.map((burst) => (
              <motion.span
                key={`apple-burst-${burst.id}`}
                initial={{ opacity: 0, x: burst.startX, y: burst.startY, scale: 0.86 }}
                animate={{ opacity: 1, x: burst.endX, y: burst.endY, scale: 1.02 }}
                exit={{ opacity: 0, x: burst.endX, y: burst.endY + 8, scale: 0.82 }}
                transition={{ duration: 0.34, ease: 'easeInOut' }}
                className="pointer-events-none absolute z-30 -translate-x-1/2 text-2xl drop-shadow-lg"
                aria-hidden="true"
              >
                🍎
              </motion.span>
            ))}
          </AnimatePresence>

          {/* 🐝 Bee obstacles — unpredictabile in base alla difficolta */}
          {displayB >= BEE_START_FACTOR && !isCompleted && !isFailed && (
            beePositions.map((bee, i) => {
              return (
                <button
                  key={`bee-${displayB}-${i}`}
                  onClick={(e) => { e.stopPropagation(); handleBeeTap(); }}
                  className={`absolute z-20 cursor-pointer select-none text-3xl transition-transform ${beeHit ? 'scale-125' : ''}`}
                  style={{ top: `${Math.floor(bee.y)}px`, left: `${Math.floor(bee.x)}px` }}
                  aria-label="Calabrone: non toccare."
                >
                  🐝
                </button>
              );
            })
          )}

          {isFailed ? (
            <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[1.35rem] bg-black/40 p-4">
              <div className="w-full max-w-xs rounded-2xl border-2 border-rose-200 bg-white/95 px-5 py-4 text-center shadow-xl">
                <p className="mt-1 text-xs font-bold text-slate-700">Hai toccato il calabrone.</p>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setBeeDefeat(false);
                    setBeeHit(false);
                    setBasketCounts(createEmptyCounts(a));
                    setCelebratingBasket(null);
                    setErrorBasket(null);
                    setSpeedMultiplier(BOOST_MIN_MULTIPLIER);
                  }}
                  className="mt-3 w-full rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white shadow-md transition-colors hover:bg-rose-700 cursor-pointer"
                >
                  Riprova
                </button>
              </div>
            </div>
          ) : isCompleted ? (
            <div
              role="list"
              aria-label="Tutte le ceste completate"
              className="grid h-full w-full content-center justify-center overflow-hidden p-4"
              style={{
                gap: `${FINAL_BASKET_GAP}px`,
                gridTemplateColumns: `repeat(${finalBasketLayout.columns}, ${finalBasketLayout.itemSize}px)`,
                gridAutoRows: `${finalBasketLayout.itemSize}px`,
              }}
            >
              {Array.from({ length: a }).map((_, index) => (
                <div
                  key={`final-basket-${index}`}
                  role="listitem"
                  className="relative flex shrink-0 flex-col items-center justify-center border-2 border-emerald-300 bg-white shadow-[0_8px_16px_rgba(15,23,42,0.14)]"
                  style={{
                    width: `${finalBasketLayout.itemSize}px`,
                    height: `${finalBasketLayout.itemSize}px`,
                    borderRadius: `${Math.max(14, Math.floor(finalBasketLayout.itemSize * 0.26))}px`,
                  }}
                >
                  <span
                    className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full border border-white bg-emerald-500 font-black text-white shadow-md"
                    style={{
                      width: `${finalBasketLayout.checkSize}px`,
                      height: `${finalBasketLayout.checkSize}px`,
                      fontSize: `${Math.max(8, Math.floor(finalBasketLayout.checkSize * 0.55))}px`,
                    }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: `${finalBasketLayout.iconSize}px`, lineHeight: 1 }} aria-hidden="true">🧺</span>
                  <span
                    className="mt-1 font-black text-slate-700"
                    style={{ fontSize: `${finalBasketLayout.textSize}px`, lineHeight: 1.1 }}
                  >
                    {b}/{b}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            positions.map((position, index) => {
              const count = basketCounts[index] ?? 0;
              const isFull = count >= b;

              if (isFull) {
                return null;
              }

              return (
                <div
                  key={`basket-${index}`}
                  role="listitem"
                  className="absolute"
                  style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${BASKET_SIZE}px`,
                    height: `${BASKET_SIZE}px`,
                  }}
                >
                  <motion.button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleFillBasket(index);
                    }}
                    animate={celebratingBasket === index ? { scale: [1, 1.08, 1] } : undefined}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`relative flex h-full w-full flex-col items-center justify-center rounded-[1.35rem] border-2 transition-[transform,box-shadow,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 ${
                      errorBasket === index
                        ? 'border-rose-400 bg-white shadow-[0_8px_16px_rgba(15,23,42,0.16)]'
                        : celebratingBasket === index
                          ? 'border-emerald-400 bg-emerald-50 shadow-[0_0_0_5px_rgba(74,222,128,0.18),0_8px_16px_rgba(15,23,42,0.16)]'
                          : 'border-violet-100 bg-white shadow-[0_8px_16px_rgba(15,23,42,0.16)]'
                    }`}
                    aria-label={`Cesta ${index + 1}, ${count} mele su ${b}${isFull ? ', piena' : ''}`}
                  >
                    <span className="absolute -top-2 -right-2 inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-fuchsia-100 px-2 text-xs font-black text-violet-700 shadow-md">
                      {count}
                    </span>
                    <span className="text-3xl" aria-hidden="true">🧺</span>
                    <span className="mt-1 text-[11px] font-black text-slate-700">{count}/{b}</span>
                  </motion.button>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
