# ThreeDeeCity — Design Plan & Vision

## Overview
ThreeDeeCity is a browser-based 3D city-building simulation inspired by the SimCity franchise.
Built with **Three.js** + **Vite**, it runs entirely in the browser with no backend required.
The goal is a fully playable, aesthetically premium city builder with authentic simulation depth.

---

## Core Design Philosophy

- **Accessibility over complexity** — The game should be approachable without sacrificing depth.
- **Cause and effect** — Every player action should have visible, meaningful consequences on the simulation.
- **Progressive challenge** — Early game is forgiving; late game requires careful planning of infrastructure, traffic, and services.
- **Visual feedback first** — The 3D world should always communicate city health (traffic heatmaps, building heights, zone colours) without requiring the player to read stats.

---

## Game Loop

1. **Zone** land for Residential, Commercial, or Industrial use.
2. **Connect** zones with roads (and later highways, rail).
3. **Power and Water** the city by placing plants/pumps and running infrastructure.
4. **Watch the city grow** — buildings develop from empty lots to skyscrapers as population and jobs increase.
5. **Manage traffic** — congestion slows growth and causes abandonment. Transit infrastructure relieves pressure.
6. **Expand services** — police, fire, schools, hospitals keep citizens happy and land values high.
7. **Balance the budget** — income (taxes) vs. expenses (infrastructure, services) must stay positive long-term.

---

## Zone System

### Zone Types
| Type | Colour | Purpose |
|---|---|---|
| Residential | 🟢 Green | Houses citizens; drives population |
| Commercial | 🔵 Blue | Provides jobs & retail; needs customers |
| Industrial | 🟡 Yellow | Heavy job provider; generates traffic & pollution |

### Density Tiers
Each zone type has three density tiers selected at placement time:

| Density | Description |
|---|---|
| **Light (R1/C1/I1)** | Low-rise buildings. Cottages, small shops, light workshops. |
| **Medium (R2/C2/I2)** | Mid-rise. Apartment blocks, offices, mid-size factories. |
| **Heavy (R3/C3/I3)** | High-rise R/C (skyscrapers). Heavy I stays flat but sprawls across a larger lot. |

### Building Growth
- Zones start as **empty lots** (flat marker) when first placed.
- As infrastructure is provided and demand is met, buildings **grow through 3 levels**:
  - **Level 1** — Small, newly developed building (small footprint, low height).
  - **Level 2** — Expanded structure. Wider and/or taller.
  - **Level 3** — Fully developed. Maximum height/footprint for that density tier.
- Heavier density = wider footprint AND greater maximum height (except industrial, which stays low).
- Abandoned zones render in grey and de-develop over time if conditions don't improve.

### Zone Interaction (SimCity Proximity Rules)
- Residential prefers to be **near commercial** (jobs) but **away from heavy industrial** (pollution).
- Commercial needs **residential customers** nearby and good road access.
- Industrial needs road/highway access for freight but can tolerate being isolated.
- Proximity bonuses/penalties to be implemented as a land value modifier in Phase 6.

---

## Infrastructure

### Roads & Transport
- **Roads** — Basic connector. Required for zone access and infrastructure spread.
- **Highways** — Higher vehicle capacity, reduces congestion on adjacent roads.
- **Bus Stops** — Transit node; zones near stops get commute time bonus.
- **Rail Line + Station** — Mass transit for large populations. Major congestion relief.
- *(Future)* **Subway** — Underground rail for dense urban cores.
- *(Future)* **Airports / Ports** — Economic multipliers for late-game.

### Power
- Zones need power before they can develop beyond an empty lot.
- **Coal Power Plant** — High output (2000 units), higher cost, polluting.
- **Wind Turbine** — Moderate output (500 units), clean, low cost.
- *(Future)* Nuclear, Solar, Geothermal for late-game variety.
- Power spreads through the road network. Auto-connects within ~2-tile proximity.
- HUD shows supply vs. demand with a colour-coded meter (Blue → Orange → Red).

### Water
- Required for residential development (commercial/industrial can function without it in early game).
- **Water Pump** — Placed on water tiles; spreads through road network.
- *(Future)* Water towers, desalination plants.

---

## Traffic System

- Every simulation tick, a sample of commuter journeys is calculated using **A\* pathfinding**.
- Roads accumulate a **congestion score** based on journey frequency.
- Congestion is visualised as a **colour heatmap** on roads (grey → red).
- High congestion:
  - Slows commercial and residential zone growth.
  - Eventually triggers **zone abandonment** if persistent.
  - Industrial is more tolerant but still penalised above a threshold.
- Relief valves: Highways, Bus Stops, Rail Stations reduce effective commute cost.

---

## Civic Services (Phase 5)

Each civic building provides an **Area of Effect (AoE)** radius of benefit:

| Building | Effect |
|---|---|
| 🚓 Police Station | Reduces crime; improves residential desirability |
| 🚒 Fire Station | Reduces fire risk; required for insurance on large buildings |
| 🏫 School | Boosts residential growth; attracts higher-density development |
| 🏥 Hospital | Required for high-density residential happiness |
| 🌳 Park / Green Space | Land value bonus to adjacent tiles |

Coverage radius overlays (toggle-able from HUD) will show which areas are served.

---

## Simulation Model

### Population & Jobs
- Residential zones grow **residents** toward a capacity determined by density.
- Commercial/Industrial grow **jobs**.
- Balance between residents and jobs drives the **RCI demand indicator**.
  - High R demand → build more residential.
  - High C/I demand → build more commercial/industrial.

### Happiness (Phase 6)
- Each residential zone will have a **happiness score** influenced by:
  - Commute time to jobs.
  - Access to civic services (police, fire, schools, hospitals).
  - Traffic congestion.
  - Land value / proximity to green space vs. industrial pollution.
- Happiness affects tax revenue and development speed.

### Budget
- Income: Monthly tax collected from developed zones (proportional to population/jobs).
- Expenses: Infrastructure upkeep (roads, power, water), civic services.
- Difficulty scales starting budget and tax rates.

---

## Audio
- Background music playlist (city-themed jazz/lo-fi/city pop tracks).
- Lazy-loaded — audio is not fetched until the player's first interaction.
- Speaker toggle button in the HUD (mute/unmute).
- Tracks loop through a curated playlist automatically.

---

## Camera Controls
| Key | Action |
|---|---|
| W / A / S / D | Pan camera |
| Q / E | Rotate camera left / right |
| Mouse Wheel | Zoom in / out |
| Right-click drag | (Future) Free look |

---

## Technical Architecture

```
main.js              — Game controller, input handling, UI
src/
  AudioManager.js    — Music playlist and playback
  GameConfig.js      — Costs, constants, game parameters
  render/
    SceneManager.js  — Three.js scene, camera, lighting, grid rendering
    SimObject.js     — Per-tile 3D mesh factory (geometry + material)
  sim/
    City.js          — Master simulation loop, A* pathfinding, BFS spread
    Tile.js          — Per-tile simulation logic (growth, abandonment)
    SimModule.js     — Pluggable tile modules (Power, Water, Road, Traffic)
public/
  music/             — Static audio assets (served raw, never bundled)
```

---

## Guiding Inspirations
- **SimCity 4** — Zone density, traffic, civic services, region scale.
- **Cities: Skylines** — Granular road building, transit overlays, visual feedback.
- **SimCity (2013)** — Streamlined accessibility, beautiful 3D visuals.
- **Mini Metro** — Elegant transit abstraction worth referencing for rail UX.
