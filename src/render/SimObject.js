import * as THREE from 'three';
import { materials } from './MaterialManager.js';
import { getTileSurfaceHeight, getTerrainHeightAt } from './TerrainSurface.js';
import { createSeededRandom } from '../sim/SeededRandom.js';
import { classifyRoadTile, ROAD_BITS, getRoadNeighborMask } from './RoadTopology.js';
import { POWER_POLE_HEIGHT, POWER_CROSSARM_Y, POWER_INSULATOR_OFFSET, getPowerNeighborMask } from './PowerWires.js';

/**
 * SimObject represents a single tile's visual representation in the 3D scene.
 * If part of a large lot (2x2, 3x3), the anchor tile renders the whole building.
 */
export class SimObject extends THREE.Group {
  constructor(tile) {
    super();
    this.tile = tile;
    
    // Store current state to detect changes
    this.developmentLevel = tile.developmentLevel;
    this.abandoned = tile.abandoned;
    this.hasPower = tile.modules.find(m => m.name === 'Power')?.hasPower ?? true;
    this.hasWater = tile.modules.find(m => m.name === 'Water')?.hasWater ?? true;
    this.isAnchor = tile.isAnchor;
    this.lotSize = { ...tile.lotSize };

    // Initial position - will be adjusted if it's a large lot
    this._updatePosition();
    this.updateMesh();
  }

  _updatePosition() {
    const { w, h } = this.tile.lotSize;
    // Center of the lot. 
    // If 1x1: (x+0.5, z+0.5)
    // If 2x2: (x+1.0, z+1.0)
    // If 3x3: (x+1.5, z+1.5)
    const offsetX = (w - 1) * 0.5;
    const offsetZ = (h - 1) * 0.5;
    // Sample the true terrain surface at the lot center. The heightfield is
    // bilinear between tile corners, so a single corner elevation
    // (getTileSurfaceHeight) leaves objects sunk into or floating above the
    // surface on slopes — most visible on roads "bleeding" into hills.
    let baseY = getTileSurfaceHeight(this.tile);
    if (this.tile.city) {
      baseY = getTerrainHeightAt(
        this.tile.city,
        this.tile.x + 0.5 + offsetX,
        this.tile.y + 0.5 + offsetZ,
      );
    }
    this.position.set(
      this.tile.x - 16 + 0.5 + offsetX,
      baseY,
      this.tile.y - 16 + 0.5 + offsetZ,
    );
  }

  updateMesh() {
    // Clear all existing meshes
    while(this.children.length > 0) { 
      const obj = this.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.remove(obj); 
    }

    // If this tile is not an anchor, it shouldn't render a building (the anchor does)
    if (!this.tile.isAnchor) {
      // Still might render a road or power line overlay if applicable,
      // but usually sub-tiles of a lot don't have these.
      return;
    }

    // 1. Render Main Building/Lot
    if (this.tile.type !== 'grass') {
      this._createBuildingMesh();
    }

    // 2. Render Overlay (e.g. Power Line over Road)
    if (this.tile.overlay === 'power-line') {
      this._createOverlayMesh();
    }

    // 3. Render Service Alerts
    this._createServiceAlerts();
  }

  _createBuildingMesh() {
    const { w, h } = this.tile.lotSize;
    const level = this.tile.developmentLevel || 0;
    const density = this.tile.density || 1;
    const type = this.tile.type;

    const isZoned = ['residential', 'commercial', 'industrial'].includes(type);
    const isCivic = ['police', 'fire', 'school', 'hospital', 'power-coal', 'power-wind', 'water-pump', 'park'].includes(type);

    if (level === 0 && isZoned) {
      // Zoned lot: flat translucent area matching lot size
      const geometry = new THREE.BoxGeometry(w - 0.1, 0.05, h - 0.1);
      const material = this._getMaterial(type, true);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0.03;
      this.add(mesh);
      return;
    }

    if (isZoned || isCivic) {
      this._addComplexBuilding(type, level, density, w, h);
    } else if (type === 'road' || type === 'highway') {
      this._addRoadMesh(type);
    } else if (type === 'power-line') {
      this._createOverlayMesh(); // standalone pole on grass
    } else {
      const geometry = this._getBasicGeometry(type);
      const material = this._getMaterial(type);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.y = geometry.parameters.height / 2 + 0.01;
      this.add(mesh);
    }
  }

