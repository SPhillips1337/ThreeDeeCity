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

test('adjacent road ribbons meet on the interpolated surface, not at double height', () => {
  const city = slopedRoadCity();
  const south = new SimObject(city.grid[1][1]);
  const north = new SimObject(city.grid[1][2]);
  const boundaryZ = (1 - 16 + 1); // shared edge between tile y=1 and y=2

  const southEdge = roadWorldVertices(south).filter(v => Math.abs(v.z - boundaryZ) < 1e-4);
  const northEdge = roadWorldVertices(north).filter(v => Math.abs(v.z - boundaryZ) < 1e-4);
  assert.ok(southEdge.length >= 2, 'south road must reach the shared edge');
  assert.ok(northEdge.length >= 2, 'north road must reach the shared edge');

  const expectedY = getTerrainHeightAt(city, 1.5, 2) + LIFT;
  for (const vertex of [...southEdge, ...northEdge]) {
    assert.ok(
      Math.abs(vertex.y - expectedY) < 1e-4,
      `edge vertex y=${vertex.y} expected surface+lift ${expectedY}`,
    );
  }

  for (const s of southEdge) {
    const match = northEdge.some(n => Math.abs(n.x - s.x) < 1e-4 && Math.abs(n.y - s.y) < 1e-4);
    assert.ok(match, `south edge vertex (${s.x}, ${s.y}) has no matching north vertex`);
  }
});
