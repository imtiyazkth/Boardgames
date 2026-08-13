import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: "json" }

const buildTime = new Date().toISOString()
const version   = pkg.version

export default defineConfig({
  plugins: [
    react(),
  ],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__:  JSON.stringify(buildTime)
  }
})
