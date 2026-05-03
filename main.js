import * as THREE from 'three';
import { SceneManager } from './src/render/SceneManager.js';
import { City } from './src/sim/City.js';
import { GameConfig } from './src/GameConfig.js';

class Game {
  constructor() {
    this.city = new City(32, 32);
    this.sceneManager = new SceneManager(this.city);

    this.activeToolId = 'tool-select';
    this.lastTickTime = 0;
    this.tickInterval = 1000;
    this.isPaused = true; // Start paused for setup
    this.timeScale = 1;

    this.dragStart = null;
    this.isDragging = false;
    this.selectedDifficulty = 'medium';

    this.init();
  }

  init() {
    this.animate();

    window.addEventListener('resize', () => {
      this.sceneManager.onResize();
    });

    // Setup Overlay
    const setupOverlay = document.getElementById('setup-overlay');
    const startBtn = document.getElementById('start-game-btn');
    
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedDifficulty = btn.dataset.difficulty;
      });
    });

    startBtn.addEventListener('click', () => {
      const cityName = document.getElementById('input-city-name').value || 'New Horizon';
      this.city.name = cityName;
      this.city.setDifficulty(this.selectedDifficulty);
      
      document.getElementById('city-name').innerText = cityName;
      setupOverlay.style.display = 'none';
      this.isPaused = false;
      this.updateUI();
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

    // Canvas Events
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || this.isPaused) return;
      const pos = this.sceneManager.getGridPosition(e);
      if (pos) {
        this.isDragging = true;
        this.dragStart = pos;
        this.applyTool(pos.x, pos.y);
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !this.isDragging) return;
      const pos = this.sceneManager.getGridPosition(e);
      if (pos) {
        this.applyToolToArea(this.dragStart, pos);
      }
      this.isDragging = false;
      this.dragStart = null;
      this.sceneManager.clearPreview();
    });

    canvas.addEventListener('mousemove', (e) => {
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

    this.updateUI();
  }

  animate(time) {
    requestAnimationFrame((t) => this.animate(t));

    const effectiveInterval = this.tickInterval / this.timeScale;
    if (!this.isPaused && (time - this.lastTickTime > effectiveInterval)) {
      this.city.simulate();
      this.lastTickTime = time;
      this.updateUI();
    }

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

    // Update RCI Demand
    this.updateRCIDemand();
  }

  updateRCIDemand() {
    const pop = this.city.stats.population;
    const jobs = this.city.stats.jobs;
    
    // Simple demand formula: 
    // R demand high if low pop
    // C/I demand high if high pop but low jobs
    let rDemand = Math.max(0, 100 - (pop / 10));
    let cDemand = Math.max(0, (pop / 2) - jobs);
    let iDemand = Math.max(0, (pop / 3) - jobs);

    document.getElementById('demand-r').style.height = `${Math.min(100, rDemand)}%`;
    document.getElementById('demand-c').style.height = `${Math.min(100, cDemand)}%`;
    document.getElementById('demand-i').style.height = `${Math.min(100, iDemand)}%`;
  }

  getToolCost(toolId) {
    if (toolId.startsWith('tool-residential-')) return GameConfig.costs.residential[toolId.split('-')[2]];
    if (toolId.startsWith('tool-commercial-')) return GameConfig.costs.commercial[toolId.split('-')[2]];
    if (toolId.startsWith('tool-industrial-')) return GameConfig.costs.industrial[toolId.split('-')[2]];
    if (toolId === 'tool-road') return GameConfig.costs.road;
    if (toolId === 'tool-bulldoze') return GameConfig.costs.bulldoze;
    return 0;
  }

  applyTool(x, y) {
    const cost = this.getToolCost(this.activeToolId);
    if (this.city.stats.money < cost) return;

    const tile = this.city.grid[x][y];
    let changed = false;

    if (this.activeToolId.includes('residential')) {
      tile.type = 'residential';
      tile.density = this.activeToolId.endsWith('light') ? 1 : (this.activeToolId.endsWith('medium') ? 2 : 3);
      changed = true;
    } else if (this.activeToolId.includes('commercial')) {
      tile.type = 'commercial';
      tile.density = this.activeToolId.endsWith('light') ? 1 : (this.activeToolId.endsWith('medium') ? 2 : 3);
      changed = true;
    } else if (this.activeToolId.includes('industrial')) {
      tile.type = 'industrial';
      tile.density = this.activeToolId.endsWith('light') ? 1 : (this.activeToolId.endsWith('medium') ? 2 : 3);
      changed = true;
    } else if (this.activeToolId === 'tool-road') {
      tile.type = 'road';
      changed = true;
    } else if (this.activeToolId === 'tool-bulldoze') {
      tile.type = 'grass';
      tile.density = 0;
      tile.developmentLevel = 0;
      tile.residents = 0;
      tile.jobs = 0;
      tile.abandoned = false;
      changed = true;
    }

    if (changed) {
      this.city.stats.money -= cost;
      this.sceneManager.updateTileVisuals(x, y, tile);
      this.updateUI();
    }
  }

  applyToolToArea(start, end) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    if (this.activeToolId === 'tool-road') {
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      if (dx > dy) {
        for (let x = minX; x <= maxX; x++) this.applyTool(x, start.y);
      } else {
        for (let y = minY; y <= maxY; y++) this.applyTool(start.x, y);
      }
    } else if (this.activeToolId !== 'tool-select') {
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

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
