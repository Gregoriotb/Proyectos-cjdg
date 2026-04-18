/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Forzamos o permitimos el modo oscuro
  theme: {
    extend: {
      colors: {
        // Paleta Corporativa Ejecutiva (Executive Dark) — LEGACY, se migrará a cj-*
        cjdg: {
          dark: '#0f172a',      // Slate 900 - Fondo principal
          darker: '#020617',    // Slate 950 - Fondos profundos
          panel: '#1e293b',     // Slate 800 - Paneles y tarjetas
          border: '#334155',    // Slate 700 - Bordes sutiles
          primary: '#2563eb',   // Blue 600 - Acentos primarios (Botones)
          primaryHover: '#1d4ed8', // Hover state
          accent: '#38bdf8',    // Sky 400 - Detalles luminosos
          text: '#f8fafc',      // Slate 50 - Texto principal
          textMuted: '#94a3b8', // Slate 400 - Texto secundario
        },
        // V3 Tech-Gray — paleta nueva, migración progresiva (Fase 3.x)
        cj: {
          bg: {
            primary:   '#F8F9FA', // Fondo principal (grisáceo claro)
            secondary: '#E9ECEF', // Cards elevadas
            tertiary:  '#DEE2E6', // Hover, bordes suaves
          },
          surface: '#FFFFFF',      // Modales, flotantes
          text: {
            primary:   '#212529',  // Texto principal (casi negro)
            secondary: '#6C757D',  // Subtítulos, metadatos
            muted:     '#ADB5BD',  // Placeholders, deshabilitados
          },
          accent: {
            blue:         '#0D6EFD', // CTAs, links, activo
            'blue-hover': '#0B5ED7', // Hover de CTAs
            'blue-light': '#E7F1FF', // Badge bg, highlight
          },
          border:  '#CED4DA',      // Bordes estándar
          success: '#198754',      // Confirmaciones
          warning: '#FFC107',      // Alertas suaves
          danger:  '#DC3545',      // Errores
        },
      },
      fontFamily: {
        // Fuentes técnicas y ejecutivas
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
        'glass-light': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 15px -3px rgba(56, 189, 248, 0.4)',
        // V3 Tech-Gray — sombras sutiles, opacity ≤ 0.15
        'cj-sm': '0 1px 2px rgba(0,0,0,0.04)',
        'cj-md': '0 4px 6px -1px rgba(0,0,0,0.08)',
        'cj-lg': '0 10px 15px -3px rgba(0,0,0,0.12)',
        'cj-xl': '0 20px 25px -5px rgba(0,0,0,0.15)',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%':      { 'background-position': '100% 50%' },
        },
      },
      animation: {
        gradient: 'gradient 8s ease infinite',
      },
    },
  },
  plugins: [],
}
