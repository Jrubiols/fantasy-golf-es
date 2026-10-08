import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const THEME = '#0d2818'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { image: 'public/favicon.svg', overrideManifestIcons: true },
      manifest: {
        name: 'Fantasy Golf ES',
        short_name: 'FantasyGolf',
        description: 'Elige tu equipo de golfistas, sigue cada ronda y compite con tus amigos.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME,
        background_color: THEME,
      },
      workbox: {
        navigateFallback: '/index.html',
        // Las rutas /__/ las usa Firebase Auth y nunca deben servirse desde caché
        navigateFallbackDenylist: [/^\/__\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
