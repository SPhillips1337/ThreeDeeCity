import * as THREE from 'three';

class MaterialManager {
  constructor() {
    this.cache = {};
  }

  getMaterial(type, isAbandoned, isLot = false) {
    const key = `${type}-${isAbandoned}-${isLot}`;
    if (this.cache[key]) return this.cache[key];

    const colors = { 
      residential: '#4ade80', 
      commercial: '#60a5fa', 
      industrial: '#facc15', 
      road: '#333333',
      'power-coal': '#222222',
      'power-wind': '#dddddd',
      'water-pump': '#3b82f6',
      'police': '#1e3a8a',
      'fire': '#991b1b',
      'school': '#ca8a04',
      'hospital': '#f8fafc',
      'park': '#16a34a',
      'water': '#0ea5e9' // Water color
    };

    if (isLot) {
      const colorHex = parseInt((colors[type] || '#888888').replace('#', '0x'));
      const mat = new THREE.MeshPhongMaterial({ color: colorHex, transparent: true, opacity: 0.4 });
      this.cache[key] = mat;
      return mat;
    }

    const isBuilding = ['residential', 'commercial', 'industrial'].includes(type);
    
    if (isBuilding) {
      const color = isAbandoned ? '#555555' : colors[type];
      const windowColor = isAbandoned ? '#111111' : (type === 'commercial' ? '#e0f2fe' : '#fef08a');
      
      const sideTex = this.createWindowTexture(color, windowColor, isAbandoned);
      const topTex = this.createRoofTexture(color);

      const sideMat = new THREE.MeshPhongMaterial({ map: sideTex });
      const topMat = new THREE.MeshPhongMaterial({ map: topTex });
      
      const materials = [
        sideMat, // right
        sideMat, // left
        topMat,  // top
        sideMat, // bottom
        sideMat, // front
        sideMat  // back
      ];
      this.cache[key] = materials;
      return materials;
    }

    const colorHex = parseInt((colors[type] || '#888888').replace('#', '0x'));
    const mat = new THREE.MeshPhongMaterial({ color: isAbandoned ? 0x555555 : colorHex });
    this.cache[key] = mat;
    return mat;
  }

  createWindowTexture(baseColor, windowColor, isAbandoned) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    
    // Noise
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for(let i=0; i<1000; i++) {
      ctx.fillRect(Math.random()*256, Math.random()*256, 2, 2);
    }

    // Windows
    const cols = 6;
    const rows = 8;
    const wWidth = 16;
    const wHeight = 20;
    const spacingX = 256 / cols;
    const spacingY = 256 / rows;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * spacingX + (spacingX - wWidth) / 2;
        const y = r * spacingY + (spacingY - wHeight) / 2;
        
        if (!isAbandoned && Math.random() > 0.4) {
          ctx.fillStyle = windowColor;
        } else {
          ctx.fillStyle = '#1a1a1a';
        }
        ctx.fillRect(x, y, wWidth, wHeight);
      }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  createRoofTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; // Darken
    ctx.fillRect(0, 0, 128, 128);
    
    // Border
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);
    
    // HVAC / Details
    ctx.fillStyle = '#555';
    ctx.fillRect(20, 20, 20, 20);
    ctx.fillRect(80, 80, 15, 25);
    
    return new THREE.CanvasTexture(canvas);
  }
}

export const materials = new MaterialManager();
