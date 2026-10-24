import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHandout,
  validateHandout,
  imageLayer,
  textLayer,
  shapeLayer,
  adjustLayer,
  effectLayer,
  addLayer,
  updateLayer,
  removeLayer,
  moveLayer,
  duplicateLayer,
  setField,
  fillFields,
  layerAt,
  libraryRefs,
  canvasOperation,
} from '../src/domain/handouts.js';
import { ValidationError } from '../src/domain/errors.js';

test('createHandout creates a valid default A4 handout with a Paper layer', () => {
  const doc = createHandout();
  assert.equal(doc.page.width, 1240);
  assert.equal(doc.page.height, 1754);
  assert.equal(doc.layers.length, 1);
  assert.equal(doc.layers[0].name, 'Papel');
  assert.equal(doc.layers[0].kind, 'shape');

  assert.doesNotThrow(() => validateHandout(doc));
});

test('layer factories produce valid layers with exactly their own type block', () => {
  const kinds = [
    ['image', imageLayer()],
    ['text', textLayer()],
    ['shape', shapeLayer()],
    ['adjust', adjustLayer()],
    ['effect', effectLayer()],
  ];

  const allBlocks = ['image', 'text', 'shape', 'adjust', 'effect'];

  for (const [kind, layer] of kinds) {
    assert.equal(layer.kind, kind);
    assert.ok(layer[kind] && typeof layer[kind] === 'object', `Layer must have block ${kind}`);
    for (const other of allBlocks) {
      if (other !== kind) {
        assert.equal(other in layer, false, `Layer ${kind} must not have block ${other}`);
      }
    }

    const doc = createHandout();
    doc.layers.push(layer);
    assert.doesNotThrow(() => validateHandout(doc));
  }
});

test('mutation helpers do not mutate the input document and perform their operations', () => {
  const doc = createHandout({ name: 'Original' });
  const snapshotBefore = structuredClone(doc);

  // addLayer
  const txt = textLayer({ id: 'l-txt1', text: { content: 'Primeiro texto' } });
  const withText = addLayer(doc, txt);
  assert.deepEqual(doc, snapshotBefore, 'addLayer must not mutate input document');
  assert.equal(withText.layers.length, 2);
  assert.equal(withText.layers[1].id, 'l-txt1');

  // updateLayer
  const updated = updateLayer(withText, 'l-txt1', {
    name: 'Texto Renomeado',
    text: { content: 'Novo conteúdo', size: 50 },
  });
  assert.deepEqual(doc, snapshotBefore, 'updateLayer must not mutate original doc');
  assert.notDeepEqual(withText, updated);
  const updatedLayer = layerAt(updated, 'l-txt1');
  assert.equal(updatedLayer.name, 'Texto Renomeado');
  assert.equal(updatedLayer.text.content, 'Novo conteúdo');
  assert.equal(updatedLayer.text.size, 50);
  assert.equal(updatedLayer.text.color, '#1d1b24'); // Preserves unmodified nested properties

  // duplicateLayer
  const duplicated = duplicateLayer(updated, 'l-txt1');
  assert.equal(duplicated.layers.length, 3);
  assert.equal(duplicated.layers[2].name, 'Texto Renomeado — cópia');
  assert.notEqual(duplicated.layers[2].id, 'l-txt1');

  // moveLayer
  const moved = moveLayer(duplicated, 'l-txt1', 0);
  assert.equal(moved.layers[0].id, 'l-txt1');
  assert.equal(moved.layers[1].name, 'Papel');

  // removeLayer
  const removed = removeLayer(moved, 'l-txt1');
  assert.equal(removed.layers.length, 2);
  assert.equal(layerAt(removed, 'l-txt1'), null);
});

test('removeLayer of a layer marked as a field also removes that field', () => {
  let doc = createHandout();
  const txt = textLayer({ id: 'l-titulo' });
  doc = addLayer(doc, txt);
  doc = setField(doc, 'l-titulo', 'Título da Manchete');
  assert.equal(doc.fields.length, 1);
  assert.equal(doc.fields[0].layerId, 'l-titulo');

  const afterRemoval = removeLayer(doc, 'l-titulo');
  assert.equal(afterRemoval.layers.length, 1);
  assert.equal(afterRemoval.fields.length, 0);
});

test('fillFields changes only specified text content and image src without mutating', () => {
  let doc = createHandout();
  doc = addLayer(doc, textLayer({ id: 'l-nome', text: { content: 'Desconhecido' } }));
  doc = addLayer(doc, imageLayer({ id: 'l-foto', image: { src: null } }));
  doc = setField(doc, 'l-nome', 'Nome');
  doc = setField(doc, 'l-foto', 'Foto');

  const before = structuredClone(doc);
  const filled = fillFields(doc, {
    'l-nome': 'Sonny Forelli',
    'l-foto': { upload: 'up-foto-123' },
  });

  assert.deepEqual(doc, before, 'fillFields must not mutate input document');
  assert.equal(layerAt(filled, 'l-nome').text.content, 'Sonny Forelli');
  assert.deepEqual(layerAt(filled, 'l-foto').image.src, { upload: 'up-foto-123' });
});

