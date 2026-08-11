/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import NumericKeypad from './NumericKeypad';

type PinAccessTarget = 'parent' | 'dev';
type ChangePinStage = 'new' | 'confirm';

type ParentPinModalProps = {
  showPINModal: boolean;
  pinInput: string;
  setPinInput: Dispatch<SetStateAction<string>>;
  isSettingPIN: boolean;
  pinAccessTarget: PinAccessTarget;
  pinError: string;
  showChangePINForm: boolean;
  newPINInput: string;
  setNewPINInput: Dispatch<SetStateAction<string>>;
  confirmPINInput: string;
  setConfirmPINInput: Dispatch<SetStateAction<string>>;
  changePINStage: ChangePinStage;
  handlePINSubmit: (pinValue?: string) => void;
  handleClosePINModal: () => void;
  handleSaveNewPIN: () => void;
};

type ChangePinModalProps = {
  showChangePINForm: boolean;
  newPINInput: string;
  confirmPINInput: string;
  changePINStage: ChangePinStage;
  pinError: string;
  handleChangePINInput: (value: string) => void;
  handleClose: () => void;
};

export default function ParentPinModal({
  showPINModal,
  pinInput,
  setPinInput,
  isSettingPIN,
  pinAccessTarget,
  pinError,
  showChangePINForm,
  newPINInput,
  setNewPINInput,
  confirmPINInput,
  setConfirmPINInput,
  changePINStage,
  handlePINSubmit,
  handleClosePINModal,
  handleSaveNewPIN,
}: ParentPinModalProps) {
  return (
    <AnimatePresence>
      {showPINModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClosePINModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-indigo-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔐⚡</div>
              <h2 className="text-xl font-black text-indigo-950">{pinAccessTarget === 'dev' ? 'Area Dev' : 'Area di Controllo'}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {showChangePINForm
                  ? 'Imposta un nuovo PIN'
                  : pinAccessTarget === 'dev'
                    ? 'Inserisci il PIN di 4 cifre per aprire l’Area Dev'
                    : isSettingPIN
                      ? 'Crea un PIN a 4 cifre'
                      : 'Inserisci il PIN di 4 cifre per accedere'}
              </p>
            </div>

            {showChangePINForm && pinAccessTarget === 'parent' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-indigo-700 block mb-2">Nuovo PIN (4 cifre)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPINInput}
                    onChange={(event) => setNewPINInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg text-center text-2xl font-black tracking-widest focus:outline-none focus:border-indigo-600"
                    placeholder="••••"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-700 block mb-2">Conferma PIN</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPINInput}
                    onChange={(event) => setConfirmPINInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg text-center text-2xl font-black tracking-widest focus:outline-none focus:border-indigo-600"
                    placeholder="••••"
                  />
                </div>

                {pinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                  >
                    {pinError}
                  </motion.div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleClosePINModal}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveNewPIN}
                    disabled={newPINInput.length !== 4 || confirmPINInput.length !== 4}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Salva
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-2 mb-6">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={pinError ? { x: [-5, 5, -5, 0] } : {}}
                      transition={{ duration: 0.3 }}
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all ${
                        pinError
                          ? 'bg-red-100 border-red-400 text-red-600'
                          : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      }`}
                    >
                      {pinInput[i] ? '●' : '-'}
                    </motion.div>
                  ))}
                </div>

                {pinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-4 text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                  >
                    {pinError}
                  </motion.div>
                )}

                <NumericKeypad
                  value={pinInput}
                  onChange={(value) => setPinInput(value.slice(0, 4))}
                  onSubmit={handlePINSubmit}
                  maxDigits={4}
                />
              </>
            )}

            {!showChangePINForm && (
              <button
                onClick={handleClosePINModal}
                className="w-full mt-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Annulla
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ChangePinModal({
  showChangePINForm,
  newPINInput,
  confirmPINInput,
  changePINStage,
  pinError,
  handleChangePINInput,
  handleClose,
}: ChangePinModalProps) {
  return (
    <AnimatePresence>
      {showChangePINForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-indigo-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🔑</div>
              <h2 className="text-xl font-black text-indigo-950">Modifica PIN</h2>
              <p className="text-xs text-slate-500 mt-2">
                {changePINStage === 'new' ? 'Inserisci il nuovo PIN (4 cifre)' : 'Conferma il PIN'}
              </p>
            </div>

            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3].map(i => {
                const currentValue = changePINStage === 'new' ? newPINInput : confirmPINInput;
                return (
                  <motion.div
                    key={i}
                    animate={pinError ? { x: [-5, 5, -5, 0] } : {}}
                    transition={{ duration: 0.3 }}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all ${
                      pinError
                        ? 'bg-red-100 border-red-400 text-red-600'
                        : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    }`}
                  >
                    {currentValue[i] ? '●' : '-'}
                  </motion.div>
                );
              })}
            </div>

            {pinError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4 text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg"
              >
                {pinError}
              </motion.div>
            )}

            <NumericKeypad
              value={changePINStage === 'new' ? newPINInput : confirmPINInput}
              onChange={handleChangePINInput}
              onSubmit={() => {}}
              maxDigits={4}
            />

            <button
              onClick={handleClose}
              className="w-full mt-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Annulla
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
