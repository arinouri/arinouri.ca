const $ = (sel, root=document) => root.querySelector(sel);

function isDarkMode(){
  return document.body.classList.contains('dark-mode');
}
function setPill(el, state){
  if(!el) return;
  el.textContent = state;
  el.style.borderColor = state === "OK" ? "rgba(45,255,160,.35)" : "rgba(255,77,77,.35)";
  el.style.background = state === "OK" ? "rgba(45,255,160,.12)" : "rgba(255,77,77,.10)";
}

// Loader
window.addEventListener('load', () => {
  document.body.classList.remove('loading');
  const loader = $('#loader');
  if (loader) loader.style.display = 'none';
});

// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const y = $('#yearNow');
  if (y) y.textContent = String(new Date().getFullYear());
});

// Background particles
const bgCanvas = $('#bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

function resizeBG(){
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBG();

let mouse = { x:null, y:null };
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

let points = Array.from({length: 220}, () => ({
  x: Math.random() * bgCanvas.width,
  y: Math.random() * bgCanvas.height,
  vx: (Math.random() * 0.5 - 0.25),
  vy: (Math.random() * 0.5 - 0.25),
}));

function drawBG(){
  bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);

  for(let i=0;i<points.length;i++){
    const p = points[i];
    p.x += p.vx; p.y += p.vy;
    if(p.x<=0 || p.x>=bgCanvas.width) p.vx *= -1;
    if(p.y<=0 || p.y>=bgCanvas.height) p.vy *= -1;

    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, 1.7, 0, Math.PI*2);
    bgCtx.fillStyle = isDarkMode() ? 'rgba(215,255,230,0.45)' : 'rgba(8,17,12,0.30)';
    bgCtx.fill();

    for(let j=i+1;j<points.length;j++){
      const q = points[j];
      const dx = p.x - q.x, dy = p.y - q.y;
      const dist = Math.hypot(dx, dy);
      if(dist < 110){
        bgCtx.beginPath();
        bgCtx.moveTo(p.x, p.y);
        bgCtx.lineTo(q.x, q.y);
        bgCtx.lineWidth = 1;
        bgCtx.strokeStyle = isDarkMode()
          ? `rgba(45,255,160,${0.18*(1-dist/110)})`
          : `rgba(10,165,107,${0.16*(1-dist/110)})`;
        bgCtx.stroke();
      }
    }

    if(mouse.x && mouse.y){
      const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if(dist < 140){
        bgCtx.beginPath();
        bgCtx.moveTo(p.x, p.y);
        bgCtx.lineTo(mouse.x, mouse.y);
        bgCtx.lineWidth = 2;
        bgCtx.strokeStyle = isDarkMode()
          ? `rgba(215,255,230,${0.18*(1-dist/140)})`
          : `rgba(10,165,107,${0.18*(1-dist/140)})`;
        bgCtx.stroke();
      }
    }
  }

  requestAnimationFrame(drawBG);
}
drawBG();

// Three.js globe background
let scene, camera, renderer, mesh, material, textSprite;

function meshColor(){
  return isDarkMode() ? 0x2dff9a : 0x0aa56b;
}
function titleColor(){
  return isDarkMode() ? 'rgba(215,255,230,0.85)' : 'rgba(8,17,12,0.85)';
}

function makeTitleSprite(){
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1024; canvas.height = 256;

  ctx.font = '700 44px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor();
  ctx.fillText('ARIAN NOURI // DASHBOARD', canvas.width/2, 150);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, opacity:0.75 }));
  sprite.scale.set(4.4, 1.1, 1);
  sprite.position.set(0, -2.2, 0);
  return sprite;
}

