(() => {
  'use strict';
  const host = document.querySelector('.fish-reveal');
  if (!host) return;
  const enabled = matchMedia('(prefers-reduced-motion:no-preference)');
  const mobile = matchMedia('(max-width:720px)');
  let dispose = () => {};
  const sync = () => { dispose(); dispose = enabled.matches ? start() : () => {}; };
  enabled.addEventListener('change', sync);
  mobile.addEventListener('change', sync);
  sync();

  function start() {
    const portrait=mobile.matches, imageWidth=portrait?720:1280, imageHeight=portrait?1280:720;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) return () => {};
    host.append(canvas);
    let dead = false, raf = 0, visible = false, selected = -1, previous = 0;
    let width = innerWidth, height = innerHeight, resolution = 1, slowFrames = 0;
    let previousRect=null, fullRedraw=true;
    let px = -1000, py = -1000, movedAt = 0, strength = 0;
    const abort = new AbortController();
    const listen = (target, name, fn) => target.addEventListener(name, fn, { signal: abort.signal, passive: true });
    const seeds = portrait ? [[.75,.427],[3,3],[4,4],[.13,.755]] : [[.255,.427],[.929,.219],[.737,.568],[.046,.755]];
    const maskRadii = portrait ? [[.66,.35],[.01,.01],[.01,.01],[.45,.30]] : [[.22,.35],[.17,.30],[.24,.35],[.17,.30]];
    const vec = values => `vec2(${values.map(v=>Number(v).toFixed(6)).join(",")})`;
    const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
    const fragment = `
      precision mediump float;
      varying vec2 uv;
      uniform sampler2D poster, fish0, fish1, fish2, fish3;
      uniform vec2 viewport, cover;
      uniform vec4 zones[4];
      uniform vec4 crops[4];
      uniform vec3 trail[3];
      uniform vec4 ripples[8];
      vec2 imageUV(vec2 p){return (p-.5)*cover+.5;}
      float ownership(vec2 p,vec2 seed,vec2 b,vec2 c,vec2 d){
        vec2 aspect=vec2(${(imageWidth/imageHeight).toFixed(6)},1.);
        float a=distance(p*aspect,seed*aspect);
        float other=min(distance(p*aspect,b*aspect),min(distance(p*aspect,c*aspect),distance(p*aspect,d*aspect)));
        return smoothstep(-.045,.045,other-a);
      }
      vec3 scene(vec2 p){
        vec2 q=imageUV(p);
        vec3 base=texture2D(poster,q).rgb;
        vec2 a=${vec(seeds[0])},b=${vec(seeds[1])},c=${vec(seeds[2])},d=${vec(seeds[3])};

        if(zones[0].z>.003){
          float m=(1.-smoothstep(.76,1.,length((q-a)/${vec(maskRadii[0])})))*zones[0].z*ownership(q,a,b,c,d);
          if(m>0.)base=mix(base,texture2D(fish0,(q-crops[0].xy)/crops[0].zw).rgb,m);
        }
        if(zones[1].z>.003){
          float m=(1.-smoothstep(.76,1.,length((q-b)/${vec(maskRadii[1])})))*zones[1].z*ownership(q,b,a,c,d);
          if(m>0.)base=mix(base,texture2D(fish1,(q-crops[1].xy)/crops[1].zw).rgb,m);
        }
        if(zones[2].z>.003){
          float m=(1.-smoothstep(.76,1.,length((q-c)/${vec(maskRadii[2])})))*zones[2].z*ownership(q,c,a,b,d);
          if(m>0.)base=mix(base,texture2D(fish2,(q-crops[2].xy)/crops[2].zw).rgb,m);
        }
        if(zones[3].z>.003){
          float m=(1.-smoothstep(.76,1.,length((q-d)/${vec(maskRadii[3])})))*zones[3].z*ownership(q,d,a,b,c);
          if(m>0.)base=mix(base,texture2D(fish3,(q-crops[3].xy)/crops[3].zw).rgb,m);
        }
        return base;
      }
      void main(){
        vec2 p=vec2(uv.x,1.-uv.y), warped=p;
        vec2 offset=vec2(0.);
        float mist=0., light=0., blue=0.;
        // Small overlapping currents refract the surface without rotating the artwork.
        for(int i=0;i<3;i++){
          vec2 delta=p*viewport-trail[i].xy;
          float falloff=1.-smoothstep(8.,105.,length(delta));
          float amount=falloff*falloff*trail[i].z;
          vec2 flow=vec2(sin(delta.y*.047+sin(delta.x*.025)),cos(delta.x*.042+sin(delta.y*.031)));
          offset+=flow*amount*2.5;
          mist+=amount*(.5+.5*sin(delta.x*.028+sin(delta.y*.036)*1.8));
        }
        // Eight reusable wave packets: expanding, slightly uneven circles with bright crests.
        for(int i=0;i<8;i++){
          float age=ripples[i].z;
          if(age>=0. && age<1.85){
            vec2 delta=p*viewport-ripples[i].xy;
            delta.y*=1.13;
            float distanceToCentre=length(delta);
            float front=10.+age*82.;
            if(distanceToCentre<front+28.){
              float angle=atan(delta.y,delta.x+.0001);
              float uneven=sin(angle*3.+age*.7)*1.6+sin(angle*5.-age*.4)*.65;
              float d=distanceToCentre+uneven;
              float fade=smoothstep(0.,.10,age)*(1.-smoothstep(.28,1.85,age))*ripples[i].w;
              float edge=d-front;
              float inner=d-front+17.;
              float band=1.-smoothstep(4.,15.,abs(edge));
              float second=(1.-smoothstep(3.,11.,abs(inner)))*.48*smoothstep(20.,45.,front);
              float wave=sin(edge*.30)*band+sin(inner*.34)*second;
              offset+=delta/max(distanceToCentre,1.)*wave*fade*1.7;
              light+=((1.-smoothstep(.5,2.9,abs(edge)))+(1.-smoothstep(.4,2.6,abs(inner)))*.42)*fade;
              blue+=((1.-smoothstep(.8,4.5,abs(edge+3.)))+(1.-smoothstep(.7,3.8,abs(inner+3.)))*.38)*fade;
              mist+=band*fade*.14;
            }
          }
        }
        warped=clamp(p+offset/viewport,vec2(0.),vec2(1.));
        vec3 colour=scene(warped);
        colour=mix(colour,vec3(.48,.72,.85),clamp(mist*.10,0.,.13));
        colour=mix(colour,vec3(.22,.47,.65),clamp(blue*.16,0.,.23));
        colour=mix(colour,vec3(.97,.99,1.),clamp(light*.35,0.,.43));
        gl_FragColor=vec4(colour,1.);
      }`;
    const shaders = [];
    const compile = (type, source) => {
      const shader = gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    const textures = [];
    const zones = [];
    let buffer;
    const cleanup = () => {
      if (dead) return;
      dead = true; abort.abort(); cancelAnimationFrame(raf);
      host.classList.remove('is-ready'); canvas.remove();
      for (const zone of zones) {
        if (zone.callback !== null) zone.video.cancelVideoFrameCallback?.(zone.callback);
        zone.video.pause(); zone.video.removeAttribute('src'); zone.video.load();
      }
      textures.forEach(t => gl.deleteTexture(t));
      shaders.forEach(s => gl.deleteShader(s));
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
    try {
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (error) { console.warn('Water effect unavailable:', error); cleanup(); return () => {}; }
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const location = name => gl.getUniformLocation(program, name);
    const uniforms = {viewport:location('viewport'),cover:location('cover'),zones:location('zones[0]'),trail:location('trail[0]'),ripples:location('ripples[0]'),crops:location('crops[0]')};
    gl.uniform4fv(uniforms.crops,new Float32Array(portrait ? [0,0,1,.8, 0,0,1,1, 0,0,1,1, 0,.45,.7,.55] : [0.0, 0.0, 0.5671875, 1.0, 0.55, 0.0, 0.45, 0.7611111111111111, 0.425, 0.0, 0.575, 1.0, 0.0, 0.20555555555555555, 0.403125, 0.7944444444444444]));
    const textureSizes=Array.from({length:5},()=>[1,1]);
    for (let i=0; i<5; i++) {
      gl.activeTexture(gl.TEXTURE0+i);
      const texture=gl.createTexture(); textures.push(texture); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0]));
      gl.uniform1i(location(i ? `fish${i-1}` : 'poster'),i);
    }
    let ready = false;
    const wake = () => { if (!dead && ready && !document.hidden && !raf) raf=requestAnimationFrame(draw); };
    const upload = (index, image) => {
      gl.activeTexture(gl.TEXTURE0+index); gl.bindTexture(gl.TEXTURE_2D,textures[index]);
      const w=image.videoWidth||image.naturalWidth, h=image.videoHeight||image.naturalHeight;
      if(textureSizes[index][0]!==w || textureSizes[index][1]!==h){
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
        textureSizes[index]=[w,h];
      } else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGB,gl.UNSIGNED_BYTE,image);
    };
    const poster = new Image();
    poster.onload = () => {
      if (dead) return;
      try { upload(0,poster); } catch { cleanup(); return; }
      ready=true; host.classList.add('is-ready'); resize();
    };
    poster.onerror=cleanup;
    poster.src=`main page/home-${portrait?'mobile':'desktop'}.webp`;
    for (let i=0;i<4;i++) {
      const video=document.createElement('video');
      video.muted=true; video.loop=true; video.playsInline=true; video.preload='auto';
      const zone={video, requested:false, opacity:0, x:-1000, y:-1000, loaded:false, dirty:false, started:false, resetting:false, failed:false, exitAt:null, settling:false, settled:false, time:-1, callback:null};
      zones.push(zone);
      const decoded=() => { zone.dirty=true; wake(); if(!dead) zone.callback=video.requestVideoFrameCallback(decoded); };
      if(video.requestVideoFrameCallback) zone.callback=video.requestVideoFrameCallback(decoded);
      listen(video,'loadeddata',() => { zone.dirty=true; wake(); });
      listen(video,'seeked',() => {
        zone.resetting=false; zone.dirty=true;
        if(zone.settling) zone.settled=true;
        wake();
      });
      listen(video,'ended',() => {
        // Finish forward, then hold the first frame while the mask gently disappears.
        video.pause(); zone.started=false; zone.settling=true; zone.settled=false;
        zone.resetting=true; video.currentTime=0; wake();
      });
      listen(video,'error',() => { zone.failed=true; zone.started=false; video.pause(); wake(); });
    }
    let coverX=1, coverY=1;
    function resize() {
      width=innerWidth; height=innerHeight;
      const scale=Math.max(width/imageWidth,height/imageHeight);
      coverX=width/(imageWidth*scale); coverY=height/(imageHeight*scale);
      const dpr=Math.min(devicePixelRatio||1,1,Math.sqrt(1250000/(width*height)))*resolution;
      canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
      fullRedraw=true;previousRect=null;
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.viewport,width,height); gl.uniform2f(uniforms.cover,coverX,coverY);
      wake();
    }
    const trails = [{x:-1000,y:-1000},{x:-1000,y:-1000},{x:-1000,y:-1000}];
    const zoneData=new Float32Array(16), trailData=new Float32Array(9), rippleData=new Float32Array(32);
    const ripples=Array.from({length:8},()=>({x:0,y:0,born:-10000,power:0}));
    let rippleIndex=0, lastRippleAt=-10000, lastRippleX=-1000, lastRippleY=-1000;
    const addRipple=(x,y,now,power=1)=>{
      Object.assign(ripples[rippleIndex],{x,y,born:now,power});
      rippleIndex=(rippleIndex+1)%ripples.length;
      lastRippleX=x;lastRippleY=y;lastRippleAt=now;
      wake();
    };
    function reset(zone) {
      zone.video.pause(); zone.video.playbackRate=1; zone.video.loop=true;
      zone.started=false; zone.time=-1; zone.exitAt=null; zone.settling=false; zone.settled=false;
      if(zone.video.readyState>=2 && zone.video.currentTime>.001) {
        zone.resetting=true; zone.video.currentTime=0;
      }
    }
    function draw(now) {
      raf=0; if(dead || !ready || document.hidden) return;
      const elapsed=previous ? now-previous : 33.4;
      // Decorative water needs at most 30 fps; video textures update only when decoded.
      if(previous && elapsed<32){wake();return;}
      const dt=Math.min(elapsed,50); previous=now;
      if(strength>.002 && elapsed>48 && elapsed<150) slowFrames++; else slowFrames=Math.max(0,slowFrames-1);
      if(slowFrames>45 && resolution>.65) { resolution*=.8; slowFrames=0; resize(); }
      const targetStrength=visible ? Math.max(0,1-(now-movedAt)/900) : 0;
      strength+=(targetStrength-strength)*(1-Math.exp(-dt/130));
      for(let i=0;i<3;i++) {
        const target=i ? trails[i-1] : {x:px,y:py};
        trails[i].x+=(target.x-trails[i].x)*(1-Math.exp(-dt/(45+i*55)));
        trails[i].y+=(target.y-trails[i].y)*(1-Math.exp(-dt/(45+i*55)));
        trailData.set([trails[i].x,trails[i].y,strength*(i===0?1:.28)],i*3);
      }
      let active=false;
      ripples.forEach((ripple,i)=>{
        const age=(now-ripple.born)/1000;
        rippleData.set([ripple.x,ripple.y,age,ripple.power],i*4);
        if(age<1.85)active=true;
      });
      zones.forEach((zone,i) => {
        const wanted=((visible && selected===i) || zone.requested) && !zone.failed;
        if(wanted && !zone.loaded) {zone.loaded=true; zone.video.src=`main page/home-${portrait?'mobile':'desktop'}-${i}.mp4`;zone.video.load();}
        const canStart=wanted && zone.video.readyState>=2 && !zone.resetting && !zone.video.seeking;
        if(canStart && !zone.started) {
          // Commit frame zero before play() can advance this region's independent clock.
          try {upload(i+1,zone.video);} catch {zone.failed=true;return;}
          zone.requested=false; zone.dirty=false; zone.started=true; zone.settling=false; zone.settled=false;
          zone.exitAt=null; zone.video.loop=true; zone.video.playbackRate=1;
          zone.video.play().catch(error => { if(dead || error.name==='AbortError') return; zone.failed=true;wake(); });
        }
        if(zone.started && !zone.failed) {
          if(wanted) {
            zone.exitAt=null; zone.video.loop=true;
          } else if(zone.exitAt===null) {
            zone.exitAt=now; zone.video.loop=false;
          }
          // Each fish finishes its own current cycle at the original speed.
          if(zone.video.playbackRate!==1)zone.video.playbackRate=1;
        }
        const target=!zone.failed && (zone.started || (zone.settling && !zone.settled)) ? 1 : 0;
        zone.opacity+=(target-zone.opacity)*(1-Math.exp(-dt/(target?170:220)));
        if(zone.opacity<.004 && !target) {zone.opacity=0;if(zone.started || zone.settling)reset(zone);}
        // Keep the complete fish covered even after the pointer has moved to a neighbour.
        zone.x=((seeds[i][0]-.5)/coverX+.5)*width;
        zone.y=((seeds[i][1]-.5)/coverY+.5)*height;
        if(zone.opacity>0 && (zone.started || zone.settling) && (zone.dirty || (!zone.video.requestVideoFrameCallback && zone.time!==zone.video.currentTime))) {
          try {upload(i+1,zone.video);} catch {zone.failed=true;}
          zone.time=zone.video.currentTime;zone.dirty=false;
        }
        zoneData.set([zone.x,zone.y,zone.opacity,0],i*4);
        if(Math.abs(target-zone.opacity)>.004 || (zone.opacity>0 && !zone.video.requestVideoFrameCallback))active=true;
      });
      gl.uniform4fv(uniforms.zones,zoneData);gl.uniform3fv(uniforms.trail,trailData);gl.uniform4fv(uniforms.ripples,rippleData);
      // Redraw only changed water/animation areas, including the previous bounds to erase trails.
      let rect=null;
      const include=(x,y,r,ry=r)=>{
        const next=[Math.max(0,x-r),Math.max(0,y-ry),Math.min(width,x+r),Math.min(height,y+ry)];
        if(next[2]<=next[0] || next[3]<=next[1])return;
        rect=rect ? [Math.min(rect[0],next[0]),Math.min(rect[1],next[1]),Math.max(rect[2],next[2]),Math.max(rect[3],next[3])] : next;
      };
      zones.forEach((z,i)=>{if(z.opacity>.003)include(z.x,z.y,maskRadii[i][0]*width/coverX+12,maskRadii[i][1]*height/coverY+12);});
      if(strength>.002)trails.forEach(t=>include(t.x,t.y,115));
      ripples.forEach(r=>{const age=(now-r.born)/1000;if(age<1.85)include(r.x,r.y,40+age*82);});
      let dirty=rect;
      if(previousRect)dirty=dirty ? [Math.min(dirty[0],previousRect[0]),Math.min(dirty[1],previousRect[1]),Math.max(dirty[2],previousRect[2]),Math.max(dirty[3],previousRect[3])] : previousRect;
      if(fullRedraw){gl.disable(gl.SCISSOR_TEST);gl.drawArrays(gl.TRIANGLES,0,6);fullRedraw=false;}
      else if(dirty){
        const sx=canvas.width/width,sy=canvas.height/height;
        const left=Math.floor(dirty[0]*sx),bottom=Math.floor((height-dirty[3])*sy);
        gl.enable(gl.SCISSOR_TEST);gl.scissor(left,bottom,Math.ceil(dirty[2]*sx)-left,Math.ceil((height-dirty[1])*sy)-bottom);
        gl.drawArrays(gl.TRIANGLES,0,6);
      }
      previousRect=rect;
      if(active || strength>.002)wake(); else previous=0;
    }
    const updateIntent=now=>{
      zones.forEach((zone,i)=>{
        if(!zone.started)return;
        const wanted=visible && selected===i;
        // Disable looping in the input event itself, even immediately before the seam.
        zone.video.loop=wanted;
        if(wanted)zone.exitAt=null;
        else if(zone.exitAt===null)zone.exitAt=now;
      });
    };
    let touchId=null;
    const move=event => {
      const wasVisible=visible; visible=true; px=event.clientX; py=event.clientY; movedAt=performance.now();
      if(!wasVisible)trails.forEach(t=>{t.x=px;t.y=py;});
      const distance=Math.hypot(px-lastRippleX,py-lastRippleY);
      if(!wasVisible || (distance>32 && movedAt-lastRippleAt>105))addRipple(px,py,movedAt,.8);
      const x=(px/width-.5)*coverX+.5, y=(py/height-.5)*coverY+.5;
      // Activation is tighter than the reveal mask: water at the edges does not wake fish.
      const hit=portrait ? [[.32,.17],[0,0],[0,0],[.16,.14]] : [[.145,.18],[.12,.14],[.15,.17],[.075,.14]];
      let best=1;selected=-1;
      seeds.forEach((seed,i)=>{if(!hit[i][0])return;const d=Math.hypot((x-seed[0])/hit[i][0],(y-seed[1])/hit[i][1]);if(d<best){best=d;selected=i;}});
      updateIntent(movedAt);
      wake();
    };
    listen(window,'pointermove',event=>{if(event.pointerType==='mouse' || event.pointerId===touchId)move(event);});
    listen(window,'pointerdown',event=>{
      if(event.target.closest('a,button'))return;
      if(event.pointerType!=='mouse')touchId=event.pointerId;
      move(event);if(selected>=0)zones[selected].requested=true;
      addRipple(event.clientX,event.clientY,performance.now(),1.15);
    });
    const leave=()=>{visible=false;selected=-1;updateIntent(performance.now());wake();};
    listen(window,'pointerup',event=>{if(event.pointerId===touchId){touchId=null;leave();}});
    listen(window,'pointercancel',event=>{if(event.pointerId===touchId){touchId=null;leave();}});
    listen(document.documentElement,'pointerleave',leave);
    listen(window,'blur',leave);
    const suspend=()=>{
      visible=false;selected=-1;strength=0;previous=0;
      ripples.forEach(ripple=>{ripple.born=-10000;ripple.power=0;});
      cancelAnimationFrame(raf);raf=0;
      zones.forEach(zone=>{zone.requested=false;zone.opacity=0;reset(zone);});
    };
    listen(document,'visibilitychange',()=>{if(document.hidden)suspend();else wake();});
    listen(window,'pagehide',suspend);
    listen(window,'pageshow',wake);
    listen(window,'resize',()=>{leave();resize();});
    listen(canvas,'webglcontextlost',cleanup);
    return cleanup;
  }
})();
