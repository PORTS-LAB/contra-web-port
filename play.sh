#!/usr/bin/env bash
# Contra Web Port — local launcher. Serves the folder over HTTP (required for the
# WASM emulator's fetch calls) and opens the default browser at the cabinet page.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8647}"
URL="http://127.0.0.1:${PORT}/index.html"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to serve the files." >&2
  exit 1
fi

# If a copy from a previous run still holds the port, try to free it.
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi

# Open the page once the server is accepting connections.
(sleep 1.2 && xdg-open "$URL" >/dev/null 2>&1 || true) &

chmod +x serve.py 2>/dev/null || true
echo "CONTRA web port serving: ${URL}  (Ctrl-C to stop)"
exec python3 serve.py "${PORT}"
