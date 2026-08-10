import React from 'react';

type RetryButtonTone = 'rose' | 'amber';

interface RetryButtonProps {
  onClick: () => void;
  tone?: RetryButtonTone;
  className?: string;
}

const TONE_CLASSES: Record<RetryButtonTone, string> = {
  rose: 'bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-500',
  amber: 'bg-amber-600 hover:bg-amber-700 focus-visible:outline-amber-500',
};

export default function RetryButton({ onClick, tone = 'amber', className = '' }: RetryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Riprova il turno corrente"
      className={`w-full rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-md transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${TONE_CLASSES[tone]} ${className}`}
    >
      Riprova
    </button>
  );
}

