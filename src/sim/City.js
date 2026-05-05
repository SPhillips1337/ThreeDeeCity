import { Tile } from './Tile.js';
import { RoadAccessModule, PowerModule, WaterModule, TrafficModule, ServiceModule, EnvironmentModule } from './SimModule.js';
import { GameConfig } from '../GameConfig.js';
import { createNoise2D } from 'simplex-noise';

export class City {
  constructor(width, height) {
    this.name = 'New City';
    this.size = { width, height };
    this.grid = [];
    
    this.powerGrid = [];
    this.waterGrid = [];
    this.trafficGrid = [];
    this.roadAccessGrid = [];
    this.landValueGrid = [];
    this.pollutionGrid = [];
    
    this.serviceGrids = {
      police: [],
      fire: [],
      school: [],
      hospital: [],
      park: []
    };
    
    this.stats = {
      population: 0,
      jobs: 0,
      money: 10000,
      date: new Date(2026, 0, 1),
      powerSupply: 0,
      powerDemand: 0,
      demand: { residential: 0, commercial: 0, industrial: 0 },
      happiness: 50,
      landValue: 50,
      unemployment: 0,
      approval: 50
    };
    this.taxRates = { ...GameConfig.taxRates };
    this.monthlyExpenses = 0;

    this.onTileChanged = null;
    this.init();
  }

  setDifficulty(difficulty) {
    this.stats.money = GameConfig.startingMoney[difficulty] || GameConfig.startingMoney.medium;
  }

  init() {
    const noise2D = createNoise2D();

    for (let x = 0; x < this.size.width; x++) {
      this.grid[x] = [];
      this.powerGrid[x] = [];
      this.waterGrid[x] = [];
      this.trafficGrid[x] = [];
      this.roadAccessGrid[x] = [];
      
      this.serviceGrids.police[x] = [];
      this.serviceGrids.fire[x] = [];
      this.serviceGrids.school[x] = [];
      this.serviceGrids.hospital[x] = [];
      this.serviceGrids.park[x] = [];
      this.landValueGrid[x] = [];
      this.pollutionGrid[x] = [];

      for (let y = 0; y < this.size.height; y++) {
        // Generate terrain using fractal noise
        const nx = x / 16;
        const ny = y / 16;
        const e = 1 * noise2D(nx, ny) + 0.5 * noise2D(2 * nx, 2 * ny) + 0.25 * noise2D(4 * nx, 4 * ny);
        const elevation = Math.max(0, Math.min(1, (e + 1.75) / 3.5)); // Normalize roughly to 0..1

        const tile = new Tile(x, y);
        tile.elevation = elevation;
        
        // Sea level at 0.35
        if (elevation < 0.35) {
          tile.type = 'water';
        }

        tile.addModule(new RoadAccessModule());
        tile.addModule(new PowerModule());
        tile.addModule(new WaterModule());
        tile.addModule(new TrafficModule());
        tile.addModule(new ServiceModule());
        tile.addModule(new EnvironmentModule());
        this.grid[x][y] = tile;
        this.powerGrid[x][y] = false;
        this.waterGrid[x][y] = false;
        this.trafficGrid[x][y] = 0;
        this.roadAccessGrid[x][y] = false;
        this.landValueGrid[x][y] = 50;
        this.pollutionGrid[x][y] = 0;

        this.serviceGrids.police[x][y] = false;
        this.serviceGrids.fire[x][y] = false;
        this.serviceGrids.school[x][y] = false;
        this.serviceGrids.hospital[x][y] = false;
        this.serviceGrids.park[x][y] = false;
      }
    }
  }

