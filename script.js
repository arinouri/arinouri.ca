// === Theme Helper ===
function getCSSVariable(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// === Loader Finish ===
window.addEventListener('load', () => {
  document.body.classList.remove('loading');
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
});

// === Canvas Particle Background ===
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;

let points = Array.from({length: 240}, () => ({
  x: Math.random() * bgCanvas.width,
  y: Math.random() * bgCanvas.height,
  vx: Math.random() * 0.5 - 0.25,
  vy: Math.random() * 0.5 - 0.25
}));

let mouse = { x: null, y: null };
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function drawBG() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  const textColor = getCSSVariable('--text') || '#000';

  for (let p of points) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x <= 0 || p.x >= bgCanvas.width) p.vx *= -1;
    if (p.y <= 0 || p.y >= bgCanvas.height) p.vy *= -1;

    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    bgCtx.fillStyle = '#aaa';
    bgCtx.fill();

    for (let q of points) {
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (dist < 100) {
        bgCtx.beginPath();
        bgCtx.moveTo(p.x, p.y);
        bgCtx.lineTo(q.x, q.y);
        bgCtx.lineWidth = 1.5;
        bgCtx.strokeStyle = `rgba(150,150,150,${1 - dist / 100})`;
        bgCtx.stroke();
      }
    }

    if (mouse.x && mouse.y) {
      const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (dist < 120) {
        bgCtx.beginPath();
        bgCtx.moveTo(p.x, p.y);
        bgCtx.lineTo(mouse.x, mouse.y);
        bgCtx.lineWidth = 3;
        bgCtx.strokeStyle = `rgba(${textColor === '#f0f0f0' ? '255,255,255' : '0,0,0'},${1 - dist / 120})`;
        bgCtx.stroke();
      }
    }
  }

  requestAnimationFrame(drawBG);
}
drawBG();

// === Three.js Scene ===
let scene, camera, renderer, mesh, textSprite, material;

function initThree() {
  const container = document.getElementById('three-container');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 4;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.IcosahedronGeometry(1.5, 2);
  material = new THREE.MeshBasicMaterial({
    color: getMeshColor(),
    wireframe: true
  });
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
  ctx.fillText('Arian Nouri | Digital Portfolio', canvas.width/2, 150);

  const texture = new THREE.CanvasTexture(canvas);
  textSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  textSprite.scale.set(4, 1, 1);
  scene.add(textSprite);

  animate();
}

function getMeshColor() {
  return document.body.classList.contains('dark-mode') ? 0xff4444 : 0x66faff;
}

function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.002;
  mesh.rotation.y += 0.003;
  renderer.render(scene, camera);
}

initThree();



// === Scroll Navigation ===
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#quick-links button').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const topBtn = document.getElementById("back-to-top");
  window.addEventListener("scroll", () => {
    topBtn.style.display = window.scrollY > 400 ? "block" : "none";
  });
  topBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// === Reveal Sections on Scroll ===
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.3 });

document.querySelectorAll('section').forEach(sec => observer.observe(sec));

// === Responsive Resize ===
window.addEventListener('resize', () => {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Weather App ===
async function getWeather() {
  const city = document.getElementById('city-input').value;
  const result = document.getElementById('weather-result');
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=21b6a70572599fbe507792676b064cff&units=metric`);
    const data = await res.json();
    result.innerHTML = res.ok
      ? `<p>${data.name}: ${data.weather[0].description}, ${data.main.temp}°C</p>`
      : `<p>Error: ${data.message}</p>`;
  } catch (err) {
    result.innerHTML = `<p>Error fetching data.</p>`;
  }
}

// === Password Strength Checker ===
document.addEventListener('DOMContentLoaded', () => {
  const field = document.getElementById('password-field');
  const text = document.getElementById('strength-text');
  const bar = document.getElementById('strength-bar');
  const toggle = document.getElementById('toggle-password-btn');

  field?.addEventListener('input', () => {
    let val = field.value, score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[@$!%*?&#]/.test(val)) score++;

    const colors = ['red', 'orange', 'yellow', 'blue', 'green'];
    const labels = ['Weak', 'Moderate', 'Good', 'Strong', 'Very Strong'];

    text.textContent = labels[score - 1] || 'None';
    bar.style.backgroundColor = colors[score - 1] || 'red';
    bar.style.width = `${score * 20}%`;
  });

  toggle?.addEventListener('click', () => {
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide Password' : 'Show Password';
  });
});


// === Cybersecurity Tip Logic ===
function validateInput() {
  const input = document.getElementById("inputValidationExample").value;
  const sanitized = input.replace(/[&<>"'/]/g, c => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c];
  });
  document.getElementById("validationOutput").textContent = "Sanitized Input: " + sanitized;
}

function hashPassword() {
  const password = document.getElementById("passwordExample").value;
  const hashed = CryptoJS.SHA256(password).toString();
  document.getElementById("hashOutput").textContent = "Hashed Password: " + hashed;
}

// === Fix title color change (Three.js Sprite)
function updateTextSprite() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000';
  ctx.fillText('Arian Nouri | Digital Portfolio', canvas.width / 2, 150);
  const texture = new THREE.CanvasTexture(canvas);
  textSprite.material.map = texture;
  textSprite.material.needsUpdate = true;
}

document.getElementById('mode-toggle').addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
  material.color.set(getMeshColor());
  updateTextSprite(); // fix for title color
});





