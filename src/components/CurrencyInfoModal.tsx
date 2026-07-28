/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Coins, X, Volume2, Sparkles, MapPin, Shirt, Trophy } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

interface CurrencyInfoModalProps {
  type: 'drops' | 'coins' | null;
  isOpen: boolean;
  onClose: () => void;
  lightDrops?: number;
  coins?: number;
  allMonumentsErected?: boolean;
}

export default function CurrencyInfoModal({
  type,
  isOpen,
  onClose,
  lightDrops = 0,
  coins = 0,
  allMonumentsErected = false,
}: CurrencyInfoModalProps) {
  const { speak } = useVoice();

  const isDrops = type === 'drops';

  const dropsSpeechText = allMonumentsErected
    ? "Complimenti straordinari! Hai già eretto tutti i monumenti nei Regni di Tabellandia! Le tue Gocce di Luce testimoniano la tua splendida vittoria e la tua maestria sulle tabelline."
    : "Le Gocce di Luce servono per ricostruire ed erigere i Monumenti Magici nei Regni di Tabellandia! Le guadagni superando i passi del sentiero e facendo nuovi record nelle sfide.";

  const coinsSpeechText =
    "Le Monete d'Oro servono nel Sarto del Regno per sbloccare vestiti, cappelli, accessori e mascotte per il tuo personaggio! Le guadagni risolvendo i giochi e gli esercizi delle tabelline.";

  useEffect(() => {
    if (isOpen && type) {
      if (type === 'drops') {
        void speak(dropsSpeechText);
      } else if (type === 'coins') {
        void speak(coinsSpeechText);
      }
    }
  }, [isOpen, type, allMonumentsErected]);

  if (!isOpen || !type) return null;

  const handleSpeakAgain = () => {
    if (isDrops) {
      void speak(dropsSpeechText);
    } else {
      void speak(coinsSpeechText);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl border ${
            isDrops
              ? 'bg-gradient-to-b from-sky-50 via-white to-sky-50 border-sky-200'
              : 'bg-gradient-to-b from-amber-50 via-white to-amber-50 border-amber-200'
          }`}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Work in Progress Banner */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider mb-3">
            <span>🚧 Sezione Info: Work in Progress</span>
          </div>

          {/* Header Icon & Title */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-3.5 rounded-2xl ${
                isDrops
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                  : 'bg-amber-500 text-white shadow-lg shadow-amber-200'
              }`}
            >
              {isDrops ? <Droplets className="w-8 h-8" /> : <Coins className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800">
                  {isDrops ? 'Gocce di Luce 💧' : "Monete d'Oro 🪙"}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isDrops
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  Ne hai {isDrops ? lightDrops : coins}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isDrops ? 'Risorsa magica per i Monumenti' : 'Moneta del Regno per il Guardaroba'}
              </p>
            </div>
          </div>

          {/* Speech Audio Button */}
          <button
            type="button"
            onClick={handleSpeakAgain}
            className={`w-full mb-4 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer border ${
              isDrops
                ? 'bg-sky-100/80 hover:bg-sky-200/80 border-sky-300 text-sky-900'
                : 'bg-amber-100/80 hover:bg-amber-200/80 border-amber-300 text-amber-900'
            }`}
          >
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Ascolta spiegazione vocale</span>
          </button>

          {/* Content sections */}
          <div className="space-y-3 text-slate-700 text-sm">
            {/* Section 1: A cosa servono / Stato dei Monumenti */}
            <div
              className={`p-3.5 rounded-2xl border ${
                isDrops ? (allMonumentsErected ? 'bg-amber-50 border-amber-200' : 'bg-white border-sky-100') : 'bg-white border-amber-100'
              } shadow-xs`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles
                  className={`w-4 h-4 ${isDrops ? (allMonumentsErected ? 'text-amber-500' : 'text-sky-500') : 'text-amber-500'}`}
                />
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {isDrops ? (allMonumentsErected ? 'Stato dei Monumenti 🏛️' : 'A cosa servono?') : 'A cosa servono?'}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {isDrops ? (
                  allMonumentsErected ? (
                    <>
                      <strong className="text-amber-900 font-bold">Tutti i monumenti magici di Tabellandia sono stati eretti! 🏛️✨</strong> Le tue <b>Gocce di Luce</b> sono ora il simbolo della tua immensa energia magica, della tua dedizione e del tuo straordinario successo.
                    </>
                  ) : (
                    <>
                      Le <b>Gocce di Luce</b> servono a <b>ricostruire ed erigere i Monumenti</b> nei
                      diversi Regni delle Tabelline! Ogni monumento sbloccato dona nuova vita ed energia
                      magica al Regno.
                    </>
                  )
                ) : (
                  <>
                    Le <b>Monete d'Oro</b> servono nel <b>Sarto del Regno (Guardaroba)</b> per personalizzare
                    il tuo personaggio e acquistare bellissimi abiti e accessori!
                  </>
                )}
              </p>
            </div>

            {/* Section 2: Come si guadagnano */}
            <div
              className={`p-3.5 rounded-2xl border ${
                isDrops ? 'bg-white border-sky-100' : 'bg-white border-amber-100'
              } shadow-xs`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Trophy
                  className={`w-4 h-4 ${isDrops ? 'text-sky-500' : 'text-amber-500'}`}
                />
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {isDrops && allMonumentsErected ? 'Come le hai conquistate?' : 'Come si guadagnano?'}
                </h3>
              </div>
              <ul className="text-xs space-y-1 text-slate-600">
                {isDrops ? (
                  <>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">🗺️</span>
                      <span>Completando i passi del <b>Sentiero</b> (Comprendo, Salto, Costruisco, Pratico).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">⚡</span>
                      <span>Facendo nuovi record di punteggio nella <b>Sfida Velocissima</b>.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">🧩</span>
                      <span>Risolvendo le sfide e i giochi con le tabelline!</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">🧮</span>
                      <span>Risolvendo correttamente i problemi nel <b>Comprendo</b> e nei vari passi.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">🎯</span>
                      <span>Avanzando negli <b>Allenamenti Liberi</b> e nelle attività quotidiane.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Section 3: Dove usarle */}
            <div
              className={`p-3.5 rounded-2xl border ${
                isDrops ? (allMonumentsErected ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-100/50 border-sky-200') : 'bg-amber-100/50 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isDrops ? (
                  <MapPin className={`w-4 h-4 ${allMonumentsErected ? 'text-emerald-600' : 'text-sky-600'}`} />
                ) : (
                  <Shirt className="w-4 h-4 text-amber-600" />
                )}
                <h3 className="font-extrabold text-slate-800 text-xs">
                  {isDrops ? (allMonumentsErected ? 'Il tuo Traguardo Leggendario 👑' : 'Dove si usano?') : 'Dove si spendono?'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isDrops ? (
                  allMonumentsErected ? (
                    <>
                      Tutti i 9 regni risplendono di luce pura! Non ci sono più monumenti da erigere: hai riportato Tabellandia al suo massimo splendore. Conserva le tue Gocce come trofeo d'onore della tua fantastica avventura!
                    </>
                  ) : (
                    <>
                      Entra in qualsiasi <b>Regno delle Tabelline</b> (es. Regno del 2, Regno del 3...)
                      e vai nella sezione <b>"Monumenti del Regno"</b> per erigere le tue opere!
                    </>
                  )
                ) : (
                  <>
                    Tocca l'icona del tuo <b>Profilo / Sarto del Regno</b> nel menu per accedere al
                    guardaroba e provare vestiti, cappelli, occhiali e mascotte!
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={onClose}
            className={`w-full mt-5 py-3 rounded-2xl font-black text-sm text-white shadow-md cursor-pointer transition-transform active:scale-95 ${
              isDrops
                ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
            }`}
          >
            Ho capito! 👍
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
