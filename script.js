// === Theme Helper ===
function getCSSVariable(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// === Background Canvas Animation ===
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;

let points = [];
for (let i = 0; i < 240; i++) {
  points.push({
    x: Math.random() * bgCanvas.width,
    y: Math.random() * bgCanvas.height,
    vx: Math.random() * 0.5 - 0.25,
    vy: Math.random() * 0.5 - 0.25,
  });
}

let mouse = { x: null, y: null };
window.addEventListener('mousemove', (e) => {
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

// === Three.js Central Shape ===
let scene, camera, renderer, mesh, textSprite, material;

function initThree() {
  const container = document.getElementById('three-container');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 4;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.IcosahedronGeometry(1.5, 2);
  material = new THREE.MeshBasicMaterial({
    color: getMeshColor(),
    wireframe: true,
    wireframeLinewidth: 4,
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;
  updateTextColor(ctx);
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Arian Nouri | Digital Portfolio', canvas.width / 2, 150);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  textSprite = new THREE.Sprite(spriteMaterial);
  textSprite.scale.set(4, 1, 1);
  scene.add(textSprite);

  animate();
}

function getMeshColor() {
  return document.body.classList.contains('dark-mode') ? 0xff4444 : 0x66faff;
}

function updateTextColor(ctx) {
  ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000';
}

function updateTextSprite() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;
  updateTextColor(ctx);
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Arian Nouri | Digital Portfolio', canvas.width / 2, 150);
  const texture = new THREE.CanvasTexture(canvas);
  textSprite.material.map = texture;
  textSprite.material.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.002;
  mesh.rotation.y += 0.003;
  renderer.render(scene, camera);
}

initThree();

// === Mode Toggle ===
document.getElementById('mode-toggle').addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
  material.color.set(getMeshColor());
  updateTextSprite();
});

// === Quick Scroll Buttons ===
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('#quick-links button');
  links.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });

// === Back-to-Top Button Behavior ===
const topButton = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  if (window.scrollY > 400) {
    topButton.style.display = "block";
  } else {
    topButton.style.display = "none";
  }
});

topButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
});

// === Reveal on Scroll ===
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
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
