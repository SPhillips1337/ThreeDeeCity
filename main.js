import * as THREE from 'three';
import { SceneManager } from './src/render/SceneManager.js';
import { City } from './src/sim/City.js';

class Game {
  constructor() {
    this.city = new City(32, 32);
    this.sceneManager = new SceneManager(this.city);
    
    this.activeToolId = 'tool-select';
    this.lastTickTime = 0;
    this.tickInterval = 1000;
    this.isPaused = false;
    this.timeScale = 1;
    
    this.dragStart = null;
    this.isDragging = false;
    
    this.init();
  }

  init() {
    // Start rendering
    this.animate();
    
    // Setup window resize
    window.addEventListener('resize', () => {
      this.sceneManager.onResize();
    });

    // Tool selection
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeToolId = btn.id;
      });
    });

    // Time controls
    document.getElementById('time-pause').addEventListener('click', () => {
      this.setTimeScale(0);
      this.updateTimeUI('time-pause');
    });
    document.getElementById('time-play').addEventListener('click', () => {
      this.setTimeScale(1);
      this.updateTimeUI('time-play');
    });
    document.getElementById('time-fast').addEventListener('click', () => {
      this.setTimeScale(5);
      this.updateTimeUI('time-fast');
    });

    // Click on canvas
    document.getElementById('game-canvas').addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const pos = this.sceneManager.getGridPosition(e);
      if (pos) {
        this.isDragging = true;
        this.dragStart = pos;
        // Apply immediately on mousedown for instant feedback
        this.applyTool(pos.x, pos.y);
      }
    });

    document.getElementById('game-canvas').addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !this.isDragging) return;
      const pos = this.sceneManager.getGridPosition(e);
      if (pos) {
        this.applyToolToArea(this.dragStart, pos);
      }
      this.isDragging = false;
      this.dragStart = null;
      this.sceneManager.clearPreview();
    });

    // Mouse move on canvas
    document.getElementById('game-canvas').addEventListener('mousemove', (e) => {
      const pos = this.sceneManager.getGridPosition(e);
      if (pos) {
        this.sceneManager.updateSelection(pos);
        if (this.isDragging) {
          this.sceneManager.updatePreviewArea(this.dragStart, pos, this.activeToolId);
        } else {
          this.sceneManager.updatePreviewSingle(pos, this.activeToolId);
        }
      } else {
        this.sceneManager.hideSelection();
      }
    });

    // Initial stats update
    this.updateUI();
    
    console.log('Antigravity SimCity Initialized');
  }

  animate(time) {
    requestAnimationFrame((t) => this.animate(t));
    
    // Update simulation
    const effectiveInterval = this.tickInterval / this.timeScale;
    if (!this.isPaused && (time - this.lastTickTime > effectiveInterval)) {
      this.city.simulate();
      this.lastTickTime = time;
      this.updateUI();
    }
    
    // Render scene
    this.sceneManager.update(this.city);
  }

  updateUI() {
    document.getElementById('population').innerText = this.city.stats.population.toLocaleString();
    document.getElementById('money').innerText = `$${this.city.stats.money.toLocaleString()}`;
    document.getElementById('game-date').innerText = this.city.stats.date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  applyTool(x, y) {
    const tile = this.city.grid[x][y];
    switch (this.activeToolId) {
      case 'tool-residential':
        tile.type = 'residential';
        break;
      case 'tool-commercial':
        tile.type = 'commercial';
        break;
      case 'tool-industrial':
        tile.type = 'industrial';
        break;
      case 'tool-road':
        tile.type = 'road';
        break;
      case 'tool-bulldoze':
        tile.type = 'grass';
        tile.level = 0;
        tile.residents = 0;
        break;
    }
    // Update visuals
    this.sceneManager.updateTileVisuals(x, y, tile);
  }

  applyToolToArea(start, end) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    if (this.activeToolId === 'tool-road') {
      // For roads, we often draw in a line (H or V)
      // For simplicity, we'll draw a "L" shape or just fill the rect if small
      // SimCity style: draw along the primary axis of drag
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      
      if (dx > dy) {
        for (let x = minX; x <= maxX; x++) this.applyTool(x, start.y);
      } else {
        for (let y = minY; y <= maxY; y++) this.applyTool(start.x, y);
      }
    } else {
      // Area zoning
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          this.applyTool(x, y);
        }
      }
    }
  }

  setTimeScale(scale) {
    if (scale === 0) {
      this.isPaused = true;
    } else {
      this.isPaused = false;
      this.timeScale = scale;
    }
  }

  updateTimeUI(activeId) {
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
  }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
