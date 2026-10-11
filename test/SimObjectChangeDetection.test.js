import test from 'node:test';
import assert from 'node:assert/strict';

import { SimObject } from '../src/render/SimObject.js';
import { SEA_LEVEL } from '../src/render/TerrainSurface.js';

// Developed RCI tiles build a complex building, whose material path calls
// document.createElement('canvas') for window/roof textures. Node has no DOM,
// so stub a minimal canvas whose 2d context is a no-op proxy. Guarded so a real
// DOM (e.g. if run under jsdom) wins over the stub. THREE.CanvasTexture only
// stores the canvas as .image at construction and never uploads it here.
function installCanvasStub() {
  if (globalThis.document && globalThis.document.createElement) return;
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  const makeCanvas = () => ({ width: 0, height: 0, getContext: () => ctx });
  globalThis.document = { createElement: () => makeCanvas() };
}
installCanvasStub();

// Minimal tile stub matching what updateMesh() reads. No city, so the mesh is
// built from a single corner elevation (getTileSurfaceHeight) — enough to
// exercise change detection without a full heightfield.
function makeTile(overrides = {}) {
  return {
    x: 0,
    y: 0,
    type: 'road',
    elevation: SEA_LEVEL + 1,
    city: null,
    overlay: null,
    developmentLevel: 0,
    abandoned: false,
    isAnchor: true,
    lotSize: { w: 1, h: 1 },
    modules: [],
    ...overrides,
  };
}

test('hasChanged() is false for an unchanged tile', () => {
  const obj = new SimObject(makeTile());
  assert.equal(obj.hasChanged(), false);
});

test('hasChanged() detects a power-line overlay added to a road tile', () => {
  const tile = makeTile({ type: 'road' });
  const obj = new SimObject(tile);
  assert.equal(obj.hasChanged(), false, 'baseline must be clean');

  tile.overlay = 'power-line'; // the exact hazard from PROGRESS.md
  assert.equal(obj.hasChanged(), true, 'overlay add must trigger a rebuild');

  // Syncing via update() clears the flag.
  obj.update();
  assert.equal(obj.hasChanged(), false, 'update() must resync cached overlay');
});

test('hasChanged() detects a power-line overlay removed from a road tile', () => {
  const tile = makeTile({ type: 'road', overlay: 'power-line' });
  const obj = new SimObject(tile);
  assert.equal(obj.hasChanged(), false, 'baseline must be clean');

  tile.overlay = null; // bulldozer removes the overlay first
  assert.equal(obj.hasChanged(), true, 'overlay removal must trigger a rebuild');
});

test('hasChanged() detects a type change on an existing object', () => {
  const tile = makeTile({ type: 'grass' });
  const obj = new SimObject(tile);
  assert.equal(obj.hasChanged(), false, 'baseline must be clean');

  tile.type = 'power-line'; // grass -> standalone pole
  assert.equal(obj.hasChanged(), true, 'type change must trigger a rebuild');
});

test('hasChanged() detects a power module flipping off', () => {
  const tile = makeTile({ type: 'residential', developmentLevel: 1 });
  const obj = new SimObject(tile);
  assert.equal(obj.hasChanged(), false, 'baseline must be clean');

  tile.modules.push({ name: 'Power', hasPower: true });
  obj.update(); // sync the powered baseline
  assert.equal(obj.hasChanged(), false, 'synced power state must be clean');

  tile.modules.find(m => m.name === 'Power').hasPower = false;
  assert.equal(obj.hasChanged(), true, 'power loss must trigger a rebuild');
});

test('update() returns false when nothing changed and true after a change', () => {
  const tile = makeTile({ type: 'road' });
  const obj = new SimObject(tile);
  assert.equal(obj.update(), false, 'no-op update must report false');

  tile.overlay = 'power-line';
  assert.equal(obj.update(), true, 'update after a change must report true');
});
