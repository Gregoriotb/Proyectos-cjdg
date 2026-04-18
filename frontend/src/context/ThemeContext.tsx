/**
 * ThemeContext — V3 Tech-Gray
 *
 * Fase 3.1: tema fijo `tech-light`. Extensible a toggle claro/oscuro
 * cuando la migración de componentes esté completa (Fase 3.3).
 *
 * Exponemos los tokens de diseño como objeto JS para los casos donde
 * un componente necesite acceder a un color por código (ej. canvas,
 * SVG inline) en vez de Tailwind.
 */
import { createContext, useContext, ReactNode } from 'react';

export const designTokens = {
  bg: {
    primary: '#F8F9FA',
    secondary: '#E9ECEF',
    tertiary: '#DEE2E6',
  },
  surface: '#FFFFFF',
  text: {
    primary: '#212529',
    secondary: '#6C757D',
    muted: '#ADB5BD',
  },
  accent: {
    blue: '#0D6EFD',
    blueHover: '#0B5ED7',
    blueLight: '#E7F1FF',
  },
  border: '#CED4DA',
  success: '#198754',
  warning: '#FFC107',
  danger: '#DC3545',
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 6px -1px rgba(0,0,0,0.08)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.12)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.15)',
  },
} as const;

export type ThemeName = 'tech-light';

interface ThemeContextValue {
  theme: ThemeName;
  tokens: typeof designTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'tech-light', tokens: designTokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
