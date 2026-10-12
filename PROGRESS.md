# PROGRESS.md — Session Log

## 2026-10-11 (evening) — Fix green bleed-through in roads on slopes (+ corner-diagonal gaps found)

### Shipped (uncommitted, working tree; tests 43/43 + build clean + 8/8 browser smoke serial)

User reported "roads are still exposing patches of green when drawn through them."
Reproduced with Playwright probes + vision analysis. Found TWO distinct root causes —
the earlier seam fix (2026-10-10, `e = 0.045` overlap) only closed flat-ground
rasterization cracks and did not address either of these.

**Category B (main complaint — green pokes THROUGH the middle of road ribbons on slopes):**
- Root cause: `getTerrainHeightAt` returned a *bilinear* blend of the four tile-corner
  vertex heights, but the rendered terrain mesh is a `PlaneGeometry(w,h,w,h)` where each
  tile is TWO flat triangles split along the anti-diagonal (three.js indexes `tri(a,b,d)`
  then `tri(b,c,d)`). Bilinear only equals that surface when the four corners are
  coplanar; on a steep tile the bilinear value undershoots the rendered triangle by up to
  half the corner-height variance — more than LIFT (0.02) — so the road ribbon sank below
  the visible ground and terrain poked through its body.
- Fix 1 (`src/render/TerrainSurface.js`): `getTerrainHeightAt` now returns the EXACT
  rendered triangle surface, replicating three.js's per-tile anti-diagonal split with
  barycentric weights (`tx+ty<=1` → tri a,b,d; else tri b,c,d). Continuous across the
  shared diagonal, matches the mesh pixel-for-pixel. Benefits every placed object that
  uses this function (roads, trees, poles, selection, previews).
- Fix 2 (`src/render/SimObject.js`, `_addRoadMesh`): straight N-S/E-W strips and the
  corner/T/cross central square are now subdivided into a fine 2D grid (SEG=8) instead of
  one flat quad. Length-only subdivision was NOT enough — a band spanning the road width
  still straddles the anti-diagonal, so a single flat patch can't match both triangles. A
  full grid keeps every cell inside one triangle, so the ribbon hugs the exact surface.

**Category A (edge case — grass diamond between two corner-touching diagonal tiles):**
- Root cause: `getRoadNeighborMask` only checks the 4 orthogonal neighbors, so two tiles
  placed diagonally (touching only at a corner) are DISCONNECTED in the sim's road graph.
  Each renders as an isolated pad; their central squares reach only ±0.335 from center and
  never meet, leaving a ~0.3-tile grass diamond between them. Normal drag can't produce
  this (`applyToolToArea` only draws straight H/V lines), but manual diagonal placement can.
- Status: NOT fixed — pending user decision (connect corner-touching roads in the sim +
  render a diagonal connector, vs. leave as disconnected pads).

### Notable debugging
- Subdividing only along the road's length left residual green at the steepest point —
  that band still crossed the anti-diagonal. Had to go to a full 2D grid to close it.
- Re-confirmed: Playwright serves the PRODUCTION build (`npm run preview` on :4187), so
  `npm run build` is required after any src change before re-running browser smokes.

### Verification
- Slope probe BEFORE: "green wedges slicing through the body of the pavement, ribbon
  broken in two." AFTER: "one continuous unbroken band, no green intrusion at the
  steepest section." (test/browser/slope-probe.spec.js)
- Road-seam-check (all junction topologies) still passes — no regression from switching to
  the exact triangle surface.
- `npm test` → 43/43. `npm run build` → clean. Full Playwright suite → 8/8 serial.

### Next steps (if continuing)
1. Decide Category A: connect corner-touching roads in the sim + render a diagonal
   connector, or leave them as disconnected pads. Awaiting user call.
2. Commit the two-file fix as `fix: make roads hug exact terrain triangles on slopes`.
3. Push main to origin (now ahead of origin/main; uncommitted work pending).

---

## 2026-10-11 (day) — Visual fixes committed + save/load shipped (Phase 8)

