/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { WorldConfig } from '../types';
import { withTableIcon } from '../utils/tableLabels';

interface RulesModalProps {
  world: WorldConfig;
  onClose: () => void;
}

export default function RulesModal({ world, onClose }: RulesModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-amber-300 relative my-4 text-center"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 mb-3 border-2 border-amber-300 shadow-sm">
          <span className="text-3xl animate-bounce">🚧</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-sans mb-1">
          Guida e Regole: Work in Progress
        </h2>
        <p className="text-xs font-bold text-indigo-700 mb-4">
          {withTableIcon(world.id, `Tabellina del ${world.id}`)}
        </p>

        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 text-left space-y-2 mb-6">
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
            I contenuti di aiuto e le regole del gioco sono attualmente in corso di riscrittura e aggiornamento (Work in Progress).
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Stiamo preparando una guida interattiva completa e intuitiva. Torna a trovarci presto!
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-sm shadow-md cursor-pointer transition-transform active:scale-95"
        >
          Ho capito! 👍
        </button>
      </motion.div>
    </motion.div>
  );
}
