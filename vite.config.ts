import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build:
    mode === 'extension'
      ? {
          // content.ts is intentionally NOT listed here.
          // It is built separately by scripts/build-content.mjs using esbuild
          // in IIFE format because Chrome content scripts cannot use ES module
          // `import` statements.
          rollupOptions: {
            input: {
              background: path.resolve(__dirname, 'src/extension/background.ts'),
              popup: path.resolve(__dirname, 'index.html'),
            },
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: 'assets/[name]-[hash].js',
              // Stable CSS name so content.ts can reference it via chrome.runtime.getURL
              assetFileNames: (assetInfo) => {
                if (assetInfo.name?.endsWith('.css')) return 'assets/content.css';
                return 'assets/[name]-[hash][extname]';
              },
            },
          },
          outDir: 'dist',
          copyPublicDir: true,
        }
      : {
          outDir: 'dist-dev',
        },
  // Dev server for testing UI outside extension context
  server: {
    port: 3000,
    open: true,
  },
}));