test('validateHandout rejects invalid documents with correct path in error', () => {
  const base = () => createHandout();

  // kind desconhecido
  const badKind = base();
  badKind.layers[0].kind = 'magic';
  assert.throws(() => validateHandout(badKind), (err) => {
    return err instanceof ValidationError && err.path === 'layers[0].kind';
  });

  // opacity 1.5
  const badOpacity = base();
  badOpacity.layers[0].opacity = 1.5;
  assert.throws(() => validateHandout(badOpacity), (err) => {
    return err instanceof ValidationError && err.path === 'layers[0].opacity';
  });

  // blend 'foo'
  const badBlend = base();
  badBlend.layers[0].blend = 'foo';
  assert.throws(() => validateHandout(badBlend), (err) => {
    return err instanceof ValidationError && err.path === 'layers[0].blend';
  });

  // camada text sem text
  const badText = base();
  const txt = textLayer();
  delete txt.text;
  badText.layers.push(txt);
  assert.throws(() => validateHandout(badText), (err) => {
    return err instanceof ValidationError && err.path === 'layers[1].text';
  });

  // camada text com image
  const mixedLayer = base();
  const txt2 = textLayer();
  txt2.image = { src: null, fit: 'stretch', crop: null, flipX: false, flipY: false, filter: {}, tint: null };
  mixedLayer.layers.push(txt2);
  assert.throws(() => validateHandout(mixedLayer), (err) => {
    return err instanceof ValidationError && err.path === 'layers[1]';
  });

  // id repetido
  const dupId = base();
  dupId.layers.push(shapeLayer({ id: dupId.layers[0].id }));
  assert.throws(() => validateHandout(dupId), (err) => {
    return err instanceof ValidationError && err.path === 'layers[1].id';
  });

  // fields apontando para camada inexistente ou para uma forma
  const badFieldLayer = base();
  badFieldLayer.fields.push({ layerId: 'l-nao-existe', label: 'Campo Inexistente' });
  assert.throws(() => validateHandout(badFieldLayer), (err) => {
    return err instanceof ValidationError && err.path === 'fields[0].layerId';
  });

  const badFieldShape = base();
  badFieldShape.fields.push({ layerId: badFieldShape.layers[0].id, label: 'Forma como campo' });
  assert.throws(() => validateHandout(badFieldShape), (err) => {
    return err instanceof ValidationError && err.path === 'fields[0].layerId';
  });

  // curve com entradas fora de ordem
  const badCurve = base();
  const adj = adjustLayer({ adjust: { curve: [[50, 60], [40, 80]] } });
  badCurve.layers.push(adj);
  assert.throws(() => validateHandout(badCurve), (err) => {
    return err instanceof ValidationError && err.path === 'layers[1].adjust.curve';
  });

  // 201 camadas
  const tooManyLayers = base();
  for (let i = tooManyLayers.layers.length; i <= 200; i++) {
    tooManyLayers.layers.push(shapeLayer());
  }
  assert.throws(() => validateHandout(tooManyLayers), (err) => {
    return err instanceof ValidationError && err.path === 'layers';
  });

  // página 50 px
  const smallPage = base();
  smallPage.page.width = 50;
  assert.throws(() => validateHandout(smallPage), (err) => {
    return err instanceof ValidationError && err.path === 'page.width';
  });

  // cor 'red'
  const namedColor = base();
  namedColor.page.background = 'red';
  assert.throws(() => validateHandout(namedColor), (err) => {
    return err instanceof ValidationError && err.path === 'page.background';
  });
});

test('canvasOperation maps Photoshop blends to closest 2D canvas blend or source-over fallback', () => {
  assert.equal(canvasOperation('linear-burn'), 'multiply');
  assert.equal(canvasOperation('linear-dodge'), 'lighter');
  assert.equal(canvasOperation('nada'), 'source-over');
});

test('libraryRefs returns image and font library IDs without duplicates', () => {
  const doc = createHandout();
  doc.layers.push(imageLayer({ image: { src: { library: 'el-sangue-0007' } } }));
  doc.layers.push(imageLayer({ image: { src: { library: 'el-sangue-0007' } } })); // duplicate
  doc.layers.push(imageLayer({ image: { src: { upload: 'up-123' } } })); // upload, not library
  doc.layers.push(textLayer({ text: { font: { family: 'Kingthings', library: 'font-kt-2', weight: 400, italic: false } } }));
  doc.layers.push(textLayer({ text: { font: { family: 'System', library: null, weight: 400, italic: false } } }));

  const refs = libraryRefs(doc);
  assert.deepEqual(refs.sort(), ['el-sangue-0007', 'font-kt-2'].sort());
});

test('back accepts null and { handoutId: uuid } and rejects other formats', () => {
  const doc = createHandout();
  assert.equal(doc.back, null);
  assert.doesNotThrow(() => validateHandout(doc));

  doc.back = { handoutId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' };
  assert.doesNotThrow(() => validateHandout(doc));

  doc.back = { handoutId: 'invalid-id' };
  assert.throws(() => validateHandout(doc), (err) => {
    return err instanceof ValidationError && err.path === 'back';
  });

  doc.back = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  assert.throws(() => validateHandout(doc), (err) => {
    return err instanceof ValidationError && err.path === 'back';
  });
});

