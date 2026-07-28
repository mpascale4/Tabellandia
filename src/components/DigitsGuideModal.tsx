import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Sparkles, BookOpen } from 'lucide-react';
import { DIGITS_INFO, DigitInfo } from '../data/digitsData';
import { useVoice } from '../contexts/VoiceContext';
import { sound } from './SoundManager';
import SurfaceCard from './layout/SurfaceCard';

interface DigitsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMatchingGame?: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
}

export default function DigitsGuideModal({
  isOpen,
  onClose,
  onOpenMatchingGame,
  titleOverride = "Le 10 Cifre Magiche di Tabellandia",
  subtitleOverride = "Ecco l'associazione visiva e il motivo speciale per ricordare ogni cifra!"
}: DigitsGuideModalProps) {
  const { speak } = useVoice();
  const [selectedDigit, setSelectedDigit] = useState<DigitInfo | null>(DIGITS_INFO[1]);
  const [showFullOverview, setShowFullOverview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowFullOverview(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectDigit = (info: DigitInfo) => {
    sound.playClick();
    setSelectedDigit(info);
    speak(`${info.digit}. ${info.imageLabel}. ${info.reason}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-4xl bg-white rounded-2xl border-2 border-indigo-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 p-3 sm:p-6 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl border border-white/30 shadow-inner shrink-0">
                🔢
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-wider mb-1 shadow-2xs">
                  <span>🚧 Work in Progress</span>
                </div>
                <h2 className="text-base sm:text-xl font-black tracking-tight leading-tight line-clamp-2">{titleOverride}</h2>
                <p className="hidden sm:block text-sm text-sky-100 font-medium">{subtitleOverride}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white text-indigo-800 text-[11px] font-black hover:bg-indigo-50 transition-colors cursor-pointer shadow-sm"
              >
                Salta
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body content */}
          <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-slate-50">
            {/* Grid selector of all 10 digits */}
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Tocca una cifra per ascoltare la sua associazione:
              </p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {DIGITS_INFO.map(info => {
                  const isSelected = selectedDigit?.digit === info.digit;
                  return (
                    <button
                      key={info.digit}
                      onClick={() => handleSelectDigit(info)}
                      className={`p-2 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg scale-105'
                          : 'border-slate-200 bg-white hover:bg-indigo-50 text-slate-800 hover:border-indigo-300'
                      }`}
                    >
                      <span className="text-base sm:text-lg font-black">{info.digit}</span>
                      <span className="text-lg sm:text-xl">{info.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected digit spotlight card */}
            {selectedDigit && (
              <SurfaceCard padding="md" className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 shadow-md rounded-2xl">
                <div className="flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-indigo-300 shadow-md flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest absolute top-1.5">Cifra {selectedDigit.digit}</span>
                    <span className="text-3xl mt-2.5">{selectedDigit.emoji}</span>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="text-xl sm:text-2xl font-black text-slate-800">
                        {selectedDigit.digit} = {selectedDigit.emoji} {selectedDigit.imageLabel}
                      </span>
                      <button
                        onClick={() => speak(`${selectedDigit.digit}. ${selectedDigit.imageLabel}. ${selectedDigit.reason}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Ascolta
                      </button>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-indigo-100 text-slate-700 text-xs sm:text-sm leading-relaxed">
                      <span className="font-bold text-indigo-900 block mb-1">💡 Motivo:</span>
                      {selectedDigit.reason}
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            )}

            {/* Full summary table/cards for all 10 digits */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowFullOverview(prev => !prev)}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-xs font-black text-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors inline-flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" /> Panoramica completa delle 10 cifre
                </span>
                <span aria-hidden="true">{showFullOverview ? '▲' : '▼'}</span>
              </button>
              {showFullOverview && (
                <div role="list" className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-2.5">
                  {DIGITS_INFO.map(info => (
                    <button
                      key={info.digit}
                      type="button"
                      role="listitem"
                      onClick={() => handleSelectDigit(info)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        selectedDigit?.digit === info.digit
                          ? 'border-indigo-500 bg-indigo-50/90 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-800 font-black text-sm flex items-center justify-center shrink-0 border border-indigo-200">
                        {info.digit} {info.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{info.imageLabel}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Cifra {info.digit}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-600 mt-1 line-clamp-2">{info.reason}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            {onOpenMatchingGame ? (
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                  onOpenMatchingGame();
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs sm:text-sm transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                🧩 Gioca al Gioco delle Cifre
              </button>
            ) : <div />}

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors cursor-pointer shadow-md"
            >
              Ho capito! Let's go! 🚀
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
