const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

/* ---------- Config ---------- */
// Live aircraft come through a relay (the free ADS-B feeds block direct browser calls).
// Local preview: tools/dev_server.py. Production: the Cloudflare Worker in worker/.
const PLANES_URL = isLocal ? '/api/planes' : null; // set to the Worker URL once deployed
// Real congestion: free TomTom key (restrict it to arinouri.ca in their dashboard). Empty = animated FX.
const TOMTOM_KEY = '';
const OTT = 'https://traffic.ottawa.ca/service';
const camImage = id => `https://traffic.ottawa.ca/camera?id=${id}&t=${Date.now()}`;

/* ---------- Clock ---------- */
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const tick = () => { $('#clock').textContent = fmt.format(new Date()); };
tick(); setInterval(tick, 1000);
$('#year').textContent = new Date().getFullYear();

/* ---------- Map style: holographic blue on black ---------- */
const SRC = 'openmaptiles';
const MAJOR = ['motorway', 'trunk', 'primary'];
const style = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { [SRC]: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#000' } },
    { id: 'park', type: 'fill', source: SRC, 'source-layer': 'park', paint: { 'fill-color': '#06102a', 'fill-opacity': .6 } },
    { id: 'water', type: 'fill', source: SRC, 'source-layer': 'water', paint: { 'fill-color': '#020817' } },
    { id: 'water-edge', type: 'line', source: SRC, 'source-layer': 'water', paint: { 'line-color': '#3a5bff', 'line-opacity': .5, 'line-width': 1.1 } },
    { id: 'aeroway', type: 'line', source: SRC, 'source-layer': 'aeroway', filter: ['==', ['get', 'class'], 'runway'],
      paint: { 'line-color': '#5fe1ff', 'line-opacity': .45, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 15, 14] } },
    { id: 'roads-minor', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary', 'secondary']]],
      paint: { 'line-color': '#1b2a7a', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, .3, 15, .8], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, .4, 16, 2] } },
    { id: 'roads-glow', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      paint: { 'line-color': '#3a5bff', 'line-opacity': .35, 'line-blur': 6, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 18] } },
    { id: 'roads-major', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      paint: { 'line-color': '#5a78ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, .8, 16, 3] } },
    { id: 'flow', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      paint: { 'line-color': '#bff4ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 3], 'line-opacity': .85, 'line-dasharray': [0, 4, 3] } },
    { id: 'buildings', type: 'fill-extrusion', source: SRC, 'source-layer': 'building', minzoom: 12,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 5], 0, '#0a1238', 30, '#1d2f9c', 90, '#4d6bff', 200, '#a9b8ff'],
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 5],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': .62,
        'fill-extrusion-vertical-gradient': true
      } },
    { id: 'place-labels', type: 'symbol', source: SRC, 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
      layout: { 'text-field': ['upcase', ['coalesce', ['get', 'name:en'], ['get', 'name']]], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 15, 12], 'text-letter-spacing': .25 },
      paint: { 'text-color': '#8fa2ff', 'text-opacity': .7, 'text-halo-color': '#000', 'text-halo-width': 1.5 } }
  ]
};

const OTTAWA_BOUNDS = [[-76.45, 44.90], [-75.15, 45.60]];
const VIEWS = {
  space: { center: [-75.6972, 45.4215], zoom: 3.6, pitch: 0, bearing: 0 },
  wide: { center: [-75.72, 45.30], zoom: 9.6, pitch: 45, bearing: -12 },
  downtown: { center: [-75.6972, 45.4215], zoom: 14.7, pitch: 64, bearing: -28 },
  yow: { center: [-75.6692, 45.3225], zoom: 13.2, pitch: 58, bearing: 24 }
};

const map = new maplibregl.Map({
  container: 'map', style, ...(reduced ? VIEWS.downtown : VIEWS.space), maxPitch: 78, antialias: true,
  cooperativeGestures: true, attributionControl: { compact: true },
  locale: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + scroll to zoom the map',
    'CooperativeGesturesHandler.MacHelpText': '⌘ + scroll to zoom the map',
    'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map'
  }
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

/* ---------- Ottawa-only mask ---------- */
let boundary = null;
function insideOttawa([x, y]) {
  if (!boundary) return false;
  let inside = false;
  for (const ring of boundary) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
async function addMask() {
  const geo = await (await fetch('data/ottawa-boundary.json')).json();
  const g = geo.features[0].geometry;
  boundary = g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
  const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  map.addSource('ottawa', { type: 'geojson', data: geo });
  map.addSource('mask', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [world, ...boundary.map(r => [...r].reverse())] } } });
  map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#000', 'fill-opacity': .93 } }, 'place-labels');
  map.addLayer({ id: 'edge-glow', type: 'line', source: 'ottawa', paint: { 'line-color': '#4d6bff', 'line-width': 8, 'line-blur': 8, 'line-opacity': .45 } }, 'place-labels');
  map.addLayer({ id: 'edge', type: 'line', source: 'ottawa', paint: { 'line-color': '#8fa2ff', 'line-width': 1.2, 'line-dasharray': [4, 2] } }, 'place-labels');
}

