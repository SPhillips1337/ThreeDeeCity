import { Tile } from './Tile.js';
import { RoadAccessModule, PowerModule, WaterModule } from './SimModule.js';
import { GameConfig } from '../GameConfig.js';

export class City {
  constructor(width, height) {
    this.name = 'New City';
    this.size = { width, height };
    this.grid = [];
    
    this.powerGrid = [];
    this.waterGrid = [];
    
    this.stats = {
      population: 0,
      jobs: 0,
      money: 10000,
      date: new Date(2026, 0, 1),
      powerSupply: 0,
      powerDemand: 0,
      demand: { residential: 0, commercial: 0, industrial: 0 }
    };
    this.taxRates = { ...GameConfig.taxRates };
    this.monthlyExpenses = 0;

    this.init();
  }

  setDifficulty(difficulty) {
    this.stats.money = GameConfig.startingMoney[difficulty] || GameConfig.startingMoney.medium;
  }

  init() {
    for (let x = 0; x < this.size.width; x++) {
      this.grid[x] = [];
      this.powerGrid[x] = [];
      this.waterGrid[x] = [];
      for (let y = 0; y < this.size.height; y++) {
        const tile = new Tile(x, y);
        tile.addModule(new RoadAccessModule());
        tile.addModule(new PowerModule());
        tile.addModule(new WaterModule());
        this.grid[x][y] = tile;
        this.powerGrid[x][y] = false;
        this.waterGrid[x][y] = false;
      }
    }
  }

  simulate() {
    this.stats.date.setDate(this.stats.date.getDate() + 1);
    
    // Update infrastructure before tile simulation
    this.updateInfrastructureGrids();

    // Monthly budget processing
    if (this.stats.date.getDate() === 1) {
      this.processMonthlyBudget();
    }

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
        if (tile.type === 'power-coal') this.stats.powerSupply += 500;
        if (tile.type === 'power-wind') this.stats.powerSupply += 100;
        
        // Demand
        if (tile.type === 'residential') this.stats.powerDemand += tile.residents * 0.5;
        if (tile.type === 'commercial') this.stats.powerDemand += tile.jobs * 1.0;
        if (tile.type === 'industrial') this.stats.powerDemand += tile.jobs * 1.5;
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
      // Power spreads through roads, power-related buildings, or power-line overlays
      return tile.type === 'road' || 
             tile.type === 'power-coal' || 
             tile.type === 'power-wind' || 
             tile.type === 'power-line' ||
             tile.overlay === 'power-line';
    }, 100);

    this.runBFS(waterSources, this.waterGrid, (tile) => {
      // Water spreads through roads and water-related infrastructure
      return tile.type === 'road' || tile.type === 'water-pump';
    }, 100);
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
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        totalPop += this.grid[x][y].residents || 0;
        totalJobs += this.grid[x][y].jobs || 0;
      }
    }
    this.stats.population = Math.floor(totalPop);
    this.stats.jobs = Math.floor(totalJobs);
    if (this.stats.population > 0 && Math.random() > 0.9) {
      console.log(`City Population: ${this.stats.population}`);
    }
  }
}
