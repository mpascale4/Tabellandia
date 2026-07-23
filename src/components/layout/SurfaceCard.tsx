import React from 'react';

interface SurfaceCardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
  'aria-live'?: string;
  'aria-labelledby'?: string;
  padding?: string;
  tone?: string;
  key?: string | number;
}

export function SurfaceCard({ children, className = '', onClick, role, 'aria-label': ariaLabel, 'aria-live': ariaLive, 'aria-labelledby': ariaLabelledBy }: SurfaceCardProps) {
  return (
    <div 
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
      aria-live={ariaLive}
      aria-labelledby={ariaLabelledBy}
      className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export default SurfaceCard;
