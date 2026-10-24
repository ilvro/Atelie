import { createApp } from './app.js';
import { defaultDataDir } from './paths.js';

const port = Number(process.env.ATELIE_PORT ?? 3011);
const host = process.env.ATELIE_HOST ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('ATELIE_PORT deve estar entre 1 e 65535.');
}

const app = await createApp({ dataDir: defaultDataDir() });
const server = app.listen(port, host, () => console.log(`Ateliê em http://${host}:${port} — dados em ${app.locals.dataDir}`));
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

