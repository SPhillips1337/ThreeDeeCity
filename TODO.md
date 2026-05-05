# ThreeDeeCity — Development Roadmap

## ✅ Phase 1 — Engine Foundation
- [x] Three.js 3D scene setup with isometric camera
- [x] Tile-based 32×32 grid with click & drag interaction
- [x] Zone placement: Residential (R1/R2/R3), Commercial (C1/C2/C3), Industrial (I1/I2/I3)
- [x] Road placement tool
- [x] Bulldoze tool
- [x] Simulation loop (play / pause / fast-forward)
- [x] Game date, population, and money HUD
- [x] Modular tile simulation system (SimModule architecture)
- [x] New game setup screen (city name, difficulty)
- [x] Conventional Commits + Git workflow

## ✅ Phase 2 — Infrastructure & Economy
- [x] Power plant placement (Coal, Wind)
- [x] Power line placement (overlay on roads)
- [x] Water pump placement
- [x] BFS-based power & water spread through road network
- [x] Auto-connect power within 2-tile radius (no manual wiring needed)
- [x] Zone growth tied to road access, power, and water
- [x] RCI demand indicator bars
- [x] Power supply/demand meter (Blue/Orange/Red)
- [x] Cascading tool drawer sidebar (RCI, Utilities, Mass Transit)
- [x] Difficulty levels affecting budget
- [x] Monthly simulation costs

## ✅ Phase 3 — Traffic & Mass Transit
- [x] A* pathfinding engine for commuter simulation
- [x] Traffic heatmap on roads (blue → red congestion tint)
- [x] Traffic congestion impacts zone growth and triggers abandonment
- [x] Highway placement (higher capacity than roads)
- [x] Bus stop placement
- [x] Rail line placement
- [x] Rail station placement
- [x] WASD camera pan, Q/E camera rotation
- [x] Background music system (lazy-loaded playlist, speaker toggle in HUD)
- [x] Power balance retuned (Coal: 2000 units, Wind: 500 units)
- [x] Debug log cleanup

## ✅ Phase 4 — Zone Growth & Building Visuals
- [x] Buildings start as 1×1 and visually grow with development level
- [x] Light zones: small, low-rise buildings
- [x] Medium zones: mid-rise, taller buildings
- [x] Heavy residential/commercial: tall skyscrapers
- [x] Heavy industrial: wide footprint, not tall (1–2 storey, large lot)
- [x] Buildings within a zone tile cluster/scale based on density
- [x] Abandoned buildings rendered in grey

## ✅ Phase 5 — Civic Buildings & Services
- [x] Police Station (reduces crime, improves residential value)
- [x] Fire Station (reduces fire risk)
- [x] School / University (boosts R demand and land value)
- [x] Hospital (boosts residential desirability)
- [x] Park / Green Space (boosts adjacent land value)
- [x] Civic buildings provide AoE radius bonuses to nearby zones
- [x] "Coverage" overlay map to visualise service reach

## 📋 Phase 6 — Advanced Simulation & Happiness
- [x] Agent-based "happiness" score per residential zone
- [x] Commute time calculation (penalises long A* paths)
- [x] Land value system (affected by services, traffic, green space)
- [x] Crime & fire risk mechanics
- [x] Unemployment rate derived from R/C/I job balance
- [x] City rating / approval system

## 📋 Phase 7 — UI / UX Polish
- [ ] Traffic congestion overlay toggle (view mode)
- [x] Power coverage overlay toggle
- [x] Water coverage overlay toggle
- [ ] Mini-map panel
- [ ] Tooltip on tile hover (population, jobs, services)
- [ ] Notification system (zone abandoned, power shortage, etc.)
- [ ] City stats summary panel

## 📋 Phase 8 — Advanced Transport
- [ ] Subway system (underground rail, station + tunnel tiles)
- [ ] Bus route assignment (zones near bus stops get transit bonus)
- [ ] Traffic light simulation at road intersections
- [ ] Highway on/off ramp connectors
- [ ] Airport / Port for city import/export economy

## 📋 Future Considerations
- [ ] Save/Load game state (localStorage or IndexedDB)
- [ ] Multiple city scenarios / maps
- [ ] Disasters (fire, earthquake, flood)
- [ ] Achievements / milestones system
- [ ] Mobile touch support
