import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  role?: string;
  'aria-label'?: string;
  centered?: boolean;
  eyebrow?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, className = '', role, 'aria-label': ariaLabel, centered, eyebrow, description, icon, actions }: SectionHeaderProps) {
  return (
    <div role={role} aria-label={ariaLabel} className={`mb-4 ${centered ? 'text-center' : ''} ${className}`}>
      {eyebrow && <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 block">{eyebrow}</span>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>
        {actions}
      </div>
      {(subtitle || description) && <p className="text-sm text-slate-500 mt-0.5">{subtitle || description}</p>}
    </div>
  );
}

export default SectionHeader;