  _addRoadMesh(type) {
    const width = type === 'highway' ? 0.72 : 0.58;
    const material = this._getMaterial(type);

    const city = this.tile.city;
    const mask = city
      ? getRoadNeighborMask(city, this.tile.x, this.tile.y)
      : 0;
    const hw = width / 2;
    // Lift the road bed slightly above the terrain surface so it never
    // z-fights the ground mesh while still hugging slopes continuously.
    const LIFT = 0.02;

    // Terrain-hugging ribbon: every vertex is sampled from the shared
    // heightfield, so adjacent road tiles meet exactly at their common edge —
    // no gaps, no per-tile box steps on slopes. The old per-tile flat boxes
    // read as separate slabs because each sat level at its own tile's height.
    // Vertices are parent-local: the group origin is already at the tile-center
    // surface, so storing absolute height here doubles the slope and reopens
    // the gaps this ribbon was meant to close.
    const baseY = this.position.y;
    const surf = (lx, lz) => {
      const h = city
        ? getTerrainHeightAt(city, this.tile.x + 0.5 + lx, this.tile.y + 0.5 + lz)
        : baseY;
      return h + LIFT - baseY;
    };

    const positions = [];
    const indices = [];
    // Append one quad given four tile-local corners in perimeter order.
    // Winding is resolved from the actual (sloped) geometry so the normal
    // always points up, regardless of which way the terrain tilts.
    const addQuad = (a, b, c, d) => {
      const base = positions.length / 3;
      for (const p of [a, b, c, d]) positions.push(p[0], surf(p[0], p[1]), p[1]);
      const ux = b[0] - a[0], uy = surf(b[0], b[1]) - surf(a[0], a[1]), uz = b[1] - a[1];
      const vx = c[0] - a[0], vy = surf(c[0], c[1]) - surf(a[0], a[1]), vz = c[1] - a[1];
      // (u x v).y < 0 means the perimeter order is CW seen from above; in
      // that case the upward-facing triangles are (a,c,b) and (c,a,d). The
      // else branch is the mirror image for CCW order.
      if (ux * vz - uz * vx > 0) indices.push(base, base + 2, base + 1, base + 2, base, base + 3);
      else indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    const count = [ROAD_BITS.north, ROAD_BITS.east, ROAD_BITS.south, ROAD_BITS.west]
      .filter(bit => (mask & bit) !== 0).length;

    if (count === 0) {
      // Isolated road pad (transient while the player is still laying it out)
      addQuad([-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]);
    } else if (count === 1) {
      const cw = hw * 1.2; // cul-de-sac mouth half-width at the closed end
      if (mask & ROAD_BITS.north) {
        addQuad([-hw, -0.5], [hw, -0.5], [hw, 0], [-hw, 0]);          // stub toward N
        addQuad([-cw, 0], [cw, 0], [cw, 0.5], [-cw, 0.5]);            // mouth at S end
      } else if (mask & ROAD_BITS.south) {
        addQuad([-hw, 0], [hw, 0], [hw, 0.5], [-hw, 0.5]);
        addQuad([-cw, -0.5], [cw, -0.5], [cw, 0], [-cw, 0]);
      } else if (mask & ROAD_BITS.east) {
        addQuad([0, -hw], [0.5, -hw], [0.5, hw], [0, hw]);
        addQuad([-0.5, -cw], [0, -cw], [0, cw], [-0.5, cw]);
      } else { // west
        addQuad([-0.5, -hw], [0, -hw], [0, hw], [-0.5, hw]);
        addQuad([0, -cw], [0.5, -cw], [0.5, cw], [0, cw]);
      }
    } else if ((mask & (ROAD_BITS.north | ROAD_BITS.south)) === (ROAD_BITS.north | ROAD_BITS.south)
               && (mask & (ROAD_BITS.east | ROAD_BITS.west)) === 0) {
      // Straight N-S: one full strip
      addQuad([-hw, -0.5], [hw, -0.5], [hw, 0.5], [-hw, 0.5]);
    } else if ((mask & (ROAD_BITS.east | ROAD_BITS.west)) === (ROAD_BITS.east | ROAD_BITS.west)
               && (mask & (ROAD_BITS.north | ROAD_BITS.south)) === 0) {
      // Straight E-W: one full strip
      addQuad([-0.5, -hw], [0.5, -hw], [0.5, hw], [-0.5, hw]);
    } else {
      // Corner / T / cross: central square + a stub per open direction.
      // The tiling is non-overlapping, so no z-fighting at junctions.
      addQuad([-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]);
      if (mask & ROAD_BITS.north) addQuad([-hw, -0.5], [hw, -0.5], [hw, -hw], [-hw, -hw]);
      if (mask & ROAD_BITS.south) addQuad([-hw, hw], [hw, hw], [hw, 0.5], [-hw, 0.5]);
      if (mask & ROAD_BITS.east)  addQuad([hw, -hw], [0.5, -hw], [0.5, hw], [hw, hw]);
      if (mask & ROAD_BITS.west)  addQuad([-0.5, -hw], [-hw, -hw], [-hw, hw], [-0.5, hw]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'road-visual';
    mesh.receiveShadow = true;
    this.add(mesh);
  }

  _addComplexBuilding(type, level, density, w, h) {
    const footprintW = w - 0.2;
    const footprintH = h - 0.2;
    const style = this.tile.styleId || 0;
    const material = this._getMaterial(type);

    if (type === 'park') {
      this._addPark(w, h);
    } else if (['police', 'fire', 'school', 'hospital', 'power-coal', 'power-wind', 'water-pump'].includes(type)) {
      this._addCivicBuilding(type, w, h);
    } else if (type === 'industrial') {
      this._createIndustrialSprawl(footprintW, footprintH, level, density, style, material);
    } else if (density === 3 && w >= 2) {
      this._createSkyscraper(type, footprintW, footprintH, level, density, style, material);
    } else if (density === 1) {
      this._createCottage(footprintW, level, style, material);
    } else {
      this._createStandardBuilding(type, footprintW, footprintH, level, style, material);
    }
  }

  _addCivicBuilding(type, w, h) {
    const material = this._getMaterial(type);
    const geometry = this._getBasicGeometry(type);
    const height = geometry.parameters.height;
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2 + 0.01;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);

    // Roof details for civic
    const roofGeom = new THREE.BoxGeometry(w * 0.8, 0.05, h * 0.8);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + 0.03;
    this.add(roof);

    if (type === 'hospital') {
      // Red Cross on roof
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      crossH.position.y = height + 0.06;
      crossV.position.y = height + 0.06;
      this.add(crossH, crossV);
    }

    if (type === 'power-coal') {
      // Chimneys
      const chimneyGeom = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8);
      const chimneyMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
      for (let i = 0; i < 2; i++) {
        const chimney = new THREE.Mesh(chimneyGeom, chimneyMat);
        chimney.position.set(-0.5 + i * 1.0, 1.5, 0.5);
        this.add(chimney);
      }
    }

    if (type === 'power-wind') {
      // Wind Turbine Blades
      const bladeGeom = new THREE.BoxGeometry(0.1, 1.5, 0.2);
      const bladeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.y = height;
        blade.rotation.z = (i * Math.PI * 2) / 3;
        blade.position.z = 0.2;
        this.add(blade);
      }
    }

    if (type === 'water-pump') {
      // Pipes
      const pipeGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
      const pipeMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const pipe = new THREE.Mesh(pipeGeom, pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(0, 0.5, 0.6);
      this.add(pipe);
    }
  }

  _addPark(w, h) {
    const material = this._getMaterial('park');
    const geometry = new THREE.BoxGeometry(w - 0.1, 0.1, h - 0.1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.05;
    mesh.receiveShadow = true;
    this.add(mesh);

    // Add 3D Trees
    const treeCount = Math.floor(w * h * 2);
    const coneGeom = new THREE.ConeGeometry(0.15, 0.4, 8);
    const trunkGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.2);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x166534 });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const random = createSeededRandom(`park:${this.tile.x}:${this.tile.y}:${this.tile.styleId}`);

