import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so Electron can load dist/ via file://
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
