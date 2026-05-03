export class SimModule {
  constructor() {
    this.name = 'BaseModule';
  }

  /**
   * Called every simulation tick.
   * @param {import('./Tile.js').Tile} tile 
   * @param {import('./City.js').City} city 
   */
  simulate(tile, city) {
    // Override in subclasses
  }
}

export class RoadAccessModule extends SimModule {
  constructor() {
    super();
    this.name = 'RoadAccess';
    this.hasAccess = false;
  }

  simulate(tile, city) {
    this.hasAccess = false;
    const neighbors = [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 }
    ];
 
    for (const pos of neighbors) {
      if (pos.x >= 0 && pos.x < city.size.width && pos.y >= 0 && pos.y < city.size.height) {
        const neighbor = city.grid[pos.x][pos.y];
        if (neighbor.type === 'road' || neighbor.type === 'highway') {
          this.hasAccess = true;
          break;
        }
      }
    }
  }
}

export class TrafficModule extends SimModule {
  constructor() {
    super();
    this.name = 'Traffic';
    this.congestion = 0;
  }

  simulate(tile, city) {
    this.congestion = city.trafficGrid[tile.x][tile.y] || 0;
  }
}

export class PowerModule extends SimModule {
  constructor() {
    super();
    this.name = 'Power';
    this.hasPower = false;
  }

  simulate(tile, city) {
    // Read from city's power grid state
    this.hasPower = city.powerGrid[tile.x][tile.y] || false;
  }
}

export class WaterModule extends SimModule {
  constructor() {
    super();
    this.name = 'Water';
    this.hasWater = false;
  }

  simulate(tile, city) {
    // Read from city's water grid state
    this.hasWater = city.waterGrid[tile.x][tile.y] || false;
  }
}
