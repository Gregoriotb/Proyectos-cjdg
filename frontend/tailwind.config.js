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
        // Paleta Corporativa Ejecutiva (Executive Dark)
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
        }
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
      }
    },
  },
  plugins: [],
}
