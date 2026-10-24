import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const COMMIT = 'e7db6ca603fd4862010383ff17ffd6cc4ffac1c0';
const BASE_URL = `https://raw.githubusercontent.com/google/fonts/${COMMIT}`;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fontsJsonPath = path.join(rootDir, 'scripts/fonts/fonts.json');
const lockJsonPath = path.join(rootDir, 'scripts/fonts/fonts.lock.json');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function fetchFonts() {
  const fonts = JSON.parse(await readFile(fontsJsonPath, 'utf8'));
  let lock = {};
  try {
    lock = JSON.parse(await readFile(lockJsonPath, 'utf8'));
  } catch {
    lock = {};
  }

  let updated = false;

  for (const font of fonts) {
    const slug = slugify(font.family);
    const destDir = font.use === 'ui'
      ? path.join(rootDir, 'src/ui/fonts', slug)
      : path.join(rootDir, 'public/colecao/fontes', slug);

    await mkdir(destDir, { recursive: true });

    const filesToFetch = [...font.files];
    if (font.license && !filesToFetch.includes(font.license)) {
      filesToFetch.push(font.license);
    }

    for (const file of filesToFetch) {
      const url = `${BASE_URL}/${font.path}/${file}`;
      const destPath = path.join(destDir, file);
      const lockKey = `${font.path}/${file}`;

      let currentHash = null;
      try {
        const existing = await readFile(destPath);
        currentHash = await sha256(existing);
      } catch {
        currentHash = null;
      }

      if (currentHash && lock[lockKey] && currentHash === lock[lockKey]) {
        continue;
      }

      console.log(`Downloading ${file} (${font.family})...`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const hash = await sha256(buffer);

      await writeFile(destPath, buffer);
      lock[lockKey] = hash;
      updated = true;
    }
  }

  if (updated || !(await readFile(lockJsonPath).catch(() => false))) {
    await writeFile(lockJsonPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchFonts().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

