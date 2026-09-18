const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Exercise the real input/playback code with deterministic media and frame clocks.
// GPU rendering is mocked; video play counts and hover transitions are real logic.
function scene() {
  class Target {
    listeners = new Map();
    addEventListener(name, fn) {
      if (!this.listeners.has(name)) this.listeners.set(name, []);
      this.listeners.get(name).push(fn);
    }
    emit(name, data = {}) { for (const fn of this.listeners.get(name) || []) fn(data); }
  }
  const window = new Target(), document = new Target(), host = new Target();
  const videos = [], images = [], frames = new Map();
  let clock = 0, id = 0;
  const gl = new Proxy({}, {get: (_, key) => /^[A-Z_0-9]+$/.test(key) ? 0 : () => true});
  host.append = () => {};
  host.classList = {add() {}, remove() {}};
  document.documentElement = new Target();
  document.querySelector = () => host;
  document.hidden = false;
  document.createElement = type => {
    const node = new Target();
    if (type === 'canvas') return Object.assign(node, {getContext: () => gl, remove() {}});
    Object.assign(node, {readyState:2, seeking:false, videoWidth:720, videoHeight:480,
      plays:0, paused:true, load() {}, removeAttribute() {},
      play() {this.plays++; this.paused=false; return Promise.resolve();}, pause() {this.paused=true;}});
    let time = 0;
    Object.defineProperty(node, 'currentTime', {get: () => time, set(value) {time=value; node.emit('seeked');}});
    videos.push(node);
    return node;
  };
  class Image { constructor() {this.naturalWidth=1280;this.naturalHeight=720;images.push(this);} }
  const context = {window,document,Image,AbortController,console,Float32Array,Uint8Array,
    innerWidth:1280,innerHeight:720,devicePixelRatio:1,performance:{now:()=>clock},
    matchMedia:query=>Object.assign(new Target(), {matches:query.includes('no-preference')}),
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../home-water.js'),'utf8'), context);
  images.forEach(image => image.onload());
  const tick = (count = 1) => {for(let i=0;i<count;i++){clock+=34;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(clock));}};
  const move = (x=326,y=307) => {window.emit('pointermove',{clientX:x,clientY:y,pointerType:'mouse'});tick();};
  const feed = () => {window.emit('fishfeed',{detail:{x:326,y:307}});tick();};
  return {videos,tick,move,feed};
}

test('rapid repeated hovering and feeding never queue or loop a busy fish', () => {
  const s=scene();s.move();
  const fish=s.videos[0];
  assert.equal(fish.plays,1);
  for(let i=0;i<100;i++){s.move(640,650);s.move();s.feed();}
  assert.equal(fish.plays,1);
  assert.equal(fish.loop,false);
  fish.emit('ended');s.tick(80);
  assert.equal(fish.plays,1,'finishing must not replay stored hover or food requests');
  s.move();s.tick(80);
  assert.equal(fish.plays,1,'moving inside the same fish after completion must not replay');
  s.move(640,650);s.move();
  assert.equal(fish.plays,2,'a fresh entry after completion starts exactly one new cycle');
});

test('leaving a fish does not pause its cycle and requests during fade-out are discarded', () => {
  const s=scene();s.move();const fish=s.videos[0];
  s.move(640,650);
  assert.equal(fish.paused,false);
  fish.emit('ended');
  s.move();s.feed();s.tick(80);
  assert.equal(fish.plays,1);
  s.feed();
  assert.equal(fish.plays,2,'feeding an idle fish still works');
});
