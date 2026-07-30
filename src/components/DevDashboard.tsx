import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  RotateCcw, 
  Unlock, 
  CheckCircle2, 
  Lock, 
  Coins, 
  Droplets, 
  Sparkles, 
  UserCheck, 
  Layers
} from 'lucide-react';
import { UserProfile } from '../types';
import { WORLDS_DATA } from '../data';

interface DevDashboardProps {
  activeProfiles: UserProfile[];
  currentProfile: UserProfile | null;
  updateProfileById: (id: string, updater: (p: UserProfile) => UserProfile) => void;
  onSelectProfile: (id: string) => void;
  devModeEnabled: boolean;
  onDisableDevMode: () => void;
  compactLayout?: boolean;
  onClose: () => void;
}

const ALL_STEP_IDS = ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'];

export default function DevDashboard({
  activeProfiles,
  currentProfile,
  updateProfileById,
  onSelectProfile,
  devModeEnabled,
  onDisableDevMode,
  compactLayout = false,
  onClose
}: DevDashboardProps) {

  if (!currentProfile) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center">
        <p className="text-slate-600 font-bold">Nessun profilo selezionato.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">
          Chiudi
        </button>
      </div>
    );
  }

  const profileId = currentProfile.id!;

  // Handlers per le valute
  const handleResetCurrency = () => {
    updateProfileById(profileId, p => ({
      ...p,
      coins: 0,
      lightDrops: 0
    }));
  };

  const handleAddCoins = (amount: number) => {
    updateProfileById(profileId, p => ({
      ...p,
      coins: Math.max(0, p.coins + amount)
    }));
  };

  const handleAddDrops = (amount: number) => {
    updateProfileById(profileId, p => ({
      ...p,
      lightDrops: Math.max(0, p.lightDrops + amount)
    }));
  };

  // Handlers per le tappe/mondi (x2 - x9)
  const isWorldUnlocked = (worldId: number) => {
    return currentProfile.unlockedWorlds.includes(worldId);
  };

  const toggleUnlockWorld = (worldId: number) => {
    updateProfileById(profileId, p => {
      const exists = p.unlockedWorlds.includes(worldId);
      let nextWorlds = exists 
        ? p.unlockedWorlds.filter(w => w !== worldId)
        : [...p.unlockedWorlds, worldId].sort((a, b) => a - b);
      
      // Assicuriamoci che almeno la tazza 2 rimanga sbloccata
      if (nextWorlds.length === 0) {
        nextWorlds = [2];
      }

      return {
        ...p,
        unlockedWorlds: nextWorlds
      };
    });
  };

  const completeSingleWorld = (worldId: number) => {
    const worldData = WORLDS_DATA.find(w => w.id === worldId);
    const monumentIds = worldData ? worldData.monuments.map(m => m.id) : [];

    updateProfileById(profileId, p => {
      const nextWorlds = p.unlockedWorlds.includes(worldId)
        ? p.unlockedWorlds
        : [...p.unlockedWorlds, worldId].sort((a, b) => a - b);

      const existingProg = p.worldProgress[worldId] || {
        worldId,
        completedSteps: [],
        rebuiltMonuments: [],
        creatureEvolution: 'egg',
        highScore: 0,
        stars: 0
      };

      return {
        ...p,
        unlockedWorlds: nextWorlds,
        worldProgress: {
          ...p.worldProgress,
          [worldId]: {
            ...existingProg,
            completedSteps: [...ALL_STEP_IDS],
            sfidaUnlocked: true,
            rebuiltMonuments: monumentIds.length > 0 ? monumentIds : existingProg.rebuiltMonuments,
            stars: 3,
            creatureEvolution: 'adult'
          }
        }
      };
    });
  };

  const unlockAllWorlds = () => {
    const allWorldIds = WORLDS_DATA.map(w => w.id); // 2..9
    updateProfileById(profileId, p => ({
      ...p,
      unlockedWorlds: allWorldIds
    }));
  };

  const completeAllWorlds = () => {
    const allWorldIds = WORLDS_DATA.map(w => w.id); // 2..9
    updateProfileById(profileId, p => {
      const newWorldProgress = { ...p.worldProgress };

      WORLDS_DATA.forEach(world => {
        const monumentIds = world.monuments.map(m => m.id);
        const existingProg = newWorldProgress[world.id] || {
          worldId: world.id,
          completedSteps: [],
          rebuiltMonuments: [],
          creatureEvolution: 'egg',
          highScore: 0,
          stars: 0
        };

        newWorldProgress[world.id] = {
          ...existingProg,
          completedSteps: [...ALL_STEP_IDS],
          sfidaUnlocked: true,
          rebuiltMonuments: monumentIds,
          stars: 3,
          creatureEvolution: 'adult'
        };
      });

      return {
        ...p,
        unlockedWorlds: allWorldIds,
        worldProgress: newWorldProgress
      };
    });
  };

  const resetAllWorldsToInitial = () => {
    updateProfileById(profileId, p => ({
      ...p,
      unlockedWorlds: [2]
    }));
  };

  return (
    <div className={`w-full max-w-full overflow-x-hidden overflow-y-auto bg-slate-900 text-slate-100 ${compactLayout ? 'p-2.5 sm:p-4' : 'p-4 sm:p-6'} rounded-3xl border-2 border-purple-500/40 shadow-2xl flex flex-col gap-4 sm:gap-6`}>
      
      {/* Header Sezione DEV */}
      <div className="flex flex-wrap items-center justify-between bg-slate-800/90 p-3 sm:p-4 rounded-2xl border border-purple-500/30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-purple-500/20 shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-white truncate">Modalità DEV</h2>
            <p className="text-[11px] sm:text-xs text-slate-400 leading-tight">Pannello di controllo per tappe e risorse</p>
          </div>
        </div>
      </div>

      {/* Profilo Attivo Selection */}
      <div className="bg-slate-800/80 p-3.5 sm:p-4 rounded-2xl border border-purple-500/30 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-purple-300 uppercase tracking-wider">
              Seleziona Profilo da Modificare
            </h3>
          </div>
          {currentProfile && (
            <span className="text-xs font-bold text-slate-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-500/30">
              In uso: <b className="text-purple-300">{currentProfile.avatar?.emoji || '👦'} {currentProfile.name}</b>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {activeProfiles.map(p => {
            const isSelected = p.id === currentProfile?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => p.id && onSelectProfile(p.id)}
                className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
                  isSelected
                    ? 'bg-purple-600/40 border-purple-400 text-white shadow-md ring-2 ring-purple-400/50'
                    : 'bg-slate-800/90 border-slate-700/80 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{p.avatar?.emoji || '👦'}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">
                      🪙 {p.coins} • 💧 {p.lightDrops}
                    </p>
                  </div>
                </div>
                {isSelected ? (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500 text-[9px] font-black uppercase text-white shrink-0">
                    ATTIVO
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-[9px] font-bold text-slate-300 hover:bg-purple-600 hover:text-white shrink-0">
                    Scegli
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEZIONE 1: GESTIONE RISORSE (MONETE & GOCCE) */}
      <div className="bg-slate-800/80 p-3.5 sm:p-5 rounded-2xl border border-amber-500/20 flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-700/60 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">Gestione Valute</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold flex-wrap">
            <span className="bg-amber-950/60 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
              🪙 <b>{currentProfile.coins}</b>
            </span>
            <span className="bg-sky-950/60 text-sky-300 px-2.5 py-1 rounded-full border border-sky-500/30 flex items-center gap-1">
              💧 <b>{currentProfile.lightDrops}</b>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Pulsante Azzera */}
          <button
            onClick={handleResetCurrency}
            className="flex-1 min-w-[180px] sm:min-w-[200px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border-2 border-rose-500/50 text-rose-200 font-black text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/30"
          >
            <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">🗑️ Azzera Monete e Gocce (0)</span>
          </button>

          {/* Quick Add */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAddCoins(50)}
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer transition-colors"
            >
              +50 🪙
            </button>
            <button
              onClick={() => handleAddDrops(50)}
              className="py-2.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold text-xs cursor-pointer transition-colors"
            >
              +50 💧
            </button>
          </div>
        </div>
      </div>

      {/* SEZIONE 2: SBLOCCO TAPPE SINGOLE (x2 - x9) */}
      <div className="bg-slate-800/80 p-3.5 sm:p-5 rounded-2xl border border-purple-500/20 flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-purple-300 uppercase tracking-wider">
              Sblocco Tappe (x2 - x9)
            </h3>
          </div>

          {/* Azioni Globali per le Tappe */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={unlockAllWorlds}
              className="py-1.5 px-2.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 font-bold text-[11px] sm:text-xs cursor-pointer transition-colors flex items-center gap-1"
            >
              <Unlock className="w-3.5 h-3.5 shrink-0" />
              <span>Sblocca Tutte</span>
            </button>
            <button
              onClick={completeAllWorlds}
              className="py-1.5 px-2.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-200 font-bold text-[11px] sm:text-xs cursor-pointer transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Completa 100%</span>
            </button>
            <button
              onClick={resetAllWorldsToInitial}
              className="py-1.5 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-[11px] sm:text-xs cursor-pointer transition-colors"
            >
              Ripristina Solo x2
            </button>
          </div>
        </div>

        {/* Griglia delle Tappe (Mondi 2..9) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {WORLDS_DATA.map(world => {
            const unlocked = isWorldUnlocked(world.id);
            const prog = currentProfile.worldProgress[world.id];
            const stepsCount = prog?.completedSteps?.length || 0;
            const isCompleted = stepsCount === ALL_STEP_IDS.length;

            return (
              <div 
                key={world.id}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                  unlocked 
                    ? 'bg-slate-700/60 border-purple-500/40' 
                    : 'bg-slate-800/40 border-slate-700/50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl sm:text-2xl shrink-0">{world.symbol}</span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-white truncate">
                        Tappa {world.id}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">{world.name}</p>
                    </div>
                  </div>

                  {/* Badge Stato */}
                  {isCompleted ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black shrink-0">
                      100%
                    </span>
                  ) : unlocked ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black shrink-0">
                      Sbloccata
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600 text-[9px] font-bold shrink-0">
                      Bloccata
                    </span>
                  )}
                </div>

                {/* Controlli Singola Tappa */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-600/40">
                  <button
                    onClick={() => toggleUnlockWorld(world.id)}
                    className={`flex-1 py-1.5 px-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      unlocked
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        : 'bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 border border-purple-400/40'
                    }`}
                  >
                    {unlocked ? (
                      <>
                        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Blocca</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 text-purple-300 shrink-0" />
                        <span>Sblocca</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => completeSingleWorld(world.id)}
                    className="py-1.5 px-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="Completa tutti i passi e monumenti di questa tappa"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Completa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
