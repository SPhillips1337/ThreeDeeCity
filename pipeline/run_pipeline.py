#!/usr/bin/env python3
"""
ThreeDeeCity asset pipeline: ComfyUI image gen → Pixal3D → GLB
Usage:
  python3 pipeline/run_pipeline.py --step image    # Step 1: generate concept image
  python3 pipeline/run_pipeline.py --step 3d       # Step 2: image → GLB
  python3 pipeline/run_pipeline.py --all           # Run both steps sequentially

Outputs land in pipeline/output/.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import hashlib
from pathlib import Path

COMFY_URL = "http://192.168.5.157:8188"
WORKFLOWS_DIR = Path(__file__).parent / "workflows"
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

POLL_INTERVAL = 5   # seconds between queue checks
TIMEOUT = 600       # 10 minutes max per job


def comfy_get(path):
    with urllib.request.urlopen(f"{COMFY_URL}{path}", timeout=15) as r:
        return json.loads(r.read())


def comfy_post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{COMFY_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def wait_for_idle():
    """Wait until the ComfyUI queue is fully empty."""
    print("  Waiting for queue to be idle...", end="", flush=True)
    while True:
        q = comfy_get("/queue")
        if not q["queue_running"] and not q["queue_pending"]:
            print(" idle.")
            return
        print(".", end="", flush=True)
        time.sleep(POLL_INTERVAL)


def submit_workflow(workflow_path):
    """Submit a workflow JSON and return the prompt_id."""
    with open(workflow_path) as f:
        workflow = json.load(f)
    payload = {"prompt": workflow}
    result = comfy_post("/prompt", payload)
    prompt_id = result.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"Submission failed: {result}")
    print(f"  Submitted prompt_id: {prompt_id}")
    return prompt_id


def poll_job(prompt_id):
    """Poll until the job completes or times out. Returns history entry."""
    deadline = time.time() + TIMEOUT
    print(f"  Polling job {prompt_id}...", end="", flush=True)
    while time.time() < deadline:
        history = comfy_get(f"/history/{prompt_id}")
        if prompt_id in history:
            entry = history[prompt_id]
            status = entry.get("status", {})
            if status.get("completed"):
                print(" done.")
                return entry
            if status.get("status_str") == "error":
                raise RuntimeError(f"Job failed: {entry}")
        # Check queue to give a running indicator
        q = comfy_get("/queue")
        running_ids = [r[1] for r in q.get("queue_running", [])]
        if prompt_id in running_ids:
            print("r", end="", flush=True)
        else:
            print(".", end="", flush=True)
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(f"Job {prompt_id} timed out after {TIMEOUT}s")


def download_output(filename, subfolder, output_type, dest_path):
    """Download a file from ComfyUI /view endpoint."""
    params = urllib.parse.urlencode({
        "filename": filename,
        "subfolder": subfolder,
        "type": output_type,
    })
    url = f"{COMFY_URL}/view?{params}"
    print(f"  Downloading {filename} → {dest_path}")
    with urllib.request.urlopen(url, timeout=60) as r:
        data = r.read()
    with open(dest_path, "wb") as f:
        f.write(data)
    sha256 = hashlib.sha256(data).hexdigest()[:12]
    print(f"  {len(data):,} bytes  sha256:{sha256}...")
    return dest_path


def upload_image(image_path):
    """Upload a local image to ComfyUI /upload/image."""
    import urllib.request
    import mimetypes

    boundary = "----ThreeDCityBoundary"
    filename = os.path.basename(image_path)
    with open(image_path, "rb") as f:
        img_data = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + img_data + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{COMFY_URL}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read())
    print(f"  Uploaded {filename} → name: {result.get('name')}")
    return result.get("name", filename)


def find_outputs(history_entry, class_types):
    """Extract output file infos matching given node class types from history."""
    outputs = history_entry.get("outputs", {})
    files = []
    prompt_nodes = history_entry.get("prompt", [{}])[2] if len(history_entry.get("prompt", [])) > 2 else {}
    for node_id, node_outputs in outputs.items():
        node_def = prompt_nodes.get(node_id, {})
        ct = node_def.get("class_type", "")
        if ct in class_types:
            for key, vals in node_outputs.items():
                if isinstance(vals, list):
                    files.extend(vals)
    return files


def step_image_gen():
    print("\n=== STEP 1: Flux 2 Klein image generation ===")
    wait_for_idle()
    prompt_id = submit_workflow(WORKFLOWS_DIR / "building_imagegen.json")
    entry = poll_job(prompt_id)

    # Find SaveImage output
    images = find_outputs(entry, {"SaveImage"})
    if not images:
        # Fallback: scan all outputs for images
        for node_outputs in entry.get("outputs", {}).values():
            imgs = node_outputs.get("images", [])
            if imgs:
                images.extend(imgs)

    if not images:
        raise RuntimeError(f"No image outputs found in history. Full outputs: {entry.get('outputs')}")

    img_info = images[0]
    dest = OUTPUT_DIR / img_info["filename"]
    download_output(img_info["filename"], img_info.get("subfolder", ""), img_info.get("type", "output"), dest)
    print(f"  Reference image saved: {dest}")
    return dest


def step_3d_gen(image_path):
    print(f"\n=== STEP 2: Pixal3D image-to-3D from {image_path.name} ===")

    # Upload the reference image to ComfyUI
    uploaded_name = upload_image(image_path)

    # Patch the workflow to use the uploaded image filename
    with open(WORKFLOWS_DIR / "building_pixal3d.json") as f:
        workflow = json.load(f)

    workflow["101"]["inputs"]["image"] = uploaded_name

    # Write patched workflow to a temp file for inspection
    patched_path = WORKFLOWS_DIR / "building_pixal3d_patched.json"
    with open(patched_path, "w") as f:
        json.dump(workflow, f, indent=2)

    wait_for_idle()
    payload = {"prompt": workflow}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{COMFY_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read())
    prompt_id = result.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"3D job submission failed: {result}")
    print(f"  Submitted 3D prompt_id: {prompt_id}")

    entry = poll_job(prompt_id)

    # SaveGLB outputs are in a 'gltf' or similar key — scan all outputs
    glb_files = []
    for node_outputs in entry.get("outputs", {}).values():
        for key, vals in node_outputs.items():
            if isinstance(vals, list):
                for v in vals:
                    if isinstance(v, dict):
                        fname = v.get("filename", "")
                        if fname.lower().endswith(".glb"):
                            glb_files.append(v)

    if not glb_files:
        print("  WARNING: No .glb found in standard outputs. Full outputs:")
        print(json.dumps(entry.get("outputs", {}), indent=2))
        raise RuntimeError("No GLB output found. Check SaveGLB node connectivity.")

    glb_info = glb_files[0]
    dest = OUTPUT_DIR / glb_info["filename"]
    download_output(glb_info["filename"], glb_info.get("subfolder", ""), glb_info.get("type", "output"), dest)
    print(f"  GLB saved: {dest}")
    return dest


def main():
    parser = argparse.ArgumentParser(description="ThreeDeeCity asset pipeline")
    parser.add_argument("--step", choices=["image", "3d"], help="Run a single step")
    parser.add_argument("--all", action="store_true", help="Run full pipeline")
    parser.add_argument("--image", help="Use an existing image for the 3D step (skips image gen)")
    args = parser.parse_args()

    # Verify ComfyUI is reachable
    try:
        stats = comfy_get("/system_stats")
        print(f"ComfyUI {stats['system']['comfyui_version']} reachable. "
              f"RAM free: {stats['system']['ram_free'] // (1024**3)} GB")
    except Exception as e:
        print(f"ERROR: Cannot reach ComfyUI at {COMFY_URL}: {e}")
        sys.exit(1)

    if args.step == "image" or args.all:
        image_path = step_image_gen()
    elif args.image:
        image_path = Path(args.image)
    else:
        image_path = None

    if args.step == "3d" or args.all:
        if not image_path:
            # Find the most recent concept image in output/
            candidates = sorted(OUTPUT_DIR.glob("threedcity_building_concept*.png"), key=os.path.getmtime, reverse=True)
            if not candidates:
                print("ERROR: No reference image found. Run --step image first or pass --image <path>")
                sys.exit(1)
            image_path = candidates[0]
            print(f"  Using existing image: {image_path}")
        glb_path = step_3d_gen(image_path)

        # Copy to public assets for Three.js
        public_dest = Path(__file__).parent.parent / "public" / "assets" / "models" / "residential_building.glb"
        import shutil
        shutil.copy2(glb_path, public_dest)
        print(f"\n  GLB copied to: {public_dest}")
        print(f"\n  Next: run 'npm run dev' and open the GLB preview at /#glb-preview")

    if not args.step and not args.all:
        parser.print_help()


if __name__ == "__main__":
    main()
