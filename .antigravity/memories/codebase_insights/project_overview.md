---
type: semantic
tags: [overview, simcity, planning]
created: 2026-05-02
related: [AD-001]
blast_radius: [project-root]
confidence: high
---

# Project Overview: ThreeDeeCity

## Purpose
ThreeDeeCity is a 3D city-building simulation project designed for the web. It leverages the Anti-Gravity Development Protocol to maintain high velocity while implementing complex Three.js rendering and modular simulation logic.

## Core Modules
- **Rendering Engine**: Three.js based `SceneManager` with support for 3D grid display, zoning previews, and interactive selection.
- **Simulation Engine**: Modular tile-based city simulation with road-access logic and resource tracking (population, money, date).
- **LTM System**: Active memory management in `.antigravity/memories/`.

## Hidden Knowledge & Context
- The project has moved past the initial "Bootstrap" phase and has a functional MVP with rendering and simulation.
- Zoning follows an "RCI" (Residential, Commercial, Industrial) model.
- Roads are the primary connective infrastructure and are required for zone growth via the `RoadAccessModule`.
- Future goals include expanded infrastructure (Power, Water), more complex simulation agents, and advanced visual effects.
