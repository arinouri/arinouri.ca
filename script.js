const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Live aircraft come from a relay (adsb.lol blocks direct browser calls).
// Local preview: tools/dev_server.py serves /api/planes. Production: set to the Cloudflare Worker URL.
const PLANES_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '/api/planes' : null;
const CAMS_URL = 'https://traffic.ottawa.ca/service/camera';
const EVENTS_URL = 'https://traffic.ottawa.ca/service/events';
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
    { id: 'water-edge', type: 'line', source: SRC, 'source-layer': 'water', paint: { 'line-color': '#3a5bff', 'line-opacity': .55, 'line-width': 1.2 } },
    { id: 'aeroway', type: 'line', source: SRC, 'source-layer': 'aeroway', filter: ['==', ['get', 'class'], 'runway'],
      paint: { 'line-color': '#5fe1ff', 'line-opacity': .5, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 15, 14] } },
    { id: 'roads-minor', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary', 'secondary']]],
      paint: { 'line-color': '#1b2a7a', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, .3, 15, .8], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, .4, 16, 2] } },
    { id: 'roads-glow', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      paint: { 'line-color': '#3a5bff', 'line-opacity': .35, 'line-blur': 6, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 18] } },
    { id: 'roads-major', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      paint: { 'line-color': '#5a78ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, .8, 16, 3] } },
    { id: 'flow', type: 'line', source: SRC, 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      layout: { 'line-cap': 'butt' },
      paint: { 'line-color': '#bff4ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 3], 'line-opacity': .9, 'line-dasharray': [0, 4, 3] } },
    { id: 'buildings', type: 'fill-extrusion', source: SRC, 'source-layer': 'building', minzoom: 12,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 5], 0, '#0a1238', 30, '#1d2f9c', 90, '#4d6bff', 200, '#a9b8ff'],
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 5],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': .62,
        'fill-extrusion-vertical-gradient': true
      } },
    { id: 'place-labels', type: 'symbol', source: SRC, 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'suburb', 'neighbourhood']]],
      layout: { 'text-field': ['upcase', ['coalesce', ['get', 'name:en'], ['get', 'name']]], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 15, 12], 'text-letter-spacing': .25 },
      paint: { 'text-color': '#8fa2ff', 'text-opacity': .75, 'text-halo-color': '#000', 'text-halo-width': 1.5 } }
  ]
};

const VIEWS = {
  wide: { center: [-75.70, 45.385], zoom: 10.7, pitch: 50, bearing: -12 },
  downtown: { center: [-75.6972, 45.4215], zoom: 14.7, pitch: 64, bearing: -28 },
  yow: { center: [-75.6692, 45.3225], zoom: 13.2, pitch: 58, bearing: 24 }
};

