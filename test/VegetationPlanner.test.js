import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VEGETATION_BUDGETS,
  planVegetation,
} from '../src/render/VegetationPlanner.js';

function cityFromTypes(types) {
  return {
    seed: 'veg-seed',
    size: { width: types.length, height: types[0].length },
    grid: types.map((column, x) => column.map((type, y) => ({
      x,
      y,
      type,
      elevation: type === 'steep' ? 0.8 : 0.45,
      density: type === 'residential' ? 1 : 0,
      developmentLevel: type === 'commercial' ? 1 : 0,
    }))),
  };
}

test('planVegetation is deterministic for the same seed and budget', () => {
  const city = cityFromTypes([
    ['grass', 'grass', 'grass'],
    ['grass', 'grass', 'grass'],
    ['grass', 'grass', 'grass'],
  ]);

  assert.deepEqual(planVegetation(city, { quality: 'medium' }), planVegetation(city, { quality: 'medium' }));
});

test('planVegetation excludes occupied, water, roads, zoned and steep tiles', () => {
  const city = cityFromTypes([
    ['water', 'road', 'grass'],
    ['residential', 'commercial', 'grass'],
    ['grass', 'grass', 'grass'],
  ]);
  city.grid[2][2].elevation = city.grid[1][2].elevation + 0.4;

  const plan = planVegetation(city, { quality: 'high' });

  assert.ok(plan.instances.length > 0);
  assert.ok(plan.instances.every(instance => {
    const tile = city.grid[instance.x][instance.y];
    return tile.type === 'grass' && !(instance.x === 2 && instance.y === 2);
  }));
});

test('vegetation budgets are bounded and ordered by quality', () => {
  assert.ok(VEGETATION_BUDGETS.low.maxInstances < VEGETATION_BUDGETS.medium.maxInstances);
  assert.ok(VEGETATION_BUDGETS.medium.maxInstances < VEGETATION_BUDGETS.high.maxInstances);
});
