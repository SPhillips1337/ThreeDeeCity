# ThreeDeeCity — Glossary

> Luna-framework glossary: domain vocabulary, public seams, contracts,
> invariants, and known hazards. Prevents a worker from substituting
> plausible but unsupported identifiers or semantics.

## Core domain terms

- **Tile** — one cell of the 32×32 grid. Has `type`, `elevation`,
  `developmentLevel`, `density`, `modules`, `overlay`, `lotSize`,
  `isAnchor`, `lotId`.
- **Lot** — a multi-tile building footprint (2×2, 3×3). The anchor tile
  renders the whole building; sub-tiles render nothing.
- **Anchor** — the tile that owns a lot's visual representation.
  `tile.isAnchor === true` for the anchor; `false` for sub-tiles.
- **Overlay** — a layer on top of a tile's base type. Currently only
  `'power-line'`. A road/highway tile with `overlay === 'power-line'`
  renders a power pole in addition to the road.
- **Power-line** — a tile type (`type === 'power-line'`) or overlay
  (`overlay === 'power-line'`). Both are "powered" for the purposes of
  `PowerWireNetwork` and `getPowerNeighborMask`.
- **Road** — `type === 'road'` or `type === 'highway'`. Roads connect
  zones and carry traffic.
- **Road-visual** — the rendered road mesh. Named `'road-visual'` in
  `SimObject._addRoadMesh`. A terrain-hugging ribbon (BufferGeometry quads)
  sampled from the heightfield.
- **Terrain heightfield** — the rendered ground mesh. Bilinear between
  tile-corner vertices. `getTerrainHeightAt(city, x, y)` samples the same
  vertex heights to return the true surface height at tile-space (x, y).
- **Bilinear sample** — the interpolation method used by both the terrain
  mesh and `getTerrainHeightAt`. Objects placed at a single corner
  elevation (the old `getTileSurfaceHeight`) sink or float on slopes.
- **LIFT** — a small upward offset (0.02) applied to road-visual vertices
  so the road bed never z-fights the ground mesh.
- **Crossarm** — the horizontal arm on a power pole. Oriented along the
  power-line direction (perpendicular to the wire span). Height above the
  tile base is `POWER_CROSSARM_Y` (1.72).
- **Insulator** — a small dark nub at each crossarm end where wires hang.
  Offset from the pole center is `POWER_INSULATOR_OFFSET` (0.28).
- **Wire span** — a sagging quadratic-Bézier tube between two adjacent
  powered tiles. Two parallel cables per span (one on each side of the
  crossarm). Sag is `WIRE_SAG_PER_UNIT` (0.055) per unit of span length.
- **Congestion** — traffic load on a road tile (0–150). Drives the
  road-visual colour tint (blue → red) via `SimObject.updateTrafficColor`.
- **BFS spread** — power and water propagate from plants/pumps through
  the road network via breadth-first search. Power has a 2-tile "jump"
  radius.
- **A* pathfinding** — commuter paths between zones. Used for traffic
  congestion calculation.

## Public seams (exports)

### `src/render/TerrainSurface.js`
- `SEA_LEVEL` (0.35) — sea-level elevation.
- `TERRAIN_HEIGHT_SCALE` (5) — elevation-to-world-height multiplier.
- `WATER_BED_HEIGHT` (-0.35) — minimum world height (water bed).
- `elevationToWorldHeight(elevation)` — convert elevation to world height.
- `getTileSurfaceHeight(tile)` — single-corner elevation (legacy; use
  `getTerrainHeightAt` for placed objects).
- `getTerrainHeightAt(city, x, y)` — bilinear surface sample at tile-space
  (x, y). **The correct function for placing objects on terrain.**
- `buildTerrainGeometry(city)` — the rendered heightfield mesh.
- `createWaterSurface(city)` — the water surface mesh.

### `src/render/PowerWires.js`
- `POWER_POLE_HEIGHT` (2.0) — base to top of pole.
- `POWER_CROSSARM_Y` (1.72) — crossarm height above tile base.
- `POWER_WIRE_DROP` (0.14) — wires hang this far below the crossarm.
- `POWER_INSULATOR_OFFSET` (0.28) — crossarm-end spacing.
- `getPowerNeighborMask(city, x, y)` — cardinal mask of adjacent powered
  tiles (north/east/south/west).
- `PowerWireNetwork` — class. `constructor(scene)`, `rebuild(city)`,
  `wireYAt(city, x, y)`, `dispose()`.

### `src/render/SimObject.js`
- `SimObject` — class. Per-tile visual representation. `update()`,
  `updateTrafficColor(congestion)`.

### `src/render/SceneManager.js`
- `SceneManager` — class. `constructor(city)`, `reset(city)`,
  `updateTileVisuals(x, y, tile)`, `refreshRoadAndNeighbors(x, y)`,
  `rebuildVegetation()`, `updateSelection(pos)`, `clearPreview()`,
  `updatePreviewSingle(pos, toolId)`, `setPanEnabled(enabled)`,
  `setVignetteEnabled(v)`.

## Contracts and invariants

1. **Simulation is authoritative.** Rendering reads tile state; it never
   mutates the simulation.
2. **Objects sit on the bilinear surface.** `getTerrainHeightAt` is used for
   every placed object (buildings, roads, trees, rocks, poles, selection,
   previews). `getTileSurfaceHeight` is only used as a fallback when
   `tile.city` is null.
3. **Road ribbons meet at shared edges.** Adjacent road tiles share vertices
   sampled from the heightfield. No gaps, no per-tile steps.
4. **Poles and wires share anchor constants.** `POWER_POLE_HEIGHT`,
   `POWER_CROSSARM_Y`, `POWER_INSULATOR_OFFSET` are exported from
   `PowerWires.js` and used by both `SimObject` (pole mesh) and
   `PowerWireNetwork` (wire endpoints). Changing one without the other
   breaks the visual alignment.
5. **Visual refresh is targeted.** A tile change triggers `updateTileVisuals`
   for that tile, or `refreshRoadAndNeighbors` for road/highway/bulldoze.
   Power-line changes must also trigger a wire-network rebuild.
6. **`SimObject.update()` must detect overlay changes.** Currently it checks
   `developmentLevel`, `abandoned`, `hasPower`, `hasWater`, `isAnchor`,
   `lotSize.w` but not `overlay`. A power-line overlay added/removed on a
   road tile may not trigger a mesh rebuild.

## Known hazards

- **Power-line refresh gap:** `main.js` `applyTool` only calls
  `refreshRoadAndNeighbors` for `tool-road`, `tool-highway`,
  `tool-bulldoze`. Power-line placement goes through `updateTileVisuals`
  only. The wire network (once wired in) will not rebuild when power lines
  are placed/removed unless the power-line branch is added to the refresh
  path.
- **`PowerWireNetwork` not wired in:** currently only imported by tests;
  not instantiated in `SceneManager`.
- **`SimObject.update()` overlay gap:** see contract 6.
- **`getTileSurfaceHeight` is legacy:** it returns a single-corner
  elevation. Using it for placed objects on slopes causes sinking or
  floating. Always use `getTerrainHeightAt` when `tile.city` is available.
