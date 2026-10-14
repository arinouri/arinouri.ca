// Cloudflare Worker: relays live ADS-B aircraft near Ottawa to arinouri.ca.
// The free feeds block direct browser requests, so the site calls this instead.
// Responses are edge-cached for 10 s, so upstream is hit at most ~6x/minute.

const UPSTREAMS = [
  'https://api.adsb.lol/v2/point/45.40/-75.70/60',
  'https://opendata.adsb.fi/api/v2/lat/45.40/lon/-75.70/dist/60',
];
const ALLOWED_ORIGINS = ['https://arinouri.ca', 'https://www.arinouri.ca', 'http://localhost:8123'];

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const cache = caches.default;
    const key = new Request('https://planes-relay.internal/ottawa');
    const hit = await cache.match(key);
    if (hit) return withHeaders(hit, cors);

    for (const url of UPSTREAMS) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'arinouri.ca planes relay' } });
        if (!r.ok) continue;
        // adsb.fi names the list "aircraft"; normalise to "ac"
        const body = (await r.text()).replace('"aircraft":', '"ac":');
        const res = new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10' } });
        ctx.waitUntil(cache.put(key, res.clone()));
        return withHeaders(res, cors);
      } catch (e) { /* try next upstream */ }
    }
    return new Response(JSON.stringify({ ac: [], error: 'upstream unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json', ...cors } });
  },
};

function withHeaders(res, extra) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}
