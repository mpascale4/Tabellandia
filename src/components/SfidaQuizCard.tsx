/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Timer, Trophy } from 'lucide-react';
import OperationPromptCard from './layout/OperationPromptCard';

interface SfidaQuizCardProps {
  sfidaQuestion: { a: number; b: number };
  sfidaOptions: number[];
  sfidaTimer: number;
  sfidaScore: number;
  sfidaPressedFeedback: { opt: number; correct: boolean } | null;
  sfidaInteractionLocked: boolean;
  compactLayout?: boolean;
  onSpeakOperation: () => void;
  onAnswerSelect: (opt: number) => void;
}

export default function SfidaQuizCard({
  sfidaQuestion,
  sfidaOptions,
  sfidaTimer,
  sfidaScore,
  sfidaPressedFeedback,
  sfidaInteractionLocked,
  compactLayout = false,
  onSpeakOperation,
  onAnswerSelect,
}: SfidaQuizCardProps) {
  return (
    <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-rose-600 font-bold font-mono bg-rose-50 px-3 py-1 rounded-full text-sm">
          <Timer className="w-4 h-4 animate-spin" />
          Tempo: {sfidaTimer}s
        </div>

        <div className="flex items-center gap-1.5 text-amber-600 font-bold font-mono bg-amber-50 px-3 py-1 rounded-full text-sm">
          <Trophy className="w-4 h-4" />
          Punti: {sfidaScore}
        </div>
      </div>

      <OperationPromptCard
        tone="violet"
        icon="⚡"
        eyebrow="Completa questa operazione"
        operation={`${sfidaQuestion.a} × ${sfidaQuestion.b} = ?`}
        operationClassName="text-xl sm:text-2xl tracking-wide"
        onSpeakOperation={onSpeakOperation}
        operationAriaLabel={`Ascolta operazione ${sfidaQuestion.a} per ${sfidaQuestion.b}`}
      />

      <div className={`w-full h-full content-start grid grid-cols-2 ${compactLayout ? 'gap-2.5' : 'gap-3.5'}`}>
        {sfidaOptions.map((opt, idx) => {
          const pressed = sfidaPressedFeedback?.opt === opt;
          const feedbackClass = pressed
            ? sfidaPressedFeedback!.correct
              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-95'
              : 'bg-rose-100 border-rose-400 text-rose-800 scale-95'
            : 'bg-white border-slate-100 hover:border-amber-400 hover:bg-slate-50 text-slate-800 active:scale-95';

          return (
            <button
              key={idx}
              disabled={sfidaInteractionLocked}
              aria-disabled={sfidaInteractionLocked}
              onClick={() => onAnswerSelect(opt)}
              className={`w-full rounded-xl border-2 font-black font-mono shadow-sm transition-all select-none disabled:cursor-not-allowed disabled:opacity-70 ${compactLayout ? 'min-h-11 py-3 px-2 text-base' : 'min-h-14 py-4 px-4 text-lg'} ${feedbackClass} ${sfidaInteractionLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              id={`sfida-opt-${opt}`}
              aria-label={`Risposta ${opt}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
