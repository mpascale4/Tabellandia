/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { sound } from './SoundManager';

interface GroupVisualizerProps {
  a: number; // multiplier, e.g. 3
  b: number; // multiplicand, e.g. 4
  itemEmoji: string; // e.g. "💧"
  accentClass?: string;
}

export default function GroupVisualizer({ a, b, itemEmoji, accentClass }: GroupVisualizerProps) {
  // Track which items have been tapped/counted by the child
  const [tappedItems, setTappedItems] = useState<{ [key: string]: boolean }>({});
  
  // Reset tapped items when values change
  useEffect(() => {
    setTappedItems({});
  }, [a, b]);

  const handleItemTap = (groupIndex: number, itemIndex: number, globalIndex: number) => {
    const key = `${groupIndex}-${itemIndex}`;
    sound.playClick();
    setTappedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const totalItems = a * b;
  const countedCount = Object.values(tappedItems).filter(Boolean).length;

  return (
    <div className="w-full flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-inner border border-gray-100">
      <div className="text-center mb-3">
        <p className="text-sm text-gray-500 font-medium font-sans">
          Tocca gli oggetti per contarli uno ad uno!
        </p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-lg font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-full">
            Contati: {countedCount} / {totalItems}
          </span>
          {countedCount === totalItems && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              🎉 Ottimo lavoro!
            </motion.span>
          )}
        </div>
      </div>

      {/* Grid of Groups */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 justify-items-center max-h-[300px] overflow-y-auto p-2">
        {Array.from({ length: a }).map((_, groupIdx) => {
          return (
            <div 
              key={groupIdx} 
              className="bg-sky-50/50 rounded-xl p-3 border-2 border-dashed border-sky-200 w-full max-w-[150px] flex flex-col items-center shadow-sm"
              id={`visual-group-${groupIdx}`}
            >
              <div className="text-xs font-bold text-sky-700/80 mb-2 uppercase tracking-wide">
                Gruppo {groupIdx + 1}
              </div>
              
              <div className="grid grid-cols-3 gap-2 justify-center items-center">
                {Array.from({ length: b }).map((_, itemIdx) => {
                  const globalIdx = (groupIdx * b) + itemIdx + 1;
                  const itemKey = `${groupIdx}-${itemIdx}`;
                  const isTapped = tappedItems[itemKey];

                  return (
                    <motion.button
                      key={itemIdx}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleItemTap(groupIdx, itemIdx, globalIdx)}
                      className={`relative w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-colors cursor-pointer focus:outline-none ${
                        isTapped 
                          ? 'bg-amber-100 border-2 border-amber-400 shadow-md scale-105' 
                          : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }`}
                      id={`visual-item-${groupIdx}-${itemIdx}`}
                    >
                      <span className="select-none">{itemEmoji}</span>
                      
                      {/* Interactive Tap Count Indicator */}
                      {isTapped && (
                        <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                          {globalIdx}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Repeated Addition Equation */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-sm md:text-base font-bold text-gray-700 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200/50">
        <span className="text-indigo-600 font-mono">{a} x {b}</span>
        <span>=</span>
        {Array.from({ length: a }).map((_, idx) => (
          <span key={idx} className="flex items-center">
            <span className="text-amber-600 font-mono">{b}</span>
            {idx < a - 1 && <span className="mx-1 text-gray-400">+</span>}
          </span>
        ))}
        <span>=</span>
        <span className="text-emerald-600 font-mono font-extrabold text-lg">{a * b}</span>
      </div>
    </div>
  );
}
