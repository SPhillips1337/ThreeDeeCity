import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimObject } from './SimObject.js';

export class SceneManager {
  constructor(city) {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a0c');

    this.setupCamera();
    this.setupLights();
    this.setupGrid(city);
    
    this.objects = []; // 2D array of SimObjects
    this.currentDataView = 'none';
    this.initObjects(city);

    this.selectionMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
    );
    this.selectionMesh.rotation.x = -Math.PI / 2;
    this.selectionMesh.position.y = 0.02;
    this.selectionMesh.visible = false;
    this.scene.add(this.selectionMesh);

    this.previewGroup = new THREE.Group();
    this.scene.add(this.previewGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
  }

  setPanEnabled(enabled) {
    this.controls.mouseButtons.LEFT = enabled ? THREE.MOUSE.PAN : null;
  }

  reset(city) {
    // Remove all simulation objects
    for (let x = 0; x < this.objects.length; x++) {
      for (let y = 0; y < this.objects[x].length; y++) {
        if (this.objects[x][y]) {
          this.scene.remove(this.objects[x][y]);
        }
      }
    }
    this.objects = [];
    this.initObjects(city);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(40, 40, 40);
    this.camera.lookAt(0, 0, 0);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased from 0.5
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2); // Increased from 1.0
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    this.scene.add(sun);
  }

  setupGrid(city) {
    const gridHelper = new THREE.GridHelper(city.size.width, city.size.width, 0x444444, 0x222222);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    const terrainGeometry = new THREE.PlaneGeometry(city.size.width, city.size.height);
    const terrainMaterial = new THREE.MeshPhongMaterial({ color: 0x3a5a3a }); // More vibrant grass green
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, 0, 0);
    terrain.receiveShadow = true;
    terrain.name = 'terrain'; // Name for raycasting
    this.scene.add(terrain);
  }

  getGridPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);

    const terrainIntersect = intersects.find(i => i.object.name === 'terrain');
    if (terrainIntersect) {
      // Convert world position back to grid indices
      const x = Math.floor(terrainIntersect.point.x + 16);
      const y = Math.floor(terrainIntersect.point.z + 16);
      return { x, y };
    }
    return null;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(city, keys = {}) {
    this.handleKeyboard(keys);
    
    if (this.tourMode) {
      // Move camera towards tourNextTarget
      const speed = 0.08;
      const dir = new THREE.Vector3().subVectors(this.tourNextTarget, this.camera.position);
      const dist = dir.length();
      
      if (dist < 0.1) {
        // We reached the target, pick next
        const cx = Math.floor(this.tourNextTarget.x + 16);
        const cy = Math.floor(this.tourNextTarget.z + 16);
        
        // Find adjacent roads
        const adj = [];
        const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
        for (let d of dirs) {
          const nx = cx + d[0];
          const ny = cy + d[1];
          if (nx >= 0 && nx < city.size.width && ny >= 0 && ny < city.size.height) {
            if (city.grid[nx][ny].type === 'road') {
              const pos = new THREE.Vector3(nx - 16 + 0.5, 0.5, ny - 16 + 0.5);
              // don't go backwards immediately if there's another option
              if (pos.distanceTo(this.tourCurrentTarget) > 0.5) { 
                adj.push({ pos, nx, ny });
              }
            }
          }
        }
        
        if (adj.length > 0) {
          this.tourCurrentTarget = this.tourNextTarget.clone();
          this.tourNextTarget = adj[Math.floor(Math.random() * adj.length)].pos;
        } else {
          // Dead end, just turn around
          const temp = this.tourNextTarget.clone();
          this.tourNextTarget = this.tourCurrentTarget.clone();
          this.tourCurrentTarget = temp;
        }
      } else {
        dir.normalize();
        this.camera.position.addScaledVector(dir, speed);
        // Look slightly ahead
        const lookAtTarget = this.camera.position.clone().add(dir.multiplyScalar(2));
        this.controls.target.lerp(lookAtTarget, 0.1);
      }
    }

    this.controls.update();
    
    // Only update objects that actually changed
    for (let x = 0; x < this.objects.length; x++) {
      for (let y = 0; y < this.objects[x].length; y++) {
        const tile = city.grid[x][y];
        const obj = this.objects[x][y];
        
        if (obj && (obj.developmentLevel !== tile.developmentLevel || obj.abandoned !== tile.abandoned)) {
          this.updateTileVisuals(x, y, tile);
        } else if (obj) {
          if (tile.type === 'road' || tile.type === 'highway') {
            const traffic = tile.modules.find(m => m.name === 'Traffic');
            if (traffic && this.currentDataView === 'none') {
              obj.updateTrafficColor(traffic.congestion);
            }
          }
          if (this.currentDataView !== 'none') {
            this.applyDataViewTint(obj, tile);
          }
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  handleKeyboard(keys) {
    const moveSpeed = 0.5;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, this.camera.up);

    if (keys['KeyW']) {
      this.camera.position.addScaledVector(forward, moveSpeed);
      this.controls.target.addScaledVector(forward, moveSpeed);
    }
    if (keys['KeyS']) {
      this.camera.position.addScaledVector(forward, -moveSpeed);
      this.controls.target.addScaledVector(forward, -moveSpeed);
    }
    if (keys['KeyA']) {
      this.camera.position.addScaledVector(right, -moveSpeed);
      this.controls.target.addScaledVector(right, -moveSpeed);
    }
    if (keys['KeyD']) {
      this.camera.position.addScaledVector(right, moveSpeed);
      this.controls.target.addScaledVector(right, moveSpeed);
    }

    // Rotation (Q/E)
    const rotationSpeed = 0.03;
    if (keys['KeyQ'] || keys['KeyE']) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const angle = keys['KeyQ'] ? rotationSpeed : -rotationSpeed;
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      this.camera.position.copy(this.controls.target).add(offset);
    }
  }

  initObjects(city) {
    for (let x = 0; x < city.size.width; x++) {
      this.objects[x] = [];
      for (let y = 0; y < city.size.height; y++) {
        this.objects[x][y] = null; // Initially null for grass
        if (city.grid[x][y].type !== 'grass') {
          this.updateTileVisuals(x, y, city.grid[x][y]);
        }
      }
    }
  }

  updateTileVisuals(x, y, tile) {
    if (this.objects[x][y]) {
      this.scene.remove(this.objects[x][y]);
      this.objects[x][y] = null;
    }

    if (tile.type !== 'grass') {
      const obj = new SimObject(tile);
      this.objects[x][y] = obj;
      this.scene.add(obj);
      this.applyDataViewTint(obj, tile);
    }
  }

  setDataView(viewName, city) {
    this.currentDataView = viewName;
    for (let x = 0; x < this.objects.length; x++) {
      for (let y = 0; y < this.objects[x].length; y++) {
        const obj = this.objects[x][y];
        const tile = city.grid[x][y];
        if (obj) {
          this.applyDataViewTint(obj, tile);
        }
      }
    }
  }

  applyDataViewTint(obj, tile) {
    if (!obj.children || obj.children.length === 0) return;
    
    // We only want to tint the main building meshes, not overlays/alerts
    obj.children.forEach(mesh => {
      if (!mesh.isMesh) return;
      
      // Reset color to base material if view is 'none'
      if (this.currentDataView === 'none') {
        const isLot = (tile.developmentLevel === 0) && ['residential', 'commercial', 'industrial'].includes(tile.type);
        mesh.material = obj._getMaterial(tile.type, isLot);
        return;
      }

      // If it's an overlay or alert (e.g. power-line), don't tint it in data views
      if (mesh.geometry.type !== 'BoxGeometry' && mesh.geometry.type !== 'CylinderGeometry') return;

      let hasCoverage = false;
      let tintColor = 0x000000;

      if (this.currentDataView === 'power') {
        const mod = tile.modules.find(m => m.name === 'Power');
        hasCoverage = mod && mod.hasPower;
        tintColor = 0xfacc15; // Yellow
      } else if (this.currentDataView === 'water') {
        const mod = tile.modules.find(m => m.name === 'Water');
        hasCoverage = mod && mod.hasWater;
        tintColor = 0x3b82f6; // Blue
      } else {
        // Civic Services
        const services = tile.modules.find(m => m.name === 'Services');
        if (services) {
          hasCoverage = services.coverage[this.currentDataView];
          const colors = {
            police: 0x1e3a8a,
            fire: 0x991b1b,
            school: 0xca8a04,
            hospital: 0xf8fafc,
            park: 0x16a34a
          };
          tintColor = colors[this.currentDataView] || 0xffffff;
        }
      }

      const color = hasCoverage ? tintColor : 0x555555;
      mesh.material = new THREE.MeshBasicMaterial({ color });
    });
  }

  updateSelection(pos) {
    this.selectionMesh.position.set(pos.x - 16 + 0.5, 0.02, pos.y - 16 + 0.5);
    this.selectionMesh.visible = true;
  }

  hideSelection() {
    this.selectionMesh.visible = false;
    this.clearPreview();
  }

  clearPreview() {
    while (this.previewGroup.children.length > 0) {
      const child = this.previewGroup.children[0];
      child.geometry.dispose();
      child.material.dispose();
      this.previewGroup.remove(child);
    }
  }

  updatePreviewSingle(pos, toolId) {
    this.clearPreview();
    const preview = this.createPreviewMesh(toolId);
    if (!preview) return;
    preview.position.set(pos.x - 16 + 0.5, 0.05, pos.y - 16 + 0.5);
    this.previewGroup.add(preview);
  }

  updatePreviewArea(start, end, toolId) {
    this.clearPreview();
    
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    if (toolId === 'tool-road') {
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      if (dx > dy) {
        for (let x = minX; x <= maxX; x++) this.addPreviewAt(x, start.y, toolId);
      } else {
        for (let y = minY; y <= maxY; y++) this.addPreviewAt(start.x, y, toolId);
      }
    } else {
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          this.addPreviewAt(x, y, toolId);
        }
      }
    }
  }

  addPreviewAt(x, y, toolId) {
    const preview = this.createPreviewMesh(toolId);
    if (!preview) return;
    preview.position.set(x - 16 + 0.5, 0.05, y - 16 + 0.5);
    this.previewGroup.add(preview);
  }

  createPreviewMesh(toolId) {
    if (toolId === 'tool-select') return null;

    let color = 0xffffff;
    if (toolId.includes('residential')) color = 0x4ade80;
    if (toolId.includes('commercial')) color = 0x60a5fa;
    if (toolId.includes('industrial')) color = 0xfacc15;
    if (toolId === 'tool-road') color = 0x444444;
    if (toolId === 'tool-bulldoze') color = 0xef4444;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.1, 0.9),
      new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.5 })
    );
    return mesh;
  }

  toggleTourMode(city) {
    this.tourMode = !this.tourMode;
    
    if (this.tourMode) {
      // Find all road tiles
      this.tourRoads = [];
      for (let x = 0; x < city.size.width; x++) {
        for (let y = 0; y < city.size.height; y++) {
          if (city.grid[x][y].type === 'road') {
            this.tourRoads.push({x, y});
          }
        }
      }
      
      if (this.tourRoads.length === 0) {
        this.tourMode = false;
        console.warn("No roads to tour!");
        return;
      }
      
      // Save original camera position/target
      this.originalCameraPos = this.camera.position.clone();
      this.originalControlsTarget = this.controls.target.clone();
      
      // Pick a random starting road
      const start = this.tourRoads[Math.floor(Math.random() * this.tourRoads.length)];
      this.tourCurrentTarget = new THREE.Vector3(start.x - 16 + 0.5, 0.5, start.y - 16 + 0.5);
      
      // Find initial next target
      const adj = [];
      const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
      for (let d of dirs) {
        const nx = start.x + d[0];
        const ny = start.y + d[1];
        if (nx >= 0 && nx < city.size.width && ny >= 0 && ny < city.size.height) {
          if (city.grid[nx][ny].type === 'road') {
            adj.push(new THREE.Vector3(nx - 16 + 0.5, 0.5, ny - 16 + 0.5));
          }
        }
      }
      
      this.tourNextTarget = adj.length > 0 ? adj[Math.floor(Math.random() * adj.length)] : this.tourCurrentTarget;
      
      this.camera.position.copy(this.tourCurrentTarget);
      this.controls.target.copy(this.tourNextTarget);
      
      this.controls.minDistance = 0.1;
      this.controls.maxDistance = 100;
      this.controls.maxPolarAngle = Math.PI; // allow looking around freely
      
      document.getElementById('tool-tour').classList.add('active');
    } else {
      // Restore camera
      this.camera.position.copy(this.originalCameraPos);
      this.controls.target.copy(this.originalControlsTarget);
      
      this.controls.minDistance = 10;
      this.controls.maxDistance = 100;
      this.controls.maxPolarAngle = Math.PI / 2.1;
      
      document.getElementById('tool-tour').classList.remove('active');
    }
  }
}
