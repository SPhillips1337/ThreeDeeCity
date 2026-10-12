# Ashfall development resources

Last inspected: 2026-10-04. This is the practical inventory; [LINKS.md](LINKS.md) holds
research references, and [DEMO_PLAN.md](DEMO_PLAN.md) defines the release scope.
Available, API-validated, successfully tested and admitted to the game are different
states. Record evidence before promoting a tool or generated asset to the next state.

## Local tools

| Tool | Location / status | Use |
| --- | --- | --- |
| Unreal Engine 5.8 | `C:/Program Files/Epic Games/UE_5.8` | Game runtime, editor, Python asset commandlets, build and rendered campaign checks. |
| Blender 5.2.2 LTS | `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe` | Original mesh authoring, GLB inspection, cleanup, scale/pivot, UVs, baking, rigging and export. Existing probe and unit portraits were authored locally. |
| ComfyUI 0.38.0 | Stability Matrix installation under `C:/Users/steph/Downloads/StabilityMatrix-win-x64/Data/Packages/ComfyUI` | Local image, editing, video and image-to-3D jobs. Python 3.12.10, PyTorch 2.14.0+cu130 observed through its API. |
| GPU | NVIDIA RTX 5090 Laptop, approximately 24 GB VRAM | Run asset generation sequentially; leave Unreal closed during large 3D jobs. |
| Git / Git LFS / GitHub CLI | Working private Ashfall repository | Version code, Unreal assets and editable artwork. Do not commit model weights, caches, temporary outputs or credentials. |

ComfyUI currently listens on `http://192.168.5.157:8188`, not localhost. This is a
machine-specific LAN address and may change. Override the address with `client.py
--base URL`; do not assume the endpoint is reachable on another machine. The API queue
was idle before this trial. The API reports registered model names; that alone does
not prove a complete generation succeeds.

## Supplied ComfyUI workflows

Exact user-supplied API-format exports are preserved in `workflows/comfyui/original/`.
Model weights remain in the local ComfyUI installation, outside Git. An exported graph
is a reproducible recipe, not an asset licence or proof that its dependencies are installed.

| Workflow | Intended role / evidence |
| --- | --- |
| `image_flux2_klein_text_to_image.json` | Asset concepts and UI illustrations. Export uses Flux 2 Klein **base 4B**, Qwen 3 4B text encoder and Flux 2 VAE. Drone concept trial uses this graph. |
| `image_z_image_turbo.json` | Fast concept iteration; user-reported local capability. |
| `image_kandinsky5_t2i.json` | Alternative concept generation; user-reported local capability. |
| `image_qwen_image.json` | Alternative asset concepts / interface artwork; user-reported local capability. |
| `image_mage_flow_edit_turbo_int8.json` | User-reported strength: refinement and extra detail. Preserve silhouette and style when editing asset references. |
| `image_boogu_image_0_1_edit.json` | More substantial image edits; exported FP8 model and Qwen3-VL encoder. |
| `image_qwen_image_edit_2509.json` | Image edits and consistent asset variations; exported FP8 checkpoint and four-step Lightning LoRA. |
| `video_causal_forcing_i2v.json` | Short UI motion, transitions and atmospheric clips. User advises against relying on this small model for long videos. |
| `video_wan2.1_fun_camera_v1.1_1.3B.json` | Short camera / UI motion experiments. User advises against relying on this small model for long videos. |
| `3d_pixal3d_trellis2_image_to_model.json` | Image-to-textured-mesh trial. Registered nodes and selected checkpoint names validated against the running ComfyUI API. |
| `3d_pixal3d_multi_views.json` | Four-view Pixal3D reconstruction. Downloaded `pixal3d_multiview_int8_convrot.safetensors` and native conditioning node confirmed through the local API; controlled drone trial recorded below. |
| `utility_sam3d_body.json` | Human body/hand/pose recovery and video tracking. Tested locally with BF16 enforced; default FP16 selection produced invalid output. Body, skeleton, SCAIL and overlay exports inspected separately from game assets. |

The 3D export defaults to Pixal3D (`316.value=false`); true selects TRELLIS.2.
It uses `pixal3d_int8_convrot.safetensors` / `trellis_2_int8_convrot.safetensors`,
DINOv3 vision conditioning, shape and texture VAEs, BiRefNet background removal, and
MoGe field-of-view estimation. It includes mesh remeshing, decimation, UV unwrapping,
base-colour/metallic/roughness baking, normals, ambient occlusion and a saved 3D file.
The original input names an example axe image that is not installed on this machine;
each trial must assign a real input image.

## Pipeline and asset acceptance

1. Generate an isolated asset reference, keeping its prompt, seed, model and workflow.
2. Review the silhouette at RTS scale; refine only when the reference needs an edit.
3. Run image-to-3D. Use consistent multiple views when back/sides need control.
4. Inspect the resulting mesh in Blender before modifying it; preserve the raw output.
5. Check triangle count, detached geometry, normals, UVs, textures, materials, scale and
   pivot. Generate sensible collision and detail levels. Characters also need rigging
   and animation; generated video does not provide a skeletal animation asset.
6. Import a validated candidate into Unreal and test rendering, navigation, fog,
   selection, performance and readability in the game. A saved GLB is not game-ready.

Generated short clips may suit title/menu backgrounds or brief mission transitions.
Use ordinary UI widgets for interactive controls and readable text. Long cinematic
generation with Grok is a user-suggested cloud option, not a configured or tested tool;
no cloud generation or paid service was invoked in this trial.

