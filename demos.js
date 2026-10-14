// Holographic project simulations. Each canvas[data-demo] gets a small animated
// scene; only canvases on screen are drawn (~30 fps).
(() => {
  const C = '#5fe1ff', B = '#4d6bff', B2 = '#8fa2ff', A = '#ffb547', R = '#ff4d5e', G = '#5dffa8', W = '#e8ecff';
  const FONT = '"Space Mono", monospace';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += Math.random(); return s - 3; };
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- drawing helpers ---------- */
  function glow(ctx, color, blur = 10) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
  function noGlow(ctx) { ctx.shadowBlur = 0; }
  function label(ctx, txt, x, y, color = B2, size = 10, align = 'left') {
    ctx.font = `${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(txt, x, y);
  }
  function backdrop(ctx, w, h, t) {
    ctx.fillStyle = '#010205'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(77,107,255,.07)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < w; x += 24) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); }
    for (let y = 0; y < h; y += 24) { ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); }
    ctx.stroke();
  }
  function overlayFx(ctx, w, h, t, title, right) {
    ctx.fillStyle = 'rgba(95,225,255,.035)';
    for (let y = (t * 40) % 4; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    const sy = (t * 60) % (h + 80) - 40;
    const g = ctx.createLinearGradient(0, sy - 40, 0, sy);
    g.addColorStop(0, 'rgba(95,225,255,0)'); g.addColorStop(1, 'rgba(95,225,255,.06)');
    ctx.fillStyle = g; ctx.fillRect(0, sy - 40, w, 40);
    label(ctx, title, 14, 22, W, 10);
    if (right) label(ctx, right, w - 14, 22, C, 10, 'right');
    ctx.strokeStyle = 'rgba(95,225,255,.5)'; ctx.lineWidth = 1;
    [[8, 8, 1, 1], [w - 8, 8, -1, 1], [8, h - 8, 1, -1], [w - 8, h - 8, -1, -1]].forEach(([x, y, sx, sy2]) => {
      ctx.beginPath(); ctx.moveTo(x, y + 12 * sy2); ctx.lineTo(x, y); ctx.lineTo(x + 12 * sx, y); ctx.stroke();
    });
  }
  // isometric projection
  const isoP = (cx, cy, s) => (x, y, z = 0) => [cx + (x - y) * .866 * s, cy + (x + y) * .5 * s - z * s];
  function poly(ctx, pts, stroke, fill) {
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function isoBox(ctx, P, x, y, z, w, d, h, stroke, alpha = .12) {
    const t = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const fl = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const fr = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
    ctx.lineWidth = 1;
    poly(ctx, fl, stroke, `rgba(77,107,255,${alpha * .7})`);
    poly(ctx, fr, stroke, `rgba(77,107,255,${alpha * .5})`);
    poly(ctx, t, stroke, `rgba(95,225,255,${alpha})`);
  }
  // ESP32 dev board, wireframe hologram
  function esp32(ctx, P, x, y, z, t, flicker = 1) {
    ctx.globalAlpha = flicker;
    glow(ctx, C, 8);
    isoBox(ctx, P, x, y, z, 10, 22, .6, C, .1);
    isoBox(ctx, P, x + 1.5, y + 2, z + .6, 7, 8, .9, B2, .18);       // RF shield
    ctx.strokeStyle = C; ctx.beginPath();                            // PCB antenna trace
    for (let i = 0; i <= 6; i++) { const [px, py] = P(x + 1.5 + i * 1.15, y + (i % 2 ? .6 : 1.6), z + .62); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    ctx.fillStyle = C;
    for (let i = 0; i < 9; i++) {                                    // header pins
      [[x + .5, y + 4 + i * 2], [x + 9.5, y + 4 + i * 2]].forEach(([px, py]) => { const [sx, sy] = P(px, py, z + .7); ctx.fillRect(sx - 1, sy - 1, 2, 2); });
    }
    const [lx, ly] = P(x + 5, y + 14, z + .7);                       // status LED
    ctx.fillStyle = (Math.sin(t * 6) > 0) ? G : 'rgba(93,255,168,.2)'; ctx.beginPath(); ctx.arc(lx, ly, 2, 0, 7); ctx.fill();
    noGlow(ctx); ctx.globalAlpha = 1;
  }

  /* ---------- scenes ---------- */
  const scenes = {
    atlas: {
      init(s) { s.cards = []; s.next = 0; s.lines = Array.from({ length: 40 }, (_, i) => ({ w: rand(.35, .95), act: i % 3 === 1 })); s.count = 112; },
      draw(ctx, w, h, t, s, dt) {
        backdrop(ctx, w, h, t);
        const lx = 18, lw = w * .38, top = 44, bottom = h - 20;
        ctx.strokeStyle = 'rgba(143,162,255,.35)'; ctx.strokeRect(lx, top, lw, bottom - top);
        label(ctx, 'MEETING TRANSCRIPT', lx + 8, top + 14, B2, 9);
        const scroll = (t * 14) % 18, scanY = top + 30 + ((t * 38) % (bottom - top - 40));
        ctx.save(); ctx.beginPath(); ctx.rect(lx, top + 20, lw, bottom - top - 22); ctx.clip();
        for (let i = 0; i < 16; i++) {
          const L = s.lines[(i + Math.floor(t * 14 / 18)) % s.lines.length], y = top + 30 + i * 18 - scroll;
          const hit = L.act && Math.abs(y - scanY) < 12;
          ctx.fillStyle = hit ? A : L.act ? 'rgba(255,181,71,.35)' : 'rgba(143,162,255,.25)';
          ctx.fillRect(lx + 10, y, (lw - 20) * L.w, 5);
        }
        ctx.restore();
        if (t > s.next) { s.next = t + 1.3; s.cards.push({ born: t, x: lx + lw * .6, y: scanY, p: ['P1', 'P2', 'P3'][Math.floor(rand(0, 3))] }); s.count++; }
        glow(ctx, C, 12); ctx.fillStyle = 'rgba(95,225,255,.9)'; ctx.fillRect(lx, scanY, lw, 1.5); noGlow(ctx);
        // AI core
        const cx = lx + lw + (w * .1), cy = h / 2;
        glow(ctx, C, 16); ctx.strokeStyle = C;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, 10 + i * 7 + Math.sin(t * 3 + i) * 2, t * (i + 1), t * (i + 1) + 4); ctx.stroke(); }
        noGlow(ctx); label(ctx, 'AI', cx, cy + 4, W, 10, 'center');
        // kanban
        const cols = ['NEW', 'IN PROGRESS', 'DONE'], kx = cx + 44, kw = (w - kx - 18) / 3;
        cols.forEach((c, i) => { ctx.strokeStyle = 'rgba(143,162,255,.25)'; ctx.strokeRect(kx + i * kw + 3, top, kw - 6, bottom - top); label(ctx, c, kx + i * kw + 10, top + 14, B2, 9); });
        s.cards = s.cards.filter(c => t - c.born < 12);
        const stacks = [0, 0, 0];
        s.cards.forEach(c => {
          const age = t - c.born, col = Math.min(2, Math.floor(age / 3.6));
          const tx = kx + col * kw + 9, ty = top + 24 + stacks[col]++ * 30;
          const e = 1 - Math.exp(-dt * 7); c.x = lerp(c.x, tx, e); c.y = lerp(c.y, ty, e);
          const cw = kw - 18;
          ctx.fillStyle = 'rgba(77,107,255,.16)'; ctx.fillRect(c.x, c.y, cw, 24);
          ctx.strokeStyle = col === 2 ? G : col === 1 ? A : C; ctx.strokeRect(c.x + .5, c.y + .5, cw, 24);
          ctx.fillStyle = W; ctx.fillRect(c.x + 6, c.y + 6, cw * .55, 3);
          label(ctx, `OPI · ${c.p}`, c.x + 6, c.y + 19, col === 2 ? G : B2, 8);
          if (col === 2) label(ctx, '✓', c.x + cw - 10, c.y + 16, G, 11);
        });
        overlayFx(ctx, w, h, t, 'ATLAS // ACTION EXTRACTION', `ACTIONS ${s.count}`);
      }
    },

    montecarlo: {
      init(s) { s.bins = new Array(48).fill(0); s.n = 0; s.drops = []; s.hold = 0; },
      draw(ctx, w, h, t, s, dt) {
        backdrop(ctx, w, h, t);
        const N = 10000, x0 = 30, x1 = w - 30, base = h - 42, top = 52, bw = (x1 - x0) / s.bins.length;
        if (s.n >= N) { if (!s.hold) s.hold = t; if (t - s.hold > 2.5) this.init(s); }
        else for (let k = 0, m = Math.ceil(dt * 2700); k < m && s.n < N; k++) {
          const v = Math.exp(gauss() * .22) * (1 + Math.max(0, gauss()) * .08);  // right-skewed cost
          const b = Math.max(0, Math.min(s.bins.length - 1, Math.floor((v - .5) / 1.3 * s.bins.length)));
          s.bins[b]++; s.n++;
          if (k % 15 === 0 && s.drops.length < 60) s.drops.push({ x: x0 + b * bw + bw / 2, y: top - 10, b });
        }
        const max = Math.max(...s.bins, 1);
        s.bins.forEach((c, i) => {
          const bh = (c / max) * (base - top - 10);
          const g = ctx.createLinearGradient(0, base - bh, 0, base);
          g.addColorStop(0, 'rgba(95,225,255,.9)'); g.addColorStop(1, 'rgba(77,107,255,.15)');
          ctx.fillStyle = g; ctx.fillRect(x0 + i * bw + 1, base - bh, bw - 2, bh);
        });
        glow(ctx, C, 8); ctx.fillStyle = W;
        s.drops = s.drops.filter(d => { d.y += 270 * dt; const bh = (s.bins[d.b] / max) * (base - top - 10); ctx.fillRect(d.x - 1, d.y, 2, 5); return d.y < base - bh; });
        noGlow(ctx);
        // percentiles
        let acc = 0; const pct = { 50: 0, 90: 0 };
        s.bins.forEach((c, i) => { const prev = acc; acc += c; [50, 90].forEach(p => { if (prev / s.n * 100 < p && acc / s.n * 100 >= p) pct[p] = i; }); });
        [[50, G], [90, A]].forEach(([p, col]) => {
          const x = x0 + pct[p] * bw + bw / 2;
          ctx.setLineDash([3, 4]); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, base); ctx.stroke(); ctx.setLineDash([]);
          label(ctx, `P${p} ${(0.5 + pct[p] / s.bins.length * 1.3).toFixed(2)}x`, x + 4, top + 10, col, 9);
        });
        ctx.strokeStyle = 'rgba(143,162,255,.4)'; ctx.beginPath(); ctx.moveTo(x0, base + .5); ctx.lineTo(x1, base + .5); ctx.stroke();
        label(ctx, 'COST INDEX →', x1, base + 16, B2, 9, 'right');
        label(ctx, `RUNS ${s.n.toLocaleString()} / 10,000`, x0, base + 16, s.n >= N ? G : W, 9);
        overlayFx(ctx, w, h, t, 'MONTE CARLO // RISK-BASED ESTIMATE', s.n >= N ? 'COMPLETE' : 'SIMULATING');
      }
    },

    mesh: {
      init(s) {
        s.nodes = [[.14, .55], [.3, .3], [.33, .76], [.5, .5], [.62, .22], [.68, .78], [.84, .42], [.9, .7]].map((p, i) => ({ p, id: 'N' + (i + 1), flash: 0, ph: rand(0, 6) }));
        s.edges = []; s.nodes.forEach((a, i) => s.nodes.forEach((b, j) => { if (j > i && Math.hypot(a.p[0] - b.p[0], (a.p[1] - b.p[1]) * .6) < .26) s.edges.push([i, j]); }));
        s.pkt = null; s.next = 0; s.sent = 0;
      },
      path(s, a, b) {
        const prev = { [a]: -1 }, q = [a];
        while (q.length) { const n = q.shift(); if (n === b) break; s.edges.forEach(([i, j]) => { const m = i === n ? j : j === n ? i : -1; if (m >= 0 && !(m in prev)) { prev[m] = n; q.push(m); } }); }
        const out = []; for (let n = b; n !== -1 && n !== undefined; n = prev[n]) out.unshift(n); return out;
      },
      draw(ctx, w, h, t, s, dt) {
        backdrop(ctx, w, h, t);
        const pos = n => [n.p[0] * w + Math.sin(t + n.ph) * 3, 30 + n.p[1] * (h - 60) + Math.cos(t * .8 + n.ph) * 3];
        s.edges.forEach(([i, j]) => {
          const [x1, y1] = pos(s.nodes[i]), [x2, y2] = pos(s.nodes[j]);
          ctx.strokeStyle = 'rgba(77,107,255,.45)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
          label(ctx, `-${55 + ((i * 7 + j * 13) % 25)}dBm`, (x1 + x2) / 2 + 4, (y1 + y2) / 2 - 4, 'rgba(143,162,255,.55)', 8);
        });
        if (!s.pkt && t > s.next) {
          let a = Math.floor(rand(0, 8)), b = Math.floor(rand(0, 8)); if (a === b) b = (b + 4) % 8;
          s.pkt = { route: this.path(s, a, b), seg: 0, k: 0 }; s.nodes[a].flash = 1; s.sent++;
        }
        if (s.pkt) {
          const r = s.pkt.route;
          if (r.length < 2) s.pkt = null;
          else {
            s.pkt.k += dt * 1.35;
            if (s.pkt.k >= 1) { s.pkt.k = 0; s.pkt.seg++; s.nodes[r[s.pkt.seg]].flash = 1; if (s.pkt.seg >= r.length - 1) { s.ack = { n: r[r.length - 1], t }; s.pkt = null; s.next = t + .8; } }
            if (s.pkt) {
              const [x1, y1] = pos(s.nodes[r[s.pkt.seg]]), [x2, y2] = pos(s.nodes[r[s.pkt.seg + 1]]);
              ctx.strokeStyle = A; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, s.pkt.k), lerp(y1, y2, s.pkt.k)); ctx.stroke(); ctx.lineWidth = 1;
              glow(ctx, A, 14); ctx.fillStyle = A; ctx.beginPath(); ctx.arc(lerp(x1, x2, s.pkt.k), lerp(y1, y2, s.pkt.k), 4, 0, 7); ctx.fill(); noGlow(ctx);
            }
          }
        }
        s.nodes.forEach(n => {
          const [x, y] = pos(n); n.flash *= Math.exp(-dt * 2.2);
          if (n.flash > .05) { ctx.strokeStyle = `rgba(255,181,71,${n.flash})`; ctx.beginPath(); ctx.arc(x, y, 14 + (1 - n.flash) * 26, 0, 7); ctx.stroke(); }
          glow(ctx, C, 10); ctx.strokeStyle = C; ctx.fillStyle = 'rgba(95,225,255,.12)';
          ctx.fillRect(x - 9, y - 7, 18, 14); ctx.strokeRect(x - 9, y - 7, 18, 14);
          ctx.fillStyle = n.flash > .3 ? A : C; ctx.fillRect(x - 4, y - 3, 8, 6); noGlow(ctx);
          label(ctx, n.id, x, y + 22, W, 9, 'center');
        });
        if (s.ack && t - s.ack.t < 1) { const [x, y] = pos(s.nodes[s.ack.n]); label(ctx, 'ACK', x, y - 14, G, 9, 'center'); }
        overlayFx(ctx, w, h, t, 'ESP32 MESH // 8 NODES', `PKTS ${s.sent}`);
      }
    },

    wireless: {
      init(s) { s.fall = []; s.peaks = [1, 6, 11]; },
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        const P = isoP(w * .2, h * .44, Math.min(w, h) / 46);
        esp32(ctx, P, -4, -9, 0, t, .85 + Math.random() * .15);
        glow(ctx, B2, 8); isoBox(ctx, P, 9, -4, 0, 6, 9, .5, B2, .12); noGlow(ctx);           // NRF24L01+
        const [ax, ay] = P(12, -4, .5), [tx, ty] = P(12, -4, 6);
        ctx.strokeStyle = B2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tx, ty); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const r = ((t * 30 + i * 22) % 88);
          ctx.strokeStyle = `rgba(95,225,255,${.7 * (1 - r / 88)})`; ctx.beginPath(); ctx.arc(tx, ty, r, -2.4, -.2); ctx.stroke();
        }
        label(ctx, 'ESP32 + NRF24L01+', w * .2, h - 26, B2, 9, 'center');
        // spectrum
        const sx = w * .44, sw = w - sx - 22, top = 44, sh = h * .42;
        ctx.strokeStyle = 'rgba(143,162,255,.3)'; ctx.strokeRect(sx, top, sw, sh);
        const row = [];
        for (let c = 0; c < 56; c++) {
          const ch = 1 + c / 56 * 13;
          let v = .08 + Math.random() * .08;
          s.peaks.forEach((p, i) => { v += Math.exp(-((ch - p) ** 2) / 1.2) * (.55 + .3 * Math.sin(t * (2 + i) + i)); });
          v = Math.min(1, v); row.push(v);
          const bx = sx + c * (sw / 56), bh = v * (sh - 12);
          ctx.fillStyle = v > .6 ? A : `rgba(95,225,255,${.35 + v * .6})`; ctx.fillRect(bx + 1, top + sh - bh, sw / 56 - 2, bh);
        }
        for (let c = 1; c <= 13; c += 2) label(ctx, String(c), sx + (c - 1) / 13 * sw + 3, top + sh + 12, 'rgba(143,162,255,.6)', 8);
        // waterfall
        s.fall.unshift(row); s.fall.length = Math.min(s.fall.length, 30);
        const wy = top + sh + 20, wh = h - wy - 18, rh = wh / 30;
        s.fall.forEach((r, y) => r.forEach((v, c) => {
          ctx.fillStyle = v > .6 ? `rgba(255,181,71,${v})` : `rgba(77,107,255,${v * .9})`;
          ctx.fillRect(sx + c * (sw / 56), wy + y * rh, sw / 56, rh + .5);
        }));
        overlayFx(ctx, w, h, t, 'WIRELESS ANALYZER // 2.4 GHz', 'AUTHORIZED LAB');
      }
    },

    uwb: {
      init(s) { s.trail = []; },
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        const S = Math.min(w / 26, h / 15), P = isoP(w * .5, h * .2, S), N = 12;
        ctx.strokeStyle = 'rgba(77,107,255,.28)'; ctx.beginPath();
        for (let i = 0; i <= N; i++) { let [a, b] = [P(i, 0), P(i, N)]; ctx.moveTo(...a); ctx.lineTo(...b); [a, b] = [P(0, i), P(N, i)]; ctx.moveTo(...a); ctx.lineTo(...b); }
        ctx.stroke();
        const tag = [6 + Math.sin(t * .7) * 4, 6 + Math.sin(t * 1.1 + 1) * 4];
        s.trail.push([...tag, t]); s.trail = s.trail.filter(p => t - p[2] < 2.2);
        const anchors = [[0, 0], [N, 0], [N, N], [0, N]];
        anchors.forEach(([x, y], i) => {
          const d = Math.hypot(tag[0] - x, tag[1] - y), on = Math.floor(t * 4) % 4 === i;
          ctx.strokeStyle = on ? 'rgba(95,225,255,.75)' : 'rgba(95,225,255,.18)'; ctx.beginPath();
          for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2, [px, py] = P(x + Math.cos(a) * d, y + Math.sin(a) * d); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.stroke();
          const [bx, by] = P(x, y), [tx2, ty2] = P(x, y, 3);
          glow(ctx, C, 10); ctx.strokeStyle = C; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx2, ty2); ctx.stroke();
          ctx.fillStyle = on ? W : C; ctx.fillRect(tx2 - 3, ty2 - 3, 6, 6); noGlow(ctx);
          label(ctx, `A${i + 1}`, tx2 + 6, ty2 - 4, B2, 9);
          if (on) { const [px, py] = P(...tag, .3); ctx.strokeStyle = 'rgba(95,225,255,.5)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(tx2, ty2); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]); }
        });
        ctx.strokeStyle = 'rgba(255,181,71,.6)'; ctx.beginPath(); s.trail.forEach((p, i) => { const [x, y] = P(p[0], p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
        const [px, py] = P(...tag, .3);
        glow(ctx, A, 16); ctx.fillStyle = A; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); noGlow(ctx);
        label(ctx, 'TAG-01', px + 9, py - 6, A, 9);
        label(ctx, `X ${(tag[0] * .8).toFixed(2)}m  Y ${(tag[1] * .8).toFixed(2)}m  ±0.10m`, 14, h - 16, W, 10);
        overlayFx(ctx, w, h, t, 'UWB // TRILATERATION', '4 ANCHORS · 1 TAG');
      }
    },

    thermal: {
      init(s) { s.cv = document.createElement('canvas'); s.cv.width = 128; s.cv.height = 72; s.cx = s.cv.getContext('2d'); s.img = s.cx.createImageData(128, 72); },
      draw(ctx, w, h, t, s) {
        const W2 = 128, H2 = 72, d = s.img.data;
        const fx = 64 + Math.sin(t * .5) * 34, wipe = (Math.sin(t * .8) * .5 + .5) * W2;
        let hot = { v: 0, x: 0, y: 0 };
        for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
          // body: head + torso + legs as soft blobs; warm mug on the right
          const head = Math.exp(-(((x - fx) / 6) ** 2 + ((y - 16) / 7) ** 2));
          const torso = Math.exp(-(((x - fx) / 12) ** 2 + ((y - 38) / 14) ** 2)) + Math.exp(-(((x - fx) / 20) ** 2 + ((y - 30) / 4) ** 2)) * .6;
          const legs = (Math.exp(-(((x - fx + 5) / 4) ** 2 + ((y - 62) / 10) ** 2)) + Math.exp(-(((x - fx - 5) / 4) ** 2 + ((y - 62) / 10) ** 2))) * .75;
          const mug = Math.exp(-(((x - 104) / 4) ** 2 + ((y - 50) / 5) ** 2)) * 1.1;
          let v = Math.min(1, head * 1.05 + torso * .9 + legs + mug + .08 + Math.random() * .05);
          if (v > hot.v) hot = { v, x, y };
          const i = (y * W2 + x) * 4;
          if (x < wipe) {           // low-light: green phosphor, edges from reflectance + noise
            const body = Math.min(1, head + torso + legs), lum = Math.min(255, (.1 + body * .75 + mug * .3 + (y > 66 ? .12 : 0) + Math.random() * .16) * 255);
            d[i] = lum * .35; d[i + 1] = lum; d[i + 2] = lum * .45;
          } else {                  // LWIR iron palette
            d[i] = Math.min(255, v * 2.2 * 255); d[i + 1] = Math.max(0, (v - .45) * 2 * 255); d[i + 2] = v < .4 ? v * 2 * 200 : Math.max(0, (v - .85) * 6 * 255);
          }
          d[i + 3] = 255;
        }
        s.cx.putImageData(s.img, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.drawImage(s.cv, 0, 0, w, h);
        const kx = w / W2, ky = h / H2, wx = wipe * kx;
        ctx.strokeStyle = W; ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, h); ctx.stroke();
        label(ctx, 'LOW-LIGHT', wx - 8, h - 14, '#9dffb0', 10, 'right'); label(ctx, 'LWIR THERMAL', wx + 8, h - 14, A, 10);
        if (hot.x * kx > wx) {
          const hx = hot.x * kx, hy = hot.y * ky;
          ctx.strokeStyle = W; ctx.beginPath(); ctx.moveTo(hx - 12, hy); ctx.lineTo(hx - 4, hy); ctx.moveTo(hx + 4, hy); ctx.lineTo(hx + 12, hy); ctx.moveTo(hx, hy - 12); ctx.lineTo(hx, hy - 4); ctx.moveTo(hx, hy + 4); ctx.lineTo(hx, hy + 12); ctx.stroke();
          label(ctx, `${(30 + hot.v * 7).toFixed(1)}°C`, hx + 14, hy - 8, W, 10);
        }
        overlayFx(ctx, w, h, t, 'SENSOR FUSION // THERMAL + NV', 'SIMULATED FEED');
      }
    },

    desk: {
      init(s) {
        s.pick = () => { s.from = Math.floor(rand(0, 3)); s.to = 4 + Math.floor(rand(0, 4)); s.seatA = Math.floor(rand(0, 24)); s.seatB = Math.floor(rand(0, 24)); };
        s.pick(); s.lastT = 0;
      },
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        const L = 13, T = (t % L), FLOORS = 8, from = s.from, to = s.to;
        const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
        if (T < s.lastT) s.pick();
        s.lastT = T;
        const phase = T < 2.2 ? 'building' : T < 3.4 ? 'zoomIn' : T < 5.6 ? 'floorA' : T < 8 ? 'elevator' : T < 8.8 ? 'zoomB' : 'floorB';
        // ---- building exterior
        const tower = (alpha, scale, ox = 0, oy = 0) => {
          const S = h * .03 * scale, P = isoP(w * .5 + ox, h * .8 + oy, S), FH = 1.9, X = -3.5, Y = -2.5, TW = 7, TD = 5;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = 'rgba(95,225,255,.35)'; ctx.beginPath();                 // corner columns
          [[X, Y], [X + TW, Y], [X + TW, Y + TD], [X, Y + TD]].forEach(([x, y]) => { ctx.moveTo(...P(x, y, 0)); ctx.lineTo(...P(x, y, FLOORS * FH)); });
          ctx.stroke();
          for (let f = 0; f < FLOORS; f++) {
            const hot = f === from ? C : f === to ? A : null;
            glow(ctx, hot || B, hot ? 14 : 2);
            isoBox(ctx, P, X, Y, f * FH, TW, TD, .22, hot || 'rgba(95,225,255,.55)', hot ? .45 : .07);
            if (hot) isoBox(ctx, P, X + .3, Y + .3, f * FH + .22, TW - .6, TD - .6, FH - .4, hot, .1);   // lit glass band
            const [lx, ly] = P(X + TW, Y, f * FH + .9);
            label(ctx, `FL ${f + 1}`, lx + 10, ly + 4, hot || 'rgba(143,162,255,.45)', 9);
          }
          noGlow(ctx);
          isoBox(ctx, P, X, Y, FLOORS * FH, TW, TD, .3, 'rgba(95,225,255,.6)', .12);  // roof
          const [cx1, cy1] = P(-.5, 0, 0), [cx2, cy2] = P(-.5, 0, FLOORS * FH);       // elevator core
          ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        };
        // ---- floor plan
        const desks = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { desks.push([1 + c * 3.1, 1 + r * 1.6]); desks.push([1 + c * 3.1, 9.5 + r * 1.6]); }
        const core = [6, 6.2], plan = (alpha, scale, seat, isTarget, k) => {
          const S = Math.min(w / 30, h / 17) * scale, P = isoP(w * .5, h * .18 + (1 - scale) * h * .4, S);
          ctx.globalAlpha = alpha;
          poly(ctx, [P(0, 0), P(14, 0), P(14, 14), P(0, 14)], 'rgba(95,225,255,.5)', 'rgba(77,107,255,.06)');
          desks.forEach(([x, y], i) => { const on = i === seat; glow(ctx, on ? (isTarget ? A : C) : C, on ? 14 : 3); isoBox(ctx, P, x, y, 0, 2.2, 1.1, .55, on ? (isTarget ? A : C) : 'rgba(95,225,255,.5)', on ? .4 : .08); });
          glow(ctx, W, 8); isoBox(ctx, P, core[0], core[1], 0, 2, 1.6, 2.2, 'rgba(255,255,255,.7)', .12); noGlow(ctx);
          const [ex, ey] = P(core[0] + 1, core[1] + .8, 2.6); label(ctx, 'ELEVATOR', ex, ey, W, 9, 'center');
          // route seat ↔ elevator
          const d = desks[seat], aisle = d[1] < 7 ? d[1] + 1.3 : d[1] - .3;
          let route = [[d[0] + 1.1, aisle], [core[0] + 1, aisle], [core[0] + 1, core[1] + (d[1] < 7 ? 0 : 1.6)]];
          if (!isTarget) route = route; else route = route.slice().reverse();
          const segs = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1])), tot = segs.reduce((a, b) => a + b);
          let left = tot * ease(k); ctx.strokeStyle = isTarget ? A : C; ctx.lineWidth = 2.2; glow(ctx, ctx.strokeStyle, 10); ctx.beginPath(); ctx.moveTo(...P(...route[0], .05));
          let head = route[0];
          for (let i = 0; i < segs.length && left > 0; i++) { const f = Math.min(1, left / segs[i]); left -= segs[i]; head = [lerp(route[i][0], route[i + 1][0], f), lerp(route[i][1], route[i + 1][1], f)]; ctx.lineTo(...P(...head, .05)); }
          ctx.stroke(); ctx.lineWidth = 1;
          const [hx, hy] = P(...head, .05); ctx.fillStyle = W; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 7); ctx.fill(); noGlow(ctx);
          if (!isTarget) { const [sx, sy] = P(d[0] + 1.1, d[1] + .5, .6); label(ctx, 'YOU', sx, sy - 10, C, 9, 'center'); }
          if (isTarget && k >= 1) { const [px, py] = P(d[0] + 1.1, d[1] + .5, .6); ctx.strokeStyle = A; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 20); ctx.stroke(); label(ctx, `CUBICLE ${to + 1}-${String(100 + seat).padStart(3, '0')}`, px + 5, py - 23, A, 10); }
          label(ctx, `FLOOR ${(isTarget ? to : from) + 1}`, 14, 40, isTarget ? A : C, 10);
          ctx.globalAlpha = 1;
        };
        // ---- elevator section
        const elevator = (k, alpha) => {
          ctx.globalAlpha = alpha;
          const bx = w * .5 - 70, bw = 140, top = 40, bot = h - 36, fh = (bot - top) / FLOORS;
          ctx.strokeStyle = 'rgba(95,225,255,.45)'; ctx.strokeRect(bx, top, bw, bot - top);
          for (let f = 0; f < FLOORS; f++) {
            const y = bot - (f + 1) * fh, hot = f === from ? C : f === to ? A : null;
            ctx.strokeStyle = hot || 'rgba(77,107,255,.4)'; ctx.beginPath(); ctx.moveTo(bx, y + fh); ctx.lineTo(bx + bw, y + fh); ctx.stroke();
            label(ctx, `FL ${f + 1}`, bx - 8, y + fh / 2 + 4, hot || 'rgba(143,162,255,.6)', 9, 'right');
          }
          const sx = bx + bw / 2 - 12; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.strokeRect(sx, top, 24, bot - top);
          const fpos = lerp(from, to, ease(k)), cy = bot - (fpos + 1) * fh + 3;
          glow(ctx, A, 16); ctx.fillStyle = 'rgba(255,181,71,.25)'; ctx.strokeStyle = A; ctx.fillRect(sx + 2, cy, 20, fh - 6); ctx.strokeRect(sx + 2, cy, 20, fh - 6); noGlow(ctx);
          label(ctx, to > from ? '▲' : '▼', sx + 12, cy + fh / 2, A, 11, 'center');
          label(ctx, `ELEVATOR B  ·  FL ${from + 1} → ${to + 1}`, bx + bw + 16, top + 20, W, 10);
          label(ctx, `NOW  FL ${Math.round(fpos) + 1}`, bx + bw + 16, top + 38, A, 10);
          ctx.globalAlpha = 1;
        };
        if (phase === 'building') tower(1, 1);
        else if (phase === 'zoomIn') { const k = ease((T - 2.2) / 1.2); tower(1 - k, 1 + k * 2.2, 0, (from * 1.9 + 1) * h * .03 * k * 3.2); plan(k, .5 + k * .5, s.seatA, false, 0); }
        else if (phase === 'floorA') plan(1, 1, s.seatA, false, (T - 3.4) / 1.9);
        else if (phase === 'elevator') { const a = Math.min(1, (T - 5.6) / .4); elevator((T - 6) / 1.7, a); }
        else if (phase === 'zoomB') { const k = ease((T - 8) / .8); elevator(1, 1 - k); plan(k, .5 + k * .5, s.seatB, true, 0); }
        else plan(1, 1, s.seatB, true, (T - 8.8) / 2);
        label(ctx, `QUERY › locate seat ${to + 1}-${String(100 + s.seatB).padStart(3, '0')}`, 14, h - 16, W, 10);
        overlayFx(ctx, w, h, t, 'DESK FINDER // BUILDING MODEL', `${FLOORS} FLOORS · 192 SEATS`);
      }
    },

    arena: {
      init(s) {
        s.bots = [['CLAUDE', '#d4a27f'], ['CHATGPT', G], ['GROK', B2]].map(([n, c], i) => ({ n, c, pts: [0], v: 0, seed: i * 1.7 }));
        s.day = 0; s.next = 0;
      },
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        if (t > s.next) {
          s.next = t + .45; s.day++;
          s.bots.forEach(b => { b.v = b.pts[b.pts.length - 1] + gauss() * 1.3 + Math.sin(s.day * .2 + b.seed) * .5 + .12; b.pts.push(b.v); if (b.pts.length > 60) b.pts.shift(); });
          if (s.day > 120) this.init(s);
        }
        const x0 = 30, x1 = w * .68, top = 48, bot = h - 34;
        const all = s.bots.flatMap(b => b.pts), mn = Math.min(...all, -2), mx = Math.max(...all, 2);
        const Y = v => bot - (v - mn) / (mx - mn) * (bot - top);
        ctx.strokeStyle = 'rgba(143,162,255,.25)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x0, Y(0)); ctx.lineTo(x1, Y(0)); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 60; i += 5) { const x = x0 + i / 59 * (x1 - x0); ctx.fillStyle = 'rgba(143,162,255,.25)'; ctx.fillRect(x, bot + 4, 1, 4); }
        s.bots.forEach(b => {
          glow(ctx, b.c, 8); ctx.strokeStyle = b.c; ctx.lineWidth = 1.8; ctx.beginPath();
          b.pts.forEach((v, i) => { const x = x0 + i / 59 * (x1 - x0); i ? ctx.lineTo(x, Y(v)) : ctx.moveTo(x, Y(v)); }); ctx.stroke(); ctx.lineWidth = 1;
          const lx = x0 + (b.pts.length - 1) / 59 * (x1 - x0); ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(lx, Y(b.v), 3, 0, 7); ctx.fill(); noGlow(ctx);
        });
        label(ctx, 'NIGHTLY PICKS · 8:45 PM ET', x0, bot + 22, B2, 9);
        // leaderboard
        const lb = [...s.bots].sort((a, b) => b.v - a.v), bx = w * .72;
        label(ctx, 'LEADERBOARD', bx, top + 4, W, 10);
        lb.forEach((b, i) => {
          const y = top + 26 + i * 34;
          ctx.strokeStyle = i === 0 ? b.c : 'rgba(143,162,255,.3)'; ctx.strokeRect(bx, y - 14, w - bx - 18, 26);
          label(ctx, `${i + 1}`, bx + 8, y + 3, i === 0 ? A : B2, 11); label(ctx, b.n, bx + 26, y + 3, b.c, 10);
          label(ctx, `${b.v >= 0 ? '+' : ''}${b.v.toFixed(1)}%`, w - 26, y + 3, b.v >= 0 ? G : R, 10, 'right');
        });
        label(ctx, `GITHUB ACTION · DAY ${s.day}`, bx, top + 26 + 3 * 34 + 6, 'rgba(143,162,255,.7)', 9);
        overlayFx(ctx, w, h, t, 'AI STOCK PICKS ARENA', 'SIMULATED DATA');
      }
    },

    game: {
      init(s) { s.f = [{ x: .35, y: .55, hp: 1, c: C, vx: 0, vy: 0 }, { x: .65, y: .5, hp: 1, c: R, vx: 0, vy: 0 }]; s.sparks = []; s.round = 1; s.ko = 0; s.roster = Math.floor(rand(0, 100)); },
      draw(ctx, w, h, t, s, dt) {
        backdrop(ctx, w, h, t);
        // roster grid
        const gx = 16, gy = 40, cs = Math.min(10, (h - 70) / 10);
        for (let i = 0; i < 100; i++) {
          const x = gx + (i % 10) * cs, y = gy + Math.floor(i / 10) * cs, on = i === s.roster;
          ctx.fillStyle = on ? A : `rgba(77,107,255,${.15 + ((i * 37) % 10) / 40})`; ctx.fillRect(x, y, cs - 2, cs - 2);
        }
        label(ctx, '100 FIGHTERS', gx, gy + cs * 10 + 14, B2, 9);
        if (Math.floor(t * 2) % 6 === 0) s.roster = Math.floor((t * 7) % 100);
        // arena
        const ax = gx + cs * 10 + 24, aw = w - ax - 16, ay = 44, ah = h - 74;
        const P = (x, y) => [ax + x * aw, ay + y * ah];
        ctx.strokeStyle = 'rgba(95,225,255,.35)'; ctx.strokeRect(ax, ay, aw, ah);
        ctx.beginPath(); ctx.arc(ax + aw / 2, ay + ah / 2, ah * .32, 0, 7); ctx.stroke();
        const [a, b] = s.f;
        if (s.ko > 0) { s.ko -= dt; if (s.ko <= 0) { const r = s.round % 3 + 1; this.init(s); s.round = r; } }
        else {
          [a, b].forEach((p, i) => {
            const o = i ? a : b, dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1;
            const want = d > .14 ? 1 : -.6;
            p.vx = lerp(p.vx, dx / d * .32 * want + Math.sin(t * 3 + i * 2) * .18, dt * 4);
            p.vy = lerp(p.vy, dy / d * .32 * want + Math.cos(t * 2.4 + i) * .18, dt * 4);
            p.x = Math.min(.92, Math.max(.08, p.x + p.vx * dt)); p.y = Math.min(.88, Math.max(.12, p.y + p.vy * dt));
            if (d < .16 && Math.random() < dt * 2.2) {
              o.hp = Math.max(0, o.hp - rand(.06, .14));
              const [sx, sy] = P((p.x + o.x) / 2, (p.y + o.y) / 2);
              for (let k = 0; k < 10; k++) s.sparks.push({ x: sx, y: sy, vx: rand(-90, 90), vy: rand(-90, 90), l: .5, c: p.c });
              if (o.hp <= 0) s.ko = 1.6;
            }
          });
        }
        s.sparks = s.sparks.filter(k => { k.l -= dt; k.x += k.vx * dt; k.y += k.vy * dt; ctx.fillStyle = k.c; ctx.globalAlpha = Math.max(0, k.l * 2); ctx.fillRect(k.x, k.y, 2, 2); ctx.globalAlpha = 1; return k.l > 0; });
        s.f.forEach((p, i) => {
          const [x, y] = P(p.x, p.y);
          glow(ctx, p.c, 14); ctx.strokeStyle = p.c; ctx.fillStyle = p.c + '33';
          ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.stroke(); noGlow(ctx);
          const bw2 = aw * .36, bx = i ? ax + aw - bw2 - 8 : ax + 8;
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.strokeRect(bx, ay + 8, bw2, 6);
          ctx.fillStyle = p.c; ctx.fillRect(bx + 1, ay + 9, (bw2 - 2) * p.hp, 4);
          label(ctx, i ? 'P2' : 'P1', i ? bx + bw2 : bx, ay + 26, p.c, 9, i ? 'right' : 'left');
        });
        if (s.ko > 0) { ctx.font = `700 ${Math.round(ah * .22)}px ${FONT}`; ctx.fillStyle = W; ctx.textAlign = 'center'; glow(ctx, R, 18); ctx.fillText('K.O.', ax + aw / 2, ay + ah / 2 + ah * .08); noGlow(ctx); }
        label(ctx, `1V1 · ROUND ${s.round} · BEST OF 3`, ax, h - 16, W, 10);
        label(ctx, 'BRONZE → LEGEND', w - 16, h - 16, A, 9, 'right');
        overlayFx(ctx, w, h, t, 'THE GAME 1 // ROBLOX', '50 MAPS · 4 MODES');
      }
    },

    readeasier: {
      init(s) { s.words = 'Reading should feel effortless. ReadEasier anchors the eye on the start of each word, guides attention with a ruler, and can pace text one word at a time so focus never drifts from the line you are on.'.split(' '); },
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        const x0 = 22, top = 52, lh = 22, maxw = w * .58;
        ctx.font = `13px ${FONT}`; ctx.textAlign = 'left';
        const lines = []; let cur = [], cw = 0;
        s.words.forEach(word => { const ww = ctx.measureText(word + ' ').width; if (cw + ww > maxw) { lines.push(cur); cur = []; cw = 0; } cur.push(word); cw += ww; });
        lines.push(cur);
        const rl = Math.floor(t / 1.6) % lines.length;
        ctx.fillStyle = 'rgba(95,225,255,.1)'; ctx.fillRect(x0 - 6, top + rl * lh - 15, maxw + 12, lh);
        ctx.strokeStyle = C; ctx.beginPath(); ctx.moveTo(x0 - 6, top + rl * lh + 7); ctx.lineTo(x0 + maxw + 6, top + rl * lh + 7); ctx.stroke();
        ctx.textAlign = 'left';
        lines.forEach((ln, i) => {
          let x = x0;
          ln.forEach(word => {
            const k = Math.ceil(word.length * .45), head = word.slice(0, k), tail = word.slice(k) + ' ';
            const on = i === rl;
            ctx.font = `700 13px ${FONT}`; ctx.fillStyle = on ? W : 'rgba(232,236,255,.55)'; ctx.fillText(head, x, top + i * lh); x += ctx.measureText(head).width;
            ctx.font = `13px ${FONT}`; ctx.fillStyle = on ? 'rgba(232,236,255,.7)' : 'rgba(232,236,255,.3)'; ctx.fillText(tail, x, top + i * lh); x += ctx.measureText(tail).width;
          });
        });
        // one-word pacer
        const bx = w * .68, bw = w - bx - 18, by = top - 6, bh = 70, wpm = 300;
        const word = s.words[Math.floor(t * wpm / 60) % s.words.length].replace(/[.,]/g, '');
        ctx.strokeStyle = 'rgba(143,162,255,.4)'; ctx.strokeRect(bx, by, bw, bh);
        const orp = Math.max(0, Math.floor((word.length - 1) * .35)), cx = bx + bw / 2;
        ctx.font = `700 18px ${FONT}`; const pre = word.slice(0, orp), cw2 = ctx.measureText(word[orp] || '').width;
        ctx.textAlign = 'right'; ctx.fillStyle = W; ctx.fillText(pre, cx - cw2 / 2, by + bh / 2 + 6);
        ctx.textAlign = 'center'; ctx.fillStyle = R; ctx.fillText(word[orp] || '', cx, by + bh / 2 + 6);
        ctx.textAlign = 'left'; ctx.fillStyle = W; ctx.fillText(word.slice(orp + 1), cx + cw2 / 2, by + bh / 2 + 6);
        ctx.strokeStyle = 'rgba(255,77,94,.5)'; ctx.beginPath(); ctx.moveTo(cx, by + 6); ctx.lineTo(cx, by + 14); ctx.moveTo(cx, by + bh - 14); ctx.lineTo(cx, by + bh - 6); ctx.stroke();
        label(ctx, `PACER · ${wpm} WPM`, bx, by + bh + 16, B2, 9);
        // tts waveform
        const wy = by + bh + 44;
        label(ctx, 'TEXT-TO-SPEECH', bx, wy - 8, B2, 9);
        ctx.strokeStyle = C; ctx.beginPath();
        for (let x = 0; x <= bw; x += 3) { const a = Math.sin(x * .3 + t * 9) * Math.sin(x * .05 + t * 2) * 12; x ? ctx.lineTo(bx + x, wy + 14 + a) : ctx.moveTo(bx + x, wy + 14 + a); }
        ctx.stroke();
        overlayFx(ctx, w, h, t, 'READEASIER // FOCUS READER', 'CLIENT-SIDE ONLY');
      }
    },

    resumeserver: {
      init() {},
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        const L = 9, T = t % L;
        const P = isoP(w * .27, h * .46, Math.min(w, h) / 40);
        esp32(ctx, P, -4, -10, 0, t, .9 + Math.random() * .1);
        // OLED module + menu
        const ox = 18, oy = h * .66, ow = w * .3, oh = 52;
        ctx.strokeStyle = 'rgba(95,225,255,.6)'; ctx.strokeRect(ox, oy, ow, oh); ctx.fillStyle = '#00060c'; ctx.fillRect(ox + 1, oy + 1, ow - 2, oh - 2);
        const items = ['START SERVER', 'RESTART', 'STATUS'], sel = T < 1.6 ? Math.floor(T / .55) % 3 : 0;
        items.forEach((it, i) => label(ctx, (i === sel ? '› ' : '  ') + it, ox + 8, oy + 15 + i * 13, i === sel ? W : 'rgba(143,162,255,.6)', 9));
        const on = T > 1.6;
        [[R, on, 'SRV'], [B2, true, 'PWR']].forEach(([c, lit, n], i) => { const lx = ox + ow + 18, ly = oy + 12 + i * 22; ctx.fillStyle = lit ? c : 'rgba(255,255,255,.1)'; if (lit) glow(ctx, c, 10); ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 7); ctx.fill(); noGlow(ctx); label(ctx, n, lx + 9, ly + 3, B2, 8); });
        if (on) {
          const [ax, ay] = P(-1, -9, 1.2);
          for (let i = 0; i < 4; i++) { const r = ((t * 40 + i * 25) % 100); ctx.strokeStyle = `rgba(95,225,255,${.7 * (1 - r / 100)})`; ctx.beginPath(); ctx.arc(ax, ay, r, -.9, .5); ctx.stroke(); }
        }
        // phone
        const pw = Math.min(110, w * .2), ph = pw * 1.9, px = w - pw - 34, py = (h - ph) / 2 + 6;
        ctx.strokeStyle = W; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.stroke(); ctx.lineWidth = 1;
        const sx = px + 8, sw = pw - 16, sy = py + 18;
        if (T < 3.2) {
          label(ctx, 'WI-FI', sx, sy + 8, B2, 8);
          ['HOME-5G', 'arian-portfolio', 'CAFE_GUEST'].forEach((n, i) => { const hl = on && i === 1 && T > 2.4; ctx.fillStyle = hl ? 'rgba(95,225,255,.18)' : 'transparent'; ctx.fillRect(sx - 2, sy + 16 + i * 18, sw + 4, 16); label(ctx, n, sx, sy + 27 + i * 18, i === 1 ? (on ? C : 'rgba(143,162,255,.3)') : 'rgba(143,162,255,.5)', 8); });
        } else {
          const k = Math.min(1, (T - 3.2) / 1.6);
          label(ctx, 'CAPTIVE PORTAL', sx, sy + 8, G, 7);
          ctx.fillStyle = W; ctx.fillRect(sx, sy + 16, sw * .6, 6);
          for (let i = 0; i < 14; i++) { if (i / 14 > k) break; ctx.fillStyle = i % 4 === 0 ? 'rgba(95,225,255,.8)' : 'rgba(232,236,255,.4)'; ctx.fillRect(sx, sy + 30 + i * 9, sw * (i % 4 === 0 ? .45 : .6 + ((i * 13) % 5) / 15), 3); }
          if (k >= 1) label(ctx, 'RÉSUMÉ LOADED', px + pw / 2, py + ph - 12, G, 8, 'center');
        }
        label(ctx, 'SSID: arian-portfolio · OFFLINE', 18, h - 14, W, 10);
        overlayFx(ctx, w, h, t, 'ESP32 RÉSUMÉ SERVER', on ? 'AP ONLINE' : 'BOOT');
      }
    },

    scope: {
      init(s) { s.ready = false; },
      draw(ctx, w, h, t, s) {
        if (!s.ready) { backdrop(ctx, w, h, t); s.ready = true; }
        ctx.fillStyle = 'rgba(1,2,5,.16)'; ctx.fillRect(0, 0, w, h);   // phosphor persistence
        const cx = w / 2, cy = h / 2 + 6, R2 = Math.min(w * .3, h * .36);
        ctx.strokeStyle = 'rgba(77,107,255,.18)'; ctx.beginPath();
        for (let i = -4; i <= 4; i++) { ctx.moveTo(cx + i * R2 / 4, cy - R2); ctx.lineTo(cx + i * R2 / 4, cy + R2); ctx.moveTo(cx - R2, cy + i * R2 / 4); ctx.lineTo(cx + R2, cy + i * R2 / 4); }
        ctx.stroke();
        const ratios = [[1, 2], [3, 2], [3, 4], [5, 4], [2, 3]], idx = Math.floor(t / 4) % ratios.length, [fx, fy] = ratios[idx];
        const phase = t * .7;
        glow(ctx, G, 10); ctx.strokeStyle = 'rgba(93,255,168,.85)'; ctx.lineWidth = 1.4; ctx.beginPath();
        for (let i = 0; i <= 600; i++) { const a = i / 600 * Math.PI * 2; const x = cx + Math.sin(fx * a + phase) * R2, y = cy + Math.sin(fy * a) * R2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.lineWidth = 1; noGlow(ctx);
        ctx.fillStyle = '#010205'; ctx.fillRect(0, 0, w, 30); ctx.fillRect(0, h - 28, w, 28);
        label(ctx, `X:Y  ${fx}:${fy}   PHASE ${Math.round((phase * 57.3) % 360)}°`, 14, h - 12, G, 10);
        label(ctx, 'CH1 → X   CH2 → Y', w - 14, h - 12, B2, 9, 'right');
        label(ctx, 'XY OSCILLOSCOPE', 14, 22, W, 10); label(ctx, 'XY MODE', w - 14, 22, C, 10, 'right');
      }
    },

    terminal: {
      init(s) {
        s.script = [
          ['$ ', 'connect --target archive-07', C], ['', 'establishing session ......... ok', B2],
          ['$ ', 'ls /evidence', C], ['', 'memo_0412.txt   badge.log   vault.enc', B2],
          ['$ ', 'cat memo_0412.txt', C], ['', '"the key is hidden where the clock stops"', W],
          ['$ ', 'decrypt vault.enc --hint 03:17', C], ['', '█████████████████████ 100%', A], ['', 'ACCESS GRANTED · CASE FILE 7 UNLOCKED', G]
        ];
      },
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        const x0 = 22, y0 = 50, lh = 17, cps = 26;
        ctx.strokeStyle = 'rgba(143,162,255,.35)'; ctx.strokeRect(12, 34, w - 24, h - 48);
        ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(24 + i * 12, 44, 3.5, 0, 7); ctx.fill(); });
        const total = s.script.reduce((a, l) => a + l[1].length + 8, 0), T = (t * cps) % (total + 70);
        let budget = T, y = y0 + 12;
        for (const [pre, txt, col] of s.script) {
          if (budget <= 0) break;
          const n = Math.min(txt.length, Math.floor(budget)); budget -= txt.length + 8;
          label(ctx, pre, x0, y, G, 11); label(ctx, txt.slice(0, n), x0 + (pre ? 16 : 0), y, col, 11);
          if (budget <= 0 && Math.floor(t * 2) % 2) { ctx.fillStyle = W; ctx.fillRect(x0 + (pre ? 16 : 0) + ctx.measureText(txt.slice(0, n)).width + 2, y - 10, 7, 12); }
          y += lh;
        }
        overlayFx(ctx, w, h, t, 'MYSTERY TERMINAL // FICTIONAL', 'EDUCATIONAL');
      }
    },

    pipeline: {
      init(s) { s.parts = []; s.counts = [0, 0, 0, 0, 0, 0]; s.next = 0; },
      draw(ctx, w, h, t, s, dt) {
        backdrop(ctx, w, h, t);
        const names = ['LEAD', 'AI REPLY', 'TOUR', 'ONBOARD', 'INVOICE', 'PAID'], n = names.length, y = h * .46;
        const xs = names.map((_, i) => 40 + i * (w - 80) / (n - 1));
        ctx.strokeStyle = 'rgba(77,107,255,.5)'; ctx.beginPath(); ctx.moveTo(xs[0], y); ctx.lineTo(xs[n - 1], y); ctx.stroke();
        // payment-recovery loop invoice → reminder → invoice
        ctx.strokeStyle = 'rgba(255,181,71,.45)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(xs[4], y + 12);
        ctx.bezierCurveTo(xs[4] - 30, y + 70, xs[4] + 30, y + 70, xs[4] + 4, y + 12); ctx.stroke(); ctx.setLineDash([]);
        label(ctx, 'PAYMENT RECOVERY', xs[4], y + 76, A, 8, 'center');
        if (t > s.next) { s.parts.push({ x: xs[0], stage: 0, loop: false, k: 0 }); s.next = t + .55; s.counts[0]++; }
        s.parts = s.parts.filter(p => {
          if (p.stage >= n - 1) return false;
          p.k += dt * .6;
          if (p.loop) {
            const a = p.k * Math.PI * 2, px = xs[4] + Math.sin(a) * 18, py = y + 12 + (1 - Math.cos(a)) * 26;
            glow(ctx, A, 10); ctx.fillStyle = A; ctx.fillRect(px - 2, py - 2, 4, 4); noGlow(ctx);
            if (p.k >= 1) { p.loop = false; p.k = 0; }
            return true;
          }
          p.x = lerp(xs[p.stage], xs[p.stage + 1], p.k);
          if (p.k >= 1) { p.stage++; p.k = 0; s.counts[p.stage]++; if (p.stage === 4 && Math.random() < .3) p.loop = true; }
          glow(ctx, C, 10); ctx.fillStyle = C; ctx.fillRect(p.x - 2, y - 2, 4, 4); noGlow(ctx);
          return true;
        });
        names.forEach((nm, i) => {
          const done = i === n - 1;
          glow(ctx, done ? G : C, 8); ctx.fillStyle = '#010205'; ctx.strokeStyle = done ? G : C;
          ctx.fillRect(xs[i] - 26, y - 14, 52, 28); ctx.strokeRect(xs[i] - 26, y - 14, 52, 28); noGlow(ctx);
          label(ctx, nm, xs[i], y + 3, done ? G : W, 8, 'center');
          label(ctx, String(s.counts[i]), xs[i], y - 24, B2, 9, 'center');
        });
        label(ctx, 'ZAPIER · GOHIGHLEVEL · AI ASSIST', 14, h - 16, W, 10);
        overlayFx(ctx, w, h, t, 'CRM AUTOMATION // PIPELINE', 'RUNNING');
      }
    }
  };

  /* ---------- runner ---------- */
  const items = [...document.querySelectorAll('canvas[data-demo]')].map(cv => ({ cv, ctx: cv.getContext('2d'), scene: scenes[cv.dataset.demo], s: {}, on: false, w: 0, h: 0 }));
  function size(it) {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = it.cv.getBoundingClientRect();
    it.w = r.width; it.h = r.height; it.cv.width = r.width * dpr; it.cv.height = r.height * dpr; it.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  items.forEach(it => { size(it); it.scene.init(it.s); });
  addEventListener('resize', () => items.forEach(size));
  const io = new IntersectionObserver(es => es.forEach(e => { const it = items.find(i => i.cv === e.target); it.on = e.isIntersecting; }), { rootMargin: '100px' });
  items.forEach(it => io.observe(it.cv));
  const t0 = performance.now(); let last = 0;
  function loop(now) {
    if (now - last > 33) {
      const dt = Math.min(.25, (now - (last || now)) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      items.forEach(it => { if (it.on && it.w) it.scene.draw(it.ctx, it.w, it.h, t, it.s, dt); });
    }
    if (!reducedMotion) requestAnimationFrame(loop);
  }
  if (reducedMotion) { document.fonts?.ready.then(() => items.forEach(it => { for (let k = 0; k < 40; k++) it.scene.draw(it.ctx, it.w, it.h, 3 + k * .1, it.s, .1); })); }
  else requestAnimationFrame(loop);
})();
