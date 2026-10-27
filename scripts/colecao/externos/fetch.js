/**
 * Material de terceiros (CC0 e domínio público) para a coleção da casa.
 *
 *   node scripts/colecao/externos/fetch.js           baixa (se faltar no cache), confere o SHA-256, trata e grava
 *   node scripts/colecao/externos/fetch.js --lock    como acima, e registra no lock o SHA-256 das entradas novas
 *   node scripts/colecao/externos/fetch.js --verify  só confere os hashes (cache e arquivos gravados); não baixa nada
 *
 * `externos.lock.json` é a lista de tudo o que entra: id, origem, autor, licença, recorte e SHA-256.
 * Os originais ficam em `.cache/externos/` (fora do git e de `public/`); o resultado vai para
 * `public/colecao/fotos/` e para `library.json`. O build normal não baixa nada.
 * `crop` são frações do original: { x, y, w, h } entre 0 e 1.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { licensesSection } from './section.js';

export { licensesSection };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const lockPath = path.join(root, 'scripts/colecao/externos/externos.lock.json');
const cacheDir = path.join(root, '.cache/externos');
const colecaoDir = path.join(root, 'public/colecao');
const fotosDir = path.join(colecaoDir, 'fotos');
const previewsDir = path.join(colecaoDir, 'previews');
const libraryPath = path.join(colecaoDir, 'library.json');

const LONG_SIDE = 900;
const QUALITY = 80;
const ALLOWED_LICENSE = /^(CC0|PD-1923|PD-US-expired|PD-old-70|PD-old-100|PD-old-auto-expired|PD-Art|PD-old)/;

export const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const exists = file => fs.access(file).then(() => true, () => false);

export async function readLock() {
  return JSON.parse(await fs.readFile(lockPath, 'utf8'));
}

/** Entry problems that make a file unacceptable, as a list of messages. */
export function entryProblems(entry) {
  const problems = [];
  for (const key of ['id', 'name', 'group', 'sourceUrl', 'page', 'author', 'license', 'licenseUrl']) {
    if (!entry[key]) problems.push(`${entry.id || '?'}: falta "${key}"`);
  }
  if (!/^casa-foto-[a-z0-9-]+$/.test(entry.id || '')) problems.push(`${entry.id}: id deve ser casa-foto-…`);
  if (!ALLOWED_LICENSE.test(entry.license || '')) problems.push(`${entry.id}: licença "${entry.license}" não é CC0 nem domínio público aceito`);
  if (/NC|personal use|royalty/i.test(entry.license || '')) problems.push(`${entry.id}: licença proibida`);
  if (entry.crop) {
    const { x, y, w, h } = entry.crop;
    if ([x, y, w, h].some(v => typeof v !== 'number' || v < 0 || v > 1) || x + w > 1.0001 || y + h > 1.0001) problems.push(`${entry.id}: recorte fora de 0 a 1`);
  }
  return problems;
}

async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, 1500 + attempt * 3000));
    const res = await fetch(url, { headers: { 'User-Agent': 'Atelie-Collection-Fetcher/1.0 (projeto local)' }, redirect: 'follow' });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`${url}: HTTP ${res.status}`);
  }
  throw new Error(`${url}: o servidor recusou várias vezes`);
}

/** Crop, neutral black and white, long side 900 px, WebP 80. */
export async function processPhoto(buffer, { crop, grayscale = true } = {}) {
  let image = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  if (crop) {
    image = sharp(await image.extract({
      left: Math.round(crop.x * meta.width),
      top: Math.round(crop.y * meta.height),
      width: Math.max(1, Math.round(crop.w * meta.width)),
      height: Math.max(1, Math.round(crop.h * meta.height)),
    }).toBuffer());
  }
  if (grayscale) image = image.grayscale().normalise({ lower: 1, upper: 99 });
  return image.resize({ width: LONG_SIDE, height: LONG_SIDE, fit: 'inside', withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer({ resolveWithObject: true });
}

const GROUP_TAGS = { Retratos: ['foto', 'retrato', 'pessoa'], Lugares: ['foto', 'lugar', 'cena'], Mapas: ['foto', 'mapa', 'antigo'] };

export async function run({ lock: recordNew = false, verify = false } = {}) {
  const entries = await readLock();
  const problems = entries.flatMap(entryProblems);
  if (problems.length) throw new Error(`Lock inválido:\n${problems.join('\n')}`);
  if (new Set(entries.map(e => e.id)).size !== entries.length) throw new Error('Lock com ids repetidos.');

  const bad = [];
  const items = [];
  await fs.mkdir(fotosDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  for (const entry of entries) {
    const cachePath = path.join(cacheDir, `${entry.id}.bin`);
    const outPath = path.join(fotosDir, `${entry.id}.webp`);

    if (verify) {
      if (await exists(cachePath)) {
        if (sha256(await fs.readFile(cachePath)) !== entry.sha256) bad.push(`${entry.id}: original no cache não confere com o lock`);
      }
      if (!(await exists(outPath))) bad.push(`${entry.id}: arquivo gravado ausente`);
      else if (sha256(await fs.readFile(outPath)) !== entry.outputSha256) bad.push(`${entry.id}: arquivo gravado não confere com o lock`);
      continue;
    }

    let original;
    if (await exists(cachePath)) {
      original = await fs.readFile(cachePath);
    } else {
      console.log(`[externos] baixando ${entry.id}…`);
      original = await download(entry.sourceUrl);
      await fs.writeFile(cachePath, original);
    }
    const hash = sha256(original);
    if (!entry.sha256) {
      if (!recordNew) throw new Error(`${entry.id}: sem SHA-256 no lock (rode com --lock para registrar)`);
      entry.sha256 = hash;
    } else if (entry.sha256 !== hash) {
      throw new Error(`${entry.id}: SHA-256 do original mudou (${hash})`);
    }

    const { data, info } = await processPhoto(original, { crop: entry.crop, grayscale: entry.grayscale !== false });
    await fs.writeFile(outPath, data);
    const outputHash = sha256(data);
    if (recordNew || !entry.outputSha256) entry.outputSha256 = outputHash;
    else if (entry.outputSha256 !== outputHash) console.warn(`[externos] ${entry.id}: o tratamento gerou bytes diferentes do lock (atualize com --lock)`);

    const preview = await sharp(data).resize({ width: 320, height: 320, fit: 'inside' }).webp({ quality: 70 }).toBuffer();
    await fs.writeFile(path.join(previewsDir, `${entry.id}.webp`), preview);

    items.push({
      id: entry.id,
      kind: 'element',
      name: entry.name,
      category: 'Fotografias',
      subcategory: entry.group,
      tags: GROUP_TAGS[entry.group] || ['foto'],
      file: `fotos/${entry.id}.webp`,
      preview: `previews/${entry.id}.webp`,
      width: info.width,
      height: info.height,
      license: entry.license,
    });
  }

  if (verify) {
    if (bad.length) throw new Error(bad.join('\n'));
    console.log(`[externos] ${entries.length} entradas conferidas.`);
    return;
  }

  if (recordNew) await fs.writeFile(lockPath, `${JSON.stringify(entries, null, 2)}\n`);

  const library = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
  library.items = [...library.items.filter(i => !i.id.startsWith('casa-foto-')), ...items];
  await fs.writeFile(libraryPath, JSON.stringify(library, null, 2), 'utf8');

  console.log('[externos] rode `node scripts/licenses.js` para atualizar docs/LICENCAS.md.');
  console.log(`[externos] ${items.length} fotografias na coleção.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run({ lock: process.argv.includes('--lock'), verify: process.argv.includes('--verify') }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
