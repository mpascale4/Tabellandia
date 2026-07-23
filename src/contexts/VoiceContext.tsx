/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface VoiceContextType {
  voiceEnabled: boolean;
  toggleVoice: () => void;
  speak: (text: string, number?: number) => Promise<void>;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const VOICE_ENABLED_KEY = 'tabellandia_voice_enabled';
const FALLBACK_SPEECH_MS = 1600;
const estimateSpeechDuration = (text: string) => Math.max(FALLBACK_SPEECH_MS, Math.ceil((text.trim().length / 12) * 1000) + 500);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(VOICE_ENABLED_KEY);
    return saved ? JSON.parse(saved) : true;
  });
  const activeSpeechFinishRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem(VOICE_ENABLED_KEY, JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  const finishActiveSpeech = () => {
    if (!activeSpeechFinishRef.current) return;
    const finish = activeSpeechFinishRef.current;
    activeSpeechFinishRef.current = null;
    finish();
  };

  const speak = (text: string, number?: number) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return Promise.resolve();
    }

    finishActiveSpeech();
    window.speechSynthesis.cancel();

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      let settled = false;
      let fallbackTimeoutId: number | null = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (fallbackTimeoutId !== null) {
          window.clearTimeout(fallbackTimeoutId);
        }
        if (activeSpeechFinishRef.current === finish) {
          activeSpeechFinishRef.current = null;
        }
        resolve();
      };

      utterance.lang = 'it-IT';
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      utterance.volume = 1.0;
      utterance.onend = finish;
      utterance.onerror = finish;
      activeSpeechFinishRef.current = finish;
      fallbackTimeoutId = window.setTimeout(finish, estimateSpeechDuration(text));

      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleVoice = () => {
    setVoiceEnabled(prev => !prev);
    // Cancel speech when toggling off
    if (voiceEnabled) {
      finishActiveSpeech();
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
