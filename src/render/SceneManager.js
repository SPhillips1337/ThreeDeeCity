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
    
    // Disable left click rotation to allow tool usage
    this.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE
    };
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

  update(city) {
    this.controls.update();
    
    // Only update objects that actually changed
    for (let x = 0; x < this.objects.length; x++) {
      for (let y = 0; y < this.objects[x].length; y++) {
        const tile = city.grid[x][y];
        const obj = this.objects[x][y];
        
        if (obj && obj.level !== tile.level) {
          this.updateTileVisuals(x, y, tile);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  initObjects(city) {
    for (let x = 0; x < city.size.width; x++) {
      this.objects[x] = [];
      for (let y = 0; y < city.size.height; y++) {
        this.objects[x][y] = null; // Initially null for grass
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
    }
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
    preview.position.set(x - 16 + 0.5, 0.05, y - 16 + 0.5);
    this.previewGroup.add(preview);
  }

  createPreviewMesh(toolId) {
    let color = 0xffffff;
    if (toolId === 'tool-residential') color = 0x4ade80;
    if (toolId === 'tool-commercial') color = 0x60a5fa;
    if (toolId === 'tool-industrial') color = 0xfacc15;
    if (toolId === 'tool-road') color = 0x444444;
    if (toolId === 'tool-bulldoze') color = 0xef4444;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.1, 0.9),
      new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.5 })
    );
    return mesh;
  }
}
