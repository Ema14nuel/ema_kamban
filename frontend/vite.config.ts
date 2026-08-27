import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Docker Desktop en Windows no siempre propaga eventos de fs a un bind
    // mount, así que el watcher normal de Vite pierde cambios. Polling lo
    // arregla a costa de un poco de CPU — solo importa en desarrollo.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
