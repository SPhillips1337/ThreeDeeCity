# Desktop agent prompt: local AI asset pipeline for Three.js

You are working on my desktop at 192.168.5.229. Test an end-to-end local asset pipeline on one of my existing Three.js projects:

ComfyUI image generation on 192.168.5.157 → native Pixal3D or TRELLIS.2 image-to-3D → raw GLB browser test → Blender inspection/cleanup → final GLB integrated into the project.

Carry this through to a working browser demonstration, with screenshots, measurements and reproducible scripts. Choose a small static prop that fits the current project: a crate, pedestal, rock, building or compact drone. Avoid starting with an animated character. Read the project's AGENTS.md and package configuration, preserve my existing changes, and work on a separate branch using the repository's conventions. If several projects are equally plausible and no project is open, ask me which one; otherwise use the current project. This authorizes local generation, derived copies, Blender cleanup and a reversible project integration. Do not deploy or invoke paid/cloud generation.

## Known generation host

- Main ComfyUI endpoint: http://192.168.5.157:8188. Verified reachable from the generation host on 5 October 2026; queue was idle at that check. Verify connectivity from THIS desktop before proceeding.
- ComfyUI 0.38.0, Python 3.12.10, PyTorch 2.14.0+cu130, NVIDIA RTX 5090 Laptop GPU with about 24 GB VRAM. These are observations, not guarantees about current availability.
- Generation-host installation: C:/Users/steph/Downloads/StabilityMatrix-win-x64/Data/Packages/ComfyUI.
- Generation-host Blender: C:/Program Files/Blender Foundation/Blender 5.2/blender.exe, version 5.2.2 LTS.
- Generation-host reference repository: C:/Users/steph/Documents/ChatGPT/New project/work/unreal-prototypes/AshfallRTS.
- These Windows paths belong to .157, not .229. They are not automatically network shares. No remote Blender MCP endpoint, SSH service or SMB share has been confirmed. Discover capabilities rather than inventing ports or assuming remote access.

I can supply the accompanying reference ZIP. It contains workflow JSONs, the small ComfyUI API client and local trial notes; no model weights, credentials or generated asset binaries. Extract it locally and inspect the recipes before use. Alternatively obtain the relevant files through an already configured, authorized connection to the reference repository. If you cannot obtain workflows or download the resulting GLB through existing services, describe the exact missing file/route and ask me for that transfer; do not pretend a remote filesystem path is usable locally.

## Working recipes and previous evidence

- workflows/comfyui/original/ contains API-format graphs, not ordinary editor-layout exports.
- Flux 2 Klein base 4B generated a 1024-square drone reference successfully. Z-image Turbo, Kandinsky 5 Lite and Qwen are also supplied image options, but do not assume every one has been tested.
- MageFlow, Boogu and Qwen image-edit recipes are supplied for optional refinements. Skip extra editing for the first test unless needed.
- Native Pixal3D and TRELLIS.2 both exported textured GLBs that imported into Blender. Prior bounded runs yielded about 14,700 triangles, one mesh/material, UVs and three 1024 textures.
- Use derived drone_concept.json and drone_pixal3d.json as bounded starting recipes, replacing their prompt, output prefixes, seed and input image for YOUR asset. Node 122 is the 3D input image; node 316 selects Pixal3D when false, TRELLIS.2 when true. Validate these against the actual graph and /object_info instead of blindly assuming node IDs remain unchanged.
- Prior trial budgets: 1024 image upsampling, remesh grid 256, export face target 15,000, atlas 1024, normal baking 1024, AO 512 with 16 samples. Export target does not establish actual triangle count: inspect it.
- Original graphs include example filenames that may be missing. Never submit unchanged examples or overwrite original recipes.
- Multiview Pixal3D also worked with four calibrated Blender renders: horizontal FOV 20 degrees, zero elevation, 90-degree increments, matching framing and black backgrounds. This tested reconstruction, not generated multiview consistency. Leave multiview for a later optional experiment.
- SAM 3D Body is for anatomy/pose/skin recovery, not textured dressed-character generation. Prior valid output had 36,874 body triangles, 127 bones and no body UVs/materials/textures. Default FP16 yielded NaNs; isolated BF16 resolved it. Its diagnostic server was loopback-only and should not be assumed accessible over LAN. Do not change the main server's precision for this prop test.

