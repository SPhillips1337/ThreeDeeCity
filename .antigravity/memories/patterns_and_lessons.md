---
type: procedural
tags: [lessons, success, bootstrap]
created: 2026-05-02
related: [AD-001]
blast_radius: [project-root]
confidence: high
---

# Patterns and Lessons

## [Success] LTM Bootstrap for SimCity
- **Date:** 2026-05-02
- **Pattern:** Initialized the project with the Anti-Gravity Prompt Protocol from the remote origin. Established semantic, episodic, and procedural memory segments before writing source code.
- **Lesson:** Starting with a formal memory structure allows the agent to "know" the project's intent and history from Day 1, preventing context amnesia and reducing "Drag".
 
## [Success] Strategic Renaming to ThreeDeeCity
- **Date:** 2026-05-02
- **Pattern:** Renamed the project from `SimCity` to `ThreeDeeCity` after initial MVP development. Updated all UI strings, package names, and LTM records simultaneously.
- **Lesson:** Proactively addressing naming/branding issues early prevents legal friction (trademark) and clarifies the project's unique technical identity (3D web simulation).


## [Success] Protocol Initialization
- **Date:** 2026-02-25
- **Pattern:** Created `AGENTS.md` and initialized `.antigravity/memories/` to solidify a high-velocity development protocol.
- **Lesson:** Defining "Anti-Gravity" principles early reduces friction for future AI-driven tasks.

## [Success] Git Divergence Resolution
- **Date:** 2026-03-31
- **Pattern:** When facing divergent branches (local and remote), moved local work to a new target branch (`hermes-antigravity-sync`) and rebased local `main` on `origin/main`.
- **Lesson:** This "Pivot and Rebase" approach avoids merge commits on `main` while safely publishing the latest changes to the remote for review.


## [Success] Protocol V2 Upgrade (pi-mono integration)
- **Date:** 2026-04-27
- **Pattern:** Integrated **Steering Awareness**, **Iterative Synthesis**, and **Batch Momentum** patterns from the `pi-mono` toolkit into `AGENTS.md` and system prompts.
- **Lesson:** Adopting mature agent-loop primitives (like mid-turn steering and iterative context updates) drastically reduces "Drag" and context drift in long-running coding sessions.

## [Success] Layered Infrastructure (Tile Overlays)
- **Date:** 2026-05-03
- **Pattern:** Implemented a `tile.overlay` property and refactored `SimObject.js` to render multiple mesh layers (e.g., Power Line mesh on top of Road mesh).
- **Lesson:** Allows for visual and logical stacking without needing complex multi-tile types or overwriting core tile functionality.

## [Success] Dynamic Power Jumps (2-Tile BFS)
- **Date:** 2026-05-03
- **Pattern:** Adjusted the BFS `spreadToAdjacent` logic to run twice for power, effectively allowing a 2-tile connection radius from powered roads/sources.
- **Lesson:** Improves user experience by removing the friction of manual point-to-point wiring for every single zone, while maintaining the strategic value of the power grid.

## [Success] Staggered Pathfinding Update
- **Date:** 2026-05-03
- **Pattern:** Sampled a small subset of the population (e.g., 10 paths) per simulation tick for A* pathfinding instead of recalculating for everyone.
- **Lesson:** Maintains high frame rates (60 FPS) in the rendering loop while still providing accurate-feeling traffic congestion trends over time.

## [Success] Simulation Rebalancing
- **Date:** 2026-05-03
- **Pattern:** Scaled power production (Coal 500 -> 2000) and reduced per-capita demand when the user identified the previous balance as too tedious.
- **Lesson:** Simulation "fun" often trumps raw realism. Building a flexible config-driven balance system allows for rapid tuning based on user feedback without changing core logic.

## [Failure] Missing State Initialization Crash
- **Date:** 2026-05-03
- **Pattern:** Added UI elements referencing `stats.demand` before defining the object in `City.js`. Resulted in a blank page due to a runtime error in the `animate` loop.
- **Lesson:** Always verify data object shapes in the simulation state before binding them to high-frequency UI/render loops (like `requestAnimationFrame`). Define fallback/default shapes in the constructor.

