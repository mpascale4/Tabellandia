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
    howTo: string[];
    doneWhen: string;
    tip: string;
  };

  const rulesByStep: Record<string, StepRuleContent> = {
    comprendo: {
      title: 'Comprendo',
      tone: 'bg-indigo-50 border-indigo-200 text-indigo-950',
      objective: 'Capire che moltiplicare vuol dire fare gruppi uguali.',
      howTo: [
        'Osserva i gruppi di oggetti e conta quanti elementi ci sono in totale.',
        'Scegli il risultato corretto tra le opzioni.',
        'Se sbagli, riprova con calma: l obiettivo e capire, non correre.'
      ],
      doneWhen: 'Completi tutte le 10 combinazioni della tabellina.',
      tip: 'Pensa: "numero di gruppi x elementi per gruppo".'
    },
    salto: {
      title: 'Salto',
      tone: 'bg-sky-50 border-sky-200 text-sky-950',
      objective: 'Allenare il conteggio a salti per memorizzare la sequenza.',
      howTo: [
        'Fai avanzare la rana saltando di numero in numero.',
        'Ogni salto segue il ritmo della tabellina scelta.',
        'Mantieni il ritmo: la sequenza ti guida alla risposta.'
      ],
      doneWhen: 'Raggiungi la fine del percorso per tutte le 10 combinazioni.',
      tip: 'Leggi ad alta voce i numeri: aiuta la memoria.'
    },
    costruisco: {
      title: 'Costruisco',
      tone: 'bg-purple-50 border-purple-200 text-purple-950',
      objective: 'Costruire la moltiplicazione nella griglia con ordine e precisione.',
      howTo: [
        'Guarda la griglia e individua il risultato corretto.',
        'Seleziona i numeri giusti senza fretta.',
        'Completa ogni schema per consolidare la regola.'
      ],
      doneWhen: 'Completi tutte le 10 combinazioni dello step.',
      tip: 'Cerca i pattern: nella griglia i numeri si ripetono con logica.'
    },
    trucchi: {
      title: 'Trucchi',
      tone: 'bg-amber-50 border-amber-200 text-amber-950',
      objective: 'Usare strategie semplici per rispondere più velocemente.',
      howTo: [
        'Memorizza piccoli indizi visivi e regole pratiche.',
        'Riconosci i pattern ricorrenti della tabellina.',
        'Applica il trucco e verifica subito se funziona.'
      ],
      doneWhen: 'Concludi con successo tutte le 10 combinazioni.',
      tip: 'Un trucco alla volta: prima precisione, poi velocità.'
    },
    pratico: {
      title: 'Pratico',
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-950',
      objective: 'Rispondere in modo stabile e continuo come in una piccola avventura.',
      howTo: [
        'Risolvi un operazione alla volta scegliendo la risposta corretta.',
        'Mantieni la concentrazione per aumentare la serie di risposte esatte.',
        'Se sbagli, riparti e ricostruisci la tua serie.'
      ],
      doneWhen: 'Raggiungi l obiettivo di 10 risposte corrette consecutive.',
      tip: 'Respira, guarda bene l operazione, poi scegli.'
    },
    sfida: {
      title: 'Sfida',
      tone: 'bg-rose-50 border-rose-200 text-rose-950',
      objective: 'Fare più risposte corrette possibili prima che scada il tempo.',
      howTo: [
        'Hai 30 secondi: rispondi rapidamente ma con attenzione.',
        'Ogni risposta giusta aumenta il punteggio.',
        'Per il record servono almeno 15 risposte corrette.'
      ],
      doneWhen: 'Migliori il tuo record personale della tabellina.',
      tip: 'Se una domanda ti blocca, passa subito alla prossima con decisione.'
    }
  };

  const content = rulesByStep[step];

  const renderRules = () => {
    if (!content) return null;
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl border p-4 ${content.tone}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]">Obiettivo</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">{content.objective}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Come si gioca</p>
          <div role="list" className="mt-2 grid grid-cols-1 gap-2">
            {content.howTo.map((item) => (
              <div key={item} role="listitem" className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-sm text-slate-700 leading-relaxed">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <p className="text-[10px] font-black uppercase tracking-[0.14em]">Quando hai finito</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">{content.doneWhen}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="text-[10px] font-black uppercase tracking-[0.14em]">Trucchetto utile</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">{content.tip}</p>
        </div>
      </div>
    );
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
