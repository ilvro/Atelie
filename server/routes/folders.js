import path from 'node:path';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { HttpError, checkRevision, atomicWrite } from '../storage.js';
import { validateFolders } from '../../src/domain/folders.js';
import { ValidationError } from '../../src/domain/errors.js';

export async function register(app, { dataDir }) {
  const foldersFile = path.join(dataDir, 'folders.json');
  const jsonParser = express.json({ limit: '2mb' });

  async function loadFoldersState() {
    try {
      const raw = await readFile(foldersFile, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && Array.isArray(data.folders)) {
        return {
          schema: data.schema || 1,
          revision: Number.isSafeInteger(data.revision) ? data.revision : 1,
          updatedAt: data.updatedAt || new Date().toISOString(),
          folders: data.folders,
        };
      }
    } catch {
      // Missing or corrupt: initialize
    }

    const initial = {
      schema: 1,
      revision: 1,
      updatedAt: new Date().toISOString(),
      folders: [],
    };
    await atomicWrite(foldersFile, JSON.stringify(initial, null, 2));
    return initial;
  }

  // 1. GET /api/atelie/folders
  app.get('/api/atelie/folders', async (_req, res, next) => {
    try {
      const state = await loadFoldersState();
      res.json({
        revision: state.revision,
        folders: state.folders,
        updatedAt: state.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // 2. PUT /api/atelie/folders
  app.put('/api/atelie/folders', jsonParser, async (req, res, next) => {
    try {
      const state = await loadFoldersState();
      const body = req.body || {};
      const expectedRevision = Number(body.expectedRevision);

      checkRevision({ revision: state.revision }, expectedRevision);

      const folders = body.folders;
      if (!Array.isArray(folders)) {
        throw new HttpError(422, 'INVALID_FOLDERS', 'O campo folders deve ser um array.');
      }

      try {
        validateFolders(folders);
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new HttpError(422, 'INVALID_FOLDERS', err.message, { path: err.path });
        }
        throw err;
      }

      const nextRevision = state.revision + 1;
      const nextState = {
        schema: 1,
        revision: nextRevision,
        updatedAt: new Date().toISOString(),
        folders,
      };

      await atomicWrite(foldersFile, JSON.stringify(nextState, null, 2));

      res.json({
        revision: nextState.revision,
        folders: nextState.folders,
        updatedAt: nextState.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });
}

