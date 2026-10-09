import * as THREE from 'three';

export const SEA_LEVEL = 0.35;
export const TERRAIN_HEIGHT_SCALE = 5;
export const WATER_BED_HEIGHT = -0.35;

export function elevationToWorldHeight(elevation) {
  return (elevation - SEA_LEVEL) * TERRAIN_HEIGHT_SCALE;
}

export function getTileSurfaceHeight(tile) {
  return Math.max(WATER_BED_HEIGHT, elevationToWorldHeight(tile.elevation));
}

/**
 * Height of the procedural terrain surface at a point in tile-space coordinates.
 * The rendered heightfield (buildTerrainGeometry) is bilinear between its corner
 * vertices, so this bilinearly samples the same vertex heights to return the true
 * surface height at (tileX, tileY). Objects placed with getTileSurfaceHeight
 * (a single tile's corner elevation) sink into or float above the interpolated
 * surface on slopes — use this for anything that must sit exactly on the terrain.
 */
export function getTerrainHeightAt(city, tileX, tileY) {
  const width = city.size.width;
  const height = city.size.height;
  // Clamp to the mesh bounds so edge sampling stays inside the grid
  const fx = Math.max(0, Math.min(width, tileX));
  const fy = Math.max(0, Math.min(height, tileY));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  // Vertex (vx, vy) sits at the corner shared by tiles (vx-1, vy-1), (vx, vy-1),
  // (vx-1, vy), (vx, vy) — same averaging as sampleVertexHeight.
  const vertexHeight = (vx, vy) => {
    let sum = 0;
    let count = 0;
    for (const x of [vx - 1, vx]) {
      for (const y of [vy - 1, vy]) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          sum += getTileSurfaceHeight(city.grid[x][y]);
          count++;
        }
      }
    }
    return count > 0 ? sum / count : WATER_BED_HEIGHT;
  };
  const h00 = vertexHeight(x0, y0);
  const h10 = vertexHeight(x0 + 1, y0);
  const h01 = vertexHeight(x0, y0 + 1);
  const h11 = vertexHeight(x0 + 1, y0 + 1);
  return (
    h00 * (1 - tx) * (1 - ty) +
    h10 * tx * (1 - ty) +
    h01 * (1 - tx) * ty +
    h11 * tx * ty
  );
}

export function getTerrainColorBand({ elevation, slope = 0 }) {
  if (elevation < SEA_LEVEL - 0.08) return { name: 'deep-water-bed', color: 0x1e5f75 };
  if (elevation < SEA_LEVEL + 0.025) return { name: 'shoreline-wet-sand', color: 0x9aa36f };
  if (slope > 0.18) return { name: 'rocky-slope', color: 0x7c8173 };
  if (elevation > SEA_LEVEL + 0.35) return { name: 'high-grass', color: 0x6f9b57 };
  return { name: 'low-grass', color: 0x4f8a4c };
}

function sampleVertexHeight(city, vertexX, vertexY) {
  const samples = [];
  for (const x of [vertexX - 1, vertexX]) {
    for (const y of [vertexY - 1, vertexY]) {
      if (x >= 0 && x < city.size.width && y >= 0 && y < city.size.height) {
        samples.push(getTileSurfaceHeight(city.grid[x][y]));
      }
    }
  }
  return samples.reduce((sum, height) => sum + height, 0) / samples.length;
}

function sampleVertexTileStats(city, vertexX, vertexY) {
  const samples = [];
  for (const x of [vertexX - 1, vertexX]) {
    for (const y of [vertexY - 1, vertexY]) {
      if (x >= 0 && x < city.size.width && y >= 0 && y < city.size.height) {
        samples.push(city.grid[x][y]);
      }
    }
  }
  const elevation = samples.reduce((sum, tile) => sum + tile.elevation, 0) / samples.length;
  let slope = 0;
  for (const a of samples) {
    for (const b of samples) {
      slope = Math.max(slope, Math.abs(a.elevation - b.elevation));
    }
  }
  return { elevation, slope };
}

export function buildTerrainGeometry(city) {
  const geometry = new THREE.PlaneGeometry(
    city.size.width,
    city.size.height,
    city.size.width,
    city.size.height,
  );
  const positions = geometry.getAttribute('position');
  const colors = [];
  const color = new THREE.Color();

  for (let vertexY = 0; vertexY <= city.size.height; vertexY++) {
    for (let vertexX = 0; vertexX <= city.size.width; vertexX++) {
      const index = vertexY * (city.size.width + 1) + vertexX;
      positions.setZ(index, sampleVertexHeight(city, vertexX, vertexY));
      const band = getTerrainColorBand(sampleVertexTileStats(city, vertexX, vertexY));
      color.setHex(band.color);
      colors.push(color.r, color.g, color.b);
    }
  }

  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createWaterSurface(city) {
  const geometry = new THREE.PlaneGeometry(city.size.width, city.size.height);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x2f7fa3,
    roughness: 0.2,
    metalness: 0,
    transmission: 0.15,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(geometry, material);
  water.name = 'water-surface';
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.receiveShadow = true;
  water.renderOrder = 2;
  return water;
}
