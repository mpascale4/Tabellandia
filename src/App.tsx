/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from './types';
import { WORLDS_DATA, AVATARS } from './data';
import { getTableIcon, withTableIcon } from './utils/tableLabels';
import { getStoryEntriesForTable } from './utils/storyMarkdown';
import { sound } from './components/SoundManager';
import FireworksOverlay from './components/FireworksOverlay';
import ParentDashboard from './components/ParentDashboard';
import WorldDetail from './components/WorldDetail';
import TrainingHub from './components/TrainingHub';
import FontSizeControl from './components/FontSizeControl';
import VoiceToggle from './components/VoiceToggle';
import RewardsTutorial from './components/RewardsTutorial';
import DigitsGuideModal from './components/DigitsGuideModal';
import DigitsMatchingGameModal from './components/DigitsMatchingGameModal';
import CurrencyInfoModal from './components/CurrencyInfoModal';
import { DIGITS_INFO } from './data/digitsData';
import NumericKeypad from './components/NumericKeypad';
import ActionGrid from './components/layout/ActionGrid';
import ResponsiveGrid from './components/layout/ResponsiveGrid';
import SectionHeader from './components/layout/SectionHeader';
import SurfaceCard from './components/layout/SurfaceCard';
import { Settings, User, Volume2, Smartphone, RefreshCw, Music2, X, Coins, Droplets } from 'lucide-react';

const LOCAL_STORAGE_KEY = "tabellandia_save_data_v1";
const PROFILE_STORE_KEY = "tabellandia_profile_store_v1";
const AUDIO_SETTINGS_KEY = "tabellandia_audio_settings_v1";
const PARENT_PIN_DEFAULT = '1111';
const PROFILE_PANEL_VISIBLE_KEY = "tabellandia_profile_panel_visible_v1";
const HEADER_PINNED_KEY = "tabellandia_header_pinned_v1";
const HEADER_REVEAL_MOUSE_ZONE_PX = 24;
const HEADER_REVEAL_TOUCH_ZONE_PX = 12;
const PROFILE_RESTORE_WINDOW_DAYS = 30;
const PROFILE_RESTORE_WINDOW_MS = PROFILE_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const DIGIT_META_MAP = DIGITS_INFO.reduce<Record<number, { label: string; emoji: string }>>((acc, info) => {
  acc[info.digit] = { label: info.imageLabel, emoji: info.emoji };
  return acc;
}, {});
const DIGIT_LABEL_MAP = Object.fromEntries(
  Object.entries(DIGIT_META_MAP).map(([digit, meta]) => [Number(digit), meta.label])
) as Record<number, string>;

const getMnemonicLabelForNumber = (value: number) => {
  const digits = Math.abs(value).toString().split('').map(Number);
  return digits.map((digit) => `${digit} ${DIGIT_LABEL_MAP[digit] || digit.toString()}`).join(' + ');
};

const STORY_SUBJECT_WITH_EMOJI_PATTERN = "([A-Za-zÀ-ÿ'’]+(?:\\s+[A-Za-zÀ-ÿ'’]+){0,4})\\s*\\(([^)]+)\\)";
const SUBJECT_LINKING_WORDS = new Set([
  'il', 'lo', 'la', 'l', 'un', 'uno', 'una',
  'altro', 'altra', 'altri', 'altre',
]);
const NON_EMOJI_PARENTHESIS_TOKENS = new Set(['orion', 'lina', 'bobo']);
const STORY_HIGHLIGHT_BASE_CLASS = "mx-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-black leading-none text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1 cursor-pointer";
const STORY_HIGHLIGHT_COLOR_BY_KEY: Record<string, string> = {
  cigno: 'border border-blue-700 bg-blue-600 focus-visible:outline-blue-700',
  piccone: 'border border-slate-700 bg-slate-600 focus-visible:outline-slate-700',
  moneta: 'border border-amber-700 bg-amber-600 focus-visible:outline-amber-700',
  sedia: 'border border-violet-700 bg-violet-600 focus-visible:outline-violet-700',
  serpente: 'border border-emerald-700 bg-emerald-600 focus-visible:outline-emerald-700',
  chiocciola: 'border border-rose-700 bg-rose-600 focus-visible:outline-rose-700',
  fulmine: 'border border-indigo-700 bg-indigo-600 focus-visible:outline-indigo-700',
  infinito: 'border border-fuchsia-700 bg-fuchsia-600 focus-visible:outline-fuchsia-700',
  palloncino: 'border border-red-700 bg-red-600 focus-visible:outline-red-700',
  uovo: 'border border-cyan-700 bg-cyan-600 focus-visible:outline-cyan-700',
};
const STORY_HIGHLIGHT_FALLBACK_CLASS = 'border border-lime-500 bg-lime-500 focus-visible:outline-lime-600';

const getDigitsFromNumber = (value: number) => Math.abs(value).toString().split('').map(Number);

