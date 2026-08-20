import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify('2.1.0'),
    __BUILD_TIME__:  JSON.stringify(new Date().toISOString()),
  }
})
