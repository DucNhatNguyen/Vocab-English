import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

const PAPER = '#FBF7EE'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Custom service worker (src/sw.ts) so OneSignal's worker can be merged in later (step 10).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // registered explicitly from src/main.tsx via virtual:pwa-register
      injectManifest: {
        // 'iife' (classic worker) is required: importScripts() is not allowed in ES-module workers,
        // and the OneSignal SDK worker is loaded with importScripts().
        rollupFormat: 'iife',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2}'],
      },
      manifest: {
        name: 'Từ Ngày',
        short_name: 'Từ Ngày',
        lang: 'vi',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: PAPER,
        background_color: PAPER,
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
