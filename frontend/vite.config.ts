import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Exporta la red entera para que Docker pueda atacarlo si se necesita
    watch: {
      usePolling: true // Ideal para sincronización rápida
    }
  }
})
