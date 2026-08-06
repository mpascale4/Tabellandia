/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Coins, Volume2, Sparkles, MapPin, Shirt, Trophy } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

interface CurrencyInfoModalProps {
  type: 'drops' | 'coins' | null;
  isOpen: boolean;
  onClose: () => void;
  lightDrops?: number;
  coins?: number;
}

export default function CurrencyInfoModal({
  type,
  isOpen,
  onClose,
  lightDrops = 0,
  coins = 0
}: CurrencyInfoModalProps) {
  const { speak } = useVoice();

  const dropsSpeechText =
    "Le Gocce di Luce servono per ricostruire ed erigere i Monumenti Magici nei Regni di Tabellandia! Le guadagni superando i passi del sentiero e vincendo la Sfida, che assegna 15 gocce.";

  const coinsSpeechText =
    "Le Monete d'Oro servono nel Sarto del Regno per sbloccare vestiti, cappelli, accessori e mascotte per il tuo personaggio! Le guadagni nel Pratico quando superi l obiettivo di risposte consecutive.";

  useEffect(() => {
    if (isOpen && type) {
      if (type === 'drops') {
        void speak(dropsSpeechText);
      } else if (type === 'coins') {
        void speak(coinsSpeechText);
      }
    }
  }, [isOpen, type]);

  if (!isOpen || !type) return null;

  const isDrops = type === 'drops';

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
              <p className="mt-1 inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-900 motion-safe:animate-pulse">
                Work in progress
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
            {/* Section 1: A cosa servono */}
            <div
              className={`p-3.5 rounded-2xl border ${
                isDrops ? 'bg-white border-sky-100' : 'bg-white border-amber-100'
              } shadow-xs`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles
                  className={`w-4 h-4 ${isDrops ? 'text-sky-500' : 'text-amber-500'}`}
                />
                <h3 className="font-extrabold text-slate-800 text-sm">A cosa servono?</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {isDrops ? (
                  <>
                    Le <b>Gocce di Luce</b> servono a <b>ricostruire ed erigere i Monumenti</b> nei
                    diversi Regni delle Tabelline! Ogni monumento sbloccato dona nuova vita ed energia
                    magica al Regno.
                  </>
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
                <h3 className="font-extrabold text-slate-800 text-sm">Come si guadagnano?</h3>
              </div>
              <ul className="text-xs space-y-1 text-slate-600">
                {isDrops ? (
                  <>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">🗺️</span>
                      <span>Completando i passi del <b>Sentiero</b> (Raccogli, Salta, Scoppia, Pratico).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">⚡</span>
                      <span>Vincendo la <b>Sfida Velocissima</b> (+15 gocce).</span>
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
                      <span>Nel <b>Pratico</b>, quando superi l'obiettivo di consecutive (+1 moneta).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="shrink-0">🎯</span>
                      <span>La <b>Sfida</b> non assegna monete: assegna 15 gocce quando la vinci.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Section 3: Dove usarle */}
            <div
              className={`p-3.5 rounded-2xl border ${
                isDrops ? 'bg-sky-100/50 border-sky-200' : 'bg-amber-100/50 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isDrops ? (
                  <MapPin className="w-4 h-4 text-sky-600" />
                ) : (
                  <Shirt className="w-4 h-4 text-amber-600" />
                )}
                <h3 className="font-extrabold text-slate-800 text-xs">
                  {isDrops ? 'Dove si usano?' : 'Dove si spendono?'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isDrops ? (
                  <>
                    Entra in qualsiasi <b>Regno delle Tabelline</b> (es. Regno del 2, Regno del 3...)
                    e vai nella sezione <b>"Monumenti del Regno"</b> per erigere le tue opere!
                  </>
                ) : (
                  <>
                    Tocca l'icona del tuo <b>Profilo / Sarto del Regno</b> nel menu per accedere al
                    guardaroba e provare vestiti, cappelli, occhiali e mascotte!
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3 rounded-2xl font-black text-sm text-white shadow-md cursor-pointer transition-transform active:scale-95 ${
                isDrops
                  ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
              }`}
            >
              Ho capito! 👍
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
