const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Boot: short, once per session ---------- */
(() => {
  const boot = $('.boot');
  let seen = false;
  try { seen = sessionStorage.getItem('an_boot') === '1'; sessionStorage.setItem('an_boot', '1'); } catch (e) {}
  if (seen || reduced) { boot.remove(); return; }
  const done = () => { boot.classList.add('done'); setTimeout(() => boot.remove(), 400); };
  setTimeout(done, 1250);
  boot.addEventListener('click', done);
  addEventListener('keydown', done, { once: true });
})();

/* ---------- Clock (Ottawa) ---------- */
const clock = $('#clock');
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const tick = () => { clock.textContent = fmt.format(new Date()); };
tick(); setInterval(tick, 1000);
$('#year').textContent = new Date().getFullYear();

/* ---------- Mobile nav ---------- */
const menu = $('.menu'), mobile = $('#mobileNav');
const setMenu = open => { menu.setAttribute('aria-expanded', String(open)); mobile.classList.toggle('open', open); };
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
$$('a', mobile).forEach(a => a.addEventListener('click', () => setMenu(false)));

/* ---------- Active section in nav ---------- */
const navLinks = $$('.nav-links a'), sections = $$('main section[id]');
let spyQueued = false;
function spy() {
  spyQueued = false;
  let current = '';
  sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .4) current = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.hash === '#' + current));
}
addEventListener('scroll', () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }, { passive: true });
spy();

/* ---------- Reveal on scroll ---------- */
const revealTargets = $$('.sec-head, .profile-text, .dossier, .log-item, .op, .cap, .term, .contact > *');
revealTargets.forEach(el => el.classList.add('reveal'));
const reveal = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visible'); reveal.unobserve(e.target); }
}), { threshold: .08 });
revealTargets.forEach(el => reveal.observe(el));

/* ---------- Case files ---------- */
const ops = $$('.op');
ops.forEach(op => {
  op.tabIndex = 0;
  op.setAttribute('role', 'button');
  op.setAttribute('aria-label', `Open case file: ${$('h3', op).textContent}`);
  op.insertAdjacentHTML('beforeend', '<span class="op-open">Open case file →</span>');
  op.addEventListener('click', () => openCase(op));
  op.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(op); } });
});

const dialog = $('#caseFile');
function openCase(op) {
  const st = $('.status', op);
  $('#cfCode').textContent = `${$('.code', op).textContent} // CASE FILE`;
  $('#cfStatus').className = st.className;
  $('#cfStatus').textContent = st.textContent;
  $('#cfTitle').textContent = $('h3', op).textContent;
  $('#cfClass').textContent = $('.op-class', op).textContent;
  $('#cfBrief').textContent = $('.brief', op).textContent;
  $('#cfStack').innerHTML = $('.stack', op).innerHTML;
  $('#cfType').textContent = op.dataset.type === 'hw' ? 'Hardware / physical systems' : 'Software / digital systems';
  const link = $('#cfLink');
  link.hidden = !op.dataset.link;
  if (op.dataset.link) link.href = op.dataset.link;
  dialog.showModal();
  requestAnimationFrame(() => dialog.classList.add('visible'));
  document.body.classList.add('locked');
}
function closeCase() {
  dialog.classList.remove('visible');
  document.body.classList.remove('locked');
  setTimeout(() => { if (dialog.open) dialog.close(); }, reduced ? 0 : 250);
}
$('.cf-close').addEventListener('click', closeCase);
dialog.addEventListener('cancel', e => { e.preventDefault(); closeCase(); });
dialog.addEventListener('click', e => { if (e.target === dialog) closeCase(); });

/* ---------- Filters ---------- */
$$('.filter').forEach(btn => btn.addEventListener('click', () => {
  $$('.filter').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
  const f = btn.dataset.filter;
  ops.forEach(op => { op.hidden = !(f === 'all' || op.dataset.type === f || op.dataset.status === f); });
}));

