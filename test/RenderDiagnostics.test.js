import test from 'node:test';
import assert from 'node:assert/strict';

import { collectRendererDiagnostics } from '../src/render/RenderDiagnostics.js';

test('collectRendererDiagnostics reports draw calls, triangles and memory', () => {
  const diagnostics = collectRendererDiagnostics({
    info: {
      render: { calls: 7, triangles: 1234 },
      memory: { geometries: 5, textures: 2 },
    },
  });

  assert.deepEqual(diagnostics, {
    drawCalls: 7,
    triangles: 1234,
    geometries: 5,
    textures: 2,
  });
});
