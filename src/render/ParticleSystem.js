import * as THREE from 'three';

/**
 * ParticleSystem — cheap dust-mote atmosphere layer.
 *
 * ~400 tiny points drifting with independent sine-wave motion.
 * Uses a pre-generated 16 px circular sprite so the shader is a simple textured point draw
 * with no per-particle CPU updates beyond position phase advance.
 */
export class ParticleSystem {
  constructor(scene, count = 200) {
    this.count = count;
    this.group = new THREE.Group();
    this.positions = null;
    this.phases = null;
    this.speeds = null;
    this.offsets = null;
    this.time = 0;

    this._createSprite();
    this._initParticles();
    scene.add(this.group);
  }

  _createSprite() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();

    this.spriteTex = new THREE.CanvasTexture(c);
  }

  _initParticles() {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.phases = new Float32Array(this.count);
    this.speeds = new Float32Array(this.count);
    this.offsets = new Float32Array(this.count);

    const spread = 34;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.positions[i3]     = (Math.random() - 0.5) * spread;
      this.positions[i3 + 1] = 0.3 + Math.random() * 4;
      this.positions[i3 + 2] = (Math.random() - 0.5) * spread;
      this.phases[i]  = Math.random() * Math.PI * 2;
      this.speeds[i]  = 0.02 + Math.random() * 0.04;
      this.offsets[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('phase',    new THREE.BufferAttribute(this.phases, 1));
    geo.setAttribute('speed',    new THREE.BufferAttribute(this.speeds, 1));
    geo.setAttribute('offset',   new THREE.BufferAttribute(this.offsets, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      map: this.spriteTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      color: new THREE.Color(0xddeeff),
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);
  }

  /**
   * Call each frame from SceneManager.update().
   * Particles drift slowly with a sine-wave wobble for organic feel.
   */
  update(dt = 1 / 60) {
    this.time += dt;
    const pos = this.points.geometry.attributes.position.array;
    const spread = 17;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const phase = this.phases[i];
      const speed = this.speeds[i];
      const off   = this.offsets[i];

      // Forward drift
      this.phases[i] += speed;
      pos[i3] += Math.sin(this.time * speed + off) * 0.003;
      pos[i3 + 2] += Math.cos(this.time * speed * 0.7 + off) * 0.003;

      // Wrap toroidally
      pos[i3]     = ((pos[i3]     + spread) % (spread * 2)) - spread;
      pos[i3 + 2] = ((pos[i3 + 2] + spread) % (spread * 2)) - spread;

      // Tiny vertical bob
      pos[i3 + 1] += Math.sin(this.time * 0.5 + off) * 0.001;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  setVisible(v) { this.group.visible = v; }
}
