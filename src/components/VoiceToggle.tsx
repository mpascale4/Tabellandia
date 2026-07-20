/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Speaker, Volume2 } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

export default function VoiceToggle() {
  const { voiceEnabled, toggleVoice } = useVoice();

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleVoice(); }}
      className={`w-7 h-7 rounded-full border transition-colors cursor-pointer flex items-center justify-center ${
        voiceEnabled
          ? 'bg-purple-100 border-purple-300 text-purple-600'
          : 'bg-white/70 border-slate-200 text-slate-400'
      }`}
      id="voice-toggle"
      title={voiceEnabled ? "Disattiva voce" : "Attiva voce"}
    >
      <Speaker className="w-3.5 h-3.5" />
    </button>
  );
}
