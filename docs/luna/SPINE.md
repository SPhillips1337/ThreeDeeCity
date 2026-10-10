# ThreeDeeCity — System Spine

> Luna-framework spine for ThreeDeeCity. Describes subsystems, boundaries,
> data flow, ownership, and entry points. Not a replacement for the repo's own
> architecture docs; a task-scoped map for bounded work.

## Entry points

- `index.html` — loads `main.js` (Vite dev / dist build).
- `main.js` — game controller: input, UI, tool application, simulation loop.
- `src/render/SceneManager.js` — Three.js scene, camera, lighting, grid, render loop.
- `src/sim/City.js` — master simulation loop, A* pathfinding, BFS spread.

## Subsystems

### 1. Controller / UI (`main.js`)
- Owns: input handling, tool selection, `applyTool` / `applyToolToArea`,
  UI updates, notification system, simulation loop (play/pause/fast-forward).
- Calls into: `src/sim/City.js` (mutation), `src/render/SceneManager.js`
  (visual refresh), `src/AudioManager.js` (music).
- Contract: every tool application mutates `city.grid` then triggers a
  targeted visual refresh (`updateTileVisuals` or `refreshRoadAndNeighbors`).

### 2. Simulation (`src/sim/`)
- `City.js` — grid, stats, A* pathfinding, BFS power/water spread, traffic.
- `Tile.js` — per-tile state: type, elevation, developmentLevel, density,
  modules, overlay, lotSize, isAnchor.
- `SimModule.js` — pluggable tile modules (Power, Water, Road, Traffic).
- `SeededRandom.js` — deterministic PRNG for reproducible world generation.
- Contract: simulation is authoritative; rendering reads tile state, never
  writes it.

### 3. Rendering (`src/render/`)
- `SceneManager.js` — scene graph, camera, lights, fog, vignette, render loop,
  selection/preview, vegetation rebuild, data-view tinting.
- `SimObject.js` — per-tile 3D mesh factory (buildings, roads, power lines,
  parks, civic). Owns the road ribbon and pole/insulator geometry.
- `TerrainSurface.js` — heightfield geometry, bilinear surface sampling
  (`getTerrainHeightAt`), colour bands, water surface.
- `PowerWires.js` — `PowerWireNetwork` class: sagging wire spans between
  adjacent powered tiles. Exports shared pole constants.
- `MaterialManager.js` — material cache per tile type.
- `CameraRig.js` — initial camera frame, pan-target clamping.
- `ParticleSystem.js` — particles (smoke, etc.).
- `RenderDiagnostics.js` — renderer diagnostics, object disposal.
- `VegetationPlanner.js` — deterministic vegetation placement.
- Contract: all placed objects sit on the bilinear terrain surface
  (`getTerrainHeightAt`), not a single tile-corner elevation.

### 4. Audio (`src/AudioManager.js`)
- Lazy-loaded music playlist, speaker toggle.

### 5. Config (`src/GameConfig.js`)
- Costs, constants, game parameters.

## Data flow

```
input (click/drag)
  → main.js applyTool(x, y)
    → validateTerrainPlacement
    → mutate city.grid[x][y] (type/overlay/lotSize/...)
    → city.stats.money -= cost
    → sceneManager.updateTileVisuals(x, y, tile)
       or sceneManager.refreshRoadAndNeighbors(x, y)
  → render loop (SceneManager.update)
    → SimObject.update() (rebuild mesh on state change)
    → PowerWireNetwork.rebuild(city)  [when wired in]
    → vegetation rebuild (if dirty)
    → traffic tint (road tiles)
```

## Ownership map

| Path | Owner | Notes |
|---|---|---|
| `main.js` | Controller | Tool application, UI, simulation loop |
| `src/sim/City.js` | Simulation | Grid, A*, BFS, traffic |
| `src/sim/Tile.js` | Simulation | Per-tile state |
| `src/sim/SimModule.js` | Simulation | Pluggable modules |
| `src/render/SceneManager.js` | Rendering | Scene, camera, lights, loop |
| `src/render/SimObject.js` | Rendering | Per-tile mesh factory |
| `src/render/TerrainSurface.js` | Rendering | Heightfield, bilinear sampling |
| `src/render/PowerWires.js` | Rendering | Wire network (new) |
| `src/render/MaterialManager.js` | Rendering | Material cache |
| `src/render/CameraRig.js` | Rendering | Camera framing |
| `src/render/ParticleSystem.js` | Rendering | Particles |
| `src/render/RenderDiagnostics.js` | Rendering | Diagnostics, disposal |
| `src/render/VegetationPlanner.js` | Rendering | Vegetation |
| `src/AudioManager.js` | Audio | Music |
| `src/GameConfig.js` | Config | Costs, constants |
| `test/*.test.js` | Tests | Pure-system tests |
| `docs/luna/` | Framework | Spine, glossary, task packets |

## Boundaries and invariants

1. **Simulation is authoritative.** Rendering reads tile state; it never mutates
   the simulation. A visual bug is a rendering bug, not a simulation bug.
2. **Terrain surface is bilinear.** `getTerrainHeightAt` samples the same
   vertex heights the terrain mesh uses. Objects placed at a single corner
   elevation sink or float on slopes.
3. **Road ribbons meet at shared edges.** Adjacent road tiles share vertices
   sampled from the heightfield, so there are no gaps or per-tile steps.
4. **Poles and wires share anchor constants.** `POWER_POLE_HEIGHT`,
   `POWER_CROSSARM_Y`, `POWER_INSULATOR_OFFSET` are exported from
   `PowerWires.js` and used by both `SimObject` (pole mesh) and
   `PowerWireNetwork` (wire endpoints).
5. **Visual refresh is targeted.** A tile change triggers `updateTileVisuals`
   for that tile, or `refreshRoadAndNeighbors` for road/highway/bulldoze
   (which also refreshes the 4-neighbourhood). Power-line changes must also
   trigger a wire-network rebuild (see task packet).

## Known hazards

- `main.js` `applyTool` only calls `refreshRoadAndNeighbors` for
  `tool-road`, `tool-highway`, `tool-bulldoze`. Power-line placement goes
  through `updateTileVisuals` only — the wire network (once wired in) will
  not rebuild when power lines are placed/removed unless the power-line
  branch is added to the refresh path.
- `PowerWireNetwork` is currently only imported by tests; it is not
  instantiated in `SceneManager`.
- `SimObject.update()` does not re-evaluate `overlay` changes (it checks
  `developmentLevel`, `abandoned`, `hasPower`, `hasWater`, `isAnchor`,
  `lotSize.w` but not `overlay`). A power-line overlay added/removed on a
  road tile may not trigger a mesh rebuild.
