 import { defineConfig } from "vite";
 import react from "@vitejs/plugin-react-swc";
 import path from "path";
 import { componentTagger } from "lovable-tagger";
 import { VitePWA } from "vite-plugin-pwa";
 
 // https://vitejs.dev/config/
 export default defineConfig(({ mode }) => ({
   server: {
     host: "::",
     port: 8080,
   },
   plugins: [
     react(),
     mode === "development" && componentTagger(),
     VitePWA({
       registerType: 'autoUpdate',
       includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
       manifest: {
         name: '363 Music',
         short_name: '363 Music',
         description: 'Download the Frequency - Premium music streaming and downloads',
         theme_color: '#0a0a0b',
         background_color: '#0a0a0b',
         display: 'standalone',
         orientation: 'portrait',
         start_url: '/',
         scope: '/',
        icons: [
            {
              src: '/app-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/app-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
       },
       workbox: {
         globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
         maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
         runtimeCaching: [
           {
             urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
             handler: 'NetworkFirst',
             options: {
               cacheName: 'supabase-api-cache',
               expiration: {
                 maxEntries: 100,
                 maxAgeSeconds: 60 * 60
               },
               cacheableResponse: {
                 statuses: [0, 200]
               }
             }
           }
         ]
       }
     })
   ].filter(Boolean),
   resolve: {
     alias: {
       "@": path.resolve(__dirname, "./src"),
     },
     dedupe: ["react", "react-dom"],
   },
 }));
