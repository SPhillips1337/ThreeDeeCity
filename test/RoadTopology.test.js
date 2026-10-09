import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROAD_BITS,
  classifyRoadMask,
  classifyRoadTile,
  getRoadNeighborMask,
} from '../src/render/RoadTopology.js';

function road() {
  return { type: 'road' };
}

function grass() {
  return { type: 'grass' };
}

function cityWithCenter(neighbors) {
  const grid = [
    [grass(), neighbors.west ? road() : grass(), grass()],
    [neighbors.north ? road() : grass(), road(), neighbors.south ? road() : grass()],
    [grass(), neighbors.east ? road() : grass(), grass()],
  ];
  return {
    size: { width: 3, height: 3 },
    grid,
  };
}

const expected = new Map([
  [0, { topology: 'isolated', rotation: 0 }],
  [ROAD_BITS.north, { topology: 'dead-end', rotation: 0 }],
  [ROAD_BITS.east, { topology: 'dead-end', rotation: Math.PI / 2 }],
  [ROAD_BITS.south, { topology: 'dead-end', rotation: Math.PI }],
  [ROAD_BITS.west, { topology: 'dead-end', rotation: -Math.PI / 2 }],
  [ROAD_BITS.north | ROAD_BITS.south, { topology: 'straight', rotation: 0 }],
  [ROAD_BITS.east | ROAD_BITS.west, { topology: 'straight', rotation: Math.PI / 2 }],
  [ROAD_BITS.north | ROAD_BITS.east, { topology: 'corner', rotation: 0 }],
  [ROAD_BITS.east | ROAD_BITS.south, { topology: 'corner', rotation: Math.PI / 2 }],
  [ROAD_BITS.south | ROAD_BITS.west, { topology: 'corner', rotation: Math.PI }],
  [ROAD_BITS.west | ROAD_BITS.north, { topology: 'corner', rotation: -Math.PI / 2 }],
  [ROAD_BITS.north | ROAD_BITS.east | ROAD_BITS.south, { topology: 't', rotation: 0 }],
  [ROAD_BITS.east | ROAD_BITS.south | ROAD_BITS.west, { topology: 't', rotation: Math.PI / 2 }],
  [ROAD_BITS.south | ROAD_BITS.west | ROAD_BITS.north, { topology: 't', rotation: Math.PI }],
  [ROAD_BITS.west | ROAD_BITS.north | ROAD_BITS.east, { topology: 't', rotation: -Math.PI / 2 }],
  [ROAD_BITS.north | ROAD_BITS.east | ROAD_BITS.south | ROAD_BITS.west, { topology: 'cross', rotation: 0 }],
]);

test('classifyRoadMask exhaustively classifies all 16 road masks', () => {
  for (let mask = 0; mask < 16; mask++) {
    assert.deepEqual(classifyRoadMask(mask), { mask, ...expected.get(mask) }, `mask ${mask}`);
  }
});

test('classifyRoadTile builds masks from cardinal road neighbours', () => {
  const city = cityWithCenter({ north: true, east: true, south: false, west: false });

  assert.equal(getRoadNeighborMask(city, 1, 1), ROAD_BITS.north | ROAD_BITS.east);
  assert.deepEqual(classifyRoadTile(city, 1, 1), {
    mask: ROAD_BITS.north | ROAD_BITS.east,
    topology: 'corner',
    rotation: 0,
  });
});
