import path from 'node:path';
import { mkdir, unlink, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import express from 'express';
import { HttpError, assertUploadId, atomicWrite, readJSON } from '../storage.js';

export function parseImageHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
    throw new HttpError(422, 'INVALID_IMAGE', 'Arquivo de imagem inválido ou muito curto.');
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (buffer.length < 24) {
      throw new HttpError(422, 'INVALID_IMAGE', 'Cabeçalho PNG incompleto.');
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { mime: 'image/png', ext: '.png', width, height };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (offset + 9 > buffer.length) break;
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { mime: 'image/jpeg', ext: '.jpg', width, height };
      }
      if (marker === 0xd9 || marker === 0xda) {
        break;
      }
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
    throw new HttpError(422, 'INVALID_IMAGE', 'Não foi possível ler as dimensões da imagem JPEG.');
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType === 'VP8 ') {
      if (buffer.length >= 30) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { mime: 'image/webp', ext: '.webp', width, height };
      }
    } else if (chunkType === 'VP8L') {
      if (buffer.length >= 25 && buffer[20] === 0x2f) {
        const b1 = buffer[21];
        const b2 = buffer[22];
        const b3 = buffer[23];
        const b4 = buffer[24];
        const width = (b1 | ((b2 & 0x3f) << 8)) + 1;
        const height = (((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10))) + 1;
        return { mime: 'image/webp', ext: '.webp', width, height };
      }
    } else if (chunkType === 'VP8X') {
      if (buffer.length >= 30) {
        const width = (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
        const height = (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
        return { mime: 'image/webp', ext: '.webp', width, height };
      }
    }
    throw new HttpError(422, 'INVALID_IMAGE', 'Formato WebP desconhecido ou incompleto.');
  }

  throw new HttpError(422, 'INVALID_IMAGE', 'Formato de imagem não suportado (apenas PNG, JPEG e WebP).');
}

export async function register(app, { dataDir }) {
  const uploadsDir = path.join(dataDir, 'uploads');
  const indexFile = path.join(uploadsDir, 'index.json');

  await mkdir(uploadsDir, { recursive: true });

  const rawImageParser = express.raw({
    type: ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'],
    limit: '25mb',
  });

  async function getIndex() {
    try {
      const data = await readJSON(indexFile);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async function saveIndex(items) {
    await atomicWrite(indexFile, JSON.stringify(items, null, 2));
  }

  // 1. Upload file
  app.post('/api/atelie/uploads', rawImageParser, async (req, res, next) => {
    try {
      const buffer = req.body;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new HttpError(422, 'INVALID_IMAGE', 'Nenhum dado de imagem recebido.');
      }

      const { mime, ext, width, height } = parseImageHeader(buffer);
      const id = 'up-' + randomBytes(6).toString('hex');
      const name = (req.query.name ? String(req.query.name) : 'imagem').slice(0, 120);
      const createdAt = new Date().toISOString();

      const record = {
        id,
        name,
        mime,
        size: buffer.length,
        width,
        height,
        createdAt,
      };

      const filePath = path.join(uploadsDir, `${id}${ext}`);
      await atomicWrite(filePath, buffer);

      const items = await getIndex();
      items.unshift(record);
      await saveIndex(items);

      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  });

  // 2. List uploads
  app.get('/api/atelie/uploads', async (_req, res, next) => {
    try {
      const items = await getIndex();
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // 3. Serve upload file
  app.get('/api/atelie/uploads/:id/file', async (req, res, next) => {
    try {
      const id = assertUploadId(req.params.id);
      const items = await getIndex();
      const item = items.find(i => i.id === id);
      if (!item) {
        throw new HttpError(404, 'NOT_FOUND', 'Upload não encontrado.');
      }

      const ext = item.mime === 'image/jpeg' ? '.jpg' : item.mime === 'image/webp' ? '.webp' : '.png';
      const filePath = path.join(uploadsDir, `${id}${ext}`);

      res.setHeader('Content-Type', item.mime);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(filePath, err => {
        if (err) next(err.code === 'ENOENT' ? new HttpError(404, 'NOT_FOUND', 'Arquivo não encontrado.') : err);
      });
    } catch (err) {
      next(err);
    }
  });

  // 4. Delete upload
  app.delete('/api/atelie/uploads/:id', async (req, res, next) => {
    try {
      const id = assertUploadId(req.params.id);
      const items = await getIndex();
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        const item = items[idx];
        const ext = item.mime === 'image/jpeg' ? '.jpg' : item.mime === 'image/webp' ? '.webp' : '.png';
        const filePath = path.join(uploadsDir, `${id}${ext}`);
        await unlink(filePath).catch(() => {});
        items.splice(idx, 1);
        await saveIndex(items);
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
}

