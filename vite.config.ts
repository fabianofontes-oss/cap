import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/*.svg'],
        manifest: {
          name: 'CAP Master',
          short_name: 'CAP Master',
          description: 'Estude para o CAP na Espanha com perguntas em espanhol, tradução em português e simulados.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#FF6321',
          background_color: '#ffffff',
          lang: 'pt-BR',
          categories: ['education', 'productivity'],
          icons: [
            {
              src: '/icons/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
            {
              src: '/icons/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
            {
              src: '/icons/icon-192-maskable.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-512-maskable.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/(firestore|securetoken|identitytoolkit)\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly' as const,
            },
            {
              urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly' as const,
            },
            {
              urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly' as const,
            },
          ],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
