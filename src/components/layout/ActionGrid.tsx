import React from 'react';

type ActionGridProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> & {
  columns?: 1 | 2 | 3;
  }
>;

const columnClasses: Record<NonNullable<ActionGridProps['columns']>, string> = {
  1: 'grid grid-cols-1 gap-3',
  2: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  3: 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3',
};

export default function ActionGrid({
  columns = 2,
  className = '',
  children,
  ...props
}: ActionGridProps) {
  return (
    <div className={`${columnClasses[columns]} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}