### Shipped (committed to main; tests 42/42 + build clean + 5/5 browser smoke serial)

Continued from the 2026-10-10 session that left two visual fixes uncommitted,
awaiting in-browser confirmation. This session closed them out and shipped the
pending Phase-8 save/load feature.

1. **Road seams verified + overlap constant corrected** (commit `996f1e4`).
   The 2026-10-10 fix used `e = 0.012` (~1px overlap at ~45 px/tile), which the
   vision pass still showed as a faint hairline on straight runs. Raised to
   `e = 0.045` (~4px) so the overlap band rasterizes as several pixels. Vision
   inspection of road-seam-check.spec.js output across every topology (straight,
   corner/bend, T, cross, dead-end) confirms NO transverse green seams and no
   inverted faces — the only brightness variation on roads is ordinary sun-lit
   slope shading (addQuad resolves face winding from actual sloped geometry).

2. **Change-detection fix committed** (commit `de95a2b`). SimObject.hasChanged()
   + SceneManager render-loop call, with SimObjectChangeDetection.test.js and
   the overlay-change-smoke browser spec.

3. **Save/load shipped** (commit `89f705b`). Versioned, framework-independent
   serializer in src/sim/SaveLoad.js: authoritative state = seed (regenerates
   terrain) + name + size + stats + taxRates + per-tile mutable fields; derived
   grids excluded (recompute on first tick after load). IndexedDB persistence
   with localStorage fallback, resolve-only-on-transaction-complete, operation
   queueing — ported from the sibling ttd-3js save-store pattern. Wired to the
   menu (Save City / Load City). 5 unit tests + an end-to-end browser round-trip
   smoke (build → save → restart → load → assert exact cells + money restored).

### Notable debugging
- Playwright serves the PRODUCTION build (`npm run preview` on :4187) via its
  webServer config, NOT the dev server. Browser smokes always test dist/, so a
  rebuild is required after any src change before re-running them.
- A brief (wrong) stopPropagation-on-menu-items fix was reverted: target-phase
  listeners run before the document bubble handler, so each menu item's action
  completes before the dropdown closes — the standard behavior needs no extra
  propagation guard beyond the toggle's own stopPropagation.

### Next steps (if continuing)
1. Push main to origin (3 new commits ahead of origin/main).
2. Optional polish: tune WIRE_SAG_PER_UNIT / WIRE_LATERAL_OFFSET if power-line
   spans look wrong; consider auto-save on tab close.
3. Consider adopting Luna task packets for Phase 9+ features (transport,
   industries/cargo — see ttd-3js ROADMAP.md for the sibling's sequencing).

---

## 2026-10-10 (late night) — Road seam fix: overlapping road ribbons

### Shipped (uncommitted, working tree; tests 37/37 + build clean + 3/3 browser smoke)

User tested the change-detection fix in-browser and reported it was an
improvement but "the road itself still has a few little green gaps showing
through in places". Vision analysis of `Screenshot 2026-10-10 185907.png`
pinpointed hairline green seams running across the road at every tile-to-tile
joint (perpendicular to travel direction), small notches at bends/corners, and a
couple of pale patches on the lower road.

Root cause: each road tile is its own mesh/draw call. Adjacent ribbons met
edge-to-edge with bit-identical shared vertices at identical depth (the old
`RoadRibbon` test asserted exactly that invariant), so anti-aliasing left a
sub-pixel crack where the green terrain shows through. No triangles were
actually missing — the geometry was provably continuous — it was purely a
rasterization seam between two separate surfaces.

Fix (`src/render/SimObject.js`, `_addRoadMesh`): extend every road extent by a
hair (`e = 0.012`) so neighbours OVERLAP across their shared boundary instead of
meeting exactly. The overlap is identical flat colour and height on both sides,
so it cannot z-fight (depth ties only flicker when the two surfaces differ) — it
just covers the seam; a tiny bleed past the outer edge into grass is
imperceptible. Applied to every topology branch: isolated pad, cul-de-sac stub +
mouth, straight N-S/E-W strips, and corner/T/cross central square + stubs.

`test/RoadRibbon.test.js`: rewritten for the new invariant — each ribbon extends
past the shared edge into its neighbour's cell (≥2 vertices crossing on each
side), and every vertex including the overlap band still sits exactly on the
interpolated surface + LIFT (no height doubling on slopes).

