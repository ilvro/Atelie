import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateExpansionManifests,
  calculateExpansionSize,
  checkStorageSpace,
  openExpansionsDB,
  installExpansion,
  removeExpansion,
  listInstalledExpansions,
  getExpansionFile,
  getExpansionItems,
  readFolderFromFileList,
} from '../src/data/expansion-installer.js';

test('validateExpansionManifests: aceita manifesto válido e normaliza campos', () => {
  const exp = {
    id: 'Arquivos-Confidenciais',
    name: '  Arquivos Confidenciais  ',
    description: 'Acervo pessoal',
    license: 'Uso pessoal',
  };
  const lib = {
    items: [
      { id: 'ac-item-1', name: 'Item 1', kind: 'element' },
      { id: 'ac-item-2', name: 'Item 2', kind: 'template' },
    ],
  };

  const validated = validateExpansionManifests(exp, lib);
  assert.equal(validated.id, 'arquivos-confidenciais');
  assert.equal(validated.name, 'Arquivos Confidenciais');
  assert.equal(validated.description, 'Acervo pessoal');
  assert.equal(validated.items.length, 2);
});

test('validateExpansionManifests: rejeita manifestos inválidos ou incompletos', () => {
  assert.throws(() => validateExpansionManifests(null, {}), /expansion\.json inválido/);
  assert.throws(() => validateExpansionManifests({}, {}), /sem id válido/);
  assert.throws(() => validateExpansionManifests({ id: 'inv@lid!' }, {}), /sem id válido/);
  assert.throws(() => validateExpansionManifests({ id: 'valid' }, {}), /sem nome válido/);
  assert.throws(() => validateExpansionManifests({ id: 'valid', name: 'Exp' }, null), /library\.json inválido/);
  assert.throws(() => validateExpansionManifests({ id: 'valid', name: 'Exp' }, { items: 'not an array' }), /library\.json inválido/);
});

test('calculateExpansionSize: calcula soma exata de bytes dos arquivos', () => {
  const files = new Map([
    ['expansion.json', { size: 100 }],
    ['library.json', { size: 500 }],
    ['elements/img.webp', { size: 12000 }],
  ]);
  assert.equal(calculateExpansionSize(files), 12600);
  assert.equal(calculateExpansionSize(new Map()), 0);
});

test('checkStorageSpace: exige pelo menos 1,5x o tamanho livre em disco', () => {
  const size = 10_000_000; // 10 MB
  const needed = 15_000_000; // 15 MB

  // Quota 100 MB, usado 80 MB -> sobra 20 MB (>= 15 MB -> OK)
  const okEstimate = { quota: 100_000_000, usage: 80_000_000 };
  const resOk = checkStorageSpace(size, okEstimate);
  assert.equal(resOk.ok, true);
  assert.equal(resOk.needed, needed);

  // Quota 100 MB, usado 88 MB -> sobra 12 MB (< 15 MB -> NOT OK)
  const lowEstimate = { quota: 100_000_000, usage: 88_000_000 };
  const resLow = checkStorageSpace(size, lowEstimate);
  assert.equal(resLow.ok, false);
  assert.equal(resLow.available, 12_000_000);
});

