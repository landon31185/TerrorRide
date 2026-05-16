const POLLS = [
  { id: 'species', q: 'Are we fucked as a species?',
    a: ["We're so fucked", 'Hardcore til I die', 'We will have to see'] },
  { id: 'quiet',   q: 'Should bands play quieter out of respect for the neighborhood?',
    a: ['Be considerate', "That's what the noise complaint page is for", 'File it at terrorride.com/noise'] },
];

document.addEventListener('DOMContentLoaded', function () {
  initShaderBackground();
  initCursorTrail();
  initPoll();
  initPollResults();
  initMenu();
  initScrollReveal();
  initGeolocation();
  initLogoBleed();
});

// ─── Pop-up poll ──────────────────────────────────────────────────
function initPoll() {
  if (sessionStorage.getItem('tr_poll_done')) return;

  const poll = POLLS[Math.floor(Math.random() * POLLS.length)];

  const overlay = document.createElement('div');
  overlay.id = 'poll-overlay';
  overlay.innerHTML = `
    <div id="poll-modal">
      <button id="poll-close" aria-label="Close">×</button>
      <p id="poll-q">${poll.q}</p>
      <div id="poll-answers">
        ${poll.a.map((a, i) => `<button class="poll-btn" data-i="${i}">${a}</button>`).join('')}
      </div>
      <div id="poll-results" hidden></div>
      <p id="poll-total"></p>
    </div>`;
  document.body.appendChild(overlay);

  const show = () => requestAnimationFrame(() => overlay.classList.add('visible'));
  const hide = () => {
    overlay.classList.remove('visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  };

  document.getElementById('poll-close').addEventListener('click', () => {
    sessionStorage.setItem('tr_poll_done', '1');
    hide();
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { sessionStorage.setItem('tr_poll_done', '1'); hide(); }
  });

  overlay.querySelectorAll('.poll-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const answer = parseInt(btn.dataset.i);
      sessionStorage.setItem('tr_poll_done', '1');
      overlay.querySelectorAll('.poll-btn').forEach(b => b.disabled = true);
      try {
        const res = await fetch('/api/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: poll.id, answer }),
        });
        const { counts } = await res.json();
        showResults(counts, answer);
      } catch { hide(); }
    });
  });

  function showResults(counts, votedIdx) {
    const total = counts.reduce((a, b) => a + b, 0);
    document.getElementById('poll-answers').hidden = true;
    const resultsEl = document.getElementById('poll-results');
    resultsEl.hidden = false;
    resultsEl.innerHTML = poll.a.map((a, i) => {
      const pct = total ? Math.round(counts[i] / total * 100) : 0;
      return `<div class="poll-result-row">
        <span class="poll-result-label">${a}</span>
        <span class="poll-result-pct">${pct}%</span>
        <div class="poll-bar-wrap"><div class="poll-bar${i === votedIdx ? ' voted' : ''}" data-pct="${pct}"></div></div>
      </div>`;
    }).join('');
    document.getElementById('poll-total').textContent = `${total} vote${total !== 1 ? 's' : ''}`;
    requestAnimationFrame(() => {
      overlay.querySelectorAll('.poll-bar').forEach(b => { b.style.width = b.dataset.pct + '%'; });
    });
  }

  setTimeout(show, 12000);
}

// ─── Song request form ───────────────────────────────────────────
(function () {
  const form = document.getElementById('song-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('song-status');
    const btn    = form.querySelector('.song-submit-btn');
    const data   = Object.fromEntries(new FormData(form));
    btn.disabled = true;
    status.className = 'song-request-note';
    status.textContent = 'Submitting...';
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        status.className = 'song-request-note success';
        status.textContent = 'Received. Don\'t get excited.';
        form.reset();
      } else {
        throw new Error();
      }
    } catch {
      status.className = 'song-request-note error';
      status.textContent = 'Something went wrong. Try again.';
      btn.disabled = false;
    }
  });
})();

