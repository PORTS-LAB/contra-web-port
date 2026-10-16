#!/usr/bin/env python3
# Contra Web Port — static server. Adds Cache-Control: no-store so the emulator
# bundle, cores and ROM are never served stale after an update.
# Usage: ./serve.py [port] [host]   (host defaults to 127.0.0.1; 0.0.0.0 = LAN)
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write(fmt % args + "\n")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8647
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    ThreadingHTTPServer((host, port), Handler).serve_forever()
