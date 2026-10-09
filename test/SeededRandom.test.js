import test from 'node:test';
import assert from 'node:assert/strict';

import { createSeededRandom, randomInt, seedFromString } from '../src/sim/SeededRandom.js';

test('seedFromString is stable and differentiates common seeds', () => {
  assert.equal(seedFromString('city-alpha'), seedFromString('city-alpha'));
  assert.notEqual(seedFromString('city-alpha'), seedFromString('city-beta'));
});

test('createSeededRandom repeats the same stream for the same seed', () => {
  const a = createSeededRandom('city-alpha');
  const b = createSeededRandom('city-alpha');

  assert.deepEqual(
    [a(), a(), a(), a(), a()],
    [b(), b(), b(), b(), b()],
  );
});

test('createSeededRandom differentiates streams for different seeds', () => {
  const a = createSeededRandom('city-alpha');
  const b = createSeededRandom('city-beta');

  assert.notDeepEqual(
    [a(), a(), a(), a(), a()],
    [b(), b(), b(), b(), b()],
  );
});

test('randomInt returns deterministic bounded integers', () => {
  const random = createSeededRandom('bounded');
  const values = Array.from({ length: 20 }, () => randomInt(random, 4));

  assert.deepEqual(values, Array.from({ length: 20 }, (_, i) => {
    const replay = createSeededRandom('bounded');
    for (let n = 0; n < i; n++) randomInt(replay, 4);
    return randomInt(replay, 4);
  }));
  assert.ok(values.every(value => Number.isInteger(value) && value >= 0 && value < 4));
});