The drone trial graphs are derived copies. They keep deterministic seeds, use 1024
upsampling, a 256 remesh grid, a 15,000-face export target and 1024 texture atlas; normal
baking is 1024 and ambient occlusion is 512 with 16 samples. These are trial budgets,
not final quality guarantees. The original 1536 / 700,000-face / 4096-texture export
remains unchanged. Job IDs and history are local ignored files. Result evidence belongs
in `art/drone-trial/` once inspected, with hashes and generation provenance.

## Tools evaluated but not active

- The Unreal MCP Codex skill is installed. No live Unreal MCP tool is exposed in this
  session; command-line builds and asset commandlets are the working path.
- Build 3D Game Rooms and Game Development Studio plugins are installed. Their presence
  does not mean a Blender MCP connection or the `game-dev` CLI is usable. Prior inspection
  found the CLI unavailable; current work uses local scripts and API requests.
- MoGe scene reconstruction, TripoSplat and Hunyuan alternatives have been
  researched. They are not admitted to the game or confirmed as working local pipelines.

## Release licences

Argus's MIT notice and bundled notices remain in the repository. Existing Kenney town
assets are CC0 with a retained notice under `licenses/`. Check exact image/3D checkpoint,
encoder, background-removal and other dependency terms before using generated results
in a released demo. Core model or wrapper licences do not automatically clear the
whole graph. In particular, Hunyuan3D 2.1's published licence excludes the UK, EU and
South Korea; that workflow was not selected. See linked primary sources in LINKS.md.

## Trial result

Completed successfully through local generation, GLB export, unchanged Blender import,
geometry inspection and three review views per candidate:

| Stage | Observed job time | Inspected output |
| --- | --- | --- |
| Flux 2 Klein base 4B concept | 43.534 seconds | Isolated 1024 reference image. |
| Pixal3D branch | 84.999 seconds | 14,716 triangles, 14,191 vertices, one mesh/material, UVs, three 1024 images. |
| TRELLIS.2 branch | 66.436 seconds | 14,746 triangles, 12,466 vertices, one mesh/material, UVs, three 1024 images. |

These are observed runs, not controlled cold-start benchmarks; the comparison reused
cached helper nodes. Both candidates are recognizable, but have softened/irregular
geometry and lighter material appearance than the reference. Pixal3D retains stronger
teal panels in this trial; TRELLIS.2 produces a different rear/underside interpretation.
Thin weapons and invented unseen details need particular inspection. Neither candidate
is final art or imported into Unreal. Raw outputs, six review images, inspections,
prompts, graph hashes and job receipts are preserved in `art/drone-trial/` and the
derived workflow recipes. See [trial notes](art/drone-trial/README.md).

### Multiview follow-up

The supplied `3d_pixal3d_multi_views.json` is now preserved unchanged. A derived recipe
successfully ran the downloaded multiview checkpoint using four calibrated Blender
renders of the existing Pixal3D drone. The camera rig matches the installed native
node: 20-degree horizontal FOV, zero elevation, 90-degree orbit increments, identical
scale and black backgrounds. Per-view cropping is bypassed to preserve calibration.

The job completed in 96.147 seconds and exported one mesh with 14,970 triangles,
12,788 vertices, UVs, one material and three 1024 images. Blender import and three
review renders succeeded. This is a controlled reconstruction test, not proof of
better concept generation. Hard edges and thin weapons still need cleanup, and the
candidate has not entered Unreal. Inputs, camera metadata, output, inspection,
review renders and hashed provenance are in
[multiview trial notes](art/drone-multiview-trial/README.md).

### First Unreal drone cleanup

The original single-view Pixal3D output now has a separate Blender cleanup candidate
under `art/combat-drone/`. It is levelled, oriented +X forward and scaled to a 1.9-metre
wingspan, with conservative surface smoothing, a rebuilt cannon and five separately
authored material slots. The cleaned export has 15,236 triangles. The raw generated
outputs remain unchanged. No texture generation or paid provider was needed.

Unreal imported the FBX at approximately 179.5 × 189.8 × 49.5 cm. Prototype flying
units use this visual mesh with faction colour on the Team slot and grey on all slots
when destroyed. The matching portrait replaces the primitive drone image. A dedicated
offscreen in-game review shows a native friendly actor and hostile/destroyed preview
neighbours at the default RTS camera distance. This is internal integration, not final
production art: surface irregularities remain, and LODs, performance and release terms
still need review. See [cleanup and validation](art/combat-drone/README.md).

### SAM 3D Body follow-up

Preserved the supplied video graph and tested a generated full-body officer reference.
The current main instance's native loader selects FP16 for the BF16 SAM checkpoint:
hand refinement failed, body-only export contained NaNs and smoothing failed. A separate
loopback instance with `--bf16-unet` resolved the failures without editing the main
installation. The reusable diagnostic launcher also explicitly isolates its database.

Successful tests include body/hand recovery and the supplied graph's video decoding,
slicing, SAM3 tracking, RT-DETR, MoGe camera estimation, facial expression, smoothing,
SCAIL/body GLB exports and overlay MP4. The video fixture repeats a reference four times;
this establishes dependency/export function, not real motion-capture quality.

Blender verifies 36,874 body triangles, a 127-bone skin, finite float data and no body
UVs, textures or materials. The exporter also includes an 80-triangle marker. A single
pose and a four-frame 24-fps stationary clip are preserved. Use this tool for anatomy,
pose and rigging references; uniforms and finished character art need a separate pass.
No result has entered Unreal. [Body trial notes](art/body-trial/README.md) document
the exact recipes, workaround, inspections and provenance. Review both SAM and MHR
terms before distributing derived body assets; LINKS.md holds the primary sources.
