/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface FontSizeContextType {
  scale: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const FONT_SIZE_KEY = 'tabellandia_font_size_scale';
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;
const STEP = 0.1;
const DEFAULT_SCALE = 1.0;

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState<number>(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_SCALE;
  });

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, scale.toString());
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }, [scale]);

  const increaseFontSize = () => {
    setScale(prev => Math.min(prev + STEP, MAX_SCALE));
  };

  const decreaseFontSize = () => {
    setScale(prev => Math.max(prev - STEP, MIN_SCALE));
  };

  const resetFontSize = () => {
    setScale(DEFAULT_SCALE);
  };

  return (
    <FontSizeContext.Provider value={{ scale, increaseFontSize, decreaseFontSize, resetFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within FontSizeProvider');
  }
  return context;
}
