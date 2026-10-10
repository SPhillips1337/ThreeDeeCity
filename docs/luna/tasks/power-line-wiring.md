# Task Packet: Wire PowerWireNetwork into SceneManager

## Task identity

- Task ID: `power-line-wiring`
- Date: 2026-10-10
- Repository: `SPhillips1337/ThreeDeeCity`
- Branch or committed baseline: `main` (working tree has uncommitted
  SimObject.js + PowerWires.js + tests)
- Worktree: `/home/stephen/projects/ThreeDeeCity`
- Owner: Stephen

## Objective

Wire the existing `PowerWireNetwork` class into `SceneManager` so that
power lines render as poles + sagging wires (not just poles or black dots).
The network must rebuild whenever a tile change can add or remove a wire
span, and dispose on teardown.

## Candidate route/model

- Preferred model: current session model (single-model workflow)
- Provider: local
- Why this route is appropriate: bounded, 2-file change (SceneManager.js +
  main.js), established contracts (PowerWireNetwork API already tested),
  short feedback loop (npm test + browser verify).
- Escalation target: if PowerWireNetwork API needs changing, or if
  SimObject.js overlay detection needs fixing, stop and report.

## Owned paths

- `src/render/SceneManager.js` — import, constructor, reset,
  updateTileVisuals, refreshRoadAndNeighbors, teardown.
- `main.js` — power-line branch in `applyTool` (trigger wire-network
  rebuild alongside the visual refresh).

## Forbidden scope

- Do NOT modify `src/render/SimObject.js`, `src/render/PowerWires.js`,
  `src/render/TerrainSurface.js`, `src/render/MaterialManager.js`, or any
  test file.
- Do NOT change dependencies, package.json, or build config.
- Do NOT commit, push, reset, stash, clean, or delete existing work.
- Do NOT read, expose, or store secrets.

## Dirty-worktree preservation

Starting dirty state (from `git status`):
- Modified: `.antigravity/memories/patterns_and_lessons.md`,
  `src/render/SimObject.js`
- Untracked: `PROGRESS.md`, `Screenshot 2026-10-09 192133.png`,
  `resource-sentinel.db`, `src/render/PowerWires.js`,
  `test/PowerWires.test.js`, `test/RoadRibbon.test.js`

Preserve all of the above. Do not clean up or delete any of them.

## Required reading

- `src/render/PowerWires.js` — PowerWireNetwork class API
  (constructor, rebuild, wireYAt, dispose).
- `src/render/SceneManager.js` — constructor, reset, updateTileVisuals,
  refreshRoadAndNeighbors, teardown (disposeObject3D usage).
- `main.js` — `applyTool` (power-line branch), `refreshRoadAndNeighbors`
  call site.
- `docs/luna/SPINE.md` — system spine, data flow, ownership.
- `docs/luna/GLOSSARY.md` — contracts and invariants (pole/wire anchor
  constants, visual refresh is targeted).
- `test/PowerWires.test.js` — existing tests for PowerWireNetwork.

## Relevant context

- System-spine sections: Rendering (SceneManager, PowerWires), Controller
  (main.js applyTool).
- Glossary terms: PowerWireNetwork, wire span, crossarm, insulator,
  POWER_CROSSARM_Y, POWER_INSULATOR_OFFSET.
- Contracts and invariants:
  - Poles and wires share anchor constants (POWER_CROSSARM_Y,
    POWER_INSULATOR_OFFSET).
  - Visual refresh is targeted; power-line changes must trigger a
    wire-network rebuild.
- Dependency/blast-radius notes:
  - `PowerWireNetwork` is currently only imported by tests.
  - `main.js` `applyTool` only calls `refreshRoadAndNeighbors` for
    road/highway/bulldoze; power-line goes through `updateTileVisuals`
    only.
  - `SimObject.update()` does not detect `overlay` changes (known hazard,
    out of scope for this task).

## Acceptance criteria

1. `PowerWireNetwork` is instantiated in `SceneManager` constructor and
   added to the scene.
2. `PowerWireNetwork.rebuild(city)` is called in `SceneManager.reset(city)`
   and after any tile change that can add/remove a wire span
   (`updateTileVisuals` and `refreshRoadAndNeighbors`).
3. `PowerWireNetwork.dispose()` is called on teardown (when the scene is
   destroyed or reset).
4. `main.js` `applyTool` power-line branch triggers a wire-network rebuild
   (either via `refreshRoadAndNeighbors` or a direct call).
5. `npm test` passes (all existing tests + any new tests).
6. `npm run build` passes.
7. `git diff --check` passes.
8. Browser-verify: place power lines on grass and on roads; poles and
   sagging wires are visible.

## Required verification commands

- Focused test: `npm test`
- Build: `npm run build`
- Structural check: `git diff --check`
- Runtime/live-state check: BrowserOS MCP — place power lines, screenshot,
  verify poles + wires visible.
- Record exact commands, exit codes, and meaningful results.

## Escalation and stop conditions

Escalate after two materially unsuccessful repair attempts, or earlier when:
- `PowerWireNetwork` API needs changing (out of scope).
- `SimObject.js` overlay detection needs fixing (out of scope).
- A public boundary or contract drift is discovered.

If the task exposes a concrete production defect outside the owned scope:
1. Stop implementation.
2. Preserve the current worktree and evidence.
3. Record the failing command and diagnosis.
4. Report the blocker and affected paths.
5. Do not broaden the task or patch production code without explicit
   authorization.

## Evidence handoff

- Resolved model/provider: (fill in at completion)
- Session/run ID: (fill in at completion)
- Start/end time: (fill in at completion)
- Attempts: (fill in at completion)
- Repairs: (fill in at completion)
- Files read: (fill in at completion)
- Changed paths: (fill in at completion)
- Scope drift: (fill in at completion)
- Initial failures: (fill in at completion)
- Focused results: (fill in at completion)
- Typecheck/build results: (fill in at completion)
- Structural/runtime results: (fill in at completion)
- Owner corrections: (fill in at completion)
- Remaining gaps or blockers: (fill in at completion)
- Artifact and report paths: (fill in at completion)

## Acceptance status

- Worker status: Not accepted
- Owner status: Not reviewed
- Notes: This packet is the Phase-2 task from the Luna adoption plan.
