/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { WorldConfig } from '../types';

interface MonumentAreaProps {
  world: WorldConfig;
  completedMonuments: string[]; // IDs of monuments user has completed
}

export default function MonumentArea({ world, completedMonuments }: MonumentAreaProps) {
  const monuments = world.monuments || [];
  
  // Terrain background colors based on world
  const getTerrainClass = () => {
    const terrainMap: { [key: number]: string } = {
      2: 'from-green-100 to-emerald-100',      // Forest
      3: 'from-sky-100 to-blue-100',           // Lake
      4: 'from-amber-100 to-orange-100',       // Mountains
      5: 'from-yellow-100 to-amber-100',       // Caves
      6: 'from-red-100 to-rose-100',           // Volcano
      7: 'from-purple-100 to-indigo-100',      // Tower
      8: 'from-pink-100 to-rose-100',          // Sky City
      9: 'from-teal-100 to-cyan-100',          // Temple
    };
    return terrainMap[world.id] || 'from-slate-100 to-slate-200';
  };

  // Decorative elements based on world
  const getDecorations = () => {
    const decorMap: { [key: number]: string } = {
      2: '🌳🌲🌿',     // Trees
      3: '🌊💧🌊',     // Water
      4: '⛰️🪨⛰️',     // Rocks
      5: '🍄🪨🍄',     // Mushrooms
      6: '🌋🔥🌋',     // Volcano effects
      7: '✨🔮✨',      // Magic
      8: '☁️⚙️☁️',     // Clouds
      9: '🪨☮️🪨',     // Zen stones
    };
    return decorMap[world.id] || '✨';
  };

  const decorChars = getDecorations().split('');

  return (
    <div className="w-full">
      {/* Empty/Destroyed State Header */}
      <div className="text-center mb-4">
        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">
          L'Area da Ricostruire
        </h4>
        <p className="text-xs text-slate-500">
          Completa i calcoli e raccogli le gocce per erigere i monumenti!
        </p>
      </div>

      {/* Main Terrain Area */}
      <div className={`bg-gradient-to-b ${getTerrainClass()} rounded-2xl p-6 border-4 border-slate-300 min-h-[280px] relative overflow-hidden shadow-inner`}>
        {/* Destroyed/Empty effect at start */}
        {completedMonuments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="text-center">
              <div className="text-5xl mb-2">💔</div>
              <div className="text-sm font-bold text-slate-600">Area Distrutta</div>
            </div>
          </div>
        )}

        {/* Decorative background elements */}
        <div className="absolute inset-0 flex items-end justify-around opacity-20 pointer-events-none">
          {decorChars.map((char, idx) => (
            <div key={idx} className="text-6xl opacity-40 select-none">
              {char}
            </div>
          ))}
        </div>

        {/* Monuments Grid */}
        <div className="relative z-10 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-4">
          {monuments.map((monument, idx) => {
            const isCompleted = completedMonuments.includes(monument.id);
            
            return (
              <motion.div
                key={monument.id}
                initial={isCompleted ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.5, scale: 0.8, y: 40 }}
                animate={isCompleted ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.4, scale: 0.8, y: 40 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`relative flex flex-col items-center justify-end h-[140px] rounded-xl p-3 border-2 transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-t from-indigo-200/50 to-transparent border-indigo-400 shadow-lg'
                    : 'bg-gray-200/40 border-gray-400 opacity-60'
                }`}
              >
                {/* Monument Emoji - scales up when completed */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={isCompleted ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 150, 
                    damping: 12,
                    delay: isCompleted ? idx * 0.1 + 0.2 : idx * 0.1
                  }}
                  className="text-5xl mb-2 select-none drop-shadow"
                >
                  {monument.emoji}
                </motion.div>

                {/* Monument Info */}
                <div className="text-center">
                  <h5 className={`text-xs font-bold mb-1 line-clamp-2 ${
                    isCompleted ? 'text-indigo-900' : 'text-gray-600'
                  }`}>
                    {monument.name}
                  </h5>
                  <p className={`text-[10px] leading-tight ${
                    isCompleted ? 'text-indigo-700' : 'text-gray-500'
                  }`}>
                    {monument.description}
                  </p>
                </div>

                {/* Cost badge */}
                <motion.div
                  animate={isCompleted ? { 
                    scale: [1, 1.1, 1],
                    backgroundColor: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.2)']
                  } : {}}
                  transition={{ duration: 0.6, delay: idx * 0.1 + 0.3 }}
                  className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-700'
                      : 'bg-gray-400/20 text-gray-600'
                  }`}
                >
                  💧 {monument.cost}
                </motion.div>

                {/* Completion checkmark */}
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: idx * 0.1 + 0.4 }}
                    className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] font-black shadow-md"
                    aria-hidden="true"
                  >
                    ✓
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Completion message */}
        {completedMonuments.length === monuments.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-6xl mb-3"
              >
                🎉
              </motion.div>
              <h4 className="text-xl font-black text-indigo-950">Area Completamente Ricostruita!</h4>
              <p className="text-sm text-slate-700 mt-1">Tutte le meraviglie sono state restaurate!</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
