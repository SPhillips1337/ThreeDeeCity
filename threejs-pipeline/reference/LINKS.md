# Ashfall reference links

Collected from the project discussion and retained research. Inclusion is a reference,
not an endorsement, an installed capability or release licence clearance.
See [RESOURCES.md](RESOURCES.md) for what is actually available locally.

## Project and Unreal foundation

- [Private Ashfall repository](https://github.com/SPhillips1337/AshfallRTS).
- [Karazaa/Argus](https://github.com/Karazaa/Argus): MIT RTS foundation; original pinned
  evaluation commit `f1978c77f39124c54079538c9a7540c1211e0bfb`.
- [Argus wiki](https://github.com/Karazaa/Argus/wiki): upstream architecture notes.
- [WildCake/unreal-engine-mcp-codex](https://github.com/WildCake/unreal-engine-mcp-codex):
  installed skill / unattended runners and official UE MCP integration guidance.
- [Epic Unreal engine skills](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin):
  source referenced by the Codex adaptation.
- [Official Unreal Engine source](https://github.com/EpicGames/UnrealEngine): Epic account
  access may be required; this project uses the installed engine rather than vendoring it.
- [Unreal MCP documentation](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor).
- [Original Codex / Unreal article](https://codex.danielvaughan.com/2026/05/28/codex-cli-unreal-engine-5-7-game-development-mcp-servers-blueprint-agent-workflows/):
  user-supplied starting reference; older-version setup details may differ from UE 5.8.
- [Unreal community MCP tutorial](https://forums.unrealengine.com/t/community-tutorial-using-the-unreal-engine-5-mcp-server-with-claude-code-codex-cli-and-cursor/2738663):
  user-supplied starting reference.

## Local generation and 3D research

- [ComfyUI](https://github.com/Comfy-Org/ComfyUI): local graph runtime and API.
- [ComfyUI workflow templates](https://github.com/Comfy-Org/workflow_templates): source
  for template research; preserve our exported graphs rather than depending on changing defaults.
- [Native TRELLIS.2 / Pixal3D integration](https://blog.comfy.org/p/trellis2-and-pixal3d-are-now-native):
  official ComfyUI description of the native implementation.
- [Microsoft TRELLIS.2](https://github.com/microsoft/TRELLIS.2): geometry and material
  generation. Upstream Linux/hardware instructions differ from native ComfyUI execution.
- [TencentARC Pixal3D](https://github.com/TencentARC/Pixal3D): image-to-3D and multi-view
  inference. [Dependency notices](https://github.com/TencentARC/Pixal3D/blob/master/NOTICE).
- [Pixal3D ComfyUI custom nodes](https://github.com/Saganaki22/Pixal3D-ComfyUI): researched
  alternative wrapper; our test uses native ComfyUI nodes, not this installation.
- [Microsoft MoGe](https://github.com/microsoft/MoGe): geometry / field-of-view estimation
  and scene reconstruction; the supplied Pixal3D graph uses it for field of view.
- [Meta SAM 3D Body](https://github.com/facebookresearch/sam-3d-body): human mesh/pose
  recovery research, distinct from producing a finished animated soldier.
- [Meta SAM 3D Objects](https://github.com/facebookresearch/sam-3d-objects): related object
  reconstruction reference, not tested for Ashfall.
- [TripoSplat](https://github.com/VAST-AI-Research/TripoSplat): Gaussian splat generation;
  different output and integration requirements from conventional Unreal meshes.
- [Hunyuan3D 2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1): alternative researched,
  not selected. [Published territorial licence](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE)
  excludes the UK, EU and South Korea; do not assume other checkpoints have identical terms.
- [Hunyuan3D 2](https://github.com/Tencent-Hunyuan/Hunyuan3D-2): related older generation;
  exact checkpoint and licence need their own review.
- [Blender](https://www.blender.org/): local cleanup, authoring, rigging and rendering.

## Existing art and gameplay inspiration

- [Kenney Fantasy Town Kit](https://kenney.nl/assets/fantasy-town-kit): source of existing
  CC0 refuge houses; preserved import receipt and notice are under `licenses/`.
- [RTS games list](https://en.wikipedia.org/wiki/List_of_real-time_strategy_video_games):
  user-supplied inspiration catalogue. Age of Empires, Planetary Annihilation and Dune II
  informed discussion of traditional controls, interface and simultaneous strategic zones.

## Human body and pose recovery

- [SAM 3D Body](https://github.com/facebookresearch/sam-3d-body): human body, hand and
  pose estimation, rather than dressed-character asset generation.
- [SAM licence](https://github.com/facebookresearch/sam-3d-body/blob/main/LICENSE).
- [Momentum Human Rig](https://github.com/facebookresearch/MHR) and its
  [licence](https://github.com/facebookresearch/MHR/blob/main/LICENSE): parametric body,
  skeleton and skin representation used by the recovery pipeline.

## Repository maintenance references

- [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
- [Git LFS](https://github.com/git-lfs/git-lfs): Unreal and artwork binary storage.
- [Unreal source control](https://dev.epicgames.com/documentation/en-us/unreal-engine/source-control-in-unreal-engine).

This list covers links recoverable from the conversation and local project notes. Add
new research here as it is used; keep installed-tool status in RESOURCES.md rather than
implying every research link was installed or adopted.
