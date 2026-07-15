const works = [
  { title: 'SHOWREEL', label: 'Showreel', folder: 'SHOWREEL', image: 'showreel.png', aspect: 1.777 },
  { title: 'CGI Animation', label: 'CGI', folder: 'CGI', image: 'cgi.png', aspect: 1.5 },
  { title: 'Character Animation', label: 'Character Animation', folder: 'character animation', image: 'character animation.png', aspect: 1.777 },
  { title: 'VFX', label: 'VFX', folder: 'VFX', image: 'vfx.png', aspect: 1.777 },
  { title: 'Footwear and cloth', label: 'Footwear + Cloth', folder: 'SHOES_AND_CLOSES', image: 'footwear-and-cloth.png', aspect: .802 },
  { title: 'AI', label: 'AI', folder: 'AI', image: 'ai.png', aspect: 1.5 }
];

let index = 0;
const title = document.querySelector('#workTitle');
const image = document.querySelector('#workImage');
const card = document.querySelector('#workCard');
const tabs = document.querySelector('#workTabs');
const prevWork = document.querySelector('#prevWork');
const nextWork = document.querySelector('#nextWork');
const pageLoader = document.querySelector('#pageLoader');

const projectPath = item => `work files/${item.folder}/`;
const imagePath = item => `work files/${item.folder}/${item.image}`;
const fillPreviewFolders = new Set(works.map(item=>item.folder));

function hidePageLoader(){
  if(!pageLoader) return;
  pageLoader.classList.add('is-hidden');
  document.body.classList.remove('is-loading');
}

function setWorkAspectFromImage(){
  if(!card || !image || !image.naturalWidth || !image.naturalHeight) return;
  card.style.setProperty('--work-aspect',(image.naturalWidth / image.naturalHeight).toFixed(4));
}

function preloadWorkImages(){
  works.forEach(item=>{
    const preview = new Image();
    preview.src = imagePath(item);
  });
}

function renderTabs(){
  if(!tabs) return;
  tabs.innerHTML = works
    .map((w,i)=>`<button class="magnetic ${i===index?'active':''}" data-index="${i}">${w.label}</button>`)
    .join('');
  tabs.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click',()=>setWork(Number(btn.dataset.index)));
  });
}

function setWork(next){
  if(!card || !title || !image) return;
  index = (next + works.length) % works.length;
  const item = works[index];
  title.textContent = item.title;
  card.style.setProperty('--work-aspect',item.aspect.toFixed(4));
  image.src = imagePath(item);
  image.alt = `${item.title} preview`;
  card.href = projectPath(item);
  card.classList.toggle('fill-preview', fillPreviewFolders.has(item.folder));
  if(image.complete) setWorkAspectFromImage();
  renderTabs();
}

prevWork?.addEventListener('click',()=>setWork(index-1));
nextWork?.addEventListener('click',()=>setWork(index+1));
image?.addEventListener('load',setWorkAspectFromImage);
if(image?.complete) setWorkAspectFromImage();
preloadWorkImages();
renderTabs();

document.addEventListener('keydown',e=>{
  if(e.key === 'ArrowLeft') setWork(index-1);
  if(e.key === 'ArrowRight') setWork(index+1);
});

let startX = 0;
card?.addEventListener('touchstart',e=>{ startX = e.touches[0].clientX; },{passive:true});
card?.addEventListener('touchend',e=>{
  const dx = e.changedTouches[0].clientX - startX;
  if(Math.abs(dx) > 45) setWork(index + (dx < 0 ? 1 : -1));
});

// Smooth anchor navigation: section titles land near the top of the viewport, not in the middle.
document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click',event=>{
    const id = link.getAttribute('href');
    if(!id || id === '#') return;
    const section = document.querySelector(id);
    if(!section) return;
    event.preventDefault();
    const target = id === '#about' ? (section.querySelector('.section-title') || section) : section;
    const headerOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 54;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 4;
    window.scrollTo({top, behavior:'smooth'});
    history.replaceState(null,'',id);
  });
});

const io = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting) entry.target.classList.add('in');
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

const cursor = document.querySelector('.cursor');
const dot = document.querySelector('.cursor-dot');
const canvas = document.querySelector('#starCanvas');
const ctx = canvas?.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const touchCapable = coarsePointer || navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
const canUseParticles = !reduceMotion && (finePointer || touchCapable);
const heroFace = document.querySelector('.hero-face');
const headFrame = document.querySelector('#headFrame');

