export const ROAD_BITS = {
  north: 1,
  east: 2,
  south: 4,
  west: 8,
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
