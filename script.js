// Wait for the DOM to be fully loaded before attaching the event listener
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.querySelector('.hamburger-container');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    // Attach event listener to the hamburger container
    hamburger.addEventListener('click', toggleMenu);
  } else {
    console.error('Hamburger or mobile menu not found!');
  }
});

// Function to toggle the menu
function toggleMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const hamburger = document.querySelector('.hamburger-container');

  if (mobileMenu && hamburger) {
    // Toggle 'open' class on both the mobile menu and the hamburger icon
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
  } else {
    console.error('Mobile menu or hamburger not found!');
  }
}
