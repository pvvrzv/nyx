/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  
  build: {
    target: 'es2017',
    outDir: 'build',
    minify: false,
    lib: {
      entry: resolve(__dirname, './lib/index.ts'),
      name: 'nyx',
      fileName: 'index',
      formats: ['es'],
    },
  },
  resolve: {
    alias: {
      '@lib': resolve(import.meta.dirname, './lib'),
      '@build': resolve(import.meta.dirname, './build'),
    },
  },
  plugins: [dts({ rollupTypes: true })],
  test: {
    watch: false,
    globals: true,
    typecheck: {
      enabled: true,
      ignoreSourceErrors: true,
    },
  },
});
