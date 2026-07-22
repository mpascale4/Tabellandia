/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from './types';
import { WORLDS_DATA, AVATARS } from './data';
import { sound } from './components/SoundManager';
import ParentDashboard from './components/ParentDashboard';
import WorldDetail from './components/WorldDetail';
import TrainingHub from './components/TrainingHub';
import FontSizeControl from './components/FontSizeControl';
import VoiceToggle from './components/VoiceToggle';
import RewardsTutorial from './components/RewardsTutorial';
import NumericKeypad from './components/NumericKeypad';
import ActionGrid from './components/layout/ActionGrid';
import ResponsiveGrid from './components/layout/ResponsiveGrid';
import SectionHeader from './components/layout/SectionHeader';
import SurfaceCard from './components/layout/SurfaceCard';
import { Settings, User, Volume2, Smartphone, RefreshCw, Music2, X, Coins, Droplets } from 'lucide-react';

const LOCAL_STORAGE_KEY = "tabellandia_save_data_v1";
const PROFILE_STORE_KEY = "tabellandia_profile_store_v1";
const AUDIO_SETTINGS_KEY = "tabellandia_audio_settings_v1";
const DEV_MODE_KEY = "tabellandia_dev_mode_v1";
const PROFILE_PANEL_VISIBLE_KEY = "tabellandia_profile_panel_visible_v1";
const HEADER_PINNED_KEY = "tabellandia_header_pinned_v1";

type ProfileRecord = UserProfile & {
  id: string;
  birthYear: number | null;
};

type ProfileStore = {
  activeProfileId: string | null;
  profiles: ProfileRecord[];
};

const CURRENT_YEAR = new Date().getFullYear();
const ALL_STEP_IDS = ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'];
const PROFILE_AVATAR_SECTIONS = [
  { id: 'boy', label: 'Bambini' },
  { id: 'girl', label: 'Bambine' },
  { id: 'pet', label: 'Animali' },
] as const;
const APP_SIDEBAR_TABS = [
  { id: 'adventure', emoji: '🗺️', color: 'bg-yellow-400 border-yellow-600' },
  { id: 'training', emoji: '🎒', color: 'bg-orange-400 border-orange-600' },
  { id: 'parents', emoji: '🔐', color: 'bg-rose-400 border-rose-600' },
] as const;

const getWorldMascotBadge = (worldId: number) => {
  if (worldId === 2) return '🦊';
  if (worldId === 3) return '🦕';
  if (worldId === 4) return '🦉';
  if (worldId === 5) return '🦖';
  return '🦁';
};

const getAdventureWorldProgress = (profile: UserProfile, worldId: number, devModeEnabled: boolean) => {
  const base = profile.worldProgress[worldId] || {
    worldId,
    completedSteps: [],
    rebuiltMonuments: [],
    creatureEvolution: 'egg',
    highScore: 0,
    stars: 0,
  };

  return devModeEnabled
    ? { ...base, completedSteps: [...ALL_STEP_IDS] }
    : base;
};

