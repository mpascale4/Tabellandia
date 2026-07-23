/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface VoiceContextType {
  voiceEnabled: boolean;
  toggleVoice: () => void;
  speak: (text: string, number?: number) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const VOICE_ENABLED_KEY = 'tabellandia_voice_enabled';

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(VOICE_ENABLED_KEY);
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem(VOICE_ENABLED_KEY, JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  const speak = (text: string, number?: number) => {
    if (!voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    setVoiceEnabled(prev => !prev);
    // Cancel speech when toggling off
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <VoiceContext.Provider value={{ voiceEnabled, toggleVoice, speak }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
}
