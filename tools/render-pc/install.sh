#!/usr/bin/env bash
# One-time install of the render worker ON the render PC. Run from this folder:  sudo ./install.sh
# It copies the worker, creates the settings file if there is none, and starts the service.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
install -d -o comfy -g comfy /home/comfy/historyportal /home/comfy/historyportal-films
install -o comfy -g comfy -m 755 "$here/render_worker.py" /home/comfy/historyportal/render_worker.py
[ -f "$here/workflow.api.json" ] && install -o comfy -g comfy -m 644 "$here/workflow.api.json" /home/comfy/historyportal/workflow.api.json
install -d -m 750 /etc/historyportal
if [ ! -f /etc/historyportal/render-worker.env ]; then
  install -m 600 "$here/render-worker.env.example" /etc/historyportal/render-worker.env
  echo "Fill in RENDER_PC_TOKEN in /etc/historyportal/render-worker.env, then run this again."
  exit 0
fi
install -m 644 "$here/historyportal-render-worker.service" /etc/systemd/system/historyportal-render-worker.service
systemctl daemon-reload
systemctl enable --now historyportal-render-worker.service
sudo -u comfy env $(grep -v '^#' /etc/historyportal/render-worker.env | xargs) python3 /home/comfy/historyportal/render_worker.py check || true
echo "Logs: journalctl -u historyportal-render-worker -f"
