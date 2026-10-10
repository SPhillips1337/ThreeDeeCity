import * as THREE from 'three';
import { ROAD_BITS } from './RoadTopology.js';
import { getTerrainHeightAt } from './TerrainSurface.js';

// Shared pole dimensions so SimObject (pole meshes) and this network
// (wire endpoints) always agree on where the crossarms sit.
export const POWER_POLE_HEIGHT = 2.0;   // base to top of pole
export const POWER_CROSSARM_Y = 1.72;   // crossarm height above tile base
export const POWER_WIRE_DROP = 0.14;    // wires hang this far below the crossarm
export const POWER_INSULATOR_OFFSET = 0.28; // crossarm-end spacing; wires must use the same offset

const WIRE_SAG_PER_UNIT = 0.055;        // mid-span sag per unit of span length
const WIRE_RADIUS = 0.02;
const WIRE_LATERAL_OFFSET = POWER_INSULATOR_OFFSET;

function isPowered(tile) {
  return tile?.type === 'power-line' || tile?.overlay === 'power-line';
}

/** Cardinal mask of adjacent powered tiles. North is -Y, matching RoadTopology. */
export function getPowerNeighborMask(city, x, y) {
  let mask = 0;
  if (isPowered(city.grid[x]?.[y - 1])) mask |= ROAD_BITS.north;
  if (isPowered(city.grid[x + 1]?.[y])) mask |= ROAD_BITS.east;
  if (isPowered(city.grid[x]?.[y + 1])) mask |= ROAD_BITS.south;
  if (isPowered(city.grid[x - 1]?.[y])) mask |= ROAD_BITS.west;
  return mask;
}

/**
 * Renders the wire spans between adjacent powered tiles (standalone power-line
 * tiles and power-line overlays on roads/highways). Rebuilt wholesale whenever
 * a tile changes — the grid is small enough that dispose+recreate is trivial.
 */
export class PowerWireNetwork {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'power-wires';
    this.wireMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1c22 });
    scene.add(this.group);
  }

  wireYAt(city, x, y) {
    return getTerrainHeightAt(city, x + 0.5, y + 0.5) + POWER_CROSSARM_Y - POWER_WIRE_DROP;
  }

  rebuild(city) {
    while (this.group.children.length > 0) {
      const child = this.group.children.pop();
      child.geometry?.dispose();
      this.group.remove(child);
    }

    const w = city.size.width;
    const h = city.size.height;
    const spans = [];
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (!isPowered(city.grid[x][y])) continue;
        if (x + 1 < w && isPowered(city.grid[x + 1][y])) spans.push([x, y, x + 1, y]);
        if (y + 1 < h && isPowered(city.grid[x][y + 1])) spans.push([x, y, x, y + 1]);
      }
    }

    for (const [x1, y1, x2, y2] of spans) {
      const ax = x1 - 16 + 0.5;
      const az = y1 - 16 + 0.5;
      const bx = x2 - 16 + 0.5;
      const bz = y2 - 16 + 0.5;
      const ay = this.wireYAt(city, x1, y1);
      const by = this.wireYAt(city, x2, y2);

      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      // Perpendicular lateral offset in the XZ plane for the two cables.
      const px = (-dz / len) * WIRE_LATERAL_OFFSET;
      const pz = (dx / len) * WIRE_LATERAL_OFFSET;

      for (const s of [1, -1]) {
        const start = new THREE.Vector3(ax + px * s, ay, az + pz * s);
        const end = new THREE.Vector3(bx + px * s, by, bz + pz * s);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        mid.y -= len * WIRE_SAG_PER_UNIT;
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const geometry = new THREE.TubeGeometry(curve, 8, WIRE_RADIUS, 5, false);
        this.group.add(new THREE.Mesh(geometry, this.wireMaterial));
      }
    }
  }

  dispose() {
    while (this.group.children.length > 0) {
      const child = this.group.children.pop();
      child.geometry?.dispose();
    }
    this.scene.remove(this.group);
    this.wireMaterial.dispose();
  }
}
