import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Volume2, CheckCircle, RotateCcw, ArrowRight, Star } from 'lucide-react';
import { DIGITS_INFO, DigitInfo } from '../data/digitsData';
import { useVoice } from '../contexts/VoiceContext';
import { sound } from './SoundManager';

interface DigitsMatchingGameModalProps {
  isOpen: boolean;
  onComplete: () => void;
  devMode?: boolean;
}

export default function DigitsMatchingGameModal({
  isOpen,
  onComplete,
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl border-4 border-indigo-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl border border-white/30 shadow-inner">
                🧩
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black tracking-tight font-sans">
                  Il Gioco delle 10 Cifre Magiche
                </h2>
                <p className="text-xs sm:text-sm text-sky-100 font-medium">
                  Associa ogni cifra alla sua immagine simbolo per sbloccare Tabellandia!
                </p>
              </div>
            </div>

            {/* Score pill */}
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30 text-xs font-black font-mono">
                {matchedDigits.size} / 10 completati
              </div>
              {devMode && (
                <button
                  onClick={handleFinish}
                  className="text-[10px] bg-amber-400 text-amber-950 px-2 py-1 rounded font-black uppercase"
                >
                  Salta DEV
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-slate-50">
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border border-slate-300">
              <motion.div
                className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 h-full rounded-full"
                animate={{ width: `${(matchedDigits.size / 10) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Game Play Area */}
            {!isGameComplete ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* DIGITS COLUMN */}
                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-indigo-100 shadow-sm">
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
                          className={`h-14 sm:h-16 rounded-2xl border-2 font-black text-xl sm:text-2xl flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                            isMatched
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 opacity-60 cursor-not-allowed'
                              : isWrong
                              ? 'bg-rose-100 border-rose-500 text-rose-900'
                              : isSelected
                              ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg ring-4 ring-indigo-200'
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
                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-sky-100 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-900 mb-3 flex items-center gap-1.5 font-sans">
                    2. Trova l'Immagine Giusta 🖼️
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-2.5">
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
                          className={`p-2.5 sm:p-3 rounded-2xl border-2 text-left flex items-center gap-2.5 relative cursor-pointer transition-all ${
                            isMatched
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 opacity-60 cursor-not-allowed'
                              : isWrong
                              ? 'bg-rose-100 border-rose-500 text-rose-900'
                              : isSelected
                              ? 'bg-sky-600 border-sky-700 text-white shadow-lg ring-4 ring-sky-200'
                              : 'bg-sky-50/60 border-sky-200 text-slate-800 hover:bg-sky-100 hover:border-sky-400'
                          }`}
                        >
                          <span className="text-2xl sm:text-3xl shrink-0">{info.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-black block truncate">{info.imageLabel}</span>
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
              <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 20 }}
                  className="bg-white border-4 border-amber-400 rounded-3xl p-5 sm:p-7 max-w-lg w-full text-center space-y-4 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

                  <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Associazione Perfetta!
                  </div>

                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg border-2 border-indigo-300">
                      {showingExplanationFor.digit}
                    </div>
                    <span className="text-2xl font-black text-amber-500">=</span>
                    <div className="w-16 h-16 rounded-2xl bg-sky-100 text-4xl flex items-center justify-center shadow-lg border-2 border-sky-300">
                      {showingExplanationFor.emoji}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 font-sans">
                    {showingExplanationFor.digit} = {showingExplanationFor.imageLabel}
                  </h3>

                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-slate-700 text-sm sm:text-base font-medium leading-relaxed">
                    <p>💡 <strong>Perché?</strong> {showingExplanationFor.reason}</p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() =>
                        speak(`${showingExplanationFor.digit}. ${showingExplanationFor.imageLabel}. ${showingExplanationFor.reason}`)
                      }
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Volume2 className="w-4 h-4 text-indigo-600" /> Ascolta
                    </button>
                    <button
                      onClick={() => setShowingExplanationFor(null)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
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
