/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, WorldProgress } from './types';
import { WORLDS_DATA } from './data';
import { sound } from './components/SoundManager';
import AvatarCreator from './components/AvatarCreator';
import ParentDashboard from './components/ParentDashboard';
import WorldDetail from './components/WorldDetail';
import { Sparkles, Trophy, Settings, ShieldCheck, User, Compass, BookOpen, Volume2, Smartphone, RefreshCw, Zap, Music2, X, Coins, Droplets } from 'lucide-react';

const LOCAL_STORAGE_KEY = "tabellandia_save_data_v1";
const AUDIO_SETTINGS_KEY = "tabellandia_audio_settings_v1";

const DEFAULT_PROFILE: UserProfile = {
  name: "Eroe",
  level: 1,
  xp: 0,
  coins: 10, // Starting coins to explore customization
  lightDrops: 0,
  avatar: {
    gender: 'kid1',
    hairStyle: 'Nessuno',
    hairColor: '#f59e0b',
    shirtColor: '#3b82f6',
    pantsColor: '#4b5563',
    hat: 'Nessuno',
    backpack: 'Nessuno',
    mascot: 'Nessuna'
  },
  unlockedWorlds: [2], // Starts with Table of 2 unlocked
  unlockedAccessories: [],
  worldProgress: {
    2: { worldId: 2, completedSteps: [], rebuiltMonuments: [], creatureEvolution: 'egg', highScore: 0, stars: 0 }
  },
  history: []
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'adventure' | 'training' | 'avatar' | 'parents'>('adventure');
  const [selectedWorldId, setSelectedWorldId] = useState<number | null>(null);
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

  // Setup Wizard State
  const [wizardStep, setWizardStep] = useState<number>(0); // 0: not loaded, 1: intro, 2: story, 3: char_create, 4: ready
  const [heroNameInput, setHeroNameInput] = useState<string>("");

  // Load profile on start
  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Fallback for missing properties
        if (!parsed.unlockedAccessories) parsed.unlockedAccessories = [];
        if (!parsed.avatar) parsed.avatar = DEFAULT_PROFILE.avatar;
        setProfile(parsed);
        setWizardStep(0); // already registered
      } catch (e) {
        console.error("Error loading profile", e);
        setProfile(DEFAULT_PROFILE);
        setWizardStep(1); // show tutorial wizard
      }
    } else {
      setProfile(DEFAULT_PROFILE);
      setWizardStep(1); // first-time wizard
    }
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

  // Sync back to local storage helper
  const handleUpdateProfile = (updater: (p: UserProfile) => UserProfile) => {
    setProfile(p => {
      if (!p) return null;
      const updated = updater(p);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
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

  const handleStartWizard = () => {
    sound.playPowerUp();
    setWizardStep(2);
  };

  const handleCreateHero = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = heroNameInput.trim() || "Fulmine";
    sound.playLevelUp();
    handleUpdateProfile(p => ({
      ...p,
      name: finalName
    }));
    setWizardStep(4);
  };

  const handleFinishWizard = () => {
    sound.playPowerUp();
    setWizardStep(0); // Closes wizard
  };

  if (!profile) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm font-bold font-sans">Caricamento di Tabellandia...</p>
        </div>
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
          className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative z-10 flex flex-col justify-between min-h-[400px] border-2 border-indigo-200"
        >
          {wizardStep === 1 && (
            <div className="text-center space-y-6 flex-1 flex flex-col justify-center">
              <div className="text-6xl animate-bounce">🏰</div>
              <div>
                <h1 className="text-3xl font-black text-indigo-950 tracking-wide font-sans">Tabellandia</h1>
                <p className="text-sm text-indigo-700 font-medium mt-1 uppercase tracking-wider">Un Regno di Numeri e Magia</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-sans">
                Benvenuto! Sei pronto ad intraprendere un viaggio straordinario dove le tabelline diventano alleate fedeli, magie e creature leggendarie?
              </p>
              <button
                onClick={handleStartWizard}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                id="wizard-start-btn"
              >
                Inizia l'Avventura!
              </button>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6 flex-1 flex flex-col justify-center text-center">
              <div className="text-5xl">🌪️⚡📓</div>
              <h2 className="text-xl font-bold text-slate-800 font-sans">La Tempesta Matematica</h2>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Un'antica tempesta di vento sconosciuto ha colpito Tabellandia, disperdendo tutti i numeri e rubando l'energia vitale al regno!
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Per riportare la luce, dovrai superare i sentieri delle 9 Terre, sbloccare le magiche Creature Matematiche e ricostruire i grandi monumenti!
              </p>
              <button
                onClick={() => { sound.playClick(); setWizardStep(3); }}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                id="wizard-next-btn"
              >
                Crea il tuo Eroe
              </button>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🎒🛡️</div>
                <h2 className="text-lg font-bold text-slate-800">Scegli il tuo Nome</h2>
                <p className="text-xs text-slate-400 mt-1">Con quale nome ti conosceranno i saggi del regno?</p>
              </div>

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
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                  💡 <strong>Suggerimento:</strong> Potrai personalizzare i vestiti, il colore dei capelli, i cappelli magici e le mascotte nell'Armadio Magico in qualsiasi momento del viaggio!
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                  id="wizard-create-btn"
                >
                  Registra Eroe
                </button>
              </form>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="text-center space-y-6 flex-1 flex flex-col justify-center">
              <div className="text-6xl animate-pulse">🌟✨🐉</div>
              <h2 className="text-xl font-bold text-emerald-600 font-sans">Sei Pronto, {profile.name}!</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto font-sans">
                La foresta del 2 ti sta aspettando. Rispondi correttamente alle domande per guadagnare <strong>Monete 🪙</strong> da spendere in abiti speciali e <strong>Gocce di Luce 💧</strong> per riparare il regno!
              </p>
              <button
                onClick={handleFinishWizard}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                id="wizard-finish-btn"
              >
                Vola a Tabellandia!
              </button>
            </div>
          )}
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
      <div className={`w-full transition-all relative ${
        isPhoneMode 
          ? 'max-w-[430px] w-full h-[min(88vh,860px)] border-[12px] border-slate-800 rounded-[42px] ring-8 ring-slate-800/10 shadow-2xl overflow-hidden bg-gradient-to-b from-[#63C5DA] to-[#92E3A9] flex flex-col text-slate-800'
          : 'max-w-5xl aspect-[4/3] min-h-[600px] border-[14px] border-slate-800 rounded-[36px] ring-8 ring-slate-800/10 shadow-2xl overflow-hidden bg-gradient-to-b from-[#63C5DA] to-[#92E3A9] flex flex-col text-slate-800' 
      }`}>
        
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

        {/* Outer Frame Header */}
        <header className={`bg-white/30 backdrop-blur-md border-b border-white/40 z-10 shadow-lg text-sky-950 ${isPhoneMode ? 'px-4 py-3 flex flex-col gap-3 items-stretch' : 'px-6 py-4 flex items-center justify-between gap-4'}`}>
          <div className={`w-full ${isPhoneMode ? '' : 'max-w-4xl'}`}>
            <div className="w-full flex items-center gap-3 bg-white/40 backdrop-blur-sm p-1.5 rounded-full border-2 border-white/60 shadow-md overflow-hidden flex-nowrap">
              <div className="flex flex-col items-center justify-center w-14 shrink-0">
                <div className="w-11 h-11 bg-orange-400 rounded-full border-2 border-white overflow-hidden shadow-inner flex items-center justify-center text-2xl">
                  🦁
                </div>
                <p className="text-[10px] font-black text-sky-950 uppercase tracking-wider leading-none mt-1">{profile.name}</p>
              </div>

              <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[92px] bg-white/65 rounded-full border border-white/80 px-3 py-1.5">
                <div className="flex items-center gap-1.5 text-amber-600">
                  <Coins className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-wide text-sky-950/60">Monete</span>
                </div>
                <span className="text-xs font-black text-sky-950 leading-none">{profile.coins}</span>
              </div>

              <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[92px] bg-white/65 rounded-full border border-white/80 px-3 py-1.5">
                <div className="flex items-center gap-1.5 text-sky-500">
                  <Droplets className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-wide text-sky-950/60">Gocce</span>
                </div>
                <span className="text-xs font-black text-sky-950 leading-none">{profile.lightDrops}</span>
              </div>

              <div className="ml-auto flex items-center gap-1 bg-white/65 rounded-full border border-white/80 px-2.5 py-1 pr-3">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
                  className={`w-7 h-7 rounded-full border transition-colors cursor-pointer flex items-center justify-center ${
                    musicEnabled
                      ? 'bg-amber-100 border-amber-300 text-amber-700'
                      : 'bg-white/70 border-slate-200 text-slate-400'
                  }`}
                  id="music-toggle"
                  title={musicEnabled ? "Disattiva musica" : "Attiva musica"}
                >
                  <span className="relative flex items-center justify-center">
                    <Music2 className="w-3.5 h-3.5" />
                    {!musicEnabled && <X className="w-2 h-2 absolute -right-1 -bottom-1 stroke-[3.2]" />}
                  </span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); toggleEffects(); }}
                  className={`w-7 h-7 rounded-full border transition-colors cursor-pointer flex items-center justify-center ${
                    effectsEnabled
                      ? 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-600'
                      : 'bg-white/70 border-slate-200 text-slate-400'
                  }`}
                  id="sfx-toggle"
                  title={effectsEnabled ? "Disattiva effetti click" : "Attiva effetti click"}
                >
                  <span className="relative flex items-center justify-center">
                    <Volume2 className="w-3.5 h-3.5" />
                    {!effectsEnabled && <X className="w-2 h-2 absolute -right-1 -bottom-1 stroke-[3.2]" />}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Panel Area */}
        <div className={`flex-1 overflow-hidden flex relative z-10 ${isPhoneMode ? 'flex-col' : 'flex-row'}`}>
          
          {/* Left Sidebar Navigation (Kid-Friendly Rail) */}
          {selectedWorldId === null && !isPhoneMode && (
            <div className="w-24 bg-white/20 backdrop-blur-md rounded-[32px] border-4 border-white/40 flex flex-col items-center py-8 gap-8 shadow-2xl z-20 m-4 md:flex hidden">
              {[
                { id: 'adventure', emoji: '🗺️', color: 'bg-yellow-400 border-yellow-600' },
                { id: 'training', emoji: '🎒', color: 'bg-orange-400 border-orange-600' },
                { id: 'avatar', emoji: '🧑', color: 'bg-emerald-400 border-emerald-600' },
                { id: 'parents', emoji: '🔐', color: 'bg-rose-400 border-rose-600' }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      sound.playClick();
                      setActiveTab(tab.id as any);
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
                      <div className={`text-center ${isPhoneMode ? '' : 'md:text-left'} bg-white/40 backdrop-blur-sm p-4 rounded-3xl border border-white/40 shadow-sm max-w-xl`}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-200/50 px-3 py-1 rounded-full font-sans">
                          Modalità Avventura (Percorso Guidato)
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-sky-950 mt-2 font-sans">
                          Mappa di Tabellandia
                        </h2>
                        <p className="text-xs text-sky-900/80 mt-1 font-medium leading-relaxed">
                          Sconfiggi la tempesta di nebbia superando le terre una ad una. Sblocca il livello successivo completando gli esercizi del precedente.
                        </p>
                      </div>

                      {/* Map staggered layout of 9 worlds styled as a beautiful 3D-feeling interactive island grid */}
                      <div className={`grid ${isPhoneMode ? 'grid-cols-1 gap-5 pb-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-8'} justify-items-center`}>
                        {WORLDS_DATA.map(world => {
                          const isUnlocked = profile.unlockedWorlds.includes(world.id);
                          const worldProg = profile.worldProgress[world.id] || {
                            worldId: world.id,
                            completedSteps: [],
                            rebuiltMonuments: [],
                            creatureEvolution: 'egg',
                            highScore: 0,
                            stars: 0
                          };
                          
                          // Count step progress
                          const stepsCount = worldProg.completedSteps.length;
                          const rebuiltCount = worldProg.rebuiltMonuments.length;
                          const rebuildPercent = Math.round((rebuiltCount / world.monuments.length) * 100);
                          const isCompleted = stepsCount === 6;
                          const isActive = isUnlocked && !isCompleted;

                          return (
                            <div
                              key={world.id}
                              className={`relative flex flex-col items-center justify-between pb-6 group select-none w-full max-w-[240px] transition-all duration-300 ${
                                isUnlocked ? 'hover:-translate-y-2' : 'opacity-60 grayscale'
                              }`}
                              id={`world-card-${world.id}`}
                            >
                              {/* Glow Aura */}
                              {isUnlocked && (
                                <div className={`absolute inset-0 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                                  isActive ? 'animate-pulse opacity-40 bg-sky-300/40' : 'bg-emerald-300/20'
                                }`} />
                              )}

                              {/* Main Island shape mimicking hand-drawn platforms from the design */}
                              <div 
                                onClick={() => {
                                  if (isUnlocked) {
                                    sound.playPowerUp();
                                    setSelectedWorldId(world.id);
                                  }
                                }}
                                className={`w-44 h-44 rounded-[48px] flex flex-col items-center justify-center relative cursor-pointer border-b-8 border-r-8 transition-all active:scale-95 shadow-2xl ${
                                  !isUnlocked 
                                    ? 'bg-stone-400 border-stone-600 text-stone-700'
                                    : isCompleted
                                      ? 'bg-gradient-to-br from-emerald-400 to-green-500 border-green-700 text-white'
                                      : 'bg-gradient-to-br from-sky-400 to-blue-500 border-blue-700 text-white outline outline-4 outline-white outline-offset-2'
                                }`}
                              >
                                {/* Large World Symbol */}
                                <span className="text-6xl filter drop-shadow select-none transform group-hover:scale-110 transition-transform duration-300">
                                  {world.symbol}
                                </span>

                                {/* Mascot Badge overlay */}
                                {isUnlocked && (
                                  <div className="absolute -top-3 -right-3 w-16 h-16 bg-white rounded-full border-4 border-sky-400 shadow-xl flex items-center justify-center text-3xl select-none" title={world.mascotName}>
                                    {world.id === 2 ? '🦊' : world.id === 3 ? '🦕' : world.id === 4 ? '🦉' : world.id === 5 ? '🦖' : '🦁'}
                                  </div>
                                )}

                                {/* Checkmark or Lock badge */}
                                {!isUnlocked ? (
                                  <div className="absolute top-3 left-3 bg-stone-700 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-sm font-bold">🔒</div>
                                ) : isCompleted ? (
                                  <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg font-black text-sm">✓</div>
                                ) : null}
                              </div>

                              {/* World Name / Banner */}
                              <div className="mt-4 bg-white px-5 py-1.5 rounded-full border-2 border-sky-400 shadow-md text-center max-w-[220px]">
                                <p className="text-[10px] font-bold text-sky-500 tracking-wider uppercase">TAVOLA DEL {world.id}</p>
                                <span className="text-xs font-black text-sky-950 leading-tight block">{world.locationName}</span>
                              </div>

                              {/* Progress badge */}
                              {isUnlocked && (
                                <div className="mt-2 bg-yellow-400 text-yellow-950 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-tight shadow-sm">
                                  {isCompleted ? "Completato 🌟" : `In Corso: ${stepsCount}/6`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ALLENAMENTO (Unrestricted escolha libre) */}
                  {activeTab === 'training' && (
                    <div className="space-y-6">
                      <div className={`text-center ${isPhoneMode ? '' : 'md:text-left'} bg-white/40 backdrop-blur-sm p-4 rounded-3xl border border-white/40 shadow-sm max-w-xl`}>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-sans">
                          Allenamento Libero (Nessun Blocco)
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-sky-950 mt-1.5 font-sans">
                          Scegli una Tabellina da Allenare
                        </h2>
                        <p className="text-xs text-sky-900/85 mt-0.5 font-medium leading-relaxed">
                          In questa modalità tutte le tabelline sono sbloccate liberamente per esercitarti senza limitazioni. Ottimo per ripassare le tue debolezze prima delle sfide!
                        </p>
                      </div>

                      <div className={`grid ${isPhoneMode ? 'grid-cols-2 gap-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4'}`}>
                        {WORLDS_DATA.map(world => (
                          <button
                            key={world.id}
                            onClick={() => {
                              sound.playPowerUp();
                              // Temporary force unlock world progress to allow entering Detail
                              handleUpdateProfile(p => {
                                const nextProg = { ...p.worldProgress };
                                if (!nextProg[world.id]) {
                                  nextProg[world.id] = {
                                    worldId: world.id,
                                    completedSteps: [],
                                    rebuiltMonuments: [],
                                    creatureEvolution: 'egg',
                                    highScore: 0,
                                    stars: 0
                                  };
                                }
                                const nextUnlocked = [...p.unlockedWorlds];
                                if (!nextUnlocked.includes(world.id)) nextUnlocked.push(world.id);
                                return {
                                  ...p,
                                  unlockedWorlds: nextUnlocked,
                                  worldProgress: nextProg
                                };
                              });
                              setSelectedWorldId(world.id);
                            }}
                            className={`p-4 rounded-3xl border-4 border-white/60 bg-white/40 backdrop-blur-sm shadow-md flex flex-col items-center justify-center gap-1.5 hover:shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95`}
                            id={`training-world-btn-${world.id}`}
                          >
                            <span className="text-4xl filter drop-shadow select-none">{world.symbol}</span>
                            <span className="text-xs font-black text-sky-950 font-sans">Tavola del {world.id}</span>
                            <span className="text-[10px] text-sky-900/60 font-sans italic font-bold">{world.mascotName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CUSTOMIZE (Hero creation and emporio shop) */}
                  {activeTab === 'avatar' && (
                    <AvatarCreator
                      profile={profile}
                      updateProfile={handleUpdateProfile}
                      compactLayout={isPhoneMode}
                    />
                  )}

                  {/* TAB 4: PARENT AREA */}
                  {activeTab === 'parents' && (
                    <ParentDashboard
                      profile={profile}
                      updateProfile={handleUpdateProfile}
                      compactLayout={isPhoneMode}
                      onClose={() => {
                        sound.playClick();
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
            <div className="w-72 bg-white/20 backdrop-blur-md rounded-[36px] border-4 border-white/40 shadow-2xl p-5 flex flex-col items-center m-4 md:flex hidden justify-between text-slate-800 shrink-0">
              <div className="w-full space-y-4">
                <p className="text-xs font-black text-sky-950 uppercase tracking-widest text-center">La tua Squadra</p>
                
                {/* Creature Card */}
                <div className="w-full bg-white/40 backdrop-blur-sm rounded-3xl p-4 border-2 border-white/50 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center text-4xl mb-2 border-2 border-sky-200 select-none">
                    {profile.avatar.mascot !== 'Nessuna' ? '🦕' : '🦖'}
                  </div>
                  <p className="font-black text-sky-950 text-sm">
                    {profile.avatar.mascot !== 'Nessuna' ? profile.avatar.mascot : 'Triplo-Saur'}
                  </p>
                  <p className="text-[9px] text-sky-900/60 font-bold uppercase tracking-tighter">Grado: Socio d'Avventura</p>
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
                    setActiveTab('parents');
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-black text-sky-950/70 hover:text-sky-950 transition-colors cursor-pointer bg-white/40 px-3.5 py-1.5 rounded-full border border-white/50"
                  id="portal-quick-btn"
                >
                  <span>👤</span> PORTALE GENITORI (PIN)
                </button>
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
              { id: 'avatar', name: 'Armadio & Emporio', emoji: '🧑', label: 'Eroe' },
              { id: 'parents', name: 'Area Genitori', emoji: '🔐', label: 'Genitori' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tab.id as any);
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
            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-relaxed font-sans">
              <li><strong>UI Pattern:</strong> Jetpack Compose nativo con architettura MVI (Model-View-Intent) o MVVM per un flusso dati reattivo, deterministico e pulito.</li>
              <li><strong>DI Engine:</strong> Hilt (Dagger) per gestire l'iniezione delle dipendenze del Database e del modulo di telemetry.</li>
              <li><strong>Local Storage:</strong> Room Database SQL (con migration guidate) pre-popolato con le configurazioni dei mondi e schema QuestionAttempt.</li>
              <li><strong>Cloud Storage:</strong> Firebase Firestore (opzionale) sincronizzato in background tramite WorkManager per salvare le sessioni di gioco.</li>
            </ul>
          </div>

          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">2. Logica di Apprendimento Adattivo</h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-relaxed font-sans">
              <li><strong>Rilevamento Critico:</strong> Algoritmo basato su peso esponenziale degli errori (Leitner System adattivo). Ogni combinazione ha una forza memorica.</li>
              <li><strong>Rallentamento:</strong> Se un'operazione fallisce &ge;3 volte in un intervallo di 15 domande, la coda del quiz inserisce automaticamente la visualizzazione a gruppi (GroupVisualizer).</li>
              <li><strong>Interval Spacing:</strong> Le combinazioni fallite vengono ripresentate con una frequenza di 2, 5 e 10 posizioni successive per consolidare la ritenzione a lungo termine.</li>
            </ul>
          </div>

          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">3. UX per Bambini e Gamification</h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-relaxed font-sans">
              <li><strong>Assenza di Testo:</strong> Istruzioni vocali sintetizzate (TTS Android) e forte codifica a colori e icone (oggetti contabili unici).</li>
              <li><strong>No Penalty:</strong> Nessun punteggio negativo o "vite perse". Errori attivano lo "Scudo della Saggezza" di incoraggiamento visivo.</li>
              <li><strong>Progressione:</strong> Ricompense estetiche esclusive (Emporio) non acquistabili per agganciare la motivazione intrinseca dell'apprendimento.</li>
            </ul>
          </div>

          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-700/50">
            <h4 className="font-extrabold text-indigo-300 font-sans">4. Piano di Sviluppo MVP & Roadmap</h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-relaxed font-sans">
              <li><strong>Sprint 1 (Fondamenta):</strong> Core Engine Matematico, Room DB, Profilo Locale, Asset Grafici base dei Mondi 2, 3, 5.</li>
              <li><strong>Sprint 2 (Adattamento):</strong> Sistema di diagnostica, Scudo di Saggezza, Tracciamento heatmap e PIN Genitori.</li>
              <li><strong>Sprint 3 (Gamification):</strong> Personalizzazione Avatar, Emporio monete, Emozioni delle Creature, Effetti sonori nativi SoundPool.</li>
              <li><strong>Sprint 4 (Evoluzione):</strong> Supporto Cloud Sync, Mondi avanzati (11 e 12), e Localizzazione Multilingua.</li>
            </ul>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