function addTomTom() {
  if (!TOMTOM_KEY) return;
  map.addSource('tomtom', { type: 'raster', tileSize: 256, tiles: [`https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/{z}/{x}/{y}.png?key=${TOMTOM_KEY}&tileSize=256`] });
  map.addLayer({ id: 'tomtom', type: 'raster', source: 'tomtom', paint: { 'raster-opacity': .9 } }, 'buildings');
  map.setLayoutProperty('flow', 'visibility', 'none');
  $('#flowSrc').textContent = 'LIVE';
}

/* ---------- Data state ---------- */
let cams = [], incidents = [], enforce = [], planes = new Map();
let activeCam = null, hoverCam = null, you = null;
const layersOn = { planes: true, cams: true, incidents: true, enforce: false };

/* ---------- Icons ---------- */
const svgIcon = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const PLANE_ICON = svgIcon('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="#fff" d="M32 2l5 20 21 12v6l-21-6-2 16 7 6v4l-10-3-10 3v-4l7-6-2-16-21 6v-6l21-12z"/></svg>');
const CAM_ICON = svgIcon('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="10" fill="#000" fill-opacity=".001" stroke="#fff" stroke-width="4"/><rect x="13" y="22" width="27" height="20" rx="3" fill="#fff"/><path d="M42 27l10-6v22l-10-6z" fill="#fff"/></svg>');
const ENF_ICON = svgIcon('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 4l28 28-28 28L4 32z" fill="#000" fill-opacity=".001" stroke="#fff" stroke-width="5"/><circle cx="32" cy="32" r="9" fill="#fff"/></svg>');

/* ---------- Deck.gl overlay ---------- */
const ALT_SCALE = .22;
const overlay = new deck.MapboxOverlay({ interleaved: false, layers: [], pickingRadius: 8, getTooltip });
map.addControl(overlay);

function planePos(p, now) {
  const dt = (now - p.t0) / 1000;
  const d = (p.gs || 0) * .5144 * Math.min(dt, 30);
  const tr = (p.track || 0) * Math.PI / 180;
  return [p.lon + (d * Math.sin(tr)) / (111320 * Math.cos(p.lat * Math.PI / 180)), p.lat + (d * Math.cos(tr)) / 111320, p.altM];
}

