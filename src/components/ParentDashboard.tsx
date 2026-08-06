/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile, QuestionAttempt, WorldProgress } from '../types';
import { WORLDS_DATA } from '../data';
import { sound } from './SoundManager';
import { ShieldCheck, TrendingUp, AlertTriangle, Play, RotateCcw, Database, Trash2, Undo2, UserRoundX } from 'lucide-react';
import ActionGrid from './layout/ActionGrid';
import ResponsiveGrid from './layout/ResponsiveGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';
import { getGenderedText, getPlayerGender } from '../utils/playerCopy';

const WORLD_STEP_IDS = ['comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'] as const;

const createDefaultWorldProgress = (worldId: number): WorldProgress => ({
  worldId,
  completedSteps: [],
  rebuiltMonuments: [],
  devCoins: 0,
  devLightDrops: 0,
  creatureEvolution: 'egg',
  highScore: 0,
  stars: 0
});

interface ParentDashboardProps {
  activeProfiles: UserProfile[];
  deletedProfiles: UserProfile[];
  updateProfileById: (profileId: string, updater: (p: UserProfile) => UserProfile) => void;
  onSoftDeleteProfile: (profileId: string) => void;
  onRestoreDeletedProfile: (profileId: string) => void;
  onPermanentDeleteProfile: (profileId: string) => void;
  onClose: () => void;
  onChangePIN?: () => void;
  onRequestDevArea?: () => void;
  isDevAreaOpen?: boolean;
  onCloseDevArea?: () => void;
  compactLayout?: boolean;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Data non disponibile';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data non disponibile';
  return parsed.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getDaysRemaining = (deadline?: string | null) => {
  if (!deadline) return null;
  const timestamp = Date.parse(deadline);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / (24 * 60 * 60 * 1000)));
};

