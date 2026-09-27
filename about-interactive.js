(() => {
  document.querySelectorAll('.about-disclosure').forEach(section => {
    const button = section.querySelector('.about-toggle');
    const panel = section.querySelector('.about-panel');
    button.addEventListener('click', () => {
      // Other sections keep their state and position; only this panel changes height.
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      section.classList.toggle('is-open', expanded);
      button.setAttribute('aria-expanded', String(expanded));
      panel.inert = !expanded;
    });
  });
})();
