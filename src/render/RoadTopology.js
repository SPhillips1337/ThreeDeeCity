export const ROAD_BITS = {
  north: 1,
  east: 2,
  south: 4,
  west: 8,
};

// Diagonal bits are used only for rendering the corner-gap connector.
// They are intentionally separate from ROAD_BITS so classifyRoadMask /
// classifyRoadTile logic is unchanged (those only concern orthogonal topology).
export const ROAD_DIAG_BITS = {
  northEast: 1,
  southEast: 2,
  southWest: 4,
  northWest: 8,
};

export function isRoadLike(tile) {
  return tile?.type === 'road' || tile?.type === 'highway';
}

export function getRoadNeighborMask(city, x, y) {
  let mask = 0;
  if (isRoadLike(city.grid[x]?.[y - 1])) mask |= ROAD_BITS.north;
  if (isRoadLike(city.grid[x + 1]?.[y])) mask |= ROAD_BITS.east;
  if (isRoadLike(city.grid[x]?.[y + 1])) mask |= ROAD_BITS.south;
  if (isRoadLike(city.grid[x - 1]?.[y])) mask |= ROAD_BITS.west;
  return mask;
}

/**
 * Returns a 4-bit mask of diagonally adjacent road tiles (corner-touching).
 * Only set when that diagonal neighbor is a road AND neither orthogonal
 * neighbor bridging the corner is also a road — if there is already an
 * orthogonal connection the gap is already covered by normal junction geometry.
 */
export function getDiagonalRoadMask(city, x, y) {
  let mask = 0;
  const hasN = isRoadLike(city.grid[x]?.[y - 1]);
  const hasE = isRoadLike(city.grid[x + 1]?.[y]);
  const hasS = isRoadLike(city.grid[x]?.[y + 1]);
  const hasW = isRoadLike(city.grid[x - 1]?.[y]);

  // NE: only render connector if both N and E legs are absent (pure diagonal gap)
  if (!hasN && !hasE && isRoadLike(city.grid[x + 1]?.[y - 1])) mask |= ROAD_DIAG_BITS.northEast;
  // SE
  if (!hasS && !hasE && isRoadLike(city.grid[x + 1]?.[y + 1])) mask |= ROAD_DIAG_BITS.southEast;
  // SW
  if (!hasS && !hasW && isRoadLike(city.grid[x - 1]?.[y + 1])) mask |= ROAD_DIAG_BITS.southWest;
  // NW
  if (!hasN && !hasW && isRoadLike(city.grid[x - 1]?.[y - 1])) mask |= ROAD_DIAG_BITS.northWest;
  return mask;
}

export function classifyRoadMask(mask) {
  const count = [ROAD_BITS.north, ROAD_BITS.east, ROAD_BITS.south, ROAD_BITS.west]
    .filter(bit => (mask & bit) !== 0).length;

  if (count === 0) return { mask, topology: 'isolated', rotation: 0 };
  if (count === 4) return { mask, topology: 'cross', rotation: 0 };

  if (count === 1) {
    if (mask & ROAD_BITS.north) return { mask, topology: 'dead-end', rotation: 0 };
    if (mask & ROAD_BITS.east) return { mask, topology: 'dead-end', rotation: Math.PI / 2 };
    if (mask & ROAD_BITS.south) return { mask, topology: 'dead-end', rotation: Math.PI };
    return { mask, topology: 'dead-end', rotation: -Math.PI / 2 };
  }

  if (count === 2) {
    if ((mask & (ROAD_BITS.north | ROAD_BITS.south)) === (ROAD_BITS.north | ROAD_BITS.south)) {
      return { mask, topology: 'straight', rotation: 0 };
    }
    if ((mask & (ROAD_BITS.east | ROAD_BITS.west)) === (ROAD_BITS.east | ROAD_BITS.west)) {
      return { mask, topology: 'straight', rotation: Math.PI / 2 };
    }
    if ((mask & (ROAD_BITS.north | ROAD_BITS.east)) === (ROAD_BITS.north | ROAD_BITS.east)) {
      return { mask, topology: 'corner', rotation: 0 };
    }
    if ((mask & (ROAD_BITS.east | ROAD_BITS.south)) === (ROAD_BITS.east | ROAD_BITS.south)) {
      return { mask, topology: 'corner', rotation: Math.PI / 2 };
    }
    if ((mask & (ROAD_BITS.south | ROAD_BITS.west)) === (ROAD_BITS.south | ROAD_BITS.west)) {
      return { mask, topology: 'corner', rotation: Math.PI };
    }
    return { mask, topology: 'corner', rotation: -Math.PI / 2 };
  }

  if ((mask & ROAD_BITS.west) === 0) return { mask, topology: 't', rotation: 0 };
  if ((mask & ROAD_BITS.north) === 0) return { mask, topology: 't', rotation: Math.PI / 2 };
  if ((mask & ROAD_BITS.east) === 0) return { mask, topology: 't', rotation: Math.PI };
  return { mask, topology: 't', rotation: -Math.PI / 2 };
}

export function classifyRoadTile(city, x, y) {
  return classifyRoadMask(getRoadNeighborMask(city, x, y));
}
