import test from 'node:test';
import assert from 'node:assert/strict';

import { City } from '../src/sim/City.js';
import { serializeCity, deserializeCity, applyCityState, createSaveStore, SAVE_VERSION } from '../src/sim/SaveLoad.js';

const SEED = 'save-load-test-seed';

function makeCity() {
  return new City(16, 16, { seed: SEED });
}

// Mutate a handful of tiles so the save is non-trivial.
function editCity(city) {
  city.name = 'Testville';
  city.stats.money = 4242;
  const rci = city.grid[3][3];
  rci.type = 'residential';
  rci.density = 2;
  rci.residents = 17.5;
  rci.developmentLevel = 2;
  rci.happiness = 88;
  const road = city.grid[4][3];
  road.type = 'road';
  road.overlay = 'power-line';
  const lot = city.grid[6][6];
  lot.type = 'commercial';
  lot.isAnchor = true;
  lot.lotSize = { w: 2, h: 2 };
  lot.jobs = 31;
}

test('serialize -> deserialize preserves authoritative tile + city state', () => {
  const a = makeCity();
  editCity(a);
  const doc = deserializeCity(serializeCity(a));

  assert.equal(doc.version, SAVE_VERSION);
  assert.equal(doc.name, 'Testville');
  assert.equal(doc.size.width, 16);
  assert.equal(doc.seed, SEED);
  assert.equal(doc.stats.money, 4242);

  const rci = doc.tiles.find(t => t.x === 3 && t.y === 3);
  assert.equal(rci.type, 'residential');
  assert.equal(rci.residents, 17.5);
  assert.equal(rci.developmentLevel, 2);
  assert.equal(rci.happiness, 88);

  const road = doc.tiles.find(t => t.x === 4 && t.y === 3);
  assert.equal(road.type, 'road');
  assert.equal(road.overlay, 'power-line');

  const lot = doc.tiles.find(t => t.x === 6 && t.y === 6);
  assert.deepEqual(lot.lotSize, { w: 2, h: 2 });
  assert.equal(lot.isAnchor, true);
});

test('applyCityState restores a fresh city to the saved state', () => {
  const a = makeCity();
  editCity(a);
  const b = makeCity(); // same seed -> identical terrain
  applyCityState(b, deserializeCity(serializeCity(a)));

  assert.equal(b.name, 'Testville');
  assert.equal(b.stats.money, 4242);
  assert.equal(b.grid[3][3].type, 'residential');
  assert.equal(b.grid[3][3].residents, 17.5);
  assert.equal(b.grid[4][3].overlay, 'power-line');
  assert.deepEqual(b.grid[6][6].lotSize, { w: 2, h: 2 });

  // Terrain (elevation) is regenerated from the seed and must match exactly —
  // this is what makes a save reproducible without storing every height.
  for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) {
    assert.ok(Math.abs(a.grid[x][y].elevation - b.grid[x][y].elevation) < 1e-9);
  }
});

test('derived grids are recomputed after load, not trusted from the save', () => {
  const a = makeCity();
  // Give it a power plant + road so the BFS has something to spread.
  a.grid[2][2].type = 'power-coal';
  a.grid[3][2].type = 'road';
  a.updateInfrastructureGrids();
  assert.equal(a.powerGrid[2][2], true);

  const b = makeCity();
  applyCityState(b, deserializeCity(serializeCity(a)));
  // Before any tick the derived grid is at its constructor default (false)...
  assert.equal(b.powerGrid[2][2], false);
  // ...and the first infrastructure pass reproduces the same spread.
  b.updateInfrastructureGrids();
  assert.equal(b.powerGrid[2][2], true);
});

test('deserializeCity rejects an unsupported version', () => {
  const doc = deserializeCity(serializeCity(makeCity()));
  const bad = JSON.stringify({ ...doc, version: 99 });
  assert.throws(() => deserializeCity(bad), /Unsupported save version/);
});

test('deserializeCity rejects malformed and inconsistent input', () => {
  assert.throws(() => deserializeCity('not json'), /not valid JSON/);
  const doc = deserializeCity(serializeCity(makeCity()));
  const shortTiles = JSON.stringify({ ...doc, tiles: doc.tiles.slice(0, 5) });
  assert.throws(() => deserializeCity(shortTiles), /tile count/i);
});

test('auto-save writes a separate slot and loadGame falls back to it', () => {
  // Stub a minimal localStorage so createSaveStore takes its sync path (Node has
  // no window/indexedDB). The auto-save slot must be distinct from the manual one.
  const backing = new Map();
  globalThis.localStorage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => { backing.set(k, String(v)); },
    removeItem: (k) => { backing.delete(k); }
  };

  const store = createSaveStore(() => undefined); // no IndexedDB -> localStorage path
  const a = makeCity();
  editCity(a);
  const manual = serializeCity(a);

  // A manual save and an auto-save must occupy different keys.
  return Promise.resolve(store.write(manual)).then(() => {
    store.autoSave(manual);
    assert.ok(backing.has('threedeecity-save'), 'manual save stored under its key');
    assert.ok(backing.has('threedeecity-autosave'), 'auto-save stored under a separate key');

    // When there is NO manual save, autoRead returns the auto-saved state.
    backing.delete('threedeecity-save');
    return store.autoRead().then((raw) => {
      assert.equal(raw, manual);
      const restored = deserializeCity(raw);
      assert.equal(restored.name, 'Testville');
      assert.equal(restored.stats.money, 4242);
    });
  }).finally(() => { delete globalThis.localStorage; });
});