function buildLayers(now) {
  const pulse = (Math.sin(now / 300) + 1) / 2;
  const list = [...planes.values()].map(p => ({ ...p, pos: planePos(p, now) }));
  const camColor = c => c === activeCam ? [255, 255, 255, 255] : c.mto ? [143, 162, 255, 235] : [95, 225, 255, 235];
  return [
    you && new deck.ScatterplotLayer({
      id: 'you', data: [you], getPosition: d => d, getRadius: 250 + pulse * 350, filled: false, stroked: true,
      getLineColor: [93, 255, 168, 200 - pulse * 160], lineWidthMinPixels: 1.5, updateTriggers: { getRadius: pulse, getLineColor: pulse }
    }),
    new deck.ScatterplotLayer({
      id: 'cam-ground', data: cams, visible: layersOn.cams,
      getPosition: c => [c.longitude, c.latitude, 0], getRadius: 18, radiusMinPixels: 1.5,
      getFillColor: c => c.mto ? [143, 162, 255, 120] : [95, 225, 255, 120], stroked: false
    }),
    activeCam && new deck.ScatterplotLayer({
      id: 'cam-active', data: [activeCam], getPosition: c => [c.longitude, c.latitude, 0],
      getRadius: 30 + pulse * 60, filled: false, stroked: true, getLineColor: [255, 255, 255, 230 - pulse * 180], lineWidthMinPixels: 1.5,
      updateTriggers: { getRadius: pulse, getLineColor: pulse }
    }),
    new deck.IconLayer({
      id: 'cams', data: cams, visible: layersOn.cams, pickable: true, billboard: true,
      getIcon: () => ({ url: CAM_ICON, width: 64, height: 64, mask: true }),
      getPosition: c => [c.longitude, c.latitude, 0], getSize: c => c === activeCam || c === hoverCam ? 30 : 19, sizeUnits: 'pixels',
      getColor: camColor, onClick: ({ object }) => object && openCam(object),
      onHover: ({ object }) => { hoverCam = object || null; map.getCanvas().style.cursor = object ? 'pointer' : ''; },
      updateTriggers: { getSize: [activeCam, hoverCam], getColor: activeCam }
    }),
    new deck.IconLayer({
      id: 'enforce', data: enforce, visible: layersOn.enforce, pickable: true,
      getIcon: () => ({ url: ENF_ICON, width: 64, height: 64, mask: true }),
      getPosition: e => e.pos, getSize: 16, sizeUnits: 'pixels', getColor: [211, 107, 255, 230]
    }),
    new deck.ScatterplotLayer({
      id: 'incident-rings', data: incidents, visible: layersOn.incidents,
      getPosition: e => e.pos, getRadius: 50 + pulse * 70, radiusMinPixels: 4,
      filled: false, stroked: true, getLineColor: e => e.closure ? [255, 77, 94, 190 - pulse * 150] : [255, 181, 71, 190 - pulse * 150],
      lineWidthMinPixels: 1.2, updateTriggers: { getRadius: pulse, getLineColor: pulse }
    }),
    new deck.ScatterplotLayer({
      id: 'incidents', data: incidents, visible: layersOn.incidents, pickable: true,
      getPosition: e => e.pos, getRadius: 14, radiusMinPixels: 3, radiusMaxPixels: 6,
      getFillColor: e => e.closure ? [255, 77, 94, 255] : [255, 181, 71, 255]
    }),
    new deck.PathLayer({
      id: 'plane-trails', data: list, visible: layersOn.planes,
      getPath: p => [...p.trail, p.pos], getColor: p => p.mil ? [255, 77, 94, 140] : [255, 181, 71, 120],
      getWidth: 2, widthMinPixels: 1.5, updateTriggers: { getPath: now }
    }),
    new deck.LineLayer({
      id: 'plane-drops', data: list, visible: layersOn.planes,
      getSourcePosition: p => [p.pos[0], p.pos[1], 0], getTargetPosition: p => p.pos,
      getColor: [255, 181, 71, 45], getWidth: 1, updateTriggers: { getSourcePosition: now, getTargetPosition: now }
    }),
    new deck.IconLayer({
      id: 'planes', data: list, visible: layersOn.planes, pickable: true, billboard: false,
      getIcon: () => ({ url: PLANE_ICON, width: 64, height: 64, mask: true }),
      getPosition: p => p.pos, getAngle: p => -(p.track || 0), getSize: 30, sizeMinPixels: 14, sizeMaxPixels: 34, sizeUnits: 'meters', sizeScale: 18,
      getColor: p => p.emergency ? [255, 77, 94, 255] : p.mil ? [255, 120, 130, 255] : [255, 201, 110, 255],
      updateTriggers: { getPosition: now }
    }),
    new deck.TextLayer({
      id: 'plane-labels', data: list, visible: layersOn.planes,
      getPosition: p => p.pos, getText: p => `${p.call}  ${p.altFt === 'GND' ? 'GND' : 'FL' + String(Math.round(p.altFt / 100)).padStart(3, '0')}`,
      getSize: 11, getColor: [255, 224, 170, 230], getPixelOffset: [14, -14], getTextAnchor: 'start',
      fontFamily: 'Space Mono, monospace', characterSet: 'auto', outlineWidth: 3, outlineColor: [0, 0, 0, 255], fontSettings: { sdf: true },
      updateTriggers: { getPosition: now }
    })
  ].filter(Boolean);
}

