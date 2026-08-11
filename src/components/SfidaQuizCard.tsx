/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Timer, Trophy } from 'lucide-react';
import OperationPromptCard from './layout/OperationPromptCard';
import AnswerOptionsGrid from './layout/AnswerOptionsGrid';

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

      <AnswerOptionsGrid
        options={sfidaOptions}
        pressedFeedback={sfidaPressedFeedback}
        interactionLocked={sfidaInteractionLocked}
        compactLayout={compactLayout}
        hoverClassName="hover:border-amber-400"
        idPrefix="sfida-opt"
        onAnswerSelect={onAnswerSelect}
      />
    </div>
  );
}
