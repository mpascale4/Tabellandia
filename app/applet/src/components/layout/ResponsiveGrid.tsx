import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ children, columns = 2, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-3 ${className}`}>
      {children}
    </div>
  );
};
