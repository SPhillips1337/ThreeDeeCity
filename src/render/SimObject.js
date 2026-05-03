import * as THREE from 'three';

export class SimObject extends THREE.Group {
  constructor(tile) {
    super();
    this.tile = tile;
    this.developmentLevel = tile.developmentLevel;
    this.abandoned = tile.abandoned;
    this.position.set(tile.x - 16 + 0.5, 0, tile.y - 16 + 0.5);
    
    this.mesh = null;
    this.updateMesh();
  }

  updateMesh() {
    // Remove old mesh and geometry/material to free memory
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.remove(this.mesh);
    }

    if (this.tile.type === 'grass') return;

    const geometry = this.getGeometry();
    const material = this.getMaterial();
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Position mesh above ground
    this.mesh.position.y = geometry.parameters.height / 2 + 0.05;
    
    this.add(this.mesh);
  }

  getGeometry() {
    const level = this.tile.developmentLevel || 0;
    switch (this.tile.type) {
      case 'road':
        return new THREE.BoxGeometry(1, 0.1, 1);
      case 'residential':
        if (level === 0) return new THREE.BoxGeometry(0.9, 0.05, 0.9); // Zoned but empty
        return new THREE.BoxGeometry(0.8, 0.5 + level * 0.5, 0.8);
      case 'commercial':
        if (level === 0) return new THREE.BoxGeometry(0.9, 0.05, 0.9);
        return new THREE.BoxGeometry(0.8, 0.8 + level * 0.8, 0.8);
      case 'industrial':
        if (level === 0) return new THREE.BoxGeometry(0.9, 0.05, 0.9);
        return new THREE.BoxGeometry(0.9, 0.4 + level * 0.4, 0.9);
      default:
        return new THREE.BoxGeometry(0.1, 0.1, 0.1); // Hidden for grass
    }
  }

  getMaterial() {
    if (this.tile.abandoned) {
      return new THREE.MeshPhongMaterial({ color: 0x555555 });
    }

    const level = this.tile.developmentLevel || 0;
    const opacity = level === 0 ? 0.3 : 1.0;

    switch (this.tile.type) {
      case 'road':
        return new THREE.MeshPhongMaterial({ color: 0x333333 });
      case 'residential':
        return new THREE.MeshPhongMaterial({ color: 0x4ade80, transparent: level === 0, opacity });
      case 'commercial':
        return new THREE.MeshPhongMaterial({ color: 0x60a5fa, transparent: level === 0, opacity });
      case 'industrial':
        return new THREE.MeshPhongMaterial({ color: 0xfacc15, transparent: level === 0, opacity });
      default:
        return new THREE.MeshPhongMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0 });
    }
  }

  update() {
    // No-op for now, mesh is updated via updateMesh() when level changes
  }
}
