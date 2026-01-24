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
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw-custom.ts",
      includeAssets: ["only-logo.png", "aarx-logo.webp", "hostel-ledger-logo.webp", "firebase-messaging-sw.js", "OneSignalSDK.sw.js", "OneSignalSDKWorker.js"],
      manifest: {
        id: "/",
        name: "Hostel Ledger",
        short_name: "Ledger",
        description: "Smart expense splitting for groups, roommates, and friends",
        start_url: "/?twa=true",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#F8F9FA",
        theme_color: "#4a6850",
        lang: "en",
        categories: ["finance", "productivity", "utilities"],
        prefer_related_applications: false,
        icons: [
          { 
            src: "/only-logo.png", 
            sizes: "192x192", 
            type: "image/png",
            purpose: "any"
          },
          { 
            src: "/only-logo.png", 
            sizes: "512x512", 
            type: "image/png",
            purpose: "any"
          },
          { 
            src: "/only-logo.png", 
            sizes: "192x192", 
            type: "image/png",
            purpose: "maskable"
          },
          { 
            src: "/only-logo.png", 
            sizes: "512x512", 
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          {
            name: "Add Expense",
            short_name: "Add Expense",
            description: "Quickly add a new expense",
            url: "/?action=add-expense",
            icons: [{ src: "/only-logo.png", sizes: "707x701" }]
          },
          {
            name: "View Groups",
            short_name: "Groups",
            description: "View your expense groups",
            url: "/groups",
            icons: [{ src: "/only-logo.png", sizes: "707x701" }]
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        maximumFileSizeToCacheInBytes: 5000000,
      },
      workbox: {
        // Add navigation fallback for offline
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        // Runtime caching for external resources
        runtimeCaching: [
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Firebase scripts if loaded from CDN
            urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-sdk-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: "module"
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize for direct imports - no complex chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React separate for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Keep Firebase separate as it's large
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/database'],
          // Keep UI components together
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-tooltip', '@radix-ui/react-select'],
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Optimize CSS
    cssMinify: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['firebase'],
  },
  // Enable esbuild for faster builds
  esbuild: {
    target: 'es2020',
  },
}));
