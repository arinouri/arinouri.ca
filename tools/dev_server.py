"""Local preview server for arinouri.ca.

Serves the site and relays /api/planes to free ADS-B feeds (they block direct
browser requests). Responses are cached for 10 s so the upstream is hit at most
once per 10 s no matter how many tabs poll. In production the same logic runs
as the Cloudflare Worker in worker/planes-relay.js.

    python3 tools/dev_server.py   ->  http://localhost:8123
"""
import http.server
import os
import threading
import time
import urllib.request

PORT = 8123
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPSTREAMS = [
    "https://api.adsb.lol/v2/point/45.40/-75.70/60",
    "https://opendata.adsb.fi/api/v2/lat/45.40/lon/-75.70/dist/60",
]
TTL = 10
_cache = {"t": 0.0, "body": None}
_lock = threading.Lock()


def fetch_planes():
    with _lock:
        if _cache["body"] and time.time() - _cache["t"] < TTL:
            return _cache["body"]
        last_err = None
        for url in UPSTREAMS:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "arinouri.ca-dev"})
                with urllib.request.urlopen(req, timeout=8) as r:
                    body = r.read()
                # adsb.fi names the list "aircraft"; normalise to "ac"
                body = body.replace(b'"aircraft":', b'"ac":', 1)
                _cache.update(t=time.time(), body=body)
                return body
            except Exception as e:  # try the next feed
                last_err = e
        if _cache["body"]:
            return _cache["body"]
        raise last_err


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/planes"):
            try:
                body = fetch_planes()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self.send_error(502, str(e))
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print(f"Serving {ROOT} on http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("", PORT), Handler).serve_forever()
