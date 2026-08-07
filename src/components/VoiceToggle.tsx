/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Speaker, X } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

const LONG_PRESS_MS = 450;

export default function VoiceToggle({
  isPhoneMode = false,
  onOpenSelector,
  isSelectorOpen = false,
}: {
  isPhoneMode?: boolean;
  onOpenSelector?: () => void;
  isSelectorOpen?: boolean;
}) {
  const { voiceEnabled, toggleVoice } = useVoice();
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const openSelector = () => {
    if (!onOpenSelector) return;
    longPressTriggeredRef.current = true;
    onOpenSelector();
  };

  useEffect(() => clearLongPress, []);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        toggleVoice();
      }}
      onPointerDown={(e) => {
        if (!onOpenSelector || (e.pointerType === 'mouse' && e.button !== 0)) return;
        longPressTriggeredRef.current = false;
        clearLongPress();
        longPressTimeoutRef.current = window.setTimeout(() => {
          openSelector();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      onContextMenu={(e) => {
        if (!onOpenSelector) return;
        e.preventDefault();
        e.stopPropagation();
        clearLongPress();
        openSelector();
      }}
      onKeyDown={(e) => {
        if (!onOpenSelector) return;
        if (e.altKey && e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          openSelector();
        }
      }}
      className={`rounded-full border transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 ${
        isPhoneMode ? 'w-6 h-6' : 'w-8 h-8'
      } ${
        voiceEnabled
          ? 'bg-purple-100 border-purple-300 text-purple-600'
          : 'bg-white/70 border-slate-200 text-slate-400'
      }`}
      id="voice-toggle"
      title={voiceEnabled ? "Disattiva voce" : "Attiva voce"}
      aria-haspopup={onOpenSelector ? 'dialog' : undefined}
      aria-expanded={onOpenSelector ? isSelectorOpen : undefined}
      aria-label={voiceEnabled
        ? "Voce attiva. Tocca per disattivarla. Tieni premuto per scegliere una voce."
        : "Voce disattivata. Tocca per attivarla. Tieni premuto per scegliere una voce."}
    >
      <span className="relative flex items-center justify-center">
        <Speaker className={isPhoneMode ? 'w-3 h-3' : 'w-4 h-4'} />
        {!voiceEnabled && <X className={`absolute -right-1 -bottom-1 stroke-[3.2] ${isPhoneMode ? 'w-1 h-1' : 'w-2 h-2'}`} />}
      </span>
    </button>
  );
}
