import * as THREE from 'three';
import { SceneManager } from './src/render/SceneManager.js';
import { City } from './src/sim/City.js';
import { GameConfig } from './src/GameConfig.js';
import { AudioManager } from './src/AudioManager.js';

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
    this.keys = {}; // Track pressed keys
    this.audioManager = new AudioManager();

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
      btn.addEventListener('click', (e) => {
        // If it's a category button, just toggle drawer (handled by CSS hover/active mostly)
        // but we want it to stay open if a tool inside is active.
        if (btn.classList.contains('category-btn')) {
          const category = btn.closest('.tool-category');
          const wasActive = category.classList.contains('active');
          document.querySelectorAll('.tool-category').forEach(c => c.classList.remove('active'));
          if (!wasActive) category.classList.add('active');
          return;
        }

        this.activeToolId = btn.id;
        this.updateToolbarUI();
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

    // Setup right-click cancel
    this.setupEventListeners();
    
    // Audio Toggle
    const audioBtn = document.getElementById('audio-toggle');
    audioBtn.addEventListener('click', () => {
      const isMuted = this.audioManager.toggleMute();
      audioBtn.classList.toggle('active', !isMuted);
      // Update icon based on mute state
      const iconPath = isMuted 
        ? "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z"
        : "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z";
      document.getElementById('audio-icon').querySelector('path').setAttribute('d', iconPath);
    });

    // Start audio on first interaction if possible
    window.addEventListener('click', () => {
      this.audioManager.init();
    }, { once: true });
  }

  animate(time) {
    requestAnimationFrame((t) => this.animate(t));

    const effectiveInterval = this.tickInterval / this.timeScale;
    if (!this.isPaused && (time - this.lastTickTime > effectiveInterval)) {
      this.city.simulate();
      this.lastTickTime = time;
      this.updateUI();
    }

    this.sceneManager.update(this.city, this.keys);
  }

  setupEventListeners() {
    // Prevent context menu on game canvas
    document.getElementById('game-canvas').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Right-click cancels tool
      this.activeToolId = 'tool-select';
      this.updateToolbarUI();
    });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  updateToolbarUI() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.id === this.activeToolId);
    });

    // Also update category button states
    document.querySelectorAll('.tool-category').forEach(cat => {
      const hasActiveTool = cat.querySelector(`#${this.activeToolId}`);
      cat.classList.toggle('active', !!hasActiveTool);
    });
  }

  updateUI() {
    // Update HUD stats
    document.getElementById('population').innerText = this.city.stats.population.toLocaleString();
    document.getElementById('money').innerText = `$${Math.floor(this.city.stats.money).toLocaleString()}`;
    document.getElementById('game-date').innerText = this.city.stats.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Power Meter
    const powerPercent = this.city.stats.powerSupply > 0
      ? Math.min(100, (this.city.stats.powerDemand / this.city.stats.powerSupply) * 100)
      : (this.city.stats.powerDemand > 0 ? 100 : 0);
    const powerMeter = document.getElementById('power-meter-fill');
    powerMeter.style.width = `${powerPercent}%`;
    powerMeter.classList.toggle('warning', powerPercent > 80);
    powerMeter.classList.toggle('danger', powerPercent >= 100);

    // RCI Demand
    this.updateRCIDemand();
  }

  updateRCIDemand() {
    const pop = this.city.stats.population;
    const jobs = this.city.stats.jobs;
    
    // Improved demand formula:
    // R demand high if low pop or high jobs
    let rDemand = 100 - (pop / 20) + (jobs / 10);
    // C demand high if pop > jobs
    let cDemand = (pop / 4) - jobs + 20;
    // I demand high if pop > jobs and low industrial density
    let iDemand = (pop / 5) - jobs + 30;

    rDemand = Math.max(-100, Math.min(100, rDemand));
    cDemand = Math.max(-100, Math.min(100, cDemand));
    iDemand = Math.max(-100, Math.min(100, iDemand));

    const rHeight = Math.max(0, rDemand);
    const cHeight = Math.max(0, cDemand);
    const iHeight = Math.max(0, iDemand);

    // Store in city stats for other systems to read
    this.city.stats.demand.residential = rHeight;
    this.city.stats.demand.commercial = cHeight;
    this.city.stats.demand.industrial = iHeight;

    document.getElementById('demand-r').style.height = `${rHeight}%`;
    document.getElementById('demand-c').style.height = `${cHeight}%`;
    document.getElementById('demand-i').style.height = `${iHeight}%`;
  }

  getToolCost(toolId) {
    if (toolId.startsWith('tool-residential')) return GameConfig.costs.residential[toolId.split('-')[2]];
    if (toolId.startsWith('tool-commercial')) return GameConfig.costs.commercial[toolId.split('-')[2]];
    if (toolId.startsWith('tool-industrial')) return GameConfig.costs.industrial[toolId.split('-')[2]];
    if (toolId === 'tool-road') return GameConfig.costs.road;
    if (toolId === 'tool-highway') return GameConfig.costs.highway;
    if (toolId === 'tool-power-line') return GameConfig.costs.powerLine;
    if (toolId === 'tool-bulldoze') return GameConfig.costs.bulldoze;
    if (toolId === 'tool-power-coal') return GameConfig.costs.power.coal;
    if (toolId === 'tool-power-wind') return GameConfig.costs.power.wind;
    if (toolId === 'tool-water-pump') return GameConfig.costs.water.pump;
    if (toolId === 'tool-bus-stop') return GameConfig.costs.transit.busStop;
    if (toolId === 'tool-rail-line') return GameConfig.costs.transit.railLine;
    if (toolId === 'tool-rail-station') return GameConfig.costs.transit.railStation;
    return 0;
  }

  applyTool(x, y) {
    const cost = this.getToolCost(this.activeToolId);
    if (this.city.stats.money < cost) return;

    const tile = this.city.grid[x][y];
    let changed = false;

    if (this.activeToolId.startsWith('tool-residential')) {
      tile.type = 'residential';
      tile.density = this.getDensity(this.activeToolId);
      changed = true;
    } else if (this.activeToolId.startsWith('tool-commercial')) {
      tile.type = 'commercial';
      tile.density = this.getDensity(this.activeToolId);
      changed = true;
    } else if (this.activeToolId.startsWith('tool-industrial')) {
      tile.type = 'industrial';
      tile.density = this.getDensity(this.activeToolId);
      changed = true;
    } else if (this.activeToolId === 'tool-road') {
      tile.type = 'road';
      changed = true;
    } else if (this.activeToolId === 'tool-highway') {
      tile.type = 'highway';
      changed = true;
    } else if (this.activeToolId === 'tool-power-line') {
      // Allow placing power lines over roads or highways
      if (tile.type === 'road' || tile.type === 'highway') {
        tile.overlay = 'power-line';
      } else {
        tile.type = 'power-line';
        tile.overlay = null;
      }
      changed = true;
    } else if (this.activeToolId === 'tool-bulldoze') {
      // If there is an overlay, remove it first
      if (tile.overlay) {
        tile.overlay = null;
      } else {
        tile.type = 'grass';
        tile.density = 0;
        tile.residents = 0;
        tile.jobs = 0;
        tile.developmentLevel = 0;
      }
      changed = true;
    } else if (this.activeToolId === 'tool-power-coal') {
      tile.type = 'power-coal';
      changed = true;
    } else if (this.activeToolId === 'tool-power-wind') {
      tile.type = 'power-wind';
      changed = true;
    } else if (this.activeToolId === 'tool-water-pump') {
      tile.type = 'water-pump';
      changed = true;
    } else if (this.activeToolId === 'tool-bus-stop') {
      tile.type = 'bus-stop';
      changed = true;
    } else if (this.activeToolId === 'tool-rail-line') {
      tile.type = 'rail-line';
      changed = true;
    } else if (this.activeToolId === 'tool-rail-station') {
      tile.type = 'rail-station';
      changed = true;
    }

    if (changed) {
      this.city.stats.money -= cost;
      this.sceneManager.updateTileVisuals(x, y, tile);
      this.updateUI();
    }
  }

  getDensity(toolId) {
    if (toolId.includes('light')) return 1;
    if (toolId.includes('medium')) return 2;
    if (toolId.includes('heavy')) return 3;
    return 0;
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
