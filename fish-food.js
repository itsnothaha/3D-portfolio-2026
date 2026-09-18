(() => {
  'use strict';
  const tray = document.querySelector('.fish-food');
  if (!tray) return;
  const status = document.querySelector('#feeding-status');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let drag = null;
  const grains = new Set();
  function sprinkle(x, y) {
    window.dispatchEvent(new CustomEvent('fishfeed', { detail: { x, y } }));
    for (let i = 0; i < 7; i++) {
      const grain = document.createElement('span');
      grain.className = 'food-grain';
      grain.style.left = `${x + (Math.random() - .5) * 25}px`;
      grain.style.top = `${y}px`;
      document.body.append(grain);
      grains.add(grain);
      const animation = grain.animate(reduced.matches ? [{opacity:1},{opacity:0}] : [
        { transform:'translate(0,0)', opacity:1 },
        { transform:`translate(${(Math.random()-.5)*50}px,${35+Math.random()*65}px)`, opacity:0 }
      ], { duration:reduced.matches ? 200 : 900+Math.random()*650, easing:'ease-out' });
      animation.finished.then(() => { grain.remove(); grains.delete(grain); });
    }
  }
  function finish(consume = false) {
    if (!drag) return;
    const { button, ghost, id } = drag;
    drag = null;
    ghost.remove();
    button.style.opacity = '';
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    if (consume) {
      button.classList.add('is-used');
      button.disabled = true;
      status.textContent = `Fish fed. ${tray.querySelectorAll('button:not(:disabled)').length} tins left.`;
    }
  }
  tray.addEventListener('pointerdown', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || drag || event.button !== 0) return;
    event.preventDefault();
    const ghost = button.querySelector('img').cloneNode();
    ghost.className = 'food-drag';
    ghost.style.width = `${button.getBoundingClientRect().width}px`;
    ghost.style.left = `${event.clientX}px`; ghost.style.top = `${event.clientY}px`;
    document.body.append(ghost); button.style.opacity = '.2';
    button.setPointerCapture(event.pointerId);
    drag = { button, ghost, id:event.pointerId, startX:event.clientX, startY:event.clientY, last:0, portions:0 };
  });
  tray.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.ghost.style.left = `${event.clientX}px`; drag.ghost.style.top = `${event.clientY}px`;
    const moved = Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY) > 25;
    if (moved && event.clientY < tray.getBoundingClientRect().top - 10 && performance.now()-drag.last > 140) {
      sprinkle(event.clientX, event.clientY+12);
      drag.last = performance.now();
      if (++drag.portions >= 5) finish(true);
    }
  });
  tray.addEventListener('pointerup', event => { if (drag?.id === event.pointerId) finish(drag.portions > 0); });
  tray.addEventListener('pointercancel', () => finish());
  tray.addEventListener('lostpointercapture', () => finish());
  tray.addEventListener('keydown', event => {
    if (!['Enter',' '].includes(event.key) || event.target.disabled) return;
    event.preventDefault();
    sprinkle(innerWidth*.5,innerHeight*.5);
    event.target.disabled = true; event.target.classList.add('is-used');
    status.textContent = `Fish fed. ${tray.querySelectorAll('button:not(:disabled)').length} tins left.`;
    tray.querySelector('button:not(:disabled)')?.focus();
  });
  window.addEventListener('blur', () => finish());
  window.addEventListener('pagehide', () => { finish(); grains.forEach(grain => grain.remove()); grains.clear(); });
})();
