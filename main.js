import * as THREE from 'three';
import { SceneManager } from './src/render/SceneManager.js';
import { City } from './src/sim/City.js';
import { GameConfig } from './src/GameConfig.js';
import { AudioManager } from './src/AudioManager.js';

class Game {
  constructor() {
    this.city = new City(32, 32);
    this.city.onTileChanged = (x, y, tile) => {
      this.sceneManager.updateTileVisuals(x, y, tile);
    };
    this.sceneManager = new SceneManager(this.city);

    this.activeToolId = 'tool-select';
    this.lastTickTime = 0;
    this.tickInterval = 1000;
    this.isPaused = true; // Start paused for setup
    this.timeScale = 1;

    this.dragStart = null;
    this.mouseDownPos = { x: 0, y: 0 };
    this.rightMouseDownPos = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.isRightMouseDown = false;
    this.isAreaDragging = false;
    this.selectedDifficulty = 'medium';
    this.keys = {}; // Track pressed keys
    this.audioManager = new AudioManager();
    
    this.lastPopMilestone = 0;

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
        // Exclude UI buttons that aren't tools
        if (btn.id === 'menu-toggle' || btn.id === 'audio-toggle') {
          return;
        }

        // If it's a category button, just toggle drawer (handled by CSS hover/active mostly)
        if (btn.classList.contains('category-btn')) {
          const category = btn.closest('.tool-category');
          const wasActive = category.classList.contains('active');
          document.querySelectorAll('.tool-category').forEach(c => c.classList.remove('active'));
          if (!wasActive) category.classList.add('active');
          return;
        }

        if (btn.classList.contains('view-btn')) {
          const view = btn.dataset.view;
          this.sceneManager.setDataView(view, this.city);
          document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          return;
        }

        if (btn.id === 'tool-tour') {
          this.sceneManager.toggleTourMode(this.city);
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

    // Menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');
    
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mainMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      mainMenu.classList.add('hidden');
    });

    // Menu Actions
    document.getElementById('menu-restart').addEventListener('click', () => {
      if (confirm('Are you sure you want to restart? All progress will be lost.')) {
        this.restartGame();
      }
    });

