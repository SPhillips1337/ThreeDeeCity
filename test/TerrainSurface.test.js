import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  SEA_LEVEL,
  TERRAIN_HEIGHT_SCALE,
  buildTerrainGeometry,
  createWaterSurface,
  elevationToWorldHeight,
  getTerrainColorBand,
  getTerrainHeightAt,
  getTileSurfaceHeight,
} from '../src/render/TerrainSurface.js';

function cityFromElevations(elevations) {
  return {
    size: { width: elevations.length, height: elevations[0].length },
    grid: elevations.map((column, x) => column.map((elevation, y) => ({ x, y, elevation }))),
  };
}

test('elevationToWorldHeight places sea level at zero', () => {
  assert.equal(elevationToWorldHeight(SEA_LEVEL), 0);
  assert.equal(elevationToWorldHeight(SEA_LEVEL + 0.25), 0.25 * TERRAIN_HEIGHT_SCALE);
});

test('getTileSurfaceHeight clamps submerged tiles to the water bed', () => {
  assert.equal(getTileSurfaceHeight({ elevation: SEA_LEVEL - 0.2 }), -0.35);
  assert.ok(Math.abs(getTileSurfaceHeight({ elevation: SEA_LEVEL + 0.2 }) - (0.2 * TERRAIN_HEIGHT_SCALE)) < 1e-9);
});

test('getTerrainHeightAt matches the corner height on flat terrain', () => {
  const city = cityFromElevations([
    [SEA_LEVEL + 0.1, SEA_LEVEL + 0.1],
    [SEA_LEVEL + 0.1, SEA_LEVEL + 0.1],
  ]);
  const expected = getTileSurfaceHeight({ elevation: SEA_LEVEL + 0.1 });
  assert.ok(Math.abs(getTerrainHeightAt(city, 0.5, 0.5) - expected) < 1e-9);
  assert.ok(Math.abs(getTerrainHeightAt(city, 1.5, 1.5) - expected) < 1e-9);
});

test('getTerrainHeightAt interpolates between corners on a slope', () => {
  const city = cityFromElevations([
    [SEA_LEVEL, SEA_LEVEL + 0.1],
    [SEA_LEVEL + 0.2, SEA_LEVEL + 0.3],
  ]);

  // Vertex heights (average of surrounding tiles): v(0,0)=0, v(1,0)=0.5,
  // v(0,1)=0.25, v(1,1)=0.75 — so the surface at tile (0,0)'s center is the
  // bilinear mix 0.375, NOT the single corner value getTileSurfaceHeight gives.
  const center = getTerrainHeightAt(city, 0.5, 0.5);
  assert.ok(Math.abs(center - 0.375) < 1e-9);

  // At an exact vertex the sample collapses to that vertex's own height.
  assert.ok(Math.abs(getTerrainHeightAt(city, 1, 1) - 0.75) < 1e-9);

  // The interpolated surface differs from the naive corner lookup on slopes —
  // this is what keeps roads and buildings from sinking into hills.
  const corner = getTileSurfaceHeight({ elevation: SEA_LEVEL });
  assert.ok(Math.abs(center - corner) > 0.2);
});

test('buildTerrainGeometry emits a heightfield spanning the city and computes normals', () => {
  const city = cityFromElevations([
    [SEA_LEVEL, SEA_LEVEL + 0.1],
    [SEA_LEVEL + 0.2, SEA_LEVEL + 0.3],
  ]);

  const geometry = buildTerrainGeometry(city);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  assert.ok(geometry instanceof THREE.PlaneGeometry);
  assert.equal(position.count, 9);
  assert.equal(normal.count, position.count);
  assert.equal(geometry.parameters.width, 2);
  assert.equal(geometry.parameters.height, 2);
  assert.ok(Array.from(position.array).some((value, index) => index % 3 === 2 && value !== 0));
});

test('getTerrainColorBand creates deterministic depth, shoreline and slope bands', () => {
  assert.equal(getTerrainColorBand({ elevation: SEA_LEVEL - 0.2, slope: 0 }).name, 'deep-water-bed');
  assert.equal(getTerrainColorBand({ elevation: SEA_LEVEL - 0.01, slope: 0 }).name, 'shoreline-wet-sand');
  assert.equal(getTerrainColorBand({ elevation: SEA_LEVEL + 0.05, slope: 0.25 }).name, 'rocky-slope');
  assert.equal(getTerrainColorBand({ elevation: SEA_LEVEL + 0.45, slope: 0.05 }).name, 'high-grass');
});

test('buildTerrainGeometry emits vertex colors for terrain palette rendering', () => {
  const city = cityFromElevations([
    [SEA_LEVEL - 0.2, SEA_LEVEL - 0.01],
    [SEA_LEVEL + 0.08, SEA_LEVEL + 0.45],
  ]);

  const geometry = buildTerrainGeometry(city);
  const color = geometry.getAttribute('color');

  assert.equal(color.count, geometry.getAttribute('position').count);
  assert.ok(Array.from(color.array).some(channel => channel > 0 && channel < 1));
});

test('createWaterSurface covers the map at sea level without writing depth', () => {
  const city = cityFromElevations([
    [SEA_LEVEL - 0.1, SEA_LEVEL + 0.1],
    [SEA_LEVEL + 0.2, SEA_LEVEL - 0.2],
  ]);

  const water = createWaterSurface(city);

  assert.equal(water.name, 'water-surface');
  assert.equal(water.position.y, 0);
  assert.equal(water.geometry.parameters.width, 2);
  assert.equal(water.geometry.parameters.height, 2);
  assert.equal(water.material.depthWrite, false);
  assert.equal(water.material.transparent, true);
});
