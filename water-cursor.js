(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let disposeCursor=()=>{};
  function setupCursor(){
    disposeCursor();
    if(!finePointer.matches || reducedMotion.matches)return;
    const abort=new AbortController(), rings=new Set();
    const cursor=document.createElement('div');cursor.className='water-cursor';cursor.setAttribute('aria-hidden','true');document.body.append(cursor);
    document.documentElement.classList.add('has-water-cursor');
    let x=0,y=0,cx=0,cy=0,frame=0,lastAt=0,lastX=0,lastY=0,seen=false;
    const on=(target,name,fn)=>target.addEventListener(name,fn,{passive:true,signal:abort.signal});
    const animate=()=>{
      frame=0;cx+=(x-cx)*.4;cy+=(y-cy)*.4;
      cursor.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
      if(Math.abs(x-cx)+Math.abs(y-cy)>.25)frame=requestAnimationFrame(animate);
    };
    const ripple=(px,py,click=false)=>{
      for(let i=0;i<(click?3:2);i++){
        if(rings.size>=16){const oldest=rings.values().next().value;oldest.remove();rings.delete(oldest);}
        const ring=document.createElement('span');ring.className='water-ring';ring.setAttribute('aria-hidden','true');
        ring.style.left=`${px}px`;ring.style.top=`${py}px`;
        ring.style.setProperty('--ring-delay',`${i*85}ms`);
        ring.style.setProperty('--ring-rotate',`${(px+py)%40-20}deg`);
        ring.style.setProperty('--ring-end-scale',click?'3.8':'3');
        ring.addEventListener('animationend',()=>{rings.delete(ring);ring.remove();},{once:true});
        rings.add(ring);document.body.append(ring);
      }
    };
    on(window,'pointermove',e=>{
      x=e.clientX;y=e.clientY;if(!seen){cx=x;cy=y;seen=true;}
      cursor.classList.add('is-visible');if(!frame)frame=requestAnimationFrame(animate);
      const now=performance.now();if(now-lastAt>100 && Math.hypot(x-lastX,y-lastY)>35){ripple(x,y);lastX=x;lastY=y;lastAt=now;}
    });
    on(window,'pointerdown',e=>ripple(e.clientX,e.clientY,true));
    on(document.documentElement,'pointerleave',()=>{cursor.classList.remove('is-visible');seen=false;});
    on(document,'mouseover',e=>cursor.classList.toggle('is-active',!!e.target.closest('a,button,[role="button"],video')));
    on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;rings.forEach(r=>r.remove());rings.clear();cursor.classList.remove('is-visible');seen=false;}});
    disposeCursor=()=>{abort.abort();cancelAnimationFrame(frame);cursor.remove();rings.forEach(r=>r.remove());document.documentElement.classList.remove('has-water-cursor');};
  }
  finePointer.addEventListener('change',setupCursor);reducedMotion.addEventListener('change',setupCursor);setupCursor();

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