    document.getElementById('menu-help').addEventListener('click', () => this.showModal('help'));
    document.getElementById('menu-credits').addEventListener('click', () => this.showModal('credits'));
    document.getElementById('menu-about').addEventListener('click', () => this.showModal('about'));
    document.getElementById('menu-options').addEventListener('click', () => this.showModal('options'));

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => {
      document.getElementById('info-modal').classList.add('hidden');
    });
    
    window.addEventListener('click', (e) => {
      if (e.target.id === 'info-modal') {
        e.target.classList.add('hidden');
      }
    });

    // Canvas Events
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('mousedown', (e) => {
      if (this.isPaused) return;
      
      if (e.button === 0) {
        this.mouseDownPos = { x: e.clientX, y: e.clientY };
        this.isMouseDown = true;
        const pos = this.sceneManager.getGridPosition(e);
        if (pos) {
          this.dragStart = pos;
          // Enable area dragging if Shift is held OR if a tool is active (pan disabled)
          if (e.shiftKey || this.activeToolId !== 'tool-select') {
            this.isAreaDragging = true;
          }
        }
      } else if (e.button === 2) {
        this.rightMouseDownPos = { x: e.clientX, y: e.clientY };
        this.isRightMouseDown = true;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (this.isPaused) return;

      if (e.button === 0 && this.isMouseDown) {
        const dx = e.clientX - this.mouseDownPos.x;
        const dy = e.clientY - this.mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const pos = this.sceneManager.getGridPosition(e);
        
        if (pos) {
          if (this.isAreaDragging) {
            this.applyToolToArea(this.dragStart, pos);
          } else if (distance < 5) {
            this.applyTool(pos.x, pos.y);
          }
        }
        this.isMouseDown = false;
        this.isAreaDragging = false;
        this.dragStart = null;
      } else if (e.button === 2 && this.isRightMouseDown) {
        const dx = e.clientX - this.rightMouseDownPos.x;
        const dy = e.clientY - this.rightMouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
          // Stationary right click cancels tool
          this.activeToolId = 'tool-select';
          this.updateToolbarUI();
        }
        this.isRightMouseDown = false;
      }
      
      this.sceneManager.clearPreview();
    });

    canvas.addEventListener('mousemove', (e) => {
      const pos = this.sceneManager.getGridPosition(e);
      const tooltip = document.getElementById('tile-tooltip');

      if (pos) {
        this.sceneManager.updateSelection(pos);
        if (this.isAreaDragging) {
          this.sceneManager.updatePreviewArea(this.dragStart, pos, this.activeToolId);
        } else if (!this.isMouseDown) {
          this.sceneManager.updatePreviewSingle(pos, this.activeToolId);
        } else {
          // Dragging without shift (panning), hide preview
          this.sceneManager.clearPreview();
        }

        // Update Tooltip
        const tile = this.city.grid[pos.x][pos.y];
        if (tile && this.activeToolId === 'tool-select') {
          tooltip.classList.remove('hidden');
          tooltip.style.left = `${e.clientX + 15}px`;
          tooltip.style.top = `${e.clientY + 15}px`;

          let title = tile.type.charAt(0).toUpperCase() + tile.type.slice(1);
          if (tile.abandoned) title = `Abandoned ${title}`;
          document.getElementById('tt-title').innerText = `${title} (Lvl ${tile.developmentLevel})`;
          
          if (['residential', 'commercial', 'industrial'].includes(tile.type)) {
            document.getElementById('tt-stats').innerText = `Pop/Jobs: ${tile.residents || tile.jobs} / ${Math.pow(tile.density || 1, 2) * 50}`;
            document.getElementById('tt-env').innerText = `Happy: ${Math.floor(tile.happiness || 0)}% | LV: ${Math.floor(tile.modules.find(m => m.name === 'Environment')?.landValue || 0)}`;
          } else {
            document.getElementById('tt-stats').innerText = `Status: Active`;
            document.getElementById('tt-env').innerText = ``;
          }
        } else {
          tooltip.classList.add('hidden');
        }

      } else {
        this.sceneManager.hideSelection();
        tooltip.classList.add('hidden');
      }
    });

    this.updateUI();

    // Setup right-click cancel
    this.setupEventListeners();
    
    // Audio Toggle & Radio Stations
    const audioBtn = document.getElementById('audio-toggle');
    const radioMenu = document.getElementById('radio-menu');

    audioBtn.addEventListener('click', (e) => {
      // Regular click toggles mute
      const isMuted = this.audioManager.toggleMute();
      audioBtn.classList.toggle('active', !isMuted);
      const iconPath = isMuted 
        ? "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z"
        : "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z";
      document.getElementById('audio-icon').querySelector('path').setAttribute('d', iconPath);
    });

    audioBtn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      radioMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('#radio-menu .menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const station = item.dataset.station;
        if (!station) return;
        
        this.audioManager.setStation(station);
        
        document.querySelectorAll('#radio-menu .menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        radioMenu.classList.add('hidden');
        
        // Ensure icon reflects active state
        audioBtn.classList.add('active');
      });
    });

    // Close menu when clicking elsewhere
    window.addEventListener('click', (e) => {
      if (!audioBtn.contains(e.target) && !radioMenu.contains(e.target)) {
        radioMenu.classList.add('hidden');
      }
    });

    // Start audio on first interaction if possible
    window.addEventListener('click', () => {
      this.audioManager.init();
    }, { once: true });
  }

  restartGame() {
    const cityName = this.city.name;
    const difficulty = this.selectedDifficulty;
    this.city = new City(32, 32);
    this.city.name = cityName;
    this.city.setDifficulty(difficulty);
    this.city.onTileChanged = (x, y, tile) => {
      this.sceneManager.updateTileVisuals(x, y, tile);
    };
    this.sceneManager.reset(this.city);
    this.updateUI();
  }

  showModal(page) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const modal = document.getElementById('info-modal');

    const content = {
      help: `
        <h3>Getting Started</h3>
        <p>Build your city by zoning areas for Residential, Commercial, and Industrial growth. Connect them with roads and provide essential utilities.</p>
        <h3>Controls</h3>
        <p><strong>Left Click &amp; Drag:</strong> Pan camera (Select tool) / Build (Active tool)</p>
        <p><strong>Right Click &amp; Drag:</strong> Rotate camera</p>
        <p><strong>Scroll:</strong> Zoom in/out</p>
        <p><strong>Right Click (Stationary):</strong> Cancel current tool</p>
        <p><strong>WASD:</strong> Move camera</p>
        <p><strong>Q/E:</strong> Rotate camera</p>
        <p><strong>T:</strong> Toggle street-level tour mode</p>
        <h3>Utilities</h3>
        <p>Buildings need ⚡ Power and 💧 Water. Place power plants and water pumps, then connect them to your zones via roads or power lines.</p>
        <h3>Growth</h3>
        <p>Zone areas for Residential (R), Commercial (C), and Industrial (I) development. Connect zones with roads and provide services to encourage growth and density upgrades.</p>
      `,
      credits: `
        <h3>Development</h3>
        <p>Built with <a href="https://github.com/SPhillips1337/ThreeDeeCity" target="_blank">ThreeDeeCity</a> — powered by Antigravity AI.</p>
        <h3>Inspiration &amp; Assets</h3>
        <ul style="list-style: none; padding: 0; margin-bottom: 16px;">
          <li>🔗 <a href="https://github.com/wiktordereszewski/ThreeJSCity" target="_blank">ThreeJSCity</a> — Wiktor Dereszewski</li>
          <li>🔗 <a href="https://github.com/dgreenheck/simcity-threejs-clone" target="_blank">SimCity Three.js Clone</a> — dgreenheck</li>
          <li>🔗 <a href="https://github.com/mauriciopoppe/Three.js-City" target="_blank">Three.js-City</a> — Mauricio Poppe</li>
          <li>🔗 <a href="https://github.com/davemn/city-generator" target="_blank">City Generator</a> — davemn</li>
          <li>🔗 <a href="https://github.com/jeromeetienne/threex.proceduralcity" target="_blank">ThreeX Procedural City</a> — Jerome Etienne</li>
          <li>🔗 <a href="https://github.com/jstrait/city-tour" target="_blank">City Tour</a> — jstrait</li>
          <li>🔗 <a href="https://github.com/MHillier98/IntroToComputerGraphics-CityGenerator" target="_blank">City Generator</a> — MHillier98</li>
          <li>🔗 <a href="https://github.com/photonlines/Procedural-City-Generator" target="_blank">Procedural City Generator</a> — photonlines</li>
        </ul>
        <h3>Music</h3>
        <p>All music sourced from <a href="https://pixabay.com/music/" target="_blank">Pixabay</a> under their content license.</p>
        <ul style="list-style: none; padding: 0;">
          <li>🎵 <a href="https://pixabay.com/music/upbeat-smooth-city-living-108388/" target="_blank">Smooth City Living</a></li>
          <li>🎵 <a href="https://pixabay.com/music/pop-kanashimi-no-koi-tavc-city-pop-361227/" target="_blank">Kanashimi no Koi</a> — TAVC</li>
          <li>🎵 <a href="https://pixabay.com/music/pop-%e3%82%b5%e3%83%9e%e3%83%bc%e3%83%9b%e3%83%aa%e3%83%87%e3%83%bc-tavc-city-pop-361214/" target="_blank">サマーホリデー (Summer Holiday)</a> — TAVC</li>
          <li>🎵 <a href="https://pixabay.com/music/pop-%e5%a4%b1%e6%81%8b%e3%81%ae%e6%ad%8c-tavc-city-pop-368749/" target="_blank">失恋の歌 (Shitsuren no Uta)</a> — TAVC</li>
          <li>🎵 <a href="https://pixabay.com/music/pop-%e6%9c%88%e5%a4%9c%e3%81%ae%e3%83%80%e3%83%b3%e3%82%b9-tavc-city-pop-361207/" target="_blank">月夜のダンス (Tsukiyo no Dance)</a> — TAVC</li>
          <li>🎵 <a href="https://pixabay.com/music/electro-echoes-in-the-glass-city-v2-450734/" target="_blank">Echoes in the Glass City</a></li>
          <li>🎵 <a href="https://pixabay.com/music/pop-%e6%84%9b%e3%81%ae%e6%ac%a0%e7%89%87-tavc-city-pop-368750/" target="_blank">愛の欠片 (Ai no Kakera)</a> — TAVC</li>
          <li>🎵 <a href="https://pixabay.com/music/beats-big-city-big-dreams-217874/" target="_blank">Big City Big Dreams</a></li>
          <li>🎵 <a href="https://pixabay.com/music/beats-city-streets-342387/" target="_blank">City Streets</a></li>
          <li>🎵 <a href="https://pixabay.com/music/beats-city-vibes-247646/" target="_blank">City Vibes</a></li>
          <li>🎵 <a href="https://pixabay.com/music/beautiful-plays-in-the-city-110589/" target="_blank">Beautiful Plays in the City</a></li>
          <li>🎵 <a href="https://pixabay.com/music/traditional-jazz-18021603-jazzy-pop-piano-japan-city-155528/" target="_blank">Jazzy Pop Piano Japan City</a></li>
          <li>🎵 <a href="https://pixabay.com/music/electronic-night-city-418052/" target="_blank">Night City</a></li>
          <li>🎵 <a href="https://pixabay.com/music/upbeat-lion-city-growth-391737/" target="_blank">Lion City Growth</a></li>
          <li>🎵 <a href="https://pixabay.com/music/upbeat-city-pulse-2-338784/" target="_blank">City Pulse 2</a></li>
          <li>🎵 <a href="https://pixabay.com/music/funk-gemma-party-430732/" target="_blank">Gemma Party</a></li>
          <li>🎵 <a href="https://pixabay.com/fr/users/lnplusmusic-47631836/" target="_blank">lnplusmusic</a> — Pixabay Artist</li>
        </ul>
      `,
      about: `
        <h3>ThreeDeeCity</h3>
        <p>A procedural 3D city builder running entirely in your browser.</p>
        <p>Built with <strong>Three.js</strong>, <strong>Vite</strong>, and vanilla JavaScript.</p>
        <p style="margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <strong>Version 0.7.2</strong> — "The Radio Update"<br>
          <span style="color: #888;">Real-time traffic · Economic simulation · Dynamic audio · Data views</span>
        </p>
        <p><a href="https://github.com/SPhillips1337/ThreeDeeCity" target="_blank">View on GitHub →</a></p>
      `,
      options: `
        <h3>Game Options</h3>
        <p style="color: #888;">Settings are coming in a future update. Currently the game auto-optimizes based on your hardware.</p>
      `
    };

    title.innerText = page.charAt(0).toUpperCase() + page.slice(1);
    body.innerHTML = content[page] || '<p>Content not found.</p>';
    modal.classList.remove('hidden');
  }

  animate(time) {
    requestAnimationFrame((t) => this.animate(t));

    const effectiveInterval = this.tickInterval / this.timeScale;
    if (!this.isPaused && (time - this.lastTickTime > effectiveInterval)) {
      this.city.simulate();
      this.checkCityEvents();
      this.lastTickTime = time;
      this.updateUI();
    }

    this.sceneManager.update(this.city, this.keys);
  }

  setupEventListeners() {
    // Prevent context menu on game canvas
    document.getElementById('game-canvas').addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.key === 't' || e.key === 'T') {
        this.sceneManager.toggleTourMode(this.city);
      }
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

    // Disable left-click pan if a tool is active
    this.sceneManager.setPanEnabled(this.activeToolId === 'tool-select');
  }

  updateUI() {
    // Update HUD stats
    document.getElementById('population').innerText = this.city.stats.population.toLocaleString();
    document.getElementById('money').innerText = `$${Math.floor(this.city.stats.money).toLocaleString()}`;
    document.getElementById('game-date').innerText = this.city.stats.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // New Phase 6 Stats
    if (document.getElementById('happiness')) {
      document.getElementById('happiness').innerText = `${this.city.stats.happiness}%`;
      document.getElementById('land-value').innerText = `${this.city.stats.landValue}`;
      document.getElementById('unemployment').innerText = `${this.city.stats.unemployment}%`;
      document.getElementById('approval').innerText = `${this.city.stats.approval}%`;
    }

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
    
    // Minimap
    this.updateMinimap();
  }

  updateMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = this.city.size.width;
    const h = this.city.size.height;
    
    const tileW = canvas.width / w;
    const tileH = canvas.height / h;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const tile = this.city.grid[x][y];
        let color = '#3a5a3a'; // grass
        if (tile.type === 'water') color = '#0ea5e9';
        else if (tile.type === 'road') color = '#333333';
        else if (tile.type === 'residential') color = '#4ade80';
        else if (tile.type === 'commercial') color = '#60a5fa';
        else if (tile.type === 'industrial') color = '#facc15';
        else if (tile.type.startsWith('power')) color = '#eab308';
        else if (tile.type.startsWith('water-pump')) color = '#3b82f6';
        else if (tile.type === 'police') color = '#1e3a8a';
        else if (tile.type === 'fire') color = '#991b1b';
        else if (tile.type === 'school') color = '#ca8a04';
        else if (tile.type === 'hospital') color = '#f8fafc';
        else if (tile.type === 'park') color = '#16a34a';
        
        ctx.fillStyle = color;
        ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
      }
    }
  }

  updateRCIDemand() {
    const pop = this.city.stats.population;
    const jobs = this.city.stats.jobs;
    
    // Improved demand formula using workforce ratio
    const workforce = pop * 0.5; // ~50% of population works
    
    // R demand: high if there are more jobs than workforce.
    let rDemand = 50 + ((jobs - workforce) / Math.max(10, jobs)) * 100;
    
    // C & I demand: high if workforce exceeds available jobs
    let jobDeficit = workforce - jobs;
    let cDemand = 20 + (jobDeficit / Math.max(10, workforce)) * 40;
    let iDemand = 30 + (jobDeficit / Math.max(10, workforce)) * 60;
    
    // Scale down baseline demand as city gets huge to require careful balancing
    const scale = Math.max(1, pop / 2000);
    rDemand /= scale;
    cDemand /= scale;
    iDemand /= scale;

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
    if (toolId === 'tool-police') return GameConfig.costs.civic.policeStation;
    if (toolId === 'tool-fire') return GameConfig.costs.civic.fireStation;
    if (toolId === 'tool-school') return GameConfig.costs.civic.school;
    if (toolId === 'tool-hospital') return GameConfig.costs.civic.hospital;
    if (toolId === 'tool-park') return GameConfig.costs.civic.park;
    return 0;
  }

  applyTool(x, y) {
    const cost = this.getToolCost(this.activeToolId);
    if (this.city.stats.money < cost) return;

    const tile = this.city.grid[x][y];
    
    // Prevent building on water, except bulldozing (which does nothing to water anyway, but safe to allow)
    if (tile.type === 'water' && this.activeToolId !== 'tool-bulldoze' && this.activeToolId !== 'tool-water-pump') {
      return;
    }

    let changed = false;

    // Reset lot properties when applying new tools
    tile.lotId = null;
    tile.isAnchor = true;
    tile.lotSize = { w: 1, h: 1 };

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
        tile.type = tile.elevation < 0.35 ? 'water' : 'grass';
        tile.density = 0;
        tile.residents = 0;
        tile.jobs = 0;
        tile.developmentLevel = 0;
      }
      changed = true;
    } else if (this.activeToolId === 'tool-power-coal') {
      // 2x2 building, Top-Right anchor is (x, y)
      // Tiles: (x, y), (x-1, y), (x, y-1), (x-1, y-1)
      if (x > 0 && y > 0) {
        const lotId = `lot-coal-${x}-${y}-${Date.now()}`;
        const tiles = [
          this.city.grid[x][y],
          this.city.grid[x-1][y],
          this.city.grid[x][y-1],
          this.city.grid[x-1][y-1]
        ];

        // Check if any are occupied
        if (tiles.every(t => t.type === 'grass')) {
          tiles.forEach((t, i) => {
            t.type = 'power-coal';
            t.lotId = lotId;
            t.isAnchor = (i === 3); // Bottom-left is anchor for SimObject centering
            t.lotSize = { w: 2, h: 2 };
          });
          // Update all 4 visuals
          tiles.forEach(t => this.sceneManager.updateTileVisuals(t.x, t.y, t));
          changed = true;
        }
      }
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
    } else if (this.activeToolId === 'tool-police') {
      tile.type = 'police';
      changed = true;
    } else if (this.activeToolId === 'tool-fire') {
      tile.type = 'fire';
      changed = true;
    } else if (this.activeToolId === 'tool-school') {
      tile.type = 'school';
      changed = true;
    } else if (this.activeToolId === 'tool-hospital') {
      tile.type = 'hospital';
      changed = true;
    } else if (this.activeToolId === 'tool-park') {
      tile.type = 'park';
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

  notify(message, type = 'info') {
    const panel = document.getElementById('notifications-panel');
    const notif = document.createElement('div');
    notif.className = `notification notif-${type}`;
    notif.innerText = message;
    panel.prepend(notif);

    setTimeout(() => {
      notif.classList.add('fade-out');
      setTimeout(() => notif.remove(), 500);
    }, 6000);
  }

  checkCityEvents() {
    // Power shortages
    if (this.city.stats.powerDemand > this.city.stats.powerSupply && Math.random() < 0.1) {
      this.notify('Rolling blackouts! Build more power plants.', 'danger');
    }
    // High unemployment
    if (this.city.stats.unemployment > 10 && Math.random() < 0.05) {
      this.notify('High unemployment is causing crime to spike.', 'warning');
    }
    // Low approval
    if (this.city.stats.approval < 30 && Math.random() < 0.05) {
      this.notify('Approval rating is plummeting. Citizens demand better conditions!', 'danger');
    }
    
    // Milestones
    const pop = this.city.stats.population;
    if (pop >= this.lastPopMilestone + 500) {
      this.notify(`Milestone: Population reached ${pop.toLocaleString()}!`, 'success');
      this.lastPopMilestone = Math.floor(pop / 500) * 500;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