const map = new maplibregl.Map({
  container: 'map', style, ...VIEWS.wide, maxPitch: 78, antialias: true,
  cooperativeGestures: true, attributionControl: { compact: true },
  locale: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + scroll to zoom the map',
    'CooperativeGesturesHandler.MacHelpText': '⌘ + scroll to zoom the map',
    'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map'
  }
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

/* ---------- Data state ---------- */
let cams = [], incidents = [], planes = new Map();
const layersOn = { planes: true, cams: true, incidents: true };

/* ---------- Deck.gl overlay ---------- */
const PLANE_ICON = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="#fff" d="M32 2l5 20 21 12v6l-21-6-2 16 7 6v4l-10-3-10 3v-4l7-6-2-16-21 6v-6l21-12z"/></svg>');
const ALT_SCALE = .22; // exaggerate less than real so planes stay in frame
const overlay = new deck.MapboxOverlay({ interleaved: false, layers: [], pickingRadius: 10, getTooltip });
map.addControl(overlay);

function planePos(p, now) {
  const dt = (now - p.t0) / 1000;
  const d = (p.gs || 0) * .5144 * Math.min(dt, 30);
  const tr = (p.track || 0) * Math.PI / 180;
  const lat = p.lat + (d * Math.cos(tr)) / 111320;
  const lon = p.lon + (d * Math.sin(tr)) / (111320 * Math.cos(p.lat * Math.PI / 180));
  return [lon, lat, p.altM];
}

function buildLayers(now) {
  const pulse = (Math.sin(now / 300) + 1) / 2;
  const list = [...planes.values()].map(p => ({ ...p, pos: planePos(p, now) }));
  return [
    new deck.LineLayer({
      id: 'cam-beams', data: cams, visible: layersOn.cams,
      getSourcePosition: c => [c.longitude, c.latitude, 0], getTargetPosition: c => [c.longitude, c.latitude, 70],
      getColor: [95, 225, 255, 150], getWidth: 1.5
    }),
    new deck.ScatterplotLayer({
      id: 'cams', data: cams, visible: layersOn.cams, pickable: true,
      getPosition: c => [c.longitude, c.latitude, 70], getRadius: 14, radiusMinPixels: 3, radiusMaxPixels: 7,
      getFillColor: [95, 225, 255, 230], stroked: true, getLineColor: [0, 0, 0, 255], lineWidthMinPixels: 1,
      onClick: ({ object }) => object && openCam(object)
    }),
    new deck.ScatterplotLayer({
      id: 'incident-rings', data: incidents, visible: layersOn.incidents,
      getPosition: e => e.pos, getRadius: 60 + pulse * 90, radiusMinPixels: 4,
      filled: false, stroked: true, getLineColor: e => e.closure ? [255, 77, 94, 200 - pulse * 150] : [255, 181, 71, 200 - pulse * 150],
      lineWidthMinPixels: 1.5, updateTriggers: { getRadius: pulse, getLineColor: pulse }
    }),
    new deck.LineLayer({
      id: 'incident-beams', data: incidents, visible: layersOn.incidents,
      getSourcePosition: e => [e.pos[0], e.pos[1], 0], getTargetPosition: e => [e.pos[0], e.pos[1], 140],
      getColor: e => e.closure ? [255, 77, 94, 220] : [255, 181, 71, 200], getWidth: 2
    }),
    new deck.ScatterplotLayer({
      id: 'incidents', data: incidents, visible: layersOn.incidents, pickable: true,
      getPosition: e => [e.pos[0], e.pos[1], 140], getRadius: 18, radiusMinPixels: 3, radiusMaxPixels: 7,
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
  ];
}

function getTooltip({ object, layer }) {
  if (!object) return null;
  const box = html => ({ html, style: { background: '#000', border: '1px solid rgba(255,255,255,.3)', color: '#fff', font: '11px/1.5 Space Mono, monospace', padding: '8px 10px', letterSpacing: '.04em' } });
  if (layer.id === 'planes') {
    return box(`<b style="color:${object.mil ? '#ff7882' : '#ffc96e'}">${object.call}</b> ${object.mil ? '· MILITARY' : ''}<br>${object.type || 'UNKNOWN TYPE'}<br>ALT ${object.altFt === 'GND' ? 'GROUND' : object.altFt.toLocaleString() + ' FT'} · ${Math.round(object.gs || 0)} KT<br>HDG ${Math.round(object.track || 0)}° · SQK ${object.squawk || '—'}`);
  }
  if (layer.id === 'cams') return box(`<b style="color:#5fe1ff">CAM ${object.camera_number}</b><br>${object.name}<br><span style="opacity:.6">CLICK FOR LIVE FEED</span>`);
  if (layer.id === 'incidents') return box(`<b style="color:${object.closure ? '#ff4d5e' : '#ffb547'}">${object.type}</b><br>${object.headline}`);
  return null;
}

/* ---------- Feeds ---------- */
async function loadCams() {
  try {
    const d = await (await fetch(CAMS_URL)).json();
    cams = d.cameras.filter(c => c.latitude && c.longitude);
    $('#nCams').textContent = cams.length;
  } catch (e) { $('#nCams').textContent = 'ERR'; }
}

async function loadIncidents() {
  try {
    const d = await (await fetch(EVENTS_URL)).json();
    incidents = d.events.filter(e => e.status === 'ACTIVE' && e.geodata).map(e => {
      let c = JSON.parse(e.geodata.coordinates || 'null') || [];
      while (Array.isArray(c[0])) c = c[0];
      return { pos: c, type: e.eventType.replace(/_/g, ' '), headline: e.headline || e.mainStreet, closure: /closed/i.test(e.lanes || '') || /CLOSURE/.test(e.eventType) };
    }).filter(e => Number.isFinite(e.pos[0]) && Number.isFinite(e.pos[1]));
    $('#nInc').textContent = incidents.length;
  } catch (e) { $('#nInc').textContent = 'ERR'; }
}

async function loadPlanes() {
  if (!PLANES_URL) { $('#nPlanes').textContent = 'RELAY'; return; }
  try {
    const d = await (await fetch(PLANES_URL)).json();
    const now = performance.now(), seen = new Set();
    (d.ac || []).forEach(a => {
      if (a.lat == null || a.lon == null) return;
      seen.add(a.hex);
      const prev = planes.get(a.hex);
      const altFt = a.alt_baro === 'ground' ? 'GND' : (a.alt_baro || a.alt_geom || 0);
      const altM = altFt === 'GND' ? 20 : Math.max(150, altFt * .3048 * ALT_SCALE);
      const trail = prev ? [...prev.trail, planePos(prev, now)].slice(-12) : [];
      planes.set(a.hex, {
        hex: a.hex, call: (a.flight || a.r || a.hex).trim().toUpperCase(), type: a.desc || a.t, lat: a.lat, lon: a.lon,
        gs: a.gs, track: a.track ?? a.true_heading, altFt, altM, t0: now, trail, squawk: a.squawk,
        mil: Boolean(a.dbFlags & 1), emergency: ['7500', '7600', '7700'].includes(a.squawk) || (a.emergency && a.emergency !== 'none')
      });
    });
    [...planes.keys()].forEach(k => { if (!seen.has(k)) planes.delete(k); });
    $('#nPlanes').textContent = planes.size;
  } catch (e) { $('#nPlanes').textContent = 'ERR'; }
}

function sitrep() {
  const list = [...planes.values()];
  const mil = list.filter(p => p.mil).length;
  const emg = list.filter(p => p.emergency);
  const airborne = list.filter(p => p.altFt !== 'GND');
  const top = airborne.reduce((m, p) => Math.max(m, p.altFt), 0);
  const closures = incidents.filter(e => e.closure).length;
  const parts = [];
  parts.push(PLANES_URL ? `${list.length} AIRCRAFT IN SECTOR${mil ? ` (${mil} MIL)` : ''}${top ? ` · CEILING FL${String(Math.round(top / 100)).padStart(3, '0')}` : ''}` : 'AIR PICTURE: RELAY PENDING');
  parts.push(emg.length ? `⚠ EMERGENCY SQUAWK: ${emg.map(p => p.call + ' ' + p.squawk).join(', ')}` : 'NO EMERGENCY SQUAWKS');
  parts.push(`${cams.length} TRAFFIC CAMS ONLINE`);
  parts.push(`${incidents.length} ROAD EVENTS · ${closures} CLOSURES`);
  const el = $('#sitrep');
  el.textContent = parts.join('  ·  ');
  el.style.color = emg.length ? 'var(--red)' : '';
}

/* ---------- Camera panel ---------- */
let camTimer;
function openCam(c) {
  $('#camPanel').hidden = false;
  $('#camTitle').textContent = `CAM ${c.camera_number} // CITY OF OTTAWA`;
  $('#camName').textContent = c.name;
  const refresh = () => { $('#camImg').src = camImage(c.id); $('#camTime').textContent = fmt.format(new Date()); };
  refresh(); clearInterval(camTimer); camTimer = setInterval(refresh, 6000);
  stopOrbit();
  map.easeTo({ center: [c.longitude, c.latitude], zoom: Math.max(map.getZoom(), 15.5), duration: 1400 });
}
$('#camClose').addEventListener('click', () => { $('#camPanel').hidden = true; clearInterval(camTimer); });

/* ---------- Controls ---------- */
$$('.layer').forEach(btn => btn.addEventListener('click', () => {
  const k = btn.dataset.layer, on = !btn.classList.contains('on');
  btn.classList.toggle('on', on);
  if (k in layersOn) layersOn[k] = on;
  else map.setLayoutProperty(k, 'visibility', on ? 'visible' : 'none');
  if (k === 'flow') map.setLayoutProperty('roads-glow', 'visibility', on ? 'visible' : 'none');
}));

let orbiting = !reduced;
const orbitBtn = $('#orbit');
function stopOrbit() { orbiting = false; orbitBtn.setAttribute('aria-pressed', 'false'); }
orbitBtn.setAttribute('aria-pressed', String(orbiting));
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
  if (t - lastFrame > 33) {
    lastFrame = t;
    overlay.setProps({ layers: buildLayers(t) });
    const step = Math.floor(t / 70) % DASH.length;
    if (step !== dashStep && map.getLayer('flow')) { dashStep = step; map.setPaintProperty('flow', 'line-dasharray', DASH[step]); }
    if (orbiting && !map.isMoving()) map.setBearing(map.getBearing() + .04);
  }
  requestAnimationFrame(frame);
}

map.on('load', () => {
  Promise.all([loadCams(), loadIncidents(), loadPlanes()]).then(sitrep);
  setInterval(() => loadPlanes().then(sitrep), 8000);
  setInterval(() => loadIncidents().then(sitrep), 120000);
  if (reduced) { map.jumpTo(VIEWS.downtown); overlay.setProps({ layers: buildLayers(performance.now()) }); return; }
  setTimeout(() => map.flyTo({ ...VIEWS.downtown, duration: 5200, curve: 1.2, essential: true }), 900);
  requestAnimationFrame(frame);
});
