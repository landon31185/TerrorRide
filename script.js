function toggleMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const hamburger = document.querySelector('.hamburger-container');

  if (mobileMenu && hamburger) {
    // Toggle classes on both mobile menu and hamburger
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
  } else {
    console.error('Mobile menu or hamburger not found!');
  }
}