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

// ─── Scroll reveal (Intersection Observer) ───────────────────────
function initScrollReveal() {
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

// ─── Geolocation banner ───────────────────────────────────────────
// West Seattle bounding box (approximate)
const WS_BOUNDS = { latMin: 47.500, latMax: 47.612, lngMin: -122.445, lngMax: -122.340 };

function initGeolocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const local =
        coords.latitude  > WS_BOUNDS.latMin && coords.latitude  < WS_BOUNDS.latMax &&
        coords.longitude > WS_BOUNDS.lngMin && coords.longitude < WS_BOUNDS.lngMax;
      showLocationBanner(local);
    },
    () => {} // permission denied or unavailable — fail silently
  );
}

function showLocationBanner(local) {
  const banner = document.createElement('div');
  banner.className = `location-banner ${local ? 'local' : 'outsider'}`;
  banner.textContent = local ? 'You already know.' : "You're not even from here. Leave.";
  document.body.appendChild(banner);

  // Trigger transition on next frame
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('visible')));

  setTimeout(() => {
    banner.classList.remove('visible');
    banner.addEventListener('transitionend', () => banner.remove(), { once: true });
  }, 4500);
}
