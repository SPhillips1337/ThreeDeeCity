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
    this.styleId = Math.floor(Math.random() * 4); // 0-3 for visual variety
    
    // Lot Consolidation
    this.lotId = null;
    this.isAnchor = true;
    this.lotSize = { w: 1, h: 1 };
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
    const traffic = this.modules.find(m => m.name === 'Traffic');
    const services = this.modules.find(m => m.name === 'Services');

    if (!roadAccess || !roadAccess.hasAccess) {
      this.abandoned = true;
      this.residents = 0;
      this.developmentLevel = 0;
      return;
    }

    // High congestion leads to abandonment
    if (traffic && traffic.congestion > 80) {
      this.abandoned = true;
      this.residents *= 0.95;
      if (this.residents < 1) this.developmentLevel = 0;
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

    // Service Impacts
    let serviceMultiplier = 1.0;
    let maxLevel = 3;
    
    if (services) {
      if (services.coverage.police) serviceMultiplier += 0.2;
      if (services.coverage.fire) serviceMultiplier += 0.1;
      if (services.coverage.park) serviceMultiplier += 0.3; // High desirability
      
      // Heavy residential needs school and hospital to reach level 3
      if (this.density === 3) {
        if (!services.coverage.school || !services.coverage.hospital) {
          maxLevel = 2; // Cap development if uneducated/unhealthy
        } else {
          serviceMultiplier += 0.4;
        }
      }
    }

    const capacity = Math.pow(this.density, 2) * 50;
    
    if (this.residents < capacity && hasInfrastructure) {
      // Growth slowed by traffic, boosted by services
      const trafficPenalty = traffic ? Math.max(0, (traffic.congestion / 100)) : 0;
      const growth = (5 + Math.random() * 5) * serviceMultiplier * (1 - trafficPenalty); 
      this.residents += Math.max(0, growth);
    }

    // Level up based on population
    if (this.residents > capacity * 0.8 && this.developmentLevel < maxLevel) {
      this.developmentLevel++;
    } else if (this.developmentLevel > maxLevel) {
      // Downgrade if services are lost
      this.developmentLevel = maxLevel;
      this.residents = capacity * 0.8;
      this.abandoned = true; // Temporary abandonment flash
    }
  }

  simulateCommercial(city) {
    const roadAccess = this.modules.find(m => m.name === 'RoadAccess');
    const power = this.modules.find(m => m.name === 'Power');
    const water = this.modules.find(m => m.name === 'Water');
    const traffic = this.modules.find(m => m.name === 'Traffic');
    const services = this.modules.find(m => m.name === 'Services');

    if (!roadAccess || !roadAccess.hasAccess || !power.hasPower || !water.hasWater) {
      this.abandoned = true;
      this.jobs = 0;
      this.developmentLevel = 0;
      return;
    }

    // Commercial is VERY sensitive to traffic
    if (traffic && traffic.congestion > 70) {
      this.abandoned = true;
      this.jobs *= 0.9;
      if (this.jobs < 1) this.developmentLevel = 0;
      return;
    }

    this.abandoned = false;

    let serviceMultiplier = 1.0;
    let maxLevel = 3;

    if (services) {
      if (services.coverage.police) serviceMultiplier += 0.3; // Crime is bad for business
      else if (this.density >= 2) maxLevel = 2; // Medium/Heavy Commercial needs police

      if (services.coverage.fire) serviceMultiplier += 0.1;
      else if (this.density === 3) maxLevel = 2; // Heavy commercial needs fire protection
      
      if (services.coverage.park) serviceMultiplier += 0.2; // Nice areas attract shoppers
    }

    const capacity = Math.pow(this.density, 2) * 30;
    if (this.jobs < capacity) {
      const trafficPenalty = traffic ? Math.max(0, (traffic.congestion / 80)) : 0;
      this.jobs += Math.random() * 3 * serviceMultiplier * (1 - trafficPenalty);
    }

    if (this.jobs > capacity * 0.8 && this.developmentLevel < maxLevel) {
      this.developmentLevel++;
    } else if (this.developmentLevel > maxLevel) {
      this.developmentLevel = maxLevel;
      this.jobs = capacity * 0.8;
      this.abandoned = true;
    }
  }

  simulateIndustrial(city) {
    const roadAccess = this.modules.find(m => m.name === 'RoadAccess');
    const power = this.modules.find(m => m.name === 'Power');
    const water = this.modules.find(m => m.name === 'Water');
    const traffic = this.modules.find(m => m.name === 'Traffic');

    if (!roadAccess || !roadAccess.hasAccess || !power.hasPower) {
      this.abandoned = true;
      this.jobs = 0;
      this.developmentLevel = 0;
      return;
    }

    // Industrial is moderately sensitive to traffic
    if (traffic && traffic.congestion > 90) {
      this.abandoned = true;
      this.jobs *= 0.95;
      if (this.jobs < 1) this.developmentLevel = 0;
      return;
    }

    this.abandoned = false;
    
    let maxLevel = 3;
    let serviceMultiplier = 1.0;
    const services = this.modules.find(m => m.name === 'Services');
    
    if (services) {
      if (services.coverage.fire) {
        serviceMultiplier += 0.2;
      } else if (this.density >= 2) {
        maxLevel = 2; // Heavy industrial requires fire protection
      }
    }

    const capacity = Math.pow(this.density, 2) * 40;
    if (this.jobs < capacity) {
      const trafficPenalty = traffic ? Math.max(0, (traffic.congestion / 120)) : 0;
      this.jobs += Math.random() * 4 * serviceMultiplier * (1 - trafficPenalty);
    }

    if (this.jobs > capacity * 0.8 && this.developmentLevel < maxLevel) {
      this.developmentLevel++;
    } else if (this.developmentLevel > maxLevel) {
      this.developmentLevel = maxLevel;
      this.jobs = capacity * 0.8;
      this.abandoned = true;
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
