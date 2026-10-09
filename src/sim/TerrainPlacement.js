export const MAX_BUILDABLE_SLOPE = 0.18;

export function isInBounds(city, x, y) {
  return x >= 0 && x < city.size.width && y >= 0 && y < city.size.height;
}

export function getMaxLocalSlope(city, x, y) {
  if (!isInBounds(city, x, y)) return Number.POSITIVE_INFINITY;
  const elevation = city.grid[x][y].elevation;
  let maxSlope = 0;
  for (const [dx, dy] of [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (!isInBounds(city, nx, ny)) continue;
    maxSlope = Math.max(maxSlope, Math.abs(elevation - city.grid[nx][ny].elevation));
  }
  return Number(maxSlope.toFixed(6));
}

export function validateTerrainPlacement(city, x, y, toolId) {
  if (!isInBounds(city, x, y)) {
    return { ok: false, reason: 'Target is outside the city.', code: 'bounds' };
  }

  const tile = city.grid[x][y];
  if (tile.type === 'water' && toolId !== 'tool-bulldoze' && toolId !== 'tool-water-pump') {
    return { ok: false, reason: 'Cannot build on water.', code: 'water' };
  }

  if (toolId !== 'tool-bulldoze' && getMaxLocalSlope(city, x, y) > MAX_BUILDABLE_SLOPE) {
    return { ok: false, reason: 'Terrain is too steep.', code: 'slope' };
  }

  return { ok: true };
}
