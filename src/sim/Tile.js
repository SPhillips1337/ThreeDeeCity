export class Tile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type = 'grass'; // grass, residential, commercial, industrial, road
    this.density = 0; // 0: none, 1: light, 2: medium, 3: heavy
    this.modules = [];
    this.residents = 0;
    this.jobs = 0;
    this.developmentLevel = 0; // 0: undeveloped, 1-3: current building level
    this.abandoned = false;
    this.overlay = null; // e.g., 'power-line'
  }

  addModule(module) {
    this.modules.push(module);
  }

  simulate(city) {
    // Run all modules
    for (const module of this.modules) {
      module.simulate(this, city);
    }
    
    // Simulation logic based on type
    if (this.type === 'residential') {
      this.simulateResidential(city);
    } else if (this.type === 'commercial') {
      this.simulateCommercial(city);
    } else if (this.type === 'industrial') {
      this.simulateIndustrial(city);
    }
  }

  simulateResidential(city) {
    const roadAccess = this.modules.find(m => m.name === 'RoadAccess');
    const power = this.modules.find(m => m.name === 'Power');
    const water = this.modules.find(m => m.name === 'Water');

    if (!roadAccess || !roadAccess.hasAccess) {
      if (this.residents > 0) {
        console.log(`Tile at ${this.x},${this.y} lost road access!`);
      }
      this.abandoned = true;
      this.residents = 0;
      this.developmentLevel = 0;
      return;
    }

    // Require Power/Water for development > 0
    const hasInfrastructure = power.hasPower && water.hasWater;

    if (this.developmentLevel > 0 && !hasInfrastructure) {
      this.abandoned = true;
      this.residents *= 0.9;
      if (this.residents < 1) this.developmentLevel = 0;
      return;
    }

    this.abandoned = false;
    const capacity = Math.pow(this.density, 2) * 50;
    
    if (this.residents < capacity && hasInfrastructure) {
      // Aggressive growth for testing
      const growth = 5 + Math.random() * 5; 
      this.residents += growth;
      console.log(`Tile at ${this.x},${this.y} growing: ${this.residents.toFixed(1)}`);
    }

    // Level up based on population
    if (this.residents > capacity * 0.8 && this.developmentLevel < 3) {
      this.developmentLevel++;
    }
  }

  simulateCommercial(city) {
    const roadAccess = this.modules.find(m => m.name === 'RoadAccess');
    const power = this.modules.find(m => m.name === 'Power');
    const water = this.modules.find(m => m.name === 'Water');

    if (!roadAccess || !roadAccess.hasAccess || !power.hasPower || !water.hasWater) {
      this.abandoned = true;
      this.jobs = 0;
      this.developmentLevel = 0;
      return;
    }

    this.abandoned = false;
    const capacity = Math.pow(this.density, 2) * 30;
    if (this.jobs < capacity) {
      this.jobs += Math.random() * 3;
    }

    if (this.jobs > capacity * 0.8 && this.developmentLevel < 3) {
      this.developmentLevel++;
    }
  }

  simulateIndustrial(city) {
    const roadAccess = this.modules.find(m => m.name === 'RoadAccess');
    const power = this.modules.find(m => m.name === 'Power');
    const water = this.modules.find(m => m.name === 'Water');

    if (!roadAccess || !roadAccess.hasAccess || !power.hasPower) {
      this.abandoned = true;
      this.jobs = 0;
      this.developmentLevel = 0;
      return;
    }

    this.abandoned = false;
    const capacity = Math.pow(this.density, 2) * 40;
    if (this.jobs < capacity) {
      this.jobs += Math.random() * 4;
    }

    if (this.jobs > capacity * 0.8 && this.developmentLevel < 3) {
      this.developmentLevel++;
    }
  }

  updateDevelopmentLevel() {
    const total = this.residents + this.jobs;
    if (total > 80) this.developmentLevel = 3;
    else if (total > 30) this.developmentLevel = 2;
    else if (total > 0) this.developmentLevel = 1;
    else this.developmentLevel = 0;
  }
}
