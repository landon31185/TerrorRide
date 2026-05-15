document.addEventListener('DOMContentLoaded', function () {
  initMenu();
  initScrollReveal();
  initGeolocation();
});

// ─── Menu ────────────────────────────────────────────────────────
function initMenu() {
  const hamburger = document.querySelector('.hamburger-container');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', toggleMenu);
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

  if (mobileMenu.classList.contains('open')) {
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
