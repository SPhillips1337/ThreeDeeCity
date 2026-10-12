# Local drone pipeline trial

This is a successful technical test of the supplied ComfyUI image-to-model graph,
not an admitted replacement for Ashfall's drone. No game code or assets were changed.

## Evidence

- `concept.png`: original local Flux 2 Klein base 4B output, reviewed before 3D generation.
- `drone_pixal3d_raw.glb` / `drone_trellis2_raw.glb`: preserved generated exports.
- `*_inspection.json`: unchanged Blender import statistics, UV/material/image inventory
  and normalized bounds. These dimensions are model-space units, not final gameplay scale.
- `*_front.png`, `*_rear.png`, `*_top.png`: three independently rendered review views
  per candidate. Labels describe review cameras, not verified final engine orientation.
- `receipt.json`: original job IDs, graph hashes, observed durations and artifact hashes.
- `inspect_and_render.py`: repeatable Blender inspection/render script. Run with
  `--python-exit-code 1` so Python errors are not mistaken for successful Blender exits.
- `record_trial.py`: receipt creation from locally ignored job/history files.

Exact source exports are in `workflows/comfyui/original/`. Derived graphs preserve
the image prompt, seed, model selection and lower-cost generation/export budgets.
Both 3D branches ran at 1024 upsampling, remesh 256, output face target 15,000 and texture
atlas 1024. TRELLIS.2 uses crop padding 1.0, Pixal3D 1.1. The user's original export is
unchanged, including its higher budgets and example axe input.

| Candidate | Generation | Exported triangles | Exported vertices |
| --- | --- | --- | --- |
| Pixal3D | 84.999 s | 14,716 | 14,191 |
| TRELLIS.2 | 66.436 s | 14,746 | 12,466 |

The concept took 43.534 seconds. Times are API job timestamps, not Blender review time;
the TRELLIS.2 comparison reused cached helper nodes, so this is not a cold-start speed
ranking. Both exports contain one mesh, one material, UVs and three 1024 images.

## Visual assessment and next step

Both retain a recognizable aircraft silhouette. Pixal3D preserves more saturated teal
panels here. TRELLIS.2 gives a different rear/underside with invented engine detail.
Both soften or distort hard edges and the thin cannon, and the rendered material appears
lighter than the original dark reference. Neither is sufficiently faithful to call
finished demo artwork. This trial supports the pipeline, not a universal model ranking.

Next: refine the reference if needed, preserve the raw candidate, clean or rebuild
problematic hard-surface details in Blender, set orientation/scale/pivot, inspect
topology and baked maps, create collision/detail levels, then assess Unreal rendering,
fog/selection and performance. Record the exact model/dependency licence decisions
before accepting generated assets into a release. No model weights or paid/cloud jobs
are included in this trial.
