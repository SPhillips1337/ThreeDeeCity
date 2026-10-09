# ThreeDeeCity World Upgrade Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upgrade ThreeDeeCity’s roads, terrain rules, deterministic generation, environment, camera, performance, and browser verification without copying the unlicensed reference repository.

**Architecture:** Keep simulation tiles authoritative. Add small pure/testable rendering and placement modules, then have `SceneManager` compile tile state into terrain-aware visual systems. Preserve the existing gameplay and nginx static deployment.

**Tech Stack:** Vanilla JavaScript, Three.js, Vite, Node test runner, Playwright if feasible.

---

## Acceptance contract

- Existing city controls and simulation remain functional.
- World generation accepts a reproducible seed.
- Construction rejects water and excessive slopes with a user-visible reason.
- Roads visually classify straight/corner/T/cross/dead-end connections and sit on terrain.
- Terrain includes height/slope colour variation and shoreline transition.
- Vegetation is deterministic, instanced, and avoids water/roads/buildings.
- Camera starts with intentional RTS framing; sky/fog/lighting remain readable with optional studio lighting disabled.
- Render loop avoids rebuilding unchanged geometry; Vite splits the Three.js vendor chunk.
- Automated tests cover pure systems; browser smoke covers founding a city and placing a road.
- `npm test`, `npm run build`, live browser console and visual smoke pass.

## Phase 1 — Deterministic world generation

1. Add a seeded PRNG utility with tests for repeatability and seed differentiation.
2. Update `City` to accept/store a seed and pass seeded randomness to simplex noise.
3. Replace rendering-only `Math.random()` paths that affect reproducible visuals.
4. Expose the active seed through a small runtime diagnostic.
5. Commit `feat: add deterministic city generation`.

## Phase 2 — Terrain-aware placement validation

1. Add pure helpers for water rejection, maximum local slope, bounds and buildability.
2. Write boundary tests: land, water, exactly at slope threshold, above threshold, out of bounds.
3. Route all road/zoning/building placements through one validator.
4. Surface validation failures through the existing UI/toast path or a minimal status notice.
5. Commit `feat: validate terrain-aware construction`.

## Phase 3 — Connected terrain-following roads

1. Add a pure road-neighbour bitmask/classifier with exhaustive connection tests.
2. Add a road visual builder for dead-end, straight, corner, T and cross topology.
3. Orient/position road visuals from the classifier and terrain surface height.
4. Refresh the changed road plus four neighbours after placement/bulldoze.
5. Preserve traffic tint behaviour.
6. Commit `feat: render connected terrain roads`.

## Phase 4 — Terrain palette and shoreline

1. Extend terrain geometry with vertex colours derived from elevation and slope.
2. Add deterministic underwater depth and shoreline colour bands without changing simulation elevation.
3. Ensure materials consume vertex colours and retain readable no-post lighting.
4. Add pure colour-band tests and representative geometry assertions.
5. Commit `feat: add terrain and shoreline palette`.

## Phase 5 — Instanced deterministic vegetation

1. Add a seeded vegetation placement planner with exclusion tests.
2. Add bounded instanced trunks/canopies/rocks grouped by material.
3. Exclude water, roads, zoned/developed land and steep terrain.
4. Rebuild vegetation only when relevant tile occupancy changes or city resets.
5. Add a low/medium/high quality budget constant and default to medium.
6. Commit `feat: add deterministic instanced vegetation`.

## Phase 6 — Camera and atmosphere

1. Derive initial camera target/distance from city dimensions and terrain bounds.
2. Add readable sky colour, exponential distance fog and stable ambient/key lighting.
3. Keep optional studio/rim enhancement separate from baseline illumination.
4. Clamp pan target to the playable map and camera above terrain/water.
5. Verify resize and tour-mode state restoration.
6. Commit `feat: improve city camera and atmosphere`.

## Phase 7 — Performance and bundle split

1. Add `vite.config.js` manual vendor chunk for Three.js.
2. Stop unnecessary per-frame material assignment/tile scans where state is unchanged.
3. Dispose replaced geometry/materials safely while preserving shared cached materials.
4. Record renderer info diagnostics for draw calls/triangles.
5. Verify build chunks and runtime console.
6. Commit `perf: reduce city render overhead`.

## Phase 8 — Browser smoke and final validation

1. Add Playwright configuration and smoke spec if Chromium is available; otherwise provide a deterministic browser smoke script using installed tooling.
2. Test welcome overlay → found city → visible canvas → place road → no console errors.
3. Capture near/design/far views with fixed seed and camera.
4. Run `npm test`, `npm run build`, browser smoke, `git diff --check`.
5. Independently review the complete branch for spec, logic, performance and security.
6. Build `dist`, verify `https://threedeecity.happymonkey.ai`, and commit `test: add city browser smoke coverage`.

## Protected concurrent files

Do not modify or commit any `.fusion/**` files. They are pre-existing runtime state unrelated to this work.
