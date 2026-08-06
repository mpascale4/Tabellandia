/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { WorldConfig } from '../types';
import { sound } from './SoundManager';
import { Landmark } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

interface MonumentAreaProps {
  world: WorldConfig;
  completedMonuments: string[]; // IDs of monuments user has completed
  userDrops?: number;
  onRebuildMonument?: (monId: string, cost: number) => void;
}

export default function MonumentArea({
  world,
  completedMonuments,
  userDrops = 0,
  onRebuildMonument
}: MonumentAreaProps) {
  const { speak } = useVoice();
  const monuments = world.monuments || [];
  const [pendingUnlock, setPendingUnlock] = useState<{ id: string; name: string; cost: number; emoji: string; description: string } | null>(null);
  const [insufficientNotice, setInsufficientNotice] = useState<{ name: string; cost: number } | null>(null);

  useEffect(() => {
    if (!insufficientNotice) return;
    void speak('Per avere le gocce, completa prima tutti i passi, fai pratica e vinci la Sfida.');
  }, [insufficientNotice, speak]);

  // Terrain background colors based on world
  const getTerrainClass = () => {
    const terrainMap: { [key: number]: string } = {
      2: 'from-emerald-50 via-green-100/60 to-emerald-200/40 border-emerald-300',
      3: 'from-sky-50 via-blue-100/60 to-sky-200/40 border-sky-300',
      4: 'from-amber-50 via-orange-100/60 to-amber-200/40 border-amber-300',
      5: 'from-yellow-50 via-amber-100/60 to-yellow-200/40 border-yellow-300',
      6: 'from-rose-50 via-red-100/60 to-rose-200/40 border-rose-300',
      7: 'from-purple-50 via-indigo-100/60 to-purple-200/40 border-purple-300',
      8: 'from-pink-50 via-rose-100/60 to-pink-200/40 border-pink-300',
      9: 'from-teal-50 via-cyan-100/60 to-teal-200/40 border-teal-300',
    };
    return terrainMap[world.id] || 'from-slate-50 to-slate-200 border-slate-300';
  };

  const handleCardClick = (monument: { id: string; name: string; cost: number; emoji: string; description: string }, isCompleted: boolean) => {
    if (isCompleted) {
      sound.playClick();
      return;
    }

    if (userDrops >= monument.cost) {
      sound.playClick();
      setPendingUnlock(monument);
    } else {
      sound.playError();
      setInsufficientNotice({ name: monument.name, cost: monument.cost });
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
          <Landmark className="w-4 h-4 text-amber-600" />
          Monumenti del Regno
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300 shadow-xs">
            🏛️ {completedMonuments.length}/{monuments.length}
          </span>
          <span className="text-[11px] font-black text-sky-900 bg-sky-100/90 px-2 py-0.5 rounded-full border border-sky-300 shadow-xs">
            💧 {userDrops}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className={`flex-1 rounded-2xl p-3 sm:p-4 border-2 bg-gradient-to-b ${getTerrainClass()} relative flex flex-col justify-between overflow-hidden shadow-sm min-h-[220px]`}>
        {/* Monuments Stack / Grid */}
        <div className="relative z-10 grid grid-cols-1 gap-2.5 h-full">
          {monuments.map((monument) => {
            const isCompleted = completedMonuments.includes(monument.id);

            return (
              <button
                key={monument.id}
                onClick={() => handleCardClick(monument, isCompleted)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer relative ${
                  isCompleted
                    ? 'bg-white/90 border-emerald-300 shadow-xs hover:bg-emerald-50/50'
                    : userDrops >= monument.cost
                      ? 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-50 border-amber-500 shadow-md ring-2 ring-amber-400/80 animate-monument-glow'
                      : 'bg-white/60 border-slate-200 opacity-80 hover:bg-white/80'
                }`}
              >
                {/* Emoji Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 select-none ${
                  isCompleted
                    ? 'bg-emerald-100/80 border border-emerald-200'
                    : userDrops >= monument.cost
                      ? 'bg-amber-200/90 border border-amber-400 shadow-inner'
                      : 'bg-slate-100 border border-slate-200'
                }`}>
                  {monument.emoji}
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className={`text-xs font-black truncate ${isCompleted ? 'text-emerald-950' : userDrops >= monument.cost ? 'text-amber-950 font-black' : 'text-slate-800'}`}>
                      {monument.name}
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {monument.description}
                  </p>
                  
                  {/* Cost badge required */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : userDrops >= monument.cost
                          ? 'bg-amber-300 text-amber-950 border border-amber-500 animate-badge-blink shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {isCompleted ? (
                        <>✓ Eretto</>
                      ) : userDrops >= monument.cost ? (
                        <>✨ Sbloccabile ora! (💧 {monument.cost})</>
                      ) : (
                        <>💧 Richiede {monument.cost} gocce</>
                      )}
                    </span>
                  </div>
                </div>

                {/* Right Action Badge */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {isCompleted ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      ✓
                    </span>
                  ) : userDrops >= monument.cost ? (
                    <span className="text-[11px] font-black text-white bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 border border-amber-300 px-2.5 py-1 rounded-xl shadow-md animate-bounce hover:scale-105">
                      Sblocca 🔓 ✨
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                      🔒 {monument.cost}💧
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingUnlock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-indigo-100 text-center relative overflow-hidden"
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl shadow-inner">
              {pendingUnlock.emoji}
            </div>
            <h3 className="text-base font-black text-indigo-950 mb-1">
              Ricostruisci {pendingUnlock.name}?
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {pendingUnlock.description}
            </p>

            <div className="bg-sky-50 rounded-2xl p-3 border border-sky-100 mb-4 flex items-center justify-between text-xs font-bold text-sky-950">
              <span>Costo monumento:</span>
              <span className="text-amber-700 font-black">💧 {pendingUnlock.cost} Gocce</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPendingUnlock(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (onRebuildMonument) {
                    onRebuildMonument(pendingUnlock.id, pendingUnlock.cost);
                  }
                  setPendingUnlock(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-md hover:from-emerald-600 hover:to-teal-700 cursor-pointer transition-all"
              >
                Sblocca! 🏛️
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Insufficient Drops Modal */}
      {insufficientNotice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-amber-100 text-center relative"
          >
            <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl text-amber-500 shadow-inner">
              💧
            </div>
            <h3 className="text-base font-black text-amber-950 mb-1">
              Gocce Insufficienti!
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Ti servono <strong className="text-amber-800">{insufficientNotice.cost} gocce 💧</strong> per ricostruire "<strong className="text-slate-800">{insufficientNotice.name}</strong>".<br />
              Al momento ne possiedi solo <strong className="text-sky-700">{userDrops} 💧</strong>.
            </p>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-amber-900 text-[11px] font-medium mb-4 text-left leading-relaxed">
              💡 Completa gli esercizi nel <strong>Pratico (Avventura)</strong> per guadagnare altre gocce magiche!
            </div>

            <button
              onClick={() => setInsufficientNotice(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
            >
              Ho Capito! ✓
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
