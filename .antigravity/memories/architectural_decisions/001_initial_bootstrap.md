---
type: semantic
tags: [protocol, bootstrap, architecture]
created: 2026-05-02
related: [AGENTS.md, BOOTSTRAP.md]
blast_radius: [project-root]
confidence: high
---

# AD-001: Initial LTM Bootstrap

## Context
The project `simcity` was initialized as an empty repository. To ensure high-velocity development and consistent memory preservation, we are bootstrapping the **Anti-Gravity Prompt Protocol**.

## Decision
We have implemented the Long-Term Memory (LTM) structure as defined in the `AntigravityAgentsPromptProtocol` repository. This includes:
- **Semantic Memory**: `codebase_insights/` and `architectural_decisions/`.
- **Episodic Memory**: `history/` (plans, walkthroughs, handoffs).
- **Procedural Memory**: `patterns_and_lessons.md`.

## Status
**Active**

## Consequences
- All future architectural changes MUST be logged in `architectural_decisions/`.
- All major components MUST have an insight file in `codebase_insights/`.
- Momentum will be tracked via the "Ratchet" (Verify -> Commit) protocol.
