import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BUILDABLE_SLOPE,
  getMaxLocalSlope,
  validateTerrainPlacement,
} from '../src/sim/TerrainPlacement.js';

function cityFromTiles(columns) {
  return {
    size: { width: columns.length, height: columns[0].length },
    grid: columns,
  };
}

function tile(type, elevation) {
  return { type, elevation };
}

test('validateTerrainPlacement accepts buildable land at the slope threshold', () => {
  const center = 0.5;
  const city = cityFromTiles([
    [tile('grass', center), tile('grass', center), tile('grass', center)],
    [tile('grass', center), tile('grass', center), tile('grass', center + MAX_BUILDABLE_SLOPE)],
    [tile('grass', center), tile('grass', center), tile('grass', center)],
  ]);

  const result = validateTerrainPlacement(city, 1, 1, 'tool-road');

  assert.equal(result.ok, true);
  assert.equal(getMaxLocalSlope(city, 1, 1), MAX_BUILDABLE_SLOPE);
});

test('validateTerrainPlacement rejects water with a visible reason', () => {
  const city = cityFromTiles([[tile('water', 0.1)]]);

  assert.deepEqual(validateTerrainPlacement(city, 0, 0, 'tool-road'), {
    ok: false,
    reason: 'Cannot build on water.',
    code: 'water',
  });
});

test('validateTerrainPlacement allows water pumps on water', () => {
  const city = cityFromTiles([[tile('water', 0.1)]]);

  assert.equal(validateTerrainPlacement(city, 0, 0, 'tool-water-pump').ok, true);
});

test('validateTerrainPlacement rejects slopes above threshold', () => {
  const city = cityFromTiles([
    [tile('grass', 0.5), tile('grass', 0.5)],
    [tile('grass', 0.5), tile('grass', 0.5 + MAX_BUILDABLE_SLOPE + 0.001)],
  ]);

  assert.deepEqual(validateTerrainPlacement(city, 0, 0, 'tool-road'), {
    ok: false,
    reason: 'Terrain is too steep.',
    code: 'slope',
  });
});

test('validateTerrainPlacement rejects out-of-bounds targets', () => {
  const city = cityFromTiles([[tile('grass', 0.5)]]);

  assert.deepEqual(validateTerrainPlacement(city, 1, 0, 'tool-road'), {
    ok: false,
    reason: 'Target is outside the city.',
    code: 'bounds',
  });
});
