import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTemplateCategory,
  cleanTemplateName,
  slug,
  scanBundleFiles,
  registerJitBundle,
} from '../src/data/bundle-scanner.js';
import { convertPsdJit } from '../src/editor/client-psd-converter.js';
import { openExpansionsDB } from '../src/data/expansion-installer.js';

test('cleanTemplateCategory: normaliza nomes de pastas de bundles', () => {
  assert.equal(
    cleanTemplateCategory('Bundle 18 - Bilhetes e Notas (PARTE 2)'),
    'Bilhetes e Notas'
  );
  assert.equal(
    cleanTemplateCategory('Bundle 6 - Documentos Policiais (PARTE 1)'),
    'Documentos Policiais'
  );
  assert.equal(
    cleanTemplateCategory('Bundle 3 - Cadernos, Diários e Livros'),
    'Cadernos, Diários e Livros'
  );
  assert.equal(
    cleanTemplateCategory('miniBundle 14 - Jornais [PARTE 2]'),
    'Jornais'
  );
  assert.equal(
    cleanTemplateCategory('Bundle 59 - Rework Documentos Policiais com Luz UV'),
    'Documentos Policiais com Luz UV'
  );
  assert.equal(cleanTemplateCategory(''), 'Documentos');
});

test('cleanTemplateName: extrai nome legível removendo índices', () => {
  assert.equal(cleanTemplateName('1- Bilhete Envelhecido.psd'), 'Bilhete Envelhecido');
  assert.equal(cleanTemplateName('10- Livro Variação 1.psd'), 'Livro Variação 1');
  assert.equal(cleanTemplateName('1.1- Testamento Alternativo.psd'), 'Testamento Alternativo');
  assert.equal(cleanTemplateName('4- Ficha Criminal.psb'), 'Ficha Criminal');
  assert.equal(cleanTemplateName('SemNumero.psd'), 'SemNumero');
});

test('slug: gera identificador limpo e consistente', () => {
  assert.equal(slug('Bilhetes e Notas!'), 'bilhetes-e-notas');
  assert.equal(slug('Cadernos, Diários & Livros'), 'cadernos-diarios-livros');
});

test('scanBundleFiles: reconhece PSDs, emparelha com prévias e associa fontes', async () => {
  const mockFiles = [
    {
      name: '1- Bilhete.psd',
      webkitRelativePath: 'Bundle 18 - Bilhetes e Notas/1- Bilhete.psd',
      size: 50000,
    },
    {
      name: '2- Carta.psd',
      webkitRelativePath: 'Bundle 18 - Bilhetes e Notas/2- Carta.psd',
      size: 60000,
    },
    {
      name: '1- Bilhete.png',
      webkitRelativePath: 'Bundle 18 - Bilhetes e Notas/Prévias/1- Bilhete.png',
      size: 4000,
    },
    {
      name: '2- Carta.jpg',
      webkitRelativePath: 'Bundle 18 - Bilhetes e Notas/Prévias/2- Carta.jpg',
      size: 5000,
    },
    {
      name: 'handwriting.ttf',
      webkitRelativePath: 'Bundle 18 - Bilhetes e Notas/Fontes/handwriting.ttf',
      size: 15000,
    },
  ];

  const result = await scanBundleFiles(mockFiles);
  assert.equal(result.bundles.length, 1);
  assert.equal(result.totalPsdCount, 2);
  assert.equal(result.totalPreviewCount, 2);

  const bundle = result.bundles[0];
  assert.equal(bundle.category, 'Bilhetes e Notas');
  assert.equal(bundle.name, 'Bundle 18 - Bilhetes e Notas');
  assert.equal(bundle.templates.length, 2);
  assert.equal(bundle.fontFiles.length, 1);

  // Template 1
  const tpl1 = bundle.templates[0];
  assert.equal(tpl1.name, 'Bilhete');
  assert.equal(tpl1.status, 'pending');
  assert.ok(tpl1.previewFile);
  assert.equal(tpl1.previewFile.name, '1- Bilhete.png');

  // Template 2
  const tpl2 = bundle.templates[1];
  assert.equal(tpl2.name, 'Carta');
  assert.equal(tpl2.status, 'pending');
  assert.ok(tpl2.previewFile);
  assert.equal(tpl2.previewFile.name, '2- Carta.jpg');
});

test('scanBundleFiles: lida com múltiplos bundles na mesma pasta pai', async () => {
  const mockFiles = [
    {
      name: '1- Bilhete.psd',
      webkitRelativePath: 'Acervo/Bundle 1 - Bilhetes/1- Bilhete.psd',
      size: 50000,
    },
    {
      name: '1- Bilhete.png',
      webkitRelativePath: 'Acervo/Bundle 1 - Bilhetes/Prévias/1- Bilhete.png',
      size: 4000,
    },
    {
      name: '1- Grimorio.psd',
      webkitRelativePath: 'Acervo/Bundle 24 - Documentos Medievais/1- Grimorio.psd',
      size: 80000,
    },
    {
      name: '1- Grimorio.png',
      webkitRelativePath: 'Acervo/Bundle 24 - Documentos Medievais/Prévias/1- Grimorio.png',
      size: 5000,
    },
  ];

  const result = await scanBundleFiles(mockFiles);
  assert.equal(result.bundles.length, 2);
  assert.equal(result.bundles[0].category, 'Bilhetes');
  assert.equal(result.bundles[1].category, 'Documentos Medievais');
});

test('convertPsdJit: converte PSD sob demanda extraindo camadas de texto e campos editáveis', async () => {
  const { writePsdBuffer } = await import('ag-psd');
  const psdBuf = writePsdBuffer({
    width: 250,
    height: 350,
    children: [
      {
        name: 'Título Principal',
        text: {
          text: 'Diário de Bordo',
          transform: [1, 0, 0, 1, 40, 50],
          style: { fontSize: 22 },
        },
      },
      {
        name: 'Data',
        text: {
          text: '12 de Outubro de 1923',
          transform: [1, 0, 0, 1, 40, 90],
          style: { fontSize: 14 },
        },
      },
    ],
  });

  const fakeFile = {
    name: '1- Diario.psd',
    arrayBuffer: async () => psdBuf.buffer,
  };

  const tplItem = {
    id: 'ac-jit-diario',
    name: 'Diário de Bordo',
    category: 'Cadernos, Diários e Livros',
    source: 'bundle-diarios',
    status: 'pending',
  };

  const result = await convertPsdJit({
    psdFile: fakeFile,
    templateItem: tplItem,
  });

  assert.equal(result.handout.name, 'Diário de Bordo');
  assert.equal(result.handout.category, 'Cadernos, Diários e Livros');
  assert.equal(result.handout.layers.length, 2);
  assert.equal(result.handout.fields.length, 2);
  assert.equal(result.handout.fields[0].value, 'Diário de Bordo');
  assert.equal(result.handout.fields[1].value, '12 de Outubro de 1923');
});
