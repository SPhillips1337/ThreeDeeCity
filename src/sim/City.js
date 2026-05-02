import { Tile } from './Tile.js';
import { RoadAccessModule } from './SimModule.js';

export class City {
  constructor(width, height) {
    this.size = { width, height };
    this.grid = [];
    this.stats = {
      population: 0,
      money: 10000,
      date: new Date(2026, 0, 1)
    };

    this.init();
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
    // Basic simulation logic
    this.stats.date.setDate(this.stats.date.getDate() + 1);
    
    // Each tile simulates its modules
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        this.grid[x][y].simulate(this);
      }
    }

    // Update global stats based on tile states
    this.updateStats();
  }

  updateStats() {
    let totalPop = 0;
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        if (this.grid[x][y].residents) {
          totalPop += this.grid[x][y].residents;
        }
      }
    }
    this.stats.population = totalPop;
    
    // Tax income? (placeholder)
    this.stats.money += Math.floor(totalPop * 0.1);
  }
}
