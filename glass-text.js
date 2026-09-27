(() => {
  'use strict';
  // Mask the live backdrop with the actual local font, rather than painting
  // an opaque text fill or a copy of the static background over moving fish.
  const selector = '.water-title,.glass-type,.work-category-title,.home-nav a,.site-nav a';
  const targets = [...document.querySelectorAll(selector)];
  if (!targets.length) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none';
  svg.innerHTML = '<filter id="glass-refraction" x="-5%" y="-10%" width="110%" height="120%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.035" numOctaves="2" seed="8" result="texture"/><feDisplacementMap in="SourceGraphic" in2="texture" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.append(svg);
  const surfaces = new Map();
  let frame = 0;
  function update() {
    frame = 0;
    for (const target of targets) {
      const style = getComputedStyle(target);
      // Layout dimensions stay stable while a carousel card rotates and scales.
      const box = {width:target.offsetWidth,height:target.offsetHeight};
      if (!box.width || !box.height) continue;
      const text = [...target.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
      const label = style.textTransform === 'uppercase' ? text.toUpperCase() : text;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(box.width * ratio);
      canvas.height = Math.ceil(box.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.scale(ratio, ratio);
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
      const metrics = ctx.measureText(label);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.08;
      const baseline = paddingTop + (lineHeight - ascent - descent) / 2 + ascent;
      ctx.fillStyle = 'white';
      ctx.textAlign = style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'right' : 'left';
      const x = ctx.textAlign === 'center' ? box.width / 2 : ctx.textAlign === 'right' ? box.width : parseFloat(style.paddingLeft) || 0;
      ctx.fillText(label, x, baseline);
      let surface = surfaces.get(target);
      if (!surface) {
        surface = document.createElement('span');
        surface.className = 'glass-surface';
        surface.setAttribute('aria-hidden', 'true');
        target.classList.add('has-glass-surface');
        target.append(surface);
        surfaces.set(target, surface);
      }
      surface.style.setProperty('--glass-mask', `url("${canvas.toDataURL()}")`);
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  document.fonts.ready.then(() => {
    update();
    const observer = new ResizeObserver(schedule);
    targets.forEach(target => observer.observe(target));
  });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
})();
