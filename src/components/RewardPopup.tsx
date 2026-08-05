import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Droplets } from 'lucide-react';
import { sound } from './SoundManager';
import { UserProfile } from '../types';
import { getGenderedText, getPlayerGender } from '../utils/playerCopy';

interface RewardPopupProps {
  isOpen: boolean;
  stepName: string;
  coins: number;
  drops: number;
  profile: UserProfile;
  onClose: () => void;
}

export default function RewardPopup({
  isOpen,
  stepName,
  coins,
  drops,
  profile,
  onClose
}: RewardPopupProps) {
  const playerGender = getPlayerGender(profile);
  const stepData = (() => {
    switch (stepName) {
      case 'salto':
        return {
          title: '🐸 Super Salta!',
          emoji: '🐸',
          messages: [
            'Saltelli perfetti!',
            'La rana è orgogliosa di te!',
            'Sassi conquistati!',
            'Hai raggiunto la sponda!'
          ]
        };
      case 'costruisco':
        return {
          title: getGenderedText(playerGender, '🎈 Scoppia da campione!', '🎈 Scoppia da campionessa!'),
          emoji: '💥',
          messages: [
            'Palloncino giusto!',
            'Mira perfetta!',
            'Scoppiato al primo colpo!',
            'I cieli di Tabellandia ti applaudono!'
          ]
        };
      case 'trucchi':
        return {
          title: getGenderedText(playerGender, '🧱 Bravo Trova!', '🧱 Brava Trova!'),
          emoji: '🔍',
          messages: [
            'Mattone trovato!',
            'La piramide è tua!',
            'Hai scoperto il numero giusto!',
            'Occhio di falco!'
          ]
        };
      case 'pratico':
        return {
          title: '🛡️ Avventura Completata!',
          emoji: '⚔️',
          messages: [
            'Il regno è salvo!',
            getGenderedText(playerGender, 'Guerriero coraggioso!', 'Guerriera coraggiosa!'),
            'La nebbia è scomparsa!',
            getGenderedText(playerGender, 'Sei un eroe leggendario!', "Sei un'eroina leggendaria!")
          ]
        };
      case 'sfida':
        return {
          title: getGenderedText(playerGender, '⚡ Campione Velocissimo!', '⚡ Campionessa Velocissima!'),
          emoji: '👑',
          messages: [
            'Velocità impressionante!',
            'Sei inarrestabile!',
            'Nuovo record!',
            'La velocità della luce!'
          ]
        };
      case 'comprendo':
      default:
        return {
          title: '🍎 Super Raccogli!',
          emoji: '🎉',
          messages: [
            'Ceste piene di mele!',
            'Hai raccolto tutto!',
            'Gruppi perfetti!',
            'Il frutteto è tuo!'
          ]
        };
    }
  })();
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
              <div className="bg-white/90 rounded-2xl p-5 mb-6 backdrop-blur-sm space-y-4 shadow-inner">
                <div className="flex items-center justify-around">
                  {/* Coins */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.3 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Coins className="w-8 h-8 text-amber-600" />
                      <span className="text-4xl font-black text-amber-600 font-sans">
                        +{coins}
                      </span>
                    </div>
                    <p className="text-sm font-black text-amber-900">🪙 Monete</p>
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
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Droplets className="w-8 h-8 text-cyan-600" />
                        <span className="text-4xl font-black text-cyan-600 font-sans">
                          +{drops}
                        </span>
                      </div>
                      <p className="text-sm font-black text-cyan-900">💧 Gocce</p>
                    </motion.div>
                  )}
                </div>

                {/* Explanation of what they are used for */}
                <div className="pt-3 border-t border-amber-200/60 text-xs text-amber-950 space-y-1.5 font-medium text-center">
                  <p>
                    🪙 <b>Monete guadagnate:</b> Usale nel <b>Negozio Avatar</b> per comprare cappelli, vestiti e accessori esclusivi!
                  </p>
                  {drops > 0 && (
                    <p>
                      💧 <b>Gocce guadagnate:</b> Usale nella mappa per <b>erigere i monumenti</b> e sbloccare i segreti dei regni!
                    </p>
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
