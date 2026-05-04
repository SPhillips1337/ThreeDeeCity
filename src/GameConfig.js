export const GameConfig = {
  // Placement Costs
  costs: {
    residential: {
      light: 50,
      medium: 100,
      heavy: 200
    },
    commercial: {
      light: 80,
      medium: 150,
      heavy: 300
    },
    industrial: {
      light: 100,
      medium: 200,
      heavy: 400
    },
    road: 10,
    highway: 50,
    powerLine: 5,
    bulldoze: 5,
    power: {
      coal: 5000,
      wind: 1000
    },
    water: {
      pump: 2500
    },
    transit: {
      busStop: 500,
      railLine: 100,
      railStation: 3000
    },
    civic: {
      policeStation: 1500,
      fireStation: 1500,
      school: 2500,
      hospital: 4000,
      park: 800
    }
  },

  serviceRadius: {
    policeStation: 12,
    fireStation: 10,
    school: 15,
    hospital: 18,
    park: 8
  },
  
  // Simulation Settings
  taxRates: {
    residential: 0.09,
    commercial: 0.09,
    industrial: 0.09
  },
  
  // Starting Money by Difficulty
  startingMoney: {
    easy: 50000,
    medium: 20000,
    hard: 10000
  }
};
