export class Tile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type = 'grass'; // grass, residential, commercial, industrial, road
    this.modules = [];
    this.residents = 0;
    this.level = 0; // 0: undeveloped, 1-3: density levels
  }

  addModule(module) {
    this.modules.push(module);
  }

  simulate(city) {
    // Run all modules
    for (const module of this.modules) {
      module.simulate(this, city);
    }
    
    const roadAccess = this.modules.find(m => m.name === 'RoadAccess')?.hasAccess;

    // Simple growth logic based on road access
    if (this.type === 'residential' && roadAccess) {
      if (Math.random() > 0.8) { // 20% chance per tick
        this.residents += Math.floor(Math.random() * 5) + 1;
        
        // Level up based on population density
        if (this.residents > 50 && this.level < 3) this.level = 3;
        else if (this.residents > 20 && this.level < 2) this.level = 2;
        else if (this.residents > 0 && this.level < 1) this.level = 1;
      }
    } else if (this.type === 'residential' && !roadAccess) {
      // Abandonment if no road access
      if (Math.random() > 0.9) {
        this.residents = Math.max(0, this.residents - 2);
        if (this.residents === 0) this.level = 0;
      }
    }
  }
}
