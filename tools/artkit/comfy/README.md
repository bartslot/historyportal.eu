# ComfyUI render client (Mac side)

Sends asset-pack conversions to the ComfyUI server on Bart's PC (RTX 3090 Ti, LAN only) instead of
Nano Banana 2 in Figma. Background: `decision_2026-09-27_1005_image-conversion-costs-local-render-server`
and `setup_2026-09-27_1005_comfyui-render-server-pc` in the `memory/historyportal` notes.

Standard library only. No `pip install`.

Setting up the PC itself (Ubuntu dual-boot, headless, LAN only): [`PC-SETUP-LINUX.md`](PC-SETUP-LINUX.md).

## Once the PC's "Report back" is in

1. `cp comfy.example.json comfy.json` (git-ignored: it holds the LAN IP and MAC address).
   Fill in `host`, `mac`, and replace each `*_ID` with the node ids from the report.
   Addresses are `"<node id>.<input name>"`. Leave out any field a workflow doesn't have.
   For example, Qwen scales by `megapixels` and klein takes `width`/`height`.
2. Drop the exported `klein4b_edit_api.json` and `qwen_edit_api.json` into `workflows/`.
3. `python3 comfy_client.py ping`. If it says down, run `python3 comfy_client.py wake` and try again after about a minute.

## Use

```bash
# one image -> <image dir>/converted/<stem>__klein4b__<hash>.png (+ .json with params and seconds)
python3 comfy_client.py run klein4b lesson_assets/Dante/packs/study/study_wide.png --mp 1

# folder watcher: everything in <folder>/in is converted into <folder>/out
python3 comfy_client.py watch lesson_assets/Dante/packs/ab-test qwen --mp 2
```

- The PC is woken automatically when ComfyUI doesn't answer.
- Results are cached by a hash of the input image, workflow, prompt and parameters. Re-running a batch
  or restarting the watcher only queues what's new. Changing the seed, prompt or size makes a new job.
- `prompts/history-line.txt` is the short test prompt from the setup brief. Point `--prompt-file`
  at the full house-style prompt (under 1,200 chars) for real runs.

## A/B test (next step after setup)

On one Dante source, compare:
- local klein
- local Qwen
- Blender Freestyle lines with lineclean only (no AI)
- one Nano Banana 2 reference (about 6 Weave credits; Bart approves)

The `.json` next to each output records its timing for the cost comparison.

## Tests

`python3 -m unittest test_comfy_client` (from this folder). Runs against a fake ComfyUI, with no PC needed.
