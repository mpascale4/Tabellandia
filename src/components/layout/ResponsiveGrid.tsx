import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  className?: string;
  role?: string;
  'aria-label'?: string;
  variant?: string;
}

export function ResponsiveGrid({ children, columns = 2, className = '', role, 'aria-label': ariaLabel }: ResponsiveGridProps) {
  return (
    <div role={role} aria-label={ariaLabel} className={`grid grid-cols-1 sm:grid-cols-${columns} gap-3 ${className}`}>
      {children}
    </div>
  );
}

export default ResponsiveGrid;