## Execute the test

1. Inspect the chosen project's Three.js version, renderer, asset conventions, loader and build commands. Use installed dependencies and existing patterns; do not upgrade the whole project.
2. Check ComfyUI /system_stats, /object_info and /queue. Confirm required nodes/model filenames. Submit jobs sequentially only when the queue is free. Do not clear, cancel or restart someone else's work. Preserve prompt, seed, graph hash, job ID and terminal history. Poll the same job after timeouts; check history/queue before retrying an ambiguous submission.
3. Generate one isolated reference image: one complete object, clear silhouette, plain background, no captions/UI and no cropped parts. Review it before 3D generation. Use /upload/image for remote input transfer if supported. Use unique filenames/output prefixes.
4. Run one Pixal3D image-to-3D job. Follow it to success or a specific terminal failure. Read actual output metadata. Transfer files through supported download routes such as /view where the output type is supported, or an existing authorized file-transfer service. Do not assume /view serves every custom-node output. Download dependent files too if export is not self-contained, and verify file size/hash. Preserve the raw output unchanged.
5. Test the raw GLB with GLTFLoader in a small project-local review scene BEFORE cleanup. Determine whether it already loads and renders. Check required glTF extensions and any decoder requirements. Blender is a quality/optimization stage, not a universal requirement for Three.js compatibility.
6. Inspect in Blender on .229 if available. Discover its MCP tools if actually configured; otherwise use a reproducible background Blender Python script. Remote Blender is optional and requires a confirmed transport plus file access. MCP is orchestration, not automatic file transfer, and many Blender MCP addons require a running Blender GUI. Do not assume MCP makes Blender headless.
7. Inspect meshes, triangles, UVs, textures, materials, bounds, orientation, normals and finite geometry. Repair only demonstrated issues. Create a separate cleaned export and preserve the source. Target roughly 10–20k triangles, 1–3 materials and 1024 textures for this first prop; justify deviations. Set useful real-world scale and a ground-centred pivot. Preserve glTF PBR appearance and verify axis conversion to Three.js Y-up. Decimation is not guaranteed animation-ready retopology; do not remesh or rebake blindly. Do not discard valid vertex colours or textures.
8. First export an ordinary uncompressed GLB. Add Draco or Meshopt only as a measured optional comparison after that works; configure the corresponding loader decoder and serve its JS/WASM files correctly. Compression reduces transfer size, not triangle count, and adds decoding cost. Treat KTX2 texture compression as a separate optional step.
9. Integrate one final prop in the actual project behind a reversible test route/toggle or an appropriate existing scene. Preserve materials rather than replacing everything with MeshStandardMaterial. Verify lighting, colour, scale, pivot, shadows and asset URLs. Provide visible loading/error feedback and clean up GPU resources when unloading.
10. Run the project build and browser check. Capture raw-versus-cleaned screenshots using the same camera/light setup. Measure file bytes, triangles, textures, draw calls, loading time and frame time at a stated viewport/device. Test one instance and a modest repeated-instance scene, reporting cloning/instancing choices. Distinguish transfer/cache effects from rendering performance. Report real failures instead of claiming success from a GLB filename or API status.

## Deliverables

A working local browser URL; screenshots; raw and cleaned assets with provenance/hashes; workflow copies and reusable generation/cleanup scripts; a concise PIPELINE_TEST.md explaining commands, results and remaining issues. Record exact model/dependency terms and flag anything not cleared for public distribution. Do not put model weights, credentials or caches in Git. Show the final diff and test results; leave deployment/publishing to a separate instruction.

Use primary documentation for the installed versions:
- https://docs.comfy.org/development/comfyui-server/comms_routes
- https://threejs.org/docs/pages/GLTFLoader.html
- https://threejs.org/docs/pages/DRACOLoader.html
- https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html

The goal is to establish which parts work from .229 and whether cleanup measurably improves this project's result, rather than assume all generated GLBs need Blender or that a successful export is a finished game asset.
