# Render PC: report (2026-09-27)

The setup followed `PC-SETUP-LINUX.md`, with the deviations listed under **Differences from the brief**.

```
Ubuntu version / kernel:   Ubuntu 26.04.1 LTS / 7.0.0-34-generic (installed "minimized")
NIC name / MAC:            enp6s0 / 50:eb:f6:be:88:99    LAN IP: DHCP (was .103/.104), no reservation (Sky router)
                           → always use render.local (avahi)   subnet: 192.168.0.0/24
mem_sleep: [deep]          idle action: suspend (20 min, comfy-idle-suspend.timer)
WoL tested: from suspend yes, 15 s to ComfyUI up   from off: not tested
GRUB: Windows entry present yes (os-prober)   `game` script installed, not run
NVIDIA driver:             595.91.07 server-open (headless), CUDA 13.2, Secure Boot off (no MOK)
power limit: 300 W (min 100 / default 450 / max 450), survives resume
ComfyUI:                   v0.37.0, commit 4ef23c34, Python 3.13 (uv venv), torch 2.14.0+cu130
custom nodes:              ComfyUI-Manager (Comfy-Org/ComfyUI-Manager), network_mode = offline

Models (all Apache-2.0, checked on Hugging Face 2026-09-27):
  FLUX.2 klein 4B   diffusion_models/flux-2-klein-4b-fp8.safetensors      black-forest-labs/FLUX.2-klein-4b-fp8
                    text_encoders/qwen_3_4b.safetensors                   Comfy-Org/z_image_turbo
                    vae/flux2-vae-klein.safetensors                       black-forest-labs/FLUX.2-klein-4B (vae/)
  Qwen-Image-Edit   diffusion_models/qwen_image_edit_2511_fp8mixed         Comfy-Org/Qwen-Image-Edit_ComfyUI
    2511            text_encoders/qwen_2.5_vl_7b_fp8_scaled                Comfy-Org/Qwen-Image_ComfyUI
                    vae/qwen_image_vae                                     Comfy-Org/Qwen-Image_ComfyUI
                    loras/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16  lightx2v/Qwen-Image-Edit-2511-Lightning
Workflows: workflows/klein4b_edit_api.json, workflows/qwen_edit_api.json (node ids in comfy.example.json)

Speed, GPU time from the ComfyUI log (warm):  klein 1MP 5.3 s, 2MP 12.5 s | qwen 1MP 15.3 s, 2MP 23 s
  The client adds about 15-20 s per job on top (upload, 2560x1440 PNG, polling), which is worth tuning for batches.
Peak VRAM:     klein ~12 GB, qwen ~20 GB (of 24)
Power:         idle ~32 W GPU (nvidia-smi); rendering capped at 300 W. No plug meter.
Firewall: internet blocked yes   LAN client works yes   net-maintenance on/off tested yes
```

## Differences from the brief (and why)

- **Ubuntu 26.04**, not 24.04 (that's what got installed). Everything in the brief worked on it.
- **All** free space went to Linux: p6 = 971.6 G ext4 `/` (Bart: storage for video and 3D assets). **No D: for games**;
  Windows keeps only C: (~52 GB free). p5 = 5 GB `UBUNTU` installer partition (FAT32), still present, EFI boot entry removed.
- Installed from the p5 partition with **`toram`** (without it the installer reports "no disks"). The SD reader on a
  USB-C dongle gave read errors (rsync exit 23).
- **Network: systemd-networkd**, not netplan (`/etc/systemd/network/10-lan.network` + `10-lan.link` with
  `WakeOnLan=magic`). Purging cloud-init as the brief says **deleted the netplan file, and autoremove took netplan
  itself**, so the network was gone after the reboot. **Remove that step from the brief.**
- **Model licences:** the ComfyUI templates download the FLUX.2 VAE from `Comfy-Org/flux2-dev` (**non-commercial**
  licence) and the Qwen text encoder from `Comfy-Org/HunyuanVideo_1.5_repackaged` (Tencent licence). Both were
  replaced with Apache sources. `Qwen-Image 2.1` has a *qwen-research* licence, so it was skipped.
- The workflows scale by `megapixels` (`ImageScaleToTotalPixels`, lanczos) and take width/height from the image, so
  `--mp` controls both models the same way.
- **WoL: use `broadcast: 255.255.255.255`.** `192.168.0.255` did not wake the PC.
- `bart` has NOPASSWD sudo (`/etc/sudoers.d/90-bart-nopasswd`); SSH is key-only (`~/.ssh/render` on the Mac).
- The idle-suspend script also counts `get-models.service` and apt/dpkg as busy.
- Minimized Ubuntu has no `ping`.

## First look (Dante st01_wide_front_lines, test prompt)

- **klein:** geometry exactly preserved, light hand-drawn line with a little hatching. Conservative.
- **Qwen:** single-direction hatching on the table frame and legs, cast shadows on the floor, and small changes (a
  skirting board appeared). Closer to the history-line style.
- Still to do: the A/B test from the README with the full house prompt, the no-AI Blender baseline, and one Nano
  Banana 2 reference (Bart approves the Weave credits).