  simulate() {
    this.stats.date.setDate(this.stats.date.getDate() + 1);
    
    // Update infrastructure and traffic before tile simulation
    this.updateInfrastructureGrids();
    this.updateTraffic();
    this.updatePollution();
    this.updateLandValue();

    // Budget and lot consolidation
    if (this.stats.date.getDate() === 1) {
      this.processMonthlyBudget();
    }

    // Frequent consolidation check for responsiveness
    this.consolidateLots();

    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        this.grid[x][y].simulate(this);
      }
    }

    this.updateStats();
  }

  updateInfrastructureGrids() {
    // 1. Reset grids and calculate supply/demand
    this.stats.powerSupply = 0;
    this.stats.powerDemand = 0;
    
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        const tile = this.grid[x][y];
        this.powerGrid[x][y] = false;
        this.waterGrid[x][y] = false;

        // Supply
        if (tile.type === 'power-coal') this.stats.powerSupply += 2000;
        if (tile.type === 'power-wind') this.stats.powerSupply += 500;
        
        // Demand
        if (tile.type === 'residential') this.stats.powerDemand += tile.residents * 0.2;
        if (tile.type === 'commercial') this.stats.powerDemand += tile.jobs * 0.5;
        if (tile.type === 'industrial') this.stats.powerDemand += tile.jobs * 1.0;
      }
    }

    const powerSources = [];
    const waterSources = [];

    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        const tile = this.grid[x][y];
        if (tile.type === 'power-coal' || tile.type === 'power-wind') {
          powerSources.push({ x, y });
        }
        if (tile.type === 'water-pump') {
          waterSources.push({ x, y });
        }
      }
    }

    // 2. Spread infrastructure
    this.runBFS(powerSources, this.powerGrid, (tile) => {
      // Power spreads through roads, utilities, and powered zones
      return tile.type === 'road' || 
             tile.type === 'power-coal' || 
             tile.type === 'power-wind' || 
             tile.type === 'power-line' ||
             tile.overlay === 'power-line' ||
             ['residential', 'commercial', 'industrial'].includes(tile.type);
    }, 100);

    this.runBFS(waterSources, this.waterGrid, (tile) => {
      // Water spreads through roads, pumps, and watered zones
      return tile.type === 'road' || 
             tile.type === 'water-pump' ||
             ['residential', 'commercial', 'industrial'].includes(tile.type);
    }, 100);

    // 3. Spread Road Access (Blocks)
    const roads = [];
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        const tile = this.grid[x][y];
        this.roadAccessGrid[x][y] = false;
        if (tile.type === 'road' || tile.type === 'highway') {
          roads.push({ x, y });
          this.roadAccessGrid[x][y] = true;
        }
      }
    }
    
    this.runBFS(roads, this.roadAccessGrid, (tile) => {
      // Access spreads from roads into adjacent zones of the same type
      // We allow it to spread into RCI zones up to a depth of 8 tiles
      return ['residential', 'commercial', 'industrial'].includes(tile.type);
    }, 8); 

    this.updateServiceGrids();
  }

  updateServiceGrids() {
    // Reset grids and collect sources
    const sources = {
      police: [],
      fire: [],
      school: [],
      hospital: [],
      park: []
    };

    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        this.serviceGrids.police[x][y] = false;
        this.serviceGrids.fire[x][y] = false;
        this.serviceGrids.school[x][y] = false;
        this.serviceGrids.hospital[x][y] = false;
        this.serviceGrids.park[x][y] = false;

        const tile = this.grid[x][y];
        if (tile.type === 'police') sources.police.push({x, y});
        else if (tile.type === 'fire') sources.fire.push({x, y});
        else if (tile.type === 'school') sources.school.push({x, y});
        else if (tile.type === 'hospital') sources.hospital.push({x, y});
        else if (tile.type === 'park') sources.park.push({x, y});
      }
    }

    // Spread services based on their respective radiuses
    // Services spread via roads (like power/water) but also freely through RCI zones
    const canSpread = (tile) => {
      return ['road', 'highway', 'residential', 'commercial', 'industrial'].includes(tile.type) ||
             ['police', 'fire', 'school', 'hospital', 'park'].includes(tile.type);
    };

    this.runBFS(sources.police, this.serviceGrids.police, canSpread, GameConfig.serviceRadius.policeStation);
    this.runBFS(sources.fire, this.serviceGrids.fire, canSpread, GameConfig.serviceRadius.fireStation);
    this.runBFS(sources.school, this.serviceGrids.school, canSpread, GameConfig.serviceRadius.school);
    this.runBFS(sources.hospital, this.serviceGrids.hospital, canSpread, GameConfig.serviceRadius.hospital);
    this.runBFS(sources.park, this.serviceGrids.park, canSpread, GameConfig.serviceRadius.park);
  }

  runBFS(sources, grid, canSpreadFunc, maxDistance = 100) {
    const queue = sources.map(s => ({ ...s, d: 0 }));
    sources.forEach(s => grid[s.x][s.y] = true);

    while (queue.length > 0) {
      const { x, y, d } = queue.shift();
      if (d >= maxDistance) continue;

      const neighbors = [
        { x: x + 1, y }, { x: x - 1, y },
        { x, y: y + 1 }, { x, y: y - 1 }
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < this.size.width && n.y >= 0 && n.y < this.size.height) {
          if (!grid[n.x][n.y] && canSpreadFunc(this.grid[n.x][n.y])) {
            grid[n.x][n.y] = true;
            queue.push({ ...n, d: d + 1 });
          }
        }
      }
    }
    
    // Spread power to adjacent RCI from powered roads/zones (2 tile jump)
    if (grid === this.powerGrid) {
      this.spreadToAdjacent(grid);
      this.spreadToAdjacent(grid); // 2nd pass for 2-tile jump
    }
    // Water spreads 1 tile from roads/pumps
    if (grid === this.waterGrid) {
      this.spreadToAdjacent(grid);
    }
  }

  spreadToAdjacent(grid) {
    const newPowered = [];
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        if (grid[x][y]) {
          const neighbors = [
            { x: x + 1, y }, { x: x - 1, y },
            { x, y: y + 1 }, { x, y: y - 1 }
          ];
          for (const n of neighbors) {
            if (n.x >= 0 && n.x < this.size.width && n.y >= 0 && n.y < this.size.height) {
              if (!grid[n.x][n.y]) newPowered.push(n);
            }
          }
        }
      }
    }
    newPowered.forEach(p => grid[p.x][p.y] = true);
  }

  processMonthlyBudget() {
    let taxRevenue = 0;
    let maintenance = 0;

    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        const tile = this.grid[x][y];
        if (tile.type === 'residential') {
          taxRevenue += tile.residents * this.taxRates.residential * 10;
        } else if (tile.type === 'commercial') {
          taxRevenue += tile.jobs * this.taxRates.commercial * 15;
        } else if (tile.type === 'industrial') {
          taxRevenue += tile.jobs * this.taxRates.industrial * 12;
        }

        // Maintenance
        if (tile.type === 'road') maintenance += 2;
        if (tile.type === 'power-coal') maintenance += 500;
        if (tile.type === 'power-wind') maintenance += 50;
        if (tile.type === 'water-pump') maintenance += 200;
      }
    }

    this.monthlyExpenses = maintenance;
    this.stats.money += Math.floor(taxRevenue - this.monthlyExpenses);
  }

  updateStats() {
    let totalPop = 0;
    let totalJobs = 0;
    let totalHappiness = 0;
    let resTiles = 0;
    let totalLandValue = 0;
    let landTiles = 0;

    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        const tile = this.grid[x][y];
        // Multi-tile building population is stored in the anchor
        if (tile.isAnchor) {
          totalPop += tile.residents || 0;
          totalJobs += tile.jobs || 0;
          if (tile.type === 'residential' && tile.residents > 0) {
            totalHappiness += tile.happiness || 50;
            resTiles++;
          }
        }
        if (tile.type === 'residential' || tile.type === 'commercial') {
            totalLandValue += this.landValueGrid[x][y];
            landTiles++;
        }
      }
    }
    this.stats.population = Math.floor(totalPop);
    this.stats.jobs = Math.floor(totalJobs);
    
    // Calculate Unemployment (assuming ~50% of population is workforce)
    const workforce = this.stats.population * 0.5;
    if (workforce > 0) {
      const unemployed = Math.max(0, workforce - this.stats.jobs);
      this.stats.unemployment = Math.floor((unemployed / workforce) * 100);
    } else {
      this.stats.unemployment = 0;
    }

    this.stats.happiness = resTiles > 0 ? Math.floor(totalHappiness / resTiles) : 50;
    this.stats.landValue = landTiles > 0 ? Math.floor(totalLandValue / landTiles) : 50;
    
    // Calculate Approval Rating
    let approval = this.stats.happiness;
    const avgTax = (this.taxRates.residential + this.taxRates.commercial + this.taxRates.industrial) / 3;
    if (avgTax > 0.09) approval -= (avgTax - 0.09) * 200; // High tax penalty
    if (this.stats.unemployment > 5) approval -= (this.stats.unemployment - 5) * 2; // Unemployment penalty
    this.stats.approval = Math.max(0, Math.min(100, Math.floor(approval)));
  }

  consolidateLots() {
    // We scan for 3x3 and 2x2 opportunities
    // Scan 3x3 (Heavy only)
    this._scanForLots(3, 3, 3);
    // Scan 2x2 (Medium and Heavy)
    this._scanForLots(2, 2, 2);
  }

  _scanForLots(w, h, minDensity) {
    for (let x = 0; x <= this.size.width - w; x++) {
      for (let y = 0; y <= this.size.height - h; y++) {
        const anchor = this.grid[x][y];
        if (!anchor.isAnchor || anchor.lotSize.w > 1) continue;
        if (anchor.density < minDensity) continue;
        if (anchor.type === 'grass' || anchor.type === 'road') continue;

        // Check demand - be more aggressive (threshold 5)
        if (this.stats.demand[anchor.type] < 5) continue;

        // Verify rectangle is uniform, available, and HAS ROAD ACCESS
        let canMerge = true;
        let hasAccess = false;
        for (let ix = x; ix < x + w; ix++) {
          for (let iy = y; iy < y + h; iy++) {
            const t = this.grid[ix][iy];
            if (t.type !== anchor.type || t.density !== anchor.density || !t.isAnchor || t.lotSize.w > 1) {
              canMerge = false;
              break;
            }
            if (this.roadAccessGrid[ix][iy]) hasAccess = true;
          }
          if (!canMerge) break;
        }

        if (canMerge && hasAccess) {
          const lotId = `lot-${x}-${y}-${Date.now()}`;
          anchor.lotId = lotId;
          anchor.lotSize = { w, h };
          anchor.isAnchor = true;
          // Scale residents/jobs to the new lot capacity (simplified)
          anchor.residents *= (w * h);
          anchor.jobs *= (w * h);

          for (let ix = x; ix < x + w; ix++) {
            for (let iy = y; iy < y + h; iy++) {
              if (ix === x && iy === y) continue;
              const t = this.grid[ix][iy];
              t.lotId = lotId;
              t.isAnchor = false;
              t.residents = 0;
              t.jobs = 0;
              t.developmentLevel = 0;
              if (this.onTileChanged) this.onTileChanged(ix, iy, t);
            }
          }
          if (this.onTileChanged) this.onTileChanged(x, y, anchor);
        }
      }
    }
  }

  updateTraffic() {
    // 1. Decay traffic and commute time
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        this.trafficGrid[x][y] *= 0.5;
        const tile = this.grid[x][y];
        if (tile.type === 'residential' && tile.commuteTime > 0) {
          tile.commuteTime *= 0.95;
        }
      }
    }

    // 2. Sample random commuters
    const residentialTiles = [];
    const jobTiles = [];
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        const tile = this.grid[x][y];
        if (tile.type === 'residential' && tile.residents > 0) residentialTiles.push(tile);
        if ((tile.type === 'commercial' || tile.type === 'industrial') && tile.jobs > 0) jobTiles.push(tile);
      }
    }

    // Limit number of pathfinding calls per tick for performance
    const samples = Math.min(residentialTiles.length, 10);
    for (let i = 0; i < samples; i++) {
      const start = residentialTiles[Math.floor(Math.random() * residentialTiles.length)];
      const end = jobTiles[Math.floor(Math.random() * jobTiles.length)];
      if (start && end) {
        const path = this.findPath(start, end);
        if (path) {
          start.commuteTime = path.length;
          path.forEach(p => {
            this.trafficGrid[p.x][p.y] += 5; // Add traffic weight
          });
        } else {
          start.commuteTime = 50; // Penalty for no route
        }
      }
    }
  }

  /**
   * Simple A* Pathfinding for commuters
   */
  findPath(start, end) {
    const openSet = [{ x: start.x, y: start.y, g: 0, f: 0, parent: null }];
    const closedSet = new Set();
    const target = { x: end.x, y: end.y };

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const key = `${current.x},${current.y}`;

      if (current.x === target.x && current.y === target.y) {
        const path = [];
        let temp = current;
        while (temp) {
          path.push({ x: temp.x, y: temp.y });
          temp = temp.parent;
        }
        return path;
      }

      closedSet.add(key);

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];

      for (const n of neighbors) {
        if (n.x < 0 || n.x >= this.size.width || n.y < 0 || n.y >= this.size.height) continue;
        if (closedSet.has(`${n.x},${n.y}`)) continue;

        const tile = this.grid[n.x][n.y];
        // Commuters only travel on roads, highways, or rail (simplified for now)
        const isTransit = tile.type === 'road' || tile.type === 'highway' || tile.type === 'rail-line' || 
                          tile.type === 'residential' || tile.type === 'commercial' || tile.type === 'industrial';
        
        if (!isTransit) continue;

        const g = current.g + 1;
        const h = Math.abs(n.x - target.x) + Math.abs(n.y - target.y);
        const f = g + h;

        const existing = openSet.find(o => o.x === n.x && o.y === n.y);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          }
        } else {
          openSet.push({ ...n, g, f, parent: current });
        }
      }
    }
    return null;
  }

  updatePollution() {
    // 1. Decay pollution
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        this.pollutionGrid[x][y] *= 0.5;
      }
    }
    
    // 2. Generate pollution
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        const tile = this.grid[x][y];
        if (tile.type === 'power-coal') this.pollutionGrid[x][y] += 100;
        else if (tile.type === 'industrial') this.pollutionGrid[x][y] += tile.jobs * 2;
        else if (tile.type === 'highway') this.pollutionGrid[x][y] += (this.trafficGrid[x][y] || 0) * 0.5;
        else if (tile.type === 'road') this.pollutionGrid[x][y] += (this.trafficGrid[x][y] || 0) * 0.2;
      }
    }
    
    // 3. Smooth pollution (spread to neighbors)
    const newPollution = Array(this.size.width).fill(0).map(() => Array(this.size.height).fill(0));
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        let total = this.pollutionGrid[x][y];
        const neighbors = [
          { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
          { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
          { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
          { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
        ];
        for (const { dx, dy } of neighbors) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < this.size.width && ny >= 0 && ny < this.size.height) {
            total += this.pollutionGrid[nx][ny] * 0.25;
          }
        }
        newPollution[x][y] = total;
      }
    }
    this.pollutionGrid = newPollution;
  }

  updateLandValue() {
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        let value = 50; // Base value
        
        // Positive modifiers
        if (this.serviceGrids.park[x][y]) value += 20;
        if (this.serviceGrids.school[x][y]) value += 15;
        if (this.serviceGrids.hospital[x][y]) value += 15;
        if (this.serviceGrids.police[x][y]) value += 10;
        if (this.serviceGrids.fire[x][y]) value += 5;
        
        // Negative modifiers
        value -= this.pollutionGrid[x][y] * 0.5;
        value -= (this.trafficGrid[x][y] || 0) * 0.1;
        
        this.landValueGrid[x][y] = Math.max(0, Math.min(100, value));
      }
    }
  }
}

