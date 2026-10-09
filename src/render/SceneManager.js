import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SimObject } from './SimObject.js';
import { ParticleSystem } from './ParticleSystem.js';
import { buildTerrainGeometry, createWaterSurface, getTileSurfaceHeight } from './TerrainSurface.js';
import { VEGETATION_BUDGETS, planVegetation } from './VegetationPlanner.js';
import { clampPanTarget, deriveInitialCameraFrame } from './CameraRig.js';
import { collectRendererDiagnostics, disposeObject3D } from './RenderDiagnostics.js';

export class SceneManager {
  constructor(city) {
    this.city = city;
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9fb7c9');
    this.scene.fog = new THREE.FogExp2(0x9fb7c9, 0.018);

    // RoomEnvironment — free PBR environment reflections, no HDRI needed
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.scene.environment = this.pmremGenerator.fromScene(
      new RoomEnvironment(), 0.035
    ).texture;

    this.setupCamera();
    this.setupLights();
    this.setupGrid(city);
    
    this.objects = []; // 2D array of SimObjects
    this.currentDataView = 'none';
    this.initObjects(city);
    this.vegetationQuality = 'medium';
    this.vegetationDirty = true;
    this.rebuildVegetation();

    this.selectionMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
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
    const frame = deriveInitialCameraFrame(city);
    this.controls.target.set(frame.target.x, frame.target.y, frame.target.z);
    this.controls.minDistance = frame.controls.minDistance;
    this.controls.maxDistance = frame.controls.maxDistance;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };

    this.particles = new ParticleSystem(this.scene, 400);

    // === Vignette overlay (2D quad in front of camera) ===
    {
      const vc = document.createElement('canvas');
      vc.width = 512;
      vc.height = 512;
      const vCtx = vc.getContext('2d');
      const grad = vCtx.createRadialGradient(256, 256, 120, 256, 256, 340);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.55)');
      vCtx.fillStyle = grad;
      vCtx.fillRect(0, 0, 512, 512);
      const vTex = new THREE.CanvasTexture(vc);
      const vMat = new THREE.MeshBasicMaterial({
        map: vTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const vGeom = new THREE.PlaneGeometry(2, 2);
      this.vignetteMesh = new THREE.Mesh(vGeom, vMat);
      this.vignetteMesh.frustumCulled = false;
      this.vignetteMesh.renderOrder = 9999;
      this.camera.add(this.vignetteMesh);
    }
  }

    setPanEnabled(enabled) {
    this.controls.mouseButtons.LEFT = enabled ? THREE.MOUSE.PAN : null;
  }

  setVignetteEnabled(v) {
    if (this.vignetteMesh) this.vignetteMesh.visible = v;
  }

