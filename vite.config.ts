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
          rollupOptions: {
            input: {
              content: path.resolve(__dirname, 'src/extension/content.ts'),
              background: path.resolve(__dirname, 'src/extension/background.ts'),
              popup: path.resolve(__dirname, 'index.html'),
            },
            output: {
              entryFileNames: '[name].js',
            },
          },
          outDir: 'dist',
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
