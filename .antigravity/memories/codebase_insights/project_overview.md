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
- **Rendering Engine**: Three.js based `SceneManager` with support for 3D grid display, zoning previews, interactive selection, and **multi-layer tile rendering (overlays)**. Supports WASD/QE camera movement.
- **Simulation Engine**: Modular tile-based city simulation with road-access logic, resource tracking (population, money, date), and **BFS-based infrastructure propagation (Power/Water)** with dynamic connectivity (2-tile jumps).
- **LTM System**: Active memory management in `.antigravity/memories/`.

## Hidden Knowledge & Context
- The project has a functional MVP with cascading tool drawers (RCI + Utilities).
- Zoning follows an "RCI" (Residential, Commercial, Industrial) model.
- Roads are the primary connective infrastructure.
- Power lines can be layered on top of roads via the `tile.overlay` property.
- Infrastructure (Power/Water) uses a BFS spread algorithm; Power has a 2-tile "jump" radius to simplify connectivity.
- HUD includes real-time demand bars and a power supply/demand meter.
