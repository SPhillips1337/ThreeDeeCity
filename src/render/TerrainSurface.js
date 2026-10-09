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