function getTooltip({ object, layer }) {
  if (!object || !layer) return null;
  const box = html => ({ html, style: { background: '#000', border: '1px solid rgba(255,255,255,.3)', color: '#fff', font: '11px/1.5 Space Mono, monospace', padding: '8px 10px', letterSpacing: '.04em' } });
  if (layer.id === 'planes') return box(`<b style="color:${object.mil ? '#ff7882' : '#ffc96e'}">${object.call}</b> ${object.mil ? '· MILITARY' : ''}<br>${object.type || 'UNKNOWN TYPE'}<br>ALT ${object.altFt === 'GND' ? 'GROUND' : object.altFt.toLocaleString() + ' FT'} · ${Math.round(object.gs || 0)} KT<br>HDG ${Math.round(object.track || 0)}° · SQK ${object.squawk || '—'}`);
  if (layer.id === 'cams') return box(`<b style="color:#5fe1ff">${object.mto ? 'MTO' : 'CITY'} CAM ${object.camera_number}</b><br>${object.name}<br><span style="opacity:.6">CLICK FOR LIVE FEED</span>`);
  if (layer.id === 'incidents') return box(`<b style="color:${object.closure ? '#ff4d5e' : '#ffb547'}">${object.type}</b><br>${object.headline}`);
  if (layer.id === 'enforce') return box(`<b style="color:#d36bff">${object.kind}</b><br>${object.name}`);
  return null;
}

/* ---------- Feeds ---------- */
async function loadCams() {
  try {
    const d = await (await fetch(`${OTT}/camera`)).json();
    cams = d.cameras.filter(c => c.latitude && c.longitude).map(c => ({ ...c, mto: c.cameraOwner === 'MTO', name: c.name.replace(/^\(MTO\)\s*/, '') }));
    $('#nCams').textContent = cams.length;
  } catch (e) { $('#nCams').textContent = 'ERR'; }
}

async function loadIncidents() {
  try {
    const d = await (await fetch(`${OTT}/events`)).json();
    incidents = d.events.filter(e => e.status === 'ACTIVE' && e.geodata).map(e => {
      let c = JSON.parse(e.geodata.coordinates || 'null') || [];
      while (Array.isArray(c[0])) c = c[0];
      return { pos: c, type: e.eventType.replace(/_/g, ' '), headline: e.headline || e.mainStreet, closure: /closed/i.test(e.lanes || '') || /CLOSURE/.test(e.eventType) };
    }).filter(e => Number.isFinite(e.pos[0]) && Number.isFinite(e.pos[1]));
    $('#nInc').textContent = incidents.length;
  } catch (e) { $('#nInc').textContent = 'ERR'; }
}

async function loadEnforcement() {
  try {
    const [rl, ase] = await Promise.all(['red_light_camera', 'ase_camera'].map(s => fetch(`${OTT}/${s}?format=geojson`).then(r => r.json())));
    enforce = [
      ...rl.features.map(f => ({ pos: f.geometry.coordinates, kind: 'RED-LIGHT CAMERA', name: `${f.properties.location} · ${f.properties.direction}` })),
      ...ase.features.map(f => ({ pos: f.geometry.coordinates, kind: 'SPEED CAMERA (ASE)', name: f.properties.name }))
    ];
    $('#nEnf').textContent = enforce.length;
  } catch (e) { $('#nEnf').textContent = 'ERR'; }
}

async function loadPlanes() {
  if (!PLANES_URL) { $('#nPlanes').textContent = 'RELAY'; return; }
  try {
    const r = await fetch(PLANES_URL);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    const now = performance.now(), seen = new Set();
    (d.ac || []).forEach(a => {
      if (a.lat == null || a.lon == null) return;
      seen.add(a.hex);
      const prev = planes.get(a.hex);
      const altFt = a.alt_baro === 'ground' ? 'GND' : (a.alt_baro || a.alt_geom || 0);
      const altM = altFt === 'GND' ? 20 : Math.max(150, altFt * .3048 * ALT_SCALE);
      planes.set(a.hex, {
        hex: a.hex, call: (a.flight || a.r || a.hex).trim().toUpperCase(), type: a.desc || a.t, lat: a.lat, lon: a.lon,
        gs: a.gs, track: a.track ?? a.true_heading, altFt, altM, t0: now, squawk: a.squawk,
        trail: prev ? [...prev.trail, planePos(prev, now)].slice(-12) : [],
        mil: Boolean(a.dbFlags & 1), emergency: ['7500', '7600', '7700'].includes(a.squawk) || (a.emergency && a.emergency !== 'none')
      });
    });
    [...planes.keys()].forEach(k => { if (!seen.has(k)) planes.delete(k); });
    $('#nPlanes').textContent = planes.size;
  } catch (e) { if (!planes.size) $('#nPlanes').textContent = 'WAIT'; }
}

async function locateVisitor() {
  // Approximate (city-level) location from IP; only used to pick the opening view. Never stored or sent elsewhere.
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 2500);
    const g = await (await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: ctl.signal })).json();
    const pt = [Math.round(+g.longitude * 100) / 100, Math.round(+g.latitude * 100) / 100];
    if (insideOttawa(pt)) return pt;
  } catch (e) { /* fall through to downtown */ }
  return null;
}

