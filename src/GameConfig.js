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
    bulldoze: 5
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
