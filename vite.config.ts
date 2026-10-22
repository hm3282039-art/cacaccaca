import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cacaccaca/',
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    minify: 'esbuild',
    sourcemap: true
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: false,
    allowedHosts: true,
    hmr: false
  }
});
