import * as THREE from 'three';

export class SimObject extends THREE.Group {
  constructor(tile) {
    super();
    this.tile = tile;
    this.developmentLevel = tile.developmentLevel;
    this.abandoned = tile.abandoned;
    this.position.set(tile.x - 16 + 0.5, 0, tile.y - 16 + 0.5);
    
    this.mainMesh = null;
    this.overlayMesh = null;
    this.updateMesh();
  }

  updateMesh() {
    // Clear all existing meshes
    while(this.children.length > 0) { 
      const obj = this.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.remove(obj); 
    }

    // 1. Render Main Tile
    if (this.tile.type !== 'grass') {
      const geometry = this.getGeometry(this.tile.type);
      const material = this.getMaterial(this.tile.type);
      
      this.mainMesh = new THREE.Mesh(geometry, material);
      this.mainMesh.castShadow = true;
      this.mainMesh.receiveShadow = true;
      this.mainMesh.position.y = geometry.parameters.height / 2 + 0.01;
      this.add(this.mainMesh);
    }

    // 2. Render Overlay (e.g. Power Line over Road)
    if (this.tile.overlay === 'power-line') {
      const geometry = new THREE.BoxGeometry(0.1, 1.2, 0.1);
      const material = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
      
      this.overlayMesh = new THREE.Mesh(geometry, material);
      this.overlayMesh.castShadow = true;
      this.overlayMesh.position.y = geometry.parameters.height / 2 + 0.05;
      this.add(this.overlayMesh);
    }
  }


  getGeometry(type = this.tile.type) {
    const level = this.tile.developmentLevel || 0;
    const density = this.tile.density || 1; // 1:light, 2:medium, 3:heavy
    switch (type) {
      case 'road':
        return new THREE.BoxGeometry(1, 0.05, 1);
      case 'highway':
        return new THREE.BoxGeometry(1, 0.1, 1);
      case 'bus-stop':
        return new THREE.BoxGeometry(0.4, 0.3, 0.2);
      case 'rail-line':
        return new THREE.BoxGeometry(1, 0.1, 0.4);
      case 'rail-station':
        return new THREE.BoxGeometry(1.5, 1, 1.5);
      case 'power-line':
        return new THREE.BoxGeometry(0.1, 1.2, 0.1);
      case 'power-coal':
        return new THREE.BoxGeometry(2, 2, 2);
      case 'power-wind':
        return new THREE.BoxGeometry(0.2, 3, 0.2);
      case 'water-pump':
        return new THREE.BoxGeometry(1, 0.8, 1);
      case 'residential':
      case 'commercial':
      case 'industrial':
        if (level === 0) return new THREE.BoxGeometry(0.9, 0.05, 0.9); // Zoned, empty lot
        return this._getBuildingGeometry(type, level, density);
      default:
        return new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }
  }

  /**
   * Returns a BoxGeometry sized by zone type, development level, and density.
   * Level 1 = small/new. Level 3 = fully developed.
   * Density 1=light, 2=medium, 3=heavy.
   */
  _getBuildingGeometry(type, level, density) {
    // Footprint: heavier density = wider building within the tile
    const footprintByDensity = [0, 0.45, 0.65, 0.85]; // index 0 unused
    const footprint = footprintByDensity[density];

    let height;
    if (type === 'residential') {
      // Light: cottages/townhouses (max ~2 storeys)
      // Medium: apartment blocks (max ~5 storeys)
      // Heavy: skyscrapers (max ~12 storeys)
      const maxHeight = [0, 1.0, 3.0, 8.0][density];
      height = (maxHeight / 3) * level;
    } else if (type === 'commercial') {
      // Light: small shops/strip malls
      // Medium: mid-rise offices
      // Heavy: glass towers
      const maxHeight = [0, 1.2, 4.0, 10.0][density];
      height = (maxHeight / 3) * level;
    } else { // industrial
      // Industry doesn't go tall — it goes wide. Heights stay modest.
      const maxHeight = [0, 0.6, 1.0, 1.4][density];
      // Footprint is bigger for heavy industry (sprawling factories)
      const indFootprint = footprintByDensity[density] + (density === 3 ? 0.1 : 0);
      return new THREE.BoxGeometry(indFootprint, maxHeight, indFootprint);
    }

    height = Math.max(0.2, height); // minimum visible height
    return new THREE.BoxGeometry(footprint, height, footprint);
  }

  getMaterial(type = this.tile.type) {
    if (this.tile.abandoned) {
      return new THREE.MeshPhongMaterial({ color: 0x555555 });
    }

    const level = this.tile.developmentLevel || 0;
    const opacity = level === 0 ? 0.3 : 1.0;

    // Infrastructure status colors
    const hasPower = this.tile.power ? this.tile.power.hasPower : true;
    const hasWater = this.tile.water ? this.tile.water.hasWater : true;

    switch (type) {
      case 'road':
      case 'highway':
        const baseColor = type === 'road' ? new THREE.Color(0x333333) : new THREE.Color(0x111111);
        const traffic = this.tile.modules.find(m => m.name === 'Traffic');
        if (traffic && traffic.congestion > 0) {
          const congestionFactor = Math.min(1, traffic.congestion / 100);
          baseColor.lerp(new THREE.Color(0xef4444), congestionFactor); // Fade to red
        }
        return new THREE.MeshPhongMaterial({ color: baseColor });
      case 'bus-stop':
        return new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
      case 'rail-line':
        return new THREE.MeshPhongMaterial({ color: 0x94a3b8 });
      case 'rail-station':
        return new THREE.MeshPhongMaterial({ color: 0x475569 });
      case 'power-line':
        return new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      case 'power-coal':
        return new THREE.MeshPhongMaterial({ color: 0x222222 });
      case 'power-wind':
        return new THREE.MeshPhongMaterial({ color: 0xeeeeee });
      case 'water-pump':
        return new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
      case 'residential':
        let rColor = 0x4ade80;
        if (!hasPower) rColor = 0xef4444; // Red for no power
        else if (!hasWater) rColor = 0xf59e0b; // Orange for no water
        return new THREE.MeshPhongMaterial({ color: rColor, transparent: level === 0, opacity });
      case 'commercial':
        let cColor = 0x60a5fa;
        if (!hasPower) cColor = 0xef4444;
        else if (!hasWater) cColor = 0xf59e0b;
        return new THREE.MeshPhongMaterial({ color: cColor, transparent: level === 0, opacity });
      case 'industrial':
        let iColor = 0xfacc15;
        if (!hasPower) iColor = 0xef4444;
        else if (!hasWater) iColor = 0xf59e0b;
        return new THREE.MeshPhongMaterial({ color: iColor, transparent: level === 0, opacity });
      default:
        return new THREE.MeshPhongMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0 });
    }
  }

  update() {
    // No-op for now, mesh is updated via updateMesh() when level changes
  }
}