Verification:
- `npm test` → 37/37.
- `npm run build` → clean.
- Playwright full suite → 3/3 (city-smoke, power-line-smoke, overlay-change-smoke).
- Visual in-browser confirmation is PENDING the user: an automated screenshot
  attempt was blocked mid-run and the earlier capture framed outside the city.
  User will reload localhost:5173 and check a road network (straight run + bend
  + cross) for residual green seams before committing.

### Next steps (if continuing)
1. Once the user confirms the seams are gone in-browser, commit the two
   uncommitted fixes as separate Conventional Commits:
   - `fix: detect overlay/type/power changes in per-tile visual rebuild`
     (SimObject.hasChanged + SceneManager render loop + change-detection tests)
   - `fix: close rasterization seams between adjacent road tiles`
     (SimObject._addRoadMesh overlap + RoadRibbon test rewrite)
2. Browser-verify road ribbons across all topologies (straight, corner, T,
   cross, dead-end) — inverted faces, z-fighting, traffic tinting on new geometry.
3. Tune `WIRE_SAG_PER_UNIT` / `WIRE_LATERAL_OFFSET` if spans look wrong.
4. Consider adopting Luna task packets for all future features (Phase 8 transport,
   save/load, etc.).

---

## 2026-10-10 (night) — Fix SimObject change detection (overlay/type/power/water)

### Shipped (uncommitted, working tree; tests 37/37 green + 3/3 browser smoke)

Completed PROGRESS next-step #1. Root cause was deeper than the logged hazard:
`SimObject.update()` is **dead code** — nothing calls it. The live per-frame
change detector is the inline check in `SceneManager.update()` (render loop),
which compared only `developmentLevel` and `abandoned`. So a `type`, `overlay`,
or power/water flip on an *existing* object was never rebuilt until some
unrelated change forced a refresh. Tool-driven overlay placement already worked
only because `applyTool` explicitly calls `updateTileVisuals`; the per-frame
safety net was incomplete for anything that slips past that explicit path.

