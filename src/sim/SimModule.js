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
    // Check neighbors for roads
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
          break;
        }
      }
    }
  }
}
