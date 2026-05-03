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
        if (city.grid[pos.x][pos.y].type === 'road') {
          this.hasAccess = true;
          // console.log(`Tile at ${tile.x},${tile.y} has road access`);
          break;
        }
      }
    }
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
    if (this.hasPower && Math.random() > 0.999) {
       console.log(`Tile at ${tile.x},${tile.y} has POWER`);
    }
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
    if (this.hasWater && Math.random() > 0.999) {
       console.log(`Tile at ${tile.x},${tile.y} has WATER`);
    }
  }
}
