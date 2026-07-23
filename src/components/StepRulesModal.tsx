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
  const renderWorkInProgress = (title: string, tone: string, message: string) => (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${tone}`}>
        <h4 className="mb-2 font-bold">Work in progress</h4>
        <p className="text-sm">
          {message}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Aiuto in aggiornamento
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Stiamo riscrivendo la finestra di help di <strong>{title}</strong> per renderla piu chiara e piu utile.
        </p>
      </div>
    </div>
  );

  // Render different content based on step
  const renderRules = () => {
    switch (step) {
      case 'comprendo':
        return renderWorkInProgress(
          'Comprendo',
          'bg-indigo-50 border-indigo-200 text-indigo-900',
          'Stiamo riscrivendo l aiuto di Comprendo.'
        );

      case 'salto':
        return renderWorkInProgress(
          'Salto',
          'bg-sky-50 border-sky-200 text-sky-900',
          'Stiamo riscrivendo l aiuto di Salto.'
        );

      case 'costruisco':
        return renderWorkInProgress(
          'Costruisco',
          'bg-purple-50 border-purple-200 text-purple-900',
          'Stiamo riscrivendo l aiuto di Costruisco.'
        );

      case 'trucchi':
        return renderWorkInProgress(
          'Trucchi',
          'bg-amber-50 border-amber-200 text-amber-900',
          'Stiamo riscrivendo l aiuto di Trucchi.'
        );

      case 'pratico':
        return renderWorkInProgress(
          'Pratico',
          'bg-emerald-50 border-emerald-200 text-emerald-900',
          'Stiamo riscrivendo l aiuto di Pratico.'
        );

      case 'sfida':
        return renderWorkInProgress(
          'Sfida',
          'bg-rose-50 border-rose-200 text-rose-900',
          'Stiamo riscrivendo l aiuto di Sfida.'
        );

      default:
        return null;
    }
  };

  const stepTitles: { [key: string]: string } = {
    comprendo: '1. Comprendo il concetto 🍎',
    salto: '2. Conteggio per salti 🐸',
    costruisco: '3. Costruisco le equazioni 🧱',
    trucchi: '4. Trucchi e strategie 🧠',
    pratico: '5. Pratico (Avventura) 🛡️',
    sfida: '6. Sfida cronometrata ⚡'
  };

  // If rendering as page, return just the content
  if (isPage) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl font-black text-indigo-950 font-sans mb-2">
            {stepTitles[step] || 'Regole'}
          </h2>
          <p className="text-sm sm:text-base text-indigo-700 font-bold">
            {withTableIcon(world.id, `Tabellina del ${world.id}`)}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {renderRules()}
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
        {!isMandatory && (
         <button
           onClick={onClose}
           className="absolute top-4 right-4 w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
           aria-label="Chiudi regole"
         >
           <X className="w-5 h-5" />
         </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl font-black text-indigo-950 font-sans mb-2">
            {stepTitles[step] || 'Regole'}
          </h2>
          <p className="text-sm sm:text-base text-indigo-700 font-bold">
            {withTableIcon(world.id, `Tabellina del ${world.id}`)}
          </p>
        </div>

        {/* Rules content */}
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {renderRules()}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-lg shadow-lg cursor-pointer transition-all ${
            isMandatory ? 'ring-4 ring-amber-300 ring-offset-2' : ''
          }`}
        >
          {isMandatory ? '✅ Ho Capito! Iniziamo 🚀' : 'Capito! Iniziamo 🚀'}
        </button>
      </motion.div>
    </motion.div>
  );
}