const containsEmoji = (value: string) => /\p{Extended_Pictographic}/u.test(value);
const startsWithUppercase = (word: string) => /^[A-ZÀ-Ý]/.test(word);
const cleanApostrophes = (word: string) => word.replace(/[’']/g, '').toLowerCase();

const normalizeStorySubject = (rawSubject: string) => {
  const words = rawSubject.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return rawSubject.trim();

  let start = words.length - 1;
  const includePreviousWord = (index: number) => {
    if (index < 0) return false;
    const candidate = words[index];
    return startsWithUppercase(candidate) || SUBJECT_LINKING_WORDS.has(cleanApostrophes(candidate));
  };

  if (includePreviousWord(start - 1)) start -= 1;
  if (includePreviousWord(start - 1) && startsWithUppercase(words[start])) start -= 1;
  if (
    start > 0 &&
    SUBJECT_LINKING_WORDS.has(cleanApostrophes(words[start - 1])) &&
    startsWithUppercase(words[start])
  ) {
    start -= 1;
  }

  return words.slice(start).join(' ');
};

const getStoryHighlightKey = (subject: string) => {
  const normalized = cleanApostrophes(subject);
  if (normalized.includes('cigno')) return 'cigno';
  if (normalized.includes('piccone')) return 'piccone';
  if (normalized.includes('moneta')) return 'moneta';
  if (normalized.includes('sedia')) return 'sedia';
  if (normalized.includes('serpente')) return 'serpente';
  if (normalized.includes('chiocciola')) return 'chiocciola';
  if (normalized.includes('fulmine')) return 'fulmine';
  if (normalized.includes('infinito')) return 'infinito';
  if (normalized.includes('palloncino')) return 'palloncino';
  if (normalized.includes('uovo')) return 'uovo';
  return null;
};

const getStoryHighlightClass = (subject: string) => {
  const key = getStoryHighlightKey(subject);
  const toneClass = key ? STORY_HIGHLIGHT_COLOR_BY_KEY[key] : STORY_HIGHLIGHT_FALLBACK_CLASS;
  return `${STORY_HIGHLIGHT_BASE_CLASS} ${toneClass}`;
};

type ProfileRecord = UserProfile & {
  id: string;
  birthYear: number | null;
};

type ProfileStore = {
  activeProfileId: string | null;
  profiles: ProfileRecord[];
};

const parseIsoDate = (value?: string | null) => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getProfileDeletionDeadline = (profile: Pick<ProfileRecord, 'deletedAt' | 'scheduledPermanentDeletionAt'>) => {
  const explicitDeadline = parseIsoDate(profile.scheduledPermanentDeletionAt);
  if (explicitDeadline !== null) return explicitDeadline;

  const deletedAt = parseIsoDate(profile.deletedAt);
  return deletedAt === null ? null : deletedAt + PROFILE_RESTORE_WINDOW_MS;
};

const isProfileDeleted = (profile: Pick<ProfileRecord, 'deletedAt' | 'scheduledPermanentDeletionAt'>, now = Date.now()) => {
  const deletedAt = parseIsoDate(profile.deletedAt);
  if (deletedAt === null) return false;

  const deadline = getProfileDeletionDeadline(profile);
  return deadline === null || now < deadline;
};

const shouldPurgeProfile = (profile: Pick<ProfileRecord, 'deletedAt' | 'scheduledPermanentDeletionAt'>, now = Date.now()) => {
  const deadline = getProfileDeletionDeadline(profile);
  return deadline !== null && now >= deadline;
};

const getActiveProfiles = (profiles: ProfileRecord[], now = Date.now()) => profiles.filter(profile => !isProfileDeleted(profile, now));

const getDeletedProfiles = (profiles: ProfileRecord[], now = Date.now()) => profiles.filter(profile => isProfileDeleted(profile, now));

const purgeExpiredProfiles = (profiles: ProfileRecord[], now = Date.now()) => profiles.filter(profile => !shouldPurgeProfile(profile, now));

const resolveActiveProfileId = (profiles: ProfileRecord[], requestedId: string | null, now = Date.now()) => {
  const activeProfiles = getActiveProfiles(profiles, now);
  if (!requestedId) return activeProfiles[0]?.id || null;
  const requestedProfile = activeProfiles.find(profile => profile.id === requestedId);
  return requestedProfile?.id || activeProfiles[0]?.id || null;
};

const CURRENT_YEAR = new Date().getFullYear();
const ALL_STEP_IDS = ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'];
const PROFILE_AVATAR_SECTIONS = [
  { id: 'boy', label: 'Bambini' },
  { id: 'girl', label: 'Bambine' },
] as const;
const APP_SIDEBAR_TABS = [
  { id: 'adventure', emoji: '🗺️', color: 'bg-yellow-400 border-yellow-600', label: 'Mappa' },
  { id: 'training', emoji: '🎒', color: 'bg-orange-400 border-orange-600', label: 'Allenamento' },
  { id: 'parents', emoji: '🔐', color: 'bg-rose-400 border-rose-600', label: 'Genitori' },
] as const;

const getAdventureWorldProgress = (profile: UserProfile, worldId: number) => {
  return profile.worldProgress[worldId] || {
    worldId,
    completedSteps: [],
    rebuiltMonuments: [],
    creatureEvolution: 'egg',
    highScore: 0,
    stars: 0,
  };
};

const BASE_PROFILE: Omit<ProfileRecord, 'id' | 'birthYear'> = {
  deletedAt: null,
  scheduledPermanentDeletionAt: null,
  name: "Eroe",
  level: 1,
  xp: 0,
  coins: 0,
  lightDrops: 0,
  avatar: {
    emoji: '👦'
  },
  unlockedWorlds: [2], // Starts with Table of 2 unlocked
  unlockedAccessories: [],
  worldProgress: {
    2: { worldId: 2, completedSteps: [], rebuiltMonuments: [], creatureEvolution: 'egg', highScore: 0, stars: 0 }
  },
  history: []
};

const createProfileId = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const createProfile = (name: string, birthYear: number | null, avatarEmoji: string): ProfileRecord => {
  return {
    ...BASE_PROFILE,
    id: createProfileId(),
    name,
    birthYear,
    avatar: {
      emoji: avatarEmoji
    }
  };
};

const normalizeProfile = (profile: Partial<ProfileRecord>, fallbackId?: string): ProfileRecord => {
  return {
    ...BASE_PROFILE,
    ...profile,
    id: profile.id || fallbackId || createProfileId(),
    birthYear: typeof profile.birthYear === 'number' ? profile.birthYear : null,
    deletedAt: profile.deletedAt || null,
    scheduledPermanentDeletionAt: profile.scheduledPermanentDeletionAt || null,
    avatar: {
      ...BASE_PROFILE.avatar,
      ...(profile.avatar || {})
    },
    unlockedWorlds: profile.unlockedWorlds ? [...profile.unlockedWorlds] : [...BASE_PROFILE.unlockedWorlds],
    unlockedAccessories: profile.unlockedAccessories ? [...profile.unlockedAccessories] : [...BASE_PROFILE.unlockedAccessories],
    history: profile.history ? [...profile.history] : [],
    worldProgress: profile.worldProgress ? { ...profile.worldProgress } : { ...BASE_PROFILE.worldProgress }
  };
};

export default function App() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'adventure' | 'training' | 'parents'>('adventure');
  const [selectedWorldId, setSelectedWorldId] = useState<number | null>(null);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [showProfilePicker, setShowProfilePicker] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return true;
    try {
      const parsed = JSON.parse(raw);
      return parsed.musicEnabled !== false;
    } catch {
      return true;
    }
  });
  const [effectsEnabled, setEffectsEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return true;
    try {
      const parsed = JSON.parse(raw);
      return parsed.effectsEnabled !== false;
    } catch {
      return true;
    }
  });
  const [deviceMode, setDeviceMode] = useState<'phone' | 'tablet'>('phone');
  const isPhoneMode = deviceMode === 'phone';
  const [showRewardsTutorial, setShowRewardsTutorial] = useState<boolean>(() => {
    const seen = localStorage.getItem('tabellandia_rewards_tutorial_seen');
    return !seen; // Show if never seen before
  });
  const [showDigitsGuideModal, setShowDigitsGuideModal] = useState<boolean>(false);
  const [currencyModalType, setCurrencyModalType] = useState<'drops' | 'coins' | null>(null);
  const [manualOnboardingGameOpen, setManualOnboardingGameOpen] = useState<boolean>(false);
  const [wizardActiveDigitIndex, setWizardActiveDigitIndex] = useState<number>(0);
  const [showFireworks, setShowFireworks] = useState<boolean>(false);
  const [isProfilePanelVisible, setIsProfilePanelVisible] = useState<boolean>(() => localStorage.getItem(PROFILE_PANEL_VISIBLE_KEY) !== 'false');
  // Header overlay behavior
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [isHeaderPinned, setIsHeaderPinned] = useState<boolean>(() => localStorage.getItem(HEADER_PINNED_KEY) === 'true');
  const isHeaderPinnedRef = useRef<boolean>(isHeaderPinned);
  const headerRef = useRef<HTMLElement | null>(null);
  const worldCardRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  // Setup Wizard State
  const [wizardStep, setWizardStep] = useState<number>(0); // 0: not loaded, 1: char_create, 2: ready
  const [heroNameInput, setHeroNameInput] = useState<string>("");
  const [newProfileAvatarEmoji, setNewProfileAvatarEmoji] = useState<string>('👦');
  const [newProfileBirthYear, setNewProfileBirthYear] = useState<number>(CURRENT_YEAR - 8);
  const [draftProfile, setDraftProfile] = useState<ProfileRecord | null>(null);

  // Parent PIN State
  const [showPINModal, setShowPINModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [isSettingPIN, setIsSettingPIN] = useState<boolean>(false);
  const [parentAuthenticated, setParentAuthenticated] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>("");
  const [showChangePINForm, setShowChangePINForm] = useState<boolean>(false);
  const [newPINInput, setNewPINInput] = useState<string>("");
  const [confirmPINInput, setConfirmPINInput] = useState<string>("");
  const [changePINStage, setChangePINStage] = useState<'new' | 'confirm'>('new');

  const [appMonumentModal, setAppMonumentModal] = useState<{
    world: typeof WORLDS_DATA[0];
    monument: typeof WORLDS_DATA[0]['monuments'][0];
    canAfford: boolean;
    isErected: boolean;
  } | null>(null);
  const [storyWorldId, setStoryWorldId] = useState<number | null>(null);

  const activeProfiles = getActiveProfiles(profiles);
  const deletedProfiles = getDeletedProfiles(profiles);
  const profile = activeProfileId ? activeProfiles.find(p => p.id === activeProfileId) || null : null;
  const storyEntries = storyWorldId !== null ? getStoryEntriesForTable(storyWorldId) : [];
  const renderMnemonicToken = (digit: number, key: string) => {
    const meta = DIGIT_META_MAP[digit];
    if (!meta) return <span key={key}>{digit}</span>;

    return (
      <span key={key} className="inline-flex items-center gap-0.5">
        <span>{digit}</span>
        <span aria-hidden="true" className="text-sm leading-none">{meta.emoji}</span>
        <span className="sr-only">{meta.label}</span>
      </span>
    );
  };
  const renderMnemonicNumber = (value: number, keyPrefix: string, withPlusBetweenDigits = false) => {
    const digits = getDigitsFromNumber(value);
    return digits.map((digit, index) => (
      <React.Fragment key={`${keyPrefix}-${index}`}>
        {renderMnemonicToken(digit, `${keyPrefix}-digit-${index}`)}
        {withPlusBetweenDigits && index < digits.length - 1 ? (
          <span aria-hidden="true" className="mx-1 text-amber-800">+</span>
        ) : null}
      </React.Fragment>
    ));
  };
  const renderMnemonicEquation = (entry: { table: number; multiplier: number; result: number }) => (
    <>
      {renderMnemonicNumber(entry.table, `table-${entry.table}`)}
      <span aria-hidden="true" className="mx-1">x</span>
      {renderMnemonicNumber(entry.multiplier, `multiplier-${entry.multiplier}`)}
      <span aria-hidden="true" className="mx-1">=</span>
      {renderMnemonicNumber(entry.result, `result-${entry.result}`, true)}
    </>
  );
  const playRandomHighlightEffect = () => {
    const effects: Array<() => void> = [
      () => sound.playClick(),
      () => sound.playSuccess(),
      () => sound.playPowerUp(),
      () => sound.playLevelUp(),
    ];
    effects[Math.floor(Math.random() * effects.length)]();
  };
  const renderStorySentenceWithHighlights = (sentence: string) => {
    const subjectWithEmojiRegex = new RegExp(STORY_SUBJECT_WITH_EMOJI_PATTERN, 'gu');
    const matches = Array.from(sentence.matchAll(subjectWithEmojiRegex));
    if (matches.length === 0) return sentence;

    const fragments: React.ReactNode[] = [];
    let cursor = 0;

    matches.forEach((match, index) => {
      const fullStart = match.index ?? -1;
      if (fullStart < cursor) return;

      const fullMatch = match[0] ?? '';
      const fullEnd = fullStart + fullMatch.length;
      const rawSubject = (match[1] ?? '').trim();
      const inside = (match[2] ?? '').trim();
      const normalizedInside = inside.toLowerCase();

      if (!containsEmoji(inside) || NON_EMOJI_PARENTHESIS_TOKENS.has(normalizedInside)) {
        fragments.push(<React.Fragment key={`plain-prefix-${index}`}>{sentence.slice(cursor, fullStart)}</React.Fragment>);
        fragments.push(<React.Fragment key={`plain-match-${index}`}>{fullMatch}</React.Fragment>);
        cursor = fullEnd;
        return;
      }

      const normalizedSubject = normalizeStorySubject(rawSubject);
      const rawSubjectOffset = fullMatch.indexOf(rawSubject);
      const subjectOffsetInRaw = rawSubject.lastIndexOf(normalizedSubject);
      const subjectStartInFull = Math.max(0, rawSubjectOffset + (subjectOffsetInRaw >= 0 ? subjectOffsetInRaw : 0));
      const subjectStart = fullStart + subjectStartInFull;
      const subjectEnd = subjectStart + normalizedSubject.length;

      fragments.push(<React.Fragment key={`before-match-${index}`}>{sentence.slice(cursor, subjectStart)}</React.Fragment>);

      if (normalizedSubject === 'cigno') {
        fragments.push(<React.Fragment key={`plain-cigno-${index}`}>{normalizedSubject}</React.Fragment>);
        cursor = fullEnd;
        return;
      }

      fragments.push(
        <button
          key={`highlight-${index}`}
          type="button"
          onClick={playRandomHighlightEffect}
          className={getStoryHighlightClass(normalizedSubject)}
          aria-label={`Soggetto storia: ${normalizedSubject}`}
          title={`Soggetto storia: ${normalizedSubject}`}
        >
          {normalizedSubject}
        </button>
      );
      fragments.push(<React.Fragment key={`after-highlight-${index}`}>{sentence.slice(subjectEnd, fullEnd)}</React.Fragment>);
      cursor = fullEnd;
    });

    if (cursor < sentence.length) {
      fragments.push(<React.Fragment key="tail">{sentence.slice(cursor)}</React.Fragment>);
    }

    return fragments;
  };
  const isParentModeActive = parentAuthenticated && activeTab === 'parents';
  const activeAdventureWorldId = (() => {
    if (!profile || selectedWorldId !== null) return null;
    const firstPlayableWorld = WORLDS_DATA.find(world => {
      const isUnlocked = profile.unlockedWorlds.includes(world.id);
      if (!isUnlocked) return false;
      const worldProg = getAdventureWorldProgress(profile, world.id);
      const isCompleted = worldProg.completedSteps.length === ALL_STEP_IDS.length && worldProg.rebuiltMonuments.length === world.monuments.length;
      return !isCompleted;
    });
    return firstPlayableWorld?.id ?? null;
  })();

  useEffect(() => {
    if (isParentModeActive && activeProfileId !== null) {
      setActiveProfileId(null);
    }
  }, [isParentModeActive, activeProfileId]);

  // Load profile on start
  useEffect(() => {
    const loadStore = (): ProfileStore => {
      const storeRaw = localStorage.getItem(PROFILE_STORE_KEY);
      if (storeRaw) {
        try {
          const parsed = JSON.parse(storeRaw) as ProfileStore;
          const nextProfiles = Array.isArray(parsed.profiles)
            ? parsed.profiles.map(p => normalizeProfile(p))
            : [];
          const cleanedProfiles = purgeExpiredProfiles(nextProfiles);
          return {
            activeProfileId: resolveActiveProfileId(cleanedProfiles, parsed.activeProfileId || null),
            profiles: cleanedProfiles
          };
        } catch (e) {
          console.error("Error loading profile store", e);
        }
      }

      const legacyRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw) as UserProfile;
          const legacyProfile = normalizeProfile(parsed, 'legacy-profile');
          return {
            activeProfileId: legacyProfile.id,
            profiles: [legacyProfile]
          };
        } catch (e) {
          console.error("Error loading legacy profile", e);
        }
      }

      return { activeProfileId: null, profiles: [] };
    };

    const store = loadStore();
    setProfiles(store.profiles);
    setActiveProfileId(store.activeProfileId);
    setShowLanding(true);
    setShowProfilePicker(store.activeProfileId === null && store.profiles.length > 0);
    setWizardStep(0);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    sound.setMusicEnabled(musicEnabled);
    sound.setEffectsEnabled(effectsEnabled);
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ musicEnabled, effectsEnabled }));
    if (musicEnabled && activeProfileId !== null) {
      sound.startBackgroundMusic();
    } else {
      sound.stopBackgroundMusic();
    }
  }, [musicEnabled, effectsEnabled, activeProfileId]);

  useEffect(() => {
    const unlockAudio = () => {
      sound.primeAudio();
      if (musicEnabled && activeProfileId !== null) {
        sound.startBackgroundMusic();
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [musicEnabled, activeProfileId]);

  useEffect(() => {
    if (activeProfileId !== null && musicEnabled) {
      sound.startBackgroundMusic();
    } else if (activeProfileId === null) {
      sound.stopBackgroundMusic();
    }
  }, [activeProfileId, musicEnabled]);

  useEffect(() => {
    localStorage.setItem(PROFILE_PANEL_VISIBLE_KEY, String(isProfilePanelVisible));
  }, [isProfilePanelVisible]);

  // Quando si cambia schermata/sezione, ripristina lo scroll in alto
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const scrollables = document.querySelectorAll('.overflow-y-auto');
    scrollables.forEach(el => {
      el.scrollTop = 0;
    });
  }, [activeTab, selectedWorldId, showProfilePicker, wizardStep, activeProfileId, isParentModeActive]);

  useEffect(() => {
    if (activeTab !== 'adventure' || selectedWorldId !== null || activeAdventureWorldId === null) return;
    const activeCard = worldCardRefs.current[activeAdventureWorldId];
    if (!activeCard) return;
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [activeTab, selectedWorldId, activeAdventureWorldId]);

  useEffect(() => {
    isHeaderPinnedRef.current = isHeaderPinned;
    localStorage.setItem(HEADER_PINNED_KEY, String(isHeaderPinned));
    if (isHeaderPinned) {
      setIsHeaderVisible(true);
    }
  }, [isHeaderPinned]);

  // Chiudi l'header quando si clicca/tocca fuori da esso.
  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (isHeaderPinnedRef.current || !isHeaderVisible) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (headerRef.current?.contains(target)) return;
      setIsHeaderVisible(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
  }, [isHeaderVisible]);

  /** Mostra l'header overlay. */
  const showHeaderAndReset = () => {
    setIsHeaderVisible(true);
  };

  const persistProfileStore = (nextProfiles: ProfileRecord[], nextActiveProfileId: string | null) => {
    const cleanedProfiles = purgeExpiredProfiles(nextProfiles);
    const resolvedActiveProfileId = resolveActiveProfileId(cleanedProfiles, nextActiveProfileId);
    localStorage.setItem(
      PROFILE_STORE_KEY,
      JSON.stringify({
        activeProfileId: resolvedActiveProfileId,
        profiles: cleanedProfiles
      } as ProfileStore)
    );

    const currentProfile = resolvedActiveProfileId ? cleanedProfiles.find(p => p.id === resolvedActiveProfileId) || null : null;
    if (currentProfile) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentProfile));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

    return {
      profiles: cleanedProfiles,
      activeProfileId: resolvedActiveProfileId
    };
  };

  // Sync back to local storage helper
  const handleUpdateProfile = (updater: (p: UserProfile) => UserProfile) => {
    if (!activeProfileId) return;

    setProfiles(prev => {
      const next = prev.map(p => {
        if (p.id !== activeProfileId) return p;
        return normalizeProfile({
          ...p,
          ...updater(p)
        }, p.id);
      });
      const persisted = persistProfileStore(next, activeProfileId);
      setActiveProfileId(persisted.activeProfileId);
      return persisted.profiles;
    });
  };

  const handleUpdateProfileById = (profileId: string, updater: (p: UserProfile) => UserProfile) => {
    setProfiles(prev => {
      const next = prev.map(p => {
        if (p.id !== profileId) return p;
        return normalizeProfile({
          ...p,
          ...updater(p)
        }, p.id);
      });
      const persisted = persistProfileStore(next, activeProfileId);
      setActiveProfileId(isParentModeActive ? null : persisted.activeProfileId);
      return persisted.profiles;
    });
  };

  const toggleMusic = () => {
    const nextState = !musicEnabled;
    sound.primeAudio();
    if (nextState && activeProfileId !== null) {
      sound.startBackgroundMusic();
    } else {
      sound.stopBackgroundMusic();
    }
    setMusicEnabled(nextState);
    sound.playClick();
  };

  const toggleEffects = () => {
    const nextState = !effectsEnabled;
    setEffectsEnabled(nextState);
    sound.setEffectsEnabled(nextState);
  };

  const handleCreateHero = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = heroNameInput.trim() || "Fulmine";
    const nextBirthYear = Number.isFinite(newProfileBirthYear) ? newProfileBirthYear : CURRENT_YEAR - 8;
    const nextProfile = createProfile(finalName, nextBirthYear, newProfileAvatarEmoji);
    setDraftProfile(nextProfile);
    sound.playLevelUp();
    setWizardStep(2);
  };

  const handleFinishWizard = () => {
    if (!draftProfile) return;

    const nextProfiles = [...profiles, draftProfile];
    const persisted = persistProfileStore(nextProfiles, draftProfile.id);
    setProfiles(persisted.profiles);
    setActiveProfileId(persisted.activeProfileId);

    sound.playPowerUp();
    setDraftProfile(null);
    setWizardStep(0);
    setShowProfilePicker(false);
    setActiveTab('adventure');
    setSelectedWorldId(null);
  };

  const handleSelectProfile = (selectedId: string) => {
    sound.playClick();
    const persisted = persistProfileStore(profiles, selectedId);
    setProfiles(persisted.profiles);
    setActiveProfileId(persisted.activeProfileId);
    setShowProfilePicker(false);
    setWizardStep(0);
    setDraftProfile(null);
    setHeroNameInput('');
    setSelectedWorldId(null);
    setActiveTab('adventure');
  };

  const handleStartProfileCreation = () => {
    sound.playPowerUp();
    setHeroNameInput('');
    setNewProfileAvatarEmoji('👦');
    setNewProfileBirthYear(CURRENT_YEAR - 8);
    setDraftProfile(null);
    setWizardStep(1);
    setShowProfilePicker(false);
  };

  const handleCancelProfileCreation = () => {
    sound.playClick();
    setHeroNameInput('');
    setNewProfileAvatarEmoji('👦');
    setNewProfileBirthYear(CURRENT_YEAR - 8);
    setDraftProfile(null);
    setWizardStep(0);
    setShowProfilePicker(true);
  };

  const handleSwitchProfile = () => {
    sound.playClick();
    setShowProfilePicker(true);
    setWizardStep(0);
  };

  const handleSoftDeleteProfile = (profileId: string) => {
    const targetProfile = profiles.find(item => item.id === profileId);
    if (!targetProfile) return;

    const nowIso = new Date().toISOString();
    const deletionDeadlineIso = new Date(Date.now() + PROFILE_RESTORE_WINDOW_MS).toISOString();
    const nextProfiles = profiles.map(item => item.id === profileId
      ? normalizeProfile({
          ...item,
          deletedAt: nowIso,
          scheduledPermanentDeletionAt: deletionDeadlineIso
        }, item.id)
      : item
    );

    const persisted = persistProfileStore(nextProfiles, null);

    sound.playError();
    setProfiles(persisted.profiles);
    setActiveProfileId(persisted.activeProfileId);
    setSelectedWorldId(null);
    setManualOnboardingGameOpen(false);
    setActiveTab(parentAuthenticated ? 'parents' : 'adventure');

    if (!persisted.activeProfileId && !parentAuthenticated) {
      setParentAuthenticated(false);
      setShowProfilePicker(true);
    }
  };

  const handleRestoreDeletedProfile = (profileId: string) => {
    const targetProfile = profiles.find(item => item.id === profileId);
    if (!targetProfile) return;

    const nextProfiles = profiles.map(item => item.id === profileId
      ? normalizeProfile({
          ...item,
          deletedAt: null,
          scheduledPermanentDeletionAt: null
        }, item.id)
      : item
    );
    const persisted = persistProfileStore(nextProfiles, activeProfileId || profileId);

    sound.playPowerUp();
    setProfiles(persisted.profiles);
    setActiveProfileId(persisted.activeProfileId);
  };

  const handlePermanentDeleteProfile = (profileId: string) => {
    const targetProfile = profiles.find(item => item.id === profileId);
    if (!targetProfile) return;

    const nextProfiles = profiles.filter(item => item.id !== profileId);
    const persisted = persistProfileStore(nextProfiles, activeProfileId === profileId ? null : activeProfileId);

    sound.playError();
    setProfiles(persisted.profiles);
    setActiveProfileId(persisted.activeProfileId);
    setSelectedWorldId(null);
    setManualOnboardingGameOpen(false);
    setActiveTab(parentAuthenticated ? 'parents' : 'adventure');

    if (!persisted.activeProfileId && !parentAuthenticated) {
      setParentAuthenticated(false);
      setShowProfilePicker(true);
    }
  };

  const handleAccessParentArea = () => {
    let storedPIN = localStorage.getItem('tabellandia_parent_pin');
    if (!storedPIN) {
      // First time - apply default parent PIN.
      localStorage.setItem('tabellandia_parent_pin', PARENT_PIN_DEFAULT);
      storedPIN = PARENT_PIN_DEFAULT;
      setIsSettingPIN(false);
    } else {
      // Already has PIN - ask to enter
      setIsSettingPIN(false);
    }
    setShowPINModal(true);
    setPinInput("");
  };

  const handlePINSubmit = (pinValue?: string) => {
    const pin = pinValue || pinInput;
    sound.playClick();
    setPinError("");

    const storedPIN = localStorage.getItem('tabellandia_parent_pin') || PARENT_PIN_DEFAULT;
    
    if (isSettingPIN || !storedPIN) {
      if (pin.length === 4) {
        localStorage.setItem('tabellandia_parent_pin', pin);
        sound.playPowerUp();
        setParentAuthenticated(true);
        setShowPINModal(false);
        setShowProfilePicker(false);
        setActiveProfileId(null);
        setActiveTab('parents');
        setPinInput("");
        setPinError("");
      }
    } else {
      // Verifying existing PIN
      if (pin === storedPIN || pin === PARENT_PIN_DEFAULT) {
        sound.playPowerUp();
        setParentAuthenticated(true);
        setShowPINModal(false);
        setShowProfilePicker(false);
        setActiveProfileId(null);
        setActiveTab('parents');
        setPinInput("");
        setPinError("");
      } else {
        sound.playError();
        setPinError("PIN errato! Riprova.");
        setTimeout(() => {
          setPinInput("");
          setPinError("");
        }, 1500);
      }
    }
  };

  const handleClosePINModal = () => {
    sound.playClick();
    setShowPINModal(false);
    setPinInput("");
    setPinError("");
    setShowChangePINForm(false);
    setNewPINInput("");
    setConfirmPINInput("");
    setParentAuthenticated(false);
    setActiveTab('adventure');
  };

  const handleExitParentArea = () => {
    sound.playClick();
    setParentAuthenticated(false);
    setActiveTab('adventure');
    setActiveProfileId(null);
    setShowProfilePicker(true);
  };

  const handleStartChangePIN = () => {
    sound.playClick();
    setShowChangePINForm(true);
    setNewPINInput("");
    setConfirmPINInput("");
    setPinError("");
    setChangePINStage('new');
  };

  const handleChangePINInput = (value: string) => {
    if (changePINStage === 'new') {
      setNewPINInput(value);
      // Auto-advance to confirm stage when 4 digits entered
      if (value.length === 4) {
        setChangePINStage('confirm');
      }
    } else {
      setConfirmPINInput(value);
      // Check confirmation when 4 digits entered
      if (value.length === 4) {
        if (value === newPINInput) {
          // PINs match - save
          sound.playPowerUp();
          localStorage.setItem('tabellandia_parent_pin', value);
          setShowChangePINForm(false);
          setNewPINInput("");
          setConfirmPINInput("");
          setPinError("");
          setChangePINStage('new');
        } else {
          // PINs don't match - reset and show error
          sound.playError();
          setPinError("I PIN non corrispondono!");
          setTimeout(() => {
            setNewPINInput("");
            setConfirmPINInput("");
            setPinError("");
            setChangePINStage('new');
          }, 1500);
        }
      }
    }
  };

  const handleSaveNewPIN = () => {
    sound.playClick();
    
    // Validate inputs
    if (newPINInput.length !== 4 || !newPINInput.match(/^\d+$/)) {
      setPinError("Nuovo PIN deve essere 4 cifre!");
      return;
    }
    
    if (newPINInput !== confirmPINInput) {
      setPinError("I PIN non corrispondono!");
      return;
    }
    
    // Save new PIN
    localStorage.setItem('tabellandia_parent_pin', newPINInput);
    sound.playPowerUp();
    setShowChangePINForm(false);
    setNewPINInput("");
    setConfirmPINInput("");
    setPinError("");
    setChangePINStage('new');
  };

  const pinAuthenticationModal = (
    <AnimatePresence>
      {showPINModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClosePINModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-indigo-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔐⚡</div>
              <h2 className="text-xl font-black text-indigo-950">Area di Controllo</h2>
              <p className="text-xs text-slate-500 mt-1">
                {showChangePINForm ? "Imposta un nuovo PIN" : isSettingPIN ? "Crea un PIN a 4 cifre" : "Inserisci il PIN di 4 cifre per accedere"}
              </p>
            </div>

            {showChangePINForm ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-indigo-700 block mb-2">Nuovo PIN (4 cifre)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPINInput}
                    onChange={e => setNewPINInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg text-center text-2xl font-black tracking-widest focus:outline-none focus:border-indigo-600"
                    placeholder="••••"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-700 block mb-2">Conferma PIN</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPINInput}
                    onChange={e => setConfirmPINInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg text-center text-2xl font-black tracking-widest focus:outline-none focus:border-indigo-600"
                    placeholder="••••"
                  />
                </div>

                {pinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                  >
                    {pinError}
                  </motion.div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowChangePINForm(false);
                      setNewPINInput("");
                      setConfirmPINInput("");
                      setPinError("");
                      setPinInput("");
                    }}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveNewPIN}
                    disabled={newPINInput.length !== 4 || confirmPINInput.length !== 4}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Salva
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-2 mb-6">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={pinError ? { x: [-5, 5, -5, 0] } : {}}
                      transition={{ duration: 0.3 }}
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all ${
                        pinError
                          ? 'bg-red-100 border-red-400 text-red-600'
                          : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      }`}
                    >
                      {pinInput[i] ? '●' : '-'}
                    </motion.div>
                  ))}
                </div>

                {pinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-4 text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                  >
                    {pinError}
                  </motion.div>
                )}

                <NumericKeypad
                  value={pinInput}
                  onChange={v => setPinInput(v.slice(0, 4))}
                  onSubmit={handlePINSubmit}
                  maxDigits={4}
                />
              </>
            )}

            {!showChangePINForm && (
              <button
                onClick={handleClosePINModal}
                className="w-full mt-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Annulla
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm font-bold font-sans">Caricamento di Tabellandia...</p>
        </div>
        <FontSizeControl />
      </div>
    );
  }

  if (showLanding) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-purple-100 to-indigo-100 flex items-center justify-center p-4 overflow-hidden relative" id="landing-screen">
        {/* Decorative clouds */}
        <div className="absolute top-8 left-1/4 w-32 h-12 bg-white/60 rounded-full blur-xl"></div>
        <div className="absolute top-24 right-1/3 w-40 h-14 bg-white/50 rounded-full blur-2xl"></div>
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center max-w-lg w-full space-y-8 relative z-10"
        >
          {/* Castle Logo */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-7xl filter drop-shadow-lg"
          >
            🏰
          </motion.div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-5xl md:text-6xl font-black text-indigo-950 tracking-wider font-sans">
              Tabellandia
            </h1>
            <p className="text-sm md:text-base font-bold text-indigo-600 tracking-widest uppercase">
              Un Regno di Numeri e Magia
            </p>
          </div>

          {/* Welcome Message */}
          <p className="text-center text-sm md:text-base text-indigo-900/80 leading-relaxed max-w-md font-medium">
            Benvenuto! Sei pronto ad intraprendere un viaggio straordinario dove le tabelline diventano alleate fedeli, magie e creature leggendarie?
          </p>

          {/* Start Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              sound.playPowerUp();
              setShowLanding(false);
              setShowProfilePicker(true);
            }}
            className="w-full max-w-xs py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-lg shadow-2xl cursor-pointer transition-all"
            id="landing-start-btn"
          >
            Inizia l'Avventura!
          </motion.button>

          {/* Info Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRewardsTutorial(true)}
            className="w-full max-w-xs py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-black text-base shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
            id="landing-info-btn"
          >
            <Coins className="w-5 h-5" />
            Come Guadagnare Premi
          </motion.button>

          {/* Decorative stars */}
          <div className="flex gap-3 mt-4">
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0s' }}>✨</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>⭐</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.6s' }}>✨</span>
          </div>
        </motion.div>

        {/* Rewards Tutorial Modal */}
        <RewardsTutorial
          isOpen={showRewardsTutorial}
          onClose={() => {
            setShowRewardsTutorial(false);
            localStorage.setItem('tabellandia_rewards_tutorial_seen', 'true');
          }}
        />
      </div>
    );
  }

  if (showProfilePicker) {
    return (
      <div className="w-full h-screen bg-indigo-950 flex items-center justify-center p-4 overflow-hidden relative" id="profile-picker-screen">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 via-indigo-900 to-indigo-950 z-0"></div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-4xl w-full relative z-10 max-h-[90vh]"
        >
          <SurfaceCard padding="lg" className="border-2 border-indigo-200 shadow-2xl h-full max-h-[90vh] overflow-hidden flex flex-col">
            <SectionHeader
              centered
              eyebrow="Selezione profilo"
              title="Chi entra a Tabellandia?"
              description="Scegli un profilo esistente oppure creane uno nuovo. Ogni profilo conserva progressi, monete, gocce e dettagli di crescita."
              className="mb-4 sm:mb-6"
            />

            <ResponsiveGrid variant="cards" className="overflow-y-auto pr-1 flex-1 items-stretch">
            {activeProfiles.length === 0 && (
              <SurfaceCard padding="md" className="rounded-3xl border-dashed border-slate-300 bg-white/90 text-center">
                <p className="text-sm font-black text-slate-800">Nessun profilo attivo disponibile</p>
                <p className="mt-1 text-xs text-slate-500">
                  I profili eliminati si gestiscono dalla Modalità Genitori oppure puoi crearne uno nuovo.
                </p>
              </SurfaceCard>
            )}
            {activeProfiles.map(p => {
              const age = p.birthYear ? CURRENT_YEAR - p.birthYear : null;
              const isActive = activeProfileId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProfile(p.id)}
                  className={`text-left rounded-3xl border-2 p-4 shadow-sm transition-all cursor-pointer hover:shadow-md focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    isActive ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  id={`profile-card-${p.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-400 border-2 border-white shadow-inner flex items-center justify-center text-2xl shrink-0">
                      {p.avatar?.emoji || '👦'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {p.birthYear ? `Nato nel ${p.birthYear}${age ? ` · ${age} anni` : ''}` : 'Anno di nascita da impostare'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <span>LV {p.level}</span>
                    <span>{p.unlockedWorlds.length} mondi</span>
                  </div>
                </button>
              );
            })}

            <button
              onClick={handleStartProfileCreation}
              className="rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 p-4 text-center shadow-sm hover:bg-indigo-50 hover:shadow-md cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[120px] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              id="profile-create-btn"
            >
              <span className="text-4xl">➕</span>
              <span className="mt-2 text-sm font-black text-indigo-950">Crea nuovo profilo</span>
              <span className="text-[11px] text-slate-500 mt-1">Scegli base avatar e anno di nascita</span>
            </button>
            </ResponsiveGrid>

            {/* Parent Mode button from profile selection */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  handleAccessParentArea();
                }}
                className="px-4 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-black text-xs hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-2"
                id="profile-picker-parent-btn"
              >
                🔐 Modalità Genitori
              </button>
              <span className="text-[11px] text-slate-400 font-medium">Area protetta da PIN</span>
            </div>
          </SurfaceCard>
        </motion.div>
        {pinAuthenticationModal}
      </div>
    );
  }

  // Tutorial / Setup Wizard Overlay
  if (wizardStep > 0) {
    return (
      <div className="w-full min-h-screen min-h-dvh bg-indigo-950 flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto relative" id="wizard-screen">
        {/* Ambient star decorations */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 via-indigo-900 to-indigo-950 z-0 pointer-events-none"></div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl w-full my-auto py-2 relative z-10"
        >
          <SurfaceCard padding="sm" className="border-2 border-indigo-200 shadow-2xl overflow-y-auto max-h-[92vh] sm:max-h-none p-3.5 sm:p-6">
          {wizardStep === 1 && (
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              <SectionHeader
                centered
                eyebrow="Nuovo profilo"
                title="Crea il profilo"
                description="Scegli nome, anno di nascita e base avatar."
                icon={<span className="text-3xl sm:text-4xl" aria-hidden="true">🎒🛡️</span>}
              />

              <form onSubmit={handleCreateHero} className="space-y-3">
                <input
                  type="text"
                  maxLength={15}
                  placeholder="Scrivi il tuo nome d'eroe..."
                  value={heroNameInput}
                  onChange={e => setHeroNameInput(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:outline-none font-bold text-center text-slate-700 bg-white text-sm sm:text-base"
                  id="hero-name-input"
                  required
                />

                <label className="block">
                  <span className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Anno di nascita</span>
                  <select
                    value={newProfileBirthYear}
                    onChange={e => setNewProfileBirthYear(parseInt(e.target.value, 10))}
                    className="w-full py-2.5 px-3.5 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:outline-none font-bold text-center text-slate-700 bg-white text-sm sm:text-base"
                    id="birth-year-select"
                  >
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const year = CURRENT_YEAR - 4 - idx;
                      return (
                        <option key={year} value={year}>
                          {year} (circa {CURRENT_YEAR - year} anni)
                        </option>
                      );
                    })}
                  </select>
                </label>

                <div>
                  <span className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Scegli il tuo avatar</span>
                  <div className="space-y-2">
                    {PROFILE_AVATAR_SECTIONS.map(section => (
                      <SurfaceCard key={section.id} padding="sm" className="rounded-xl border-slate-200 p-2 sm:p-3">
                        <p className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{section.label}</p>
                        <ResponsiveGrid variant="compact" className="grid-cols-4 gap-1.5 sm:gap-2">
                          {AVATARS.filter(a => a.category === section.id).map(avatar => (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setNewProfileAvatarEmoji(avatar.emoji)}
                              className={`p-1.5 sm:p-2.5 rounded-xl border-2 font-bold text-[10px] cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                                newProfileAvatarEmoji === avatar.emoji ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                              }`}
                              id={`setup-avatar-${avatar.id}`}
                            >
                              <span className="text-xl sm:text-2xl">{avatar.emoji}</span>
                              <span className="line-clamp-1">{avatar.name}</span>
                            </button>
                          ))}
                        </ResponsiveGrid>
                      </SurfaceCard>
                    ))}
                  </div>
                </div>

                <ActionGrid columns={2}>
                  <button
                    type="button"
                    onClick={handleCancelProfileCreation}
                    className="w-full py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm shadow-md cursor-pointer transition-colors"
                    id="wizard-cancel-btn"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer transition-colors"
                    id="wizard-create-btn"
                  >
                    Registra Eroe
                  </button>
                </ActionGrid>
              </form>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5 flex-1 flex flex-col justify-center text-slate-800">
              <SectionHeader
                centered
                eyebrow="Benvenuto a Tabellandia"
                title={`Ecco le 10 Cifre Magiche, ${draftProfile?.name || heroNameInput || 'Eroe'}!`}
                description="All'inizio del gioco impariamo ogni cifra con la sua associazione visiva e il motivo per ricordarla facilmente:"
                icon={<span className="text-4xl animate-bounce" aria-hidden="true">🔢✨</span>}
              />

              {/* Digit selector grid */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {DIGITS_INFO.map((info, idx) => (
                  <button
                    key={info.digit}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setWizardActiveDigitIndex(idx);
                    }}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${
                      wizardActiveDigitIndex === idx
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-md scale-105 font-black'
                        : 'border-slate-200 bg-white hover:bg-indigo-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base font-bold">{info.digit}</span>
                    <span className="text-lg">{info.emoji}</span>
                  </button>
                ))}
              </div>

              {/* Selected Digit Detail Box */}
              {(() => {
                const current = DIGITS_INFO[wizardActiveDigitIndex] || DIGITS_INFO[0];
                return (
                  <SurfaceCard padding="md" className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm flex items-center justify-center text-3xl shrink-0">
                        {current.emoji}
                      </div>
                      <div className="flex-1 min-w-0 text-left space-y-1">
                        <p className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                          Cifra {current.digit} = {current.emoji} {current.imageLabel}
                        </p>
                        <p className="text-xs text-slate-700 leading-snug">
                          <span className="font-bold text-indigo-700">Motivo: </span>
                          {current.reason}
                        </p>
                      </div>
                    </div>
                  </SurfaceCard>
                );
              })()}

              <button
                type="button"
                onClick={handleFinishWizard}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
                id="wizard-finish-btn"
              >
                <span>🚀</span> Ho capito le 10 cifre! Vola a Tabellandia!
              </button>
            </div>
          )}
          </SurfaceCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-2 md:p-4 select-none">
      
      {/* Device frame toggle for responsive showcase */}
      <div className="mb-2 text-xs font-bold text-slate-400 flex items-center gap-3">
        <span>{isPhoneMode ? 'Vista smartphone' : 'Dimostratore Android "Tabellandia"'}</span>
        <button
          onClick={() => setDeviceMode(isPhoneMode ? 'tablet' : 'phone')}
          className="flex items-center gap-1 bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 cursor-pointer"
          id="bezel-toggle"
        >
          <Smartphone className="w-3.5 h-3.5" />
          {isPhoneMode ? "Passa alla vista tablet" : "Passa alla vista smartphone"}
        </button>
      </div>

      {/* Main Container mimicking tablet bezel */}
      <div
        className={`w-full transition-all relative ${
          isPhoneMode
            ? 'max-w-[430px] w-full h-[min(88vh,860px)] border-[12px] border-slate-800 rounded-[42px] ring-8 ring-slate-800/10 shadow-2xl overflow-hidden bg-gradient-to-b from-[#63C5DA] to-[#92E3A9] flex flex-col text-slate-800'
            : 'max-w-5xl aspect-[4/3] min-h-[600px] border-[14px] border-slate-800 rounded-[36px] ring-8 ring-slate-800/10 shadow-2xl overflow-hidden bg-gradient-to-b from-[#63C5DA] to-[#92E3A9] flex flex-col text-slate-800'
        }`}
        onMouseMove={(e) => {
          if (!isHeaderVisible) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientY - rect.top < HEADER_REVEAL_MOUSE_ZONE_PX) showHeaderAndReset();
          }
        }}
        onTouchStart={(e) => {
          if (!isHeaderVisible && e.touches.length > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.touches[0].clientY - rect.top < HEADER_REVEAL_TOUCH_ZONE_PX) showHeaderAndReset();
          }
        }}
      >

        {/* Sky Background Elements */}
        <div className="absolute top-12 left-16 w-32 h-12 bg-white/20 rounded-full blur-xl pointer-events-none z-0"></div>
        <div className="absolute top-28 right-36 w-48 h-16 bg-white/15 rounded-full blur-2xl pointer-events-none z-0"></div>
        
        {/* Android status bar simulation if bezel is shown */}
        {isPhoneMode && (
          <div className="bg-slate-950/40 text-slate-200 px-6 py-1 text-[10px] flex items-center justify-between select-none font-sans border-b border-white/10 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <span>● Google Android OS</span>
              <span className="text-white/20">|</span>
              <span className="text-slate-200">Tabellandia v1.0.0</span>
            </div>
            <div className="font-mono flex items-center gap-2">
              <span>🔋 100%</span>
              <span>📶 Wi-Fi</span>
              <span>10:00</span>
            </div>
          </div>
        )}

        {/* ── Auto-hide header (absolute, slides out on inactivity) ─────────── */}
        <header
          id="app-header"
          ref={headerRef}
          className={`absolute top-0 left-0 right-0 z-40 bg-white/30 backdrop-blur-md border-b border-white/40 shadow-lg text-sky-950 px-${isPhoneMode ? '2' : '6'} py-${isPhoneMode ? '2' : '4'}
            transition-transform duration-300 ease-in-out motion-reduce:transition-none
            ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
          onMouseEnter={showHeaderAndReset}
          onPointerDown={showHeaderAndReset}
          onMouseLeave={() => { if (!isHeaderPinnedRef.current) setIsHeaderVisible(false); }}
          aria-hidden={!isHeaderVisible}
        >
          <div className={`w-full flex items-center ${isPhoneMode ? 'gap-1.5' : 'gap-3'} bg-white/40 backdrop-blur-sm ${isPhoneMode ? 'px-3 py-2' : 'px-5 py-2.5'} rounded-full border-2 border-white/60 shadow-md overflow-visible flex-nowrap`}>
            {profile && (
              <>
                {/* Profile Avatar */}
                <div className={`flex flex-col items-center justify-center ${isPhoneMode ? 'w-12' : 'w-14'} shrink-0`}>
                 <button
                  type="button"
                  onClick={() => { sound.playClick(); handleSwitchProfile(); }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  id="profile-icon-btn"
                  title="Cambia profilo"
                 >
                  <div className={`${isPhoneMode ? 'w-10 h-10 text-lg' : 'w-11 h-11 text-2xl'} bg-orange-400 rounded-full border-2 border-white overflow-hidden shadow-inner flex items-center justify-center`}>
                    {profile.avatar?.emoji || '👦'}
                  </div>
                 </button>
                 <span
                   className={`mt-0.5 font-black text-sky-950 uppercase tracking-wider leading-none ${isPhoneMode ? 'text-[7px]' : 'text-[10px]'}`}
                 >
                   {profile.name}
                 </span>
                </div>

                {/* Monete & Gocce (Sovrapposte una sotto l'altra) */}
                <div className={`flex flex-col justify-center gap-1 shrink-0 bg-white/65 rounded-2xl border border-white/80 ${isPhoneMode ? 'px-2 py-1 min-w-[72px]' : 'px-3 py-1.5 min-w-[105px]'}`}>
                  {/* Monete */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); sound.playClick(); setCurrencyModalType('coins'); }}
                    className="flex items-center justify-between gap-1.5 hover:bg-amber-100/50 rounded px-1 transition-colors cursor-pointer text-left w-full group"
                    title="Tocca per scoprire a cosa servono le Monete"
                  >
                    <div className="flex items-center gap-1 text-amber-600 group-hover:text-amber-700">
                      <Coins className={`${isPhoneMode ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} />
                      <span className={`font-bold uppercase tracking-wide text-sky-950/60 group-hover:text-amber-900 ${isPhoneMode ? 'text-[7px]' : 'text-[9px]'}`}>Monete</span>
                    </div>
                    <span className={`font-black text-sky-950 leading-none ${isPhoneMode ? 'text-[9px]' : 'text-xs'}`}>{profile.coins}</span>
                  </button>

                  {/* Gocce */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); sound.playClick(); setCurrencyModalType('drops'); }}
                    className="flex items-center justify-between gap-1.5 border-t border-sky-950/10 pt-0.5 hover:bg-sky-100/50 rounded px-1 transition-colors cursor-pointer text-left w-full group"
                    title="Tocca per scoprire a cosa servono le Gocce"
                  >
                    <div className="flex items-center gap-1 text-sky-500 group-hover:text-sky-600">
                      <Droplets className={`${isPhoneMode ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} />
                      <span className={`font-bold uppercase tracking-wide text-sky-950/60 group-hover:text-sky-900 ${isPhoneMode ? 'text-[7px]' : 'text-[9px]'}`}>Gocce</span>
                    </div>
                    <span className={`font-black text-sky-950 leading-none ${isPhoneMode ? 'text-[9px]' : 'text-xs'}`}>{profile.lightDrops}</span>
                  </button>
                </div>
              </>
            )}

            {/* Controls */}
            <div className={`ml-auto flex items-center gap-${isPhoneMode ? '1' : '2'} bg-white/65 rounded-full border border-white/80 ${isPhoneMode ? 'px-2 py-1' : 'px-3 py-1.5'} min-w-max`}>
             <button
               onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
                className={`rounded-full border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${isPhoneMode ? 'w-6 h-6' : 'w-8 h-8'} ${musicEnabled ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white/70 border-slate-200 text-slate-400'}`}
                id="music-toggle" title={musicEnabled ? "Disattiva musica" : "Attiva musica"}
              >
                <span className="relative flex items-center justify-center">
                  <Music2 className={isPhoneMode ? 'w-3 h-3' : 'w-4 h-4'} />
                  {!musicEnabled && <X className={`absolute -right-1 -bottom-1 stroke-[3.2] ${isPhoneMode ? 'w-1 h-1' : 'w-2 h-2'}`} />}
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleEffects(); }}
                className={`rounded-full border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${isPhoneMode ? 'w-6 h-6' : 'w-8 h-8'} ${effectsEnabled ? 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-600' : 'bg-white/70 border-slate-200 text-slate-400'}`}
                id="sfx-toggle" title={effectsEnabled ? "Disattiva effetti click" : "Attiva effetti click"}
              >
                <span className="relative flex items-center justify-center">
                  <Volume2 className={isPhoneMode ? 'w-3 h-3' : 'w-4 h-4'} />
                  {!effectsEnabled && <X className={`absolute -right-1 -bottom-1 stroke-[3.2] ${isPhoneMode ? 'w-1 h-1' : 'w-2 h-2'}`} />}
                </span>
              </button>
              <VoiceToggle isPhoneMode={isPhoneMode} />
              {/* Cifre & Mnemoniche guide button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); sound.playClick(); setShowDigitsGuideModal(true); }}
                className={`rounded-full border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${isPhoneMode ? 'px-2 h-6 text-[10px]' : 'px-2.5 h-8 text-xs'} bg-indigo-100 hover:bg-indigo-200 border-indigo-300 text-indigo-800 font-bold gap-1`}
                title="Guida Cifre e Mnemoniche (0-9)"
                id="digits-guide-btn"
              >
                <span>🔢</span>
                {!isPhoneMode && <span>Cifre</span>}
              </button>
              {/* Pin/Unpin — blocca header sempre visibile */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); sound.playClick(); setIsHeaderPinned(prev => !prev); }}
                className={`rounded-full border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${isPhoneMode ? 'w-6 h-6' : 'w-8 h-8'} ${isHeaderPinned ? 'bg-sky-200 border-sky-400 text-sky-700' : 'bg-white/70 border-slate-200 text-slate-400 hover:bg-white/90'}`}
                aria-label={isHeaderPinned ? 'Sblocca barra (chiude fuori click o uscita mouse)' : 'Blocca barra sempre visibile'}
                aria-pressed={isHeaderPinned}
              >
                <span className={isPhoneMode ? 'text-[9px]' : 'text-[11px]'} aria-hidden="true">{isHeaderPinned ? '📌' : '📍'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Grip strip — trigger visibile quando header è nascosto */}
        <div
          className="absolute top-0 left-0 right-0 z-50 h-3 flex items-end justify-center pb-0.5 pointer-events-auto"
          role="button"
          tabIndex={isHeaderVisible ? -1 : 0}
          aria-label="Mostra barra profilo"
          onPointerDown={showHeaderAndReset}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') showHeaderAndReset(); }}
        >
          <div className={`w-10 h-1 rounded-full transition-all duration-300 ${isHeaderVisible ? 'bg-transparent' : 'bg-white/60'}`} />
        </div>
        {pinAuthenticationModal}

        {/* Change PIN Modal (from Parent Dashboard) */}
        <AnimatePresence>
          {showChangePINForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowChangePINForm(false);
                setNewPINInput("");
                setConfirmPINInput("");
                setPinError("");
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-indigo-200"
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🔑</div>
                  <h2 className="text-xl font-black text-indigo-950">Modifica PIN</h2>
                  <p className="text-xs text-slate-500 mt-2">
                    {changePINStage === 'new' ? 'Inserisci il nuovo PIN (4 cifre)' : 'Conferma il PIN'}
                  </p>
                </div>

                {/* PIN Display */}
                <div className="flex justify-center gap-2 mb-6">
                  {[0, 1, 2, 3].map(i => {
                    const currentValue = changePINStage === 'new' ? newPINInput : confirmPINInput;
                    return (
                      <motion.div
                        key={i}
                        animate={pinError ? { x: [-5, 5, -5, 0] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all ${
                          pinError
                            ? 'bg-red-100 border-red-400 text-red-600'
                            : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        }`}
                      >
                        {currentValue[i] ? '●' : '-'}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Error Message */}
                {pinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-4 text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                  >
                    {pinError}
                  </motion.div>
                )}

                {/* Numeric Keypad */}
                <NumericKeypad
                  value={changePINStage === 'new' ? newPINInput : confirmPINInput}
                  onChange={handleChangePINInput}
                  onSubmit={() => {}}
                  maxDigits={4}
                />

                <button
                  onClick={() => {
                    setShowChangePINForm(false);
                    setNewPINInput("");
                    setConfirmPINInput("");
                    setPinError("");
                    setChangePINStage('new');
                  }}
                  className="w-full mt-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Annulla
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Panel Area */}
        <div className={`flex-1 overflow-hidden flex relative z-10 ${isPhoneMode ? 'flex-col' : 'flex-row'}`}>
          
          {/* Left Sidebar Navigation (Kid-Friendly Rail) */}
          {selectedWorldId === null && !isPhoneMode && profile && (
            <div className="w-24 bg-white/20 backdrop-blur-md rounded-[32px] border-4 border-white/40 flex flex-col items-center py-8 gap-8 shadow-2xl z-20 m-4 md:flex hidden">
              {APP_SIDEBAR_TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      sound.playClick();
                      if (tab.id === 'parents') {
                        handleAccessParentArea();
                      } else {
                        setActiveTab(tab.id as any);
                      }
                    }}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer transform hover:scale-110 active:scale-95 transition-all ${
                      isActive 
                        ? `${tab.color} border-b-4 scale-105` 
                        : 'bg-white/40 hover:bg-white/60 text-slate-800'
                    }`}
                    id={`sidebar-tab-${tab.id}`}
                  >
                    <span className="text-3xl filter drop-shadow-sm select-none">{tab.emoji}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Content Pane */}
          <main className="flex-1 overflow-hidden relative flex flex-col">
            <AnimatePresence mode="wait">
              {selectedWorldId !== null ? (
                // Selected World Detail gameplay view
                profile ? (
                  <motion.div
                    key="world-detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full h-full"
                  >
                    <WorldDetail
                      world={WORLDS_DATA.find(w => w.id === selectedWorldId)!}
                      profile={profile}
                      updateProfile={handleUpdateProfile}
                      compactLayout={isPhoneMode}
                      onBack={() => {
                        sound.playClick();
                        setSelectedWorldId(null);
                      }}
                    />
                  </motion.div>
                ) : null
              ) : (
                // Main Area Tabs
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`w-full h-full overflow-y-auto ${isPhoneMode ? 'p-3' : 'p-4 md:p-6'}`}
                >
                  {/* TAB 1: AVVENTURA (Main map with levels) */}
                  {activeTab === 'adventure' && (
                    <div className="space-y-6">
                      {profile && (() => {
                        const areAllWorldsCompleted = WORLDS_DATA.every(world => {
                          const worldProg = getAdventureWorldProgress(profile, world.id);
                          const stepsCount = worldProg.completedSteps.length;
                          const rebuiltCount = worldProg.rebuiltMonuments.length;
                          return stepsCount === ALL_STEP_IDS.length && rebuiltCount === world.monuments.length;
                        });

                        if (!areAllWorldsCompleted) return null;

                        return (
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="rounded-3xl border-4 border-emerald-400 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 p-6 text-white text-center shadow-2xl relative overflow-hidden"
                          >
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-yellow-300 via-transparent to-transparent"></div>
                            <div className="relative z-10 space-y-3">
                              <span className="text-4xl">👑✨🏆</span>
                              <h3 className="text-xl sm:text-2xl font-black tracking-tight">Complimenti Eroe! Hai liberato tutte le terre di Tabellandia!</h3>
                              <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto font-medium">
                                Hai completato tutte le tabelline, ricostruito ogni monumento e sconfitto la nebbia. La tua mente è ora fortissima!
                              </p>
                              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playPowerUp();
                                    setShowFireworks(true);
                                  }}
                                  className="px-6 py-3 rounded-2xl bg-white text-emerald-950 font-black text-sm shadow-lg hover:bg-emerald-50 transition-all cursor-pointer inline-flex items-center gap-2"
                                  id="celebration-fireworks-btn"
                                >
                                  <span>🎆 Festeggia con i Fuochi d'Artificio!</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playLevelUp();
                                    setShowFireworks(true);
                                  }}
                                  className="px-6 py-3 rounded-2xl bg-yellow-400 text-slate-900 font-black text-sm shadow-lg hover:bg-yellow-300 transition-all cursor-pointer inline-flex items-center gap-2"
                                  id="celebration-continue-btn"
                                >
                                  <span>🚀 Continua l'Avventura</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()}

                      <SurfaceCard tone="soft" padding={isPhoneMode ? 'sm' : 'md'} className={`text-center ${isPhoneMode ? '' : 'md:text-left'}`}>
                        <SectionHeader
                          eyebrow="Modalità Avventura"
                          title="Mappa di Tabellandia"
                          description="Segui gli indizi di Orion tra i regni della Terra Magica e scopri, passo dopo passo, la rotta verso il mistero."
                        />
                        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-sky-900/80 sm:text-[11px]">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 sm:px-3 sm:py-1">✅ Completato</span>
                          <span className="rounded-full border border-amber-400 bg-amber-300 px-2 py-0.5 text-amber-950 shadow-sm motion-safe:animate-pulse sm:px-3 sm:py-1">🚀 Entra</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700 sm:px-3 sm:py-1">🔒 Bloccato</span>
                        </div>
                      </SurfaceCard>

                      <ResponsiveGrid columns={1} variant="cards" className="items-stretch max-w-2xl mx-auto">
                        {WORLDS_DATA.map(world => {
                          const isUnlocked = profile.unlockedWorlds.includes(world.id);
                          const worldProg = getAdventureWorldProgress(profile, world.id);
                          const stepsCount = worldProg.completedSteps.length;
                          const rebuiltCount = worldProg.rebuiltMonuments.length;
                          const isCompleted = stepsCount === ALL_STEP_IDS.length && rebuiltCount === world.monuments.length;
                          const isActiveWorld = isUnlocked && !isCompleted && world.id === activeAdventureWorldId;
                          const statusLabel = !isUnlocked ? 'Bloccato' : isCompleted ? 'Completato' : 'Entra';

                          return (
                            <div key={world.id} className="relative">
                            <button
                              type="button"
                              ref={(el) => {
                                worldCardRefs.current[world.id] = el;
                              }}
                              onClick={() => {
                                if (!isUnlocked) return;
                                sound.playPowerUp();
                                setSelectedWorldId(world.id);
                                setIsHeaderVisible(false);
                              }}
                              disabled={!isUnlocked}
                              className={`w-full overflow-hidden text-left rounded-3xl border-2 p-3 sm:p-4 shadow-lg transition-all active:scale-[0.98] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                                !isUnlocked
                                  ? 'bg-slate-200 border-slate-300 text-slate-600 cursor-not-allowed'
                                  : isCompleted
                                    ? 'bg-gradient-to-br from-emerald-300 via-emerald-200 to-white border-emerald-500 text-emerald-950 cursor-pointer hover:shadow-xl hover:-translate-y-1'
                                    : isActiveWorld
                                      ? 'bg-gradient-to-br from-amber-50 via-yellow-100 to-emerald-100 border-amber-500 ring-4 ring-amber-300/80 text-sky-950 cursor-pointer hover:shadow-xl hover:-translate-y-1 motion-safe:animate-pulse'
                                      : 'bg-gradient-to-br from-white via-sky-50 to-emerald-50 border-sky-300 text-sky-950 cursor-pointer hover:shadow-xl hover:-translate-y-1'
                              }`}
                              aria-label={`${world.locationName}, stato ${statusLabel}, ${stepsCount} passi completati su ${ALL_STEP_IDS.length}`}
                            >
                              <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                                  <div className="h-11 w-11 shrink-0 rounded-xl border-2 border-white bg-white/90 shadow-md flex items-center justify-center text-2xl sm:h-14 sm:w-14 sm:rounded-2xl sm:border-4 sm:text-3xl">
                                    <span aria-hidden="true">{getTableIcon(world.id)}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-sky-600 sm:text-[10px] sm:tracking-[0.18em]">
                                      {`Tabellina del ${world.id}`}
                                    </p>
                                    <h3 className="text-sm font-black leading-tight sm:text-base" title={world.locationName}>{world.locationName}</h3>
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black sm:px-3 sm:py-1 sm:text-[11px] ${
                                    !isUnlocked
                                      ? 'bg-slate-50 text-slate-700'
                                      : isCompleted
                                        ? 'bg-emerald-100 text-emerald-800'
                                       : isActiveWorld
                                         ? 'bg-amber-300 text-amber-950 border border-amber-500 shadow-sm motion-safe:animate-pulse'
                                         : 'bg-amber-100 text-amber-800'
                                  }`}>
                                   {!isUnlocked ? '🔒 Bloccato' : isCompleted ? '✅ Completato' : '🚀 Entra'}
                                  </span>
                                  {isUnlocked && <span className="text-xl sm:text-2xl" aria-hidden="true">{world.symbol}</span>}
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2">
                                {world.monuments.map(monument => {
                                  const isBuilt = worldProg.rebuiltMonuments.includes(monument.id);
                                  const canAfford = profile ? profile.lightDrops >= monument.cost : false;
                                  return (
                                    <div
                                      key={monument.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sound.playClick();
                                        setAppMonumentModal({
                                          world,
                                          monument,
                                          canAfford,
                                          isErected: isBuilt,
                                        });
                                      }}
                                      className={`rounded-2xl border px-1.5 py-2 text-center sm:px-2 sm:py-2.5 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                                        isBuilt
                                          ? 'bg-gradient-to-br from-amber-100 via-amber-50 to-emerald-100 border-amber-300/90 text-amber-950 shadow-xs ring-1 ring-amber-300/60'
                                          : canAfford
                                            ? 'bg-gradient-to-br from-amber-100 via-yellow-200 to-amber-100 border-amber-500 text-amber-950 shadow-md ring-2 ring-amber-400 animate-monument-glow hover:scale-110'
                                            : 'bg-slate-100/90 border-dashed border-slate-300/90 text-slate-500 shadow-2xs hover:border-amber-400 hover:bg-amber-50/50'
                                      }`}
                                      title={monument.name}
                                    >
                                      <div className={`text-lg leading-none sm:text-xl ${isBuilt ? '' : canAfford ? 'scale-110 drop-shadow-sm' : 'filter grayscale opacity-60'}`}>
                                        {monument.emoji}
                                      </div>
                                      <div className="mt-1 text-[10px] font-black leading-tight sm:text-[11px] flex items-center justify-center gap-0.5">
                                        {isBuilt ? (
                                          <span className="text-emerald-700 font-black">✓ Eretto</span>
                                        ) : canAfford ? (
                                          <span className="text-amber-950 font-black flex items-center gap-0.5 animate-badge-blink">
                                            ✨ 🔓 💧 {monument.cost}
                                          </span>
                                        ) : (
                                          <span className="text-slate-600 font-extrabold flex items-center gap-0.5">
                                            🔒 💧 {monument.cost}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-3 space-y-2 sm:mt-4">
                                <div className="flex items-center justify-between text-[11px] font-bold sm:text-xs">
                                  <span>Passi completati</span>
                                  <span>{stepsCount}/{ALL_STEP_IDS.length}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/70 overflow-hidden sm:h-2">
                                  <div
                                    className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                    style={{ width: `${(stepsCount / ALL_STEP_IDS.length) * 100}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-sky-900/80 sm:text-[11px]">
                                  <span className="min-w-0 truncate">Monumenti: {rebuiltCount}/{world.monuments.length}</span>
                                  {!isUnlocked && <span className="shrink-0">Completa il precedente</span>}
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                sound.playClick();
                                setStoryWorldId(world.id);
                              }}
                              className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-base text-amber-900 shadow-sm transition-all hover:bg-amber-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 cursor-pointer"
                              aria-label={`Apri la storia della tabellina del ${world.id}`}
                              title={`Leggi storia tabellina del ${world.id}`}
                            >
                              <span aria-hidden="true">📖</span>
                            </button>
                            </div>
                          );
                        })}
                      </ResponsiveGrid>
                    </div>
                  )}

                  {/* TAB 2: ALLENAMENTO */}
                  {activeTab === 'training' && (
                    <TrainingHub profile={profile} updateProfile={handleUpdateProfile} compactLayout={isPhoneMode} />
                  )}

                  {/* TAB 4: PARENT AREA */}
                  {activeTab === 'parents' && parentAuthenticated && (
                    <ParentDashboard
                      activeProfiles={activeProfiles}
                      deletedProfiles={deletedProfiles}
                      updateProfileById={handleUpdateProfileById}
                      onSoftDeleteProfile={handleSoftDeleteProfile}
                      onRestoreDeletedProfile={handleRestoreDeletedProfile}
                      onPermanentDeleteProfile={handlePermanentDeleteProfile}
                      compactLayout={isPhoneMode}
                      onChangePIN={handleStartChangePIN}
                      onClose={handleExitParentArea}
                    />
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Right Profile Panel (Quick View) */}
          {selectedWorldId === null && !isPhoneMode && (
            <div className="m-4 hidden md:flex flex-col items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsProfilePanelVisible(prev => !prev)}
                aria-controls="profile-quick-panel"
                aria-expanded={isProfilePanelVisible}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-bold text-sky-950 shadow-sm transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                {isProfilePanelVisible ? 'Nascondi profilo' : 'Mostra profilo'}
              </button>

              <div id="profile-quick-panel" className={`${isProfilePanelVisible ? 'flex' : 'hidden'} w-72 bg-white/20 backdrop-blur-md rounded-[36px] border-4 border-white/40 shadow-2xl p-5 flex-col items-center justify-between text-slate-800`}>
              <div className="w-full space-y-4">
                <p className="text-xs font-black text-sky-950 uppercase tracking-widest text-center">La tua Squadra</p>
                
                {/* Profile Card */}
                <div className="w-full bg-white/40 backdrop-blur-sm rounded-3xl p-4 border-2 border-white/50 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center text-4xl mb-2 border-2 border-sky-200 select-none">
                    {profile.avatar?.emoji || '👦'}
                  </div>
                  <p className="font-black text-sky-950 text-sm">
                    {profile.name}
                  </p>
                  <p className="text-[9px] text-sky-900/60 font-bold uppercase tracking-tighter">Livello {profile.level}</p>
                  <div className="w-full h-1.5 bg-white/50 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(profile.level % 1) * 100 || 65}%` }}></div>
                  </div>
                </div>

                {/* Active Mission */}
                <div className="w-full space-y-2">
                  <p className="text-[9px] font-black text-sky-900/60 uppercase tracking-widest px-2">Missione Attiva</p>
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                    <p className="text-xs font-bold text-sky-950 leading-tight">
                      {(() => {
                        const currentWorldId = profile.unlockedWorlds[profile.unlockedWorlds.length - 1] || 2;
                            return `Abbatti la nebbia della ${withTableIcon(currentWorldId, `Tabellina del ${currentWorldId}`)}!`;
                      })()}
                    </p>
                    <div className="flex gap-1.5 mt-2.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`h-2.5 w-2.5 rounded-full ${i < profile.unlockedWorlds.length ? 'bg-yellow-400 shadow-sm' : 'bg-white/40'}`}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick portal access */}
              <div className="w-full pt-4 border-t border-white/20 flex justify-center">
                <button
                  onClick={() => {
                    sound.playClick();
                    handleAccessParentArea();
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-black text-sky-950/70 hover:text-sky-950 transition-colors cursor-pointer bg-white/40 px-3.5 py-1.5 rounded-full border border-white/50"
                  id="portal-quick-btn"
                >
                  <span>👤</span> PORTALE GENITORI (PIN)
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Global Bottom Navigation bar for mobile screens */}
        {selectedWorldId === null && isPhoneMode && !isParentModeActive && (
          <nav className="bg-white/25 backdrop-blur-md border-t border-white/40 p-1.5 flex justify-around items-center z-10 shadow-xl shrink-0">
           {APP_SIDEBAR_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playClick();
                    if (tab.id === 'parents') {
                      handleAccessParentArea();
                    } else {
                      setActiveTab(tab.id as any);
                    }
                  }}
                  className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-yellow-400 border-b-4 border-yellow-600 text-slate-900 shadow-md scale-105 font-black' 
                      : 'text-slate-700 bg-white/20 hover:bg-white/40'
                  }`}
                  id={`nav-tab-${tab.id}`}
                >
                  <span className="text-lg filter drop-shadow-sm select-none">{tab.emoji}</span>
                  <span className="text-[9px] font-black mt-0.5 tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Parent mode mobile footer */}
        {selectedWorldId === null && isPhoneMode && isParentModeActive && (
          <nav className="bg-white/25 backdrop-blur-md border-t border-white/40 p-2 flex justify-center items-center z-10 shadow-xl shrink-0">
            <button
              type="button"
              onClick={handleExitParentArea}
              className="w-full max-w-xs py-2.5 px-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-black text-sm hover:bg-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
              id="nav-parent-exit-btn"
            >
              <span>🚪</span>
              Esci
            </button>
          </nav>
        )}

      </div>

      {/* Info panel: current work in progress */}
      {!isPhoneMode && (
      <div className="mt-8 max-w-4xl w-full bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-700 shadow-xl space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-1.5">
          <Settings className="w-5 h-5 text-indigo-400" />
          Work in progress
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Stiamo rifinendo Tabellandia passo dopo passo. Qui trovi in modo semplice cosa stiamo migliorando adesso e cosa arriva nei prossimi aggiornamenti.
        </p>

        <div role="list" className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4 text-xs">
          <div role="listitem" className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">1. Cosa stiamo facendo ora</h4>
            <p className="text-slate-300 leading-relaxed font-sans">
              Stiamo rendendo ogni passo più chiaro e veloce: meno confusione, più ritmo di gioco, più aiuto quando serve.
            </p>
            <p className="text-slate-400 leading-relaxed font-sans">
              Obiettivo: far capire le tabelline con serenità, senza frustrazione.
            </p>
          </div>

          <div role="listitem" className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">2. Migliorie in arrivo</h4>
            <p className="text-slate-300 leading-relaxed font-sans">
              Nuove schermate guida, feedback più immediati e passaggi più fluidi tra allenamento, pratico e sfida.
            </p>
            <p className="text-slate-400 leading-relaxed font-sans">
              Ogni update punta a rendere il percorso più semplice da seguire anche per i più piccoli.
            </p>
          </div>

          <div role="listitem" className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">3. Come usiamo premi e progressi</h4>
            <p className="text-slate-300 leading-relaxed font-sans">
              Le monete aiutano a sbloccare opportunità di gioco, mentre le gocce restano la risorsa speciale per far rinascere i regni.
            </p>
            <p className="text-slate-400 leading-relaxed font-sans">
              Così ogni ricompensa ha un significato chiaro e motivante.
            </p>
          </div>

          <div role="listitem" className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">4. Roadmap breve</h4>
            <p className="text-slate-300 leading-relaxed font-sans">
              Prima consolidiamo stabilità e chiarezza didattica, poi espandiamo contenuti, personalizzazioni e strumenti per famiglie.
            </p>
            <p className="text-slate-400 leading-relaxed font-sans">
              Un passo alla volta, con aggiornamenti regolari e misurabili.
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Digits and Mnemonics Guide Modal */}
      <DigitsGuideModal
        isOpen={showDigitsGuideModal}
        onClose={() => setShowDigitsGuideModal(false)}
        onOpenMatchingGame={() => setManualOnboardingGameOpen(true)}
      />

      {showFireworks && (
        <FireworksOverlay onDone={() => setShowFireworks(false)} />
      )}

      {/* Mandatory Onboarding / Practice Game for 10 Digits Associations */}
      <DigitsMatchingGameModal
        isOpen={Boolean(
          profile &&
          !isParentModeActive &&
          (!profile.completedOnboardingGame || manualOnboardingGameOpen) &&
          wizardStep === 0 &&
          !showProfilePicker
        )}
        onComplete={() => {
          if (profile) {
            handleUpdateProfile(p => ({
              ...p,
              completedOnboardingGame: true
            }));
          }
          setManualOnboardingGameOpen(false);
        }}
        onSkip={() => {
          if (profile) {
            handleUpdateProfile(p => ({
              ...p,
              completedOnboardingGame: true
            }));
          }
          setManualOnboardingGameOpen(false);
        }}
      />

      {/* Monument Unlock Confirmation / Insufficient Drops Modal (Main Screen) */}
      {appMonumentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-indigo-100 text-center relative font-sans"
          >
            {appMonumentModal.isErected ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-sm">
                  {appMonumentModal.monument.emoji}
                </div>
                <h3 className="text-base font-black text-indigo-950 mb-1">
                  {appMonumentModal.monument.name}
                </h3>
                <span className="inline-block text-[10px] font-black text-amber-900 bg-amber-200 px-3 py-1 rounded-full mb-3">
                  🏛️ ERETTO CON SUCCESSO ✓
                </span>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  {appMonumentModal.monument.description}
                </p>
                <button
                  type="button"
                  onClick={() => setAppMonumentModal(null)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                >
                  Chiudi
                </button>
              </>
            ) : appMonumentModal.canAfford ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-sm">
                  {appMonumentModal.monument.emoji}
                </div>
                <h3 className="text-base font-black text-indigo-950 mb-1">
                  Erigi {appMonumentModal.monument.name}?
                </h3>
                <div className="inline-flex items-center gap-1 text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full mb-3">
                  💧 Costo: <b>{appMonumentModal.monument.cost} Gocce</b>
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Hai a disposizione <b>{profile?.lightDrops || 0} Gocce di Luce</b>. Vuoi spendere {appMonumentModal.monument.cost} Gocce per erigere questo monumento nel {appMonumentModal.world.title}?
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAppMonumentModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playPowerUp();
                      handleUpdateProfile(p => {
                        const worldProg = p.worldProgress[appMonumentModal.world.id] || {
                          worldId: appMonumentModal.world.id,
                          completedSteps: [],
                          rebuiltMonuments: [],
                          creatureEvolution: 'egg',
                          highScore: 0,
                          stars: 0
                        };
                        const monuments = [...(worldProg.rebuiltMonuments || [])];
                        if (!monuments.includes(appMonumentModal.monument.id)) {
                          monuments.push(appMonumentModal.monument.id);
                        }
                        return {
                          ...p,
                          lightDrops: Math.max(0, p.lightDrops - appMonumentModal.monument.cost),
                          worldProgress: {
                            ...p.worldProgress,
                            [appMonumentModal.world.id]: {
                              ...worldProg,
                              rebuiltMonuments: monuments
                            }
                          }
                        };
                      });
                      setAppMonumentModal(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition-colors active:scale-95"
                  >
                    🏛️ Si, Erigi Ora!
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-3xl shadow-sm">
                  💧
                </div>
                <h3 className="text-base font-black text-rose-950 mb-1">
                  Gocce Insufficienti!
                </h3>
                <div className="inline-flex items-center gap-1 text-xs font-black text-rose-900 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full mb-3">
                  Costo: 💧 {appMonumentModal.monument.cost} (Ne hai {profile?.lightDrops || 0})
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Per erigere <b>{appMonumentModal.monument.name}</b> ti mancano <b>{appMonumentModal.monument.cost - (profile?.lightDrops || 0)} Gocce di Luce</b>.
                  <br /><br />
                  Entra nel Regno e gioca in <b>"Pratico (Avventura)"</b> per sconfiggere la nebbia e raccogliere le gocce!
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAppMonumentModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const wId = appMonumentModal.world.id;
                      setAppMonumentModal(null);
                      setSelectedWorldId(wId);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                  >
                    🛡️ Apri Regno
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {storyWorldId !== null && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setStoryWorldId(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl border border-indigo-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setStoryWorldId(null)}
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Chiudi pannello storia"
            >
              ✕
            </button>
            <div className="pr-8">
              <h3 className="text-base sm:text-lg font-black text-indigo-950">📖 Tabellina del {storyWorldId}</h3>
              <p className="mt-1 text-xs text-slate-600">Indizi narrativi del regno: tabellina e frase, in sequenza.</p>
            </div>

            <div role="list" className="mt-4 grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {(storyEntries.length > 0
                ? storyEntries
                : [{ table: storyWorldId, multiplier: 1, result: storyWorldId, tableLabel: `${storyWorldId}×1 = ${storyWorldId}`, sentence: 'Frase non disponibile' }]).map((entry) => (
                <div
                  key={`${storyWorldId}-${entry.tableLabel}`}
                  role="listitem"
                  className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 shadow-2xs"
                >
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-900">
                    <span aria-label={`Formula mnemonica ${entry.table} ${DIGIT_LABEL_MAP[entry.table] || entry.table} per ${entry.multiplier} ${DIGIT_LABEL_MAP[entry.multiplier] || entry.multiplier} uguale ${getMnemonicLabelForNumber(entry.result)}`}>
                      {renderMnemonicEquation(entry)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-800">
                    {renderStorySentenceWithHighlights(entry.sentence)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Spiegazione Monete / Gocce */}
      <CurrencyInfoModal
        type={currencyModalType}
        isOpen={!!currencyModalType}
        onClose={() => setCurrencyModalType(null)}
        lightDrops={profile?.lightDrops || 0}
        coins={profile?.coins || 0}
      />
    </div>
  );
}
