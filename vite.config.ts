import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The game ships as one self-contained index.html so it can run as a Claude artifact
// or be opened from disk, so everything (scripts, styles) is inlined at build time.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: 'dist', target: 'es2022' },
  test: { include: ['tests/**/*.test.ts'] },
});
