import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampPanTarget,
  deriveInitialCameraFrame,
  getCityWorldBounds,
} from '../src/render/CameraRig.js';

const city = { size: { width: 32, height: 24 } };

test('getCityWorldBounds centers arbitrary city dimensions around the origin', () => {
  assert.deepEqual(getCityWorldBounds(city), {
    minX: -16,
    maxX: 16,
    minZ: -12,
    maxZ: 12,
    centerX: 0,
    centerZ: 0,
    span: 32,
  });
});

test('deriveInitialCameraFrame scales distance to city dimensions', () => {
  const small = deriveInitialCameraFrame({ size: { width: 16, height: 16 } });
  const large = deriveInitialCameraFrame({ size: { width: 64, height: 64 } });

  assert.ok(large.position.y > small.position.y);
  assert.ok(large.controls.maxDistance > small.controls.maxDistance);
  assert.deepEqual(small.target, { x: 0, y: 0, z: 0 });
});

test('clampPanTarget constrains pan inside playable bounds and above terrain', () => {
  const clamped = clampPanTarget(city, { x: 99, y: -4, z: -99 }, 1.25);

  assert.deepEqual(clamped, { x: 16, y: 1.25, z: -12 });
});
