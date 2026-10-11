import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { SimObject } from '../src/render/SimObject.js';
import { SEA_LEVEL, getTerrainHeightAt } from '../src/render/TerrainSurface.js';

const LIFT = 0.02;

function tile(city, x, y, type, elevation) {
  return {
    x,
    y,
    type,
    elevation,
    city,
    overlay: null,
    developmentLevel: 0,
    abandoned: false,
    isAnchor: true,
    lotSize: { w: 1, h: 1 },
    modules: [],
  };
}

function slopedRoadCity() {
  const elevations = [
    [0.50, 0.50, 0.50, 0.50],
    [0.50, 0.55, 0.75, 0.90],
    [0.50, 0.50, 0.50, 0.50],
    [0.50, 0.50, 0.50, 0.50],
  ];
  const city = {
    size: { width: 4, height: 4 },
    grid: [],
  };
  city.grid = elevations.map((column, x) => column.map((elevation, y) => {
    const type = x === 1 && y >= 1 && y <= 2 ? 'road' : 'grass';
    return tile(city, x, y, type, SEA_LEVEL + elevation);
  }));
  return city;
}

function roadWorldVertices(sim) {
  sim.updateMatrixWorld(true);
  const mesh = sim.getObjectByName('road-visual');
  assert.ok(mesh, 'road tile must render a road-visual mesh, not a flat box');
  const attr = mesh.geometry.getAttribute('position');
  const verts = [];
  for (let i = 0; i < attr.count; i++) {
    verts.push(new THREE.Vector3().fromBufferAttribute(attr, i).applyMatrix4(sim.matrixWorld));
  }
  return verts;
}

// World z maps to tile-space y via +16 (the -16 world offset cancels the +0.5
// centering), so the interpolated surface height at a vertex's own position is
// getTerrainHeightAt(city, xCenter, worldZ + 16). This is what the mesh stores,
// plus LIFT. Used to prove no height doubling on slopes.
const surfaceY = (city, worldZ) => getTerrainHeightAt(city, 1.5, worldZ + 16) + LIFT;

test('adjacent road ribbons overlap across the shared edge and sit on the interpolated surface', () => {
  const city = slopedRoadCity();
  const south = new SimObject(city.grid[1][1]); // y=1, dead-end pointing S (stub reaches N)
  const north = new SimObject(city.grid[1][2]); // y=2, dead-end pointing N (stub reaches S)
  const boundaryZ = (1 - 16 + 1); // shared edge between tile y=1 and y=2

  const southVerts = roadWorldVertices(south);
  const northVerts = roadWorldVertices(north);

  // The seam fix: each ribbon now extends PAST the boundary into its neighbour's
  // cell instead of stopping exactly at it, so anti-aliasing can't leave a crack.
  const southCrossesNorth = southVerts.filter(v => v.z > boundaryZ);
  const northCrossesSouth = northVerts.filter(v => v.z < boundaryZ);
  assert.ok(southCrossesNorth.length >= 2, 'south ribbon must extend past the shared edge into the north tile');
  assert.ok(northCrossesSouth.length >= 2, 'north ribbon must extend past the shared edge into the south tile');

  // No height doubling: every vertex of both ribbons — including the ones now in
  // the overlap band — sits exactly on the interpolated surface + LIFT. The old
  // per-tile boxes doubled the slope here because they stored absolute height in
  // a group already placed at the tile-center surface.
  for (const v of [...southVerts, ...northVerts]) {
    const expected = surfaceY(city, v.z);
    assert.ok(
      Math.abs(v.y - expected) < 1e-4,
      `vertex at z=${v.z} has y=${v.y}, expected interpolated surface+lift ${expected}`,
    );
  }
});
