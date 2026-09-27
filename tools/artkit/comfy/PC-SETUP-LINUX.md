# Render PC: Ubuntu Server dual-boot, headless ComfyUI, LAN only

Replaces the Windows brief (`setup_2026-09-27_1005_comfyui-render-server-pc`). The PC dual-boots:
- **Linux (default)** is a headless ComfyUI render server. No desktop and no internet: it talks only to
  the LAN, and sleeps when idle.
- **Windows** is for gaming, picked from the boot menu. Its internet access doesn't change.

Hardware: RTX 3090 Ti 24 GB, 32 GB RAM, one 2 TB SSD (Disk 0):
EFI 100 MB | C: 885 GB NTFS (only ~52 GB free) | Recovery 773 MB | **partition 5: 976 GB RAW**.
Linux goes into partition 5, so C: is not shrunk (at 6% free it couldn't give up 300 GB anyway).

**Who does what.** Bart does parts A and B by hand. After that, **Claude on the Mac** does everything
over SSH (`ssh render ...`). Claude Code needs the internet, so it doesn't run on the locked-down PC.
Each part ends with a check; don't move on until it passes.

---

## A. In Windows (Bart)

1. Back up anything on the PC you'd hate to lose.
2. **BitLocker:** Settings → Privacy & security → Device encryption (or Control Panel → BitLocker).
   If it's on, save the recovery key somewhere off the PC, then **Suspend protection**.
3. **Fast Startup off:** Control Panel → Power Options → Choose what the power buttons do → Change
   settings that are currently unavailable → untick *Turn on fast startup*. It locks the disk and breaks
   Wake-on-LAN.
4. Clear out the junk. Then, in an admin terminal: `powercfg /h off` (hibernation off, which frees a big file).
5. **Partition 5 (976 GB RAW).** RAW means Windows can't read it, not that it's empty. Confirm nothing
   is on it: did it ever hold an earlier Linux install or a backup? In an admin terminal, run
   `diskpart` → `select disk 0` → `select partition 5` → `detail partition`.
   `Type: ebd0a0a2-…` (Windows basic data, never formatted) is expected. `0fc63daf-…` means it held Linux.
   Once you're sure, Disk Management → right-click it → **Delete Volume**. It becomes ~976 GB **Unallocated**.
   Plan for it: **300 GB Linux** plus **~670 GB NTFS `D:` for Windows games**. C: is 94% full and can't
   grow, because the recovery partition sits between C: and this space. Create D: after Linux is installed (B-6).
6. Network adapter → Properties → Advanced: **Wake on Magic Packet = Enabled** (and *Shutdown Wake-On-Lan*
   if listed). Write down the **MAC address** (`getmac /v`).
7. Router (optional): a **DHCP reservation** (fixed LAN IP) if the router offers one. On Sky hubs, use the web page
   `http://192.168.0.1` (Advanced → LAN IP Setup → Address Reservation), not the app; newer models may not
   have it. Not required: Linux announces itself as **`render.local`** (part C), so the Mac finds it by name,
   and Wake-on-LAN goes by MAC address. Note the current IP and the subnet (Bart: `192.168.0.98`, `192.168.0.0/24`).

✅ Check: Disk Management shows ~976 GB **Unallocated** after the recovery partition.

## B. BIOS and Ubuntu install (Bart)

1. BIOS/UEFI:
   - **Wake on LAN / Power On By PCI-E: Enabled**
   - **ErP / EuP / Deep Sleep: Disabled.** When it's on, it cuts standby power to the network card and WoL dies.
   - Leave Secure Boot on (see the driver step) or turn it off. Either works.
2. Get the installer booted, **with a wired connection**. Either:
   - **USB stick:** flash **Ubuntu Server 24.04 LTS** with balenaEtcher or Rufus, then boot it. This wipes the stick. Or
   - **Any FAT32 USB stick or SD card (in a USB reader), without wiping it:** check its file system
     is FAT32 (Explorer → Properties); exFAT won't boot. It needs about 3 GB free and no top-level `EFI` folder.
     Mount the ISO and `robocopy E:\ F:\ /E` onto it (the ISO is `E:`, the card is `F:`), next to what's
     already there. Boot it from the boot-menu key. Afterwards, delete the copied folders (`EFI`, `boot`,
     `casper`, `.disk`, `dists`, `pool`, `install`) and the loose files. Or
   - **No USB storage at all:** use the installer partition in B-2 below, then come back to step 3.
3. Installer choices:
   - Base: **Ubuntu Server (minimized)**.
   - Storage: **Custom storage layout**. Select the **~976 GB free space** → add an **ext4** partition,
     **size 300G**, mounted at `/`. Leave the rest free, for D:. Leave the existing EFI and Windows partitions alone (don't format
     them), **and the 5 GB `UBUNTU` installer partition if you used B-2**, since the installer is running from it.
     The installer reuses the existing EFI partition for the boot loader.
   - **Install OpenSSH server: yes.** No featured snaps.
   - Your server's name: **`render`**. User: `bart` (or your choice).
4. Reboot. It should come up in Ubuntu (text login).
5. On the PC's screen, log in and run `ip -4 addr` to get its IP. From the Mac: `ssh-copy-id bart@<that ip>`, and add
   this to `~/.ssh/config` (switch `HostName` to `render.local` once part C has installed avahi):
   ```
   Host render
     HostName <that ip>
     User bart
   ```

6. Games drive: boot Windows (GRUB menu) → Disk Management → right-click the remaining ~670 GB
   unallocated → **New Simple Volume** → NTFS, letter `D:`. In Steam and other launchers, add `D:` as a library folder.

✅ Check: `ssh render hostname` works from the Mac without a password.

### B-2. No USB stick: boot the installer from a partition on the SSD

The PC's UEFI firmware can boot any FAT32 partition that contains `EFI\BOOT\BOOTX64.EFI`, and the
Ubuntu ISO has one. So a small partition stands in for the stick. All of this happens in Windows.

1. Do A-5 first, so the old partition 5 is deleted and ~976 GB is unallocated.
2. Disk Management → right-click the unallocated space → **New Simple Volume** → **5 GB** (5120 MB),
   **FAT32**, label `UBUNTU`, give it a drive letter (say `U:`). Leave the rest unallocated.
3. Download `ubuntu-24.04.x-live-server-amd64.iso` from ubuntu.com/download/server. Verify it against
   the `SHA256SUMS` published next to it: `certutil -hashfile <iso> SHA256`.
4. Double-click the ISO to mount it (say it appears as `E:`), then copy **everything**, including the
   `.disk` folder:
   ```
   robocopy E:\ U:\ /E
   ```
   ✅ `U:\EFI\BOOT\BOOTX64.EFI` and `U:\casper\` exist.
5. Open the firmware's one-time boot menu: Shift + Restart → Troubleshoot → Advanced options →
   **UEFI Firmware Settings**, then the boot override section. Or press the board's boot-menu key at
   power-on (F8 on ASUS, F11 on MSI and ASRock, F12 on Gigabyte).
   Pick the entry for the `UBUNTU` partition. It's often shown as the SSD's name with "Partition 4/5"
   or as "UEFI OS".
   - Not listed? Most boards have **Boot from file** (or "Launch EFI Shell/File") in the same menu:
     browse to the `UBUNTU` partition → `EFI\BOOT\BOOTX64.EFI`.
   - Secure Boot can stay on; the ISO's loader is signed.
6. The GRUB menu shows **Try or Install Ubuntu Server**. Continue with step 3 above.

**Afterwards:** once Linux boots on its own (step 4 above), the `UBUNTU` partition isn't needed any more.
It isn't next to C: or D:, so it can't be merged into either. Leave it as a small spare drive, or delete it
in Disk Management. It's 5 GB.

---

## C. Base system (Claude on the Mac, over SSH)

The internet is still open at this point; it's closed in part H.

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl python3-venv python3-pip ethtool nftables os-prober pciutils

# Strip what a headless render box doesn't need
sudo systemctl disable --now snapd.socket snapd.service 2>/dev/null; sudo apt purge -y snapd
sudo apt purge -y unattended-upgrades
# Don't purge cloud-init: that deletes the netplan config it wrote, and autoremove then removes
# netplan too. The network is gone after the next reboot (happened 2026-09-27). Disable it instead:
sudo touch /etc/cloud/cloud-init.disabled
sudo systemctl disable --now bluetooth.service ModemManager.service 2>/dev/null
sudo apt autoremove -y

# SSH: keys only
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Windows keeps the hardware clock in local time; match it, or the clock jumps when switching OS
sudo timedatectl set-local-rtc 1

# Announce the PC as render.local on the LAN (mDNS), so the Mac needn't know its IP
sudo apt install -y avahi-daemon
sudo hostnamectl set-hostname render
# ✅ From the Mac: `ping -c1 render.local` answers. Then set `HostName render.local` in ~/.ssh/config.
```

Boot menu: Linux by default, Windows one reboot away.

```bash
sudo sed -i 's/^GRUB_DEFAULT=.*/GRUB_DEFAULT=saved/; s/^GRUB_TIMEOUT=.*/GRUB_TIMEOUT=3/; s/^GRUB_TIMEOUT_STYLE=.*/GRUB_TIMEOUT_STYLE=menu/' /etc/default/grub
grep -q '^GRUB_DISABLE_OS_PROBER' /etc/default/grub || echo 'GRUB_DISABLE_OS_PROBER=false' | sudo tee -a /etc/default/grub
sudo update-grub                       # must list "Windows Boot Manager"
sudo grub-set-default 0                # Ubuntu

# `ssh render game` → reboots once into Windows; next boot is Linux again
sudo tee /usr/local/bin/game >/dev/null <<'EOF'
#!/bin/sh
entry=$(grep -o "menuentry '[^']*Windows[^']*'" /boot/grub/grub.cfg | head -1 | cut -d"'" -f2)
[ -n "$entry" ] || { echo "no Windows entry in grub.cfg" >&2; exit 1; }
sudo grub-reboot "$entry" && sudo systemctl reboot
EOF
sudo chmod +x /usr/local/bin/game
```

✅ Check: `grep -c Windows /boot/grub/grub.cfg` ≥ 1. Reboot and see the menu. Ubuntu is preselected, and choosing Windows boots Windows.
Then check the BIOS boot order still has **ubuntu** first. Windows updates sometimes reset it.

## D. NVIDIA driver, headless, with a power cap

```bash
sudo ubuntu-drivers list --gpgpu
sudo ubuntu-drivers install --gpgpu    # server/compute driver, no display stack
# if nvidia-smi is missing afterwards: sudo apt install nvidia-utils-<same version>-server
```

With Secure Boot on, the install asks for a MOK password. Bart confirms it once on the blue
"Enroll MOK" screen at the next reboot (Enroll MOK → Continue → password).

```bash
sudo reboot
nvidia-smi                             # the 3090 Ti, driver version, ~20-30 W idle
nvidia-smi -q -d POWER | grep -i 'limit'   # note Min / Default (450 W) / Max
```

Survive suspend (keep VRAM contents across sleep):

```bash
echo 'options nvidia NVreg_PreserveVideoMemoryAllocations=1 NVreg_TemporaryFilePath=/var/tmp' | sudo tee /etc/modprobe.d/nvidia-power.conf
sudo update-initramfs -u
systemctl list-unit-files | grep -E 'nvidia-(suspend|resume|hibernate|persistenced)'
sudo systemctl enable nvidia-suspend nvidia-resume nvidia-hibernate nvidia-persistenced 2>/dev/null
```

Power cap: 300 W (or the card's minimum if that's higher). It costs about 10-15% speed and saves about 150 W under load.
It resets on boot and after resume, so apply it in both places:

```bash
sudo tee /usr/local/sbin/gpu-powercap >/dev/null <<'EOF'
#!/bin/sh
nvidia-smi -pm 1 >/dev/null
nvidia-smi -pl 300 >/dev/null
EOF
sudo chmod +x /usr/local/sbin/gpu-powercap

sudo tee /etc/systemd/system/gpu-powercap.service >/dev/null <<'EOF'
[Unit]
Description=Cap GPU power
After=nvidia-persistenced.service
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/gpu-powercap
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now gpu-powercap

sudo tee /usr/lib/systemd/system-sleep/gpu-powercap >/dev/null <<'EOF'
#!/bin/sh
[ "$1" = post ] && /usr/local/sbin/gpu-powercap
exit 0
EOF
sudo chmod +x /usr/lib/systemd/system-sleep/gpu-powercap
```

✅ Check: `nvidia-smi -q -d POWER | grep 'Current Power Limit'` shows 300 W.

## E. ComfyUI as a service

```bash
sudo useradd -m -s /bin/bash comfy
sudo -iu comfy bash <<'EOF'
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
python3 -m venv .venv && . .venv/bin/activate
# Use the NVIDIA PyTorch install line from ComfyUI's README (it names the current CUDA wheel index)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install -r requirements.txt
git clone https://github.com/Comfy-Org/ComfyUI-Manager custom_nodes/ComfyUI-Manager
pip install -r custom_nodes/ComfyUI-Manager/requirements.txt
EOF

sudo tee /etc/systemd/system/comfyui.service >/dev/null <<'EOF'
[Unit]
Description=ComfyUI (LAN render server)
After=network-online.target
Wants=network-online.target
[Service]
User=comfy
WorkingDirectory=/home/comfy/ComfyUI
Environment=DO_NOT_TRACK=1
ExecStart=/home/comfy/ComfyUI/.venv/bin/python main.py --listen 0.0.0.0 --port 8188
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now comfyui
```

Security: custom nodes run arbitrary Python. Install only well-known nodes that a workflow actually
needs, and list each one in the report.

✅ Check: `curl -s http://127.0.0.1:8188/system_stats` shows the 3090 Ti. From the Mac,
`http://render.local:8188` opens the ComfyUI page. **The UI runs in the Mac's browser**, since the PC has no desktop.

## F. Models and the two API workflows

In the Mac's browser, at `http://render.local:8188`:

1. Workflow → **Browse Templates** → the image-edit templates for **FLUX.2 [klein] 4B** and
   **Qwen-Image-Edit** (latest, **fp8**). Each template lists its exact model files and target folders.
   Download each on the PC (still online), as the `comfy` user, into `~/ComfyUI/models/<folder>/`
   (`wget -c <url> -O <file>`, or the Manager's model download).
2. **Licence check** for every file on its Hugging Face model card; output is used commercially.
   **Don't use** non-commercial FLUX weights (for example the 9B and dev variants). Record each licence.
3. For each model: minimal edit workflow `LoadImage` → edit → `SaveImage`, plus the prompt node.
   Settings → enable **Dev mode** → **Export (API)** → `klein4b_edit_api.json`, `qwen_edit_api.json`.
   Save both into the repo at `tools/artkit/comfy/workflows/`.
4. Note the node ids for: image (`LoadImage.image`), prompt text, seed, width/height or megapixels, steps.
   Put them in `tools/artkit/comfy/comfy.json` (copy from `comfy.example.json`).
5. Test at about 1 MP and about 2 MP, 16:9, with `python3 comfy_client.py run <workflow> <image> --mp 1`.
   The `.json` next to each output has the seconds. Measure on the second run, once the model is loaded.
   Peak VRAM: `ssh render nvidia-smi --query-gpu=memory.used --format=csv -l 1` during a run.

## G. Sleep when idle, wake on LAN

**Wake-on-LAN:** add `wakeonlan: true` to the wired interface in `/etc/netplan/*.yaml`, e.g.

```yaml
network:
  version: 2
  ethernets:
    enp5s0:            # your NIC name (ip -br link)
      dhcp4: true
      dhcp6: false
      accept-ra: false
      link-local: []
      wakeonlan: true
```

```bash
sudo netplan apply
sudo ethtool enp5s0 | grep Wake-on     # "Wake-on: g"
cat /sys/power/mem_sleep               # want "[deep]" (real S3). "s2idle" only = weak sleep, see note
```

**Idle suspend.** After 20 minutes with an empty ComfyUI queue and nobody logged in, it suspends:

```bash
sudo tee /usr/local/sbin/comfy-idle-suspend >/dev/null <<'EOF'
#!/bin/bash
# Suspend after IDLE_MIN minutes with ComfyUI's queue empty and no one logged in (SSH or console).
IDLE_MIN=20
STATE=/run/comfy-idle-since
busy=0
if q=$(curl -fsS --max-time 5 http://127.0.0.1:8188/queue); then
  busy=$(python3 -c 'import json,sys; q=json.load(sys.stdin); print(int(bool(q["queue_running"] or q["queue_pending"])))' <<<"$q")
fi
if [ "$busy" = 1 ] || [ -n "$(who)" ]; then rm -f "$STATE"; exit 0; fi
now=$(date +%s)
[ -f "$STATE" ] || { echo "$now" > "$STATE"; exit 0; }
if (( now - $(cat "$STATE") >= IDLE_MIN * 60 )); then rm -f "$STATE"; systemctl suspend; fi
EOF
sudo chmod +x /usr/local/sbin/comfy-idle-suspend

sudo tee /etc/systemd/system/comfy-idle-suspend.service >/dev/null <<'EOF'
[Unit]
Description=Suspend when ComfyUI is idle
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/comfy-idle-suspend
EOF
sudo tee /etc/systemd/system/comfy-idle-suspend.timer >/dev/null <<'EOF'
[Unit]
Description=Check ComfyUI idle every minute
[Timer]
OnBootSec=5min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now comfy-idle-suspend.timer
```

(An open SSH session keeps it awake. Log out and it sleeps 20 minutes later.)

✅ Check, from the Mac:
1. `ssh render sudo systemctl suspend` → `python3 comfy_client.py ping` says down.
2. `python3 comfy_client.py wake` → within about 10 s, `ping` says up, and ComfyUI answered without restarting.
3. `ssh render sudo poweroff` → `wake` → it boots into Linux (GRUB default) and `ping` is up within about 60 s.
4. `ssh render sudo nvidia-smi -q -d POWER | grep 'Current Power Limit'`: still 300 W after resume.

If suspend doesn't come back cleanly, or `mem_sleep` has no `deep`, change `systemctl suspend` to
`systemctl poweroff` in the idle script. WoL from off still works; a wake takes about a minute instead of a few seconds.

## H. Lock it to the LAN (last step, after all models are downloaded)

Fill in `LAN` from part A. SSH and ComfyUI answer only on the LAN. Outbound traffic goes only to the
LAN, plus DHCP. IPv6 is dropped.

```bash
sudo tee /etc/nftables.conf >/dev/null <<'EOF'
#!/usr/sbin/nft -f
flush ruleset
define LAN = 192.168.0.0/24

table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    iif lo accept
    ct state established,related accept
    ip saddr $LAN tcp dport { 22, 8188 } accept
    ip saddr $LAN icmp type echo-request accept
    ip saddr $LAN udp dport 5353 accept          # mDNS (render.local)
    udp sport 67 udp dport 68 accept
  }
  chain output {
    type filter hook output priority 0; policy drop;
    oif lo accept
    ct state established,related accept
    ip daddr $LAN accept
    ip daddr 224.0.0.251 udp dport 5353 accept   # mDNS (render.local)
    udp dport 67 accept
  }
  chain forward {
    type filter hook forward priority 0; policy drop;
  }
}
EOF
sudo systemctl enable --now nftables && sudo nft -f /etc/nftables.conf
```

Updates and new models, a temporary opening that closes itself after 2 hours:

```bash
sudo tee /usr/local/sbin/net-maintenance >/dev/null <<'EOF'
#!/bin/sh
# net-maintenance on  → outbound internet open for 2 h (apt, pip, model downloads)
# net-maintenance off → back to LAN only
case "$1" in
  on)  nft insert rule inet filter output accept comment \"maintenance\"
       systemd-run --on-active=2h --unit=net-maintenance-off /usr/local/sbin/net-maintenance off >/dev/null
       echo "internet open for 2 h" ;;
  off) nft -f /etc/nftables.conf
       systemctl stop net-maintenance-off.timer 2>/dev/null
       echo "LAN only" ;;
  *)   echo "usage: net-maintenance on|off" >&2; exit 1 ;;
esac
EOF
sudo chmod +x /usr/local/sbin/net-maintenance
```

Offline hygiene: in ComfyUI-Manager's `config.ini` (under `~/ComfyUI/user/`; the path varies by
version, `find ~/ComfyUI/user -name config.ini`) set `network_mode = offline`, then
`sudo systemctl restart comfyui`.

✅ Check:
- `ssh render curl -sS --max-time 5 https://example.com` fails.
- From the Mac, `python3 comfy_client.py ping` is up, and a `run` still converts an image.
- `ssh render sudo net-maintenance on` → the curl works → `net-maintenance off` → it fails again.

(Time sync can't reach internet NTP now. The clock drifts only slowly; `net-maintenance on`
lets it correct. If the router serves NTP, point `/etc/systemd/timesyncd.conf` `NTP=` at it.)

---

## Daily use

| Want | Do |
|---|---|
| Render | Just run the Mac client. It wakes the PC; the PC sleeps 20 min after the last job. |
| Game | `ssh render game` (reboots into Windows once), or pick Windows in the boot menu. |
| Done gaming | **Shut down** Windows, don't sleep it. The next wake then boots Linux. A sleeping Windows would be woken back into Windows. |
| Update Linux | `ssh render 'sudo net-maintenance on && sudo apt update && sudo apt full-upgrade -y && sudo net-maintenance off'` |

While Windows is running, the render server isn't there: the Mac client's `wake` does nothing and it times out.

## Report back (fill in, save next to this file as `PC-REPORT.md`)

```
Ubuntu version / kernel:
NIC name / MAC:            LAN IP (reserved):        subnet:
mem_sleep: deep / s2idle   idle action: suspend / poweroff
WoL tested: from suspend yes/no __s   from off yes/no __s
GRUB: Windows entry present yes/no   `game` works yes/no
NVIDIA driver:             power limit: __ W (min __ / default __)
ComfyUI commit:            custom nodes (name + source):

Models:
  FLUX.2 klein 4B   files:                     licence:
  Qwen-Image-Edit   files:                     licence:
Workflows: klein4b_edit_api.json, qwen_edit_api.json
  node ids: klein image=__ prompt=__ seed=__ width/height=__ steps=__
            qwen  image=__ prompt=__ seed=__ megapixels=__ steps=__

Speed (warm):  klein 1MP __s 2MP __s | qwen 1MP __s 2MP __s
Peak VRAM:     klein __GB qwen __GB
Power (plug meter): suspended __W  idle-awake __W  rendering __W
Firewall: internet blocked yes/no   LAN client works yes/no
Problems / notes:
```
