document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.querySelector('.hamburger-container');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', toggleMenu);
  } else {
    console.error('Hamburger or mobile menu not found!');
  }
});

// Resume video when page comes back from background
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    const video = document.querySelector('.menu-bg-video');
    if (video) video.play();
  }
});

function toggleMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const hamburger = document.querySelector('.hamburger-container');

  if (mobileMenu && hamburger) {
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');

    // Resume video every time the menu opens
    if (mobileMenu.classList.contains('open')) {
      const video = mobileMenu.querySelector('.menu-bg-video');
      if (video) video.play();
    }
  } else {
    console.error('Mobile menu or hamburger not found!');
  }
}
