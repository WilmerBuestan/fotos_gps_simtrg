import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // El propio proceso de Vite reenvía estas rutas al backend en
    // localhost:3000 (mismo host, siempre resuelve bien). Así el
    // navegador (incluso a través de un túnel) solo necesita hablar con
    // el puerto 5173 — no hace falta exponer el 3000 en ningún lado.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
