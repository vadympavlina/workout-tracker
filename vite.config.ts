/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// `base: './'` makes every asset URL relative, so the build works from any
// GitHub Pages sub-path (https://<user>.github.io/<repo>/) without changes.
// Routing uses HashRouter, so page refreshes never hit the server's 404.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      // Firebase changes rarely: its own chunk stays cached across app releases.
      output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/database'] } },
    },
  },
});
