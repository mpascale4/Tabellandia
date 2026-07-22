import React from 'react';

type SurfaceCardProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> & {
  padding?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'soft' | 'indigo';
  }
>;

const paddingClasses: Record<NonNullable<SurfaceCardProps['padding']>, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const toneClasses: Record<NonNullable<SurfaceCardProps['tone']>, string> = {
  default: 'bg-white border border-white/60 shadow-sm',
  soft: 'bg-white/50 backdrop-blur-sm border border-white/50 shadow-md',
  indigo: 'bg-indigo-50 border border-indigo-100 shadow-sm',
};

export default function SurfaceCard({
  padding = 'md',
  tone = 'default',
  className = '',
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={`rounded-3xl ${paddingClasses[padding]} ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}


