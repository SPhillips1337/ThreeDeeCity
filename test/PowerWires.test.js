import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { SimObject } from '../src/render/SimObject.js';
import { PowerWireNetwork } from '../src/render/PowerWires.js';
import { SEA_LEVEL } from '../src/render/TerrainSurface.js';

function tile(city, x, y, type) {
  return {
    x,
    y,
    type,
    elevation: SEA_LEVEL + 0.2,
    city,
    overlay: null,
    developmentLevel: 0,
    abandoned: false,
    isAnchor: true,
    lotSize: { w: 1, h: 1 },
    modules: [],
  };
}

function powerRun(axis) {
  const city = { size: { width: 4, height: 4 }, grid: [] };
  city.grid = Array.from({ length: 4 }, (_, x) => Array.from({ length: 4 }, (_, y) => {
    const onRun = axis === 'ew'
      ? y === 1 && (x === 1 || x === 2)
      : x === 1 && (y === 1 || y === 2);
    return tile(city, x, y, onRun ? 'power-line' : 'grass');
  }));
  return city;
}

function insulatorPositions(sim) {
  sim.updateMatrixWorld(true);
  const points = [];
  sim.traverse(child => {
    const radius = child.geometry?.parameters?.radiusTop;
    const height = child.geometry?.parameters?.height;
    if (child.isMesh && radius === 0.02 && height === 0.06) {
      points.push(child.getWorldPosition(new THREE.Vector3()));
    }
  });
  return points;
}

function wireVertices(network) {
  const verts = [];
  for (const mesh of network.group.children) {
    const attr = mesh.geometry.getAttribute('position');
    for (let i = 0; i < attr.count; i++) {
      verts.push(new THREE.Vector3().fromBufferAttribute(attr, i));
    }
  }
  return verts;
}

function assertWiresHangFromInsulators(axis) {
  const city = powerRun(axis);
  const scene = new THREE.Scene();
  const network = new PowerWireNetwork(scene);
  network.rebuild(city);

  assert.equal(network.group.children.length, 2, `${axis} span should draw two cables`);

  const poles = axis === 'ew'
    ? [new SimObject(city.grid[1][1]), new SimObject(city.grid[2][1])]
    : [new SimObject(city.grid[1][1]), new SimObject(city.grid[1][2])];
  const wires = wireVertices(network);

  for (const pole of poles) {
    const insulators = insulatorPositions(pole);
    assert.equal(insulators.length, 2, 'each pole needs an insulator at each crossarm end');
    const shaft = pole.children.find(child => child.geometry?.parameters?.height === 2);
    assert.ok(shaft, 'standalone power-line must render a pole, not a dot');

    for (const insulator of insulators) {
      const nearest = Math.min(...wires.map(v => Math.hypot(v.x - insulator.x, v.z - insulator.z)));
      assert.ok(
        nearest < 0.05,
        `${axis} cable XZ is ${nearest.toFixed(3)} from insulator, expected to hang from the crossarm`,
      );
    }
  }
}

test('east-west power cables hang from the crossarm insulators', () => {
  assertWiresHangFromInsulators('ew');
});
