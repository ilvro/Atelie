import path from 'node:path';
import { mkdir, readdir, readFile, unlink, stat, rm, rename } from 'node:fs/promises';
import express from 'express';
import { HttpError, assertId, assertRevision, checkRevision, atomicWrite, readJSON } from '../storage.js';
import { readOnlyCors } from '../cors.js';
import { validateHandout } from '../../src/domain/handouts.js';
import { ValidationError } from '../../src/domain/errors.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function register(app, { dataDir, allowedOrigins = [] }) {
  const handoutsDir = path.join(dataDir, 'handouts');
  const versionsDir = path.join(handoutsDir, 'versions');
  const trashDir = path.join(handoutsDir, 'trash');

  await mkdir(handoutsDir, { recursive: true });
  await mkdir(versionsDir, { recursive: true });
  await mkdir(trashDir, { recursive: true });

  const cors = readOnlyCors(allowedOrigins);

  // Files that live next to a document (preview and bakes). They follow it to the trash and back.
  const SIDECARS = ['preview.webp', 'preview.png', 'bake-normal.png', 'bake-uv.png', 'bake.json'];
  const assetsTrashDir = id => path.join(trashDir, `${id}.assets`);

  async function moveSidecars(id, fromDir, toDir) {
    await mkdir(toDir, { recursive: true });
    for (const name of SIDECARS) {
      await rename(path.join(fromDir, `${id}.${name}`), path.join(toDir, `${id}.${name}`)).catch(err => {
        if (err.code !== 'ENOENT') throw err;
      });
    }
  }

  // bake.json is read-modify-write: serialize it per document so concurrent PUTs of 'normal' and 'uv' do not lose each other.
  const bakeLocks = new Map();
  function withBakeLock(id, task) {
    const run = (bakeLocks.get(id) ?? Promise.resolve()).catch(() => {}).then(task);
    const tail = run.catch(() => {});
    bakeLocks.set(id, tail);
    tail.then(() => {
      if (bakeLocks.get(id) === tail) bakeLocks.delete(id);
    });
    return run;
  }

  // Summaries are cached by file size and mtime, so listing does not parse every document again.
  const summaryCache = new Map();

  // Middleware for JSON and image bodies
  const jsonParser = express.json({ limit: '10mb' });
  const rawPreviewParser = express.raw({ type: ['image/webp', 'image/png'], limit: '2mb' });
  const rawBakeParser = express.raw({ type: ['image/png', 'application/octet-stream'], limit: '30mb' });

  // 1. List handouts
  app.options('/api/atelie/handouts', cors);
  app.get('/api/atelie/handouts', cors, async (_req, res, next) => {
    try {
      const files = await readdir(handoutsDir);
      const items = [];

      for (const file of files) {
        if (!file.endsWith('.json') || file.includes('.preview.') || file.endsWith('.bake.json')) continue;
        const id = file.slice(0, -5);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) continue;

        try {
          const full = path.join(handoutsDir, file);
          const info = await stat(full);
          const stamp = `${info.size}:${info.mtimeMs}`;
          let entry = summaryCache.get(id);
          if (!entry || entry.stamp !== stamp) {
            const doc = JSON.parse(await readFile(full, 'utf8'));
            entry = {
              stamp,
              summary: {
                id: doc.id,
                name: doc.name,
                category: doc.category || '',
                tags: doc.tags || [],
                folder: doc.folder ?? null,
                favorite: doc.favorite ?? false,
                revision: doc.revision,
                updatedAt: doc.updatedAt || new Date().toISOString(),
                hasUv: Array.isArray(doc.layers) && doc.layers.some(l => l.visible && l.light === 'uv'),
              },
            };
            summaryCache.set(id, entry);
          }

          let hasPreview = false;
          for (const ext of ['webp', 'png']) {
            try {
              await stat(path.join(handoutsDir, `${id}.preview.${ext}`));
              hasPreview = true;
              break;
            } catch {}
          }

          items.push({ ...entry.summary, preview: hasPreview });
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
      await withBakeLock(id, () => moveSidecars(id, handoutsDir, assetsTrashDir(id)));

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
            await rm(assetsTrashDir(id), { recursive: true, force: true }).catch(() => {});
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
      await withBakeLock(id, async () => {
        await moveSidecars(id, assetsTrashDir(id), handoutsDir);
        await rm(assetsTrashDir(id), { recursive: true, force: true }).catch(() => {});
      });

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
      await rm(assetsTrashDir(id), { recursive: true, force: true }).catch(() => {});
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

      const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const ext = isPng ? 'png' : 'webp';
      await atomicWrite(path.join(handoutsDir, `${id}.preview.${ext}`), buffer);
      await unlink(path.join(handoutsDir, `${id}.preview.${isPng ? 'webp' : 'png'}`)).catch(() => {});
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  app.options('/api/atelie/handouts/:id/preview', cors);
  app.get('/api/atelie/handouts/:id/preview', cors, async (req, res, next) => {
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

  // 10. Bakes
  app.put('/api/atelie/handouts/:id/bake', rawBakeParser, async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const light = req.query.light;
      if (light !== 'normal' && light !== 'uv') {
        throw new HttpError(422, 'INVALID_LIGHT', "Parâmetro 'light' deve ser 'normal' ou 'uv'.");
      }

      const rev = parseInt(req.query.revision, 10);
      assertRevision(rev);

      const file = path.join(handoutsDir, `${id}.json`);
      const current = await readJSON(file, 'Documento não encontrado.');
      checkRevision(current, rev);

      const buf = req.body;
      if (!Buffer.isBuffer(buf) || buf.length < 8) {
        throw new HttpError(422, 'INVALID_IMAGE', 'Corpo deve ser uma imagem PNG.');
      }
      if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
        throw new HttpError(422, 'INVALID_IMAGE', 'Formato deve ser PNG.');
      }

      await withBakeLock(id, async () => {
        await atomicWrite(path.join(handoutsDir, `${id}.bake-${light}.png`), buf);

        const infoFile = path.join(handoutsDir, `${id}.bake.json`);
        let bakeInfo = { normal: null, uv: null };
        try {
          bakeInfo = JSON.parse(await readFile(infoFile, 'utf8'));
        } catch {}
        bakeInfo[light] = rev;
        await atomicWrite(infoFile, JSON.stringify(bakeInfo, null, 2));
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/atelie/handouts/:id/bake', async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const light = req.query.light || 'uv';
      if (light !== 'normal' && light !== 'uv') {
        throw new HttpError(422, 'INVALID_LIGHT', "Parâmetro 'light' deve ser 'normal' ou 'uv'.");
      }

      if (req.query.revision) {
        const rev = parseInt(req.query.revision, 10);
        assertRevision(rev);
        const file = path.join(handoutsDir, `${id}.json`);
        const current = await readJSON(file, 'Documento não encontrado.');
        checkRevision(current, rev);
      }

      await withBakeLock(id, async () => {
        await unlink(path.join(handoutsDir, `${id}.bake-${light}.png`)).catch(err => {
          if (err.code !== 'ENOENT') throw err;
        });

        const infoFile = path.join(handoutsDir, `${id}.bake.json`);
        let bakeInfo = { normal: null, uv: null };
        try {
          bakeInfo = JSON.parse(await readFile(infoFile, 'utf8'));
        } catch {}
        bakeInfo[light] = null;
        await atomicWrite(infoFile, JSON.stringify(bakeInfo, null, 2));
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  app.options('/api/atelie/handouts/:id/bake', cors);
  app.get('/api/atelie/handouts/:id/bake', cors, async (req, res, next) => {
    try {
      const id = assertId(req.params.id);
      const light = req.query.light || 'normal';
      if (light !== 'normal' && light !== 'uv') {
        throw new HttpError(422, 'INVALID_LIGHT', "Parâmetro 'light' deve ser 'normal' ou 'uv'.");
      }

      const bakeFile = path.join(handoutsDir, `${id}.bake-${light}.png`);
      try {
        await stat(bakeFile);
      } catch {
        throw new HttpError(404, 'NOT_FOUND', 'Assado não encontrado.');
      }

      const infoFile = path.join(handoutsDir, `${id}.bake.json`);
      let rev = null;
      try {
        const info = JSON.parse(await readFile(infoFile, 'utf8'));
        rev = info[light];
      } catch {}

      if (!rev) {
        const doc = await readJSON(path.join(handoutsDir, `${id}.json`)).catch(() => null);
        rev = doc?.revision || 1;
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('X-Atelie-Revision', String(rev));
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(bakeFile);
    } catch (err) {
      next(err);
    }
  });
}

