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
 
+## [Success] Strategic Renaming to ThreeDeeCity
+- **Date:** 2026-05-02
+- **Pattern:** Renamed the project from `SimCity` to `ThreeDeeCity` after initial MVP development. Updated all UI strings, package names, and LTM records simultaneously.
+- **Lesson:** Proactively addressing naming/branding issues early prevents legal friction (trademark) and clarifies the project's unique technical identity (3D web simulation).
+


## [Success] Protocol Initialization
- **Date:** 2026-02-25
- **Pattern:** Created `AGENTS.md` and initialized `.antigravity/memories/` to solidify a high-velocity development protocol.
- **Lesson:** Defining "Anti-Gravity" principles early reduces friction for future AI-driven tasks.

## [Failure] Placeholder
- **Date:** YYYY-MM-DD
- **Pattern:** Describe what went wrong.
- **Lesson:** Describe the takeaway.
12: 
13: ## [Success] Git Divergence Resolution
14: - **Date:** 2026-03-31
15: - **Pattern:** When facing divergent branches (local and remote), moved local work to a new target branch (`hermes-antigravity-sync`) and rebased local `main` on `origin/main`.
16: - **Lesson:** This "Pivot and Rebase" approach avoids merge commits on `main` while safely publishing the latest changes to the remote for review.


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
