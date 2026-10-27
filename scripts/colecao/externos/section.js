import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lockPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'externos.lock.json');

/** The "Material de terceiros" section of docs/LICENCAS.md, one line per file, generated from the lock. */
export function licensesSection(entries = JSON.parse(fs.readFileSync(lockPath, 'utf8'))) {
  const rows = entries.map(e => `| \`${e.id}\` | ${e.name} | ${e.author} | ${e.license} | [página](${e.page}) | \`${(e.sha256 || '').slice(0, 12)}\` |`);
  return `## Material de terceiros (CC0 e domínio público)

Fotografias, mapas, papéis escaneados, superfícies e microtexturas da coleção da casa vêm de arquivos em domínio público ou CC0. Fotos e microtexturas são recortadas e passadas para preto e branco; papéis e superfícies mantêm a cor; todos são reduzidos e gravados em WebP; o original, o autor e a licença ficam registrados em \`scripts/colecao/externos/externos.lock.json\` (com SHA-256).

| Id | Item | Autor | Licença | Origem | SHA-256 (início) |
|---|---|---|---|---|---|
${rows.join('\n')}
`;
}
