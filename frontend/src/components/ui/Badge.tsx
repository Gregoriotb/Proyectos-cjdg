import { HTMLAttributes, ReactNode } from 'react';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type Variant = 'soft' | 'solid' | 'outline';
type Size = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
}

// Por tono: soft (bg suave), solid (bg pleno) y outline (solo borde)
const TONE: Record<Tone, { soft: string; solid: string; outline: string }> = {
  neutral: {
    soft:    'bg-cj-bg-secondary text-cj-text-secondary',
    solid:   'bg-cj-text-secondary text-white',
    outline: 'border border-cj-border text-cj-text-secondary',
  },
  info: {
    soft:    'bg-cj-accent-blue-light text-cj-accent-blue',
    solid:   'bg-cj-accent-blue text-white',
    outline: 'border border-cj-accent-blue text-cj-accent-blue',
  },
  success: {
    soft:    'bg-green-50 text-green-700',
    solid:   'bg-cj-success text-white',
    outline: 'border border-cj-success text-cj-success',
  },
  warning: {
    soft:    'bg-amber-50 text-amber-700',
    solid:   'bg-cj-warning text-slate-900',
    outline: 'border border-cj-warning text-amber-700',
  },
  danger: {
    soft:    'bg-red-50 text-red-700',
    solid:   'bg-cj-danger text-white',
    outline: 'border border-cj-danger text-cj-danger',
  },
};

const SIZE: Record<Size, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'sm',
  leftIcon,
  className = '',
  children,
  ...rest
}: BadgeProps) {
  const toneClasses = TONE[tone][variant];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wider ${toneClasses} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {leftIcon}
      {children}
    </span>
  );
}
