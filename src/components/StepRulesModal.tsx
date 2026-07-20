/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { WorldConfig } from '../types';

interface StepRulesModalProps {
  step: string; // 'comprendo', 'salto', 'costruisco', 'trucchi', 'pratico', 'sfida'
  world: WorldConfig;
  onClose: () => void;
  isMandatory?: boolean; // If true, disable X button and emphasize the close button
}

export default function StepRulesModal({ step, world, onClose, isMandatory = false }: StepRulesModalProps) {
  const example_a = world.id;
  const example_b = 4;
  const example_result = example_a * example_b;

  // Render different content based on step
  const renderRules = () => {
    switch (step) {
      case 'comprendo':
        return (
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <h4 className="font-bold text-indigo-900 mb-2">📚 Come funziona?</h4>
              <p className="text-sm text-indigo-800">
                La moltiplicazione è <strong>addizione ripetuta</strong>. Vedi i gruppi di oggetti e contali tutti insieme!
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold">ESEMPIO:</p>
              <p className="text-sm font-bold text-indigo-700 mb-3">
                {example_a} x {example_b} = {example_a} + {example_a} + {example_a} + {example_a} = {example_result}
              </p>
              <p className="text-xs text-slate-600">
                Vedi {example_a} ceste con {example_b} oggetti ciascuna. Quanti oggetti in totale? 
                <strong className="block mt-1 text-lg text-emerald-600">{example_result} oggetti!</strong>
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="font-bold text-yellow-900 mb-2">💡 Obiettivo:</h4>
              <p className="text-sm text-yellow-800">Tocca gli oggetti per contarli uno ad uno e capire il concetto di moltiplicazione!</p>
            </div>
          </div>
        );

      case 'salto':
        return (
          <div className="space-y-4">
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-200">
              <h4 className="font-bold text-sky-900 mb-2">🐸 Come funziona?</h4>
              <p className="text-sm text-sky-800">
                La rana salta di {example_a} in {example_a}. Tocca il numero corretto per ogni salto!
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold">SEQUENZA DEL {example_a}:</p>
              <div className="flex items-center justify-center gap-2 flex-wrap my-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="bg-sky-100 text-sky-700 font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                    {(i + 1) * example_a}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-600">
                Ogni salto aumenta di {example_a}. Non confonderti!
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="font-bold text-yellow-900 mb-2">💡 Obiettivo:</h4>
              <p className="text-sm text-yellow-800">Completa 10 salti corretti seguendo la sequenza!</p>
            </div>
          </div>
        );

      case 'costruisco':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <h4 className="font-bold text-purple-900 mb-2">🧱 Come funziona?</h4>
              <p className="text-sm text-purple-800">
                Abbina i <strong>fattori</strong> ai loro <strong>risultati</strong> corretti. Trasforma il concetto in simboli!
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold">ESEMPIO:</p>
              <p className="text-sm font-bold text-purple-700 mb-3">
                Sinistra: {example_a} x 2, {example_a} x 3, {example_a} x 4...
              </p>
              <p className="text-sm font-bold text-purple-700 mb-3">
                Destra (palloncini): {example_a * 2}, {example_a * 4}, {example_a * 3}... (mesciolati!)
              </p>
              <p className="text-xs text-slate-600">
                Tocca il fattore a sinistra, poi scegli il risultato corretto dai palloncini a destra.
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="font-bold text-yellow-900 mb-2">💡 Obiettivo:</h4>
              <p className="text-sm text-yellow-800">Costruisci correttamente tutti i 10 fattori!</p>
            </div>
          </div>
        );

      case 'trucchi':
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h4 className="font-bold text-amber-900 mb-2">🧠 Come funziona?</h4>
              <p className="text-sm text-amber-800">
                {world.trickDescription}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold">TRUCCO SPECIALE:</p>
              <p className="text-sm font-bold text-amber-700">
                {world.trickTitle}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="font-bold text-yellow-900 mb-2">💡 Obiettivo:</h4>
              <p className="text-sm text-yellow-800">Leggi il trucco e rispondi correttamente!</p>
            </div>
          </div>
        );

      case 'pratico':
        return (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <h4 className="font-bold text-emerald-900 mb-2">⚔️ Come funziona?</h4>
              <p className="text-sm text-emerald-800">
                Rispondi velocemente a tante domande! Ogni risposta corretta = 1 moneta + 1 goccia di luce.
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold">MECCANICA:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>✓ Risposta corretta = moneta + goccia luce</li>
                <li>✗ Risposta sbagliata = ri-tentare</li>
                <li>🔁 Domande sbagliate tornano alla fine</li>
              </ul>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="font-bold text-yellow-900 mb-2">💡 Obiettivo:</h4>
              <p className="text-sm text-yellow-800">Rispondi correttamente a tutte le domande per sbloccare il mondo!</p>
            </div>
          </div>
        );

      case 'sfida':
        return (
          <div className="space-y-4">
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
              <h4 className="font-bold text-rose-900 mb-2">⚡ Come funziona?</h4>
              <p className="text-sm text-rose-800">
                30 secondi cronometrati! Rispondi a più domande possibile per ottenere le stelle d'oro.
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold">PUNTEGGI:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>⭐ 4 risposte corrette = 1 stella</li>
                <li>⭐⭐ 8 risposte corrette = 2 stelle</li>
                <li>⭐⭐⭐ 12+ risposte corrette = 3 stelle</li>
              </ul>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="font-bold text-yellow-900 mb-2">💡 Obiettivo:</h4>
              <p className="text-sm text-yellow-800">Ottieni il massimo punteggio! Le stelle aumentano il tuo livello!</p>
            </div>
          </div>
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
            Tabellina del {world.id}
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
