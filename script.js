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

// Close the menu when a link in the menu is clicked
const menuLinks = document.querySelectorAll('.mobile-menu-items a');
menuLinks.forEach(link => {
  link.addEventListener('click', () => {
    const mobileMenu = document.querySelector('.mobile-menu');
    const hamburger = document.querySelector('.hamburger-container');

    // Remove the 'open' class to close the menu
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
  });
});