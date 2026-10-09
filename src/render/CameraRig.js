export function getCityWorldBounds(city) {
  const halfWidth = city.size.width / 2;
  const halfHeight = city.size.height / 2;
  return {
    minX: -halfWidth,
    maxX: halfWidth,
    minZ: -halfHeight,
    maxZ: halfHeight,
    centerX: 0,
    centerZ: 0,
    span: Math.max(city.size.width, city.size.height),
  };
}

export function deriveInitialCameraFrame(city) {
  const bounds = getCityWorldBounds(city);
  const distance = bounds.span * 1.15;
  const height = Math.max(18, bounds.span * 0.95);
  return {
    position: {
      x: bounds.centerX + distance * 0.72,
      y: height,
      z: bounds.centerZ + distance * 0.72,
    },
    target: { x: bounds.centerX, y: 0, z: bounds.centerZ },
    controls: {
      minDistance: Math.max(8, bounds.span * 0.24),
      maxDistance: Math.max(80, bounds.span * 2.8),
    },
  };
}

export function clampPanTarget(city, target, minY = 0) {
  const bounds = getCityWorldBounds(city);
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, target.x)),
    y: Math.max(minY, target.y),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, target.z)),
  };
}
