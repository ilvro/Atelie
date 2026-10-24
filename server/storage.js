import { open, readFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, details);
  }
}

export const documentId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertId(id, pattern = documentId) {
  if (typeof id !== 'string' || !pattern.test(id)) {
    throw new HttpError(422, 'INVALID_ID', 'Identificador inválido.');
  }
  return id;
}

export function assertRevision(revision) {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new HttpError(422, 'INVALID_REVISION', 'Informe expectedRevision como inteiro positivo.');
  }
}

export function checkRevision(current, expected) {
  assertRevision(expected);
  if (current.revision !== expected) {
    throw new HttpError(409, 'REVISION_CONFLICT', 'O documento mudou no servidor. Recarregue antes de salvar.', {
      currentRevision: current.revision,
    });
  }
}

/** The temporary file and destination are on the same filesystem. */
export async function atomicWrite(file, content) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, file);
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export async function readJSON(file, missingMessage = 'Documento não encontrado.') {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw new HttpError(404, 'NOT_FOUND', missingMessage);
    throw error;
  }
}

