/**
 * Compara lado a lado os modelos da casa com os do acervo privado (Arquivos Confidenciais), só para
 * conferir qualidade durante o desenvolvimento. A saída fica EXCLUSIVAMENTE em
 * data-private/expansoes/arquivos-confidenciais/reports/comparacao/ — nada daqui vai para o git.
 * Uso: node scripts/colecao/compare-private.js [slug-da-categoria ...]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CATEGORIES } from './modelos/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
export const acDir = path.join(projectRoot, 'data-private/expansoes/arquivos-confidenciais');
export const saidaDir = path.join(acDir, 'reports/comparacao');

/** Categoria da casa → categorias do acervo privado a comparar. */
export const CORRESPONDENCIA = {
  'Cartas e bilhetes': ['Cartas', 'Bilhetes e Notas'],
  'Jornal': ['Jornais'],
  'Polícia e investigação': ['Documentos Policiais', 'Documentos Forense'],
  'Médico': ['Documentos Médicos'],
  'Ocultismo': ['Marcas e Rituais', 'Grimórios e Páginas Estilizadas com Elementos'],
  'Fantasia': ['Documentos Medievais', 'Documentos Milenares'],
  'Cotidiano': ['Documentos de Transporte', 'Documentos Comerciais', 'Polaroides e Porta-Retratos'],
  'Tecnologia': ['Registros de Conversas (Celular)', 'E-mails de Computador', 'Computadores Antigos', 'E-mails de Celular'],
  'Forense e perícia': ['Documentos Forense', 'Documentos Policiais com Luz UV'],
  'Oficial e jurídico': ['Documentos Oficiais', 'Documentos Jurídicos', 'Documentos Bancários'],
  'Militar e governo': ['Documentos Militares', 'Carteira e Identidade de Investigador'],
  'Cadernos, diários e livros': ['Cadernos, Diários e Livros', 'Cadernos e Livros', 'Capas de Livros'],
  'Escola e juventude': ['Documentos Escolares'],
  'Ciência e laboratório': ['Documentos Científicos', 'Registros de Pesquisa Científica com Luz UV', 'Modelos de Blueprints'],
  'Fotografias e objetos': ['Polaroides e Fotografias', 'Pranchetas'],
  'Destruídos e composições': ['Documentos Destruídos', 'Documentos Molhados', 'Documentos Ensanguentados', 'Composições'],
};

/** Recusa qualquer caminho de saída fora da pasta privada de comparação. */
export function assertPrivateOutput(outPath) {
  const rel = path.relative(saidaDir, path.resolve(outPath));
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') {
    throw new Error(`compare-private só grava em ${path.relative(projectRoot, saidaDir)}/ (recusado: ${outPath})`);
  }
  return path.resolve(outPath);
}

async function thumb(file, w, h) {
  return sharp(file).resize(w, h, { fit: 'contain', background: '#2a2634' }).png().toBuffer();
}

export async function compareCategory(cat, { perSide = 5, thumbW = 220, thumbH = 280 } = {}) {
  const house = JSON.parse(await fs.readFile(path.join(colecaoDir, 'library.json'), 'utf8')).items.filter(i => i.kind === 'template' && i.category === cat.name);
  const ac = JSON.parse(await fs.readFile(path.join(acDir, 'library.json'), 'utf8')).items
    .filter(i => i.kind === 'template' && (CORRESPONDENCIA[cat.name] || []).includes(i.category));
  const rows = [
    house.slice(0, perSide).map(i => path.join(colecaoDir, i.preview)),
    ac.slice(0, perSide).map(i => path.join(acDir, i.preview)),
  ];
  const pad = 10, cols = perSide;
  const composites = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      composites.push({ input: await thumb(rows[r][c], thumbW, thumbH), left: pad + c * (thumbW + pad), top: pad + r * (thumbH + pad) });
    }
  }
  const out = assertPrivateOutput(path.join(saidaDir, `${cat.slug}.png`));
  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp({ create: { width: pad + cols * (thumbW + pad), height: pad + 2 * (thumbH + pad), channels: 4, background: '#13111a' } })
    .composite(composites).png().toFile(out);
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('compare-private.js')) {
  const want = process.argv.slice(2);
  for (const cat of CATEGORIES.filter(c => !want.length || want.includes(c.slug))) {
    console.log('[compare-private]', path.relative(projectRoot, await compareCategory(cat)));
  }
}
