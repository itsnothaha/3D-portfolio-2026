(() => {
  const host=document.querySelector('.contact-motion');
  if(!host)return;
  const mobile=matchMedia('(max-width:720px), (max-width:900px) and (orientation:portrait)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let dispose=()=>{};
  function setup(){
    dispose();
    if(reduced.matches)return;
    const abort=new AbortController();
    const on=(target,event,fn)=>target.addEventListener(event,fn,{passive:true,signal:abort.signal});
    const portrait=mobile.matches;
    const src=portrait?'main page/contact-seabed-mobile.mp4':'main page/contact-seabed.mp4';
    let dead=false,touchId=null,raf=0,pointer=null,geometry;
    // Independent clocks, sharing one cached file; load only on interaction.
    function player(className){
      const layer=document.createElement('div');layer.className=className;
      const video=document.createElement('video');
      video.muted=true;video.playsInline=true;video.preload='none';
      video.setAttribute('aria-hidden','true');layer.append(video);host.append(layer);
      let phase='idle',active=false,timer=0;
      function setActive(value){
        active=value;video.loop=value;
        if(!value || dead || document.hidden || phase==='playing' || phase==='loading')return;
        clearTimeout(timer);phase='loading';
        if(!video.getAttribute('src'))video.src=src;
        video.play().catch(error=>{
          if(dead || error.name==='AbortError')return;
          phase='idle';active=false;layer.classList.remove('is-playing');
        });
      }
      on(video,'playing',()=>{phase='playing';video.loop=active;layer.classList.add('is-playing');});
      on(video,'ended',()=>{phase='settling';video.currentTime=0;});
      on(video,'seeked',()=>{
        if(phase!=='settling')return;
        layer.classList.remove('is-playing');
        timer=setTimeout(()=>{if(phase==='settling')phase='idle';},360);
      });
      on(video,'error',()=>{phase='idle';active=false;layer.classList.remove('is-playing');});
      function stop(){
        clearTimeout(timer);active=false;phase='idle';video.pause();video.loop=false;
        layer.classList.remove('is-playing');
        if(video.readyState>=1)video.currentTime=0;
      }
      return {setActive,stop,destroy(){stop();video.removeAttribute('src');video.load();layer.remove();}};
    }
    const cursor=player('contact-cursor-reveal');
    const shell=player('contact-shell-reveal');
    function measure(){
      const bounds=host.getBoundingClientRect();
      const width=portrait?716:1280,height=portrait?1280:716;
      const scale=Math.min(bounds.width/width,bounds.height/height);
      const w=width*scale,h=height*scale,left=(bounds.width-w)/2,top=bounds.height-h;
      // Opaque core encloses all shell frames; feathering stays outside its motion.
      const cx=left+w*(portrait ? .74 : .80),cy=top+h*.81;
      const rx=w*(portrait ? .43 : .22),ry=h*.28;
      geometry={bounds,left,top,w,h,cx,cy,rx,ry,radius:Math.min(300,Math.max(135,w*.18))};
      for(const [key,value] of Object.entries({sx:cx,sy:cy,rx,ry,radius:geometry.radius}))host.style.setProperty('--'+key,value+'px');
    }
    function update(event){
      const g=geometry,x=event.clientX-g.bounds.left,y=event.clientY-g.bounds.top;
      const inside=x>=g.left && x<=g.left+g.w && y>=g.top+g.h*(portrait ? .60 : .52) && y<=g.top+g.h;
      cursor.setActive(inside);
      // Activate before the cursor mask reaches the shell; never reveal a partial shell.
      const near=inside && Math.hypot((x-g.cx)/(g.rx+g.radius*.7),(y-g.cy)/(g.ry+g.radius*.7))<=1;
      shell.setActive(near);
      if(inside){
        pointer={x,y};
        if(!raf)raf=requestAnimationFrame(()=>{
          raf=0;host.style.setProperty('--x',pointer.x+'px');host.style.setProperty('--y',pointer.y+'px');
        });
      }
    }
    function release(){cursor.setActive(false);shell.setActive(false);}
    on(window,'pointermove',event=>{if(event.pointerType==='mouse' || event.pointerId===touchId)update(event);});
    on(window,'pointerdown',event=>{
      if(event.target.closest('a,button,input'))return;
      if(event.pointerType!=='mouse')touchId=event.pointerId;
      update(event);
    });
    on(window,'pointerup',event=>{if(event.pointerId===touchId){touchId=null;release();}});
    on(window,'pointercancel',event=>{if(event.pointerId===touchId){touchId=null;release();}});
    on(document.documentElement,'pointerleave',()=>{touchId=null;release();});
    on(window,'blur',release);
    function suspend(){touchId=null;cursor.stop();shell.stop();}
    on(document,'visibilitychange',()=>{if(document.hidden)suspend();});
    on(window,'pagehide',suspend);
    on(window,'resize',measure);on(window,'scroll',measure);measure();
    dispose=()=>{dead=true;abort.abort();cancelAnimationFrame(raf);cursor.destroy();shell.destroy();};
  }
  mobile.addEventListener('change',setup);reduced.addEventListener('change',setup);setup();
})();
