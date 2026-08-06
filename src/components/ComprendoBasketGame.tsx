import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';
import InteractionGuidanceHint from './InteractionGuidanceHint';

interface ComprendoBasketGameProps {
  a: number;
  b: number;
  itemEmoji: string;
  onCompletionChange?: (isCompleted: boolean) => void;
}

export interface ComprendoBasketGameHandle {
  triggerStarBonus: () => void;
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

interface PointerAttractor {
  x: number;
  y: number;
  activeUntil: number;
}

type HelperBonusKind = 'ladybug' | 'butterfly' | 'star';

interface HelperBonus {
  id: number;
  kind: HelperBonusKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expiresAt: number;
}

interface AppleBurst {
  id: number;
  x: number;
  y: number;
}

const BASKET_SIZE = 84;
const BEE_START_FACTOR = 4;
const BEE_SIZE = 52;
const BEE_IDLE_INNER_PADDING_RATIO = 0.3;
const BEE_IDLE_CENTER_PULL = 140;
const BEE_IDLE_EDGE_AVOIDANCE = 260;
const BEE_IDLE_EDGE_MARGIN = 56;
const ARENA_INNER_FRAME_INSET_PX = 10;
const BEE_QUIET_MARGIN_PX = 15;
const BEE_EDGE_DAMPING_BAND_PX = 14;
const BEE_EDGE_DAMPING_FACTOR = 0.78;
const INTERACTION_GUIDANCE_VISIBLE_MS = 5000;
const COMPRENDO_AUDIO_MESSAGES = {
  basketFull: 'Questa cesta e gia piena.',
  bee: 'Oh no! Hai toccato il calabrone.',
} as const;
const createEmptyCounts = (count: number) => Array.from({ length: count }, () => 0);
const FINAL_BASKET_MAX_SIZE = 68;
const FINAL_BASKET_MIN_SIZE = 42;
const FINAL_BASKET_GAP = 8;
const ARENA_HEIGHT_CLASS = 'h-64';
const POINTER_ATTRACTION_ACTIVE_MS = 3000;
const BASKET_SPEED_BOOST_BASE = 2.0;
const BASKET_SPEED_BOOST_PER_LEVEL = 1.0;
const BASKET_SPEED_BOOST_MAX = 10;
const BEE_POINTER_ATTRACTION_BASE = 280;
const BEE_POINTER_ATTRACTION_PER_LEVEL = 12;
const BEE_POINTER_SPEED_BOOST_BASE = 100;
const BEE_POINTER_SPEED_BOOST_PER_LEVEL = 14;
const HELPER_BONUS_VISIBLE_MS = 3000;
const HELPER_BONUS_RESPAWN_MIN_MS = 4000;
const HELPER_BONUS_RESPAWN_MAX_MS = 8000;
const HELPER_BONUS_SIZE = 50;
const HELPER_BONUS_EDGE_MARGIN = 16;
const HELPER_BONUS_KIND_WEIGHTS: Array<{ kind: HelperBonusKind; weight: number }> = [
  { kind: 'ladybug', weight: 0.62 },
  { kind: 'butterfly', weight: 0.26 },
  { kind: 'star', weight: 0.12 },
];
const HELPER_BONUS_EMOJIS: Record<HelperBonusKind, string> = {
  ladybug: '🐞',
  butterfly: '🦋',
  star: '⭐',
};
const HELPER_BONUS_SPEEDS: Record<HelperBonusKind, number> = {
  ladybug: 62,
  butterfly: 78,
  star: 92,
};
const HELPER_BONUS_LABELS: Record<HelperBonusKind, string> = {
  ladybug: 'Coccinella',
  butterfly: 'Farfalla',
  star: 'Stella',
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

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

const getBeeBounds = (maxX: number, maxY: number): {
   quietMinX: number;
   quietMaxX: number;
   quietMinY: number;
   quietMaxY: number;
   attractMinX: number;
   attractMaxX: number;
   attractMinY: number;
   attractMaxY: number;
 } => {
   const quietInsetX = ARENA_INNER_FRAME_INSET_PX + BEE_QUIET_MARGIN_PX;
   const quietInsetY = ARENA_INNER_FRAME_INSET_PX + BEE_QUIET_MARGIN_PX;
  const attractInsetLeft = quietInsetX;
  const attractInsetRight = quietInsetX;
  const attractInsetY = quietInsetY;

  const quietMinX = Math.min(quietInsetX, maxX);
  const quietMaxX = Math.max(quietMinX, maxX - quietInsetX);
  const quietMinY = Math.min(quietInsetY, maxY);
  const quietMaxY = Math.max(quietMinY, maxY - quietInsetY);
  const attractMinX = Math.min(attractInsetLeft, maxX);
  const attractMaxX = Math.max(attractMinX, maxX - attractInsetRight);
  const attractMinY = Math.min(attractInsetY, maxY);
  const attractMaxY = Math.max(attractMinY, maxY - attractInsetY);

  return {
    quietMinX,
    quietMaxX,
    quietMinY,
    quietMaxY,
    attractMinX,
    attractMaxX,
    attractMinY,
    attractMaxY,
  };
};

const createBeeParticles = (count: number, arena: ArenaSize, factor: number, reducedMotion: boolean): BeeParticle[] => {
   const maxX = Math.max(0, arena.width - BEE_SIZE);
   const maxY = Math.max(0, arena.height - BEE_SIZE);
   const { quietMinX, quietMaxX, quietMinY, quietMaxY } = getBeeBounds(maxX, maxY);
  const innerPaddingX = maxX * BEE_IDLE_INNER_PADDING_RATIO;
  const innerPaddingY = maxY * BEE_IDLE_INNER_PADDING_RATIO;
  const idleMinX = Math.max(quietMinX, innerPaddingX);
  const idleMaxX = Math.max(idleMinX, Math.min(quietMaxX, maxX - innerPaddingX));
  const idleMinY = Math.max(quietMinY, innerPaddingY);
  const idleMaxY = Math.max(idleMinY, Math.min(quietMaxY, maxY - innerPaddingY));
  const speedBase = 96 + (factor * 12);

  return Array.from({ length: count }, () => {
    const x = Math.floor(idleMinX + (Math.random() * Math.max(1, idleMaxX - idleMinX)));
    const y = Math.floor(idleMinY + (Math.random() * Math.max(1, idleMaxY - idleMinY)));
    if (reducedMotion) {
      return { x, y, vx: 0, vy: 0 };
    }

    const drift = speedBase;
    return {
      x,
      y,
      vx: (Math.random() > 0.5 ? 1 : -1) * drift,
      vy: (Math.random() > 0.5 ? 1 : -1) * (drift * 0.85),
    };
  });
};

const ComprendoBasketGame = forwardRef<ComprendoBasketGameHandle, ComprendoBasketGameProps>(function ComprendoBasketGame(
  { a: propA, b: propB, itemEmoji, onCompletionChange }: ComprendoBasketGameProps,
  ref,
) {
  const displayA = propA;
  const displayB = propB;
  const a = propB; // number of baskets
  const b = propA; // items per basket
  const { speak } = useVoice();
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<BasketParticle[]>([]);
  const frameRef = useRef<number | null>(null);
  const beeFrameRef = useRef<number | null>(null);
  const beeParticlesRef = useRef<BeeParticle[]>([]);
  const pointerAttractorRef = useRef<PointerAttractor | null>(null);
  const beeTapLockRef = useRef<number>(0);
  const lastBasketFillAtRef = useRef<number>(performance.now());
  const [arenaSize, setArenaSize] = useState<ArenaSize>({ width: 0, height: 0 });
  const [basketCounts, setBasketCounts] = useState<number[]>(() => createEmptyCounts(a));
  const [positions, setPositions] = useState<BasketParticle[]>([]);
  const [celebratingBasket, setCelebratingBasket] = useState<number | null>(null);
  const [errorBasket, setErrorBasket] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [beePositions, setBeePositions] = useState<BeeParticle[]>([]);
  const [beeHit, setBeeHit] = useState<boolean>(false);
  const [beeDefeat, setBeeDefeat] = useState<boolean>(false);
  const [helperBonuses, setHelperBonuses] = useState<HelperBonus[]>([]);
  const [appleBursts, setAppleBursts] = useState<AppleBurst[]>([]);
  const [basketGuidanceSeen, setBasketGuidanceSeen] = useState<boolean>(false);
  const [beeGuidanceSeen, setBeeGuidanceSeen] = useState<boolean>(false);
  const basketGuidanceTimeoutRef = useRef<number | null>(null);
  const beeGuidanceTimeoutRef = useRef<number | null>(null);
  const helperBonusSpawnTimeoutRef = useRef<number | null>(null);
  const helperBonusExpiryTimeoutRef = useRef<number | null>(null);
  const helperBonusFrameRef = useRef<number | null>(null);
  const helperBonusIdRef = useRef<number>(0);
  const appleBurstIdRef = useRef<number>(0);

  const totalItems = a * b;
  const filledItems = basketCounts.reduce((sum, count) => sum + Math.min(b, Math.max(0, count)), 0);
  const completedBaskets = basketCounts.filter(count => count === b).length;
  const totalProgressPercent = totalItems === 0 ? 0 : (filledItems / totalItems) * 100;
  const compactStructureLabel = `${displayA}x${displayB} -> ${a} ceste, ${b} mele`;
  const beeTouchStatusLabel = 'Toccare il calabrone fa perdere la round.';
  const isCompleted = completedBaskets === a;
  const isFailed = beeDefeat;
  const firstIncompleteBasketIndex = basketCounts.findIndex(count => count < b);
  const showBasketGuidance = !basketGuidanceSeen && !isCompleted && !isFailed && firstIncompleteBasketIndex >= 0;
  const showBeeGuidance = !beeGuidanceSeen && !isCompleted && !isFailed && displayB >= BEE_START_FACTOR && beePositions.length > 0;
  const basketGuidanceAnchor = showBasketGuidance && firstIncompleteBasketIndex >= 0
    ? positions[firstIncompleteBasketIndex] ?? null
    : null;
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

  const getRemainingBasketIndexes = (basketCountsSnapshot: number[]) => basketCountsSnapshot.reduce<number[]>((result, count, index) => {
    if (count < b) result.push(index);
    return result;
  }, []);

  const getRandomizedBasketTargets = (basketCountsSnapshot: number[], targetCount: number) => {
    const remaining = getRemainingBasketIndexes(basketCountsSnapshot);
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(1, Math.min(shuffled.length, targetCount)));
  };

  const chooseHelperBonusKind = (): HelperBonusKind => {
    const roll = Math.random();
    let cumulative = 0;
    for (const entry of HELPER_BONUS_KIND_WEIGHTS) {
      cumulative += entry.weight;
      if (roll <= cumulative) return entry.kind;
    }
    return 'star';
  };

  const createHelperBonus = (kind: HelperBonusKind): HelperBonus => {
    const maxX = Math.max(0, arenaSize.width - HELPER_BONUS_SIZE);
    const maxY = Math.max(0, arenaSize.height - HELPER_BONUS_SIZE);
    const x = clamp(
      HELPER_BONUS_EDGE_MARGIN + (Math.random() * Math.max(1, maxX - (HELPER_BONUS_EDGE_MARGIN * 2))),
      0,
      maxX,
    );
    const y = clamp(
      HELPER_BONUS_EDGE_MARGIN + (Math.random() * Math.max(1, maxY - (HELPER_BONUS_EDGE_MARGIN * 2))),
      0,
      maxY,
    );
    const speed = HELPER_BONUS_SPEEDS[kind];

    return {
      id: ++helperBonusIdRef.current,
      kind,
      x,
      y,
      vx: (Math.random() > 0.5 ? 1 : -1) * speed,
      vy: (Math.random() > 0.5 ? 1 : -1) * (speed * 0.78),
      expiresAt: performance.now() + HELPER_BONUS_VISIBLE_MS,
    };
  };

  const clearHelperBonusTimers = () => {
    if (helperBonusSpawnTimeoutRef.current !== null) {
      window.clearTimeout(helperBonusSpawnTimeoutRef.current);
      helperBonusSpawnTimeoutRef.current = null;
    }
    if (helperBonusExpiryTimeoutRef.current !== null) {
      window.clearTimeout(helperBonusExpiryTimeoutRef.current);
      helperBonusExpiryTimeoutRef.current = null;
    }
  };

  const removeHelperBonus = (bonusId: number) => {
    clearHelperBonusTimers();
    setHelperBonuses(current => current.filter(bonus => bonus.id !== bonusId));
  };

  const playHelperBonusTapSound = (kind: HelperBonusKind) => {
    if (kind === 'ladybug') {
      sound.playLadybugSuccess();
      return;
    }
    if (kind === 'butterfly') {
      sound.playButterflySuccess();
      return;
    }
    sound.playStarSuccess();
  };

  const spawnAppleBurst = (x: number, y: number) => {
    const burstId = ++appleBurstIdRef.current;
    setAppleBursts(current => [...current, { id: burstId, x, y }]);
    window.setTimeout(() => {
      setAppleBursts(current => current.filter(burst => burst.id !== burstId));
    }, 700);
  };

  const applyHelperBonus = (bonus: HelperBonus) => {
    const remaining = getRemainingBasketIndexes(basketCounts);
    if (remaining.length === 0) {
      removeHelperBonus(bonus.id);
      return;
    }

    const targetCount = bonus.kind === 'ladybug'
      ? 1
      : bonus.kind === 'butterfly'
        ? Math.max(1, Math.ceil(remaining.length / 2))
        : remaining.length;
    const targets = getRandomizedBasketTargets(basketCounts, targetCount);
    if (targets.length === 0) {
      removeHelperBonus(bonus.id);
      return;
    }

    const nextCounts = [...basketCounts];
    targets.forEach((basketIndex) => {
      nextCounts[basketIndex] = b;
    });

    spawnAppleBurst(bonus.x + (HELPER_BONUS_SIZE / 2), bonus.y + (HELPER_BONUS_SIZE / 2));
    setBasketCounts(nextCounts);
    setCelebratingBasket(targets[0]);
    window.setTimeout(() => {
      setCelebratingBasket(current => (current === targets[0] ? null : current));
    }, 350);

    if (nextCounts.every(count => count >= b)) {
      sound.playLevelUp();
      speak(`Mela ${totalItems} di ${totalItems}. ${buildMultiplicationResultSpeech(displayA, displayB, totalItems)}`);
    } else {
      speakAppleProgress(nextCounts.reduce((sum, count) => sum + Math.min(b, Math.max(0, count)), 0));
    }

    removeHelperBonus(bonus.id);
  };

  useImperativeHandle(ref, () => ({
    triggerStarBonus: () => {
      if (isCompleted || isFailed) return;

      const centerX = Math.max(0, (arenaSize.width - HELPER_BONUS_SIZE) / 2);
      const centerY = Math.max(0, (arenaSize.height - HELPER_BONUS_SIZE) / 2);
      const fallbackBonus: HelperBonus = {
        id: -1,
        kind: 'star',
        x: helperBonuses[0]?.x ?? centerX,
        y: helperBonuses[0]?.y ?? centerY,
        vx: 0,
        vy: 0,
        expiresAt: performance.now() + HELPER_BONUS_VISIBLE_MS,
      };

      clearHelperBonusTimers();
      setHelperBonuses([]);
      applyHelperBonus(fallbackBonus);
    },
  }), [arenaSize.height, arenaSize.width, helperBonuses, isCompleted, isFailed, applyHelperBonus]);
  useEffect(() => {
    setBasketCounts(createEmptyCounts(a));
    setCelebratingBasket(null);
    setErrorBasket(null);
    setBeeDefeat(false);
    setBeeHit(false);
    setBasketGuidanceSeen(false);
    setBeeGuidanceSeen(false);
    if (basketGuidanceTimeoutRef.current !== null) {
      window.clearTimeout(basketGuidanceTimeoutRef.current);
      basketGuidanceTimeoutRef.current = null;
    }
    if (beeGuidanceTimeoutRef.current !== null) {
      window.clearTimeout(beeGuidanceTimeoutRef.current);
      beeGuidanceTimeoutRef.current = null;
    }
    lastBasketFillAtRef.current = performance.now();
    beeTapLockRef.current = 0;
    pointerAttractorRef.current = null;
    setHelperBonuses([]);
    setAppleBursts([]);
    if (helperBonusSpawnTimeoutRef.current !== null) {
      window.clearTimeout(helperBonusSpawnTimeoutRef.current);
      helperBonusSpawnTimeoutRef.current = null;
    }
    if (helperBonusExpiryTimeoutRef.current !== null) {
      window.clearTimeout(helperBonusExpiryTimeoutRef.current);
      helperBonusExpiryTimeoutRef.current = null;
    }
    if (helperBonusFrameRef.current !== null) {
      window.cancelAnimationFrame(helperBonusFrameRef.current);
      helperBonusFrameRef.current = null;
    }
  }, [a, b]);

  useEffect(() => {
    return () => {
      beeTapLockRef.current = 0;
      if (basketGuidanceTimeoutRef.current !== null) {
        window.clearTimeout(basketGuidanceTimeoutRef.current);
      }
      if (beeGuidanceTimeoutRef.current !== null) {
        window.clearTimeout(beeGuidanceTimeoutRef.current);
      }
      if (beeFrameRef.current !== null) {
        window.cancelAnimationFrame(beeFrameRef.current);
      }
      if (helperBonusSpawnTimeoutRef.current !== null) {
        window.clearTimeout(helperBonusSpawnTimeoutRef.current);
      }
      if (helperBonusExpiryTimeoutRef.current !== null) {
        window.clearTimeout(helperBonusExpiryTimeoutRef.current);
      }
      if (helperBonusFrameRef.current !== null) {
        window.cancelAnimationFrame(helperBonusFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showBasketGuidance || basketGuidanceTimeoutRef.current !== null) return;
    basketGuidanceTimeoutRef.current = window.setTimeout(() => {
      setBasketGuidanceSeen(true);
      basketGuidanceTimeoutRef.current = null;
    }, INTERACTION_GUIDANCE_VISIBLE_MS);
  }, [showBasketGuidance]);

  useEffect(() => {
    if (!showBeeGuidance || beeGuidanceTimeoutRef.current !== null) return;
    beeGuidanceTimeoutRef.current = window.setTimeout(() => {
      setBeeGuidanceSeen(true);
      beeGuidanceTimeoutRef.current = null;
    }, INTERACTION_GUIDANCE_VISIBLE_MS);
  }, [showBeeGuidance]);

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
      const pointerAttractor = pointerAttractorRef.current;
      const pointerBoost = pointerAttractor
        ? clamp((pointerAttractor.activeUntil - time) / POINTER_ATTRACTION_ACTIVE_MS, 0, 1)
        : 0;
      const basketSpeedBoostStrength = clamp(
        BASKET_SPEED_BOOST_BASE + (Math.max(0, displayB - 2) * BASKET_SPEED_BOOST_PER_LEVEL),
        BASKET_SPEED_BOOST_BASE,
        BASKET_SPEED_BOOST_MAX,
      );
      const basketSpeedMultiplier = 1 + (pointerBoost * basketSpeedBoostStrength);

      const maxX = Math.max(0, arenaSize.width - BASKET_SIZE);
      const maxY = Math.max(0, arenaSize.height - BASKET_SIZE);

      const nextParticles = particlesRef.current.map((particle, index) => {
        if (basketCounts[index] >= b) {
          return particle;
        }

        let nextVx = particle.vx;
        let nextVy = particle.vy;

        // Speed boost keeps original trajectory; it only scales movement for a short time.
        let nextX = particle.x + (nextVx * basketSpeedMultiplier * deltaSeconds);
        let nextY = particle.y + (nextVy * basketSpeedMultiplier * deltaSeconds);

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
  }, [a, arenaSize, basketCounts, b, displayB, isCompleted, isFailed, positions.length, prefersReducedMotion]);

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
    const agility = 0.72 + (displayB * 0.06);
    const beePointerAttraction = BEE_POINTER_ATTRACTION_BASE + (Math.max(0, displayB - 2) * BEE_POINTER_ATTRACTION_PER_LEVEL);
    const beePointerSpeedBoost = BEE_POINTER_SPEED_BOOST_BASE + (Math.max(0, displayB - 2) * BEE_POINTER_SPEED_BOOST_PER_LEVEL);
    let previousTime = performance.now();

    const animateBees = (time: number) => {
      const deltaSeconds = Math.min(0.04, (time - previousTime) / 1000);
      previousTime = time;
      const pointerAttractor = pointerAttractorRef.current;
      const pointerBoost = pointerAttractor
        ? clamp((pointerAttractor.activeUntil - time) / POINTER_ATTRACTION_ACTIVE_MS, 0, 1)
        : 0;
      const maxX = Math.max(0, arenaSize.width - BEE_SIZE);
       const maxY = Math.max(0, arenaSize.height - BEE_SIZE);

        // Dynamically calculate bounds using tunable parameters
       const quietInsetX = ARENA_INNER_FRAME_INSET_PX + BEE_QUIET_MARGIN_PX;
       const quietInsetY = ARENA_INNER_FRAME_INSET_PX + BEE_QUIET_MARGIN_PX;
       const attractInsetLeft = quietInsetX;
       const attractInsetRight = quietInsetX;
       const attractInsetY = quietInsetY;

       const quietMinX = Math.min(quietInsetX, maxX);
       const quietMaxX = Math.max(quietMinX, maxX - quietInsetX);
       const quietMinY = Math.min(quietInsetY, maxY);
       const quietMaxY = Math.max(quietMinY, maxY - quietInsetY);
       const attractMinX = Math.min(attractInsetLeft, maxX);
       const attractMaxX = Math.max(attractMinX, maxX - attractInsetRight);
       const attractMinY = Math.min(attractInsetY, maxY);
       const attractMaxY = Math.max(attractMinY, maxY - attractInsetY);
      const centerX = maxX / 2;
      const centerY = maxY / 2;
      const boundsMinX = quietMinX;
      const boundsMaxX = quietMaxX;
      const boundsMinY = quietMinY;
      const boundsMaxY = quietMaxY;

      const nextBeeParticles = beeParticlesRef.current.map((bee) => {
        let ax = (Math.random() - 0.5) * jitterStrength * agility;
        let ay = (Math.random() - 0.5) * jitterStrength * agility;
        const centerDx = centerX - bee.x;
        const centerDy = centerY - bee.y;
        const centerDist = Math.hypot(centerDx, centerDy);
        if (centerDist > 1) {
           const centering = (BEE_IDLE_CENTER_PULL / Math.max(64, centerDist)) * agility;
           ax += (centerDx / centerDist) * centering;
           ay += (centerDy / centerDist) * centering;
         }

         // Keep idle movement central and avoid borders at all times.
         if (bee.x < quietMinX + BEE_IDLE_EDGE_MARGIN) {
           ax += BEE_IDLE_EDGE_AVOIDANCE * agility;
         } else if (bee.x > quietMaxX - BEE_IDLE_EDGE_MARGIN) {
           ax -= BEE_IDLE_EDGE_AVOIDANCE * agility;
         }

         if (bee.y < quietMinY + BEE_IDLE_EDGE_MARGIN) {
           ay += BEE_IDLE_EDGE_AVOIDANCE * agility;
         } else if (bee.y > quietMaxY - BEE_IDLE_EDGE_MARGIN) {
           ay -= BEE_IDLE_EDGE_AVOIDANCE * agility;
         }

        if (pointerBoost > 0 && pointerAttractor) {
          const targetX = clamp(pointerAttractor.x, attractMinX, attractMaxX);
          const targetY = clamp(pointerAttractor.y, attractMinY, attractMaxY);
          const pointerDx = targetX - (bee.x + (BEE_SIZE / 2));
          const pointerDy = targetY - (bee.y + (BEE_SIZE / 2));
          const pointerDistance = Math.hypot(pointerDx, pointerDy);

          if (pointerDistance > 1) {
            const pull = beePointerAttraction * pointerBoost * agility;
            ax += (pointerDx / pointerDistance) * pull;
            ay += (pointerDy / pointerDistance) * pull;
          }
        }

        let nextVx = bee.vx + (ax * deltaSeconds);
        let nextVy = bee.vy + (ay * deltaSeconds);
        const speed = Math.hypot(nextVx, nextVy);
        const liveMaxBeeSpeed = maxBeeSpeed + (beePointerSpeedBoost * pointerBoost);
        if (speed > liveMaxBeeSpeed) {
          const scale = liveMaxBeeSpeed / speed;
          nextVx *= scale;
          nextVy *= scale;
        }

        let nextX = bee.x + (nextVx * deltaSeconds);
        let nextY = bee.y + (nextVy * deltaSeconds);

        if ((nextX - quietMinX) < BEE_EDGE_DAMPING_BAND_PX && nextVx < 0) {
          nextVx *= BEE_EDGE_DAMPING_FACTOR;
        } else if ((quietMaxX - nextX) < BEE_EDGE_DAMPING_BAND_PX && nextVx > 0) {
          nextVx *= BEE_EDGE_DAMPING_FACTOR;
        }

        if ((nextY - quietMinY) < BEE_EDGE_DAMPING_BAND_PX && nextVy < 0) {
          nextVy *= BEE_EDGE_DAMPING_FACTOR;
        } else if ((quietMaxY - nextY) < BEE_EDGE_DAMPING_BAND_PX && nextVy > 0) {
          nextVy *= BEE_EDGE_DAMPING_FACTOR;
        }

        if (nextX <= boundsMinX) {
          nextX = boundsMinX;
          nextVx = Math.abs(nextVx);
        } else if (nextX >= boundsMaxX) {
          nextX = boundsMaxX;
          nextVx = -Math.abs(nextVx);
        }

        if (nextY <= boundsMinY) {
          nextY = boundsMinY;
          nextVy = Math.abs(nextVy);
        } else if (nextY >= boundsMaxY) {
          nextY = boundsMaxY;
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

  useEffect(() => {
    if (isCompleted || isFailed || arenaSize.width <= 0 || arenaSize.height <= 0) {
      clearHelperBonusTimers();
      setHelperBonuses([]);
      return;
    }

    if (helperBonuses.length > 0) {
      return;
    }

    const delay = HELPER_BONUS_RESPAWN_MIN_MS + Math.floor(Math.random() * (HELPER_BONUS_RESPAWN_MAX_MS - HELPER_BONUS_RESPAWN_MIN_MS));
    helperBonusSpawnTimeoutRef.current = window.setTimeout(() => {
      helperBonusSpawnTimeoutRef.current = null;
      if (isCompleted || isFailed) return;
      const bonus = createHelperBonus(chooseHelperBonusKind());
      setHelperBonuses([bonus]);
      helperBonusExpiryTimeoutRef.current = window.setTimeout(() => {
        setHelperBonuses(current => current.filter(entry => entry.id !== bonus.id));
        helperBonusExpiryTimeoutRef.current = null;
      }, HELPER_BONUS_VISIBLE_MS);
    }, delay);

    return () => {
      if (helperBonusSpawnTimeoutRef.current !== null) {
        window.clearTimeout(helperBonusSpawnTimeoutRef.current);
        helperBonusSpawnTimeoutRef.current = null;
      }
    };
  }, [arenaSize.height, arenaSize.width, helperBonuses.length, isCompleted, isFailed]);

  useEffect(() => {
    if (helperBonuses.length === 0) {
      if (helperBonusFrameRef.current !== null) {
        window.cancelAnimationFrame(helperBonusFrameRef.current);
        helperBonusFrameRef.current = null;
      }
      return;
    }

    let previousTime = performance.now();
    const animateHelperBonuses = (time: number) => {
      const deltaSeconds = Math.min(0.04, (time - previousTime) / 1000);
      previousTime = time;
      const maxX = Math.max(0, arenaSize.width - HELPER_BONUS_SIZE);
      const maxY = Math.max(0, arenaSize.height - HELPER_BONUS_SIZE);

      setHelperBonuses(current => current.map((bonus) => {
        let nextX = bonus.x + (bonus.vx * deltaSeconds);
        let nextY = bonus.y + (bonus.vy * deltaSeconds);
        let nextVx = bonus.vx;
        let nextVy = bonus.vy;

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

        return { ...bonus, x: nextX, y: nextY, vx: nextVx, vy: nextVy };
      }));

      helperBonusFrameRef.current = window.requestAnimationFrame(animateHelperBonuses);
    };

    helperBonusFrameRef.current = window.requestAnimationFrame(animateHelperBonuses);

    return () => {
      if (helperBonusFrameRef.current !== null) {
        window.cancelAnimationFrame(helperBonusFrameRef.current);
        helperBonusFrameRef.current = null;
      }
    };
  }, [arenaSize.height, arenaSize.width, helperBonuses.length]);

  const registerArenaPointerAttraction = (clientX: number, clientY: number) => {
    const arena = arenaRef.current;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const currentWidth = arenaSize.width > 0 ? arenaSize.width : rect.width;
    const currentHeight = arenaSize.height > 0 ? arenaSize.height : rect.height;
    pointerAttractorRef.current = {
      x: clamp(clientX - rect.left, 0, Math.max(0, currentWidth)),
      y: clamp(clientY - rect.top, 0, Math.max(0, currentHeight)),
      activeUntil: performance.now() + POINTER_ATTRACTION_ACTIVE_MS,
    };
  };

  const speakAppleProgress = (nextFilledItems: number) => {
    speak(`Mela ${nextFilledItems} di ${totalItems}`);
  };

  const getBeeCount = (factor: number): number => {
    if (factor >= 8) return 3;
    if (factor >= 6) return 2;
    return 1;
  };

  const handleBeeTap = () => {
    setBeeGuidanceSeen(true);
    if (beeGuidanceTimeoutRef.current !== null) {
      window.clearTimeout(beeGuidanceTimeoutRef.current);
      beeGuidanceTimeoutRef.current = null;
    }
    const now = performance.now();
    if (isCompleted || isFailed || beeHit || (now - beeTapLockRef.current) < 650) return;
    beeTapLockRef.current = now;

    setBeeHit(true);
    sound.playBeeFailure();
    setBeeDefeat(true);
    speak(COMPRENDO_AUDIO_MESSAGES.bee);

    window.setTimeout(() => setBeeHit(false), 600);
  };

  const handleFillBasket = (basketIndex: number) => {
    if (isFailed) return;
    setBasketGuidanceSeen(true);
    if (basketGuidanceTimeoutRef.current !== null) {
      window.clearTimeout(basketGuidanceTimeoutRef.current);
      basketGuidanceTimeoutRef.current = null;
    }
    const currentBasketCount = basketCounts[basketIndex];

    if (currentBasketCount >= b) {
      sound.playError();
      setErrorBasket(basketIndex);
      window.setTimeout(() => setErrorBasket(current => (current === basketIndex ? null : current)), 350);
      speak(COMPRENDO_AUDIO_MESSAGES.basketFull);
      return;
    }

    const nextCounts = [...basketCounts];
    nextCounts[basketIndex] = currentBasketCount + 1;
    const nextFilledItems = nextCounts.reduce((sum, count) => sum + Math.min(b, Math.max(0, count)), 0);
    const nextCompletedBaskets = nextCounts.filter(count => count === b).length;

    sound.playPowerUp();
    lastBasketFillAtRef.current = performance.now();
    setBasketCounts(nextCounts);
    setCelebratingBasket(basketIndex);
    setErrorBasket(null);
    window.setTimeout(() => setCelebratingBasket(current => (current === basketIndex ? null : current)), 350);

    if (nextCompletedBaskets === a) {
      sound.playLevelUp();
      speak(`Mela ${nextFilledItems} di ${totalItems}. ${buildMultiplicationResultSpeech(displayA, displayB, totalItems)}`);
      return;
    }

    speakAppleProgress(nextFilledItems);
  };

  return (
    <div className="w-full rounded-[2rem] border border-cyan-100 bg-white p-4 shadow-[0_18px_40px_rgba(34,211,238,0.24)]">
      <div className="rounded-[1.6rem] border border-violet-200 bg-gradient-to-b from-violet-50 to-fuchsia-50 px-4 py-3 shadow-[0_8px_18px_rgba(124,58,237,0.10)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-fuchsia-700">Raccogli {itemEmoji}</p>
            <p className="text-xl font-black text-slate-800">
              {displayA} x {displayB} = {isCompleted ? totalItems : '?'}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-violet-200/80 bg-white/80 px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Progresso</p>
            <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-black text-violet-700">
              {compactStructureLabel}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`Progresso mele inserite: ${filledItems} su ${totalItems}`}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, totalItems)}
            aria-valuenow={filledItems}
            className="h-3 overflow-hidden rounded-full border border-violet-200 bg-violet-100"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-500 to-cyan-400 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, totalProgressPercent))}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold text-slate-700">
              Mele: {filledItems}/{totalItems} ({Math.round(totalProgressPercent)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.7rem] border-2 border-cyan-300 bg-cyan-500 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
        <div
          ref={arenaRef}
          role="list"
          aria-label={`Arena con ${a} cestini mobili`}
          className={`relative ${ARENA_HEIGHT_CLASS} overflow-hidden rounded-[1.35rem] border border-cyan-200/70 bg-gradient-to-b from-sky-500 via-sky-600 to-cyan-700`}
          onPointerDown={(event) => {
            if (event.currentTarget !== event.target) return;
            registerArenaPointerAttraction(event.clientX, event.clientY);
          }}
        >
          {basketGuidanceAnchor && (
            <div
              className="pointer-events-none absolute z-[70]"
              style={{
                left: `${basketGuidanceAnchor.x}px`,
                top: `${basketGuidanceAnchor.y}px`,
              }}
            >
              <InteractionGuidanceHint kind="touch" reducedMotion={prefersReducedMotion} />
            </div>
          )}

          {appleBursts.map((burst) => {
            const burstSprites = [
              { x: -16, y: -4 },
              { x: 12, y: -18 },
              { x: 20, y: 12 },
              { x: -4, y: 20 },
              { x: -22, y: 14 },
              { x: 0, y: -24 },
              { x: 24, y: -2 },
              { x: -10, y: -28 },
            ];

            return (
              <div
                key={`apple-burst-${burst.id}`}
                className="pointer-events-none absolute z-[75]"
                style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
                aria-hidden="true"
              >
                {burstSprites.map((sprite, index) => (
                  <motion.span
                    key={`${burst.id}-${index}`}
                    initial={{ opacity: 0, scale: 0.4, y: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.4, 1.05, 0.85], x: sprite.x, y: sprite.y }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="absolute text-2xl drop-shadow-md"
                    style={{ left: 0, top: 0 }}
                  >
                    🍎
                  </motion.span>
                ))}
              </div>
            );
          })}

          {helperBonuses.map((bonus) => (
            <motion.button
              key={`helper-bonus-${bonus.id}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                playHelperBonusTapSound(bonus.kind);
                applyHelperBonus(bonus);
              }}
              animate={prefersReducedMotion ? undefined : { y: [0, -6, 0] }}
              transition={prefersReducedMotion ? undefined : { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute z-[74] inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border-2 border-white bg-white/95 text-[26px] shadow-[0_10px_18px_rgba(15,23,42,0.22)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/75 cursor-pointer"
              style={{ left: `${bonus.x}px`, top: `${bonus.y}px` }}
              aria-label={`${HELPER_BONUS_LABELS[bonus.kind]}: tocca per attivare il bonus`}
              title={`${HELPER_BONUS_LABELS[bonus.kind]}: tocca per attivare il bonus`}
            >
              <span aria-hidden="true">{HELPER_BONUS_EMOJIS[bonus.kind]}</span>
            </motion.button>
          ))}

          {/* 🐝 Bee obstacles — devono stare sopra la coccinella */}
          {displayB >= BEE_START_FACTOR && !isCompleted && !isFailed && (
            beePositions.map((bee, i) => {
               return (
                 <div
                   key={`bee-${displayB}-${i}`}
                   className="absolute"
                   style={{ top: `${Math.floor(bee.y)}px`, left: `${Math.floor(bee.x)}px`, width: '52px', height: '52px' }}
                 >
                   <button
                     type="button"
                     onClick={(e) => { e.stopPropagation(); handleBeeTap(); }}
                     className="relative inline-flex h-full w-full items-center justify-center rounded-full cursor-pointer select-none transition-transform z-30"
                     aria-label={`Calabrone: non toccare. ${beeTouchStatusLabel}`}
                   >
                     {i === 0 && showBeeGuidance && (
                       <div className="absolute">
                         <InteractionGuidanceHint kind="avoid" reducedMotion={prefersReducedMotion} />
                       </div>
                     )}
                     <span className="inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[26px] leading-none" aria-hidden="true">
                       🐝
                     </span>
                   </button>
                 </div>
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
                    lastBasketFillAtRef.current = performance.now();
                    setBasketCounts(createEmptyCounts(a));
                    setCelebratingBasket(null);
                    setErrorBasket(null);
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
});

ComprendoBasketGame.displayName = 'ComprendoBasketGame';

export default ComprendoBasketGame;

