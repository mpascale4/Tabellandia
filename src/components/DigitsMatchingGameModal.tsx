import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Volume2, CheckCircle, RotateCcw, ArrowRight, Star } from 'lucide-react';
import { DIGITS_INFO, DigitInfo } from '../data/digitsData';
import { useVoice } from '../contexts/VoiceContext';
import { sound } from './SoundManager';

interface DigitsMatchingGameModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip?: () => void;
  devMode?: boolean;
}

export default function DigitsMatchingGameModal({
  isOpen,
  onComplete,
  onSkip,
  devMode = false
}: DigitsMatchingGameModalProps) {
  const { speak } = useVoice();

  // Shuffled images for the game
  const [shuffledImages, setShuffledImages] = useState<DigitInfo[]>([]);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [selectedImageDigit, setSelectedImageDigit] = useState<number | null>(null);
  const [matchedDigits, setMatchedDigits] = useState<Set<number>>(new Set());
  const [showingExplanationFor, setShowingExplanationFor] = useState<DigitInfo | null>(null);
  const [wrongSelectionPair, setWrongSelectionPair] = useState<{ digit: number; imageDigit: number } | null>(null);

  // Initialize and shuffle images when opened
  useEffect(() => {
    if (isOpen) {
      const shuffled = [...DIGITS_INFO].sort(() => Math.random() - 0.5);
      setShuffledImages(shuffled);
      setMatchedDigits(new Set());
      setSelectedDigit(null);
      setSelectedImageDigit(null);
      setShowingExplanationFor(null);
      setWrongSelectionPair(null);

      speak("Associa ogni cifra con la sua immagine magica!");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle click on digit button
  const handleSelectDigit = (digit: number) => {
    if (matchedDigits.has(digit)) return;
    sound.playClick();

    if (selectedImageDigit !== null) {
      // Compare with currently selected image
      checkPair(digit, selectedImageDigit);
    } else {
      setSelectedDigit(digit);
      speak(`Cifra ${digit}`);
    }
  };

  // Handle click on image card
  const handleSelectImage = (info: DigitInfo) => {
    if (matchedDigits.has(info.digit)) return;
    sound.playClick();

    if (selectedDigit !== null) {
      // Compare with currently selected digit
      checkPair(selectedDigit, info.digit);
    } else {
      setSelectedImageDigit(info.digit);
      speak(info.imageLabel);
    }
  };

  // Check if chosen pair matches
  const checkPair = (digit: number, imageDigit: number) => {
    if (digit === imageDigit) {
      // Correct match!
      sound.playPowerUp();
      const nextMatched = new Set([...matchedDigits, digit]);
      setMatchedDigits(nextMatched);
      setSelectedDigit(null);
      setSelectedImageDigit(null);

      const info = DIGITS_INFO.find(d => d.digit === digit);
      if (info) {
        setShowingExplanationFor(info);
        speak(`Giusto! ${info.digit} uguale a ${info.imageLabel}. ${info.reason}`);
      }
    } else {
      // Wrong match
      sound.playClick();
      setWrongSelectionPair({ digit, imageDigit });
      setTimeout(() => {
        setWrongSelectionPair(null);
        setSelectedDigit(null);
        setSelectedImageDigit(null);
      }, 700);
    }
  };

  const isGameComplete = matchedDigits.size === 10;

  const handleFinish = () => {
    sound.playLevelUp();
    onComplete();
  };

  const handleSkip = () => {
    sound.playClick();
    onSkip?.();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl border-2 border-indigo-300 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 p-3 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl border border-white/30 shadow-inner shrink-0">
                🧩
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-xl font-black tracking-tight font-sans leading-tight">
                  Il Gioco delle 10 Cifre Magiche
                </h2>
                <p className="hidden sm:block text-sm text-sky-100 font-medium">
                  Associa ogni cifra alla sua immagine simbolo per sbloccare Tabellandia!
                </p>
              </div>
            </div>

            {/* Score pill */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
              <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/30 text-[11px] font-black font-mono">
                {matchedDigits.size} / 10 completati
              </div>
              {!isGameComplete && onSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-[10px] sm:text-xs bg-white text-indigo-800 px-2 py-1 rounded-lg font-black border border-white/70 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  Salta per ora
                </button>
              )}
              {devMode && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-[10px] bg-amber-400 text-amber-950 px-2 py-1 rounded font-black uppercase cursor-pointer"
                >
                  Salta DEV
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-2.5 sm:p-6 overflow-y-auto space-y-3 sm:space-y-6 flex-1 bg-slate-50">
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300">
              <motion.div
                className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 h-full rounded-full"
                animate={{ width: `${(matchedDigits.size / 10) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            {!isGameComplete && onSkip && (
              <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-[11px] sm:text-xs text-slate-600">
                Puoi saltare questo gioco e riprenderlo in seguito dalla guida delle cifre.
              </div>
            )}

            {/* Game Play Area */}
            {!isGameComplete ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-3 sm:gap-5">
                {/* DIGITS COLUMN */}
                <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-indigo-100 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-900 mb-3 flex items-center gap-1.5 font-sans">
                    1. Scegli una Cifra 🔢
                  </h3>
                  <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                    {DIGITS_INFO.map(info => {
                      const isMatched = matchedDigits.has(info.digit);
                      const isSelected = selectedDigit === info.digit;
                      const isWrong = wrongSelectionPair?.digit === info.digit;

                      return (
                        <motion.button
                          key={info.digit}
                          onClick={() => handleSelectDigit(info.digit)}
                          disabled={isMatched}
                          whileHover={!isMatched ? { scale: 1.08 } : undefined}
                          whileTap={!isMatched ? { scale: 0.95 } : undefined}
                          animate={isWrong ? { x: [-6, 6, -6, 6, 0] } : {}}
                          transition={{ duration: 0.3 }}
                          className={`h-12 sm:h-14 rounded-xl sm:rounded-2xl border-2 font-black text-lg sm:text-2xl flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                            isMatched
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 opacity-60 cursor-not-allowed'
                              : isWrong
                              ? 'bg-rose-100 border-rose-500 text-rose-900'
                              : isSelected
                              ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg ring-2 ring-inset ring-indigo-200'
                              : 'bg-indigo-50/60 border-indigo-200 text-indigo-950 hover:bg-indigo-100 hover:border-indigo-400'
                          }`}
                        >
                          <span>{info.digit}</span>
                          {isMatched && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 absolute bottom-1 right-1" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* IMAGES COLUMN */}
                <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-sky-100 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-900 mb-3 flex items-center gap-1.5 font-sans">
                    2. Trova l'Immagine Giusta 🖼️
                  </h3>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2 sm:gap-2.5">
                    {shuffledImages.map(info => {
                      const isMatched = matchedDigits.has(info.digit);
                      const isSelected = selectedImageDigit === info.digit;
                      const isWrong = wrongSelectionPair?.imageDigit === info.digit;

                      return (
                        <motion.button
                          key={info.digit}
                          onClick={() => handleSelectImage(info)}
                          disabled={isMatched}
                          whileHover={!isMatched ? { scale: 1.04 } : undefined}
                          whileTap={!isMatched ? { scale: 0.95 } : undefined}
                          animate={isWrong ? { x: [-6, 6, -6, 6, 0] } : {}}
                          transition={{ duration: 0.3 }}
                          className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border-2 text-left flex items-center gap-2 relative cursor-pointer transition-all ${
                            isMatched
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 opacity-60 cursor-not-allowed'
                              : isWrong
                              ? 'bg-rose-100 border-rose-500 text-rose-900'
                              : isSelected
                              ? 'bg-sky-600 border-sky-700 text-white shadow-lg ring-2 ring-inset ring-sky-200'
                              : 'bg-sky-50/60 border-sky-200 text-slate-800 hover:bg-sky-100 hover:border-sky-400'
                          }`}
                        >
                          <span className="text-xl sm:text-3xl shrink-0">{info.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] sm:text-sm font-black block truncate">{info.imageLabel}</span>
                          </div>
                          {isMatched && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* All 10 matched victory screen */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-6 sm:p-8 bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 text-white rounded-3xl text-center space-y-4 shadow-xl border-4 border-emerald-300"
              >
                <div className="flex justify-center items-center gap-2 text-4xl sm:text-5xl">
                  <span>🏆</span>
                  <span>✨</span>
                  <span>🎉</span>
                </div>
                <h3 className="text-xl sm:text-3xl font-black font-sans text-amber-200">
                  Eccellente! Le Cifre non hanno più segreti!
                </h3>
                <p className="text-sm sm:text-base font-medium max-w-lg mx-auto text-emerald-50">
                  Hai associato correttamente tutte le 10 cifre con le loro immagini magiche.<br />
                  Ora il passaggio segreto per <strong>Tabellandia</strong> è aperto!
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleFinish}
                    className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-sm sm:text-base rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer inline-flex items-center gap-2 font-sans"
                  >
                    🚀 Entra in Tabellandia!
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Explanation Modal Overlay when a match is found */}
          <AnimatePresence>
            {showingExplanationFor && (
              <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 20 }}
                  className="bg-white border-2 sm:border-4 border-amber-400 rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-md w-full text-center space-y-3.5 sm:space-y-4 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1.5 sm:h-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" /> Associazione Perfetta!
                  </div>

                  <div className="flex items-center justify-center gap-3 py-1.5 sm:py-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-indigo-300">
                      {showingExplanationFor.digit}
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-amber-500">=</span>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-sky-100 text-3xl sm:text-4xl flex items-center justify-center shadow-lg border-2 border-sky-300">
                      {showingExplanationFor.emoji}
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-800 font-sans">
                    {showingExplanationFor.digit} = {showingExplanationFor.imageLabel}
                  </h3>

                  <div className="bg-indigo-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-100 text-slate-700 text-xs sm:text-base font-medium leading-relaxed">
                    <p>💡 <strong>Perché?</strong> {showingExplanationFor.reason}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1.5 sm:pt-2">
                    <button
                      onClick={() =>
                        speak(`${showingExplanationFor.digit}. ${showingExplanationFor.imageLabel}. ${showingExplanationFor.reason}`)
                      }
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] sm:text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" /> Ascolta
                    </button>
                    <button
                      onClick={() => setShowingExplanationFor(null)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      Continua <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
