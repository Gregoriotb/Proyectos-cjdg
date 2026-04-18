import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from 'react';

interface BaseProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

const BASE_FIELD =
  'w-full bg-cj-bg-primary border rounded-lg text-cj-text-primary ' +
  'placeholder:text-cj-text-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light focus:border-cj-accent-blue ' +
  'transition-all disabled:opacity-60 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, containerClassName = '', className = '', id, ...rest }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = Boolean(error);
    const borderColor = hasError ? 'border-cj-danger' : 'border-cj-border';
    const padding = leftIcon ? 'pl-10 pr-4 py-2.5' : rightIcon ? 'pl-4 pr-10 py-2.5' : 'px-4 py-2.5';

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-cj-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cj-text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`${BASE_FIELD} ${borderColor} ${padding} ${className}`}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cj-text-muted pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-cj-danger">{error}</p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-cj-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, containerClassName = '', className = '', id, rows = 3, ...rest }, ref) => {
    const areaId = id || `ta-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = Boolean(error);
    const borderColor = hasError ? 'border-cj-danger' : 'border-cj-border';

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={areaId} className="text-xs font-medium text-cj-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          rows={rows}
          className={`${BASE_FIELD} ${borderColor} px-4 py-2.5 resize-none ${className}`}
          aria-invalid={hasError}
          aria-describedby={error ? `${areaId}-error` : hint ? `${areaId}-hint` : undefined}
          {...rest}
        />
        {error ? (
          <p id={`${areaId}-error`} className="text-xs text-cj-danger">{error}</p>
        ) : hint ? (
          <p id={`${areaId}-hint`} className="text-xs text-cj-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
