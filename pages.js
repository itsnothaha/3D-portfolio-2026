const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

requestAnimationFrame(() => {
  requestAnimationFrame(() => document.body.classList.remove('is-entering'));
});

window.addEventListener('pageshow', () => {
  document.body.classList.remove('is-entering', 'is-leaving');
});

document.querySelectorAll('a[href]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin || reduceMotion) return;

    event.preventDefault();
    document.body.classList.add('is-leaving');
    window.setTimeout(() => {
      window.location.href = destination.href;
    }, 300);
  });
});

const mosaic = document.querySelector('#projectMosaic');
const tiles = mosaic ? [...mosaic.querySelectorAll('.mosaic-item')] : [];
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function resetMosaic() {
  tiles.forEach(tile => {
    tile.style.removeProperty('--tile-scale');
    tile.style.removeProperty('--tile-shift-x');
    tile.style.removeProperty('--tile-shift-y');
  });
}

if (mosaic && finePointer && !reduceMotion) {
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function updateProximity() {
    frame = 0;
    const mosaicRect = mosaic.getBoundingClientRect();
    const radius = Math.max(220, mosaicRect.width * .28);
    const geometry = tiles.map(tile => {
      const rect = tile.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return {tile,centerX,centerY,distance:Math.hypot(pointerX - centerX,pointerY - centerY)};
    });
    const focus = geometry.reduce((closest,item) => item.distance < closest.distance ? item : closest, geometry[0]);

    geometry.forEach(item => {
      if (item === focus) {
        item.tile.style.setProperty('--tile-scale','1.065');
        item.tile.style.setProperty('--tile-shift-x','0px');
        item.tile.style.setProperty('--tile-shift-y','0px');
        return;
      }

      const deltaX = item.centerX - focus.centerX;
      const deltaY = item.centerY - focus.centerY;
      const distance = Math.max(1,Math.hypot(deltaX,deltaY));
      const influence = Math.max(0,1 - distance / radius);
      const push = influence * Math.min(14,mosaicRect.width * .009);
      const scale = 1 - influence * .012;
      item.tile.style.setProperty('--tile-scale',scale.toFixed(3));
      item.tile.style.setProperty('--tile-shift-x',`${(deltaX / distance * push).toFixed(2)}px`);
      item.tile.style.setProperty('--tile-shift-y',`${(deltaY / distance * push).toFixed(2)}px`);
    });
  }

  mosaic.addEventListener('pointermove', event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(updateProximity);
  });
  mosaic.addEventListener('pointerleave', resetMosaic);
}

const dialog = document.querySelector('#videoDialog');
const projectVideo = document.querySelector('#projectVideo');
const closeButton = dialog?.querySelector('.dialog-close');

function closeVideo() {
  if (!dialog || !projectVideo) return;
  projectVideo.pause();
  projectVideo.removeAttribute('src');
  projectVideo.load();
  dialog.close();
}

tiles.forEach(tile => {
  tile.addEventListener('click', () => {
    if (!dialog || !projectVideo) return;
    projectVideo.src = tile.dataset.video;
    dialog.showModal();
    projectVideo.play().catch(() => {});
  });
});

closeButton?.addEventListener('click', closeVideo);
dialog?.addEventListener('click', event => {
  if (event.target === dialog) closeVideo();
});
dialog?.addEventListener('cancel', event => {
  event.preventDefault();
  closeVideo();
});
