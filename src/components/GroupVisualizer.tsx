import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';
import { Sparkles, Wand2, RotateCcw, CheckCircle, Volume2 } from 'lucide-react';
import { buildMultiplicationResultSpeech } from '../utils/voiceFeedback';

interface GroupVisualizerProps {
  a: number; // multiplier (e.g. 3) -> number of groups
  b: number; // multiplicand (e.g. 4) -> items per group
  itemEmoji: string;
  accentClass?: string;
  onCompletionChange?: (isCompleted: boolean) => void;
}

export default function GroupVisualizer({ a, b, itemEmoji, onCompletionChange }: GroupVisualizerProps) {
  // Track how many groups are summoned (0 to a)
  const [activeGroups, setActiveGroups] = useState<number>(0);
  // Track popped/counted items within active groups for audio fun: key "groupIdx-itemIdx"
  const [poppedItems, setPoppedItems] = useState<Set<string>>(new Set());
  const { speak } = useVoice();

  // Reset when factors change
  useEffect(() => {
    setActiveGroups(0);
    setPoppedItems(new Set());
  }, [a, b]);

  const totalItems = a * b;
  const isAllGroupsSummoned = activeGroups === a;

  useEffect(() => {
    if (onCompletionChange) {
      onCompletionChange(isAllGroupsSummoned);
    }
  }, [isAllGroupsSummoned, onCompletionChange]);

  // Handle summoning next group or a specific group
  const handleSummonGroup = (targetGroupIdx?: number) => {
    if (isAllGroupsSummoned && targetGroupIdx === undefined) return;

    let nextCount = activeGroups + 1;
    if (targetGroupIdx !== undefined) {
      if (targetGroupIdx < activeGroups) return; // already active
      nextCount = targetGroupIdx + 1;
    }

    sound.playPowerUp();
    setActiveGroups(nextCount);

    const currentTotal = nextCount * b;
    if (nextCount === a) {
      sound.playLevelUp();
      speak(buildMultiplicationResultSpeech(a, b, totalItems));
    } else {
      speak(`Gruppo ${nextCount}: ${b} ${itemEmoji}! In totale ${currentTotal}`);
    }
  };

  // Handle popping an individual item for fun counting
  const handlePopItem = (groupIdx: number, itemIdx: number) => {
    const key = `${groupIdx}-${itemIdx}`;
    if (poppedItems.has(key)) return;

    sound.playClick();
    const nextSet = new Set(poppedItems);
    nextSet.add(key);
    setPoppedItems(nextSet);

    // Speak absolute item number
    const globalCount = groupIdx * b + itemIdx + 1;
    speak(globalCount.toString());
  };

  const handleReset = () => {
    sound.playClick();
    setActiveGroups(0);
    setPoppedItems(new Set());
  };

  const handleSummonAll = () => {
    sound.playPowerUp();
    sound.playLevelUp();
    setActiveGroups(a);
    speak(buildMultiplicationResultSpeech(a, b, totalItems));
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* HUD Header */}
      <div className="w-full bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 rounded-2xl p-4 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl border border-white/30 shadow-inner">
            🪄
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black font-sans flex items-center gap-2">
              Evoca i Gruppi: {a} × {b}
            </h4>
            <p className="text-xs text-sky-100 font-medium">
              Crea <strong>{a} isole</strong> con <strong>{b} {itemEmoji}</strong> su ciascuna!
            </p>
          </div>
        </div>

        {/* Action button */}
        {!isAllGroupsSummoned ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSummonGroup()}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs sm:text-sm rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all font-sans"
            >
              <Wand2 className="w-4 h-4" /> Evoca Gruppo (+{b})
            </motion.button>
            {a > 2 && (
              <button
                onClick={handleSummonAll}
                className="px-3 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl border border-white/30 transition-colors cursor-pointer"
                title="Evoca tutti insieme"
              >
                ⚡ Tutti
              </button>
            )}
          </div>
        ) : (
          <div className="bg-emerald-400/30 border border-emerald-300/50 px-3.5 py-1.5 rounded-xl text-center flex-shrink-0">
            <span className="text-xs font-black text-emerald-100 flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-emerald-300" /> Completato!
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Addition Formula */}
      <div className="w-full bg-white rounded-2xl p-3 border-2 border-indigo-100 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-bold text-indigo-950 font-sans shadow-sm">
        <button
          type="button"
          className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-xs sm:text-sm font-mono font-black cursor-pointer hover:scale-105 transition-transform"
          onClick={() => speak(`${a} per ${b}`)}
          title="Ascolta l'operazione"
        >
          {a} × {b}
        </button>
        <span>=</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: a }).map((_, idx) => {
            const isSummoned = idx < activeGroups;
            return (
              <React.Fragment key={idx}>
                <button
                  type="button"
                  onClick={() => !isSummoned && handleSummonGroup(idx)}
                  className={`px-2.5 py-1 rounded-xl font-mono text-xs sm:text-sm transition-all cursor-pointer ${
                    isSummoned
                      ? 'bg-emerald-500 text-white font-black shadow-md scale-105 border border-emerald-400'
                      : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:border-indigo-400'
                  }`}
                >
                  {isSummoned ? b : '?'}
                </button>
                {idx < a - 1 && <span className="text-slate-300 font-black">+</span>}
              </React.Fragment>
            );
          })}
        </div>
        <span>=</span>
        <span className={`font-black font-mono text-sm sm:text-base px-3 py-1 rounded-xl border ${
          isAllGroupsSummoned
            ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-110'
            : 'bg-slate-100 text-slate-400 border-slate-200'
        }`}>
          {isAllGroupsSummoned ? totalItems : `${activeGroups * b} / ${totalItems}`}
        </span>
      </div>

      {/* Floating Islands Grid */}
      <div className={`w-full grid gap-2.5 sm:gap-3 ${
        a <= 3 ? 'grid-cols-1 sm:grid-cols-3' : a <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
      }`}>
        {Array.from({ length: a }).map((_, groupIdx) => {
          const isSummoned = groupIdx < activeGroups;

          return (
            <motion.div
              key={groupIdx}
              onClick={() => !isSummoned && handleSummonGroup(groupIdx)}
              whileHover={!isSummoned ? { scale: 1.02 } : undefined}
              className={`relative rounded-2xl p-2.5 sm:p-3 border-2 transition-all flex flex-col items-center justify-between min-h-[120px] shadow-sm ${
                isSummoned
                  ? 'bg-gradient-to-b from-sky-50 via-indigo-50/50 to-purple-50 border-indigo-300 shadow-indigo-100/50'
                  : 'bg-slate-50/80 border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer'
              }`}
            >
              {/* Island Tag */}
              <div className="w-full flex items-center justify-between mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-sans text-indigo-900 flex items-center gap-1">
                  🏝️ Gruppo {groupIdx + 1}
                </span>
                <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isSummoned ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isSummoned ? `${b} ${itemEmoji}` : 'Vuoto'}
                </span>
              </div>

              {/* Items Container */}
              <div className={`w-full flex-1 flex flex-wrap items-center justify-center gap-1 p-1.5 rounded-xl bg-white/90 border border-indigo-100/60 my-1 ${b > 6 ? 'max-h-[100px] overflow-y-auto' : ''}`}>
                {isSummoned ? (
                  Array.from({ length: b }).map((_, itemIdx) => {
                    const popKey = `${groupIdx}-${itemIdx}`;
                    const isPopped = poppedItems.has(popKey);

                    return (
                      <motion.button
                        key={itemIdx}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15, delay: itemIdx * 0.03 }}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePopItem(groupIdx, itemIdx);
                        }}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-sm sm:text-base border cursor-pointer transition-all ${
                          isPopped
                            ? 'bg-amber-200 border-amber-400 scale-110 shadow-sm ring-2 ring-amber-300'
                            : 'bg-sky-100/80 border-sky-200 hover:bg-sky-200/80'
                        }`}
                        title="Tocca per contare!"
                      >
                        {itemEmoji}
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300 py-1.5">
                    <Wand2 className="w-4 h-4 mb-0.5 animate-bounce opacity-50" />
                    <span className="text-[9px] font-bold text-slate-400">Tocca per evocare</span>
                  </div>
                )}
              </div>

              {/* Subtotal Footer */}
              <div className="mt-1 w-full pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold font-sans">
                <span className="text-slate-500">
                  {isSummoned ? `Totale:` : `In attesa...`}
                </span>
                <span className={`font-mono font-black ${isSummoned ? 'text-indigo-700' : 'text-slate-400'}`}>
                  {isSummoned ? (groupIdx + 1) * b : '?'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion Banner */}
      <AnimatePresence>
        {isAllGroupsSummoned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white rounded-2xl p-4 shadow-xl border-2 border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="text-sm sm:text-base font-black font-sans text-amber-200">
                  Perfetto! {a} per {b} fa {totalItems}!
                </h3>
                <p className="text-xs text-emerald-50 font-medium">
                  Puoi toccare le singole {itemEmoji} sulle isole per riascoltare il conteggio!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => speak(buildMultiplicationResultSpeech(a, b, totalItems))}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl border border-white/30 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Volume2 className="w-4 h-4" /> Ascolta
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs rounded-xl shadow transition-transform active:scale-95 cursor-pointer flex items-center gap-1 font-sans"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Rigioca
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