  reset(city) {
    this.city = city;
    // Remove all simulation objects
    for (let x = 0; x < this.objects.length; x++) {
      for (let y = 0; y < this.objects[x].length; y++) {
        if (this.objects[x][y]) {
          disposeObject3D(this.objects[x][y]);
          this.scene.remove(this.objects[x][y]);
        }
      }
    }
    this.objects = [];
    this.setupGrid(city);
    this.initObjects(city);
    this.vegetationDirty = true;
    this.rebuildVegetation();
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const frame = deriveInitialCameraFrame(this.city);
    this.camera.position.set(frame.position.x, frame.position.y, frame.position.z);
    this.camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    ambientLight.userData.isToggleable = true;
    this.scene.add(ambientLight);

    const hemi = new THREE.HemisphereLight(0xb7d9ff, 0x4f6f45, 0.5);
    hemi.userData.isToggleable = true;
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4dc, 1.35);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.userData.isToggleable = true;
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x9ec5ff, 0.42);
    rim.position.set(-30, 10, -40);
    rim.userData.isRimLight = true;   // lights-toggle keeps this on
    this.scene.add(rim);
  }

  setupGrid(city) {
    for (const surface of [this.terrain, this.waterSurface]) {
      if (!surface) continue;
      this.scene.remove(surface);
      surface.geometry.dispose();
      surface.material.dispose();
    }

    const terrainGeometry = buildTerrainGeometry(city);
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
      flatShading: false,
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, 0, 0);
    terrain.receiveShadow = true;
    terrain.name = 'terrain'; // Name for raycasting
    this.scene.add(terrain);
    this.terrain = terrain;

    this.waterSurface = createWaterSurface(city);
    this.scene.add(this.waterSurface);
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
          this.tourNextTarget = adj[Math.floor(this.city.random() * adj.length)].pos;
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
    if (this.vegetationDirty) this.rebuildVegetation();
    
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

    this.particles.update();

    this.renderer.render(this.scene, this.camera);
    this.renderDiagnostics = collectRendererDiagnostics(this.renderer);
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

    const clamped = clampPanTarget(this.city, this.controls.target, 0);
    const delta = new THREE.Vector3(
      clamped.x - this.controls.target.x,
      clamped.y - this.controls.target.y,
      clamped.z - this.controls.target.z,
    );
    if (delta.lengthSq() > 0) {
      this.controls.target.set(clamped.x, clamped.y, clamped.z);
      this.camera.position.add(delta);
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
        if (!['grass', 'water'].includes(city.grid[x][y].type)) {
          this.updateTileVisuals(x, y, city.grid[x][y]);
        }
      }
    }
  }

  updateTileVisuals(x, y, tile) {
    if (this.objects[x][y]) {
      disposeObject3D(this.objects[x][y]);
      this.scene.remove(this.objects[x][y]);
      this.objects[x][y] = null;
    }

    if (!['grass', 'water'].includes(tile.type)) {
      const obj = new SimObject(tile);
      this.objects[x][y] = obj;
      this.scene.add(obj);
      this.applyDataViewTint(obj, tile);
    }
    this.vegetationDirty = true;
  }

  rebuildVegetation() {
    if (this.vegetationGroup) {
      disposeObject3D(this.vegetationGroup);
      this.scene.remove(this.vegetationGroup);
    }

    const plan = planVegetation(this.city, { quality: this.vegetationQuality });
    const group = new THREE.Group();
    group.name = 'vegetation';

    const treeInstances = plan.instances.filter(instance => instance.kind === 'tree');
    const rockInstances = plan.instances.filter(instance => instance.kind === 'rock');
    const trunkGeometry = new THREE.CylinderGeometry(0.035, 0.055, 0.32, 6);
    const canopyGeometry = new THREE.ConeGeometry(0.18, 0.42, 7);
    const rockGeometry = new THREE.DodecahedronGeometry(0.12, 0);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x5a351f });
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x2f6f3f });
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x7f8177 });
    const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeInstances.length);
    const canopyMesh = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, treeInstances.length);
    const rockMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockInstances.length);
    const matrix = new THREE.Matrix4();

    treeInstances.forEach((instance, index) => {
      const tile = this.city.grid[instance.x][instance.y];
      const x = instance.x - 16 + 0.5 + instance.offsetX;
      const z = instance.y - 16 + 0.5 + instance.offsetZ;
      const y = getTileSurfaceHeight(tile);
      matrix.compose(
        new THREE.Vector3(x, y + 0.16 * instance.scale, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, instance.rotation, 0)),
        new THREE.Vector3(instance.scale, instance.scale, instance.scale),
      );
      trunkMesh.setMatrixAt(index, matrix);
      matrix.compose(
        new THREE.Vector3(x, y + 0.45 * instance.scale, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, instance.rotation, 0)),
        new THREE.Vector3(instance.scale, instance.scale, instance.scale),
      );
      canopyMesh.setMatrixAt(index, matrix);
    });

    rockInstances.forEach((instance, index) => {
      const tile = this.city.grid[instance.x][instance.y];
      matrix.compose(
        new THREE.Vector3(instance.x - 16 + 0.5 + instance.offsetX, getTileSurfaceHeight(tile) + 0.08, instance.y - 16 + 0.5 + instance.offsetZ),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, instance.rotation, 0)),
        new THREE.Vector3(instance.scale, instance.scale * 0.55, instance.scale),
      );
      rockMesh.setMatrixAt(index, matrix);
    });

    for (const mesh of [trunkMesh, canopyMesh, rockMesh]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }

    group.userData.diagnostics = {
      quality: this.vegetationQuality,
      maxInstances: VEGETATION_BUDGETS[this.vegetationQuality].maxInstances,
      instances: plan.instances.length,
      trees: treeInstances.length,
      rocks: rockInstances.length,
    };
    this.scene.add(group);
    this.vegetationGroup = group;
    this.vegetationDirty = false;
  }

  refreshRoadAndNeighbors(x, y) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= this.city.size.width || ny < 0 || ny >= this.city.size.height) continue;
      const tile = this.city.grid[nx][ny];
      if (tile.type === 'road' || tile.type === 'highway' || dx === 0 && dy === 0) {
        this.updateTileVisuals(nx, ny, tile);
      }
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
    const height = getTileSurfaceHeight(this.city.grid[pos.x][pos.y]);
    this.selectionMesh.position.set(pos.x - 16 + 0.5, height + 0.03, pos.y - 16 + 0.5);
    this.selectionMesh.visible = true;
  }

  hideSelection() {
    this.selectionMesh.visible = false;
    this.clearPreview();
  }

  clearPreview() {
    while (this.previewGroup.children.length > 0) {
      const child = this.previewGroup.children[0];
      disposeObject3D(child);
      this.previewGroup.remove(child);
    }
  }

  updatePreviewSingle(pos, toolId) {
    this.clearPreview();
    const preview = this.createPreviewMesh(toolId);
    if (!preview) return;
    const height = getTileSurfaceHeight(this.city.grid[pos.x][pos.y]);
    preview.position.set(pos.x - 16 + 0.5, height + 0.05, pos.y - 16 + 0.5);
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
    const height = getTileSurfaceHeight(this.city.grid[x][y]);
    preview.position.set(x - 16 + 0.5, height + 0.05, y - 16 + 0.5);
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
      new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.5 })
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
      const start = this.tourRoads[Math.floor(this.city.random() * this.tourRoads.length)];
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
      
      this.tourNextTarget = adj.length > 0 ? adj[Math.floor(this.city.random() * adj.length)] : this.tourCurrentTarget;
      
      this.camera.position.copy(this.tourCurrentTarget);
      this.controls.target.copy(this.tourNextTarget);
      
      this.controls.minDistance = 0.1;
      this.controls.maxDistance = deriveInitialCameraFrame(city).controls.maxDistance;
      this.controls.maxPolarAngle = Math.PI; // allow looking around freely
      
      document.getElementById('tool-tour').classList.add('active');
    } else {
      // Restore camera
      this.camera.position.copy(this.originalCameraPos);
      this.controls.target.copy(this.originalControlsTarget);
      
      const frame = deriveInitialCameraFrame(city);
      this.controls.minDistance = frame.controls.minDistance;
      this.controls.maxDistance = frame.controls.maxDistance;
      this.controls.maxPolarAngle = Math.PI / 2.1;
      
      document.getElementById('tool-tour').classList.remove('active');
    }
  }
}