/* ---------- Radar ---------- */
(() => {
  const cv = $('#radar'), ctx = cv.getContext('2d'), tip = $('#radarTip');
  const AMBER = '255,176,0', CYAN = '127,212,224', INK = '230,228,220';
  let size = 0, dpr = 1, hover = null, sweep = -Math.PI / 2;

  // Software contacts on the right half, hardware on the left; deterministic positions.
  const contacts = ops.map((op, i) => {
    const hw = op.dataset.type === 'hw', k = hw ? i - 6 : i;
    const angle = (hw ? Math.PI * .62 : -Math.PI * .38) + k * (Math.PI * .155) + (k % 2 ? .06 : -.04);
    const r = .3 + ((k * 37) % 6) / 6 * .58;
    return { op, hw, angle, r, glow: 0, code: $('.code', op).textContent, title: $('h3', op).textContent, active: op.dataset.status === 'active' };
  });
  $('#radarCount').textContent = contacts.length;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    size = cv.clientWidth;
    cv.width = cv.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduced) draw();
  }
  const pos = c => {
    const R = size / 2 - 18;
    return { x: size / 2 + Math.cos(c.angle) * c.r * R, y: size / 2 + Math.sin(c.angle) * c.r * R };
  };

  function draw() {
    const cx = size / 2, R = size / 2 - 18;
    ctx.clearRect(0, 0, size, size);
    // rings + crosshair
    ctx.strokeStyle = `rgba(${INK},.12)`; ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cx, R * i / 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cx); ctx.lineTo(cx + R, cx); ctx.moveTo(cx, cx - R); ctx.lineTo(cx, cx + R); ctx.stroke();
    // degree ticks
    for (let d = 0; d < 360; d += 5) {
      const a = d * Math.PI / 180, len = d % 30 === 0 ? 9 : 4;
      ctx.strokeStyle = `rgba(${INK},${d % 30 === 0 ? .4 : .15})`;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cx + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * (R - len), cx + Math.sin(a) * (R - len)); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${INK},.35)`; ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('000', cx, 11); ctx.fillText('180', cx, size - 3);
    ctx.textAlign = 'left'; ctx.fillText('090', size - 22, cx - 4); ctx.fillText('270', 0, cx - 4);
    ctx.textAlign = 'left'; ctx.fillStyle = `rgba(${INK},.28)`;
    ctx.fillText('SW', cx + R * .7, cx - R * .78); ctx.fillText('HW', cx - R * .82, cx + R * .8);

    // sweep wedge
    if (!reduced) {
      const steps = 28, span = .9;
      for (let i = 0; i < steps; i++) {
        const a0 = sweep - span * (i + 1) / steps, a1 = sweep - span * i / steps;
        ctx.fillStyle = `rgba(${AMBER},${.16 * (1 - i / steps)})`;
        ctx.beginPath(); ctx.moveTo(cx, cx); ctx.arc(cx, cx, R, a0, a1); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = `rgba(${AMBER},.85)`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cx); ctx.lineTo(cx + Math.cos(sweep) * R, cx + Math.sin(sweep) * R); ctx.stroke();
    }

    // contacts
    contacts.forEach(c => {
      const p = pos(c), col = c.hw ? CYAN : AMBER, isHover = hover === c;
      const a = reduced ? 1 : Math.max(.28, c.glow);
      if (isHover) {
        ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 1;
        const s = 11;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
          ctx.beginPath(); ctx.moveTo(p.x + sx * s, p.y + sy * (s - 5)); ctx.lineTo(p.x + sx * s, p.y + sy * s); ctx.lineTo(p.x + sx * (s - 5), p.y + sy * s); ctx.stroke();
        });
      }
      ctx.fillStyle = `rgba(${col},${isHover ? 1 : a})`;
      ctx.shadowColor = `rgba(${col},.8)`; ctx.shadowBlur = isHover ? 14 : 8 * a;
      ctx.beginPath();
      if (c.active) { ctx.rect(p.x - 3.5, p.y - 3.5, 7, 7); } else { ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); }
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(${INK},${isHover ? .95 : .25 + a * .4})`; ctx.font = '9.5px "IBM Plex Mono", monospace';
      ctx.fillText(c.code, p.x + 8, p.y - 7);
    });
    // center
    ctx.fillStyle = `rgba(${INK},.8)`; ctx.beginPath(); ctx.arc(cx, cx, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(64, t - last); last = t;
    const prev = sweep;
    sweep += dt * .0011;
    const norm = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    contacts.forEach(c => {
      const d = norm(c.angle - prev), step = norm(sweep - prev);
      if (d <= step) c.glow = 1;
      c.glow = Math.max(0, c.glow - dt * .00035);
    });
    draw();
    requestAnimationFrame(frame);
  }

  function pick(e) {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 18;
    contacts.forEach(c => { const p = pos(c), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = c; } });
    return best;
  }
  cv.addEventListener('pointermove', e => {
    hover = pick(e);
    cv.style.cursor = hover ? 'pointer' : 'crosshair';
    if (hover) {
      const p = pos(hover);
      tip.innerHTML = `<small>${hover.code} · ${hover.active ? 'IN PROGRESS' : 'NOMINAL'}</small>${hover.title}`;
      tip.hidden = false;
      const flip = p.x > size * .55;
      tip.style.left = p.x + 'px'; tip.style.top = p.y + 'px';
      tip.style.transform = flip ? 'translate(calc(-100% - 14px),-50%)' : 'translate(14px,-50%)';
    } else tip.hidden = true;
    if (reduced) draw();
  });
  cv.addEventListener('pointerleave', () => { hover = null; tip.hidden = true; if (reduced) draw(); });
  cv.addEventListener('click', e => { const c = pick(e); if (c) openCase(c.op); });

  addEventListener('resize', resize);
  resize();
  if (document.fonts) document.fonts.ready.then(() => reduced && draw());
  if (!reduced) requestAnimationFrame(frame); else draw();
})();

