// vite.config.ts
import { defineConfig } from "file:///C:/Projects/hostel-ledger/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Projects/hostel-ledger/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Projects/hostel-ledger/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Projects/hostel-ledger/node_modules/vite-plugin-pwa/dist/index.js";
import { execSync } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Projects/hostel-ledger/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
var commitHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch (e) {
    return "unknown";
  }
})();
var buildDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
    __COMMIT_HASH__: JSON.stringify(commitHash)
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "OneSignalSDKWorker.ts",
      includeAssets: ["only-logo.png", "aarx-logo.webp", "hostel-ledger-logo.webp", "firebase-messaging-sw.js", "OneSignalSDK.sw.js"],
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
        // OneSignal requires importScripts() inside service worker, which needs classic format.
        // Module service workers break registration and offline support.
        rollupFormat: "iife",
        // CRITICAL: Output to 'OneSignalSDKWorker.js' to match OneSignal.init configuration
        // Otherwise OneSignal looks for a file that doesn't exist
        swDest: "dist/OneSignalSDKWorker.js",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}"],
        globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
        maximumFileSizeToCacheInBytes: 5e6,
        // Ensure index.html is always precached for navigation fallback
        dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./
      },
      workbox: {
        // Add navigation fallback for offline
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        // Runtime caching for external resources
        runtimeCaching: [
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
                // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Firebase scripts if loaded from CDN
            urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "firebase-sdk-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        /* when using generateSW the PWA plugin will switch to classic */
        type: "classic"
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    // Optimize for direct imports - no complex chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React separate for better caching
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Keep Firebase separate as it's large
          "firebase": ["firebase/app", "firebase/auth", "firebase/database"],
          // Keep UI components together
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-tooltip", "@radix-ui/react-select"]
        }
      }
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1e3,
    // Enable minification
    minify: "esbuild",
    // Target modern browsers for smaller bundles
    target: "es2020",
    // Optimize CSS
    cssMinify: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    exclude: ["firebase"]
  },
  // Enable esbuild for faster builds
  esbuild: {
    target: "es2020"
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxob3N0ZWwtbGVkZ2VyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxob3N0ZWwtbGVkZ2VyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Qcm9qZWN0cy9ob3N0ZWwtbGVkZ2VyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XHJcbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcclxuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSBcInVybFwiO1xyXG5cclxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcclxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpO1xyXG5cclxuLy8gUmVhZCBwYWNrYWdlIHZlcnNpb24gYW5kIGdpdCBoYXNoXHJcbmNvbnN0IHBrZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKFwiLi9wYWNrYWdlLmpzb25cIiwgXCJ1dGYtOFwiKSk7XHJcbmNvbnN0IGNvbW1pdEhhc2ggPSAoKCkgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICByZXR1cm4gZXhlY1N5bmMoXCJnaXQgcmV2LXBhcnNlIC0tc2hvcnQgSEVBRFwiKS50b1N0cmluZygpLnRyaW0oKTtcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICByZXR1cm4gXCJ1bmtub3duXCI7XHJcbiAgfVxyXG59KSgpO1xyXG5jb25zdCBidWlsZERhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdOyAvLyBZWVlZLU1NLUREXHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIGRlZmluZToge1xyXG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwa2cudmVyc2lvbiksXHJcbiAgICBfX0JVSUxEX0RBVEVfXzogSlNPTi5zdHJpbmdpZnkoYnVpbGREYXRlKSxcclxuICAgIF9fQ09NTUlUX0hBU0hfXzogSlNPTi5zdHJpbmdpZnkoY29tbWl0SGFzaCksXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJhdXRvVXBkYXRlXCIsXHJcbiAgICAgIHN0cmF0ZWdpZXM6IFwiaW5qZWN0TWFuaWZlc3RcIixcclxuICAgICAgc3JjRGlyOiBcInNyY1wiLFxyXG4gICAgICBmaWxlbmFtZTogXCJPbmVTaWduYWxTREtXb3JrZXIudHNcIixcclxuICAgICAgaW5jbHVkZUFzc2V0czogW1wib25seS1sb2dvLnBuZ1wiLCBcImFhcngtbG9nby53ZWJwXCIsIFwiaG9zdGVsLWxlZGdlci1sb2dvLndlYnBcIiwgXCJmaXJlYmFzZS1tZXNzYWdpbmctc3cuanNcIiwgXCJPbmVTaWduYWxTREsuc3cuanNcIl0sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgaWQ6IFwiL1wiLFxyXG4gICAgICAgIG5hbWU6IFwiSG9zdGVsIExlZGdlclwiLFxyXG4gICAgICAgIHNob3J0X25hbWU6IFwiTGVkZ2VyXCIsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IFwiU21hcnQgZXhwZW5zZSBzcGxpdHRpbmcgZm9yIGdyb3Vwcywgcm9vbW1hdGVzLCBhbmQgZnJpZW5kc1wiLFxyXG4gICAgICAgIHN0YXJ0X3VybDogXCIvP3R3YT10cnVlXCIsXHJcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxyXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiBcInBvcnRyYWl0LXByaW1hcnlcIixcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiNGOEY5RkFcIixcclxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjNGE2ODUwXCIsXHJcbiAgICAgICAgbGFuZzogXCJlblwiLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IFtcImZpbmFuY2VcIiwgXCJwcm9kdWN0aXZpdHlcIiwgXCJ1dGlsaXRpZXNcIl0sXHJcbiAgICAgICAgcHJlZmVyX3JlbGF0ZWRfYXBwbGljYXRpb25zOiBmYWxzZSxcclxuICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6IFwiL29ubHktbG9nby5wbmdcIixcclxuICAgICAgICAgICAgc2l6ZXM6IFwiMTkyeDE5MlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueVwiXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6IFwiL29ubHktbG9nby5wbmdcIixcclxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueVwiXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6IFwiL29ubHktbG9nby5wbmdcIixcclxuICAgICAgICAgICAgc2l6ZXM6IFwiMTkyeDE5MlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcIm1hc2thYmxlXCJcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvb25seS1sb2dvLnBuZ1wiLFxyXG4gICAgICAgICAgICBzaXplczogXCI1MTJ4NTEyXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6IFwibWFza2FibGVcIlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgc2hvcnRjdXRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiQWRkIEV4cGVuc2VcIixcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogXCJBZGQgRXhwZW5zZVwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJRdWlja2x5IGFkZCBhIG5ldyBleHBlbnNlXCIsXHJcbiAgICAgICAgICAgIHVybDogXCIvP2FjdGlvbj1hZGQtZXhwZW5zZVwiLFxyXG4gICAgICAgICAgICBpY29uczogW3sgc3JjOiBcIi9vbmx5LWxvZ28ucG5nXCIsIHNpemVzOiBcIjcwN3g3MDFcIiB9XVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZTogXCJWaWV3IEdyb3Vwc1wiLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiBcIkdyb3Vwc1wiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJWaWV3IHlvdXIgZXhwZW5zZSBncm91cHNcIixcclxuICAgICAgICAgICAgdXJsOiBcIi9ncm91cHNcIixcclxuICAgICAgICAgICAgaWNvbnM6IFt7IHNyYzogXCIvb25seS1sb2dvLnBuZ1wiLCBzaXplczogXCI3MDd4NzAxXCIgfV1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH0sXHJcbiAgICAgIGluamVjdE1hbmlmZXN0OiB7XHJcbiAgICAgICAgLy8gT25lU2lnbmFsIHJlcXVpcmVzIGltcG9ydFNjcmlwdHMoKSBpbnNpZGUgc2VydmljZSB3b3JrZXIsIHdoaWNoIG5lZWRzIGNsYXNzaWMgZm9ybWF0LlxyXG4gICAgICAgIC8vIE1vZHVsZSBzZXJ2aWNlIHdvcmtlcnMgYnJlYWsgcmVnaXN0cmF0aW9uIGFuZCBvZmZsaW5lIHN1cHBvcnQuXHJcbiAgICAgICAgcm9sbHVwRm9ybWF0OiAnaWlmZScsXHJcbiAgICAgICAgLy8gQ1JJVElDQUw6IE91dHB1dCB0byAnT25lU2lnbmFsU0RLV29ya2VyLmpzJyB0byBtYXRjaCBPbmVTaWduYWwuaW5pdCBjb25maWd1cmF0aW9uXHJcbiAgICAgICAgLy8gT3RoZXJ3aXNlIE9uZVNpZ25hbCBsb29rcyBmb3IgYSBmaWxlIHRoYXQgZG9lc24ndCBleGlzdFxyXG4gICAgICAgIHN3RGVzdDogJ2Rpc3QvT25lU2lnbmFsU0RLV29ya2VyLmpzJyxcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd2VicCxqcGcsanBlZyx3b2ZmLHdvZmYyfSddLFxyXG4gICAgICAgIGdsb2JJZ25vcmVzOiBbJyoqL25vZGVfbW9kdWxlcy8qKi8qJywgJ3N3LmpzJywgJ3dvcmtib3gtKi5qcyddLFxyXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiA1MDAwMDAwLFxyXG4gICAgICAgIC8vIEVuc3VyZSBpbmRleC5odG1sIGlzIGFsd2F5cyBwcmVjYWNoZWQgZm9yIG5hdmlnYXRpb24gZmFsbGJhY2tcclxuICAgICAgICBkb250Q2FjaGVCdXN0VVJMc01hdGNoaW5nOiAvXFwuWzAtOWEtZl17OH1cXC4vLFxyXG4gICAgICB9LFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgLy8gQWRkIG5hdmlnYXRpb24gZmFsbGJhY2sgZm9yIG9mZmxpbmVcclxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2tEZW55bGlzdDogWy9eXFwvYXBpLywgL15cXC9hdXRoL10sXHJcbiAgICAgICAgLy8gUnVudGltZSBjYWNoaW5nIGZvciBleHRlcm5hbCByZXNvdXJjZXNcclxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAvLyBDYWNoZSBHb29nbGUgRm9udHNcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdnb29nbGUtZm9udHMtY2FjaGUnLFxyXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcclxuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IC8vIDEgeWVhclxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcclxuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgLy8gQ2FjaGUgRmlyZWJhc2Ugc2NyaXB0cyBpZiBsb2FkZWQgZnJvbSBDRE5cclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC93d3dcXC5nc3RhdGljXFwuY29tXFwvZmlyZWJhc2Vqc1xcLy4qL2ksXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2ZpcmViYXNlLXNkay1jYWNoZScsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMjAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCAvLyAzMCBkYXlzXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAvLyBDYWNoZSBpbWFnZXNcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OnBuZ3xqcGd8anBlZ3xzdmd8Z2lmfHdlYnApJC9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdpbWFnZXMtY2FjaGUnLFxyXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcclxuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDYwLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzAgLy8gMzAgZGF5c1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfSxcclxuICAgICAgZGV2T3B0aW9uczoge1xyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgLyogd2hlbiB1c2luZyBnZW5lcmF0ZVNXIHRoZSBQV0EgcGx1Z2luIHdpbGwgc3dpdGNoIHRvIGNsYXNzaWMgKi9cclxuICAgICAgICB0eXBlOiAnY2xhc3NpYycsXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIC8vIE9wdGltaXplIGZvciBkaXJlY3QgaW1wb3J0cyAtIG5vIGNvbXBsZXggY2h1bmsgc3BsaXR0aW5nXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgLy8gS2VlcCBSZWFjdCBzZXBhcmF0ZSBmb3IgYmV0dGVyIGNhY2hpbmdcclxuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXHJcbiAgICAgICAgICAvLyBLZWVwIEZpcmViYXNlIHNlcGFyYXRlIGFzIGl0J3MgbGFyZ2VcclxuICAgICAgICAgICdmaXJlYmFzZSc6IFsnZmlyZWJhc2UvYXBwJywgJ2ZpcmViYXNlL2F1dGgnLCAnZmlyZWJhc2UvZGF0YWJhc2UnXSxcclxuICAgICAgICAgIC8vIEtlZXAgVUkgY29tcG9uZW50cyB0b2dldGhlclxyXG4gICAgICAgICAgJ3VpLXZlbmRvcic6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcCcsICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0J10sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICAvLyBSZWR1Y2UgY2h1bmsgc2l6ZSB3YXJuaW5ncyB0aHJlc2hvbGRcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgIC8vIEVuYWJsZSBtaW5pZmljYXRpb25cclxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxyXG4gICAgLy8gVGFyZ2V0IG1vZGVybiBicm93c2VycyBmb3Igc21hbGxlciBidW5kbGVzXHJcbiAgICB0YXJnZXQ6ICdlczIwMjAnLFxyXG4gICAgLy8gT3B0aW1pemUgQ1NTXHJcbiAgICBjc3NNaW5pZnk6IHRydWUsXHJcbiAgfSxcclxuICAvLyBPcHRpbWl6ZSBkZXBlbmRlbmNpZXNcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgIGV4Y2x1ZGU6IFsnZmlyZWJhc2UnXSxcclxuICB9LFxyXG4gIC8vIEVuYWJsZSBlc2J1aWxkIGZvciBmYXN0ZXIgYnVpbGRzXHJcbiAgZXNidWlsZDoge1xyXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVEsU0FBUyxvQkFBb0I7QUFDaFMsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxTQUFTLGVBQWU7QUFDeEIsU0FBUyxnQkFBZ0I7QUFDekIsT0FBTyxRQUFRO0FBQ2YsU0FBUyxxQkFBcUI7QUFQaUksSUFBTSwyQ0FBMkM7QUFTaE4sSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLEtBQUssUUFBUSxVQUFVO0FBR3pDLElBQU0sTUFBTSxLQUFLLE1BQU0sR0FBRyxhQUFhLGtCQUFrQixPQUFPLENBQUM7QUFDakUsSUFBTSxjQUFjLE1BQU07QUFD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
