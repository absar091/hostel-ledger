// vite.config.ts
import { defineConfig } from "file:///C:/Projects/hostel-ledger/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Projects/hostel-ledger/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Projects/hostel-ledger/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Projects/hostel-ledger/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Projects\\hostel-ledger";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw-custom.ts",
      includeAssets: ["only-logo.png", "aarx-logo.webp", "hostel-ledger-logo.webp", "firebase-messaging-sw.js"],
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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}"],
        maximumFileSizeToCacheInBytes: 5e6
      },
      devOptions: {
        enabled: false,
        type: "module"
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxob3N0ZWwtbGVkZ2VyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxob3N0ZWwtbGVkZ2VyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Qcm9qZWN0cy9ob3N0ZWwtbGVkZ2VyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksIFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJhdXRvVXBkYXRlXCIsXHJcbiAgICAgIHN0cmF0ZWdpZXM6IFwiaW5qZWN0TWFuaWZlc3RcIixcclxuICAgICAgc3JjRGlyOiBcInNyY1wiLFxyXG4gICAgICBmaWxlbmFtZTogXCJzdy1jdXN0b20udHNcIixcclxuICAgICAgaW5jbHVkZUFzc2V0czogW1wib25seS1sb2dvLnBuZ1wiLCBcImFhcngtbG9nby53ZWJwXCIsIFwiaG9zdGVsLWxlZGdlci1sb2dvLndlYnBcIiwgXCJmaXJlYmFzZS1tZXNzYWdpbmctc3cuanNcIl0sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgaWQ6IFwiL1wiLFxyXG4gICAgICAgIG5hbWU6IFwiSG9zdGVsIExlZGdlclwiLFxyXG4gICAgICAgIHNob3J0X25hbWU6IFwiTGVkZ2VyXCIsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IFwiU21hcnQgZXhwZW5zZSBzcGxpdHRpbmcgZm9yIGdyb3Vwcywgcm9vbW1hdGVzLCBhbmQgZnJpZW5kc1wiLFxyXG4gICAgICAgIHN0YXJ0X3VybDogXCIvP3R3YT10cnVlXCIsXHJcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxyXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiBcInBvcnRyYWl0LXByaW1hcnlcIixcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiNGOEY5RkFcIixcclxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjNGE2ODUwXCIsXHJcbiAgICAgICAgbGFuZzogXCJlblwiLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IFtcImZpbmFuY2VcIiwgXCJwcm9kdWN0aXZpdHlcIiwgXCJ1dGlsaXRpZXNcIl0sXHJcbiAgICAgICAgcHJlZmVyX3JlbGF0ZWRfYXBwbGljYXRpb25zOiBmYWxzZSxcclxuICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgeyBcclxuICAgICAgICAgICAgc3JjOiBcIi9vbmx5LWxvZ28ucG5nXCIsIFxyXG4gICAgICAgICAgICBzaXplczogXCIxOTJ4MTkyXCIsIFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueVwiXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgeyBcclxuICAgICAgICAgICAgc3JjOiBcIi9vbmx5LWxvZ28ucG5nXCIsIFxyXG4gICAgICAgICAgICBzaXplczogXCI1MTJ4NTEyXCIsIFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueVwiXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgeyBcclxuICAgICAgICAgICAgc3JjOiBcIi9vbmx5LWxvZ28ucG5nXCIsIFxyXG4gICAgICAgICAgICBzaXplczogXCIxOTJ4MTkyXCIsIFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcIm1hc2thYmxlXCJcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7IFxyXG4gICAgICAgICAgICBzcmM6IFwiL29ubHktbG9nby5wbmdcIiwgXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjUxMng1MTJcIiwgXHJcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6IFwibWFza2FibGVcIlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgc2hvcnRjdXRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiQWRkIEV4cGVuc2VcIixcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogXCJBZGQgRXhwZW5zZVwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJRdWlja2x5IGFkZCBhIG5ldyBleHBlbnNlXCIsXHJcbiAgICAgICAgICAgIHVybDogXCIvP2FjdGlvbj1hZGQtZXhwZW5zZVwiLFxyXG4gICAgICAgICAgICBpY29uczogW3sgc3JjOiBcIi9vbmx5LWxvZ28ucG5nXCIsIHNpemVzOiBcIjcwN3g3MDFcIiB9XVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZTogXCJWaWV3IEdyb3Vwc1wiLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiBcIkdyb3Vwc1wiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJWaWV3IHlvdXIgZXhwZW5zZSBncm91cHNcIixcclxuICAgICAgICAgICAgdXJsOiBcIi9ncm91cHNcIixcclxuICAgICAgICAgICAgaWNvbnM6IFt7IHNyYzogXCIvb25seS1sb2dvLnBuZ1wiLCBzaXplczogXCI3MDd4NzAxXCIgfV1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH0sXHJcbiAgICAgIGluamVjdE1hbmlmZXN0OiB7XHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdlYnAsanBnLGpwZWd9J10sXHJcbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDUwMDAwMDBcclxuICAgICAgfSxcclxuICAgICAgZGV2T3B0aW9uczoge1xyXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgIHR5cGU6IFwibW9kdWxlXCJcclxuICAgICAgfVxyXG4gICAgfSlcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgLy8gT3B0aW1pemUgZm9yIGRpcmVjdCBpbXBvcnRzIC0gbm8gY29tcGxleCBjaHVuayBzcGxpdHRpbmdcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XHJcbiAgICAgICAgICAvLyBLZWVwIFJlYWN0IHNlcGFyYXRlIGZvciBiZXR0ZXIgY2FjaGluZ1xyXG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgIC8vIEtlZXAgRmlyZWJhc2Ugc2VwYXJhdGUgYXMgaXQncyBsYXJnZVxyXG4gICAgICAgICAgJ2ZpcmViYXNlJzogWydmaXJlYmFzZS9hcHAnLCAnZmlyZWJhc2UvYXV0aCcsICdmaXJlYmFzZS9kYXRhYmFzZSddLFxyXG4gICAgICAgICAgLy8gS2VlcCBVSSBjb21wb25lbnRzIHRvZ2V0aGVyXHJcbiAgICAgICAgICAndWktdmVuZG9yJzogWydAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ0ByYWRpeC11aS9yZWFjdC10b29sdGlwJywgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIC8vIFJlZHVjZSBjaHVuayBzaXplIHdhcm5pbmdzIHRocmVzaG9sZFxyXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxyXG4gICAgLy8gRW5hYmxlIG1pbmlmaWNhdGlvblxyXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsXHJcbiAgICAvLyBUYXJnZXQgbW9kZXJuIGJyb3dzZXJzIGZvciBzbWFsbGVyIGJ1bmRsZXNcclxuICAgIHRhcmdldDogJ2VzMjAyMCcsXHJcbiAgICAvLyBPcHRpbWl6ZSBDU1NcclxuICAgIGNzc01pbmlmeTogdHJ1ZSxcclxuICB9LFxyXG4gIC8vIE9wdGltaXplIGRlcGVuZGVuY2llc1xyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxyXG4gICAgZXhjbHVkZTogWydmaXJlYmFzZSddLFxyXG4gIH0sXHJcbiAgLy8gRW5hYmxlIGVzYnVpbGQgZm9yIGZhc3RlciBidWlsZHNcclxuICBlc2J1aWxkOiB7XHJcbiAgICB0YXJnZXQ6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
