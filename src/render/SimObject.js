import * as THREE from 'three';

export class SimObject extends THREE.Group {
  constructor(tile) {
    super();
    this.tile = tile;
    this.level = tile.level;
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
    switch (this.tile.type) {
      case 'road':
        return new THREE.BoxGeometry(1, 0.1, 1);
      case 'residential':
        return new THREE.BoxGeometry(0.8, 0.5 + this.tile.level * 0.5, 0.8);
      case 'commercial':
        return new THREE.BoxGeometry(0.8, 0.8 + this.tile.level * 0.8, 0.8);
      case 'industrial':
        return new THREE.BoxGeometry(0.9, 0.4 + this.tile.level * 0.4, 0.9);
      default:
        return new THREE.BoxGeometry(0.1, 0.1, 0.1); // Hidden for grass
    }
  }

  getMaterial() {
    switch (this.tile.type) {
      case 'road':
        return new THREE.MeshPhongMaterial({ color: 0x333333 });
      case 'residential':
        return new THREE.MeshPhongMaterial({ color: 0x4ade80 }); // Vibrant green
      case 'commercial':
        return new THREE.MeshPhongMaterial({ color: 0x60a5fa }); // Vibrant blue
      case 'industrial':
        return new THREE.MeshPhongMaterial({ color: 0xfacc15 }); // Vibrant yellow
      default:
        return new THREE.MeshPhongMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0 });
    }
  }

  update() {
    // No-op for now, mesh is updated via updateMesh() when level changes
  }
}