if(headFrame && !reduceMotion){
  const frameCount = 360;
  const smallScreen = window.matchMedia('(max-width: 760px)').matches;
  const frameRate = smallScreen ? 15 : 18;
  const preloadWindow = smallScreen ? 10 : 8;
  const initialPreloadCount = smallScreen ? 18 : 12;
  const frameDelay = 1000 / frameRate;
  const cachedFrames = [];
  const framePromises = [];
  let currentFrame = 0;
  let lastFrameTime = 0;
  let headInView = true;

  const framePath = frame => `main page/animation_head/base_${String(frame).padStart(5,'0')}.png`;

  function preloadFrame(frame){
    const normalized = frame % frameCount;
    if(cachedFrames[normalized]) return framePromises[normalized] || Promise.resolve(cachedFrames[normalized]);
    const image = new Image();
    const promise = new Promise(resolve=>{
      image.onload = resolve;
      image.onerror = resolve;
    });
    image.decoding = 'async';
    image.src = framePath(normalized);
    cachedFrames[normalized] = image;
    framePromises[normalized] = promise;
    return promise;
  }

  function preloadAhead(frame){
    for(let i=1;i<=preloadWindow;i++) preloadFrame(frame + i);
  }

  function animateHeadFrame(time){
    if(headInView && !document.hidden && time - lastFrameTime >= frameDelay){
      const nextFrame = (currentFrame + 1) % frameCount;
      const nextImage = cachedFrames[nextFrame];
      preloadFrame(nextFrame);
      if(nextImage?.complete && nextImage.naturalWidth){
        currentFrame = nextFrame;
        headFrame.src = framePath(currentFrame);
        preloadAhead(currentFrame);
        lastFrameTime = time;
      }
    }
    requestAnimationFrame(animateHeadFrame);
  }

  if(heroFace && 'IntersectionObserver' in window){
    const headObserver = new IntersectionObserver(entries=>{
      headInView = entries[0]?.isIntersecting ?? true;
    },{threshold:.05});
    headObserver.observe(heroFace);
  }
  Promise
    .all([
      Promise.all(Array.from({length:initialPreloadCount},(_,frame)=>preloadFrame(frame))),
      new Promise(resolve=>window.setTimeout(resolve,650))
    ])
    .then(hidePageLoader);
  preloadAhead(currentFrame);
  requestAnimationFrame(animateHeadFrame);
}else{
  window.addEventListener('load',()=>window.setTimeout(hidePageLoader,350),{once:true});
}

let x = innerWidth / 2;
let y = innerHeight / 2;
let cx = x;
let cy = y;
let lastX = x;
let lastY = y;
let lastTouchX = x;
let lastTouchY = y;
let lastTouchStarTime = 0;
let stars = [];

function updateHeroEyes(px,py){
  if(!heroFace) return;
  const rect = heroFace.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = px - centerX;
  const dy = py - centerY;
  const distance = Math.hypot(dx,dy) || 1;
  const maxDownTravel = Math.max(1.5, Math.min(2.5, rect.width * .004));
  const strength = Math.min(distance / (rect.width * .45), 1);
  const maxTravel = 6;
  const eyeX = (dx / distance) * maxTravel * strength;
  const rawEyeY = (dy / distance) * maxTravel * strength;
  const eyeY = Math.min(rawEyeY,maxDownTravel);

  heroFace.style.setProperty('--eye-x',`${eyeX.toFixed(2)}px`);
  heroFace.style.setProperty('--eye-y',`${eyeY.toFixed(2)}px`);
}

function resetHeroEyes(){
  if(!heroFace) return;
  heroFace.style.setProperty('--eye-x','0px');
  heroFace.style.setProperty('--eye-y','0px');
}