/* ---------- Console ---------- */
(() => {
  const out = $('#termOut'), form = $('#termForm'), input = $('#termInput');
  const history = []; let hi = 0;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const print = (html, cls = '') => { const p = document.createElement('p'); if (cls) p.className = cls; p.innerHTML = html; out.appendChild(p); out.scrollTop = out.scrollHeight; };

  const cmds = {
    help: () => print([
      '<b>whoami</b>        identity record',
      '<b>experience</b>    mission log',
      '<b>projects</b>      list case files',
      '<b>open</b> &lt;code&gt;   open a case file (e.g. open hw.01)',
      '<b>skills</b>        system capabilities',
      '<b>contact</b>       open channels',
      '<b>resume</b>        open résumé (PDF)',
      '<b>clear</b>         clear console'
    ].join('\n')),
    whoami: () => print('Arian Nouri — B.C.S. candidate, Computer &amp; Internet Security stream, Carleton University (2027).\nClient Support Engineer at DND. Based in Ottawa. EN / FR / FA.'),
    experience: () => print($$('.log-item').map(li => `<b>${esc($('.log-time', li).textContent.trim())}</b>  ${esc($('h3', li).firstChild.textContent.trim())} — ${esc($('h3 span', li).textContent)}`).join('\n')),
    projects: () => print(ops.map(op => `<b>${esc($('.code', op).textContent)}</b>  ${esc($('h3', op).textContent)}  <span class="muted">[${esc($('.status', op).textContent)}]</span>`).join('\n') + '\n\nType <b>open sw.01</b> to view a file.'),
    open: arg => {
      const op = ops.find(o => $('.code', o).textContent.toLowerCase() === (arg || '').toLowerCase());
      if (!op) return print(`open: no case file "${esc(arg || '')}". Try <b>projects</b>.`, 'err');
      print(`opening ${esc($('.code', op).textContent)}…`); openCase(op);
    },
    skills: () => print($$('.cap').map(c => `<b>${esc($('.panel-head span', c).textContent)}</b>  ${$$('li', c).map(l => esc(l.textContent)).join(', ')}`).join('\n')),
    contact: () => print('email     <a href="mailto:arinouri.cs@gmail.com">arinouri.cs@gmail.com</a>\nlinkedin  <a href="https://linkedin.com/in/arinouri" target="_blank" rel="noopener">linkedin.com/in/arinouri</a>\ngithub    <a href="https://github.com/arinouri" target="_blank" rel="noopener">github.com/arinouri</a>'),
    resume: () => { print('opening RESUMEarinouri.pdf…'); window.open('RESUMEarinouri.pdf', '_blank', 'noopener'); },
    clear: () => { out.innerHTML = ''; },
    sudo: () => print('sudo: permission denied. This incident will be reported. (Kidding — try <b>contact</b>.)', 'err'),
    ls: () => print('experience/  projects/  skills/  contact/  RESUMEarinouri.pdf'),
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const raw = input.value.trim(); input.value = '';
    if (!raw) return;
    history.push(raw); hi = history.length;
    print(esc(raw), 'cmd');
    const [name, ...args] = raw.split(/\s+/);
    const fn = cmds[name.toLowerCase()];
    fn ? fn(args.join(' ')) : print(`command not found: ${esc(name)}. Type <b>help</b>.`, 'err');
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hi > 0) { input.value = history[--hi]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; e.preventDefault(); }
  });
  $('#term').addEventListener('click', e => { if (!e.target.closest('a')) input.focus({ preventScroll: true }); });
})();
