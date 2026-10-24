import express from 'express';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { projectDir, defaultDataDir, defaultExpansionsDir, collectionDir, defaultAllowedOrigins } from './paths.js';
import { HttpError } from './storage.js';

export async function createApp({
  dataDir = defaultDataDir(),
  expansionsDir = defaultExpansionsDir(),
  collection = collectionDir,
  allowedOrigins = defaultAllowedOrigins(),
  distDir = path.join(projectDir, 'dist'),
} = {}) {
  await mkdir(dataDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');

  app.locals.dataDir = dataDir;
  app.locals.expansionsDir = expansionsDir;
  app.locals.collection = collection;
  app.locals.allowedOrigins = allowedOrigins;

  app.get('/api/atelie/health', (_req, res) => {
    res.json({ status: 'ok', app: 'atelie', contract: 1 });
  });

  // Unknown API paths must never resolve to index.html.
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API_NOT_FOUND', 'Rota de API não encontrada.')));

  app.use(express.static(distDir, { dotfiles: 'deny' }));

  app.get('*', (req, res, next) => {
    if (path.extname(req.path)) return next(new HttpError(404, 'NOT_FOUND', 'Arquivo não encontrado.'));
    res.sendFile(path.resolve(distDir, 'index.html'), (error) => {
      if (error) {
        next(error.code === 'ENOENT'
          ? new HttpError(404, 'BUILD_NOT_FOUND', 'Build não encontrado. Execute npm run build e npm start, ou use npm run dev.')
          : error);
      }
    });
  });

  app.use((error, _req, res, _next) => {
    if (res.headersSent) return res.end();
    const status = error.status ?? error.statusCode ?? 500;
    const code = error.code ?? (status === 422 ? 'INVALID_DOCUMENT' : status === 400 ? 'INVALID_JSON' : status === 413 ? 'BODY_TOO_LARGE' : 'SERVER_ERROR');
    const message = status >= 500 ? 'Não foi possível concluir a operação no disco.' : error.message;
    const body = { error: { code, message } };
    if (error.currentRevision !== undefined) body.currentRevision = error.currentRevision;
    if (error.issues) body.error.issues = error.issues;
    res.status(status).json(body);
  });

  return app;
}