// ─── Homepage poll results ────────────────────────────────────────
function initPollResults() {
  const qEl    = document.getElementById('hp-poll-q');
  const barsEl = document.getElementById('hp-poll-bars');
  const totEl  = document.getElementById('hp-poll-total');
  if (!qEl) return;

  const weekNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const poll = POLLS[weekNum % POLLS.length];

  qEl.textContent = poll.q;

  fetch(`/api/poll?id=${poll.id}`)
    .then(r => r.json())
    .then(({ counts }) => {
      const total = counts.reduce((a, b) => a + b, 0);
      barsEl.innerHTML = poll.a.map((a, i) => {
        const pct = total ? Math.round(counts[i] / total * 100) : 0;
        return `<div class="hp-poll-row">
          <span class="hp-poll-label">${a}</span>
          <span class="hp-poll-pct">${pct}%</span>
          <div class="hp-bar-wrap"><div class="hp-bar" data-pct="${pct}"></div></div>
        </div>`;
      }).join('');
      totEl.textContent = total ? `${total} vote${total !== 1 ? 's' : ''} so far` : 'No votes yet — be the first.';
      requestAnimationFrame(() => {
        barsEl.querySelectorAll('.hp-bar').forEach(b => { b.style.width = b.dataset.pct + '%'; });
      });
    })
    .catch(() => { qEl.closest('.hp-poll-section').style.display = 'none'; });
}

