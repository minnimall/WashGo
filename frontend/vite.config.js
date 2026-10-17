import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // ถามผู้ใช้ก่อนอัปเดต ไม่รีโหลดเองกลางทาง
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'WashGo ซักผ้าส่งถึงบ้าน',
        short_name: 'WashGo',
        description: 'บริการรับส่งผ้าซักตามสั่ง สั่งง่าย ติดตามไรเดอร์ได้',
        lang: 'th',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#8b5cf6',
        categories: ['lifestyle', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // เก็บเฉพาะไฟล์หน้าเว็บ (JS/CSS/HTML) ห้ามเก็บ API เพราะเป็นข้อมูลส่วนตัวของผู้ใช้
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/hubs\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5218',
      '/hubs': { target: 'http://localhost:5218', ws: true },
    },
  },
})