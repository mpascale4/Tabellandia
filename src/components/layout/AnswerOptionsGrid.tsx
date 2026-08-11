/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface PressedFeedback {
  opt: number;
  correct: boolean;
}

interface AnswerOptionsGridProps {
  options: number[];
  pressedFeedback: PressedFeedback | null;
  interactionLocked: boolean;
  compactLayout?: boolean;
  /** Tailwind hover border/bg classes applied to the idle (not-yet-pressed) button state, e.g. 'hover:border-indigo-400'. */
  hoverClassName?: string;
  /** Prefix used to build the button's `id`/`aria-label`, e.g. 'quiz-opt' or 'sfida-opt'. */
  idPrefix: string;
  onAnswerSelect: (opt: number) => void;
}

/**
 * Shared answer-options grid with press feedback, used by both PraticoQuizCard
 * and SfidaQuizCard (and any future quiz-style mini-game) to avoid duplicating
 * the same button-grid/feedback-color logic in each card.
 */
export default function AnswerOptionsGrid({
  options,
  pressedFeedback,
  interactionLocked,
  compactLayout = false,
  hoverClassName = 'hover:border-indigo-400',
  idPrefix,
  onAnswerSelect,
}: AnswerOptionsGridProps) {
  return (
    <div className={`w-full h-full content-start grid grid-cols-2 ${compactLayout ? 'gap-2.5' : 'gap-3.5'}`}>
      {options.map((opt, idx) => {
        const pressed = pressedFeedback?.opt === opt;
        const feedbackClass = pressed
          ? pressedFeedback!.correct
            ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-95'
            : 'bg-rose-100 border-rose-400 text-rose-800 scale-95'
          : `bg-white border-slate-100 ${hoverClassName} hover:bg-slate-50 text-slate-800 active:scale-95`;

        return (
          <button
            key={idx}
            disabled={interactionLocked}
            aria-disabled={interactionLocked}
            onClick={() => {
              if (interactionLocked) return;
              onAnswerSelect(opt);
            }}
            className={`w-full rounded-xl border-2 font-black font-mono shadow-sm transition-all select-none disabled:cursor-not-allowed disabled:opacity-70 ${compactLayout ? 'min-h-11 py-3 px-2 text-base' : 'min-h-14 py-4 px-4 text-lg'} ${feedbackClass} ${interactionLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            id={`${idPrefix}-${opt}`}
            aria-label={`Risposta ${opt}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
