import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Coins, Droplets } from 'lucide-react';
import { sound } from './SoundManager';

interface RewardPopupProps {
  isOpen: boolean;
  stepName: string;
  coins: number;
  drops: number;
  onClose: () => void;
}

const stepMessages: { [key: string]: { title: string; emoji: string; messages: string[] } } = {
  comprendo: {
    title: '🍎 Fantastico Comprendo!',
    emoji: '🎉',
    messages: [
      'Hai capito il concetto!',
      'Moltiplicazione conquistata!',
      'Gruppi perfetti!',
      'Hai vinto i frutti della conoscenza!'
    ]
  },
  salto: {
    title: '🐸 Super Salto!',
    emoji: '🐸',
    messages: [
      'Saltelli perfetti!',
      'La rana è orgogliosa di te!',
      'Sequenze conquistate!',
      'Hai raggiunto la sponda!'
    ]
  },
  costruisco: {
    title: '🧱 Bravo Costruttore!',
    emoji: '🏗️',
    messages: [
      'La griglia è perfetta!',
      'Sei un maestro builder!',
      'Strutture solide!',
      'Il castello ammira il tuo talento!'
    ]
  },
  trucchi: {
    title: '🧠 Genio dei Trucchi!',
    emoji: '💡',
    messages: [
      'La memoria è un superpotere!',
      'Strategie geniali!',
      'Hai sbloccato il segreto!',
      'Il cervello brilla di gioia!'
    ]
  },
  pratico: {
    title: '🛡️ Avventura Completata!',
    emoji: '⚔️',
    messages: [
      'Il regno è salvo!',
      'Guerriero coraggioso!',
      'La nebbia è scomparsa!',
      'Sei un eroe leggendario!'
    ]
  },
  sfida: {
    title: '⚡ Campione Velocissimo!',
    emoji: '👑',
    messages: [
      'Velocità impressionante!',
      'Sei inarrestabile!',
      'Nuovo record!',
      'La velocità della luce!'
    ]
  }
};

export default function RewardPopup({
  isOpen,
  stepName,
  coins,
  drops,
  onClose
}: RewardPopupProps) {
  const stepData = stepMessages[stepName] || stepMessages.comprendo;
  const randomMessage = stepData.messages[Math.floor(Math.random() * stepData.messages.length)];
  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Main Popup */}
          <motion.div
            initial={{ scale: 0, y: -50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-gradient-to-b from-amber-300 via-amber-200 to-orange-300 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-amber-400 pointer-events-auto">
              {/* Celebration Animation */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
                  className="text-6xl mb-3 inline-block"
                >
                  {stepData.emoji}
                </motion.div>
                
                <h2 className="text-2xl font-black text-amber-950 mb-2 font-sans">
                  {stepData.title}
                </h2>
                
                <p className="text-lg font-bold text-amber-900 italic">
                  "{randomMessage}"
                </p>
              </div>

              {/* Rewards Section */}
              <div className="bg-white/80 rounded-2xl p-6 mb-6 backdrop-blur-sm">
                <div className="flex items-center justify-around">
                  {/* Coins */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.3 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Coins className="w-8 h-8 text-amber-600" />
                      <span className="text-4xl font-black text-amber-600 font-sans">
                        +{coins}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-amber-800">🪙 Monete</p>
                  </motion.div>

                  {/* Drops */}
                  {drops > 0 && (
                    <div className="w-px h-16 bg-amber-200"></div>
                  )}
                  
                  {drops > 0 && (
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.4 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Droplets className="w-8 h-8 text-cyan-600" />
                        <span className="text-4xl font-black text-cyan-600 font-sans">
                          +{drops}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-cyan-800">Gocce</p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-xl py-3 px-4 transition-all shadow-lg cursor-pointer font-sans"
              >
                Continua l'Avventura! 🚀
              </motion.button>

              {/* Confetti-like stars */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0, x: 0 }}
                    animate={{ opacity: [1, 0], y: -100, x: (Math.random() - 0.5) * 100 }}
                    transition={{ duration: 1.5, delay: i * 0.1 }}
                    className="absolute text-2xl"
                    style={{
                      left: `${Math.random() * 100}%`,
                      bottom: '-20px'
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
