import React from 'react';

type ActionGridProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> & {
  columns?: 1 | 2 | 3;
  }
>;

// min-size per colonna: più grande = meno colonne, più piccola = più colonne
const columnClasses: Record<NonNullable<ActionGridProps['columns']>, string> = {
  1: 'grid grid-cols-1 gap-3',
  2: 'grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3',
  3: 'grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3',
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
