  // Theme + Intro
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.getElementById('intro-overlay').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('intro-overlay').style.display = 'none';
      }, 1500);
    }, 2000);
  });
  
  function getCSSVariable(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }
  
  // Background
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  
  let points = [];
  for (let i = 0; i < 100; i++) {
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
    const color = getCSSVariable('--text');
  
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
          bgCtx.strokeStyle = `rgba(255,255,255,${1 - dist / 120})`;
          bgCtx.stroke();
        }
      }
    }
  
    requestAnimationFrame(drawBG);
  }
  drawBG();
  
  // Central UI
  const uiCanvas = document.getElementById('ui-canvas');
  const uiCtx = uiCanvas.getContext('2d');
  uiCanvas.width = window.innerWidth;
  uiCanvas.height = window.innerHeight;
  
  const center = { x: uiCanvas.width / 2, y: uiCanvas.height / 2 };
  const labels = ['Info', 'Education', 'Experience', 'Skills', 'Projects', 'Cyber', 'Tools', 'Hobbies'];
  let shapeVertices = [];
  
  function initShape() {
    shapeVertices = labels.map(label => ({ label, x: 0, y: 0 }));
  }
  initShape();
  
  function drawUI() {
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    const textColor = getCSSVariable('--text');
    const now = Date.now() / 500;
    const radius = 220;
  
    shapeVertices.forEach((v, i) => {
      const angle = (Math.PI * 2 / shapeVertices.length) * i + Math.sin(now + i) * 0.15;
      const r = radius + Math.sin(now + i) * 10;
      v.x = center.x + r * Math.cos(angle);
      v.y = center.y + r * Math.sin(angle);
    });
  
    // Polygon lines
    uiCtx.beginPath();
    shapeVertices.forEach((v, i) => {
      if (i === 0) uiCtx.moveTo(v.x, v.y);
      else uiCtx.lineTo(v.x, v.y);
    });
    uiCtx.closePath();
    uiCtx.strokeStyle = textColor;
    uiCtx.stroke();
  
    // Dots and labels
    shapeVertices.forEach((v, i) => {
      uiCtx.beginPath();
      uiCtx.moveTo(center.x, center.y);
      uiCtx.lineTo(v.x, v.y);
      uiCtx.stroke();
  
      uiCtx.beginPath();
      uiCtx.arc(v.x, v.y, 6, 0, Math.PI * 2);
      uiCtx.fillStyle = '#66faff';
      uiCtx.fill();
  
      uiCtx.font = '14px Arial';
      uiCtx.fillStyle = textColor;
      uiCtx.textAlign = 'center';
      uiCtx.fillText(v.label, v.x, v.y - 12);
    });
  
    requestAnimationFrame(drawUI);
  }
  drawUI();
  
  uiCanvas.addEventListener('click', (e) => {
    const x = e.clientX;
    const y = e.clientY;
  
    shapeVertices.forEach((v) => {
      if (Math.hypot(v.x - x, v.y - y) < 20) {
        const target = document.getElementById(v.label.toLowerCase());
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
  
  // Animate sections on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const id = entry.target.id;
        document.querySelectorAll('#sidebar a').forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3 });
  
  document.querySelectorAll('section').forEach(sec => observer.observe(sec));
  
  // Sidebar Nav Setup
  const sidebar = document.createElement('div');
  sidebar.id = 'sidebar';
  document.body.appendChild(sidebar);
  
  labels.forEach(label => {
    const link = document.createElement('a');
    link.href = `#${label.toLowerCase()}`;
    link.textContent = label;
    link.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(label.toLowerCase()).scrollIntoView({ behavior: 'smooth' });
    });
    sidebar.appendChild(link);
  });
  
  // Resize
  window.addEventListener('resize', () => {
    bgCanvas.width = uiCanvas.width = window.innerWidth;
    bgCanvas.height = uiCanvas.height = window.innerHeight;
    center.x = uiCanvas.width / 2;
    center.y = uiCanvas.height / 2;
    initShape();
  });
  

  // new

  