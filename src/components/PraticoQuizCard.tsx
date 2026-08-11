/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import OperationPromptCard from './layout/OperationPromptCard';

interface PraticoQuizCardProps {
  currentQuestion: { a: number; b: number };
  quizOptions: number[];
  quizCorrectStreak: number;
  targetPraticoStreak: number;
  quizStreakJustReset: boolean;
  quizPressedFeedback: { opt: number; correct: boolean } | null;
  quizInteractionLocked: boolean;
  compactLayout?: boolean;
  onSpeakOperation: () => void;
  onAnswerSelect: (opt: number) => void;
}

export default function PraticoQuizCard({
  currentQuestion,
  quizOptions,
  quizCorrectStreak,
  targetPraticoStreak,
  quizStreakJustReset,
  quizPressedFeedback,
  quizInteractionLocked,
  compactLayout = false,
  onSpeakOperation,
  onAnswerSelect,
}: PraticoQuizCardProps) {
  return (
    <div className="max-w-xl mx-auto w-full bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl space-y-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs">
        <div aria-hidden="true" />
        <div className="w-36 text-center">
          <motion.div
            key={`quiz-streak-${quizCorrectStreak}-${quizStreakJustReset ? 'reset' : 'steady'}`}
            initial={quizStreakJustReset ? { scale: 0.92, y: -4 } : false}
            animate={quizStreakJustReset ? { scale: [0.92, 1.08, 1], y: [-4, 0, 0] } : { scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`mb-1 text-lg font-black font-mono leading-none ${
              quizStreakJustReset ? 'text-rose-600' : 'text-emerald-600'
            }`}
            aria-live="polite"
          >
            {quizCorrectStreak}/{targetPraticoStreak}
          </motion.div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Progresso pratico"
            aria-valuemin={0}
            aria-valuemax={targetPraticoStreak}
            aria-valuenow={quizCorrectStreak}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                quizStreakJustReset ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (quizCorrectStreak / Math.max(1, targetPraticoStreak)) * 100))}%` }}
            />
          </div>
        </div>
        <div className="flex justify-end" />
      </div>

      <OperationPromptCard
        tone="indigo"
        icon="🛡️"
        eyebrow="Completa questa operazione"
        operation={`${currentQuestion.a} × ${currentQuestion.b} = ?`}
        operationClassName="text-xl sm:text-2xl tracking-wide"
        onSpeakOperation={onSpeakOperation}
        operationAriaLabel={`Ascolta operazione ${currentQuestion.a} per ${currentQuestion.b}`}
      />

      <div className={`w-full h-full content-start grid grid-cols-2 ${compactLayout ? 'gap-2.5' : 'gap-3.5'}`}>
        {quizOptions.map((opt, idx) => {
          const pressed = quizPressedFeedback?.opt === opt;
          const feedbackClass = pressed
            ? quizPressedFeedback!.correct
              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-95'
              : 'bg-rose-100 border-rose-400 text-rose-800 scale-95'
            : 'bg-white border-slate-100 hover:border-indigo-400 hover:bg-slate-50 text-slate-800 active:scale-95';

          return (
            <button
              key={idx}
              disabled={quizInteractionLocked}
              onClick={() => onAnswerSelect(opt)}
              className={`w-full rounded-xl border-2 font-black font-mono shadow-sm transition-all select-none disabled:cursor-not-allowed disabled:opacity-70 ${compactLayout ? 'min-h-11 py-3 px-2 text-base' : 'min-h-14 py-4 px-4 text-lg'} ${feedbackClass} ${quizInteractionLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              id={`quiz-opt-${opt}`}
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
