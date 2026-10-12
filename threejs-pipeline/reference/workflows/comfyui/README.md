# Local ComfyUI recipes

`original/` contains twelve exact API-format JSON exports supplied by the user. They are
data for ComfyUI's `/prompt` endpoint, not editor-layout graphs. Drag-and-drop support
depends on the ComfyUI frontend; the API is the reproducible submission path used here.

The derived drone recipes preserve originals and replace only task inputs and budgets.
`prepare_drone_trial.py` rebuilds them; it resets the 3D input to a placeholder, which
must be assigned after generating and reviewing a real reference image. Do not run
that preparation script over a reviewed recipe unless you intend to reset its input.

Example, from the repository root, using a Python runtime with standard-library HTTP:

```powershell
python workflows/comfyui/client.py --base http://192.168.5.157:8188 submit workflows/comfyui/drone_concept.json
python workflows/comfyui/client.py poll workflows/comfyui/drone_concept.job.json
```

The submission checks for an idle queue and writes a job ID / workflow SHA-256 receipt.
Polling reads the existing job; it never submits a duplicate. Completed full history
is saved locally beside the receipt. These files are Git-ignored because server details
and execution traces are machine-specific. Preserve relevant provenance in the asset
receipt after inspection. A submit timeout can have an ambiguous server outcome: inspect
the queue/history before retrying. Do not interrupt or clear another person's queue.

The original 3D graph uses a missing example axe filename. Replace node 122's `image`
with a real ComfyUI input filename. Its node 316 selects Pixal3D when false and TRELLIS.2
when true. For the current trial, derived `drone_pixal3d.json` lowers upsampling to 1024,
remeshing to 256, output faces to 15,000 and the texture atlas to 1024. Normal/AO baking
budgets also decrease; preview-only outputs are removed, leaving the final saved mesh.
`drone_trellis2.json` selects the alternate branch on the same reference, with crop
padding 1.0 rather than Pixal3D's 1.1. Both branches completed local export and Blender
review successfully; their raw artifacts and result notes are under `art/drone-trial/`.

No model weights are included or downloaded by these scripts. Registered nodes and
model names must be checked on the actual server. Generated results must be inspected
and their exact model/dependency terms checked before release or Unreal integration.
See RESOURCES.md and LINKS.md in the repository root.

## Multiview trial

`original/3d_pixal3d_multi_views.json` preserves the supplied four-column turnaround
sheet recipe, including its example filename and crop coordinates. The derived
`drone_multiview.json` instead reads four calibrated renders directly, retaining the
native `Pixal3DMultiViewConditioning` node and downloaded multiview checkpoint.
`prepare_multiview_trial.py` rebuilds this derived recipe with the same bounded mesh
and texture budgets as the single-view trials.

Generate inputs with Blender's `art/drone-multiview-trial/render_inputs.py`. It renders
the existing raw Pixal3D drone at 1024 square, horizontal FOV 20 degrees, elevation zero,
azimuths 0/90/180/270 and distance `1.1 * 0.5 / tan(FOV/2)`, matching the installed
native node's rig. The mesh is centred and uniformly scaled to a maximum span of one.
Black RGB backgrounds and identical framing bypass per-view background removal and
cropping. Labels identify rig slots; the inherited mesh's artistic heading is unchanged.

Copy the four `AshfallDroneMV_*.png` images into ComfyUI's input directory, then submit
`drone_multiview.json` using the client above. This is a controlled reconstruction
fixture, not evidence that AI-generated turnaround sheets improve new asset quality.
Use mutually consistent views for future assets; four unrelated pictures or duplicate
front views are not a valid substitute.

## SAM 3D Body trial

`prepare_body_trial.py` derives an officer reference, single-image skinned body export
and four-frame stationary tracking/export test. The original `utility_sam3d_body.json`
retains its video input and default SCAIL export unchanged. The generated reference
must be reviewed and copied to ComfyUI input as `AshfallBodyTrialReference.png` before
submitting `body_still.json` or `body_stationary_clip.json`. The latter repeats the
reference four times in an MP4; it tests dependencies, not real motion recovery.
Generate that MP4 with `body_fixture_video.json` and copy the result into ComfyUI input
as `AshfallBodyTrialStationary.mp4`. Use `--bf16-unet` for these SAM tests: the installed
default loader selected FP16 and produced invalid body output. The isolated diagnostic
launcher is `start_body_bf16_test.py`; pass its loopback URL with `client.py --base`.
Results and inspection limits are under `art/body-trial/`.