## [Success] Decoupled State and Render Sync
- **Date:** 2026-05-04
- **Pattern:** The simulation merged lots successfully, but the 3D meshes didn't update because `SceneManager` wasn't notified. Added an `onTileChanged` callback from the simulation core to the render engine.
- **Lesson:** When altering properties on multiple sub-objects simultaneously (like merging 1x1 tiles into a 3x3 mega-lot), you must explicitly trigger a visual refresh for *all* affected footprint coordinates, not just the anchor.

## [Success] BFS Service Grids (Area of Effect)
- **Date:** 2026-05-04
- **Pattern:** Reused the existing BFS (Breadth-First Search) grid logic for power/water to also map Civic Service (Police, Fire, Hospital) coverage radiuses.
- **Lesson:** Building generalized infrastructure modules (`runBFS`) allows rapid feature expansion. Civic services now seamlessly propagate over road networks and connected zones using the same robust algorithm.

## [Success] Dynamic Heatmap Visualization
- **Date:** 2026-05-04
- **Pattern:** Implemented a performant linear interpolation (lerp) logic in `SceneManager.js` to dynamically shift road material colors from grey to red based on the `TrafficModule` congestion metric.
- **Lesson:** Providing visual "heatmaps" directly on the game objects (roads) instead of a separate UI layer creates a much more immersive experience. Decoupling the color shift from mesh construction ensures zero performance impact on 60FPS rendering.

## [Success] Navigation vs. Construction Mode (Pan Toggle)
- **Date:** 2026-05-05
- **Pattern:** Dynamically enabled/disabled OrbitControls `LEFT` mouse panning based on the `activeToolId`. When a tool is active, left-drag was re-bound to automatic area dragging (construction).
- **Lesson:** Differentiating between "Navigation" and "Construction" intent based on tool state removes the need for complex modifier keys (like Shift) for common actions. This makes the UI feel "smarter" and more like a dedicated city-builder.

## [Success] Contextual UI (Radio Stations)
- **Date:** 2026-05-05
- **Pattern:** Implemented a right-click context menu on existing HUD icons to reveal secondary settings (Radio Stations).
- **Lesson:** Using secondary click actions on persistent HUD elements allows for deep configuration without cluttering the primary screen real estate. It preserves the "clean" glassmorphism aesthetic while adding significant functionality.

## [Failure] Material Proxy Misidentification (Semi-Transparent Buildings)
- **Date:** 2026-05-05
- **Pattern:** Used `lotSize.w > 1` as a proxy for identifying "lots" (level 0 zones) when resetting Data Views. This caused all large buildings (2x2, 3x3) to become semi-transparent because the code thought they were unbuilt ground lots.
- **Lesson:** Never use physical dimensions as a proxy for logical state. Always check the explicit state property (e.g., `tile.developmentLevel === 0`) to determine if a building should use its "construction/lot" material vs. its "solid/built" material.

## [Success] UI Consolidation (Tool Drawer Migration)
- **Date:** 2026-05-05
- **Pattern:** Migrated redundant top-level tools (Power Lines) into logically related utility drawers (Infrastructure).
- **Lesson:** As a toolbar grows, keeping only "High Level Action" icons (Road, Select, Bulldoze) on the root and moving specific implementations into drawers prevents visual fatigue and maintains a premium feel.

## [Success] Data View Overlays (Data-Driven Tinting)
- **Date:** 2026-05-04
- **Pattern:** Created a global "Data View" state that triggers conditional tinting across all city buildings. Buildings without coverage (Power, Water, Police, etc.) are "greyed out" while covered ones are highlighted in their service-specific color.
- **Lesson:** Using `material.color` overrides rather than swapping textures or geometry allows for instant, full-city visual transitions. This gives players clear feedback on coverage gaps that a standard "Normal" view obscures.
