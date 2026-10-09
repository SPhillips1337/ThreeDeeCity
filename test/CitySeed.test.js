import test from 'node:test';
import assert from 'node:assert/strict';

import { City } from '../src/sim/City.js';

function terrainSignature(city) {
  return city.grid.map(column => column.map(tile => [
    Number(tile.elevation.toFixed(6)),
    tile.type,
    tile.styleId,
  ]));
}

test('City stores a seed diagnostic and repeats terrain for the same seed', () => {
  const a = new City(8, 8, { seed: 'fixed-world' });
  const b = new City(8, 8, { seed: 'fixed-world' });

  assert.equal(a.seed, 'fixed-world');
  assert.equal(a.getRuntimeDiagnostics().seed, 'fixed-world');
  assert.deepEqual(terrainSignature(a), terrainSignature(b));
});

test('City seed changes generated terrain or render style IDs', () => {
  const a = new City(8, 8, { seed: 'fixed-world-a' });
  const b = new City(8, 8, { seed: 'fixed-world-b' });

  assert.notDeepEqual(terrainSignature(a), terrainSignature(b));
});
