import React from 'react';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  centered?: boolean;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  centered = false,
  className = '',
}: SectionHeaderProps) {
  const alignment = centered ? 'text-center items-center' : 'text-left items-start';

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      <div className={`flex flex-col gap-3 ${alignment} ${actions ? 'sm:flex-row sm:items-start sm:justify-between' : ''}`.trim()}>
        <div className={`flex flex-col gap-2 ${alignment}`.trim()}>
          {eyebrow && (
            <span className="inline-flex rounded-full border border-current/10 bg-white/70 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-800">
              {eyebrow}
            </span>
          )}
          <div className={`flex gap-2 ${centered ? 'justify-center' : 'justify-start'} items-center`}>
            {icon}
            <h2 className="text-xl font-black text-slate-900 font-sans sm:text-2xl">{title}</h2>
          </div>
          {description && (
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

