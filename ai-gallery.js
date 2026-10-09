(() => {
  const cards = [...document.querySelectorAll('.ai-card')];
  const viewer = document.querySelector('.ai-viewer');
  const photo = viewer.querySelector('img');
  const video = viewer.querySelector('video');
  const title = viewer.querySelector('h2');
  const copy = viewer.querySelector('.ai-description');
  const tools = viewer.querySelector('.ai-tools');
  const counter = viewer.querySelector('.ai-counter');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const cloud = document.querySelector('.ai-cloud');
  // Three staggered rings form a curved wall. Only transforms update while moving.
  let frame=0, phase=Math.PI/8, target=Math.PI/8, tilt=0, targetTilt=0, previousTime=0;
  let drag=null, suppressUntil=0, width=1, height=1;
  const columns=8, spacing=Math.PI*2/columns;
  const wrapAngle = a => Math.atan2(Math.sin(a),Math.cos(a));
  function draw() {
    const mobile=width<650;
    const radius=mobile?width*.85:width*.52;
    cards.forEach((card,i)=>{
      const row=Math.floor(i/columns)-1;
      const angle=wrapAngle((i%columns-3.5)*spacing+phase+row*.14);
      const depth=Math.cos(angle);
      const x=Math.sin(angle)*radius*.72;
      const y=row*height*.31 + Math.sin(angle*2+i)*10 + tilt*(depth+.5)*12;
      const z=(depth-1)*radius*.85;
      card.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateY(${-angle*180/Math.PI*.65}deg) rotateX(${-row*5+tilt*2}deg)`;
      card.style.opacity=String(.32+.68*Math.max(0,depth));
      card.style.zIndex=String(Math.round((depth+1)*100));
    });
  }
  function animate(time) {
    frame=0;
    const dt=Math.min(40,time-(previousTime||time-16));previousTime=time;
    const ease=reduced.matches?1:1-Math.exp(-dt/95);
    phase+=(target-phase)*ease;tilt+=(targetTilt-tilt)*ease;draw();
    if(Math.abs(target-phase)+Math.abs(targetTilt-tilt)>.0005)frame=requestAnimationFrame(animate);
    else {previousTime=0;phase=target;draw();}
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(animate);}
  new ResizeObserver(()=>{
    width=cloud.clientWidth;height=cloud.clientHeight;
    const cardHeight=Math.min(width<650?185:260,height*.38);
    cards.forEach(card=>{
      const img=card.querySelector('img');
      const ratio=Number(img.getAttribute('width'))/Number(img.getAttribute('height'));
      card.style.width=(cardHeight*Math.min(1.65,ratio))+'px';
      card.style.height=cardHeight+'px';
    });
    draw();
  }).observe(cloud);
  cloud.classList.add('is-spatial');
  cloud.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:target,moved:false};
  });
  cloud.addEventListener('pointermove',e=>{
    if(drag && drag.id===e.pointerId){
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.moved && Math.abs(dy)>Math.abs(dx)+8 && e.pointerType!=='mouse'){drag=null;return;}
      if(Math.abs(dx)>6){drag.moved=true;cloud.setPointerCapture(e.pointerId);cloud.classList.add('is-dragging');}
      if(drag.moved){target=drag.start+dx/width*Math.PI*1.5;schedule();}
    } else if(e.pointerType==='mouse' && !reduced.matches){targetTilt=(e.clientY-cloud.getBoundingClientRect().top)/height-.5;schedule();}
  });
  function release(e){
    if(!drag || drag.id!==e.pointerId)return;
    if(drag.moved)suppressUntil=performance.now()+300;
    if(cloud.hasPointerCapture(e.pointerId))cloud.releasePointerCapture(e.pointerId);
    drag=null;cloud.classList.remove('is-dragging');
  }
  cloud.addEventListener('pointerup',release);cloud.addEventListener('pointercancel',release);
  cloud.addEventListener('wheel',e=>{
    if(viewer.open || e.ctrlKey)return;
    e.preventDefault();target+=Math.max(-120,Math.min(120,e.deltaY+e.deltaX))*.003;schedule();
  },{passive:false});
  cloud.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();target+=(e.key==='ArrowRight'?-1:1)*spacing;schedule();}
  });
  cloud.addEventListener('focusin',e=>{
    const index=cards.indexOf(e.target);
    if(index<0)return;
    const row=Math.floor(index/columns)-1;
    const angle=wrapAngle((index%columns-3.5)*spacing+target+row*.14);
    // Keyboard focus brings a rear card into view without moving a clicked card.
    if(e.target.matches(':focus-visible')){target-=angle;schedule();}
  });
  let active = 0, origin = null, animation = null;
  const captions = {
    ab: ['Marketplace A/B testing', 'Product listing images created for A/B testing on an online marketplace.', 'Nano Banana · Adobe Photoshop'],
    banner: ['Advertising campaign visuals', 'AI-generated visuals created for advertising banners.', 'Adobe Photoshop · Nano Banana · ChatGPT Images · Midjourney'],
    salomon: ['Salomon — Personal project', 'A personal exploration of Salomon footwear through a series of AI-generated creative concepts and motion studies.', 'Nano Banana · Seedance']
  };
  function stopVideo() { video.pause(); video.removeAttribute('src'); video.load(); }
  function display(index, from) {
    active = (index + cards.length) % cards.length;
    const card = cards[active];
    const thumbnail = card.querySelector('img');
    for (const media of [photo, video]) {
      media.width = Number(thumbnail.getAttribute('width'));
      media.height = Number(thumbnail.getAttribute('height'));
    }
    const [heading, description, software] = captions[card.dataset.category];
    stopVideo();
    const isVideo = Boolean(card.dataset.video);
    photo.hidden = isVideo; video.hidden = !isVideo;
    if (isVideo) { video.poster = card.dataset.full; video.src = card.dataset.video; }
    else { photo.src = card.dataset.full; photo.alt = card.querySelector('img').alt; }
    title.textContent = heading; copy.textContent = description;
    tools.textContent = 'Tools: ' + software;
    counter.textContent = `${active + 1} / ${cards.length}`;
    if (!viewer.open) viewer.showModal();
    animation?.cancel();
    if (!reduced.matches && from) {
      const to = viewer.getBoundingClientRect();
      animation = viewer.animate([
        {transform:`translate(${from.x + from.width/2 - to.x - to.width/2}px,${from.y + from.height/2 - to.y - to.height/2}px) scale(.25)`,opacity:.3},
        {transform:'translate(0,0) scale(1)',opacity:1}
      ],{duration:520,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  }
  cards.forEach((card,index) => card.addEventListener('click', () => {
    if(performance.now()<suppressUntil)return;
    origin = card; display(index, card.getBoundingClientRect());
  }));
  viewer.querySelector('.ai-close').addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-prev]').addEventListener('click', () => display(active-1));
  viewer.querySelector('[data-next]').addEventListener('click', () => display(active+1));
  viewer.addEventListener('click', event => { if(event.target === viewer) {
    const r=viewer.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();
  }});
  viewer.addEventListener('keydown', event => {
    if(event.target === video)return;
    if(event.key==='ArrowRight'){event.preventDefault();display(active+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();display(active-1);}
  });
  viewer.addEventListener('close', () => { animation?.cancel();stopVideo();origin?.focus({preventScroll:true}); });
})();