function initThree(){
  const container = $('#three-container');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 4;

  renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.IcosahedronGeometry(1.7, 2);
  material = new THREE.MeshBasicMaterial({
    color: meshColor(),
    wireframe: true,
    transparent:true,
    opacity:0.85
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  textSprite = makeTitleSprite();
  scene.add(textSprite);

  animateThree();
}

function animateThree(){
  requestAnimationFrame(animateThree);
  mesh.rotation.x += 0.0018;
  mesh.rotation.y += 0.0024;
  renderer.render(scene, camera);
}

function refreshThreeTheme(){
  if(material) material.color.set(meshColor());
  if(textSprite){
    scene.remove(textSprite);
    textSprite = makeTitleSprite();
    scene.add(textSprite);
  }
}

initThree();

// Resize
window.addEventListener('resize', () => {
  resizeBG();
  if(camera && renderer){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// Theme toggle
$('#mode-toggle')?.addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
  refreshThreeTheme();
});

// Modal system
const overlay = $('#overlay');
const modalTitle = $('#modalTitle');
const modalBody = $('#modalBody');
const closeModalBtn = $('#closeModal');

function openPanel(templateId){
  const tpl = document.getElementById(templateId);
  if(!tpl) return;

  const title = tpl.getAttribute('data-title') || 'Module';
  modalTitle.textContent = title;

  modalBody.innerHTML = '';
  modalBody.appendChild(tpl.content.cloneNode(true));

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  bindInjectedWidgets();

  if(templateId === 'panel-security') updateSecuritySnapshot();
  if(templateId === 'panel-tools') bootTerminalIfNeeded();
}

function closeModal(){
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  modalBody.innerHTML = '';
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.app-open');
  if(btn){
    const panel = btn.getAttribute('data-panel');
    if(panel) openPanel(panel);
  }
});

closeModalBtn?.addEventListener('click', closeModal);

overlay?.addEventListener('click', (e) => {
  if(e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
});

// Injected widgets
function bindInjectedWidgets(){
  // Weather
  const weatherBtn = $('#weatherBtn', modalBody);
  if(weatherBtn) weatherBtn.onclick = () => getWeather();

  // Hash
  const hashBtn = $('#hashBtn', modalBody);
  if(hashBtn){
    hashBtn.onclick = () => {
      const input = $('#passwordExample', modalBody)?.value ?? '';
      const out = $('#hashOutput', modalBody);
      if(out) out.textContent = input ? `SHA-256: ${CryptoJS.SHA256(input).toString()}` : 'Enter text first.';
    };
  }

  // Password strength
  const field = $('#password-field', modalBody);
  const text = $('#strength-text', modalBody);
  const bar = $('#strength-bar', modalBody);
  const toggle = $('#toggle-password-btn', modalBody);

  if(field && text && bar){
    field.addEventListener('input', () => {
      const val = field.value;
      let score = 0;
      if(val.length >= 8) score++;
      if(/[A-Z]/.test(val)) score++;
      if(/[a-z]/.test(val)) score++;
      if(/[0-9]/.test(val)) score++;
      if(/[@$!%*?&#]/.test(val)) score++;

      const labels = ['Weak','Moderate','Good','Strong','Very Strong'];
      text.textContent = labels[score-1] || 'None';

      const colors = ['#ff4d4d','#ffb84d','#ffe14d','#2dd4ff','#2dff9a'];
      bar.style.backgroundColor = colors[score-1] || colors[0];
      bar.style.width = `${score * 20}%`;
    });
  }

  if(toggle && field){
    toggle.onclick = () => {
      const show = field.type === 'password';
      field.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide Password' : 'Show Password';
    };
  }

  // Sanitizer demo (safe-rendering concept)
  const sanitizeBtn = $('#sanitizeBtn', modalBody);
  if(sanitizeBtn){
    sanitizeBtn.onclick = () => {
      const input = $('#sanitizeInput', modalBody)?.value ?? '';
      const out = $('#sanitizeOutput', modalBody);
      if(!out) return;

      // Escape HTML (safe rendering)
      const escaped = input
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll("'","&#039;");

      out.textContent = escaped || '(empty)';
    };
  }

  // Terminal
  const runBtn = $('#mini-run', modalBody);
  const cmdInput = $('#mini-cmd', modalBody);
  if(runBtn && cmdInput){
    runBtn.onclick = () => {
      runMiniCmd(cmdInput.value);
      cmdInput.value = '';
      cmdInput.focus();
    };
    cmdInput.onkeydown = (e) => {
      if(e.key === 'Enter'){
        runMiniCmd(cmdInput.value);
        cmdInput.value = '';
      }
    };
  }
}

// Weather
async function getWeather(){
  const cityInput = $('#city-input', modalBody);
  const result = $('#weather-result', modalBody);
  if(!cityInput || !result) return;

  const city = cityInput.value.trim();
  if(!city){
    result.textContent = 'Enter a city name first.';
    return;
  }

  try{
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=21b6a70572599fbe507792676b064cff&units=metric`);
    const data = await res.json();
    if(res.ok){
      result.textContent = `${data.name}: ${data.weather?.[0]?.description ?? '—'}, ${data.main?.temp ?? '?'}°C`;
    }else{
      result.textContent = `Error: ${data.message || 'Failed to fetch weather.'}`;
    }
  }catch{
    result.textContent = 'Error fetching data.';
  }
}

// Security Snapshot
function tipLine(text){
  const box = $('#secTips', modalBody);
  if(!box) return;
  const div = document.createElement('div');
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function updateSecuritySnapshot(){
  const online = navigator.onLine;
  const https = location.protocol === 'https:';
  const secureContext = window.isSecureContext;
  const cookies = navigator.cookieEnabled;

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const type = conn?.effectiveType || conn?.type || 'unknown';
  const down = typeof conn?.downlink === 'number' ? `${conn.downlink.toFixed(1)} Mbps` : 'unknown';

  const dnt = (navigator.doNotTrack === '1' || window.doNotTrack === '1') ? 'ON' : 'OFF';
  const lang = navigator.language || 'unknown';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';

  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

  setText('netOnline', online ? 'YES' : 'NO');
  setText('netType', String(type).toUpperCase());
  setText('netDown', down);

  setText('secHttps', https ? 'YES' : 'NO');
  setText('secContext', secureContext ? 'YES' : 'NO');
  setText('secCookies', cookies ? 'ENABLED' : 'DISABLED');

  setText('privDnt', dnt);
  setText('privLang', lang);
  setText('privTz', tz);

  setPill(document.getElementById('netPill'), online ? 'OK' : 'CHECK');
  setPill(document.getElementById('secPill'), (https && secureContext) ? 'OK' : 'CHECK');

  const tipsBox = $('#secTips', modalBody);
  if(tipsBox) tipsBox.innerHTML = '';

  tipLine('AUTO CHECKS:');
  tipLine(`- Transport: ${https ? 'HTTPS' : 'NOT HTTPS'}`);
  tipLine(`- Secure Context: ${secureContext ? 'YES' : 'NO'}`);
  tipLine(`- Connection: ${online ? 'ONLINE' : 'OFFLINE'} • ${String(type).toUpperCase()} • ${down}`);
  tipLine('—');

  if(!https) tipLine('RECOMMEND: Use HTTPS for any login/forms. Avoid sending secrets over HTTP.');
  else tipLine('GOOD: HTTPS detected. Transport is encrypted in transit.');

  if(!secureContext) tipLine('NOTE: Some security APIs require Secure Context (HTTPS).');
  else tipLine('GOOD: Secure Context enabled.');

  if(String(type).includes('2g')) tipLine('TIP: Slow network detected. Prefer smaller payloads + offline-friendly UX.');
  if(!online) tipLine('TIP: Offline detected. Consider caching and graceful fallbacks.');

  if(!cookies) tipLine('INFO: Cookies disabled. Sessions may fail on some apps; prefer token-based auth where appropriate.');

  if(dnt === 'ON') tipLine('PRIVACY: DNT is ON. Respect privacy signals in telemetry design.');
  else tipLine('PRIVACY: DNT is OFF. Collect minimal telemetry and document it.');

  tipLine('—');
  tipLine('Recruiter note: This demonstrates security awareness + responsible interpretation of client-side signals.');
}

// Mini terminal (now lives inside Live Tools)
function termOut(){
  return $('#mini-terminal', modalBody);
}
function termWrite(line, dim=false){
  const out = termOut();
  if(!out) return;
  const div = document.createElement('div');
  div.style.color = dim ? 'rgba(215,255,230,0.70)' : '';
  div.textContent = line;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

let terminalBooted = false;
const bootTime = Date.now();

function bootTerminalIfNeeded(){
  const out = termOut();
  if(!out) return;
  if(terminalBooted) return;
  terminalBooted = true;
  termWrite('BOOT // TACTICAL INTERFACE', true);
  termWrite('LINK: CHANNEL READY', true);
  termWrite("TYPE 'help' FOR COMMANDS", true);
  termWrite('—', true);
}

function fmtUptime(){
  const t = Math.floor((Date.now() - bootTime)/1000);
  const hh = String(Math.floor(t/3600)).padStart(2,'0');
  const mm = String(Math.floor((t%3600)/60)).padStart(2,'0');
  const ss = String(t%60).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}

function runMiniCmd(raw){
  const cmd = (raw || '').trim();
  if(!cmd) return;

  bootTerminalIfNeeded();
  termWrite(`OPS> ${cmd}`, true);

  const c = cmd.toLowerCase();

  if(c === 'help'){
    termWrite('COMMANDS:');
    termWrite(' - scan     : environment scan');
    termWrite(' - status   : uptime + secure context');
    termWrite(' - ping     : heartbeat');
    termWrite(' - clear    : wipe terminal');
    termWrite(' - advice   : quick security tips');
    return;
  }

  if(c === 'clear'){
    const out = termOut();
    if(out) out.innerHTML = '';
    terminalBooted = false;
    bootTerminalIfNeeded();
    return;
  }

  if(c === 'ping'){
    termWrite('PING .... OK (42ms)');
    return;
  }

  if(c === 'status'){
    termWrite(`UPTIME: ${fmtUptime()}`);
    termWrite(`MODE: ${isDarkMode() ? 'DARK' : 'LIGHT'}`);
    termWrite(`HTTPS: ${location.protocol === 'https:' ? 'YES' : 'NO'}`);
    termWrite(`SECURE CONTEXT: ${window.isSecureContext ? 'YES' : 'NO'}`);
    return;
  }

  if(c === 'advice'){
    termWrite('TIPS:');
    termWrite('- Use unique 12+ char passwords + MFA');
    termWrite('- Keep software updated');
    termWrite('- Verify links before login');
    termWrite('- Prefer HTTPS + avoid public Wi-Fi for sensitive tasks');
    return;
  }

  if(c === 'scan'){
    termWrite('SCAN INITIATED...');
    setTimeout(() => termWrite('• RENDER: ACTIVE'), 200);
    setTimeout(() => termWrite('• HUD GRID: ACTIVE'), 380);
    setTimeout(() => termWrite('• TOOLS: READY'), 560);
    setTimeout(() => termWrite('SCAN COMPLETE // STATUS NOMINAL'), 820);
    return;
  }

  termWrite("UNKNOWN COMMAND. TYPE 'help'.");
}