// ─── Fire ember cursor trail (desktop only) ──────────────────────
function initCursorTrail() {
  if ('ontouchstart' in window && !window.matchMedia('(hover: hover)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();

  const particles = [];
  const MAX = 200;

  function spawn(x, y, count, burst) {
    for (let i = 0; i < count && particles.length < MAX; i++) {
      const angle = burst ? Math.random() * Math.PI * 2 : 0;
      const speed = burst ? Math.random() * 4 + 1 : 0;
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: burst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 1.0,
        vy: burst ? Math.sin(angle) * speed : -(Math.random() * 1.8 + 0.4),
        life: 1.0,
        decay: burst ? 0.035 + Math.random() * 0.025 : 0.018 + Math.random() * 0.018,
        size: burst ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2,
      });
    }
  }

  window.addEventListener('mousemove', e => spawn(e.clientX, e.clientY, 3, false));
  window.addEventListener('mousedown', e => spawn(e.clientX, e.clientY, 18, true));

  function lerp(a, b, t) { return a + (b - a) * t; }

  function render() {
    requestAnimationFrame(render);
    if (document.hidden) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy -= 0.04;
      p.life -= p.decay;
      p.size *= 0.975;
      if (p.life <= 0 || p.size < 0.3) { particles.splice(i, 1); continue; }

      let r, g, b;
      if (p.life > 0.65) {
        const t = (p.life - 0.65) / 0.35;
        r = 255; g = Math.floor(lerp(140, 240, t)); b = Math.floor(lerp(0, 160, t));
      } else if (p.life > 0.3) {
        const t = (p.life - 0.3) / 0.35;
        r = 255; g = Math.floor(lerp(20, 140, t)); b = 0;
      } else {
        const t = p.life / 0.3;
        r = Math.floor(lerp(60, 255, t)); g = 0; b = 0;
      }

      ctx.save();
      ctx.globalAlpha = p.life * 0.9;
      ctx.shadowColor  = `rgb(${r},${g},${b})`;
      ctx.shadowBlur   = 8;
      ctx.fillStyle    = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  render();
}

// ─── Lava crack shader background ────────────────────────────────
function initShaderBackground() {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  document.body.insertBefore(canvas, document.body.firstChild);

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) { canvas.remove(); return; }

  const VS = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FS = `
    precision mediump float;
    uniform float u_time;
    uniform vec2  u_res;

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
      return fract(sin(p) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f*f*(3.0-2.0*f);
      float a = fract(sin(dot(i,           vec2(127.1,311.7)))*43758.5453);
      float b = fract(sin(dot(i+vec2(1,0), vec2(127.1,311.7)))*43758.5453);
      float c = fract(sin(dot(i+vec2(0,1), vec2(127.1,311.7)))*43758.5453);
      float d = fract(sin(dot(i+vec2(1,1), vec2(127.1,311.7)))*43758.5453);
      return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
    }

    float voronoiEdge(vec2 p) {
      vec2 n = floor(p), f = fract(p);
      float d1 = 8.0, d2 = 8.0;
      for (int j=-2; j<=2; j++) {
        for (int i=-2; i<=2; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = 0.5 + 0.5*sin(u_time*0.2 + 6.28318*hash2(n+g));
          vec2 r = g + o - f;
          float d = dot(r,r);
          if (d < d1) { d2=d1; d1=d; } else if (d < d2) { d2=d; }
        }
      }
      return sqrt(d2) - sqrt(d1);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p  = vec2(uv.x * (u_res.x/u_res.y), uv.y);

      float wt   = u_time * 0.08;
      vec2 warp  = vec2(noise(p*1.5+wt), noise(p*1.5+wt+3.7));
      vec2 wp    = p*4.0 + warp*0.5;

      float e1 = voronoiEdge(wp);
      float e2 = voronoiEdge(wp*2.0 + vec2(5.1,3.3));

      float crack1 = 1.0 - smoothstep(0.0, 0.06, e1);
      float glow1  = 1.0 - smoothstep(0.0, 0.22, e1);
      float crack2 = (1.0 - smoothstep(0.0, 0.04, e2)) * 0.5;
      float glow2  = (1.0 - smoothstep(0.0, 0.14, e2)) * 0.3;

      float pulse  = 0.8 + 0.2*sin(u_time*0.35 + wp.x*0.5 + wp.y*0.3);

      vec3 col = vec3(0.04, 0.01, 0.01);
      col += vec3(0.35, 0.04, 0.0) * pow(glow1, 2.0) * pulse * 0.7;
      col += vec3(0.35, 0.04, 0.0) * glow2 * pulse * 0.4;
      col += vec3(1.0,  0.38, 0.0) * crack1 * pulse;
      col += vec3(1.0,  0.82, 0.25)* crack1*crack1 * 0.9;
      col += vec3(1.0,  0.38, 0.0) * crack2 * pulse * 0.6;

      vec2 vd = uv - 0.5;
      col *= clamp(1.0 - dot(vd,vd)*1.8, 0.0, 1.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s); return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog)); canvas.remove(); return;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const posLoc  = gl.getAttribLocation(prog, 'a_pos');
  const timeLoc = gl.getUniformLocation(prog, 'u_time');
  const resLoc  = gl.getUniformLocation(prog, 'u_res');

  function resize() {
    const scale = window.innerWidth < 769 ? 0.5 : 1.0;
    canvas.width  = Math.floor(window.innerWidth  * scale);
    canvas.height = Math.floor(window.innerHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  const t0 = performance.now();
  function render() {
    requestAnimationFrame(render);
    if (document.hidden) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(timeLoc, (performance.now() - t0) * 0.001);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render();
}

// ─── Menu ────────────────────────────────────────────────────────
function initMenu() {
  const hamburger = document.querySelector('.hamburger-container');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', toggleMenu);
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => { document.body.style.overflow = ''; });
    });
  }
}

document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    const video = document.querySelector('.menu-bg-video');
    if (video) video.play();
  }
});

function toggleMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const hamburger  = document.querySelector('.hamburger-container');
  if (!mobileMenu || !hamburger) return;

  mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open');

  const isOpen = mobileMenu.classList.contains('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';

  if (isOpen) {
    const video = mobileMenu.querySelector('.menu-bg-video');
    if (video) video.play();
  }
}

// ─── Scroll reveal ────────────────────────────────────────────────
// CSS scroll-driven animations handle this in Chrome 115+ / Safari 18+.
// IntersectionObserver is the fallback for everything else.
function initScrollReveal() {
  if (CSS.supports('animation-timeline', 'view()')) return;

  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.1 }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Geolocation radar + banner ───────────────────────────────────
const WS_BOUNDS     = { latMin: 47.500, latMax: 47.612, lngMin: -122.445, lngMax: -122.340 };
const GEO_CACHE_KEY = 'tr_local';
const GEO_SHOWN_KEY = 'tr_banner';
const SCAN_MS       = 3200;

function initGeolocation() {
  if (sessionStorage.getItem(GEO_SHOWN_KEY)) return;
  sessionStorage.setItem(GEO_SHOWN_KEY, '1');

  const cached = localStorage.getItem(GEO_CACHE_KEY);
  if (cached !== null) {
    showRadar().then(() => showLocationBanner(cached === 'true'));
    return;
  }

  if (!navigator.geolocation) return;

  // Run radar and geolocation in parallel; show banner when both finish
  let localResult = undefined; // undefined=pending, null=denied, bool=result
  let radarDone   = false;

  function maybeFinish() {
    if (!radarDone || localResult === undefined) return;
    if (localResult !== null) showLocationBanner(localResult);
  }

  showRadar().then(() => { radarDone = true; maybeFinish(); });

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const local =
        coords.latitude  > WS_BOUNDS.latMin && coords.latitude  < WS_BOUNDS.latMax &&
        coords.longitude > WS_BOUNDS.lngMin && coords.longitude < WS_BOUNDS.lngMax;
      localStorage.setItem(GEO_CACHE_KEY, String(local));
      localResult = local;
      maybeFinish();
    },
    () => { localResult = null; dismissRadar(); }
  );
}

function showRadar() {
  const overlay = document.createElement('div');
  overlay.id = 'geo-radar';
  overlay.className = 'radar-overlay';
  overlay.innerHTML = `
    <div class="radar-container">
      <div class="radar-face">
        <div class="radar-ring r1"></div>
        <div class="radar-ring r2"></div>
        <div class="radar-cross h"></div>
        <div class="radar-cross v"></div>
        <div class="radar-sweep"></div>
      </div>
      <div class="radar-coords" id="radar-coords">???.???°N  ???.???°W</div>
      <div class="radar-status" id="radar-status">INITIALIZING</div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('visible')));

  animateCoords();

  const statuses = ['SCANNING...','SIGNAL ACQUIRED','TRIANGULATING...','CROSS-REFERENCING...','ANALYZING...'];
  let si = 0;
  const statusIv = setInterval(() => {
    const el = document.getElementById('radar-status');
    if (!el) { clearInterval(statusIv); return; }
    si = Math.min(si + 1, statuses.length - 1);
    el.textContent = statuses[si];
  }, SCAN_MS / (statuses.length + 1));

  return new Promise(resolve => {
    setTimeout(() => {
      clearInterval(statusIv);
      const el = document.getElementById('radar-status');
      if (el) { el.textContent = 'LOCATION CONFIRMED'; el.style.color = 'var(--green)'; }
      setTimeout(() => {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => { overlay.remove(); resolve(); }, { once: true });
      }, 700);
    }, SCAN_MS);
  });
}

