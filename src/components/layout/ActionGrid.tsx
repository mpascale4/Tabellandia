import React from 'react';

interface ActionGridProps {
  children: React.ReactNode;
  columns?: number;
  className?: string;
  role?: string;
  'aria-label'?: string;
}

export default function ActionGrid({ children, columns = 2, className = '', role, 'aria-label': ariaLabel }: ActionGridProps) {
  return (
    <div role={role} aria-label={ariaLabel} className={`grid grid-cols-${columns} gap-3 ${className}`}>
      {children}
    </div>
  );
}
