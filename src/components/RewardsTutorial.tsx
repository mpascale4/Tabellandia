import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coins, Droplets, Zap } from 'lucide-react';

interface RewardsTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RewardsTutorial({ isOpen, onClose }: RewardsTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: '🪙 Le Monete d\'Oro',
      emoji: '💰',
      description: 'Guadagni monete completando ogni esercizio! Le monete sono il tuo tesoro principale.',
      how: [
        '✓ Completa Comprendo: 20 monete',
        '✓ Completa Salto: 20 monete',
        '✓ Completa Costruisco: 20 monete',
        '✓ Completa Trucchi: 20 monete'
      ],
      icon: <Coins className="w-12 h-12 text-amber-500" />
    },
    {
      title: '💧 Le Gocce di Luce',
      emoji: '✨',
      description: 'Le gocce sono più rare e preziose! Le usi per ricostruire i monumenti distrutti.',
      how: [
        '✓ Completa Pratico: 10 gocce',
        '✓ Completa Sfida: 20 gocce',
        '✓ Le gocce si usano per ricostruire monumenti',
        '✓ Più monumenti = più benefici speciali!'
      ],
      icon: <Droplets className="w-12 h-12 text-cyan-500" />
    },
    {
      title: '⚡ Guadagni Extra',
      emoji: '🎯',
      description: 'Anche gli step del pratico e sfida danno monete extra!',
      how: [
        '✓ Ogni risposta corretta nel Pratico: +2 monete',
        '✓ Ogni risposta corretta nella Sfida: +2 monete',
        '✓ Bonus XP: +50 per ogni step completato',
        '✓ Livello up ogni 100 XP!'
      ],
      icon: <Zap className="w-12 h-12 text-yellow-500" />
    }
  ];

  const slide = slides[currentSlide];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black font-sans">Come Guadagnare Premi</h2>
                  <p className="text-sm text-indigo-100 mt-1">Scopri il sistema di ricompense di Tabellandia!</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-center"
                  >
                    {/* Icon */}
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex justify-center mb-6"
                    >
                      {slide.icon}
                    </motion.div>

                    {/* Title */}
                    <h3 className="text-3xl font-black text-indigo-900 mb-3 font-sans">
                      {slide.title}
                    </h3>

                    {/* Description */}
                    <p className="text-lg text-slate-700 mb-6">
                      {slide.description}
                    </p>

                    {/* How to earn */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border border-indigo-200">
                      <p className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wider">
                        Come Guadagnare
                      </p>
                      <div className="space-y-2 text-left">
                        {slide.how.map((item, idx) => (
                          <motion.p
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="text-sm font-bold text-slate-800"
                          >
                            {item}
                          </motion.p>
                        ))}
                      </div>
                    </div>

                    {/* Tips Box */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-6">
                      <p className="text-xs font-bold text-amber-900">
                        💡 Consiglio: Completa tutti gli step per evolvere la tua creatura e sbloccare nuovi mondi!
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Dots */}
                <div className="flex justify-center gap-2 mb-6">
                  {slides.map((_, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                        idx === currentSlide
                          ? 'bg-indigo-600 w-8'
                          : 'bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    ← Indietro
                  </motion.button>

                  {currentSlide < slides.length - 1 ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentSlide(currentSlide + 1)}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold transition-all cursor-pointer"
                    >
                      Avanti →
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold transition-all cursor-pointer"
                    >
                      Ho Capito! 🚀
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
