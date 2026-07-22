/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile, QuestionAttempt } from '../types';
import { WORLDS_DATA } from '../data';
import { sound } from './SoundManager';
import { ShieldCheck, TrendingUp, AlertTriangle, Play, Award, RotateCcw, Database, HelpCircle } from 'lucide-react';

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
      updateProfile(p => ({
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

  // Calculate stats per multiplier (2 to 10)
  const statsPerTable = Array.from({ length: 9 }).map((_, idx) => {
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

  // Safe PIN Screen - REMOVED, now goes directly to dashboard since authenticated via PIN modal
  
  return (
    <div className={`w-full h-full bg-slate-50 overflow-y-auto ${compactLayout ? 'p-3' : 'p-4 md:p-6'}`} id="parent-dashboard-panel">
      {/* Header */}
      <div className={`flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 mb-6 ${compactLayout ? '' : 'sm:flex-row sm:items-center'}`}>
        <div>
          <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2 font-sans">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            Dashboard Genitori & Diagnostica
          </h2>
          <p className="text-xs text-slate-500">
            Monitora i progressi di <strong>{profile.name}</strong>, scopri i suoi punti di forza e le aree critiche.
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Main Grid: Overview cards */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${compactLayout ? '' : 'md:grid-cols-3'}`}>
        {/* Card 1: Accuratezza */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-black">
            {accuracyRate}%
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide font-sans">Precisione Risposte</h4>
            <span className="text-lg font-black text-slate-800 font-mono">
              {correctAnswers} esatte su {totalAnswers}
            </span>
          </div>
        </div>

        {/* Card 2: Tempo medio */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-lg font-bold font-mono">
            {averageSpeed}s
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Velocità di Risposta</h4>
            <span className="text-lg font-black text-slate-800">
              Media secondi per calcolo
            </span>
          </div>
        </div>

        {/* Card 3: Mondo ricostruito */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl">
            🏆
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mondi Sbloccati</h4>
            <span className="text-lg font-black text-slate-800">
              {profile.unlockedWorlds.length} aree su 9 liberate
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations & Pedagogical Guidance */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Consigli Pedagogici ed Evidenze Cognitive
        </h3>
        <div className="space-y-2.5">
          {getPedagogicalAdvice().map((adv, idx) => (
            <div 
              key={idx} 
              className="text-xs text-indigo-900 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-white/50"
              dangerouslySetInnerHTML={{ __html: adv }}
            />
          ))}
        </div>
      </div>

      {/* Detailed Analysis Section */}
      <div className={`grid grid-cols-1 gap-6 mb-6 ${compactLayout ? '' : 'lg:grid-cols-2'}`}>
        {/* Left column: Heatmap table representation of the 9x9 multiplier grid */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Griglia di Padronanza (Heatmap)</h3>
            <p className="text-[11px] text-slate-500">
              Analisi dettagliata di ogni singola casella da 2x2 a 10x10. Clicca per vedere i dettagli.
            </p>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[280px]">
              {/* Header row */}
              <div className="grid grid-cols-10 gap-1 text-center font-bold text-[10px] text-slate-400 mb-1">
                <div></div>
                {Array.from({ length: 9 }).map((_, col) => (
                  <div key={col} className="font-mono">{col + 2}</div>
                ))}
              </div>

              {/* Grid content */}
              {Array.from({ length: 9 }).map((_, rowIdx) => {
                const rowNum = rowIdx + 2;
                return (
                  <div key={rowIdx} className="grid grid-cols-10 gap-1 items-center text-center mb-1">
                    <div className="font-bold text-[10px] text-slate-400 font-mono text-left pl-1">{rowNum}</div>
                    {Array.from({ length: 9 }).map((_, colIdx) => {
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

          <div className="flex gap-4 mt-4 justify-center text-[10px] font-bold text-slate-500">
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
          </div>
        </div>

        {/* Right column: Critical weaknesses and dev settings */}
        <div className="flex flex-col gap-6">
          {/* Critical Weaknesses Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Combinazioni Ostiche (Errori Ripetuti)
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Queste specifiche operazioni presentano frequenti errori cognitivi. Il sistema adattivo darà loro priorità.
            </p>

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
          </div>

          {/* Development and diagnostic utilities */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" />
              Strumenti di Diagnostica e Ripristino
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Opzioni riservate a educatori o genitori per simulare o cancellare i dati dell'applicazione.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
