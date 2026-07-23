import React from 'react';

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