function sitrep() {
  const list = [...planes.values()];
  const mil = list.filter(p => p.mil).length, emg = list.filter(p => p.emergency);
  const top = list.filter(p => p.altFt !== 'GND').reduce((m, p) => Math.max(m, p.altFt), 0);
  const closures = incidents.filter(e => e.closure).length;
  const parts = [
    PLANES_URL ? `${list.length} AIRCRAFT IN SECTOR${mil ? ` (${mil} MIL)` : ''}${top ? ` · CEILING FL${String(Math.round(top / 100)).padStart(3, '0')}` : ''}` : 'AIR PICTURE: RELAY PENDING',
    emg.length ? `⚠ EMERGENCY SQUAWK: ${emg.map(p => p.call + ' ' + p.squawk).join(', ')}` : 'NO EMERGENCY SQUAWKS',
    `${cams.length} TRAFFIC CAMS ONLINE`,
    `${incidents.length} ROAD EVENTS · ${closures} CLOSURES`
  ];
  if (you) parts.push('VIEW CENTRED ON YOUR APPROX. AREA');
  const el = $('#sitrep');
  el.textContent = parts.join('  ·  ');
  el.style.color = emg.length ? 'var(--red)' : '';
}

/* ---------- Camera panel ---------- */
let camTimer;
const panel = $('#camPanel');
const dist = (a, b) => Math.hypot(a.longitude - b.longitude, (a.latitude - b.latitude) * 1.4);
function openCam(c, fly = true) {
  activeCam = c;
  panel.hidden = false;
  $('#camTitle').textContent = `${c.mto ? 'MTO' : 'CITY'} CAM ${c.camera_number}`;
  $('#camName').textContent = c.name;
  const refresh = () => { $('#camImg').src = camImage(c.id); $('#camTime').textContent = fmt.format(new Date()); };
  refresh(); clearInterval(camTimer); camTimer = setInterval(refresh, 5000);
  stopOrbit();
  if (fly) map.easeTo({ center: [c.longitude, c.latitude], zoom: Math.max(map.getZoom(), 15.8), pitch: 60, duration: 1400 });
}
function closeCam() {
  panel.hidden = true; activeCam = null; clearInterval(camTimer); setExpanded(false);
}
function stepCam(dir) {
  if (!activeCam) return;
  const near = cams.filter(c => c !== activeCam).sort((a, b) => dist(a, activeCam) - dist(b, activeCam)).slice(0, 8);
  // walk around the neighbourhood: next = nearest, prev = second nearest going the other way
  openCam(dir > 0 ? near[0] : near[1] || near[0], !panel.classList.contains('expanded'));
}
let backdrop;
function setExpanded(on) {
  panel.classList.toggle('expanded', on);
  $('#camExpand').textContent = on ? '⤡' : '⤢';
  $('#camExpand').setAttribute('aria-label', on ? 'Shrink camera' : 'Enlarge camera');
  if (on && !backdrop) { backdrop = document.createElement('div'); backdrop.className = 'cam-backdrop'; backdrop.onclick = () => setExpanded(false); document.body.appendChild(backdrop); document.body.appendChild(panel); }
  if (!on && backdrop) { backdrop.remove(); backdrop = null; $('.hero').appendChild(panel); }
  document.body.classList.toggle('locked', on);
}
$('#camClose').addEventListener('click', closeCam);
$('#camExpand').addEventListener('click', () => setExpanded(!panel.classList.contains('expanded')));
$('#camNext').addEventListener('click', () => stepCam(1));
$('#camPrev').addEventListener('click', () => stepCam(-1));
$('#camImg').addEventListener('click', () => setExpanded(!panel.classList.contains('expanded')));

