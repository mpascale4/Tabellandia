/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type Dispatch, type SetStateAction } from 'react';
import { sound } from '../components/SoundManager';

const PARENT_PIN_DEFAULT = '1111';
const DEV_PIN_DEFAULT = '2222';

type PinAccessTarget = 'parent' | 'dev';
type ChangePinStage = 'new' | 'confirm';

type UseParentPinAuthOptions = {
  onParentAuthenticated: () => void;
  onDevAuthenticated: () => void;
  onParentModalClosed: () => void;
};

type UseParentPinAuthResult = {
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
  handleAccessParentArea: () => void;
  handleAccessDevArea: () => void;
  handlePINSubmit: (pinValue?: string) => void;
  handleClosePINModal: () => void;
  handleStartChangePIN: () => void;
  handleChangePINInput: (value: string) => void;
  handleSaveNewPIN: () => void;
  handleCloseChangePINModal: () => void;
};

const resetChangePinState = (
  setShowChangePINForm: Dispatch<SetStateAction<boolean>>,
  setNewPINInput: Dispatch<SetStateAction<string>>,
  setConfirmPINInput: Dispatch<SetStateAction<string>>,
  setPinError: Dispatch<SetStateAction<string>>,
  setChangePINStage: Dispatch<SetStateAction<ChangePinStage>>,
) => {
  setShowChangePINForm(false);
  setNewPINInput('');
  setConfirmPINInput('');
  setPinError('');
  setChangePINStage('new');
};

export function useParentPinAuth({
  onParentAuthenticated,
  onDevAuthenticated,
  onParentModalClosed,
}: UseParentPinAuthOptions): UseParentPinAuthResult {
  const [showPINModal, setShowPINModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isSettingPIN, setIsSettingPIN] = useState(false);
  const [pinAccessTarget, setPinAccessTarget] = useState<PinAccessTarget>('parent');
  const [pinError, setPinError] = useState('');
  const [showChangePINForm, setShowChangePINForm] = useState(false);
  const [newPINInput, setNewPINInput] = useState('');
  const [confirmPINInput, setConfirmPINInput] = useState('');
  const [changePINStage, setChangePINStage] = useState<ChangePinStage>('new');

  const handleAccessParentArea = () => {
    let storedPIN = localStorage.getItem('tabellandia_parent_pin');
    setPinAccessTarget('parent');
    if (!storedPIN) {
      localStorage.setItem('tabellandia_parent_pin', PARENT_PIN_DEFAULT);
      storedPIN = PARENT_PIN_DEFAULT;
      setIsSettingPIN(false);
    } else {
      setIsSettingPIN(false);
    }
    setShowPINModal(true);
    setPinInput('');
    setPinError('');
  };

  const handleAccessDevArea = () => {
    setPinAccessTarget('dev');
    setIsSettingPIN(false);
    resetChangePinState(setShowChangePINForm, setNewPINInput, setConfirmPINInput, setPinError, setChangePINStage);
    setShowPINModal(true);
    setPinInput('');
  };

  const handlePINSubmit = (pinValue?: string) => {
    const pin = pinValue || pinInput;
    sound.playClick();
    setPinError('');

    const storedPIN = localStorage.getItem('tabellandia_parent_pin') || PARENT_PIN_DEFAULT;
    const storedDevPIN = localStorage.getItem('tabellandia_dev_pin') || DEV_PIN_DEFAULT;

    if (pinAccessTarget === 'dev') {
      if (pin === storedDevPIN || pin === DEV_PIN_DEFAULT) {
        sound.playPowerUp();
        setShowPINModal(false);
        setPinInput('');
        setPinError('');
        onDevAuthenticated();
      } else {
        sound.playError();
        setPinError('PIN errato! Riprova.');
        setTimeout(() => {
          setPinInput('');
          setPinError('');
        }, 1500);
      }
      return;
    }

    if (isSettingPIN || !storedPIN) {
      if (pin.length === 4) {
        localStorage.setItem('tabellandia_parent_pin', pin);
        sound.playPowerUp();
        setShowPINModal(false);
        setPinInput('');
        setPinError('');
        onParentAuthenticated();
      }
      return;
    }

    if (pin === storedPIN || pin === PARENT_PIN_DEFAULT) {
      sound.playPowerUp();
      setShowPINModal(false);
      setPinInput('');
      setPinError('');
      onParentAuthenticated();
    } else {
      sound.playError();
      setPinError('PIN errato! Riprova.');
      setTimeout(() => {
        setPinInput('');
        setPinError('');
      }, 1500);
    }
  };

  const handleClosePINModal = () => {
    sound.playClick();
    setShowPINModal(false);
    setPinInput('');
    setPinError('');
    resetChangePinState(setShowChangePINForm, setNewPINInput, setConfirmPINInput, setPinError, setChangePINStage);
    setPinAccessTarget('parent');
    if (pinAccessTarget === 'parent') {
      onParentModalClosed();
    }
  };

  const handleStartChangePIN = () => {
    sound.playClick();
    setShowChangePINForm(true);
    setNewPINInput('');
    setConfirmPINInput('');
    setPinError('');
    setChangePINStage('new');
  };

  const handleChangePINInput = (value: string) => {
    if (changePINStage === 'new') {
      setNewPINInput(value);
      if (value.length === 4) {
        setChangePINStage('confirm');
      }
      return;
    }

    setConfirmPINInput(value);
    if (value.length === 4) {
      if (value === newPINInput) {
        sound.playPowerUp();
        localStorage.setItem('tabellandia_parent_pin', value);
        resetChangePinState(setShowChangePINForm, setNewPINInput, setConfirmPINInput, setPinError, setChangePINStage);
      } else {
        sound.playError();
        setPinError('I PIN non corrispondono!');
        setTimeout(() => {
          setNewPINInput('');
          setConfirmPINInput('');
          setPinError('');
          setChangePINStage('new');
        }, 1500);
      }
    }
  };

  const handleSaveNewPIN = () => {
    sound.playClick();

    if (newPINInput.length !== 4 || !newPINInput.match(/^\d+$/)) {
      setPinError('Nuovo PIN deve essere 4 cifre!');
      return;
    }

    if (newPINInput !== confirmPINInput) {
      setPinError('I PIN non corrispondono!');
      return;
    }

    localStorage.setItem('tabellandia_parent_pin', newPINInput);
    sound.playPowerUp();
    resetChangePinState(setShowChangePINForm, setNewPINInput, setConfirmPINInput, setPinError, setChangePINStage);
  };

  const handleCloseChangePINModal = () => {
    resetChangePinState(setShowChangePINForm, setNewPINInput, setConfirmPINInput, setPinError, setChangePINStage);
  };

  return {
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
    handleAccessParentArea,
    handleAccessDevArea,
    handlePINSubmit,
    handleClosePINModal,
    handleStartChangePIN,
    handleChangePINInput,
    handleSaveNewPIN,
    handleCloseChangePINModal,
  };
}
