import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'grapesjsDarkReader',
      fileName: (format) => (format === 'umd' ? 'grapesjs-darkreader.umd.cjs' : 'grapesjs-darkreader.js'),
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['grapesjs'],
      output: { exports: 'named', globals: { grapesjs: 'grapesjs' } },
    },
    sourcemap: true,
  },
});
