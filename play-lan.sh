#!/usr/bin/env bash
# Contra Web Port — LAN launcher. Serves the cabinet to every device on your
# network (phone, tablet, TV browser) with the local cartridge auto-loaded.
# Personal/home use: the ROM is read from ./roms on this machine only;
# nothing is uploaded anywhere.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8647}"
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -n "$LAN_IP" ] || LAN_IP="<this-machine-ip>"

if [ ! -f "roms/Contra (USA).nes" ]; then
  echo "note: roms/Contra (USA).nes is missing — devices will get the load-once drop zone." >&2
fi

(sleep 1.2 && xdg-open "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || true) &

echo "CONTRA on your network: http://${LAN_IP}:${PORT}/  (Ctrl-C to stop)"
exec python3 serve.py "${PORT}" 0.0.0.0