test('IndexedDB: instalação, listagem de itens, recuperação de arquivos e remoção', async () => {
  // In-memory mock IndexedDB factory supporting compound array keys and cursors
  const storesMap = {
    expansions: new Map(),
    items: new Map(),
    files: new Map(),
  };

  const serializeKey = (key) => (Array.isArray(key) ? JSON.stringify(key) : String(key));

  const mockFactory = {
    open(name, version) {
      const openReq = {
        result: {
          objectStoreNames: { contains: () => true },
          transaction(storeNames, mode) {
            let pendingRequests = 0;
            const tx = {
              oncomplete: null,
              onerror: null,
              objectStore(sName) {
                const map = storesMap[sName];
                return {
                  put(val, key) {
                    pendingRequests++;
                    const k = key !== undefined ? key : (val.id !== undefined ? val.id : null);
                    map.set(serializeKey(k), val);
                    setTimeout(() => {
                      pendingRequests--;
                      checkComplete();
                    }, 1);
                    return {};
                  },
                  get(key) {
                    pendingRequests++;
                    const req = {};
                    setTimeout(() => {
                      req.result = map.get(serializeKey(key)) || null;
                      req.onsuccess?.();
                      pendingRequests--;
                      checkComplete();
                    }, 1);
                    return req;
                  },
                  delete(key) {
                    map.delete(serializeKey(key));
                    return {};
                  },
                  getAll() {
                    pendingRequests++;
                    const req = {};
                    setTimeout(() => {
                      req.result = Array.from(map.values());
                      req.onsuccess?.();
                      pendingRequests--;
                      checkComplete();
                    }, 1);
                    return req;
                  },
                  openCursor() {
                    pendingRequests++;
                    const req = {};
                    const entries = Array.from(map.entries());
                    let index = 0;
                    function step() {
                      if (index < entries.length) {
                        const [kStr, val] = entries[index];
                        let key;
                        try { key = JSON.parse(kStr); } catch { key = kStr; }
                        const cursor = {
                          key,
                          value: val,
                          delete() {
                            map.delete(kStr);
                          },
                          continue() {
                            index++;
                            step();
                          },
                        };
                        req.result = cursor;
                        req.onsuccess?.({ target: req });
                      } else {
                        req.result = null;
                        req.onsuccess?.({ target: req });
                        pendingRequests--;
                        checkComplete();
                      }
                    }
                    setTimeout(step, 1);
                    return req;
                  },
                };
              },
            };

            function checkComplete() {
              if (pendingRequests <= 0) {
                setTimeout(() => tx.oncomplete?.(), 2);
              }
            }

            // In case no requests are made or they are synchronous
            setTimeout(checkComplete, 2);

            return tx;
          },
          close() {},
        },
      };
      setTimeout(() => openReq.onsuccess?.(), 1);
      return openReq;
    },
  };

  const db = await openExpansionsDB('atelie-expansions-test', mockFactory);

  const expInfo = {
    id: 'ac-teste',
    name: 'Arquivos de Teste',
    description: 'Expansão de teste',
  };
  const libInfo = {
    items: [
      { id: 'ac-item-alpha', name: 'Item Alpha', kind: 'element', file: 'elements/alpha.png' },
      { id: 'ac-tpl-beta', name: 'Modelo Beta', kind: 'template', file: 'templates/beta.json' },
    ],
  };
  const filesMap = new Map([
    ['elements/alpha.png', { name: 'alpha.png', size: 1024, type: 'image/png' }],
    ['templates/beta.json', { name: 'beta.json', size: 512, type: 'application/json' }],
  ]);

  // 1. Instalar
  const installed = await installExpansion(db, expInfo, libInfo, filesMap);
  assert.equal(installed.id, 'ac-teste');
  assert.equal(installed.itemCount, 2);
  assert.equal(installed.totalBytes, 1536);

  // 2. Listar expansões instaladas
  const list = await listInstalledExpansions(db);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'ac-teste');
  assert.equal(list[0].itemCount, 2);

  // 3. Listar itens instalados
  const items = await getExpansionItems(db);
  assert.equal(items.length, 2);
  assert.equal(items[0].source, 'ac-teste');

  // 4. Buscar arquivo
  const file = await getExpansionFile(db, 'ac-teste', 'elements/alpha.png');
  assert.ok(file);
  assert.equal(file.size, 1024);

  // 5. Remover expansão
  await removeExpansion(db, 'ac-teste');
  const listAfter = await listInstalledExpansions(db);
  assert.equal(listAfter.length, 0);
  const itemsAfter = await getExpansionItems(db);
  assert.equal(itemsAfter.length, 0);
  const fileAfter = await getExpansionFile(db, 'ac-teste', 'elements/alpha.png');
  assert.equal(fileAfter, null);
});

test('readFolderFromFileList: detecta expansion.json em subpasta e rebaixa caminhos', async () => {
  const fakeFiles = [
    {
      name: 'expansion.json',
      webkitRelativePath: 'pacote-completo/expansoes/minha-expansao/expansion.json',
      text: async () => JSON.stringify({ id: 'minha-expansao', name: 'Minha Expansão' }),
      size: 100,
    },
    {
      name: 'library.json',
      webkitRelativePath: 'pacote-completo/expansoes/minha-expansao/library.json',
      text: async () => JSON.stringify({ items: [{ id: 'item-1', name: 'Item 1' }] }),
      size: 100,
    },
    {
      name: 'item1.png',
      webkitRelativePath: 'pacote-completo/expansoes/minha-expansao/elements/item1.png',
      text: async () => '',
      size: 500,
    },
  ];

  const result = await readFolderFromFileList(fakeFiles);
  assert.equal(result.expansionJson.id, 'minha-expansao');
  assert.equal(result.libraryJson.items.length, 1);
  assert.ok(result.filesMap.has('elements/item1.png'), 'caminho deve ser relativo à raiz da expansão');
  assert.ok(result.filesMap.has('item1.png'));
});
