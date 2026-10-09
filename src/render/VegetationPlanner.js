import { createSeededRandom } from '../sim/SeededRandom.js';
import { getMaxLocalSlope, MAX_BUILDABLE_SLOPE } from '../sim/TerrainPlacement.js';

export const VEGETATION_BUDGETS = {
  low: { maxInstances: 80, attemptsPerTile: 1 },
  medium: { maxInstances: 180, attemptsPerTile: 1 },
  high: { maxInstances: 360, attemptsPerTile: 2 },
};

const EXCLUDED_TYPES = new Set([
  'water',
  'road',
  'highway',
  'residential',
  'commercial',
  'industrial',
  'power-line',
  'power-coal',
  'power-wind',
  'water-pump',
  'bus-stop',
  'rail-line',
  'rail-station',
  'police',
  'fire',
  'school',
  'hospital',
  'park',
]);

export function isVegetationCandidate(city, x, y) {
  const tile = city.grid[x]?.[y];
  if (!tile || EXCLUDED_TYPES.has(tile.type)) return false;
  if (tile.density > 0 || tile.developmentLevel > 0 || tile.overlay) return false;
  return getMaxLocalSlope(city, x, y) <= MAX_BUILDABLE_SLOPE;
}

export function planVegetation(city, { quality = 'medium' } = {}) {
  const budget = VEGETATION_BUDGETS[quality] ?? VEGETATION_BUDGETS.medium;
  const random = createSeededRandom(`${city.seed ?? 'default'}:vegetation:${quality}`);
  const instances = [];

  for (let x = 0; x < city.size.width; x++) {
    for (let y = 0; y < city.size.height; y++) {
      if (!isVegetationCandidate(city, x, y)) continue;
      for (let attempt = 0; attempt < budget.attemptsPerTile; attempt++) {
        if (instances.length >= budget.maxInstances) return { quality, budget, instances };
        if (random() > 0.42) continue;
        instances.push({
          x,
          y,
          kind: random() > 0.84 ? 'rock' : 'tree',
          offsetX: random() * 0.62 - 0.31,
          offsetZ: random() * 0.62 - 0.31,
          scale: 0.75 + random() * 0.7,
          rotation: random() * Math.PI * 2,
        });
      }
    }
  }

  return { quality, budget, instances };
}
