import { HTMLAttributes, forwardRef, ReactNode } from 'react';

type Padding = 'none' | 'sm' | 'md' | 'lg';
type Elevation = 'flat' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  elevation?: Elevation;
  hoverable?: boolean;
  interactive?: boolean;
}

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};

const ELEVATION: Record<Elevation, string> = {
  flat: '',
  sm: 'shadow-cj-sm',
  md: 'shadow-cj-md',
  lg: 'shadow-cj-lg',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      elevation = 'md',
      hoverable = false,
      interactive = false,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const hover = hoverable ? 'hover:shadow-cj-lg transition-shadow duration-300' : '';
    const clickable = interactive ? 'cursor-pointer hover:-translate-y-0.5 transition-all duration-200' : '';
    return (
      <div
        ref={ref}
        className={`bg-cj-surface rounded-xl border border-cj-border ${ELEVATION[elevation]} ${PADDING[padding]} ${hover} ${clickable} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

// Sub-componentes opcionales para estructurar encabezado, cuerpo y pie
export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-cj-text-primary ${className}`}>{children}</h3>
  );
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-sm text-cj-text-secondary mt-1 ${className}`}>{children}</p>
  );
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 pt-4 border-t border-cj-border ${className}`}>{children}</div>;
}
