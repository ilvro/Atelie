import path from 'node:path';
import { mkdir, readdir, readFile, unlink, stat, rm } from 'node:fs/promises';
import express from 'express';
import { HttpError, assertId, assertRevision, checkRevision, atomicWrite, readJSON } from '../storage.js';
import { validateHandout } from '../../src/domain/handouts.js';
import { ValidationError } from '../../src/domain/errors.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function register(app, { dataDir }) {
  const handoutsDir = path.join(dataDir, 'handouts');
  const versionsDir = path.join(handoutsDir, 'versions');
  const trashDir = path.join(handoutsDir, 'trash');

  await mkdir(handoutsDir, { recursive: true });
  await mkdir(versionsDir, { recursive: true });
  await mkdir(trashDir, { recursive: true });

  // Middleware for JSON bodies
  const jsonParser = express.json({ limit: '10mb' });
  const rawPreviewParser = express.raw({ type: ['image/webp', 'image/png'], limit: '2mb' });

  // 1. List handouts
  app.get('/api/atelie/handouts', async (_req, res, next) => {
    try {
      const files = await readdir(handoutsDir);
      const items = [];

      for (const file of files) {
        if (!file.endsWith('.json') || file.includes('.preview.')) continue;
        const id = file.slice(0, -5);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) continue;

        try {
          const doc = JSON.parse(await readFile(path.join(handoutsDir, file), 'utf8'));
          let hasPreview = false;
          try {
            await stat(path.join(handoutsDir, `${id}.preview.webp`));
            hasPreview = true;
          } catch {
            try {
              await stat(path.join(handoutsDir, `${id}.preview.png`));
              hasPreview = true;
            } catch {
              hasPreview = false;
            }
          }

          items.push({
            id: doc.id,
            name: doc.name,
            category: doc.category || '',
            tags: doc.tags || [],
            folder: doc.folder ?? null,
            favorite: doc.favorite ?? false,
            revision: doc.revision,
            updatedAt: doc.updatedAt || new Date().toISOString(),
            preview: hasPreview,
          });
        } catch {
          // ignore broken file
        }
      }

      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // 2. Read handout
  app.get('/api/atelie/handouts/:id', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const file = path.join(handoutsDir, `${id}.json`);
      const doc = await readJSON(file, 'Documento não encontrado.');
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // 3. Create handout
  app.post('/api/atelie/handouts', jsonParser, async (req, res, next) => {
    try {
      const handout = req.body?.handout ?? req.body;
      if (!handout || typeof handout !== 'object') {
        throw new HttpError(422, 'INVALID_DOCUMENT', 'Corpo deve conter { handout }.');
      }

      try {
        validateHandout(handout);
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new HttpError(422, 'INVALID_DOCUMENT', err.message, { path: err.path });
        }
        throw err;
      }

      const id = assertId(handout.id);
      const file = path.join(handoutsDir, `${id}.json`);

      try {
        await stat(file);
        throw new HttpError(409, 'DOCUMENT_EXISTS', 'Documento com este ID já existe.');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }

      handout.revision = 1;
      handout.updatedAt = new Date().toISOString();

      await atomicWrite(file, JSON.stringify(handout, null, 2));
      res.status(201).json({ handout });
    } catch (err) {
      next(err);
    }
  });

  // 4. Update handout
  app.put('/api/atelie/handouts/:id', jsonParser, async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const { handout, expectedRevision } = req.body || {};

      if (!handout || typeof handout !== 'object') {
        throw new HttpError(422, 'INVALID_DOCUMENT', 'Corpo deve conter { handout, expectedRevision }.');
      }

      if (handout.id !== id) {
        throw new HttpError(422, 'INVALID_DOCUMENT', 'ID do documento não confere com a rota.');
      }

      assertRevision(expectedRevision);

      const file = path.join(handoutsDir, `${id}.json`);
      const current = await readJSON(file, 'Documento não encontrado.');
      checkRevision(current, expectedRevision);

      try {
        validateHandout(handout);
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new HttpError(422, 'INVALID_DOCUMENT', err.message, { path: err.path });
        }
        throw err;
      }

      // Save previous version
      const docVersionsDir = path.join(versionsDir, id);
      await mkdir(docVersionsDir, { recursive: true });
      await atomicWrite(path.join(docVersionsDir, `${current.revision}.json`), JSON.stringify(current, null, 2));

      // Prune versions beyond last 30
      try {
        const verFiles = await readdir(docVersionsDir);
        const revs = verFiles
          .map(f => parseInt(f.replace('.json', ''), 10))
          .filter(n => Number.isInteger(n) && n > 0)
          .sort((a, b) => a - b);

        if (revs.length > 30) {
          const toDelete = revs.slice(0, revs.length - 30);
          for (const rev of toDelete) {
            await unlink(path.join(docVersionsDir, `${rev}.json`)).catch(() => {});
          }
        }
      } catch {
        // ignore pruning failure
      }

      handout.revision = current.revision + 1;
      handout.updatedAt = new Date().toISOString();

      await atomicWrite(file, JSON.stringify(handout, null, 2));
      res.json({ handout });
    } catch (err) {
      next(err);
    }
  });

  // 5. List versions
  app.get('/api/atelie/handouts/:id/versions', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const docVersionsDir = path.join(versionsDir, id);
      let files = [];
      try {
        files = await readdir(docVersionsDir);
      } catch (err) {
        if (err.code === 'ENOENT') return res.json([]);
        throw err;
      }

      const list = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const vDoc = JSON.parse(await readFile(path.join(docVersionsDir, file), 'utf8'));
          list.push({
            revision: vDoc.revision,
            updatedAt: vDoc.updatedAt || new Date().toISOString(),
            name: vDoc.name || '',
          });
        } catch {
          // ignore broken version
        }
      }

      list.sort((a, b) => b.revision - a.revision);
      res.json(list);
    } catch (err) {
      next(err);
    }
  });

  // 6. Read specific version
  app.get('/api/atelie/handouts/:id/versions/:revision', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const rev = parseInt(req.params.revision, 10);
      if (!Number.isInteger(rev) || rev < 1) {
        throw new HttpError(422, 'INVALID_REVISION', 'Revisão inválida.');
      }

      const file = path.join(versionsDir, id, `${rev}.json`);
      const vDoc = await readJSON(file, 'Versão não encontrada.');
      res.json(vDoc);
    } catch (err) {
      next(err);
    }
  });

  // 7. Delete handout (move to trash)
  app.delete('/api/atelie/handouts/:id', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const file = path.join(handoutsDir, `${id}.json`);
      const current = await readJSON(file, 'Documento não encontrado.');

      if (req.query.expectedRevision) {
        const expected = parseInt(req.query.expectedRevision, 10);
        checkRevision(current, expected);
      }

      const deletedAt = new Date().toISOString();
      const trashFile = path.join(trashDir, `${id}.json`);

      await atomicWrite(trashFile, JSON.stringify({ ...current, deletedAt }, null, 2));
      await unlink(file);

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // 8. Trash routes
  app.get('/api/atelie/trash', async (_req, res, next) => {
    try {
      const files = await readdir(trashDir);
      const now = Date.now();
      const items = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(trashDir, file);
        try {
          const doc = JSON.parse(await readFile(filePath, 'utf8'));
          const deletedTime = doc.deletedAt ? new Date(doc.deletedAt).getTime() : now;

          if (now - deletedTime > THIRTY_DAYS_MS) {
            // Expired: auto purge
            await unlink(filePath).catch(() => {});
            const id = file.replace('.json', '');
            await rm(path.join(versionsDir, id), { recursive: true, force: true }).catch(() => {});
            continue;
          }

          items.push({
            id: doc.id,
            name: doc.name,
            category: doc.category || '',
            tags: doc.tags || [],
            deletedAt: doc.deletedAt,
            revision: doc.revision,
          });
        } catch {
          // ignore corrupted trash file
        }
      }

      items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/atelie/trash/:id/restore', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const trashFile = path.join(trashDir, `${id}.json`);
      const doc = await readJSON(trashFile, 'Documento não encontrado na lixeira.');

      delete doc.deletedAt;
      doc.updatedAt = new Date().toISOString();

      const targetFile = path.join(handoutsDir, `${id}.json`);
      await atomicWrite(targetFile, JSON.stringify(doc, null, 2));
      await unlink(trashFile);

      res.json({ handout: doc });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/atelie/trash/:id', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const trashFile = path.join(trashDir, `${id}.json`);

      await unlink(trashFile).catch((err) => {
        if (err.code !== 'ENOENT') throw err;
      });

      await rm(path.join(versionsDir, id), { recursive: true, force: true }).catch(() => {});
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // 9. Previews
  app.put('/api/atelie/handouts/:id/preview', rawPreviewParser, jsonParser, async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      let buffer = null;

      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (req.body?.dataUrl) {
        const matches = req.body.dataUrl.match(/^data:image\/(webp|png);base64,(.+)$/);
        if (matches) {
          buffer = Buffer.from(matches[2], 'base64');
        }
      }

      if (!buffer || buffer.length === 0) {
        throw new HttpError(422, 'INVALID_PREVIEW', 'Prévia inválida.');
      }

      if (buffer.length > 2 * 1024 * 1024) {
        throw new HttpError(413, 'BODY_TOO_LARGE', 'Prévia deve ter até 2 MB.');
      }

      const previewFile = path.join(handoutsDir, `${id}.preview.webp`);
      await atomicWrite(previewFile, buffer);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/atelie/handouts/:id/preview', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const webpFile = path.join(handoutsDir, `${id}.preview.webp`);
      const pngFile = path.join(handoutsDir, `${id}.preview.png`);

      let target = null;
      let mime = 'image/webp';
      try {
        await stat(webpFile);
        target = webpFile;
      } catch {
        try {
          await stat(pngFile);
          target = pngFile;
          mime = 'image/png';
        } catch {
          throw new HttpError(404, 'NOT_FOUND', 'Prévia não encontrada.');
        }
      }

      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.sendFile(target);
    } catch (err) {
      next(err);
    }
  });
}

