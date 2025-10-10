import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()] as any,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers for better optimization
    target: 'es2015',

    // Output directory
    outDir: 'dist',

    // Generate sourcemaps for production debugging
    sourcemap: true,

    // Chunk size warning limit (500 KB)
    chunkSizeWarningLimit: 500,

    // Enable minification
    minify: 'esbuild',

    // Rollup options for optimal chunking
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy
        manualChunks: {
          // React core and related libraries
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom',
          ],

          // React Query
          'react-query': [
            '@tanstack/react-query',
          ],

          // Chart library (large dependency)
          'charts': [
            'recharts',
          ],

          // UI component libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
          ],

          // Utility libraries
          'utils': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'date-fns',
          ],

          // Icons
          'icons': [
            'lucide-react',
          ],

          // File upload
          'file-upload': [
            'react-dropzone',
          ],

          // Forms
          'forms': [
            'react-hook-form',
          ],
        },

        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },

        // Chunk file naming
        chunkFileNames: 'assets/js/[name]-[hash].js',

        // Entry file naming
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Asset inline limit (4KB)
    assetsInlineLimit: 4096,
  },

  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },

  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: false,
    open: true,
  },
})
