import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

type VoiceSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isPhoneMode?: boolean;
};

export default function VoiceSelectorModal({ isOpen, onClose, isPhoneMode = false }: VoiceSelectorModalProps) {
  const { availableVoices, selectedVoiceURI, setSelectedVoiceURI, previewVoice } = useVoice();

  const voiceOptions = useMemo(() => availableVoices.filter((voice, index, voices) => (
    voices.findIndex((candidate) => candidate.voiceURI === voice.voiceURI) === index
  )), [availableVoices]);

  const handleSelectVoice = (voiceURI: string | null) => {
    setSelectedVoiceURI(voiceURI);
    void previewVoice(voiceURI);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={isPhoneMode ? { y: 32, opacity: 0 } : { scale: 0.96, opacity: 0 }}
            animate={isPhoneMode ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={isPhoneMode ? { y: 24, opacity: 0 } : { scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`w-full border border-indigo-100 bg-white shadow-2xl ${
              isPhoneMode
                ? 'max-w-[430px] rounded-t-[2rem] px-4 pb-5 pt-4'
                : 'max-w-lg rounded-[2rem] p-5'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-selector-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="voice-selector-title" className="text-base font-black text-indigo-950">
                  Scegli una voce
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Tocca una voce per selezionarla e ascoltare subito un'anteprima.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
                aria-label="Chiudi selettore voce"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div role="list" className="mt-4 grid max-h-[min(58vh,28rem)] grid-cols-1 gap-2 overflow-y-auto pr-1">
              <div role="listitem">
                <button
                  type="button"
                  onClick={() => handleSelectVoice(null)}
                  className={`w-full rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all cursor-pointer ${
                    selectedVoiceURI === null
                      ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                  aria-pressed={selectedVoiceURI === null}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-indigo-950">Voce predefinita</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Usa la voce scelta dal browser o dal dispositivo.</p>
                    </div>
                    {selectedVoiceURI === null && <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />}
                  </div>
                </button>
              </div>

              {voiceOptions.length > 0 ? voiceOptions.map((voice) => {
                const isSelected = selectedVoiceURI === voice.voiceURI;
                return (
                  <div key={voice.voiceURI} role="listitem">
                    <button
                      type="button"
                      onClick={() => handleSelectVoice(voice.voiceURI)}
                      className={`w-full rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{voice.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{voice.lang}{voice.default ? ' · predefinita del sistema' : ''}</p>
                        </div>
                        {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />}
                      </div>
                    </button>
                  </div>
                );
              }) : (
                <div role="listitem" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Non ho ancora trovato voci disponibili sul dispositivo. Se la lista resta vuota, prova a riaprire il selettore tra un attimo.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

