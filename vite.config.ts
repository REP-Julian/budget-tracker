/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  assetsInclude: ['**/*.onnx', '**/*.wasm'],
  build: {
    target: 'esnext',
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
