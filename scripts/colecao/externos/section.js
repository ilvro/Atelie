import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lockPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'externos.lock.json');

/** The "Material de terceiros" section of docs/LICENCAS.md, one line per file, generated from the lock. */
export function licensesSection(entries = JSON.parse(fs.readFileSync(lockPath, 'utf8'))) {
  const rows = entries.map(e => `| \`${e.id}\` | ${e.name} | ${e.author} | ${e.license} | [página](${e.page}) | \`${(e.sha256 || '').slice(0, 12)}\` |`);
  return `## Material de terceiros (CC0 e domínio público)

Fotografias e mapas da coleção da casa vêm de arquivos em domínio público ou CC0. Cada arquivo é recortado, passado para preto e branco e reduzido para 900 px; o original, o autor e a licença ficam registrados em \`scripts/colecao/externos/externos.lock.json\` (com SHA-256).

| Id | Item | Autor | Licença | Origem | SHA-256 (início) |
|---|---|---|---|---|---|
${rows.join('\n')}
`;
}
