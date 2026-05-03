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

    // Simulation logic based on type
    if (this.type === 'residential') {
      this.simulateResidential(city, roadAccess);
    } else if (this.type === 'commercial' || this.type === 'industrial') {
      this.simulateEmployment(city, roadAccess);
    }
  }

  simulateResidential(city, roadAccess) {
    if (roadAccess && !this.abandoned) {
      // Growth logic
      if (Math.random() > 0.7) { // Growth chance
        const maxPop = this.density * 50; // Max pop based on density
        if (this.residents < maxPop) {
          this.residents += Math.floor(Math.random() * 5) + 1;
          this.updateDevelopmentLevel();
        }
      }
    } else if (!roadAccess && this.residents > 0) {
      // Abandonment
      if (Math.random() > 0.9) {
        this.residents = Math.max(0, this.residents - 5);
        if (this.residents === 0) {
          this.developmentLevel = 0;
          this.abandoned = true;
        }
      }
    }
  }

  simulateEmployment(city, roadAccess) {
    if (roadAccess && !this.abandoned) {
      if (Math.random() > 0.8) {
        const maxJobs = this.density * 30;
        if (this.jobs < maxJobs) {
          this.jobs += Math.floor(Math.random() * 3) + 1;
          this.updateDevelopmentLevel();
        }
      }
    } else if (!roadAccess && this.jobs > 0) {
      if (Math.random() > 0.9) {
        this.jobs = Math.max(0, this.jobs - 3);
        if (this.jobs === 0) {
          this.developmentLevel = 0;
          this.abandoned = true;
        }
      }
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