function dismissRadar() {
  const overlay = document.getElementById('geo-radar');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}

function animateCoords() {
  const el = document.getElementById('radar-coords');
  if (!el) return;
  const tLat = 47.563, tLng = -122.387;
  let frame = 0;
  const total = Math.floor(SCAN_MS / 60);

  const iv = setInterval(() => {
    frame++;
    if (!document.getElementById('radar-coords')) { clearInterval(iv); return; }
    const p = Math.min(frame / total, 1);
    if (p < 0.55) {
      el.textContent = `${(40 + Math.random() * 50).toFixed(3)}°N  ${(100 + Math.random() * 80).toFixed(3)}°W`;
    } else if (p < 0.9) {
      const ease = (p - 0.55) / 0.35;
      const lat  = (40 + (tLat - 40) * ease + Math.random() * 4 * (1 - ease)).toFixed(3);
      const lng  = (100 + (Math.abs(tLng) - 100) * ease + Math.random() * 20 * (1 - ease)).toFixed(3);
      el.textContent = `${lat}°N  ${lng}°W`;
    } else {
      el.textContent = `${tLat.toFixed(3)}°N  ${Math.abs(tLng).toFixed(3)}°W`;
      clearInterval(iv);
    }
  }, 60);
}

function showLocationBanner(local) {
  const banner = document.createElement('div');
  banner.className = `location-banner ${local ? 'local' : 'outsider'}`;
  banner.textContent = local ? 'You already know.' : "You're not even from here. Leave.";
  document.body.appendChild(banner);
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('visible')));
  setTimeout(() => {
    banner.classList.remove('visible');
    banner.addEventListener('transitionend', () => banner.remove(), { once: true });
  }, 4500);
}

