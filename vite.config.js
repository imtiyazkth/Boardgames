import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: "json" }

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [],
      },
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Board Games — Play & Win',
        short_name: 'BoardGames',
        description: 'Classic board games — Chess, Ludo, Checkers, Carrom and more. Offline, no ads.',
        theme_color: '#0a0b14',
        background_color: '#0a0b14',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['games', 'entertainment'],
        shortcuts: [
          { name: 'Chess',   short_name: 'Chess',   url: './', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Ludo',    short_name: 'Ludo',    url: './', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__:  JSON.stringify(new Date().toISOString()),
  },
})
