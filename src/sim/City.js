import { Tile } from './Tile.js';
import { RoadAccessModule } from './SimModule.js';
import { GameConfig } from '../GameConfig.js';

export class City {
  constructor(width, height) {
    this.name = 'New City';
    this.size = { width, height };
    this.grid = [];
    this.stats = {
      population: 0,
      jobs: 0,
      money: 10000,
      date: new Date(2026, 0, 1)
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
      for (let y = 0; y < this.size.height; y++) {
        const tile = new Tile(x, y);
        tile.addModule(new RoadAccessModule());
        this.grid[x][y] = tile;
      }
    }
  }

  simulate() {
    this.stats.date.setDate(this.stats.date.getDate() + 1);
    
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

  processMonthlyBudget() {
    let taxRevenue = 0;
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
      }
    }

    // Road maintenance
    let roadCount = 0;
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        if (this.grid[x][y].type === 'road') roadCount++;
      }
    }
    const roadMaintenance = roadCount * 2;
    
    this.monthlyExpenses = roadMaintenance;
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
    this.stats.population = totalPop;
    this.stats.jobs = totalJobs;
  }
}
