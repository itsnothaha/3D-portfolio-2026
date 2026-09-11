(() => {
  const scene=document.querySelector('.contact-scene');if(!scene)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');let dispose=()=>{};
  function setup(){
    dispose();if(reduced.matches)return;
    const canvas=document.createElement('canvas');canvas.className='contact-falling';canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});scene.append(canvas);
    const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}
    const abort=new AbortController();let dead=false,raf=0,last=0,spawnIn=.1,width=0,height=0,ratio=1,limit=8;
    const particles=[],images=[];
    function resize(){
      const box=scene.getBoundingClientRect();width=box.width;height=box.height;limit=width<721?5:8;
      ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1100000/(width*height)));
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      particles.length=0;spawnIn=.1;
    }
    function spawn(){
      const image=images[Math.floor(Math.random()*images.length)];
      const size=Math.min(104,Math.max(48,width*.065))*(.8+Math.random()*.35);
      const w=size*image.naturalWidth/Math.max(image.naturalWidth,image.naturalHeight),h=size*image.naturalHeight/Math.max(image.naturalWidth,image.naturalHeight);
      particles.push({image,x:size+Math.random()*Math.max(1,width-2*size),y:-size,w,h,vx:(Math.random()-.5)*20,vy:25+Math.random()*15,angle:(Math.random()-.5)*.8,spin:(Math.random()-.5)*.4,rest:-1,bounces:0});
    }
    function draw(now){
      raf=0;if(dead||document.hidden)return;
      if(last&&now-last<33){raf=requestAnimationFrame(draw);return;}
      const dt=last?Math.min((now-last)/1000,.05):1/30;last=now;
      spawnIn-=dt;if(images.length&&spawnIn<=0&&particles.length<limit){spawn();spawnIn=width<721?2.2:1.6;}
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        // Sand surface is higher at the sides; damped bounce, no expensive collision engine.
        const floor=height*(.95-.035*Math.abs(p.x/width-.5)*2);
        if(p.rest<0){
          p.vy=Math.min(p.vy+45*dt,120);p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
          const extent=(Math.abs(Math.sin(p.angle))*p.w+Math.abs(Math.cos(p.angle))*p.h)/2;
          if(p.x<p.w/2||p.x>width-p.w/2){p.x=Math.max(p.w/2,Math.min(width-p.w/2,p.x));p.vx*=-.4;}
          if(p.y+extent>=floor){p.y=floor-extent;p.vy=-Math.abs(p.vy)*.22;p.vx*=.45;p.spin*=.35;if(++p.bounces>=2||Math.abs(p.vy)<8)p.rest=0;}
        }else{p.rest+=dt;if(p.rest>3){particles.splice(i,1);continue;}}
        ctx.save();ctx.globalAlpha=p.rest<1.7?1:Math.max(0,1-(p.rest-1.7)/1.3);ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.drawImage(p.image,-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
      }
      raf=requestAnimationFrame(draw);
    }
    const wake=()=>{if(!dead&&!document.hidden&&!raf){last=0;raf=requestAnimationFrame(draw);}};
    resize();
    for(let i=0;i<5;i++){const image=new Image();image.decoding='async';image.onload=()=>{if(!dead){images.push(image);wake();}};image.src=`main page/ui/falling-${i}.webp`;}
    window.addEventListener('resize',resize,{passive:true,signal:abort.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();},{signal:abort.signal});
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;},{signal:abort.signal});
    window.addEventListener('pageshow',wake,{signal:abort.signal});
    dispose=()=>{dead=true;abort.abort();cancelAnimationFrame(raf);canvas.remove();};
  }
  reduced.addEventListener('change',setup);setup();
})();
