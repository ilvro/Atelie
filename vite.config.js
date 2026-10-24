import { defineConfig } from 'vite';

const frontendPort = Number(process.env.ATELIE_UI_PORT ?? 5174);
if (!Number.isInteger(frontendPort) || frontendPort < 1 || frontendPort > 65535) {
  throw new Error('ATELIE_UI_PORT deve estar entre 1 e 65535.');
}

export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: frontendPort,
    strictPort: false,
    proxy: {
      '/api': `http://127.0.0.1:${process.env.ATELIE_PORT || 3011}`,
    },
    watch: {
      ignored: ['**/data/**'],
    },
  },
  build: {
    outDir: 'dist',
  },
});

