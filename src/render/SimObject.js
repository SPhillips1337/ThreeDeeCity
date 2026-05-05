import * as THREE from 'three';
import { materials } from './MaterialManager.js';

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
    this.position.set(this.tile.x - 16 + 0.5 + offsetX, 0, this.tile.y - 16 + 0.5 + offsetZ);
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

    if (level === 0 && ['residential', 'commercial', 'industrial'].includes(type)) {
      // Zoned lot: flat translucent area matching lot size
      const geometry = new THREE.BoxGeometry(w - 0.1, 0.05, h - 0.1);
      const material = this._getMaterial(type, true);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0.03;
      this.add(mesh);
      return;
    }

    if (['residential', 'commercial', 'industrial'].includes(type)) {
      this._addComplexBuilding(type, level, density, w, h);
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

  _addComplexBuilding(type, level, density, w, h) {
    const footprintW = w - 0.2;
    const footprintH = h - 0.2;
    const style = this.tile.styleId || 0;
    const material = this._getMaterial(type);

    if (type === 'industrial') {
      this._createIndustrialSprawl(footprintW, footprintH, level, density, style, material);
    } else if (density === 3 && w >= 2) {
      this._createSkyscraper(type, footprintW, footprintH, level, density, style, material);
    } else if (density === 1) {
      this._createCottage(footprintW, level, style, material);
    } else {
      this._createStandardBuilding(type, footprintW, footprintH, level, style, material);
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
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
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
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + 0.025;
    this.add(roof);
  }

  _createOverlayMesh() {
    const geometry = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    const material = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.y = 0.65;
    this.add(mesh);

    const armGeom = new THREE.BoxGeometry(0.6, 0.05, 0.05);
    const arm = new THREE.Mesh(armGeom, material);
    arm.position.y = 1.0;
    this.add(arm);
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
    const mesh = this.children.find(c => c.isMesh && c.material);
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
