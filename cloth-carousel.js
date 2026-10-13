(() => {
  const root=document.querySelector('[data-cloth-carousel]');
  if(!root)return;
  const viewport=root.querySelector('.cloth-viewport');
  const items=[...root.querySelectorAll('.cloth-card')];
  const count=items.length,origin=count*2;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const mobile=matchMedia('(max-width:720px)');
  const wrap=n=>((n%count)+count)%count;
  const scroller=document.createElement('div');scroller.className='cloth-scroll';scroller.setAttribute('aria-hidden','true');
  const track=document.createElement('div');track.className='cloth-track';scroller.append(track);viewport.append(scroller);
  const stops=Array.from({length:count*5+1},()=>{const el=document.createElement('span');track.append(el);return el;});
  let step=1,width=0,height=0,position=0,active=-1,frame=0,timer=0,touching=false,drag=null,suppress=0,wheelStart=null,wheelTravel=0,wheelFrame=0;
  const dots=items.map((item,i)=>{
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Show '+item.dataset.name);
    button.addEventListener('click',()=>go(position+(wrap(i-position+count/2)-count/2)));
    root.querySelector('.cloth-dots').append(button);return button;
  });
  function draw(){
    items.forEach((item,i)=>{
      const d=wrap(i-position+count/2)-count/2;
      const distance=Math.abs(d);
      const depth=Math.sqrt(d*d+.12)-Math.sqrt(.12);
      const x=d*step*.96,y=Math.sin(d*.65)*height*.055,z=-depth*150;
      item.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateY(${-Math.tanh(d/2)*34}deg) scale(${1-Math.min(depth,4)*.075})`;
      item.style.opacity=distance>4.5?'0':String(Math.max(.35,1-distance*.14));
      item.style.zIndex=String(Math.round(100-distance*10));
    });
    const next=wrap(Math.round(position));
    if(next!==active){active=next;root.dataset.activeIndex=String(active);
      items.forEach((item,i)=>{item.tabIndex=i===active?0:-1;item.setAttribute('aria-current',String(i===active));dots[i].setAttribute('aria-pressed',String(i===active));});
      root.querySelector('.spatial-status').textContent=items[active].dataset.name;
    }
  }
  const offset=()=>scroller.scrollLeft;
  function scrollToOffset(value,smooth=false){scroller.scrollTo({left:value,behavior:smooth&&!reduced.matches?'smooth':'instant'});}
  function go(value,smooth=true){scrollToOffset((origin+value)*step,smooth);} 
  function settle(){if(touching||drag||wheelStart!==null)return;clearTimeout(timer);
    if(position<0||position>=count)go(wrap(position),false);
  }
  new ResizeObserver(()=>{
    if(width===viewport.clientWidth && height===viewport.clientHeight)return;
    width=viewport.clientWidth;height=viewport.clientHeight;step=Math.max(170,width*(width<720?.55:.26));
    track.style.width=(count*5*step+scroller.clientWidth)+'px';
    track.style.height='1px';
    stops.forEach((el,i)=>{el.style.left=i*step+'px';el.style.top='0px';});
    position=wrap(position);go(position,false);draw();
  }).observe(viewport);
  scroller.addEventListener('scroll',()=>{
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;position=offset()/step-origin;draw();});
    suppress=performance.now()+180;
    if(wheelStart===null){clearTimeout(timer);timer=setTimeout(settle,200);}
  },{passive:true});
  scroller.addEventListener('scrollend',settle);
  scroller.addEventListener('touchstart',()=>{touching=true;},{passive:true});
  const endTouch=()=>{touching=false;clearTimeout(timer);timer=setTimeout(settle,220);};
  scroller.addEventListener('touchend',endTouch,{passive:true});scroller.addEventListener('touchcancel',endTouch,{passive:true});
  scroller.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0)drag={id:e.pointerId,x:e.clientX,left:offset(),moved:false};});
  scroller.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const delta=e.clientX-drag.x;
    if(Math.abs(delta)>6){drag.moved=true;scroller.setPointerCapture(e.pointerId);scroller.classList.add('is-dragging');}
    if(drag.moved)scrollToOffset(drag.left-delta);
  });
  function release(e){if(!drag||drag.id!==e.pointerId)return;
    const moved=drag.moved;drag=null;scroller.classList.remove('is-dragging');
    if(scroller.hasPointerCapture(e.pointerId))scroller.releasePointerCapture(e.pointerId);
    if(moved){suppress=performance.now()+250;go(Math.round(position));}
  }
  scroller.addEventListener('pointerup',release);scroller.addEventListener('pointercancel',release);
  viewport.addEventListener('wheel',e=>{
    if(e.ctrlKey)return;
    // Mobile edge lanes remain owned by the document, even with a trackpad.
    if(mobile.matches){const r=scroller.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||Math.abs(e.deltaY)>=Math.abs(e.deltaX))return;}
    const raw=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
    if(!raw)return;
    e.preventDefault();
    if(wheelStart===null){wheelStart=offset()/step-origin;wheelTravel=0;scroller.classList.add('is-wheeling');}
    wheelTravel+=raw*(e.deltaMode===1?16:e.deltaMode===2?height:1);
    if(!wheelFrame){
      let last=performance.now();
      const glide=now=>{
        const dt=Math.min(40,now-last);last=now;
        const wanted=(origin+wheelStart)*step+wheelTravel;
        const current=offset();
        scrollToOffset(current+(wanted-current)*(reduced.matches?1:1-Math.exp(-dt/90)));
        if(Math.abs(wanted-current)>.5)wheelFrame=requestAnimationFrame(glide);else wheelFrame=0;
      };
      wheelFrame=requestAnimationFrame(glide);
    }
    clearTimeout(timer);timer=setTimeout(()=>{
      const start=wheelStart,travel=wheelTravel;cancelAnimationFrame(wheelFrame);wheelFrame=0;wheelStart=null;wheelTravel=0;
      const distance=Math.max(1,Math.round(Math.abs(travel)/step));
      scroller.classList.remove('is-wheeling');
      go(Math.round(start)+Math.sign(travel)*distance);
    },160);
  },{passive:false});
  scroller.addEventListener('click',e=>{
    if(performance.now()<suppress)return;
    const item=document.elementsFromPoint(e.clientX,e.clientY).map(el=>el.closest('.cloth-card')).find(Boolean);
    if(!item)return;
    const index=items.indexOf(item);
    if(index!==active)go(position+wrap(index-position+count/2)-count/2);
    else item.click();
  });
  root.querySelector('[data-cloth-prev]').addEventListener('click',()=>go(Math.round(position)-1));
  root.querySelector('[data-cloth-next]').addEventListener('click',()=>go(Math.round(position)+1));
  viewport.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(Math.round(position)+(e.key==='ArrowRight'?1:-1));}
  });
})();
