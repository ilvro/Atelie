import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('..', import.meta.url));
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}

function run(args, env = process.env) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env });
  children.add(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { children.delete(child); stop(code || 0); });
  return child;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

const free = port => new Promise(resolve => {
  const probe = createServer();
  probe.once('error', () => resolve(false));
  probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
});

let uiPort = Number(process.env.ATELIE_UI_PORT ?? 5174);
if (!process.env.ATELIE_UI_PORT) {
  const preferred = uiPort;
  while (uiPort < preferred + 20 && !await free(uiPort)) uiPort++;
  if (uiPort !== preferred) console.log(`Porta ${preferred} ocupada por outro programa; interface em http://127.0.0.1:${uiPort}`);
}

const env = { ...process.env, ATELIE_UI_PORT: String(uiPort) };
run(['--watch', 'server/index.js'], env);

const endpoint = `http://127.0.0.1:${process.env.ATELIE_PORT || 3011}/api/atelie/health`;
let ready = false;
for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(750) });
    if (response.ok) {
      ready = true;
      break;
    }
  } catch { /* Wait for the local server, not an external service. */ }
  await delay(150);
}

if (!stopping && ready) run(['node_modules/vite/bin/vite.js'], env);
else if (!stopping) {
  console.error('O servidor local não iniciou. Confira a porta e ATELIE_DATA_DIR.');
  stop(1);
}