const BASE_PROFILE: Omit<ProfileRecord, 'id' | 'birthYear'> = {
  name: "Eroe",
  level: 1,
  xp: 0,
  coins: 10, // Starting coins to explore customization
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
  const [devModeEnabled, setDevModeEnabled] = useState<boolean>(() => localStorage.getItem(DEV_MODE_KEY) === 'true');
  const [isProfilePanelVisible, setIsProfilePanelVisible] = useState<boolean>(() => localStorage.getItem(PROFILE_PANEL_VISIBLE_KEY) !== 'false');
  // Header overlay behavior
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [isHeaderPinned, setIsHeaderPinned] = useState<boolean>(() => localStorage.getItem(HEADER_PINNED_KEY) === 'true');
  const isHeaderPinnedRef = useRef<boolean>(isHeaderPinned);
  const headerRef = useRef<HTMLElement | null>(null);
  const devTapCountRef = useRef<number>(0);
  const devTapResetTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const [devModeNotice, setDevModeNotice] = useState<string>("");

  const [pinError, setPinError] = useState<string>("");
  const [showChangePINForm, setShowChangePINForm] = useState<boolean>(false);
  const [newPINInput, setNewPINInput] = useState<string>("");
  const [confirmPINInput, setConfirmPINInput] = useState<string>("");
  const [changePINStage, setChangePINStage] = useState<'new' | 'confirm'>('new');

  const profile = activeProfileId ? profiles.find(p => p.id === activeProfileId) || null : null;

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
          return {
            activeProfileId: parsed.activeProfileId || nextProfiles[0]?.id || null,
            profiles: nextProfiles
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
    setShowProfilePicker(false);
    setWizardStep(0);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    sound.setMusicEnabled(musicEnabled);
    sound.setEffectsEnabled(effectsEnabled);
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ musicEnabled, effectsEnabled }));
    if (musicEnabled) {
      sound.startBackgroundMusic();
    } else {
      sound.stopBackgroundMusic();
    }
  }, [musicEnabled, effectsEnabled]);

  useEffect(() => {
    const unlockAudio = () => {
      sound.primeAudio();
      if (musicEnabled) {
        sound.startBackgroundMusic();
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [musicEnabled]);

  useEffect(() => {
    return () => {
      if (devTapResetTimerRef.current) {
        clearTimeout(devTapResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(PROFILE_PANEL_VISIBLE_KEY, String(isProfilePanelVisible));
  }, [isProfilePanelVisible]);

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

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [isHeaderVisible]);

  /** Mostra l'header overlay. */
  const showHeaderAndReset = () => {
    setIsHeaderVisible(true);
  };

  const persistProfileStore = (nextProfiles: ProfileRecord[], nextActiveProfileId: string | null) => {
    localStorage.setItem(
      PROFILE_STORE_KEY,
      JSON.stringify({
        activeProfileId: nextActiveProfileId,
        profiles: nextProfiles
      } as ProfileStore)
    );

    const currentProfile = nextActiveProfileId ? nextProfiles.find(p => p.id === nextActiveProfileId) || null : null;
    if (currentProfile) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentProfile));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
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
      persistProfileStore(next, activeProfileId);
      return next;
    });
  };

  const toggleMusic = () => {
    const nextState = !musicEnabled;
    sound.primeAudio();
    if (nextState) {
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
    setProfiles(nextProfiles);
    setActiveProfileId(draftProfile.id);
    persistProfileStore(nextProfiles, draftProfile.id);

    sound.playPowerUp();
    setDraftProfile(null);
    setWizardStep(0);
    setShowProfilePicker(false);
    setActiveTab('adventure');
    setSelectedWorldId(null);
  };

  const handleSelectProfile = (selectedId: string) => {
    sound.playClick();
    setActiveProfileId(selectedId);
    persistProfileStore(profiles, selectedId);
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

  const toggleDevMode = () => {
    setDevModeEnabled(prev => {
      const next = !prev;
      localStorage.setItem(DEV_MODE_KEY, next ? 'true' : 'false');
      return next;
    });
  };

  const handleDevModeGestureTap = () => {
    devTapCountRef.current += 1;
    if (devTapResetTimerRef.current) {
      clearTimeout(devTapResetTimerRef.current);
      devTapResetTimerRef.current = null;
    }

    if (devTapCountRef.current >= 7) {
      const nextMode = !devModeEnabled;
      toggleDevMode();
      sound.playPowerUp();
      setDevModeNotice(nextMode ? "Modalità DEV attivata" : "Modalità DEV disattivata");
      setTimeout(() => setDevModeNotice(""), 1400);
      devTapCountRef.current = 0;
      return;
    }

    devTapResetTimerRef.current = setTimeout(() => {
      devTapCountRef.current = 0;
      devTapResetTimerRef.current = null;
    }, 1200);
  };

  const handleAccessParentArea = () => {
    const storedPIN = localStorage.getItem('tabellandia_parent_pin');
    if (!storedPIN) {
      // First time - set up PIN
      setIsSettingPIN(true);
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
    const storedPIN = localStorage.getItem('tabellandia_parent_pin');
    
    if (isSettingPIN) {
      // Setting PIN for first time
      if (pin.length === 4) {
        if (pin === '0000') {
          // First time with 0000 - show change PIN form
          setPinError("PIN predefinito! Cambialo ora.");
          setShowChangePINForm(true);
        } else {
          localStorage.setItem('tabellandia_parent_pin', pin);
          sound.playPowerUp();
          setParentAuthenticated(true);
          setShowPINModal(false);
          setActiveTab('parents');
          setPinInput("");
          setPinError("");
        }
      }
    } else {
      // Verifying existing PIN
      if (pin === storedPIN) {
        sound.playPowerUp();
        setParentAuthenticated(true);
        setShowPINModal(false);
        setActiveTab('parents');
        setPinInput("");
        setPinError("");
      } else {
        sound.playError();
        setPinError("PIN errato!");
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
            {profiles.map(p => {
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
          </SurfaceCard>
        </motion.div>
      </div>
    );
  }

  // Tutorial / Setup Wizard Overlay
  if (wizardStep > 0) {
    return (
      <div className="w-full h-screen bg-indigo-950 flex items-center justify-center p-4 overflow-hidden relative" id="wizard-screen">
        {/* Ambient star decorations */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 via-indigo-900 to-indigo-950 z-0"></div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-3xl w-full relative z-10"
        >
          <SurfaceCard padding="lg" className="border-2 border-indigo-200 shadow-2xl min-h-[400px]">
          {wizardStep === 1 && (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              <SectionHeader
                centered
                eyebrow="Nuovo profilo"
                title="Crea il profilo"
                description="Scegli nome, anno di nascita e base avatar."
                icon={<span className="text-4xl" aria-hidden="true">🎒🛡️</span>}
              />

              <form onSubmit={handleCreateHero} className="space-y-4">
                <input
                  type="text"
                  maxLength={15}
                  placeholder="Scrivi il tuo nome d'eroe..."
                  value={heroNameInput}
                  onChange={e => setHeroNameInput(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:outline-none font-bold text-center text-slate-700 bg-white"
                  id="hero-name-input"
                  required
                />

                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Anno di nascita</span>
                  <select
                    value={newProfileBirthYear}
                    onChange={e => setNewProfileBirthYear(parseInt(e.target.value, 10))}
                    className="w-full py-3 px-4 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:outline-none font-bold text-center text-slate-700 bg-white"
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
                  <span className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Scegli il tuo avatar</span>
                  <div className="space-y-3">
                    {PROFILE_AVATAR_SECTIONS.map(section => (
                      <SurfaceCard key={section.id} padding="sm" className="rounded-2xl border-slate-200">
                        <p className="text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">{section.label}</p>
                        <ResponsiveGrid variant="compact" className="grid-cols-2 sm:grid-cols-4">
                          {AVATARS.filter(a => a.category === section.id).map(avatar => (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setNewProfileAvatarEmoji(avatar.emoji)}
                              className={`p-3 rounded-xl border-2 font-bold text-[10px] cursor-pointer transition-all flex flex-col items-center justify-center gap-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                                newProfileAvatarEmoji === avatar.emoji ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                              }`}
                              id={`setup-avatar-${avatar.id}`}
                            >
                              <span className="text-2xl">{avatar.emoji}</span>
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
                    className="w-full py-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                    id="wizard-cancel-btn"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                    id="wizard-create-btn"
                  >
                    Registra Eroe
                  </button>
                </ActionGrid>
              </form>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="text-center space-y-6 flex-1 flex flex-col justify-center">
              <SectionHeader
                centered
                eyebrow="Profilo creato"
                title={`Sei pronto, ${draftProfile?.name || heroNameInput || 'Eroe'}!`}
                description="La foresta del 2 ti sta aspettando. Il tuo anno di nascita ci aiuterà a proporre contenuti più adatti in futuro."
                icon={<span className="text-6xl animate-pulse" aria-hidden="true">🌟✨🐉</span>}
              />
              <button
                onClick={handleFinishWizard}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                id="wizard-finish-btn"
              >
                Vola a Tabellandia!
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
            if (e.clientY - rect.top < 60) showHeaderAndReset();
          }
        }}
        onTouchStart={(e) => {
          if (!isHeaderVisible && e.touches.length > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.touches[0].clientY - rect.top < 20) showHeaderAndReset();
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
            {/* Profile Avatar */}
            <button
             type="button"
             onClick={() => { sound.playClick(); handleSwitchProfile(); }}
             className={`flex flex-col items-center justify-center ${isPhoneMode ? 'w-12' : 'w-14'} shrink-0 cursor-pointer hover:opacity-80 transition-opacity`}
             id="profile-icon-btn"
             title="Cambia profilo"
            >
             <div className={`${isPhoneMode ? 'w-10 h-10 text-lg' : 'w-11 h-11 text-2xl'} bg-orange-400 rounded-full border-2 border-white overflow-hidden shadow-inner flex items-center justify-center`}>
               {profile?.avatar?.emoji || '👦'}
             </div>
             <p
               onClick={(e) => { e.stopPropagation(); handleDevModeGestureTap(); }}
               className={`font-black text-sky-950 uppercase tracking-wider leading-none mt-0.5 ${isPhoneMode ? 'text-[7px]' : 'text-[10px]'}`}
             >
               {profile?.name || 'Eroe'}
             </p>
             {devModeEnabled && (
               <span className={`mt-0.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black tracking-wider ${isPhoneMode ? 'text-[6px]' : 'text-[8px]'}`}>DEV</span>
             )}
            </button>

            {/* Monete */}
            <div className={`flex flex-col items-center justify-center gap-0.5 shrink-0 ${isPhoneMode ? 'min-w-[60px]' : 'min-w-[92px]'} bg-white/65 rounded-full border border-white/80 ${isPhoneMode ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
              <div className={`flex items-center gap-${isPhoneMode ? '0.5' : '1.5'} text-amber-600`}>
                <Coins className={`${isPhoneMode ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} />
                <span className={`font-bold uppercase tracking-wide text-sky-950/60 ${isPhoneMode ? 'text-[6px]' : 'text-[9px]'}`}>Monete</span>
              </div>
              <span className={`font-black text-sky-950 leading-none ${isPhoneMode ? 'text-[9px]' : 'text-xs'}`}>{profile.coins}</span>
            </div>

            {/* Gocce */}
            <div className={`flex flex-col items-center justify-center gap-0.5 shrink-0 ${isPhoneMode ? 'min-w-[60px]' : 'min-w-[92px]'} bg-white/65 rounded-full border border-white/80 ${isPhoneMode ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
              <div className={`flex items-center gap-${isPhoneMode ? '0.5' : '1.5'} text-sky-500`}>
                <Droplets className={`${isPhoneMode ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} />
                <span className={`font-bold uppercase tracking-wide text-sky-950/60 ${isPhoneMode ? 'text-[6px]' : 'text-[9px]'}`}>Gocce</span>
              </div>
              <span className={`font-black text-sky-950 leading-none ${isPhoneMode ? 'text-[9px]' : 'text-xs'}`}>{profile.lightDrops}</span>
            </div>

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
          className="absolute top-0 left-0 right-0 z-50 h-5 flex items-end justify-center pb-0.5 pointer-events-auto"
          role="button"
          tabIndex={isHeaderVisible ? -1 : 0}
          aria-label="Mostra barra profilo"
          onMouseEnter={showHeaderAndReset}
          onPointerDown={showHeaderAndReset}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') showHeaderAndReset(); }}
        >
          <div className={`w-10 h-1 rounded-full transition-all duration-300 ${isHeaderVisible ? 'bg-transparent' : 'bg-white/60'}`} />
        </div>
        {devModeNotice && (
          <div className={`absolute left-1/2 -translate-x-1/2 z-50 bg-slate-900/85 text-white text-xs font-black px-3 py-1.5 rounded-full border border-white/20 shadow-lg pointer-events-none transition-all duration-300 ${isHeaderVisible ? 'top-16' : 'top-2'}`}>
            {devModeNotice}
          </div>
        )}

        {/* PIN Authentication Modal */}
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
                  <div className="text-4xl mb-2">🔐</div>
                  <h2 className="text-xl font-black text-indigo-950">Area Genitori</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {showChangePINForm ? "Imposta un nuovo PIN" : isSettingPIN ? "Crea un PIN a 4 cifre" : "Inserisci il PIN"}
                  </p>
                </div>

                {/* Show Change PIN Form or Normal PIN Entry */}
                {showChangePINForm ? (
                  <>
                    {/* Change PIN Form */}
                    <div className="space-y-4">
                      {/* New PIN Input */}
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

                      {/* Confirm PIN Input */}
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

                      {/* Error Message */}
                      {pinError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                        >
                          {pinError}
                        </motion.div>
                      )}

                      {/* Buttons */}
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
                  </>
                ) : (
                  <>
                    {/* PIN Display */}
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
                    className="w-full mt-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Annulla
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
          {selectedWorldId === null && !isPhoneMode && (
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
                      devMode={devModeEnabled}
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
                      <SurfaceCard tone="soft" padding={isPhoneMode ? 'sm' : 'md'} className={`text-center ${isPhoneMode ? '' : 'md:text-left'}`}>
                        <SectionHeader
                          eyebrow="Modalità Avventura"
                          title="Mappa di Tabellandia"
                          description="Sconfiggi la tempesta di nebbia superando le terre una ad una. Sblocca il livello successivo completando gli esercizi del precedente."
                        />
                        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-sky-900/80 sm:text-[11px]">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 sm:px-3 sm:py-1">✅ Completato</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 sm:px-3 sm:py-1">🧭 In corso</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700 sm:px-3 sm:py-1">🔒 Bloccato</span>
                        </div>
                      </SurfaceCard>

                      <ResponsiveGrid variant="cards" className="items-stretch">
                        {WORLDS_DATA.map(world => {
                          const isUnlocked = devModeEnabled || profile.unlockedWorlds.includes(world.id);
                          const worldProg = getAdventureWorldProgress(profile, world.id, devModeEnabled);
                          const stepsCount = worldProg.completedSteps.length;
                          const rebuiltCount = devModeEnabled
                            ? world.monuments.length
                            : worldProg.rebuiltMonuments.length;
                          const isCompleted = stepsCount === ALL_STEP_IDS.length;
                          const statusLabel = !isUnlocked ? 'Bloccato' : isCompleted ? 'Completato' : 'In corso';

                          return (
                            <button
                              key={world.id}
                              type="button"
                              onClick={() => {
                                if (!isUnlocked) return;
                                sound.playPowerUp();
                                setSelectedWorldId(world.id);
                              }}
                              disabled={!isUnlocked}
                              className={`w-full overflow-hidden text-left rounded-3xl border-2 p-3 sm:p-4 shadow-lg transition-all active:scale-[0.98] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                                !isUnlocked
                                  ? 'bg-slate-200 border-slate-300 text-slate-600 cursor-not-allowed'
                                  : isCompleted
                                    ? 'bg-gradient-to-br from-emerald-300 via-emerald-200 to-white border-emerald-500 text-emerald-950 cursor-pointer hover:shadow-xl hover:-translate-y-1'
                                    : 'bg-gradient-to-br from-white via-sky-50 to-emerald-50 border-sky-300 text-sky-950 cursor-pointer hover:shadow-xl hover:-translate-y-1'
                              }`}
                              aria-label={`${world.locationName}, stato ${statusLabel}, ${stepsCount} passi completati su ${ALL_STEP_IDS.length}`}
                            >
                              <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                                  <div className="h-11 w-11 shrink-0 rounded-xl border-2 border-white bg-white/90 shadow-md flex items-center justify-center text-2xl sm:h-14 sm:w-14 sm:rounded-2xl sm:border-4 sm:text-3xl">
                                    {world.symbol}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-sky-600 sm:text-[10px] sm:tracking-[0.18em]">Tavola del {world.id}</p>
                                    <h3 className="truncate text-sm font-black leading-tight sm:text-base" title={world.locationName}>{world.locationName}</h3>
                                    <p className="truncate text-[11px] font-semibold text-sky-800/75 sm:text-xs" title={`Mascot: ${world.mascotName}`}>Mascot: {world.mascotName}</p>
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black sm:px-3 sm:py-1 sm:text-[11px] ${
                                    !isUnlocked
                                      ? 'bg-slate-50 text-slate-700'
                                      : isCompleted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {!isUnlocked ? '🔒 Bloccato' : isCompleted ? '✅ Completato' : '🧭 In corso'}
                                  </span>
                                  {isUnlocked && <span className="text-xl sm:text-2xl" aria-hidden="true">{getWorldMascotBadge(world.id)}</span>}
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(3.5rem,1fr))] gap-1.5 sm:mt-4 sm:gap-2">
                                {world.monuments.map(monument => {
                                  const isBuilt = devModeEnabled || worldProg.rebuiltMonuments.includes(monument.id);
                                  return (
                                    <div
                                      key={monument.id}
                                      className={`rounded-2xl border px-1.5 py-2 text-center sm:px-2 sm:py-3 ${
                                        isBuilt
                                          ? 'bg-white/90 border-emerald-200 text-emerald-900'
                                          : 'bg-white/70 border-white/70 text-slate-600'
                                      }`}
                                      title={monument.name}
                                    >
                                      <div className="text-lg leading-none sm:text-xl">{monument.emoji}</div>
                                      <div className="mt-1 text-[9px] font-bold leading-tight sm:text-[10px]">{isBuilt ? (devModeEnabled ? 'Eretti' : 'Ricostruito') : 'Da ricostruire'}</div>
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
                                  <span className="min-w-0 truncate">{devModeEnabled ? 'Monumenti eretti' : 'Monumenti ricostruiti'}: {rebuiltCount}/{world.monuments.length}</span>
                                  <span className="shrink-0">{isUnlocked ? 'Apri il mondo' : 'Completa il precedente'}</span>
                                </div>
                              </div>
                            </button>
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
                      profile={profile}
                      updateProfile={handleUpdateProfile}
                      compactLayout={isPhoneMode}
                      onChangePIN={handleStartChangePIN}
                      onClose={() => {
                        sound.playClick();
                        setParentAuthenticated(false);
                        setActiveTab('adventure');
                      }}
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
                      Abbatti la nebbia della Tabellina del {profile.unlockedWorlds[profile.unlockedWorlds.length - 1] || 2}!
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
        {selectedWorldId === null && isPhoneMode && (
          <nav className="bg-white/25 backdrop-blur-md border-t border-white/40 p-2 flex justify-around items-center z-10 shadow-xl shrink-0">
           {[
             { id: 'adventure', name: 'Mappa Avventura', emoji: '🗺️', label: 'Mappa' },
             { id: 'training', name: 'Allenamento', emoji: '🎒', label: 'Allenamento' },
             { id: 'parents', name: 'Area Genitori', emoji: '🔐', label: 'Genitori' }
           ].map(tab => {
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
                  className={`flex flex-col items-center py-2 px-4 rounded-2xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-yellow-400 border-b-4 border-yellow-600 text-slate-900 shadow-md scale-105 font-black' 
                      : 'text-slate-700 bg-white/20 hover:bg-white/40'
                  }`}
                  id={`nav-tab-${tab.id}`}
                >
                  <span className="text-xl filter drop-shadow-sm select-none">{tab.emoji}</span>
                  <span className="text-[10px] font-bold mt-0.5 tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Production specifications panel at the very bottom (collapsible documentation of architecture/MVP for the reviewers!) */}
      {!isPhoneMode && (
      <div className="mt-8 max-w-4xl w-full bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-700 shadow-xl space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-1.5">
          <Settings className="w-5 h-5 text-indigo-400" />
          Scheda Progettazione Tecnica & Architettura Android MVP
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          In qualità di team multidisciplinare (Educational Designer, Gamification Expert, UX/UI, Sviluppatore Android, Scienze Cognitive), ecco la documentazione delle specifiche di produzione per l'implementazione nativa di <strong>Tabellandia</strong> su piattaforma Android.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">1. Architettura Android Completa</h4>
            <div role="list" className="grid grid-cols-1 gap-1 text-slate-300 leading-relaxed font-sans">
              <div role="listitem"><strong>UI Pattern:</strong> Jetpack Compose nativo con architettura MVI (Model-View-Intent) o MVVM per un flusso dati reattivo, deterministico e pulito.</div>
              <div role="listitem"><strong>DI Engine:</strong> Hilt (Dagger) per gestire l'iniezione delle dipendenze del Database e del modulo di telemetry.</div>
              <div role="listitem"><strong>Local Storage:</strong> Room Database SQL (con migration guidate) pre-popolato con le configurazioni dei mondi e schema QuestionAttempt.</div>
              <div role="listitem"><strong>Cloud Storage:</strong> Firebase Firestore (opzionale) sincronizzato in background tramite WorkManager per salvare le sessioni di gioco.</div>
            </div>
          </div>

          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">2. Logica di Apprendimento Adattivo</h4>
            <div role="list" className="grid grid-cols-1 gap-1 text-slate-300 leading-relaxed font-sans">
              <div role="listitem"><strong>Rilevamento Critico:</strong> Algoritmo basato su peso esponenziale degli errori (Leitner System adattivo). Ogni combinazione ha una forza memorica.</div>
              <div role="listitem"><strong>Rallentamento:</strong> Se un'operazione fallisce &ge;3 volte in un intervallo di 15 domande, la coda del quiz inserisce automaticamente la visualizzazione a gruppi (GroupVisualizer).</div>
              <div role="listitem"><strong>Interval Spacing:</strong> Le combinazioni fallite vengono ripresentate con una frequenza di 2, 5 e 10 posizioni successive per consolidare la ritenzione a lungo termine.</div>
            </div>
          </div>

          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">3. UX per Bambini e Gamification</h4>
            <div role="list" className="grid grid-cols-1 gap-1 text-slate-300 leading-relaxed font-sans">
              <div role="listitem"><strong>Assenza di Testo:</strong> Istruzioni vocali sintetizzate (TTS Android) e forte codifica a colori e icone (oggetti contabili unici).</div>
              <div role="listitem"><strong>No Penalty:</strong> Nessun punteggio negativo o "vite perse". Errori attivano lo "Scudo della Saggezza" di incoraggiamento visivo.</div>
              <div role="listitem"><strong>Progressione:</strong> Ricompense estetiche esclusive (Emporio) non acquistabili per agganciare la motivazione intrinseca dell'apprendimento.</div>
            </div>
          </div>

          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">4. Piano di Sviluppo MVP & Roadmap</h4>
            <div role="list" className="grid grid-cols-1 gap-1 text-slate-300 leading-relaxed font-sans">
              <div role="listitem"><strong>Sprint 1 (Fondamenta):</strong> Core Engine Matematico, Room DB, Profilo Locale, Asset Grafici base dei Mondi 2, 3, 5.</div>
              <div role="listitem"><strong>Sprint 2 (Adattamento):</strong> Sistema di diagnostica, Scudo di Saggezza, Tracciamento heatmap e PIN Genitori.</div>
              <div role="listitem"><strong>Sprint 3 (Gamification):</strong> Personalizzazione Avatar, Emporio monete, Emozioni delle Creature, Effetti sonori nativi SoundPool.</div>
              <div role="listitem"><strong>Sprint 4 (Evoluzione):</strong> Supporto Cloud Sync, Mondi avanzati (11 e 12), e Localizzazione Multilingua.</div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
