import React from 'react';

type ResponsiveGridProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'cards' | 'compact' | 'split';
  }
>;

const variantClasses: Record<NonNullable<ResponsiveGridProps['variant']>, string> = {
  cards: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  compact: 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4',
  split: 'grid grid-cols-1 gap-6 xl:grid-cols-2',
};

export default function ResponsiveGrid({
  variant = 'cards',
  className = '',
  children,
  ...props
}: ResponsiveGridProps) {
  return (
    <div className={`${variantClasses[variant]} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}


