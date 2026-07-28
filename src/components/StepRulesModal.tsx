/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { WorldConfig } from '../types';
import { withTableIcon } from '../utils/tableLabels';

interface StepRulesModalProps {
  step: string; // 'comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'
  world: WorldConfig;
  onClose: () => void;
  isMandatory?: boolean; // If true, disable X button and emphasize the close button
  isPage?: boolean; // If true, render as full-page content instead of modal overlay
}

export default function StepRulesModal({ step, world, onClose, isMandatory = false, isPage = false }: StepRulesModalProps) {
  const stepTitles: { [key: string]: string } = {
    comprendo: '1. Comprendo il concetto 🍎',
    salto: '2. Conteggio per salti 🐸',
    costruisco: '3. Costruisco le equazioni 🧱',
    trucchi: '4. Trucchi e strategie 🧠',
    pratico: '5. Pratico (Avventura) 🛡️',
    sfida: '6. Sfida cronometrata ⚡'
  };

  const currentStepTitle = stepTitles[step] || step;

  // If rendering as page, return just the content
  if (isPage) {
    return (
      <div className="space-y-6 text-center max-w-lg mx-auto py-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-100 text-amber-700 mb-1 border-2 border-amber-300 shadow-md">
          <span className="text-4xl animate-bounce">🚧</span>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans mb-1">
            Aiuto: Work in Progress
          </h2>
          <p className="text-sm sm:text-base text-indigo-700 font-bold">
            {withTableIcon(world.id, `Tabellina del ${world.id}`)}
          </p>
        </div>

        <div className="bg-gradient-to-b from-amber-50 via-white to-amber-50/50 rounded-3xl p-6 border-2 border-amber-200/90 shadow-sm text-left space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
            <span>🛠️</span>
            <span>Guida per "{currentStepTitle}"</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold">
            I testi di aiuto e le istruzioni per questo passo sono attualmente in corso di riscrittura (Work in Progress).
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Stiamo preparando nuove spiegazioni chiare, intuitive e divertenti per guidarti al meglio! Torna a trovarci presto.
          </p>
        </div>
      </div>
    );
  }

  // Otherwise render as modal overlay
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={isMandatory ? undefined : onClose}
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
        {!isMandatory && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 mb-3 border-2 border-amber-300 shadow-sm">
          <span className="text-3xl animate-bounce">🚧</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-sans mb-1">
          Aiuto: Work in Progress
        </h2>
        <p className="text-xs font-bold text-indigo-700 mb-4">
          {withTableIcon(world.id, `Tabellina del ${world.id}`)}
        </p>

        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 text-left space-y-2 mb-6">
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
            I testi di aiuto per <strong>"{currentStepTitle}"</strong> sono in corso di riscrittura (Work in Progress).
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Stiamo preparando nuove istruzioni semplici ed efficaci per aiutarti a superare ogni sfida!
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
