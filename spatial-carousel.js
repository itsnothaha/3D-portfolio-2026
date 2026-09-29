(() => {
  'use strict';
  const mobile = matchMedia('(max-width:720px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const wrap = (value, count) => ((value % count) + count) % count;
  document.querySelectorAll('[data-spatial-carousel]').forEach(root => {
    const viewport = root.querySelector('.spatial-viewport');
    const stage = root.querySelector('.spatial-stage');
    const items = [...stage.children];
    const count = items.length;
    const status = root.querySelector('.spatial-status');
    const dots = root.querySelector('.spatial-dots');
    const shoes = root.dataset.shoes === 'true';
    // A real hit area lets the browser decide touch ownership before a gesture starts.
    const touchZone = document.createElement('div');
    touchZone.className = 'spatial-touch-zone';
    touchZone.setAttribute('aria-hidden', 'true');
    viewport.append(touchZone);
    touchZone.addEventListener('click', event => {
      if (performance.now() < suppressUntil) return;
      const hit = document.elementsFromPoint(event.clientX,event.clientY)
        .map(element => element.closest('.spatial-item')).find(Boolean);
      if (hit) hit.click();
    });
    let position = Number(root.dataset.initial ?? Math.floor(count / 2));
    let target = position, active = -1, width = 1, height = 1, step = 1;
    let frame = 0, lastTime = 0, settle = 0, dragging = null, suppressUntil = 0, focusOnSettle = false;
    const buttons = items.map((item, i) => {
      item.classList.add('spatial-item');
      item.querySelectorAll('img').forEach(img => {img.draggable = false; img.loading = 'eager';});
      const dot = document.createElement('button');
      dot.type = 'button'; dot.setAttribute('aria-label', `Show ${item.dataset.name || item.textContent.trim()}`);
      dot.addEventListener('click', () => select(i)); dots.append(dot);
      return dot;
    });
    function draw() {
      const nearest = wrap(Math.round(position), count);
      items.forEach((item, i) => {
        // A complete orbit keeps every model in the scene, including its rear half.
        const angle = (i - position) * Math.PI * 2 / count;
        const front = Math.cos(angle), side = Math.sin(angle);
        const vertical = mobile.matches;
        const x = vertical ? 0 : side * width * .43;
        const y = vertical ? side * height * .40 : shoes ? (front-1) * height * .24 + height * .10 : 0;
        const z = (front-1) * (shoes ? 340 : 220);
        const scale = shoes ? .76 + .24 * front : .88 + .12 * front;
        const tilt = side * (vertical ? -22 : -20);
        item.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) ${vertical ? 'rotateX' : 'rotateY'}(${tilt}deg) scale(${scale})`;
        item.style.zIndex = String(Math.round(100 + front*50));
      });
      if (active !== nearest) {
        active = nearest;
        items.forEach((item,i) => {
          item.classList.toggle('is-current',i === active);
          item.tabIndex = i === active ? 0 : -1;
          item.setAttribute('aria-current',String(i === active));
          buttons[i].setAttribute('aria-pressed',String(i === active));
        });
        root.dataset.activeIndex = String(active);
      }
    }
    function animate(time) {
      const dt = Math.min(32, lastTime ? time-lastTime : 16.67);
      lastTime = time;
      position += (target-position) * (reduced.matches ? 1 : 1-Math.exp(-dt/(dragging ? 38 : 85)));
      const done = Math.abs(target-position) < .0005;
      if (done) position = target;
      draw();
      if (!done) frame = requestAnimationFrame(animate);
      else {
        frame = 0; lastTime = 0;
        status.textContent = items[active].dataset.name || items[active].textContent.trim();
        if (focusOnSettle) {focusOnSettle=false;items[active].focus({preventScroll:true});}
        // Keep numbers small after each completed turn without changing the orbit.
        if (!dragging) {const turns = Math.floor(position/count)*count;position-=turns;target-=turns;}
      }
    }
    function schedule() {if (!frame) frame=requestAnimationFrame(animate);}
    function move(value) {clearTimeout(settle);target=value;schedule();}
    function select(index) {
      const delta = wrap(index-wrap(target,count)+count/2,count)-count/2;
      move(target+delta);
    }
    function measure() {
      width=viewport.clientWidth;height=viewport.clientHeight;
      step=mobile.matches ? Math.max(150,height*.33) : Math.max(220,width*.24);
      root.style.setProperty('--stage-width',width+'px');root.style.setProperty('--stage-height',height+'px');
      draw();
    }
    root.classList.add('is-enhanced');measure();
    new ResizeObserver(measure).observe(viewport);
    root.querySelector('[data-carousel-prev]').addEventListener('click',()=>move(Math.round(target)-1));
    root.querySelector('[data-carousel-next]').addEventListener('click',()=>move(Math.round(target)+1));
    root.addEventListener('keydown',event=>{
      if (event.altKey||event.ctrlKey||event.metaKey) return;
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
      event.preventDefault();focusOnSettle=!event.target.closest('.spatial-controls');
      if (event.key==='Home'||event.key==='End') select(event.key==='Home'?0:count-1);
      else move(Math.round(target)+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1));
    });
    viewport.addEventListener('wheel',event=>{
      if(event.ctrlKey || (mobile.matches && event.target !== touchZone)) return;
      event.preventDefault();
      const delta = Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      const pixels = delta*(event.deltaMode===1?16:event.deltaMode===2?height:1);
      target+=pixels/step;schedule();clearTimeout(settle);
      settle=setTimeout(()=>move(Math.round(target)),120);
    },{passive:false});
    viewport.addEventListener('pointerdown',event=>{
      if(event.button!==0 || dragging || (mobile.matches && event.target !== touchZone)) return;
      clearTimeout(settle);
      dragging={id:event.pointerId,start:event.clientX,startY:event.clientY,position:target,moved:false};
    });
    viewport.addEventListener('pointermove',event=>{
      if(!dragging||event.pointerId!==dragging.id) return;
      const delta=mobile.matches ? event.clientY-dragging.startY : event.clientX-dragging.start;
      if(Math.abs(delta)>6&&!dragging.moved){dragging.moved=true;viewport.setPointerCapture(event.pointerId);root.classList.add('is-dragging');}
      if(dragging.moved){event.preventDefault();target=dragging.position-delta/step;schedule();}
    });
    function release(event){
      if(!dragging || (event.pointerId!==undefined && event.pointerId!==dragging.id)) return;
      const {id,moved,position:startPosition}=dragging;dragging=null;
      if(viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
      root.classList.remove('is-dragging');
      if(moved){
        suppressUntil=performance.now()+350;
        const travel=target-startPosition;
        const destination=mobile.matches && Math.abs(travel)>.16 && Math.abs(travel)<.5
          ? Math.round(startPosition)+Math.sign(travel) : Math.round(target);
        move(destination);
      }
    }
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);
    viewport.addEventListener('lostpointercapture',release);
    root.addEventListener('click',event=>{
      const item=event.target.closest('.spatial-item');
      if(performance.now()<suppressUntil||(item&&items.indexOf(item)!==active)){
        event.preventDefault();event.stopImmediatePropagation();
        if(performance.now()>=suppressUntil&&item) select(items.indexOf(item));
      }
    },true);
    stage.addEventListener('dragstart',event=>event.preventDefault());
  });
})();
