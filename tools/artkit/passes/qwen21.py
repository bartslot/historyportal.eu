"""Qwen Image 2.1 multi-image edit (up to 10 images, named <image1>.. in the prompt; image 1 is the edit target).
--pose runs the LAST image through the OpenPose preprocessor first, so only its skeleton reaches the model
(the pose-transfer group of Bart's Ep34 workflow).

usage: python3 qwen21.py IMG1 [IMG2 ...] --prompt TEXT_OR_FILE [--pose] [--steps 25] [--seed 1] [--res 1024] -o OUT.png
"""
import argparse
import json
import time
from pathlib import Path

from passes import CLIENT_DIR, cc, resolved


def graph(n_images, prompt, seed, steps, res, pose):
    wf = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_2.1_int8_convrot.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_8b_int8_convrot.safetensors", "type": "qwen_image", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
        "7": {"class_type": "TextEncodeQwenImage21", "inputs": {"clip": ["2", 0], "prompt": prompt, "negative_prompt": "", "vae": ["3", 0], "resolution": res}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["7", 0], "negative": ["7", 1], "latent_image": ["7", 2],
                                                  "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": "qwen21"}},
    }
    for i in range(n_images):
        node = str(20 + i)
        wf[node] = {"class_type": "LoadImage", "inputs": {"image": f"in{i}.png"}}
        source = [node, 0]
        if pose and i == n_images - 1:
            wf["30"] = {"class_type": "AIO_Preprocessor", "inputs": {"image": source, "preprocessor": "OpenposePreprocessor", "resolution": 1024}}
            wf["31"] = {"class_type": "SaveImage", "inputs": {"images": ["30", 0], "filename_prefix": "qwen21_pose"}}
            source = ["30", 0]
        wf["7"]["inputs"][f"images.image_{i + 1}"] = source
    return wf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", type=Path, nargs="+")
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--pose", action="store_true")
    ap.add_argument("--steps", type=int, default=25)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--res", type=int, default=1024)
    ap.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()
    prompt = Path(a.prompt).read_text() if a.prompt.endswith(".txt") else a.prompt

    cfg = resolved(cc.load_config(CLIENT_DIR / "comfy.json"))
    wf = graph(len(a.images), prompt, a.seed, a.steps, a.res, a.pose)
    digest = cc.job_hash(b"".join(p.read_bytes() for p in a.images), wf, {})
    cc.ensure_up(cfg)
    t0 = time.monotonic()
    for i, p in enumerate(a.images):
        wf[str(20 + i)]["inputs"]["image"] = cc.upload(cfg, p, f"{digest[:12]}_{i}{p.suffix.lower()}")
    images = cc.wait_for(cfg, cc.queue(cfg, wf))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    final = [im for im in images if "qwen21_pose" not in str(im)] or images
    a.out.write_bytes(cc.download(cfg, final[-1]))
    for im in images:
        if "qwen21_pose" in str(im):
            a.out.with_name(a.out.stem + "_skeleton.png").write_bytes(cc.download(cfg, im))
    meta = {"images": [str(p) for p in a.images], "prompt": prompt, "pose": a.pose, "seed": a.seed, "steps": a.steps,
            "seconds": round(time.monotonic() - t0, 1)}
    a.out.with_suffix(".json").write_text(json.dumps(meta, indent=1))
    print("done", a.out.name, meta["seconds"], "s")


if __name__ == "__main__":
    main()
