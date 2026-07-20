/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Speaker, X } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

export default function VoiceToggle({ isPhoneMode = false }: { isPhoneMode?: boolean }) {
  const { voiceEnabled, toggleVoice } = useVoice();

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleVoice(); }}
      className={`rounded-full border transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 ${
        isPhoneMode ? 'w-6 h-6' : 'w-8 h-8'
      } ${
        voiceEnabled
          ? 'bg-purple-100 border-purple-300 text-purple-600'
          : 'bg-white/70 border-slate-200 text-slate-400'
      }`}
      id="voice-toggle"
      title={voiceEnabled ? "Disattiva voce" : "Attiva voce"}
    >
      <span className="relative flex items-center justify-center">
        <Speaker className={isPhoneMode ? 'w-3 h-3' : 'w-4 h-4'} />
        {!voiceEnabled && <X className={`absolute -right-1 -bottom-1 stroke-[3.2] ${isPhoneMode ? 'w-1 h-1' : 'w-2 h-2'}`} />}
      </span>
    </button>
  );
}
