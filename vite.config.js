import { defineConfig } from 'vite';

const frontendPort = Number(process.env.ATELIE_UI_PORT ?? 5174);
if (!Number.isInteger(frontendPort) || frontendPort < 1 || frontendPort > 65535) {
  throw new Error('ATELIE_UI_PORT deve estar entre 1 e 65535.');
}

// `npm run dev:mesa`: o Ateliê sob o mesa-dev (Atlas/scripts/mesa-dev.ts), numa origem só com os outros aplicativos, como no GitHub Pages.
// Lá não há servidor de API, então ele guarda no navegador. O `define` abaixo não vale no `dev` do Vite (o código lê `import.meta?.env`),
// por isso o modo vai pelo gancho `window.__ATELIE_STORAGE`, que `detectStorageMode` já respeita.
const sobMesaDev = process.env.ATELIE_MESA === '1';
const armazenamentoNoNavegador = {
  name: 'atelie-armazenamento-no-navegador',
  apply: 'serve',
  transformIndexHtml: () => [{ tag: 'script', children: "window.__ATELIE_STORAGE = 'browser';", injectTo: 'head-prepend' }],
};

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: sobMesaDev ? [armazenamentoNoNavegador] : [],
  define: {
    'import.meta.env.VITE_ATELIE_STORAGE': JSON.stringify(mode === 'pages' ? 'browser' : (process.env.VITE_ATELIE_STORAGE || 'server')),
  },
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
    outDir: mode === 'pages' ? 'dist-pages' : 'dist',
  },
}));