export default function ParentDashboard({
  activeProfiles,
  deletedProfiles,
  updateProfileById,
  onSoftDeleteProfile,
  onRestoreDeletedProfile,
  onPermanentDeleteProfile,
  onClose,
  onChangePIN,
  onRequestDevArea,
  isDevAreaOpen = false,
  onCloseDevArea,
  compactLayout = false
}: ParentDashboardProps) {
  const [profileDeleteModal, setProfileDeleteModal] = React.useState<{
    mode: 'soft' | 'hard';
    profileId: string;
    profileName: string;
  } | null>(null);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);
  const [devWorldId, setDevWorldId] = React.useState<number>(WORLDS_DATA[0]?.id || 2);
  const [devTab, setDevTab] = React.useState<'profile' | 'world' | 'steps' | 'clues'>('profile');
  const [devWorldCoinsInput, setDevWorldCoinsInput] = React.useState<string>('0');
  const [devWorldDropsInput, setDevWorldDropsInput] = React.useState<string>('0');

  React.useEffect(() => {
    if (!selectedProfileId) return;
    if (!activeProfiles.some(item => item.id === selectedProfileId)) {
      setSelectedProfileId(null);
    }
  }, [activeProfiles, selectedProfileId]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const panel = document.getElementById('parent-dashboard-panel');
    if (panel) panel.scrollTop = 0;
    const scrollables = document.querySelectorAll('.overflow-y-auto');
    scrollables.forEach(el => {
      el.scrollTop = 0;
    });
  }, [selectedProfileId]);

  const selectedProfile = selectedProfileId
    ? activeProfiles.find(item => item.id === selectedProfileId) || null
    : null;
  const selectedProfileGender = getPlayerGender(selectedProfile);
  const devProfile = selectedProfile;
  const devWorld = WORLDS_DATA.find(world => world.id === devWorldId) || WORLDS_DATA[0];

  React.useEffect(() => {
    if (!devProfile) return;
    const fallbackWorldId = devProfile.unlockedWorlds[devProfile.unlockedWorlds.length - 1] || WORLDS_DATA[0].id;
    setDevWorldId(fallbackWorldId);
  }, [devProfile?.id]);

  React.useEffect(() => {
    if (!isDevAreaOpen) {
      setDevTab('profile');
    }
  }, [isDevAreaOpen]);

  const openSoftDeleteModal = (profileId: string, profileName: string) => {
    sound.playClick();
    setProfileDeleteModal({ mode: 'soft', profileId, profileName });
  };

  const openHardDeleteModal = (profileId: string, profileName: string) => {
    sound.playClick();
    setProfileDeleteModal({ mode: 'hard', profileId, profileName });
  };

  const closeProfileDeleteModal = () => {
    sound.playClick();
    setProfileDeleteModal(null);
  };

  const confirmProfileDeleteModal = () => {
    if (!profileDeleteModal) return;
    if (profileDeleteModal.mode === 'soft') {
      onSoftDeleteProfile(profileDeleteModal.profileId);
    } else {
      onPermanentDeleteProfile(profileDeleteModal.profileId);
    }
    setProfileDeleteModal(null);
  };

  const handleSeedMockData = () => {
    if (!selectedProfile?.id) return;
    sound.playPowerUp();
    updateProfileById(selectedProfile.id, p => {
      const mockHistory: QuestionAttempt[] = [];
      const now = new Date();

      for (let i = 0; i < 20; i++) {
        const factorB = Math.floor(Math.random() * 9) + 2;
        mockHistory.push({
          a: 2,
          b: factorB,
          correct: Math.random() > 0.05,
          responseTimeMs: 1200 + Math.random() * 800,
          timestamp: new Date(now.getTime() - i * 3600000).toISOString()
        });
      }

      for (let i = 0; i < 15; i++) {
        const factorB = Math.floor(Math.random() * 9) + 2;
        mockHistory.push({
          a: 3,
          b: factorB,
          correct: Math.random() > 0.1,
          responseTimeMs: 1500 + Math.random() * 1000,
          timestamp: new Date(now.getTime() - i * 3600000).toISOString()
        });
      }

      for (let i = 0; i < 12; i++) {
        const is8or6 = i % 3 === 0;
        mockHistory.push({
          a: 7,
          b: is8or6 ? (i % 2 === 0 ? 8 : 6) : 3,
          correct: !is8or6,
          responseTimeMs: 2500 + Math.random() * 1500,
          timestamp: new Date(now.getTime() - i * 3600000).toISOString()
        });
      }

      return {
        ...p,
        history: [...p.history, ...mockHistory]
      };
    });
  };

  const handleResetCurrencyOnly = () => {
    if (!selectedProfile?.id) return;
    if (window.confirm('Vuoi azzerare Monete e Gocce di questo profilo per tutti i regni?')) {
      sound.playClick();
      updateProfileById(selectedProfile.id, p => {
        const nextWorldProgress = { ...p.worldProgress };
        Object.keys(nextWorldProgress).forEach(wId => {
          const numId = Number(wId);
          if (nextWorldProgress[numId]) {
            nextWorldProgress[numId] = {
              ...nextWorldProgress[numId],
              devCoins: 0,
              devLightDrops: 0
            };
          }
        });
        return {
          ...p,
          coins: 0,
          lightDrops: 0,
          worldProgress: nextWorldProgress
        };
      });
    }
  };

  const handleResetData = () => {
    if (!selectedProfile?.id) return;
    if (window.confirm('Sei sicuro di voler cancellare tutti i progressi di Tabellandia? Questa operazione è irreversibile.')) {
      sound.playError();
      updateProfileById(selectedProfile.id, () => ({
        name: getGenderedText(selectedProfileGender, 'Eroe', 'Eroina'),
        level: 1,
        xp: 0,
        coins: 0,
        lightDrops: 0,
        avatar: {
          emoji: '👦',
          gender: 'kid1',
          hairStyle: 'Nessuno',
          hairColor: '#f59e0b',
          shirtColor: '#3b82f6',
          pantsColor: '#4b5563',
          hat: 'Nessuno',
          backpack: 'Nessuno',
          mascot: 'Nessuna'
        },
        unlockedWorlds: [2],
        unlockedAccessories: [],
        worldProgress: {
          2: { worldId: 2, completedSteps: [], rebuiltMonuments: [], devCoins: 0, devLightDrops: 0, creatureEvolution: 'egg', highScore: 0, stars: 0 }
        },
        history: []
      }));
      onClose();
    }
  };

  const updateDevProfile = (updater: (profile: UserProfile) => UserProfile) => {
    if (!devProfile?.id) return;
    updateProfileById(devProfile.id, updater);
  };

  const currentDevWorldProgress = devProfile ? devProfile.worldProgress[devWorld.id] || createDefaultWorldProgress(devWorld.id) : null;
  React.useEffect(() => {
    if (!currentDevWorldProgress) return;
    setDevWorldCoinsInput(String(currentDevWorldProgress.devCoins ?? 0));
    setDevWorldDropsInput(String(currentDevWorldProgress.devLightDrops ?? 0));
  }, [currentDevWorldProgress?.worldId, currentDevWorldProgress?.devCoins, currentDevWorldProgress?.devLightDrops, devProfile?.id]);

  const isDevWorldUnlocked = Boolean(devProfile && devProfile.unlockedWorlds.includes(devWorld.id));
  const areDevStepsUnlocked = Boolean(currentDevWorldProgress && currentDevWorldProgress.completedSteps.length === WORLD_STEP_IDS.length);
  const areDevCluesFound = Boolean(currentDevWorldProgress && currentDevWorldProgress.rebuiltMonuments.length === devWorld.monuments.length);

  const devStepLabels: Record<string, string> = {
    comprendo: '1. Raccogli',
    salto: '2. Salta',
    costruisco: '3. Scoppia',
    trucchi: '4. Trova',
    pratico: '5. Pratico',
    sfida: '6. Sfida',
  };

  const toggleLockedValue = (currentValues: string[] | undefined, value: string) => (
    currentValues && currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...(currentValues || []), value]
  );

  const handleToggleDevWorldLock = () => {
    if (!devProfile?.id) return;
    sound.playClick();
    updateDevProfile(profile => {
      const unlockedWorlds = profile.unlockedWorlds.includes(devWorld.id)
        ? profile.unlockedWorlds.filter(worldId => worldId !== devWorld.id)
        : Array.from(new Set([...profile.unlockedWorlds, devWorld.id])).sort((a, b) => a - b);
      return {
        ...profile,
        unlockedWorlds
      };
    });
  };

  const handleApplyDevWorldCounters = () => {
    if (!devProfile?.id) return;

    const nextCoins = Number.parseInt(devWorldCoinsInput, 10);
    const nextDrops = Number.parseInt(devWorldDropsInput, 10);
    if (Number.isNaN(nextCoins) || Number.isNaN(nextDrops)) {
      sound.playError();
      return;
    }

    sound.playClick();
    updateDevProfile(profile => {
      const worldProgress = profile.worldProgress[devWorld.id] || createDefaultWorldProgress(devWorld.id);
      return {
        ...profile,
        worldProgress: {
          ...profile.worldProgress,
          [devWorld.id]: {
            ...worldProgress,
            coins: Math.max(0, nextCoins),
            devCoins: Math.max(0, nextCoins),
            lightDrops: Math.max(0, nextDrops),
            devLightDrops: Math.max(0, nextDrops)
          }
        }
      };
    });
  };

  const handleToggleDevSteps = () => {
    if (!devProfile?.id) return;
    sound.playClick();
    updateDevProfile(profile => {
      const worldProgress = profile.worldProgress[devWorld.id] || createDefaultWorldProgress(devWorld.id);
      const nextLockedSteps = worldProgress.lockedSteps?.length === WORLD_STEP_IDS.length ? [] : [...WORLD_STEP_IDS];
      return {
        ...profile,
        worldProgress: {
          ...profile.worldProgress,
          [devWorld.id]: {
            ...worldProgress,
            lockedSteps: nextLockedSteps
          }
        }
      };
    });
  };

  const handleToggleDevClueFound = (monumentId: string) => {
    if (!devProfile?.id) return;
    sound.playClick();
    updateDevProfile(profile => {
      const worldProgress = profile.worldProgress[devWorld.id] || createDefaultWorldProgress(devWorld.id);
      const rebuiltMonuments = worldProgress.rebuiltMonuments.includes(monumentId)
        ? worldProgress.rebuiltMonuments.filter(item => item !== monumentId)
        : [...worldProgress.rebuiltMonuments, monumentId];
      return {
        ...profile,
        worldProgress: {
          ...profile.worldProgress,
          [devWorld.id]: {
            ...worldProgress,
            rebuiltMonuments
          }
        }
      };
    });
  };

  const handleToggleDevStepLock = (stepId: string) => {
    if (!devProfile?.id) return;
    sound.playClick();
    updateDevProfile(profile => {
      const worldProgress = profile.worldProgress[devWorld.id] || createDefaultWorldProgress(devWorld.id);
      return {
        ...profile,
        worldProgress: {
          ...profile.worldProgress,
          [devWorld.id]: {
            ...worldProgress,
            lockedSteps: toggleLockedValue(worldProgress.lockedSteps, stepId)
          }
        }
      };
    });
  };

  const handleToggleDevClueLock = (monumentId: string) => {
    if (!devProfile?.id) return;
    sound.playClick();
    updateDevProfile(profile => {
      const worldProgress = profile.worldProgress[devWorld.id] || createDefaultWorldProgress(devWorld.id);
      return {
        ...profile,
        worldProgress: {
          ...profile.worldProgress,
          [devWorld.id]: {
            ...worldProgress,
            lockedMonuments: toggleLockedValue(worldProgress.lockedMonuments, monumentId)
          }
        }
      };
    });
  };

  const totalAnswers = selectedProfile ? selectedProfile.history.length : 0;
  const correctAnswers = selectedProfile ? selectedProfile.history.filter(h => h.correct).length : 0;
  const accuracyRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  const averageSpeed = selectedProfile && totalAnswers > 0
    ? (selectedProfile.history.reduce((acc, h) => acc + h.responseTimeMs, 0) / totalAnswers / 1000).toFixed(2)
    : '0.00';

  const statsPerTable = Array.from({ length: 8 }).map((_, idx) => {
    const tableNum = idx + 2;
    const tableHistory = selectedProfile
      ? selectedProfile.history.filter(h => h.a === tableNum || h.b === tableNum)
      : [];
    const tableTotal = tableHistory.length;
    const tableCorrect = tableHistory.filter(h => h.correct).length;
    const tableAccuracy = tableTotal > 0 ? Math.round((tableCorrect / tableTotal) * 100) : null;
    return { tableNum, total: tableTotal, accuracy: tableAccuracy };
  });

  const errorMap: { [key: string]: { correct: number; total: number; errors: number } } = {};
  (selectedProfile?.history || []).forEach(h => {
    const key = h.a <= h.b ? `${h.a} x ${h.b}` : `${h.b} x ${h.a}`;
    if (!errorMap[key]) {
      errorMap[key] = { correct: 0, total: 0, errors: 0 };
    }
    errorMap[key].total += 1;
    if (h.correct) {
      errorMap[key].correct += 1;
    } else {
      errorMap[key].errors += 1;
    }
  });

  const criticalCombinations = Object.entries(errorMap)
    .map(([combo, data]) => ({
      combo,
      accuracy: Math.round((data.correct / data.total) * 100),
      errors: data.errors,
      total: data.total
    }))
    .filter(item => item.errors >= 2 || (item.total >= 2 && item.accuracy < 60))
    .sort((a, b) => b.errors - a.errors);

  const getPedagogicalAdvice = () => {
    const advice: string[] = [];
    const mastered = statsPerTable.filter(s => s.accuracy !== null && s.accuracy >= 80).map(s => s.tableNum);
    const weak = statsPerTable.filter(s => s.accuracy !== null && s.accuracy < 65).map(s => s.tableNum);
    const unattempted = statsPerTable.filter(s => s.total === 0).map(s => s.tableNum);

    if (mastered.length > 0) {
      advice.push(`🎉 ${getGenderedText(selectedProfileGender, 'Il bambino', 'La bambina')} dimostra un'eccellente padronanza delle tabelline del **${mastered.join(', ')}** (precisione superiore all'80%). Ottimo lavoro!`);
    }

    if (weak.length > 0) {
      advice.push(`⚠️ Si notano alcune difficoltà con la tabellina del **${weak.join(', ')}**. Ti suggeriamo di fare sessioni dedicate in *Modalità Allenamento* per rallentare il ritmo e studiare i trucchi mnemonici associati.`);
    }

    if (criticalCombinations.length > 0) {
      const topCritical = criticalCombinations.slice(0, 3).map(c => c.combo).join(', ');
      advice.push(`🔍 Le combinazioni specifiche più critiche sono: **${topCritical}**. Prova a ripeterle insieme al bambino ad alta voce evidenziando i trucchi di Tabellandia.`);
    }

    if (unattempted.length > 0) {
      advice.push(`🎒 Ci sono aree del regno non ancora esplorate. Consigliamo di sbloccare la tabellina del **${unattempted[0]}** nella *Modalità Avventura*.`);
    }

    if (advice.length === 0) {
      advice.push('📋 Il bambino non ha ancora completato abbastanza esercizi per generare una diagnostica dettagliata. Continuate l\'avventura per sbloccare i suggerimenti personalizzati!');
    }

    return advice;
  };

  const overviewCards = [
    {
      key: 'accuracy',
      value: `${accuracyRate}%`,
      valueClassName: 'text-2xl font-black text-emerald-600',
      label: 'Precisione Risposte',
      description: `${correctAnswers} esatte su ${totalAnswers}`,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'speed',
      value: `${averageSpeed}s`,
      valueClassName: 'text-xl font-black text-sky-600',
      label: 'Velocità di Risposta',
      description: 'Media secondi per calcolo',
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      key: 'worlds',
      value: '🏆',
      valueClassName: 'text-2xl',
      label: 'Mondi Sbloccati',
      description: `${selectedProfile?.unlockedWorlds.length || 0} aree su ${WORLDS_DATA.length} liberate`,
      tone: 'bg-amber-50 text-amber-500',
    },
  ];

  return (
    <div className={`w-full h-full bg-slate-50 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`} id="parent-dashboard-panel">
      <SurfaceCard padding={compactLayout ? 'sm' : 'md'} className="mb-6">
        <SectionHeader
          eyebrow="Area genitori"
          title="Dashboard Genitori & Diagnostica"
          description={selectedProfile
            ? `Monitora i progressi di ${selectedProfile.name}, scopri i suoi punti di forza e le aree critiche.`
            : 'Seleziona un profilo attivo per visualizzare statistiche e strumenti diagnostici.'}
          icon={<ShieldCheck className="h-7 w-7 text-emerald-500" aria-hidden="true" />}
          actions={
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      onChangePIN?.();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors whitespace-nowrap"
                    id="parent-change-pin-btn"
                    title="Modifica il PIN"
                  >
                    🔑 Modifica PIN
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onRequestDevArea?.();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 cursor-pointer transition-colors whitespace-nowrap"
                    id="parent-dev-btn"
                    title="Apri area dev"
                  >
                    🛠️ Area Dev
                  </button>
                </div>
              }
            />
          </SurfaceCard>

      <SurfaceCard padding="md" className="mb-6 rounded-2xl border-slate-100">
        <SectionHeader
          eyebrow="Gestione profili"
          title="Profili attivi ed eliminati"
          description="Elimina in modo reversibile, ripristina entro 30 giorni oppure rimuovi definitivamente un profilo."
          icon={<UserRoundX className="w-5 h-5 text-rose-500" aria-hidden="true" />}
        />

        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900">Profili attivi</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                {activeProfiles.length} attivi
              </span>
            </div>
            <p className="mb-3 text-[11px] text-slate-500">
              Puoi avere anche zero profili attivi: i profili eliminati restano disponibili qui sotto per il ripristino entro 30 giorni.
            </p>
            <div role="list" className="grid grid-cols-1 gap-3">
              {activeProfiles.map(item => {
                const isCurrent = item.id === selectedProfileId;
                const canDeleteProfile = Boolean(item.id);
                return (
                  <div
                    key={item.id}
                    role="listitem"
                    className={`rounded-2xl border p-4 shadow-sm ${isCurrent ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 rounded-full border-2 border-white bg-orange-400 text-2xl shadow-inner flex items-center justify-center">
                        {item.avatar?.emoji || '👦'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{item.name}</p>
                          {isCurrent && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-700">
                              Attivo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Livello {item.level} · {item.unlockedWorlds.length} mondi sbloccati
                        </p>
                      </div>
                    </div>

                    <ActionGrid columns={2} className="mt-3">
                      <button
                        type="button"
                        onClick={() => item.id && setSelectedProfileId(item.id)}
                        disabled={!item.id}
                        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                          isCurrent
                            ? 'border border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {isCurrent ? 'Profilo selezionato' : 'Seleziona profilo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => item.id && openSoftDeleteModal(item.id, item.name)}
                        disabled={!canDeleteProfile}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Elimina
                      </button>
                    </ActionGrid>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900">Profili eliminati</h3>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                {deletedProfiles.length} in attesa
              </span>
            </div>
            {deletedProfiles.length > 0 ? (
              <div role="list" className="grid grid-cols-1 gap-3">
                {deletedProfiles.map(item => {
                  const daysRemaining = getDaysRemaining(item.scheduledPermanentDeletionAt);
                  return (
                    <div key={item.id} role="listitem" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 rounded-full border-2 border-white bg-slate-300 text-2xl shadow-inner flex items-center justify-center grayscale">
                          {item.avatar?.emoji || '👦'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-900">{item.name}</p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            Eliminato il {formatDate(item.deletedAt)} · scadenza recupero {formatDate(item.scheduledPermanentDeletionAt)}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-amber-800">
                            {daysRemaining === null ? 'Tempo residuo non disponibile' : `${daysRemaining} giorni al ripristino definitivo`}
                          </p>
                        </div>
                      </div>

                      <ActionGrid columns={2} className="mt-3">
                        <button
                          type="button"
                          onClick={() => item.id && onRestoreDeletedProfile(item.id)}
                          disabled={!item.id}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Ripristina
                        </button>
                        <button
                          type="button"
                          onClick={() => item.id && openHardDeleteModal(item.id, item.name)}
                          disabled={!item.id}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Cancella per sempre
                        </button>
                      </ActionGrid>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
                Nessun profilo eliminato in attesa di ripristino.
              </div>
            )}
          </div>
        </div>
      </SurfaceCard>

      {selectedProfile ? (
        <>
      <ResponsiveGrid variant="cards" className="mb-6">
        {overviewCards.map(card => (
          <SurfaceCard key={card.key} padding="sm" className="flex items-center gap-4 rounded-2xl border-slate-100">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.tone} ${card.valueClassName}`}>
              {card.value}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide font-sans">{card.label}</h4>
              <span className="text-lg font-black text-slate-800 font-mono">{card.description}</span>
            </div>
          </SurfaceCard>
        ))}
      </ResponsiveGrid>

      <SurfaceCard tone="indigo" padding="md" className="mb-6 rounded-2xl">
        <SectionHeader
          eyebrow="Lettura pedagogica"
          title="Consigli Pedagogici ed Evidenze Cognitive"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" aria-hidden="true" />}
        />
        <div className="space-y-2.5">
          {getPedagogicalAdvice().map((adv, idx) => (
            <div
              key={idx}
              className="text-xs text-indigo-900 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-white/50"
              dangerouslySetInnerHTML={{ __html: adv }}
            />
          ))}
        </div>
      </SurfaceCard>

      <ResponsiveGrid variant="split" className="mb-6">
        <SurfaceCard padding="md" className="rounded-2xl border-slate-100">
          <SectionHeader
            eyebrow="Analisi combinazioni"
            title="Griglia di Padronanza (Heatmap)"
            description="Analisi dettagliata di ogni singola casella da 2x2 a 9x9. Leggenda e colori rendono chiari i livelli di padronanza anche senza contare solo sul colore."
          />

          <div className="w-full overflow-x-auto">
            <div className="min-w-[280px]">
              <div className="grid grid-cols-9 gap-1 text-center font-bold text-[10px] text-slate-400 mb-1">
                <div></div>
                {Array.from({ length: 8 }).map((_, col) => (
                  <div key={col} className="font-mono">{col + 2}</div>
                ))}
              </div>

              {Array.from({ length: 8 }).map((_, rowIdx) => {
                const rowNum = rowIdx + 2;
                return (
                  <div key={rowIdx} className="grid grid-cols-9 gap-1 items-center text-center mb-1">
                    <div className="font-bold text-[10px] text-slate-400 font-mono text-left pl-1">{rowNum}</div>
                    {Array.from({ length: 8 }).map((_, colIdx) => {
                      const colNum = colIdx + 2;
                      const combHistory = selectedProfile.history.filter(h =>
                        (h.a === rowNum && h.b === colNum) || (h.a === colNum && h.b === rowNum)
                      );
                      const combTotal = combHistory.length;
                      const combCorrect = combHistory.filter(h => h.correct).length;
                      const combAccuracy = combTotal > 0 ? (combCorrect / combTotal) : null;

                      let bgClass = 'bg-slate-100 text-slate-400';
                      let title = `${rowNum}x${colNum}: Nessun tentativo`;

                      if (combTotal > 0) {
                        if (combAccuracy !== null && combAccuracy >= 0.8) {
                          bgClass = 'bg-emerald-500 text-white font-bold';
                        } else if (combAccuracy !== null && combAccuracy >= 0.6) {
                          bgClass = 'bg-amber-400 text-slate-900 font-bold';
                        } else {
                          bgClass = 'bg-rose-500 text-white font-bold animate-pulse';
                        }
                        title = `${rowNum}x${colNum}: ${Math.round((combAccuracy || 0) * 100)}% di esattezza (${combCorrect}/${combTotal})`;
                      }

                      return (
                        <div
                          key={colIdx}
                          title={title}
                          className={`aspect-square flex items-center justify-center text-[9px] rounded-md transition-all font-mono select-none ${bgClass}`}
                        >
                          {rowNum * colNum}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <ActionGrid columns={2} className="mt-4 text-[10px] font-bold text-slate-500 sm:grid-cols-4">
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200"></div> Non testato
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded bg-rose-500"></div> Critico (&lt;60%)
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded bg-amber-400"></div> In Corso (60-80%)
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded bg-emerald-500"></div> Acquisito (&gt;80%)
            </div>
          </ActionGrid>
        </SurfaceCard>

        <div className="flex flex-col gap-6">
          <SurfaceCard padding="md" className="rounded-2xl border-slate-100 flex-1">
            <SectionHeader
              eyebrow="Aree da rinforzare"
              title="Combinazioni Ostiche"
              description="Queste operazioni presentano errori ripetuti. Il sistema adattivo le proporrà più spesso."
              icon={<AlertTriangle className="w-5 h-5 text-rose-500" aria-hidden="true" />}
            />

            <div className="space-y-2 overflow-y-auto max-h-[180px] pr-1">
              {criticalCombinations.length > 0 ? (
                criticalCombinations.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl p-2.5">
                    <span className="text-sm font-extrabold text-rose-900 font-mono">{item.combo}</span>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-700 block">{item.errors} errori registrati</span>
                      <span className="text-[10px] text-slate-400 block font-sans">Precisione: {item.accuracy}% ({item.total - item.errors}/{item.total})</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                  🌈 Ottimo! Nessuna combinazione critica rilevata finora.
                </div>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard padding="md" className="rounded-2xl border-slate-100">
            <SectionHeader
              eyebrow="Strumenti"
              title="Diagnostica e Ripristino"
              description="Opzioni riservate a educatori o genitori per simulare o cancellare i dati dell'applicazione."
              icon={<Database className="w-5 h-5 text-indigo-500" aria-hidden="true" />}
            />

            <ActionGrid columns={3}>
              <button
                onClick={handleSeedMockData}
                disabled={!selectedProfile?.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs cursor-pointer transition-colors"
                id="parent-seed-btn"
              >
                <Play className="w-3.5 h-3.5 fill-indigo-700" />
                Genera Statistiche
              </button>

              <button
                onClick={handleResetCurrencyOnly}
                disabled={!selectedProfile?.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-amber-200 text-amber-800 hover:bg-amber-50 font-bold text-xs cursor-pointer transition-colors"
                id="parent-reset-currency-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                Azzera Monete & Gocce
              </button>

              <button
                onClick={handleResetData}
                disabled={!selectedProfile?.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer transition-colors"
                id="parent-reset-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Azzera Gioco
              </button>
            </ActionGrid>
          </SurfaceCard>
        </div>
      </ResponsiveGrid>
        </>
      ) : (
        <SurfaceCard padding="md" className="mb-6 rounded-2xl border-dashed border-indigo-200 bg-indigo-50/40">
          <div className="text-center space-y-2">
            <h3 className="text-sm font-black text-indigo-900">Seleziona un profilo attivo</h3>
            <p className="text-xs text-indigo-700">
              In modalità genitori i profili sono disattivati globalmente: scegli un profilo dalla lista per vedere statistiche e strumenti.
            </p>
          </div>
        </SurfaceCard>
      )}

      {isDevAreaOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 pt-6 backdrop-blur-sm">
          <div
            className="flex w-full max-w-4xl max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-modal-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Area dev</p>
                <h3 id="dev-modal-title" className="mt-1 text-lg font-black text-slate-900">Strumenti rapidi</h3>
                <p className="mt-1 text-xs text-slate-600">Tab compatte per restare dentro la pagina senza perdere i controlli.</p>
              </div>
            </div>

            <div role="tablist" aria-label="Sezioni area dev" className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-slate-100 p-1">
              {[
                { id: 'profile', label: 'Profilo' },
                { id: 'world', label: 'Regno' },
                { id: 'steps', label: 'Passi' },
                { id: 'clues', label: 'Indizi' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={devTab === tab.id}
                  aria-controls={`dev-panel-${tab.id}`}
                  disabled={tab.id !== 'profile' && !devProfile}
                  onClick={() => setDevTab(tab.id as 'profile' | 'world' | 'steps' | 'clues')}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    devTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              {devTab === 'profile' && (
                <div id="dev-panel-profile" role="tabpanel" aria-labelledby="dev-modal-title" className="grid gap-3 lg:grid-cols-2">
                  <SurfaceCard padding="sm" className="rounded-2xl border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Profilo target</p>
                    <div role="list" className="mt-2 grid grid-cols-1 gap-2">
                      {activeProfiles.length > 0 ? activeProfiles.map(item => {
                        const isSelected = item.id === selectedProfileId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="listitem"
                            onClick={() => setSelectedProfileId(item.id)}
                            className={`rounded-2xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <p className="text-sm font-black text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-600">
                              Livello {item.level} · {item.unlockedWorlds.length} {item.unlockedWorlds.length === 1 ? 'regno sbloccato' : 'regni sbloccati'}
                            </p>
                          </button>
                        );
                      }) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                          Nessun profilo attivo
                        </div>
                      )}
                    </div>
                  </SurfaceCard>

                  <SurfaceCard padding="sm" className="rounded-2xl border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Anteprima</p>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                      <p>Profilo selezionato: <b>{selectedProfile?.name || 'Nessuno'}</b></p>
                      <p className="mt-1">Regno selezionato: <b>{devWorld?.name || 'Nessuno'}</b></p>
                      <p className="mt-1">Monete del regno: <b>{currentDevWorldProgress?.devCoins ?? 0}</b> · Gocce del regno: <b>{currentDevWorldProgress?.devLightDrops ?? 0}</b></p>
                    </div>
                    {!selectedProfile && (
                      <p className="mt-2 text-xs text-slate-500">Seleziona un profilo per sbloccare le altre schede.</p>
                    )}
                  </SurfaceCard>
                </div>
              )}

              {devTab === 'world' && (
                <div id="dev-panel-world" role="tabpanel" className="space-y-3">
                  <SurfaceCard padding="sm" className="rounded-2xl border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Regno target</p>
                    {!devProfile && (
                      <p className="mt-2 text-xs text-slate-500">Seleziona prima un profilo per attivare i controlli.</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {WORLDS_DATA.map(world => (
                        <button
                          key={world.id}
                          type="button"
                          onClick={() => setDevWorldId(world.id)}
                          disabled={!devProfile}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                            !devProfile
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : devWorldId === world.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          x{world.id}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      Selezionato: <b>{devWorld?.name || 'Nessuno'}</b>
                    </p>
                  </SurfaceCard>

                  <SurfaceCard padding="sm" className="rounded-2xl border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Controlli utili</p>
                    <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleToggleDevWorldLock}
                        disabled={!devProfile}
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
                          !devProfile
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : isDevWorldUnlocked
                              ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {!devProfile ? 'Seleziona profilo' : isDevWorldUnlocked ? 'Blocca regno' : 'Sblocca regno'}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleDevSteps}
                        disabled={!devProfile}
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
                          !devProfile
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : areDevStepsUnlocked
                              ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                              : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                        }`}
                      >
                        {!devProfile ? 'Seleziona profilo' : areDevStepsUnlocked ? 'Blocca passi' : 'Sblocca passi'}
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Monete del regno</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={devWorldCoinsInput}
                          onChange={event => setDevWorldCoinsInput(event.target.value)}
                          disabled={!devProfile}
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Gocce del regno</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={devWorldDropsInput}
                          onChange={event => setDevWorldDropsInput(event.target.value)}
                          disabled={!devProfile}
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-600">
                        Valori correnti: <b>{currentDevWorldProgress?.devCoins ?? 0}</b> monete · <b>{currentDevWorldProgress?.devLightDrops ?? 0}</b> gocce
                      </p>
                      <button
                        type="button"
                        onClick={handleApplyDevWorldCounters}
                        disabled={!devProfile}
                        className={`rounded-xl px-3 py-2 text-xs font-black transition-colors cursor-pointer ${
                          !devProfile
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        Applica valori
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>Regno: <b>{isDevWorldUnlocked ? 'sbloccato' : 'bloccato'}</b></span>
                      <span>Passi: <b>{currentDevWorldProgress?.completedSteps.length ?? 0}/6</b></span>
                      <span>Indizi: <b>{currentDevWorldProgress?.rebuiltMonuments.length ?? 0}/{devWorld.monuments.length}</b></span>
                    </div>
                  </SurfaceCard>
                </div>
              )}

              {devTab === 'steps' && (
                <div id="dev-panel-steps" role="tabpanel" className="space-y-3">
                  <SurfaceCard padding="sm" className="rounded-2xl border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Passi</p>
                      <p className="text-xs text-slate-600">
                        {currentDevWorldProgress?.completedSteps.length ?? 0}/{WORLD_STEP_IDS.length}
                      </p>
                    </div>
                    <div role="list" className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
                      {WORLD_STEP_IDS.map(stepId => {
                        const isLocked = currentDevWorldProgress?.lockedSteps?.includes(stepId) ?? false;
                        const isDone = currentDevWorldProgress?.completedSteps.includes(stepId) ?? false;
                        return (
                          <button
                            key={stepId}
                            type="button"
                            role="listitem"
                            onClick={() => handleToggleDevStepLock(stepId)}
                            disabled={!devProfile}
                            className={`rounded-2xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                              !devProfile
                                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isLocked
                                  ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                                  : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                            }`}
                          >
                            <p className="text-sm font-black">{devStepLabels[stepId] || stepId}</p>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Stato: <b>{isLocked ? 'Bloccato' : isDone ? 'Sbloccato e completato' : 'Sbloccato'}</b>
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </SurfaceCard>
                </div>
              )}

              {devTab === 'clues' && (
                <div id="dev-panel-clues" role="tabpanel" className="space-y-3">
                  <SurfaceCard padding="sm" className="rounded-2xl border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Indizi</p>
                      <p className="text-xs text-slate-600">
                        {currentDevWorldProgress?.rebuiltMonuments.length ?? 0}/{devWorld.monuments.length}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      Tocca una card per passare tra <b>trovato</b> e <b>da trovare</b>. Stato gruppo: <b>{areDevCluesFound ? 'tutti trovati' : 'ancora da completare'}</b>.
                    </p>
                    <div role="list" className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2">
                      {devWorld.monuments.map(monument => {
                        const isDone = currentDevWorldProgress?.rebuiltMonuments.includes(monument.id) ?? false;
                        return (
                          <button
                            key={monument.id}
                            type="button"
                            role="listitem"
                            onClick={() => handleToggleDevClueFound(monument.id)}
                            disabled={!devProfile}
                            className={`rounded-2xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                              !devProfile
                                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isDone
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            <p className="text-sm font-black">{monument.emoji} {monument.name}</p>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Stato: <b>{isDone ? 'Trovato' : 'Da trovare'}</b>
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </SurfaceCard>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => onCloseDevArea?.()}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {profileDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-3xl border border-indigo-100 bg-white p-6 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-delete-modal-title"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-2xl">
              🗑️
            </div>
            <h3 id="profile-delete-modal-title" className="text-base font-black text-indigo-950">
              {profileDeleteModal.mode === 'soft' ? 'Cancellare il profilo?' : 'Eliminare definitivamente il profilo?'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {profileDeleteModal.mode === 'soft'
                ? <>Il profilo <b>{profileDeleteModal.profileName}</b> verra spostato tra i profili ripristinabili. Potrai comunque ripristinarlo entro 30 giorni.</>
                : <>Il profilo <b>{profileDeleteModal.profileName}</b> verra eliminato per sempre. Questa operazione e irreversibile.</>}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={closeProfileDeleteModal}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmProfileDeleteModal}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white transition-colors hover:bg-rose-700 cursor-pointer"
              >
                {profileDeleteModal.mode === 'soft' ? 'Cancella profilo' : 'Elimina definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