/* ---------- CCTV wall ---------- */
let wallTimer, wallCams = [];
function fillWall(shuffle) {
  const c = map.getCenter(), ref = { longitude: c.lng, latitude: c.lat };
  const pool = cams.filter(x => !x.mto).sort((a, b) => dist(a, ref) - dist(b, ref)).slice(0, shuffle ? 60 : 9);
  if (shuffle) pool.sort(() => Math.random() - .5);
  wallCams = pool.slice(0, 9);
  $('#cctvGrid').innerHTML = wallCams.map((x, i) => `<button class="cctv-cell" data-i="${i}" aria-label="Open ${x.name}"><img alt="" src="${camImage(x.id)}"><b>● REC</b><span>CAM ${x.camera_number} · ${x.name}</span></button>`).join('');
}
function openWall() {
  fillWall(false); $('#cctv').hidden = false; document.body.classList.add('locked');
  clearInterval(wallTimer);
  wallTimer = setInterval(() => $$('.cctv-cell img').forEach((img, i) => { img.src = camImage(wallCams[i].id); }), 8000);
}
function closeWall() { $('#cctv').hidden = true; clearInterval(wallTimer); document.body.classList.remove('locked'); }
$('#cctvOpen').addEventListener('click', openWall);
$('#cctvClose').addEventListener('click', closeWall);
$('#cctvShuffle').addEventListener('click', () => fillWall(true));
$('#cctvGrid').addEventListener('click', e => {
  const cell = e.target.closest('.cctv-cell'); if (!cell) return;
  closeWall(); openCam(wallCams[+cell.dataset.i]); setExpanded(true);
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#cctv').hidden) closeWall();
  else if (panel.classList.contains('expanded')) setExpanded(false);
  else if (!panel.hidden) closeCam();
});

/* ---------- Controls ---------- */
$$('.layer').forEach(btn => btn.addEventListener('click', () => {
  const k = btn.dataset.layer, on = !btn.classList.contains('on');
  btn.classList.toggle('on', on);
  if (k in layersOn) layersOn[k] = on;
  else if (k === 'flow') ['flow', 'roads-glow', 'tomtom'].forEach(id => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
  else map.setLayoutProperty(k, 'visibility', on ? 'visible' : 'none');
  if (!reduced) return;
  overlay.setProps({ layers: buildLayers(performance.now()) });
}));

let orbiting = false;
const orbitBtn = $('#orbit');
function stopOrbit() { orbiting = false; orbitBtn.setAttribute('aria-pressed', 'false'); }
orbitBtn.addEventListener('click', () => { orbiting = !orbiting; orbitBtn.setAttribute('aria-pressed', String(orbiting)); });
['mousedown', 'touchstart', 'wheel'].forEach(ev => map.getCanvasContainer().addEventListener(ev, stopOrbit, { passive: true }));
$$('[data-fly]').forEach(b => b.addEventListener('click', () => map.flyTo({ ...VIEWS[b.dataset.fly], duration: reduced ? 0 : 2600, essential: true })));

map.on('move', () => {
  const c = map.getCenter();
  $('#coords').textContent = `${c.lat.toFixed(4)}N ${Math.abs(c.lng).toFixed(4)}W`;
});

/* ---------- Loop ---------- */
const DASH = [[0, 4, 3], [.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, .5], [3, 4, 0], [0, .5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, .5]];
let dashStep = -1, lastFrame = 0;
function frame(t) {
  if (t - lastFrame > 33 && !document.hidden) {
    lastFrame = t;
    overlay.setProps({ layers: buildLayers(t) });
    const step = Math.floor(t / 70) % DASH.length;
    if (step !== dashStep && map.getLayer('flow')) { dashStep = step; map.setPaintProperty('flow', 'line-dasharray', DASH[step]); }
    if (orbiting && !map.isMoving()) map.setBearing(map.getBearing() + .04);
  }
  requestAnimationFrame(frame);
}

/* ---------- Intro: space → Ottawa → your area (or downtown) ---------- */
function intro(target) {
  const land = () => { map.setMaxBounds(OTTAWA_BOUNDS); map.setMinZoom(9); orbiting = !reduced; orbitBtn.setAttribute('aria-pressed', String(orbiting)); };
  if (reduced) { map.jumpTo(target); land(); return; }
  map.flyTo({ ...VIEWS.wide, duration: 3200, curve: 1.6, essential: true });
  map.once('moveend', () => { map.flyTo({ ...target, duration: 3600, curve: 1.3, essential: true }); map.once('moveend', land); });
}

map.on('load', async () => {
  const where = locateVisitor();
  await addMask().catch(() => {});
  addTomTom();
  Promise.all([loadCams(), loadIncidents(), loadPlanes(), loadEnforcement()]).then(sitrep);
  setInterval(() => loadPlanes().then(sitrep), 10000);
  setInterval(() => loadIncidents().then(sitrep), 120000);
  const pt = await where;
  if (pt) you = pt;
  intro(pt ? { center: pt, zoom: 14.2, pitch: 62, bearing: -20 } : VIEWS.downtown);
  if (reduced) setTimeout(() => overlay.setProps({ layers: buildLayers(performance.now()) }), 800);
  else requestAnimationFrame(frame);
});
