# SAM 3D Body local trial

The supplied original graph processes a five-second example video, which is not
installed locally. It combines SAM3 tracking, RT-DETR boxes, MoGe camera estimation,
SAM body/hand prediction, facial expression, temporal smoothing and GLB/video export.
Its default `scail` export is a capsule visualization, not a dressed game character.

Derived recipes preserve the original and use a new locally generated adult officer
reference in a neutral standing pose. `body_still.json` exercises core human recovery
and a skinned `body_mesh` GLB export. `body_stationary_clip.json` supplies four identical
reference frames to the tracking, detection, camera, face and smoothing branches and
exports both SCAIL and body-mesh GLBs plus an overlay video. It is a dependency and
export smoke test; repeated stills do not establish motion-capture accuracy or stability.

The body representation estimates anatomy and pose. Clothes, armour, weapons and
finished textures are a separate art task. Neither a recovered pose nor an exported
skin establishes Unreal skeleton compatibility, animation quality or game readiness.
These trial files remain separate from game assets.

Body recovery uses Meta's SAM 3D Body and MHR representation. Their upstream notices
are preserved in `licenses/SAM-3D-Body-LICENSE.txt` and `licenses/MHR-LICENSE.txt`.
No model weights are stored in this repository. Before public distribution, inspect
the SAM and MHR terms and the exact dependencies, as linked in LINKS.md.

## Results and precision requirement

The main local instance chooses FP16 when the native loader requests a default dtype
for this BF16 checkpoint. In this test, hand refinement failed on a singular crop,
body-only export contained NaNs despite a success status, and temporal smoothing failed
to converge. The bad output is quarantined in ignored Results, not a usable asset.
The negative test recipes `body_hand_refinement.json` and `body_fp16.json` are diagnostic
history, not recommended settings.

An isolated loopback ComfyUI instance with `--bf16-unet` produced valid body-and-hand
recovery. `start_body_bf16_test.py` starts that bounded diagnostic setup with custom
nodes disabled, separate user/output directories and an in-memory database. It does
not edit the main installation or its launch arguments. The original instance stays
running. Stop the temporary process after use; its PID is under Results/body-bf16.
The initial diagnostic launch used ComfyUI's default database URL, which encountered
the existing instance's database lock; the reusable launcher now explicitly isolates it.

For repeat tests, run the derived recipes against a BF16 instance using the client's
`--base` option. A global `--bf16-unet` flag affects other model loaders too; keep the
separate instance for this test rather than changing unrelated working recipes.

The body GLB imports into Blender with a 127-bone rig and 36,874 body triangles. It
also includes an 80-triangle unskinned marker. Every float accessor is finite. The
actual body has no UVs, materials or textures; the marker's UV layer is not body UVs.
The single-image export contains one pose, not a usable movement animation. The
four-frame stationary clip validates video decoding, slicing and the full dependency
branches, with an animation time range of 0–0.125 seconds at 24 fps. It does not test
walking, fighting, foot sliding or retargeting.

Useful next use: a proportion/pose guide or rigging reference for a separately authored
and dressed character, followed by Unreal retarget and gameplay checks. No game asset
was changed by this trial. Receipts and review images accompany the raw exports.