// ─── Logo blood bleed on tap ──────────────────────────────
function initLogoBleed() {
  const logo = document.querySelector('a.logo-link');
  if (!logo) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99998;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let chunks = [];
  let animId = null;
  let startTime = null;
  const DURATION = 1800;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function splat(ox, oy) {
    chunks = [];

    // Central impact blob — irregular polygon
    const impactPts = [];
    const iCount = 14;
    for (let i = 0; i < iCount; i++) {
      const a = (i / iCount) * Math.PI * 2;
      const r = 28 + Math.random() * 22;
      impactPts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    chunks.push({ type: 'blob', ox, oy, pts: impactPts, vx: 0, vy: 0, gravity: 0, life: 1 });

    // Flying chunks — shoot outward in all directions
    const chunkCount = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < chunkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      const size  = 6 + Math.random() * 18;
      const pts   = [];
      const pCount = 6 + Math.floor(Math.random() * 5);
      for (let j = 0; j < pCount; j++) {
        const a = (j / pCount) * Math.PI * 2;
        const r = size * (0.5 + Math.random() * 0.6);
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      chunks.push({
        type: 'blob',
        ox, oy,
        pts,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.25 + Math.random() * 0.2,
        life: 1,
      });
    }

    // Drips — elongated streaks downward
    const dripCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < dripCount; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.6 + Math.PI / 2;
      const speed = 1.5 + Math.random() * 4;
      chunks.push({
        type: 'drip',
        ox, oy,
        x: ox + (Math.random() - 0.5) * 60,
        y: oy + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1.5,
        vy: speed,
        w: 3 + Math.random() * 5,
        len: 20 + Math.random() * 60,
        life: 1,
      });
    }

    startTime = null;
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(tick);
  }

  function tick(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    const opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = opacity;

    for (const c of chunks) {
      ctx.fillStyle = '#8b0000';
      if (c.type === 'blob') {
        const cx = c.ox + c.vx * elapsed * 0.05;
        const cy = c.oy + c.vy * elapsed * 0.05 + 0.5 * c.gravity * Math.pow(elapsed * 0.05, 2);
        ctx.beginPath();
        ctx.moveTo(cx + c.pts[0].x, cy + c.pts[0].y);
        for (let i = 1; i < c.pts.length; i++) {
          ctx.lineTo(cx + c.pts[i].x, cy + c.pts[i].y);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        const x = c.x + c.vx * elapsed * 0.05;
        const y = c.y + c.vy * elapsed * 0.05;
        ctx.beginPath();
        ctx.ellipse(x, y, c.w / 2, c.len / 2, Math.atan2(c.vy, c.vx) + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    if (t < 1) animId = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  logo.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    splat(e.clientX, e.clientY);
  });
  logo.addEventListener('contextmenu', (e) => e.preventDefault());
}
