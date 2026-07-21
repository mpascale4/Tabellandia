/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { sound } from './SoundManager';
import { useVoice } from '../contexts/VoiceContext';

interface GroupVisualizerProps {
  a: number; // multiplier, e.g. 3
  b: number; // multiplicand, e.g. 4
  itemEmoji: string; // e.g. "💧"
  accentClass?: string;
  onCompletionChange?: (isCompleted: boolean) => void;
}

export default function GroupVisualizer({ a, b, itemEmoji, accentClass, onCompletionChange }: GroupVisualizerProps) {
  const GROUP_BATCH_SIZE = 2;
  // Track which items have been tapped/counted by the child
  const [tappedItems, setTappedItems] = useState<{ [key: string]: number }>({});
  const [visibleGroupStart, setVisibleGroupStart] = useState<number>(0);
  const [showCompletionEffect, setShowCompletionEffect] = useState<boolean>(false);
  const [hasShownCompletionEffect, setHasShownCompletionEffect] = useState<boolean>(false);
  const { speak } = useVoice();
  
  // Reset tapped items when values change
  useEffect(() => {
    setTappedItems({});
    setVisibleGroupStart(0);
    setShowCompletionEffect(false);
    setHasShownCompletionEffect(false);
  }, [a, b]);

  const handleItemTap = (groupIndex: number, itemIndex: number) => {
    const key = `${groupIndex}-${itemIndex}`;
    if (tappedItems[key]) return;
    const nextCount = Object.keys(tappedItems).length + 1;
    sound.playClick();
    speak(nextCount.toString());
    setTappedItems(prev => ({
      ...prev,
      [key]: Object.keys(prev).length + 1
    }));
  };

  const totalItems = a * b;
  const countedCount = Object.keys(tappedItems).length;
  const isDenseLayout = b >= 8;
  const groupGridColsClass = b >= 10 ? 'grid-cols-5' : b >= 8 ? 'grid-cols-4' : 'grid-cols-3';
  const groupGapClass = b >= 10 ? 'gap-1.5' : 'gap-2';
  const itemSizeClass = b >= 10 ? 'w-8 h-8 text-lg' : b >= 8 ? 'w-8 h-8 text-lg' : 'w-9 h-9 text-xl';
  const groupPaddingClass = b >= 10 ? 'p-2.5' : 'p-3';
  const visibleGroupIndices = Array.from(
    { length: Math.max(0, Math.min(GROUP_BATCH_SIZE, a - visibleGroupStart)) },
    (_, idx) => visibleGroupStart + idx
  );
  const isGroupComplete = (groupIdx: number) => {
    return Array.from({ length: b }).every((_, itemIdx) => Boolean(tappedItems[`${groupIdx}-${itemIdx}`]));
  };

  useEffect(() => {
    if (onCompletionChange) {
      onCompletionChange(countedCount === totalItems);
    }
  }, [countedCount, totalItems, onCompletionChange]);

  useEffect(() => {
    if (visibleGroupIndices.length === 0) return;
    const allVisibleCompleted = visibleGroupIndices.every(isGroupComplete);
    const hasNextBatch = visibleGroupStart + GROUP_BATCH_SIZE < a;

    if (allVisibleCompleted && hasNextBatch) {
      setVisibleGroupStart(prev => Math.min(prev + GROUP_BATCH_SIZE, a - 1));
    }
  }, [tappedItems, visibleGroupStart, visibleGroupIndices, a, b]);

  useEffect(() => {
    if (countedCount === totalItems && totalItems > 0 && !hasShownCompletionEffect) {
      setShowCompletionEffect(true);
      setHasShownCompletionEffect(true);
    }
  }, [countedCount, totalItems, hasShownCompletionEffect]);

  return (
    <div className="w-full relative flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-inner border border-gray-100">
      {/* Repeated Addition Equation (top) */}
      <div className="mb-4 w-full flex flex-wrap items-center justify-center gap-1.5 text-sm md:text-base font-bold text-gray-700 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200/50">
        <span className="text-indigo-600 font-mono">{a} x {b}</span>
        <span>=</span>
        {Array.from({ length: a }).map((_, idx) => {
          const termCompleted = isGroupComplete(idx);
          return (
            <span key={idx} className="flex items-center">
              <span
                className={`font-mono px-1.5 py-0.5 rounded-full border-2 ${
                  termCompleted
                    ? 'text-amber-800 bg-amber-100 border-amber-400 shadow-sm'
                    : 'text-slate-500 bg-white border-slate-200'
                }`}
              >
                {b}
              </span>
              {idx < a - 1 && <span className="mx-1 text-gray-400">+</span>}
            </span>
          );
        })}
        <span>=</span>
        <span className="text-emerald-600 font-mono font-extrabold text-lg">{a * b}</span>
      </div>

      {/* Grid of Groups */}
      <div className={`w-full flex flex-wrap items-center justify-center ${isDenseLayout ? 'gap-2' : 'gap-3'} p-2`}>
        {visibleGroupIndices.map((groupIdx) => {
          return (
            <div 
              key={groupIdx} 
              className={`bg-sky-50/50 rounded-xl ${groupPaddingClass} border-2 border-dashed border-sky-200 flex flex-col items-center shadow-sm flex-shrink-0 overflow-hidden relative`}
              id={`visual-group-${groupIdx}`}
            >
              <div className="text-xs font-bold text-sky-700/80 mb-2 uppercase tracking-wide">
                Gruppo {groupIdx + 1}
              </div>
              
              <div className={`grid ${groupGridColsClass} ${groupGapClass} justify-center items-center`}>
                {Array.from({ length: b }).map((_, itemIdx) => {
                  const itemKey = `${groupIdx}-${itemIdx}`;
                  const tapOrder = tappedItems[itemKey];
                  const isTapped = Boolean(tapOrder);

                  return (
                    <motion.button
                      key={itemIdx}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleItemTap(groupIdx, itemIdx)}
                      className={`relative ${itemSizeClass} flex items-center justify-center rounded-lg transition-colors cursor-pointer focus:outline-none ${
                        isTapped 
                          ? 'bg-amber-100 border-2 border-amber-400 shadow-md scale-105' 
                          : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }`}
                      id={`visual-item-${groupIdx}-${itemIdx}`}
                    >
                      <span className="select-none">{itemEmoji}</span>
                      
                      {/* Interactive Tap Count Indicator */}
                      {isTapped && (
                        <motion.span
                          initial={{ scale: 0.5, y: -10 }}
                          animate={{ scale: 1, y: 0 }}
                          className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white font-mono text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-200 ring-2 ring-white"
                        >
                          {tapOrder}
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showCompletionEffect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-2xl flex items-center justify-center pointer-events-auto"
        >
          <div className="bg-white/95 border-2 border-emerald-300 shadow-xl rounded-2xl px-5 py-4 text-center">
            <p className="text-sm font-black text-emerald-700">🎉 Ottimo lavoro!</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
