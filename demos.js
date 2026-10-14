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
      init(s) { s.target = null; s.next = 0; },
      draw(ctx, w, h, t, s) {
        backdrop(ctx, w, h, t);
        const S = Math.min(w / 30, h / 17), P = isoP(w * .52, h * .16, S), FW = 14, FD = 14;
        ctx.strokeStyle = 'rgba(95,225,255,.5)'; ctx.lineWidth = 1;
        poly(ctx, [P(0, 0), P(FW, 0), P(FW, FD), P(0, FD)], 'rgba(95,225,255,.45)', 'rgba(77,107,255,.06)');
        [[0, 0, FW, 0], [0, 0, 0, FD], [6, 0, 6, 5]].forEach(([x1, y1, x2, y2]) => {           // walls
          poly(ctx, [P(x1, y1), P(x2, y2), P(x2, y2, 1.6), P(x1, y1, 1.6)], 'rgba(143,162,255,.4)', 'rgba(143,162,255,.06)');
        });
        const desks = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) desks.push([1.5 + c * 2.5, 6.5 + r * 1.9]);
        if (t > s.next) { s.target = Math.floor(rand(0, desks.length)); s.t0 = t; s.next = t + 3.4; }
        const tgt = desks[s.target], k = Math.min(1, (t - s.t0) / 1.4);
        desks.forEach(([x, y], i) => { glow(ctx, i === s.target && k >= 1 ? A : C, i === s.target ? 14 : 4); isoBox(ctx, P, x, y, 0, 1.6, 1, .5, i === s.target && k >= 1 ? A : 'rgba(95,225,255,.6)', i === s.target ? .35 : .1); });
        noGlow(ctx);
        // route from entrance
        const route = [[FW - .5, 1], [FW - .5, tgt[1] - .4], [tgt[0] + .8, tgt[1] - .4]];
        const segs = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1])), total = segs.reduce((a, b) => a + b);
        let left = total * k; ctx.strokeStyle = A; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...P(...route[0], .05));
        for (let i = 0; i < segs.length && left > 0; i++) { const f = Math.min(1, left / segs[i]); left -= segs[i]; ctx.lineTo(...P(lerp(route[i][0], route[i + 1][0], f), lerp(route[i][1], route[i + 1][1], f), .05)); }
        ctx.stroke(); ctx.lineWidth = 1;
        if (k >= 1) {
          const [px, py] = P(tgt[0] + .8, tgt[1] + .5, 1.6);
          ctx.strokeStyle = A; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 18); ctx.stroke();
          label(ctx, `SEAT 4-${String(100 + s.target).padStart(3, '0')}`, px + 4, py - 22, A, 10);
        }
        label(ctx, `QUERY › seat lookup   FLOOR 4   ${desks.length * 6} SEATS`, 14, h - 16, W, 10);
        overlayFx(ctx, w, h, t, 'DESK FINDER // FLOOR PLAN', 'INTERNAL DATA');
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