window.addEventListener('mousemove',e=>updateHeroEyes(e.clientX,e.clientY));
window.addEventListener('mouseleave',resetHeroEyes);
window.addEventListener('touchstart',event=>{
  const touch = event.touches[0];
  if(!touch) return;
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
  updateHeroEyes(touch.clientX,touch.clientY);
  for(let i=0;i<8;i++) addStar(touch.clientX+(Math.random()-.5)*26,touch.clientY+(Math.random()-.5)*26,1);
},{passive:true});
window.addEventListener('touchmove',event=>{
  const touch = event.touches[0];
  if(!touch) return;
  x = touch.clientX;
  y = touch.clientY;
  updateHeroEyes(x,y);
  const now = performance.now();
  const distance = Math.hypot(x-lastTouchX,y-lastTouchY);
  if(distance > 8 && now - lastTouchStarTime > 28){
    const count = Math.min(3, Math.floor(distance/26)+1);
    for(let i=0;i<count;i++){
      addStar(x+(Math.random()-.5)*18,y+(Math.random()-.5)*18,Math.min(1.25,distance/90));
    }
    lastTouchX = x;
    lastTouchY = y;
    lastTouchStarTime = now;
  }
},{passive:true});
window.addEventListener('touchend',()=>{
  window.setTimeout(resetHeroEyes,450);
},{passive:true});

function resizeCanvas(){
  if(!canvas || !ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * ratio);
  canvas.height = Math.floor(innerHeight * ratio);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(ratio,0,0,ratio,0,0);
}

function addStar(px,py,force=1){
  if(!canUseParticles) return;
  stars.push({
    x:px,
    y:py,
    size:(Math.random()*5 + 3) * force,
    vx:(Math.random()-.5) * 1.8,
    vy:(Math.random()-.5) * 1.8 - .35,
    rotation:Math.random() * Math.PI,
    spin:(Math.random()-.5) * .12,
    life:1,
    decay:Math.random() * .015 + .015,
    points:Math.random() > .55 ? 4 : 5
  });
  const maxStars = finePointer ? 120 : 72;
  if(stars.length > maxStars) stars.splice(0,stars.length - maxStars);
}

function drawStar(star){
  if(!ctx) return;
  ctx.save();
  ctx.translate(star.x,star.y);
  ctx.rotate(star.rotation);
  ctx.beginPath();
  const outer = star.size;
  const inner = star.size * .42;
  const steps = star.points * 2;
  for(let i=0;i<=steps;i++){
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * 2 * i / steps) - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if(i === 0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(244,244,244,${0.70 * star.life})`;
  ctx.shadowColor = `rgba(244,244,244,${0.65 * star.life})`;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
}

function animateCursor(){
  if(cursor){
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }
  if(dot){
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
  }
  if(ctx){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    stars.forEach(star=>{
      star.x += star.vx;
      star.y += star.vy;
      star.rotation += star.spin;
      star.life -= star.decay;
      star.size += .015;
      drawStar(star);
    });
    stars = stars.filter(star=>star.life > 0);
  }
  requestAnimationFrame(animateCursor);
}

if(canvas && ctx && canUseParticles){
  resizeCanvas();
  addEventListener('resize',resizeCanvas);
  window.addEventListener('mousemove',e=>{
    x = e.clientX;
    y = e.clientY;
    document.body.style.setProperty('--mx',`${x}px`);
    document.body.style.setProperty('--my',`${y}px`);
    if(dot){ dot.style.left = `${x}px`; dot.style.top = `${y}px`; }
    const distance = Math.hypot(x-lastX,y-lastY);
    if(distance > 10){
      const count = Math.min(4, Math.floor(distance/22)+1);
      for(let i=0;i<count;i++){
        addStar(x + (Math.random()-.5)*18, y + (Math.random()-.5)*18, Math.min(1.5,distance/80));
      }
      lastX = x;
      lastY = y;
    }
  });
  animateCursor();
}

document.querySelectorAll('a,button,.work-card,.portrait').forEach(el=>{
  el.addEventListener('mouseenter',()=>{
    document.body.classList.add('cursor-big');
    for(let i=0;i<10;i++) addStar(x+(Math.random()-.5)*34,y+(Math.random()-.5)*34,1.2);
  });
  el.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-big'));
  el.addEventListener('click',()=>{
    for(let i=0;i<22;i++) addStar(x+(Math.random()-.5)*52,y+(Math.random()-.5)*52,1.7);
  });
});

card?.addEventListener('mousemove',e=>{
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--card-x',`${e.clientX-rect.left}px`);
  card.style.setProperty('--card-y',`${e.clientY-rect.top}px`);
});
