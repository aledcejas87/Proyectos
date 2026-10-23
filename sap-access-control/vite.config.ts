import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base relativa: el build funciona abierto desde cualquier carpeta o subruta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
