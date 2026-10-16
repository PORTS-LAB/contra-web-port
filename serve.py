#!/usr/bin/env python3
# Contra Web Port — static server. Adds Cache-Control: no-store so the emulator
# bundle, cores and ROM are never served stale after an update. Usage: ./serve.py [port]
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
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