Changes:
- `src/render/SimObject.js`: added cached `tileType` + `overlay` fields in the
  constructor (named `tileType`, not `type`, to avoid clobbering
  THREE.Object3D's built-in `.type`). Added pure `hasChanged()` that compares
  every state input `updateMesh()` reads — developmentLevel, abandoned, hasPower,
  hasWater, isAnchor, tileType, overlay, lotSize.w. Rewrote the dead `update()`
  to delegate to `hasChanged()` and resync all cached fields (including the new
  ones), returning a boolean so it's correct if ever called.
- `src/render/SceneManager.js`: render loop now calls `obj.hasChanged()` instead
  of the inline two-field comparison, keeping its proven dispose+recreate path.

Verification:
- `npm test` → 37/37 (6 new in `test/SimObjectChangeDetection.test.js` covering
  overlay add/remove, type change, power flip, no-op, and update() return value).
  The building-path tests need a minimal `document`/canvas stub because RCI
  materials call `document.createElement('canvas')`; Node has no DOM.
- `npm run build` → clean.
- `git diff --check` → clean.
- Playwright `test/browser/overlay-change-smoke.spec.js` → passed. It places a
  road, then applies the power-line overlay DIRECTLY to tile state (no applyTool,
  no explicit refresh) and drives one render frame; the pole shaft + crossarm +
  insulators appear as a result of the loop's `hasChanged()`, proving the fix.
- Full browser suite (city-smoke, power-line-smoke, overlay-change-smoke) → 3/3.

### Next steps (if continuing)
1. Browser-verify road ribbons across all topologies (straight, corner, T, cross,
   dead-end) — inverted faces, z-fighting, traffic tinting on new geometry.
2. Tune `WIRE_SAG_PER_UNIT` / `WIRE_LATERAL_OFFSET` if spans look wrong.
3. Consider adopting Luna task packets for all future features (Phase 8 transport,
   save/load, etc.).

---

## 2026-10-10 (evening) — Luna framework adoption + power-line wiring

### Shipped (commit `0911398`, pushed to `origin/main`, tests 31/31 green)

Continued from the 2026-10-09 session where the local LLM agent identified the
road-slab and power-line-black-dot issues but left the work uncommitted.
This session:

1. **Adopted the Luna framework** (from `SPhillips1337/luna_framework`) as a
   lightweight discipline layer for bounded task work. Phase 1 (docs only):
   - `docs/luna/SPINE.md` — system spine: subsystems, data flow, ownership,
     boundaries/invariants, known hazards.
   - `docs/luna/GLOSSARY.md` — domain vocabulary, public seams (exports),
     contracts/invariants, known hazards.
   - `docs/luna/TASK-TEMPLATE.md` — bounded task packet template.
   - `docs/luna/tasks/power-line-wiring.md` — the Phase-2 task packet for
     wiring PowerWireNetwork into SceneManager.
   - Skipped: model routing (Luna/Terra/break-glass) — single-model workflow,
     and the framework's own docs mark the routing hypothesis as exploratory.
     Skipped: evaluation protocol / matched worktrees — for model comparison,
     not game development.

2. **Wired PowerWireNetwork into SceneManager** (Phase 2, per the task packet):
   - `src/render/SceneManager.js`: import, instantiate in constructor,
     `rebuild(city)` in `reset()` and `updateTileVisuals()`.
   - No `main.js` change needed: `updateTileVisuals` is the single choke point
     for all tile visual changes (called from `applyTool`, `onTileChanged`,
     `refreshRoadAndNeighbors`), so it covers power-line placement/removal.

3. **Verification:**
   - `npm test` → 31/31 pass (including RoadRibbon, PowerWires, and all
     existing tests).
   - `npm run build` → clean.
   - `git diff --check` → clean.
   - Playwright smoke test (`test/browser/power-line-smoke.spec.js`) →
     passed. Placed a 3-tile power line run on flat terrain; wire network
     `childCount=4` (2 spans × 2 cables) confirms the network rebuilt and
     rendered geometry. Screenshot saved at
     `test-results/power-line-smoke-power-lines-render-poles-and-wires/power-line-smoke.png`.
   - User reviewed the screenshot: "looked good."

### Known hazard (out of scope, noted for future)

- `SimObject.update()` does not detect `overlay` changes. A power-line
  overlay added/removed on an existing road tile may not trigger a mesh
  rebuild. Separate bug to fix later.

### Environment notes for next session

- Vite dev server was running on port 5173 (background process) — restart if
  dead: `npx vite --port 5173 --strictPort`.
- Playwright chromium installed at `~/.cache/ms-playwright/chromium_headless_shell-1228`.
- Local vision model (`gemma-4-e2b` at `192.168.5.229:1234`) does NOT support
  multimodal image inputs (HTTP 400 for image_url content). Use Playwright
  screenshots + unit tests for visual verification, or a different vision
  endpoint.
- `docs/luna/` is committed; `.antigravity/` is gitignored (Antigravity-specific).
- Untracked local artifacts left in working tree: `PROGRESS.md`,
  `Screenshot 2026-10-09 192133.png`, `resource-sentinel.db`, `test-results/`.

### Next steps (if continuing)

1. Fix `SimObject.update()` to detect `overlay` changes (power-line overlay
   on existing road tiles).
2. Browser-verify the road ribbon across all topologies (straight, corner,
   T, cross, dead-end) — check for inverted faces, z-fighting, and that
   traffic-congestion tinting still works on the new geometry.
3. Tune `WIRE_SAG_PER_UNIT` / `WIRE_LATERAL_OFFSET` if spans look wrong.
4. Consider adopting Luna task packets for all future features (Phase 8
   transport, save/load, etc.).
