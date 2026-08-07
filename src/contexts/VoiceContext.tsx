/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface VoiceContextType {
  voiceEnabled: boolean;
  toggleVoice: () => void;
  speak: (text: string, number?: number) => Promise<void>;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: (voiceURI: string | null) => void;
  previewVoice: (voiceURI: string | null) => Promise<void>;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const VOICE_ENABLED_KEY = 'tabellandia_voice_enabled';
const SELECTED_VOICE_URI_KEY = 'tabellandia_selected_voice_uri';
const FALLBACK_SPEECH_MS = 1600;
const estimateSpeechDuration = (text: string) => Math.max(FALLBACK_SPEECH_MS, Math.ceil((text.trim().length / 12) * 1000) + 500);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(VOICE_ENABLED_KEY);
    return saved ? JSON.parse(saved) : true;
  });
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(() => localStorage.getItem(SELECTED_VOICE_URI_KEY));
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const activeSpeechFinishRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem(VOICE_ENABLED_KEY, JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem(SELECTED_VOICE_URI_KEY, selectedVoiceURI);
      return;
    }
    localStorage.removeItem(SELECTED_VOICE_URI_KEY);
  }, [selectedVoiceURI]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;

    const loadVoices = () => {
      const nextVoices = window.speechSynthesis.getVoices();
      setAvailableVoices([...nextVoices].sort((a, b) => {
        if (a.default !== b.default) return a.default ? -1 : 1;
        return `${a.name} ${a.lang}`.localeCompare(`${b.name} ${b.lang}`, 'it');
      }));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedVoiceURI || availableVoices.length === 0) return;
    const hasSelectedVoice = availableVoices.some((voice) => voice.voiceURI === selectedVoiceURI);
    if (!hasSelectedVoice) {
      setSelectedVoiceURI(null);
    }
  }, [availableVoices, selectedVoiceURI]);

  const finishActiveSpeech = () => {
    if (!activeSpeechFinishRef.current) return;
    const finish = activeSpeechFinishRef.current;
    activeSpeechFinishRef.current = null;
    finish();
  };

  const performSpeak = (text: string, voiceURIOverride?: string | null, forcePlayback = false) => {
    if ((!voiceEnabled && !forcePlayback) || typeof window === 'undefined' || !window.speechSynthesis) {
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

      const targetVoiceURI = voiceURIOverride ?? selectedVoiceURI;
      const targetVoice = targetVoiceURI
        ? availableVoices.find((voice) => voice.voiceURI === targetVoiceURI) ?? null
        : null;
      if (targetVoice) {
        utterance.voice = targetVoice;
      }
      utterance.lang = targetVoice?.lang || 'it-IT';
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

  const speak = (text: string, number?: number) => performSpeak(text);

  const previewVoice = (voiceURI: string | null) => performSpeak('Ciao! Proviamo questa voce di Tabellandia.', voiceURI, true);

  const toggleVoice = () => {
    setVoiceEnabled(prev => !prev);
    // Cancel speech when toggling off
    if (voiceEnabled) {
      finishActiveSpeech();
      window.speechSynthesis.cancel();
    }
  };

  return (
    <VoiceContext.Provider value={{ voiceEnabled, toggleVoice, speak, availableVoices, selectedVoiceURI, setSelectedVoiceURI, previewVoice }}>
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
