import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
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
        manualChunks: (id) => {
          // Group all node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Firebase
            if (id.includes('firebase')) {
              return 'firebase';
            }
            // UI components (Radix, etc.)
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) {
              return 'ui-vendor';
            }
            // Icons - group all Lucide icons together
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Other utilities
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('sonner')) {
              return 'utils-vendor';
            }
            // Everything else from node_modules
            return 'vendor';
          }
          
          // Group app pages together if they're small
          if (id.includes('/pages/') && !id.includes('Dashboard') && !id.includes('GroupDetail')) {
            return 'app-pages';
          }
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
