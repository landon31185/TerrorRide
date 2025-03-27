function toggleMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const hamburger = document.querySelector('.hamburger-container');
  
    // Check if the elements exist before attempting to toggle
    if (mobileMenu) {
      mobileMenu.classList.toggle('open');
    } else {
      console.error('Mobile menu not found!');
    }
  
    if (hamburger) {
      hamburger.classList.toggle('open');
    } else {
      console.error('Hamburger menu not found!');
    }
  }
  