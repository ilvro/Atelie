import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const COMMIT = 'e7db6ca603fd4862010383ff17ffd6cc4ffac1c0';
const BASE_URL = `https://raw.githubusercontent.com/google/fonts/${COMMIT}`;
const API_BASE = 'https://api.github.com/repos/google/fonts/contents';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fontsJsonPath = path.join(rootDir, 'scripts/fonts/fonts.json');
const lockJsonPath = path.join(rootDir, 'scripts/fonts/fonts.lock.json');
const licencasMdPath = path.join(rootDir, 'public/colecao/fontes/LICENCAS.md');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function listFolderFiles(fontPath) {
  const url = `${API_BASE}/${fontPath}?ref=${COMMIT}`;
  console.log(`[fonts] Listando arquivos remotos via GitHub API: ${fontPath}...`);
  const headers = { 'User-Agent': 'Atelie-Font-Fetcher' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Falha ao listar pasta na GitHub API (${url}): ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`Resposta inesperada da GitHub API para ${fontPath}: ${JSON.stringify(data)}`);
  }

  // Keep all .ttf files and license files
  return data
    .filter(item => item.type === 'file' && (item.name.endsWith('.ttf') || item.name === 'OFL.txt' || item.name === 'LICENSE.txt'))
    .map(item => item.name);
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
      : path.join(rootDir, 'public/colecao/fontes', font.path);

    await mkdir(destDir, { recursive: true });

    let filesToFetch = [];

    if (font.files === '*') {
      const dirLockKey = `_dir:${font.path}`;
      if (Array.isArray(lock[dirLockKey])) {
        filesToFetch = [...lock[dirLockKey]];
      } else {
        filesToFetch = await listFolderFiles(font.path);
        lock[dirLockKey] = filesToFetch;
        updated = true;
      }
    } else {
      filesToFetch = [...font.files];
    }

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

      console.log(`[fonts] Baixando ${file} (${font.family})...`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Falha ao baixar ${url}: ${res.status} ${res.statusText}`);
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

  // Generate public/colecao/fontes/LICENCAS.md
  await generateLicensesDoc(fonts);
}

async function generateLicensesDoc(fonts) {
  const colecaoFonts = fonts.filter(f => f.use === 'colecao');
  if (colecaoFonts.length === 0) return;

  const lines = [
    '# Licenças das Fontes da Coleção da Casa',
    '',
    'Todas as fontes incluídas na coleção da casa do Ateliê possuem licença livre permissiva (SIL Open Font License 1.1 ou Apache License 2.0) e são auto-hospedadas.',
    `Origem: repositório oficial [google/fonts](https://github.com/google/fonts) no commit \`${COMMIT}\`.`,
    '',
    '| Família | Categoria | Licença | Pasta no Repositório Oficial |',
    '|---|---|---|---|',
  ];

  for (const f of colecaoFonts) {
    const lic = f.license === 'OFL.txt' ? 'OFL-1.1' : 'Apache-2.0';
    const repoUrl = `https://github.com/google/fonts/tree/${COMMIT}/${f.path}`;
    lines.push(`| ${f.family} | ${f.category || 'Geral'} | ${lic} | [\`${f.path}\`](${repoUrl}) |`);
  }

  lines.push('');
  await mkdir(path.dirname(licencasMdPath), { recursive: true });
  await writeFile(licencasMdPath, lines.join('\n'), 'utf8');
  console.log(`[fonts] Gerado ${licencasMdPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchFonts().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
