import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Standalone Vite config for previewing the renderer in a browser (design work
 * and contributor convenience). The real app is built with electron.vite.config.ts.
 * When run this way, window.spacescope is provided by the dev mock.
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  server: { port: 5199, strictPort: true }
})
