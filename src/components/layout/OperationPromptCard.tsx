import React from 'react';

type OperationPromptTone = 'indigo' | 'violet' | 'purple' | 'emerald' | 'amber';

interface OperationPromptCardProps {
  eyebrow: string;
  operation: string;
  tone?: OperationPromptTone;
  icon?: string;
  statusLabel?: string;
  onSpeakOperation?: () => void;
  operationAriaLabel?: string;
  operationClassName?: string;
  className?: string;
}

const TONE_CLASSES: Record<OperationPromptTone, { shell: string; eyebrow: string; operation: string; status: string; icon: string }> = {
  indigo: {
    shell: 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50',
    eyebrow: 'text-indigo-600',
    operation: 'text-indigo-950',
    status: 'text-indigo-700',
    icon: 'text-indigo-700',
  },
  violet: {
    shell: 'border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50',
    eyebrow: 'text-fuchsia-700',
    operation: 'text-slate-800',
    status: 'text-violet-700',
    icon: 'text-violet-700',
  },
  purple: {
    shell: 'border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50',
    eyebrow: 'text-purple-600',
    operation: 'text-indigo-950',
    status: 'text-purple-700',
    icon: 'text-purple-700',
  },
  emerald: {
    shell: 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50',
    eyebrow: 'text-emerald-700',
    operation: 'text-emerald-950',
    status: 'text-emerald-700',
    icon: 'text-emerald-700',
  },
  amber: {
    shell: 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50',
    eyebrow: 'text-amber-700',
    operation: 'text-amber-900',
    status: 'text-amber-700',
    icon: 'text-amber-700',
  },
};

export default function OperationPromptCard({
  eyebrow,
  operation,
  tone = 'indigo',
  icon,
  statusLabel,
  onSpeakOperation,
  operationAriaLabel,
  operationClassName = '',
  className = '',
}: OperationPromptCardProps) {
  const classes = TONE_CLASSES[tone];

  return (
    <div className={`rounded-2xl border p-3 shadow-sm ${classes.shell} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          {icon && (
            <span className={`text-xl leading-none ${classes.icon}`} aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-wide font-sans ${classes.eyebrow}`}>
              {eyebrow}
            </p>
            {onSpeakOperation ? (
              <button
                type="button"
                onClick={onSpeakOperation}
                aria-label={operationAriaLabel}
                className={`mt-0.5 rounded px-1 text-left text-base font-black font-mono focus-visible:outline-2 ${classes.operation} ${operationClassName} cursor-pointer`}
              >
                {operation}
              </button>
            ) : (
              <p className={`mt-0.5 px-1 text-base font-black font-mono ${classes.operation} ${operationClassName}`}>
                {operation}
              </p>
            )}
          </div>
        </div>
        {statusLabel && (
          <p className={`shrink-0 text-[11px] font-black uppercase tracking-wide font-sans ${classes.status}`}>
            {statusLabel}
          </p>
        )}
      </div>
    </div>
  );
}

