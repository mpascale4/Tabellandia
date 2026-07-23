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
  const example_a = world.id;
  const example_b = 4;
  const example_result = example_a * example_b;

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
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border-4 border-indigo-300 relative my-4"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
          aria-label="Chiudi regole"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl font-black text-indigo-950 font-sans mb-2">
            Come giocare
          </h2>
          <p className="text-sm sm:text-base text-indigo-700 font-bold">
            {withTableIcon(world.id, `Tabellina del ${world.id}`)}
          </p>
        </div>

        {/* Rules content */}
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Step 1 */}
          <div className="bg-indigo-50/50 rounded-2xl p-4 border-2 border-indigo-200">
            <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">1</span>
              Comprendo il concetto
            </h3>
            <p className="text-sm text-indigo-800">
              La moltiplicazione è <strong>addizione ripetuta</strong>. Ad esempio: <strong>{example_a} x {example_b} = {example_a} + {example_a} + {example_a} + {example_a}</strong>
            </p>
            <div className="mt-3 bg-white rounded-lg p-3 border border-indigo-100">
              <p className="text-xs text-slate-500 mb-2 font-semibold">ESEMPIO:</p>
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                <span className="text-indigo-600">{example_a}</span>
                <span className="text-slate-400">+</span>
                <span className="text-indigo-600">{example_a}</span>
                <span className="text-slate-400">+</span>
                <span className="text-indigo-600">{example_a}</span>
                <span className="text-slate-400">+</span>
                <span className="text-indigo-600">{example_a}</span>
                <span className="text-slate-400">=</span>
                <span className="text-emerald-600 font-black text-base">{example_result}</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-sky-50/50 rounded-2xl p-4 border-2 border-sky-200">
            <h3 className="text-lg font-bold text-sky-900 mb-2 flex items-center gap-2">
              <span className="bg-sky-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">2</span>
              Conteggio per salti
            </h3>
            <p className="text-sm text-sky-800">
              Salta di <strong>{example_a} in {example_a}</strong>. Tocca il numero corretto nella sequenza.
            </p>
            <div className="mt-3 bg-white rounded-lg p-3 border border-sky-100">
              <p className="text-xs text-slate-500 mb-2 font-semibold">SEQUENZA:</p>
              <div className="flex items-center justify-center gap-2 flex-wrap text-sm font-bold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-sky-600">{(i + 1) * example_a}</span>
                ))}
                <span className="text-slate-400">...</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-purple-50/50 rounded-2xl p-4 border-2 border-purple-200">
            <h3 className="text-lg font-bold text-purple-900 mb-2 flex items-center gap-2">
              <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">3</span>
              Costruisco le equazioni
            </h3>
            <p className="text-sm text-purple-800">
              Abbina i fattori ai risultati corretti. Trasforma il concetto in simboli matematici.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-amber-50/50 rounded-2xl p-4 border-2 border-amber-200">
            <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
              <span className="bg-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">4</span>
              Trucchi e strategie
            </h3>
            <p className="text-sm text-amber-800">
              Scopri scorciatoie e pattern per memorizzare le tabelline più velocemente.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border-2 border-emerald-200">
            <h3 className="text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <span className="bg-emerald-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">5</span>
              Pratico - Quiz veloce
            </h3>
            <p className="text-sm text-emerald-800">
              Rispondi velocemente! Guadagna monete per ogni risposta corretta.
            </p>
          </div>

          {/* Step 6 */}
          <div className="bg-rose-50/50 rounded-2xl p-4 border-2 border-rose-200">
            <h3 className="text-lg font-bold text-rose-900 mb-2 flex items-center gap-2">
              <span className="bg-rose-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">6</span>
              Sfida cronometrata
            </h3>
            <p className="text-sm text-rose-800">
              30 secondi per rispondere a tante domande possibile! Ottieni il punteggio più alto.
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-lg shadow-lg cursor-pointer transition-all"
        >
          Ho capito! Iniziamo 🚀
        </button>
      </motion.div>
    </motion.div>
  );
}