    for (let i = 0; i < treeCount; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      const leaves = new THREE.Mesh(coneGeom, leafMat);
      
      trunk.position.y = 0.1;
      leaves.position.y = 0.3;
      tree.add(trunk, leaves);
      
      // Random position within park, avoid the football pitch area (center)
      tree.position.set(
        (random() - 0.5) * (w - 0.5),
        0.05,
        (random() - 0.5) * (h - 0.5)
      );
      
      // Don't place trees in the middle if it's a large park (football pitch area)
      if (w > 1 && Math.abs(tree.position.x) < 0.4 && Math.abs(tree.position.z) < 0.4) continue;
      
      this.add(tree);
    }
  }

  _createCottage(size, level, style, material) {
    const height = 0.4 + (level * 0.2);
    const base = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), material);
    base.position.y = height / 2;
    base.castShadow = true;
    this.add(base);

    const roofGeom = new THREE.ConeGeometry(size * 0.7, 0.3, 4);
    roofGeom.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + 0.15;
    this.add(roof);
  }

  _createSkyscraper(type, w, h, level, density, style, material) {
    const baseHeight = type === 'commercial' ? 2.5 : 2.0;
    const totalHeight = (baseHeight + level * 1.5) * (density / 2);
    const tiers = w > 1 ? 3 : 2;
    
    for (let i = 0; i < tiers; i++) {
      const tierFactor = 1 - (i * 0.25);
      const tierHeight = totalHeight / tiers;
      const tierW = w * tierFactor;
      const tierH = h * tierFactor;
      
      const geom = new THREE.BoxGeometry(tierW, tierHeight, tierH);
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.y = (tierHeight / 2) + (i * tierHeight);
      mesh.castShadow = true;
      this.add(mesh);

      // Antenna/Helipad on top tier
      if (i === tiers - 1) {
        if (type === 'commercial') {
          const antennaGeom = new THREE.BoxGeometry(0.05, 1.0, 0.05);
          const antenna = new THREE.Mesh(antennaGeom, new THREE.MeshLambertMaterial({ color: 0x333333 }));
          antenna.position.y = totalHeight + 0.5;
          this.add(antenna);
        } else {
          const helipadGeom = new THREE.CircleGeometry(0.3, 16);
          const helipad = new THREE.Mesh(helipadGeom, new THREE.MeshBasicMaterial({ color: 0x333333 }));
          helipad.rotation.x = -Math.PI / 2;
          helipad.position.y = totalHeight + 0.01;
          this.add(helipad);
        }
      }
    }
  }

  _createIndustrialSprawl(w, h, level, density, style, material) {
    // Industry stays flat (max ~3 cubes high = ~1.5 units)
    const maxHeight = density === 3 ? 1.5 : 0.8;
    const height = (maxHeight / 3) * level + 0.2;
    
    // Sprawl: Create multiple connected boxes for a "factory" look
    const mainGeom = new THREE.BoxGeometry(w * 0.8, height, h * 0.8);
    const main = new THREE.Mesh(mainGeom, material);
    main.position.y = height / 2;
    main.castShadow = true;
    this.add(main);

    // Add "Vents" or silos
    if (level > 1) {
      const siloGeom = new THREE.CylinderGeometry(0.2, 0.2, height * 1.5, 8);
      const silo = new THREE.Mesh(siloGeom, material);
      silo.position.set(w * 0.3, height * 0.75, h * 0.3);
      this.add(silo);
    }
  }

  _createStandardBuilding(type, w, h, level, style, material) {
    const maxHeight = type === 'commercial' ? 3 : 2;
    const height = (maxHeight / 3) * level + 0.5;
    
    const geom = new THREE.BoxGeometry(w * 0.9, height, h * 0.9);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    this.add(mesh);

    // Roof detail
    const roofGeom = new THREE.BoxGeometry(w * 0.8, 0.05, h * 0.8);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + 0.025;
    this.add(roof);
  }

  _createOverlayMesh() {
    // Utility pole: tapered shaft + crossarm. The crossarm is oriented along
    // the road/line direction when this sits on a road (overlay), so wires
    // read as running down the line rather than across it.
    const material = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });

    const poleGeom = new THREE.CylinderGeometry(0.035, 0.07, POWER_POLE_HEIGHT, 6);
    const pole = new THREE.Mesh(poleGeom, material);
    pole.castShadow = true;
    pole.position.y = POWER_POLE_HEIGHT / 2 + 0.01;
    this.add(pole);

    const city = this.tile.city;
    let rotY = 0;
    if (city) {
      // Crossarm is perpendicular to the power span so the insulators sit
      // where the cables actually leave the pole. Road neighbours are not a
      // proxy: a line on grass has none, and a line on a road may not follow it.
      const mask = getPowerNeighborMask(city, this.tile.x, this.tile.y);
      const ns = ((mask & ROAD_BITS.north) ? 1 : 0) + ((mask & ROAD_BITS.south) ? 1 : 0);
      const ew = ((mask & ROAD_BITS.east) ? 1 : 0) + ((mask & ROAD_BITS.west) ? 1 : 0);
      if (ew > ns) rotY = Math.PI / 2;
    }

    const armGeom = new THREE.BoxGeometry(0.6, 0.05, 0.05);
    const arm = new THREE.Mesh(armGeom, material);
    arm.castShadow = true;
    arm.position.y = POWER_CROSSARM_Y + 0.01;
    arm.rotation.y = rotY;
    this.add(arm);

    // Insulators: two small dark nubs at the crossarm ends where wires hang.
    const insGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 5);
    const insMat = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
    for (const s of [1, -1]) {
      const ins = new THREE.Mesh(insGeom, insMat);
      if (rotY === 0) ins.position.set(POWER_INSULATOR_OFFSET * s, POWER_CROSSARM_Y - 0.03, 0);
      else ins.position.set(0, POWER_CROSSARM_Y - 0.03, POWER_INSULATOR_OFFSET * s);
      this.add(ins);
    }
  }

  _createServiceAlerts() {
    const power = this.tile.modules.find(m => m.name === 'Power');
    const water = this.tile.modules.find(m => m.name === 'Water');
    if (!['residential', 'commercial', 'industrial'].includes(this.tile.type)) return;

    let alertOffset = this.tile.lotSize.w > 1 ? 4.5 : 2.0;

    if (power && !power.hasPower) {
      const boltGeom = new THREE.BoxGeometry(0.1, 0.4, 0.1);
      const boltMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const bolt = new THREE.Mesh(boltGeom, boltMat);
      bolt.position.set(0.2, alertOffset, 0);
      bolt.rotation.z = 0.3;
      this.add(bolt);
    }

    if (water && !water.hasWater) {
      const dropGeom = new THREE.OctahedronGeometry(0.15);
      const dropMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
      const drop = new THREE.Mesh(dropGeom, dropMat);
      drop.position.set(-0.2, alertOffset, 0);
      this.add(drop);
    }
  }

  _getBasicGeometry(type) {
    switch (type) {
      case 'road': return new THREE.BoxGeometry(1, 0.05, 1);
      case 'highway': return new THREE.BoxGeometry(1, 0.1, 1);
      case 'power-coal': return new THREE.BoxGeometry(2.2, 1.5, 2.2);
      case 'power-wind': return new THREE.BoxGeometry(0.3, 3.5, 0.3);
      case 'water-pump': return new THREE.BoxGeometry(1.2, 1, 1.2);
      case 'bus-stop': return new THREE.BoxGeometry(0.4, 0.3, 0.2);
      case 'police': return new THREE.BoxGeometry(1.5, 1.2, 1.5);
      case 'fire': return new THREE.BoxGeometry(1.5, 1.2, 1.5);
      case 'school': return new THREE.BoxGeometry(1.8, 0.8, 1.8);
      case 'hospital': return new THREE.BoxGeometry(1.8, 2.0, 1.8);
      case 'park': return new THREE.BoxGeometry(1.8, 0.1, 1.8);
      case 'water': return new THREE.BoxGeometry(1, 0.05, 1);
      default: return new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }
  }

  _getMaterial(type, isLot = false) {
    return materials.getMaterial(type, this.tile.abandoned, isLot);
  }

  update() {
    const power = this.tile.modules.find(m => m.name === 'Power')?.hasPower ?? true;
    const water = this.tile.modules.find(m => m.name === 'Water')?.hasWater ?? true;

    if (this.developmentLevel !== this.tile.developmentLevel || 
        this.abandoned !== this.tile.abandoned ||
        this.hasPower !== power ||
        this.hasWater !== water ||
        this.isAnchor !== this.tile.isAnchor ||
        this.lotSize.w !== this.tile.lotSize.w) {
      
      this.developmentLevel = this.tile.developmentLevel;
      this.abandoned = this.tile.abandoned;
      this.hasPower = power;
      this.hasWater = water;
      this.isAnchor = this.tile.isAnchor;
      this.lotSize = { ...this.tile.lotSize };
      this._updatePosition();
      this.updateMesh();
    }
  }

  updateTrafficColor(congestion) {
    if (!this.children || this.children.length === 0) return;
    let mesh = null;
    this.traverse(child => {
      if (!mesh && child.isMesh && child.material) mesh = child;
    });
    if (!mesh || !mesh.material.color) return;

    // Clone the material if it hasn't been cloned yet so we don't modify the global cache
    if (!mesh.userData.hasClonedMaterial) {
      mesh.material = mesh.material.clone();
      mesh.userData.hasClonedMaterial = true;
    }

    // Base road color: 0x333333 (rgb: 51, 51, 51)
    // Max congestion color: 0xff0000 (rgb: 255, 0, 0)
    // Cap congestion at 150 for color scaling
    const t = Math.min(1.0, congestion / 150);
    
    // Lerp from #333333 to #ff0000
    const r = 51 + (255 - 51) * t;
    const g = 51 + (0 - 51) * t;
    const b = 51 + (0 - 51) * t;

    mesh.material.color.setRGB(r / 255, g / 255, b / 255);
  }
}
