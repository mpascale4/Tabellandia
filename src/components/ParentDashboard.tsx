/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile, QuestionAttempt } from '../types';
import { WORLDS_DATA } from '../data';
import { sound } from './SoundManager';
import { ShieldCheck, TrendingUp, AlertTriangle, Play, RotateCcw, Database } from 'lucide-react';
import ActionGrid from './layout/ActionGrid';
import ResponsiveGrid from './layout/ResponsiveGrid';
import SectionHeader from './layout/SectionHeader';
import SurfaceCard from './layout/SurfaceCard';

interface ParentDashboardProps {
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  onClose: () => void;
  onChangePIN?: () => void;
  compactLayout?: boolean;
}

export default function ParentDashboard({ profile, updateProfile, onClose, onChangePIN, compactLayout = false }: ParentDashboardProps) {

  // Seeding simulated stats for demonstrative purposes (if history is empty, help the parent understand how it looks!)
  const handleSeedMockData = () => {
    sound.playPowerUp();
    updateProfile(p => {
      const mockHistory: QuestionAttempt[] = [];
      const now = new Date();
      
      // World 2: Highly mastered
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

      // World 3: Mastered
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

      // World 7: Critical (specifically 7x8 and 7x6 errors)
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

  const handleResetData = () => {
    if (window.confirm("Sei sicuro di voler cancellare tutti i progressi di Tabellandia? Questa operazione è irreversibile.")) {
      sound.playError();
      updateProfile(() => ({
        name: "Eroe",
        level: 1,
        xp: 0,
        coins: 10,
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
          2: { worldId: 2, completedSteps: [], rebuiltMonuments: [], creatureEvolution: 'egg', highScore: 0, stars: 0 }
        },
        history: []
      }));
      onClose();
    }
  };

  // Compile calculations based on current history
  const totalAnswers = profile.history.length;
  const correctAnswers = profile.history.filter(h => h.correct).length;
  const accuracyRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  const averageSpeed = totalAnswers > 0 
    ? (profile.history.reduce((acc, h) => acc + h.responseTimeMs, 0) / totalAnswers / 1000).toFixed(2)
    : "0.00";

  // Calculate stats per multiplier (2 to 9)
  const statsPerTable = Array.from({ length: 8 }).map((_, idx) => {
    const tableNum = idx + 2;
    const tableHistory = profile.history.filter(h => h.a === tableNum || h.b === tableNum);
    const tableTotal = tableHistory.length;
    const tableCorrect = tableHistory.filter(h => h.correct).length;
    const tableAccuracy = tableTotal > 0 ? Math.round((tableCorrect / tableTotal) * 100) : null;
    return { tableNum, total: tableTotal, accuracy: tableAccuracy };
  });

  // Calculate exact weak spot combinations (critical multiplications)
  const errorMap: { [key: string]: { correct: number; total: number; errors: number } } = {};
  profile.history.forEach(h => {
    // Sort keys to handle commutation: e.g., 7x8 is identical to 8x7 in cognitive load
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

  // Generate Automated Diagnostic Recommendations
  const getPedagogicalAdvice = () => {
    const advice: string[] = [];
    const mastered = statsPerTable.filter(s => s.accuracy !== null && s.accuracy >= 80).map(s => s.tableNum);
    const weak = statsPerTable.filter(s => s.accuracy !== null && s.accuracy < 65).map(s => s.tableNum);
    const unattempted = statsPerTable.filter(s => s.total === 0).map(s => s.tableNum);

    if (mastered.length > 0) {
      advice.push(`🎉 Il bambino dimostra un'eccellente padronanza delle tabelline del **${mastered.join(', ')}** (precisione superiore all'80%). Ottimo lavoro!`);
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
      advice.push("📋 Il bambino non ha ancora completato abbastanza esercizi per generare una diagnostica dettagliata. Continuate l'avventura per sbloccare i suggerimenti personalizzati!");
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
      description: `${profile.unlockedWorlds.length} aree su ${WORLDS_DATA.length} liberate`,
      tone: 'bg-amber-50 text-amber-500',
    },
  ];

  // Safe PIN Screen - REMOVED, now goes directly to dashboard since authenticated via PIN modal
  
  return (
    <div className={`w-full h-full bg-slate-50 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`} id="parent-dashboard-panel">
      <SurfaceCard padding={compactLayout ? 'sm' : 'md'} className="mb-6">
        <SectionHeader
          eyebrow="Area genitori"
          title="Dashboard Genitori & Diagnostica"
          description={`Monitora i progressi di ${profile.name}, scopri i suoi punti di forza e le aree critiche.`}
          icon={<ShieldCheck className="h-7 w-7 text-emerald-500" aria-hidden="true" />}
          actions={
            <>
              <button
                onClick={onChangePIN}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors"
                id="parent-change-pin-btn"
                title="Modifica il PIN"
              >
                🔑 Modifica PIN
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                id="parent-close-btn"
              >
                Torna al Gioco
              </button>
            </>
          }
        />
      </SurfaceCard>

      {/* Main Grid: Overview cards */}
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

      {/* Recommendations & Pedagogical Guidance */}
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

      {/* Detailed Analysis Section */}
      <ResponsiveGrid variant="split" className="mb-6">
        {/* Left column: Heatmap table representation of the 8x8 multiplier grid */}
        <SurfaceCard padding="md" className="rounded-2xl border-slate-100">
          <SectionHeader
            eyebrow="Analisi combinazioni"
            title="Griglia di Padronanza (Heatmap)"
            description="Analisi dettagliata di ogni singola casella da 2x2 a 9x9. Leggenda e colori rendono chiari i livelli di padronanza anche senza contare solo sul colore."
          />

          <div className="w-full overflow-x-auto">
            <div className="min-w-[280px]">
              {/* Header row */}
              <div className="grid grid-cols-9 gap-1 text-center font-bold text-[10px] text-slate-400 mb-1">
                <div></div>
                {Array.from({ length: 8 }).map((_, col) => (
                  <div key={col} className="font-mono">{col + 2}</div>
                ))}
              </div>

              {/* Grid content */}
              {Array.from({ length: 8 }).map((_, rowIdx) => {
                const rowNum = rowIdx + 2;
                return (
                  <div key={rowIdx} className="grid grid-cols-9 gap-1 items-center text-center mb-1">
                    <div className="font-bold text-[10px] text-slate-400 font-mono text-left pl-1">{rowNum}</div>
                    {Array.from({ length: 8 }).map((_, colIdx) => {
                      const colNum = colIdx + 2;
                      
                      // Get history for this exact combination (ignoring order)
                      const combHistory = profile.history.filter(h => 
                        (h.a === rowNum && h.b === colNum) || (h.a === colNum && h.b === rowNum)
                      );
                      const combTotal = combHistory.length;
                      const combCorrect = combHistory.filter(h => h.correct).length;
                      const combAccuracy = combTotal > 0 ? (combCorrect / combTotal) : null;

                      let bgClass = "bg-slate-100 text-slate-400"; // No data
                      let title = `${rowNum}x${colNum}: Nessun tentativo`;
                      
                      if (combTotal > 0) {
                        if (combAccuracy! >= 0.8) {
                          bgClass = "bg-emerald-500 text-white font-bold";
                        } else if (combAccuracy! >= 0.6) {
                          bgClass = "bg-amber-400 text-slate-900 font-bold";
                        } else {
                          bgClass = "bg-rose-500 text-white font-bold animate-pulse";
                        }
                        title = `${rowNum}x${colNum}: ${Math.round(combAccuracy! * 100)}% di esattezza (${combCorrect}/${combTotal})`;
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

        {/* Right column: Critical weaknesses and dev settings */}
        <div className="flex flex-col gap-6">
          {/* Critical Weaknesses Card */}
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

          {/* Development and diagnostic utilities */}
          <SurfaceCard padding="md" className="rounded-2xl border-slate-100">
            <SectionHeader
              eyebrow="Strumenti"
              title="Diagnostica e Ripristino"
              description="Opzioni riservate a educatori o genitori per simulare o cancellare i dati dell'applicazione."
              icon={<Database className="w-5 h-5 text-indigo-500" aria-hidden="true" />}
            />

            <ActionGrid columns={2}>
              <button
                onClick={handleSeedMockData}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs cursor-pointer transition-colors"
                id="parent-seed-btn"
              >
                <Play className="w-3.5 h-3.5 fill-indigo-700" />
                Genera Statistiche di Esempio
              </button>

              <button
                onClick={handleResetData}
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
    </div>
  );
}
