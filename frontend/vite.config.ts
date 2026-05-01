import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Messenger 5.1',
        short_name: 'Messenger',
        description: 'Real-time chat with push notifications',
        theme_color: '#3390ec',
        background_color: '#0f1720',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'images-cache', expiration: { maxEntries: 50, maxAgeSeconds: 2592000 } }
        }]
      },
      // 🔔 Настройки для push-уведомлений
      devOptions: { enabled: true },
      injectRegister: 'auto',
      strategies: 'generateSW',
      srcDir: '',
      filename: 'sw.ts',
    })
  ],
  server: { port: 5173, host: '0.0.0.0' }
});