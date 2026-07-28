/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useFontSize } from '../contexts/FontSizeContext';

export default function FontSizeControl() {
  const { scale, increaseFontSize, decreaseFontSize, resetFontSize } = useFontSize();
  
  return (
    <div className="fixed bottom-4 right-4 flex gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-200 z-50">
      <button
        onClick={decreaseFontSize}
        disabled={scale <= 0.8}
        className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Diminuisci testo"
        aria-label="Diminuisci dimensione testo"
      >
        <Minus size={18} className="text-gray-600" />
      </button>
      
      <div className="flex items-center px-2 min-w-[50px] justify-center">
        <span className="text-xs font-bold text-gray-600">{Math.round(scale * 100)}%</span>
      </div>
      
      <button
        onClick={increaseFontSize}
        disabled={scale >= 1.5}
        className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Aumenta testo"
        aria-label="Aumenta dimensione testo"
      >
        <Plus size={18} className="text-gray-600" />
      </button>
      
      <button
        onClick={resetFontSize}
        className="p-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
        title="Ripristina testo"
        aria-label="Ripristina dimensione testo predefinita"
      >
        <RotateCcw size={18} className="text-gray-600" />
      </button>
    </div>
  );
}
