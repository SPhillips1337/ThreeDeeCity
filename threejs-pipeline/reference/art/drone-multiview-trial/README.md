# Controlled Pixal3D multiview trial

The four input images are Blender renders of the existing single-view Pixal3D raw
drone, not new independently generated concepts. This checks local multiview
conditioning, reconstruction and export with geometrically consistent views.
It does not establish an improvement over single-view concept-to-3D generation.

`render_inputs.py` and `input_rig.json` document the calibrated native ComfyUI camera
rig, uniform normalization and source hash. All views use identical scale, black
background and framing. Their names identify camera slots; the inherited drone's
artistic heading was not changed. The source GLB remains unchanged on disk.

The derived recipe is `workflows/comfyui/drone_multiview.json`. The original supplied
turnaround-sheet workflow remains byte-for-byte preserved alongside the other exports.
The trial uses 1024 upsampling, a 256 remesh grid, a 15,000-face export target and 1024
textures. No new weights were downloaded by these scripts. No Unreal asset is replaced.

## Result

Local generation completed successfully in 96.147 seconds, including cached helper
nodes; this is not a cold-start benchmark. The raw GLB imports unchanged into Blender:
one mesh, 14,970 triangles, 12,788 vertices, one material, one UV layer and three 1024
images. `receipt.json` records job identity, recipe hashes, inspection and artifact hashes.

The three review renders retain the recognizable wings, engine pods and tail. Thin
weapon geometry, wing edges and other hard surfaces remain irregular; material colour
also needs deliberate authoring. This reconstruction does not justify promoting it
over the original single-view mesh or replacing the game asset. The next useful art
step is Blender cleanup of a chosen design, or a genuinely consistent new turnaround
reference, followed by an Unreal readability and material check.

Reproduce the inspection with:

```powershell
blender --background --python-exit-code 1 --python art/drone-trial/inspect_and_render.py -- multiview art/drone-multiview-trial
python art/drone-multiview-trial/record_trial.py
```
