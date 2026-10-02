(() => {
  const computer = document.querySelector('.contact-computer');
  const portrait = matchMedia('(max-width:900px) and (orientation:portrait)');
  // Set the initial composition; model-viewer handles orbit and pinch/wheel zoom.
  function frame() {
    computer.setAttribute('camera-orbit', portrait.matches ? '-125deg 72deg 80%' : '-125deg 68deg 85%');
  }
  portrait.addEventListener('change', frame);
  frame();
})();
