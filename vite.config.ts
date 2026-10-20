/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Writes the build's file list and a content hash into dist/sw.js, so the
 * service worker precaches everything the app needs to start offline and each
 * deploy gets its own cache (old ones are removed on activation). Exercise
 * photos and the link-preview image are cached on demand instead.
 */
function pwaPrecache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'pulse-pwa-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((name) => {
          const full = join(dir, name);
          return statSync(full).isDirectory() ? walk(full) : [full];
        });
      const skip = (path: string) => path === 'sw.js' || path === 'og-image.png' || path.startsWith('exercises/') || path === '.nojekyll';
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        .filter((f) => !skip(f))
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const build = hash.digest('hex').slice(0, 12);
      const list = ['./', ...files.map((f) => `./${f}`)];
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace(/\/\*__BUILD__\*\/[^]*?\/\*__END__\*\//, JSON.stringify(build))
        .replace(/\/\*__PRECACHE__\*\/[^]*?\/\*__END__\*\//, JSON.stringify(list));
      if (!sw.includes(build)) throw new Error('pwaPrecache: placeholders not found in sw.js');
      writeFileSync(swPath, sw);
    },
  };
}

// `base: './'` makes every asset URL relative, so the build works from any
// GitHub Pages sub-path (https://<user>.github.io/<repo>/) without changes.
// Routing uses HashRouter, so page refreshes never hit the server's 404.
export default defineConfig({
  base: './',
  plugins: [react(), pwaPrecache()],
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
