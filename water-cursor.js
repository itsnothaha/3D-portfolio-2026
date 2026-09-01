(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (finePointer.matches && !reducedMotion.matches) {
    document.documentElement.classList.add('has-water-cursor');

    const cursor = document.createElement('div');
    cursor.className = 'water-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.append(cursor);

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let cursorX = pointerX;
    let cursorY = pointerY;
    let lastRingX = pointerX;
    let lastRingY = pointerY;
    let lastRingAt = 0;

    const addRipple = (x, y, click = false) => {
      const count = click ? 4 : 3;
      const existingRings = document.querySelectorAll('.water-ring');
      if (existingRings.length > 42) {
        [...existingRings].slice(0,existingRings.length - 36).forEach(ring => ring.remove());
      }

      for (let index = 0; index < count; index += 1) {
        const ring = document.createElement('span');
        const width = 8 + index * 4 + Math.random() * 4;
        const height = width * (.72 + Math.random() * .38);
        const horizontalA = 42 + Math.round(Math.random() * 14);
        const horizontalB = 100 - horizontalA;
        const verticalA = 43 + Math.round(Math.random() * 14);
        const verticalB = 100 - verticalA;
        ring.className = click ? 'water-ring water-ring--click' : 'water-ring';
        ring.style.left = `${x + (Math.random() - .5) * 7}px`;
        ring.style.top = `${y + (Math.random() - .5) * 7}px`;
        ring.style.setProperty('--ring-width',`${width.toFixed(1)}px`);
        ring.style.setProperty('--ring-height',`${height.toFixed(1)}px`);
        ring.style.setProperty('--ring-radius',`${horizontalA}% ${horizontalB}% ${horizontalA - 3}% ${horizontalB + 3}% / ${verticalA}% ${verticalB}% ${verticalA + 4}% ${verticalB - 4}%`);
        ring.style.setProperty('--ring-rotate',`${(Math.random() * 34 - 17).toFixed(1)}deg`);
        ring.style.setProperty('--ring-delay',`${index * 42}ms`);
        ring.style.setProperty('--ring-duration',`${(1.02 + index * .1 + Math.random() * .12).toFixed(2)}s`);
        ring.style.setProperty('--ring-end-scale',`${(4.5 + index * .6 + Math.random() * .5).toFixed(2)}`);
        ring.style.setProperty('--ring-glow',`${(7 + index * 2)}px`);
        ring.setAttribute('aria-hidden','true');
        document.body.append(ring);
        ring.addEventListener('animationend',() => ring.remove(),{once:true});
      }
    };

    const animate = () => {
      cursorX += (pointerX - cursorX) * .34;
      cursorY += (pointerY - cursorY) * .34;
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursor.classList.add('is-visible');

      const now = performance.now();
      const distance = Math.hypot(pointerX - lastRingX, pointerY - lastRingY);
      if (distance > 30 && now - lastRingAt > 55) {
        addRipple(pointerX, pointerY);
        lastRingX = pointerX;
        lastRingY = pointerY;
        lastRingAt = now;
      }
    }, {passive:true});

    window.addEventListener('pointerdown', event => addRipple(event.clientX, event.clientY, true));
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    document.addEventListener('mouseover', event => {
      cursor.classList.toggle('is-active', Boolean(event.target.closest('a,button,[role="button"],video')));
    });

    animate();
  }

  const parallaxPage = document.querySelector('[data-parallax-background]');
  if (parallaxPage && !reducedMotion.matches) {
    const parallaxImage = parallaxPage.querySelector('.footwear-parallax img');
    let scheduled = false;
    const updateParallax = () => {
      scheduled = false;
      if (!parallaxImage) return;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
      const imageRatio = parallaxImage.naturalWidth && parallaxImage.naturalHeight
        ? parallaxImage.naturalHeight / parallaxImage.naturalWidth
        : 5504 / 3072;
      const desiredHeight = window.innerHeight + scrollRange * .42;
      const maximumWidth = window.innerWidth * (window.innerWidth < 700 ? 2.15 : 1.5);
      const renderedWidth = Math.min(maximumWidth,Math.max(window.innerWidth,desiredHeight / imageRatio));
      const renderedHeight = renderedWidth * imageRatio;
      const availableTravel = Math.max(0,renderedHeight - window.innerHeight);
      const offset = -availableTravel * progress * .88;
      parallaxPage.style.setProperty('--parallax-width',`${renderedWidth.toFixed(1)}px`);
      parallaxPage.style.setProperty('--parallax-offset',`${offset.toFixed(1)}px`);
    };
    const scheduleParallax = () => {
      if (!scheduled) scheduled = true, window.requestAnimationFrame(updateParallax);
    };
    updateParallax();
    parallaxImage?.addEventListener('load',updateParallax,{once:true});
    window.addEventListener('scroll', scheduleParallax, {passive:true});
    window.addEventListener('resize', scheduleParallax, {passive:true});
  }
})();
