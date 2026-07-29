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
  type StepRuleContent = {
    title: string;
    tone: string;
    objective: string;
    example: string;
    howTo: string[];
  };

  const exNum = world.id;
  const rulesByStep: Record<string, StepRuleContent> = {
    comprendo: {
      title: 'Raccogli',
      tone: 'bg-indigo-50 border-indigo-200 text-indigo-950',
      objective: 'Raccogli le mele nei cesti giusti: ogni cesto rappresenta un gruppo.',
      example: `Esempio: ${exNum} × 3 = ${exNum} cesti da 3 mele = ${exNum * 3} mele in tutto`,
      howTo: [
        'Le mele volano nell\'arena: toccale per farle cadere nel cesto.',
        'Ogni cesto si riempie con il numero giusto di mele.',
        'Riempi tutti i cesti per completare la moltiplicazione.',
        '⚠️ Dal ×4 in poi: un 🐝 calabrone vola nell\'arena! Se lo tocchi perdi subito il turno.'
      ]
    },
    salto: {
      title: 'Salta',
      tone: 'bg-sky-50 border-sky-200 text-sky-950',
      objective: 'Fai saltare la rana di sasso in sasso seguendo il ritmo della tabellina.',
      example: `Esempio (Tabellina del ${exNum}): salta di ${exNum} in ${exNum} (${exNum}, ${exNum * 2}, ${exNum * 3}...)`,
      howTo: [
        'Osserva i sassi nel ruscello e la rana in partenza.',
        'Tocca il numero corretto sul sasso giusto per farla saltare.',
        'Attenzione agli antagonisti dal ×4: premi il tasto 🐸 per saltarli!'
      ]
    },
    costruisco: {
      title: 'Scoppia',
      tone: 'bg-purple-50 border-purple-200 text-purple-950',
      objective: 'Scoppia il palloncino che porta il risultato corretto prima che voli via.',
      example: `Esempio: Per ${exNum} × 4, cerca il palloncino colorato col numero ${exNum * 4} e toccalo.`,
      howTo: [
        'I palloncini salgono con numeri diversi: trova quello col risultato giusto.',
        '⚠️ Dal ×4: compare un palloncino trappola con badge 💣 e lo stesso numero corretto — evita il badge!',
        'Se il palloncino giusto scappa in alto senza essere toccato, il turno è perso.'
      ]
    },
    trucchi: {
      title: 'Trova',
      tone: 'bg-amber-50 border-amber-200 text-amber-950',
      objective: 'Trova il mattone che nasconde il risultato giusto nella piramide.',
      example: `Esempio: Per ${exNum} × 2, trova il mattone con ${exNum * 2} prima che la piramide crolli.`,
      howTo: [
        'Osserva i mattoni durante il flash iniziale: memorizza dove sono i numeri.',
        'Tocca il mattone che pensi contenga il risultato corretto.',
        '⚠️ Il 🔨 martello parte gia da ×1: e lento all\'inizio, accelera da ×4, ×6 e ×8. Se colpisce quello giusto, perdi subito!'
      ]
    },
    pratico: {
      title: 'Pratico',
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-950',
      objective: 'Quiz di allenamento continuo per guadagnare gocce di luce.',
      example: `Esempio: Appare "${exNum} × 5 = ?". Tocca subito ${exNum * 5} tra le 4 scelte per avanzare nella serie.`,
      howTo: [
        'Leggi l\'operazione proposta sullo schermo.',
        'Tocca la risposta corretta tra le 4 opzioni disponibili.',
        'Raggiungi 10 risposte corrette consecutive per vincere.'
      ]
    },
    sfida: {
      title: 'Sfida',
      tone: 'bg-rose-50 border-rose-200 text-rose-950',
      objective: 'Test a tempo per mettere alla prova la velocità.',
      example: `Esempio: Rispondi a più moltiplicazioni possibili prima dello scadere dei 30 secondi.`,
      howTo: [
        'Avvia il timer di 30 secondi.',
        'Risolvi rapidamente ogni operazione toccando il numero esatto.',
        'Fai il record personale di risposte corrette.'
      ]
    }
  };

  const content = rulesByStep[step];

  const renderRules = () => {
    if (!content) return null;
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl border p-4 ${content.tone}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]">Obiettivo</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed">{content.objective}</p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-indigo-950">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-700">Esempio pratico</p>
          <p className="mt-1 text-sm font-black font-mono">{content.example}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Come si gioca</p>
          <div role="list" className="mt-2 grid grid-cols-1 gap-2">
            {content.howTo.map((item) => (
              <div key={item} role="listitem" className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-sm text-slate-700 leading-relaxed font-medium">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const stepTitles: { [key: string]: string } = {
    comprendo: '1. Raccogli le mele 🍎',
    salto: '2. Salta sui sassi 🐸',
    costruisco: '3. Scoppia il palloncino 🎈',
    trucchi: '4. Trova il mattone 🧱',
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
          <p className="mb-2 inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-900 motion-safe:animate-pulse">
            Work in progress
          </p>
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
          <p className="mb-2 inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-900 motion-safe:animate-pulse">
            Work in progress
          </p>
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
