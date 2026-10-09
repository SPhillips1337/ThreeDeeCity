import test from 'node:test';
import assert from 'node:assert/strict';

import config from '../vite.config.js';

test('vite config splits Three.js into a manual vendor chunk', () => {
  const manualChunks = config.build.rollupOptions.output.manualChunks;

  assert.equal(manualChunks('/repo/node_modules/three/build/three.module.js'), 'three-vendor');
  assert.equal(manualChunks('/repo/src/main.js'), undefined);
});
