"""Local preview server for arinouri.ca.

Serves the site and relays /api/planes to adsb.lol (which blocks direct
browser requests). In production the same relay runs as a Cloudflare Worker.

    python3 tools/dev_server.py   ->  http://localhost:8123
"""
import http.server
import os
import urllib.request

PORT = 8123
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANES = "https://api.adsb.lol/v2/point/45.40/-75.70/60"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/planes"):
            try:
                req = urllib.request.Request(PLANES, headers={"User-Agent": "arinouri.ca-dev"})
                with urllib.request.urlopen(req, timeout=10) as r:
                    body = r.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:  # surface upstream failures to the page
                self.send_error(502, str(e))
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    print(f"Serving {ROOT} on http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("", PORT), Handler).serve_forever()
