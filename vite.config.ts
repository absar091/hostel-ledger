import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/firestore'],
          'ui-components': ['@radix-ui/react-dialog', '@radix-ui/react-tooltip', '@radix-ui/react-select'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge'],
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
    minify: true,
  },
}));
