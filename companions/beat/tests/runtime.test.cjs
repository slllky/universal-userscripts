'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const {createCanvas,loadImage} = require('@napi-rs/canvas');
const dir = path.join(__dirname,'..');
const read = file => fs.readFileSync(path.join(dir,file),'utf8');
const code = read('Beat-Browser-Skater.user.js');
function fixture(initial = {}, preview = false) {
  const {window} = parseHTML('<!doctype html><html><body><input></body></html>');
  const {document,HTMLElement,HTMLCanvasElement,Event} = window;
  const storage = new Map(Object.entries(initial)), menus = new Map(), subs = new Map();
  const buffers = new WeakMap(), images = [], frames = new Map(), timers = new Map();
  let root, serial = 0, time = 0;
  const attach = HTMLElement.prototype.attachShadow;
  HTMLElement.prototype.attachShadow = function(opts) { root = attach.call(this,opts); return root; };
  HTMLCanvasElement.prototype.getContext = function() {
    if (!buffers.has(this)) buffers.set(this,createCanvas(300,150));
    return buffers.get(this).getContext('2d');
  };
  for (const k of ['width','height']) Object.defineProperty(HTMLCanvasElement.prototype,k,{configurable:true,
    get() { return Number(this.getAttribute(k)) || 0; },
    set(value) { this.setAttribute(k,String(value)); if (buffers.has(this)) buffers.get(this)[k] = value; }});
  window.top = window; window.self = window; window.innerWidth = 800; window.innerHeight = 480; window.devicePixelRatio = 1;
  window.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
  window.setInterval = window.setTimeout = fn => {const id = ++serial; timers.set(id,fn); return id;};
  window.clearInterval = window.clearTimeout = id => timers.delete(id);
  window.localStorage = {getItem:k => storage.get(k) ?? null,setItem:(k,v) => storage.set(k,v)};
  document.hidden = false; document.hasFocus = () => true;
  const context = vm.createContext({
    document,window,console,atob,Blob,Uint8Array,structuredClone,
    requestAnimationFrame(fn) {const id = ++serial; frames.set(id,fn); return id;},
    cancelAnimationFrame:id => frames.delete(id),
    createImageBitmap(blob) {const p = blob.arrayBuffer().then(b => loadImage(Buffer.from(b))); images.push(p); return p;},
    ...(!preview && {
      GM_getValue:(k,v) => storage.has(k) ? structuredClone(storage.get(k)) : v,
      GM_setValue:(k,v) => storage.set(k,structuredClone(v)), GM_deleteValue:k => storage.delete(k),
      GM_listValues:() => Array.from(storage.keys()), GM_registerMenuCommand:(k,fn) => menus.set(k,fn),
      GM_addValueChangeListener(k,fn) {const id = ++serial; subs.set(id,[k,fn]); return id;},
      GM_removeValueChangeListener:id => subs.delete(id)
    })
  });
  const script = preview ? read('Beat-Preview.html').split('<script>')[1].split('</script>')[0] : code;
  function run() {vm.runInContext(script,context);}
  run();
  return {window,document,storage,menus,images,frames,timers,subs,run,Event,
    get ready() {return Promise.all(images).then(() => new Promise(resolve => setImmediate(resolve)));},
    q:selector => root.querySelector(selector),
    pump(n) {for (let i=0;i<n;i++) {time+=32; const batch=Array.from(frames.values()); frames.clear(); for(const fn of batch) fn(time);}},
    remote(k,v) {storage.set(k,structuredClone(v)); for (const [key,fn] of subs.values()) if (key===k) fn(k,null,v,true);},
    hasInk() {return buffers.get(root.querySelector('canvas')).getContext('2d').getImageData(0,0,800,480).data.some((v,i) => i%4===3 && v>32);}
  };
}
test('installed bundle keeps v1 preferences, brings Beat back, plays and banks tricks, and cleans up',async () => {
  const prefs='beat-skater-v1:settings';
  const f = fixture({[prefs]:{mode:'follow',scale:2,hidden:true}});
  await f.ready; assert.equal(f.images.length,9); assert.equal(f.frames.size,0);
  f.q('.bt-dial').click(); assert.equal(f.q('.bt-deck').hidden,false);
  assert.equal(f.q('#bt-control-scale').value,'2'); assert.equal(f.q('[data-field="delay"]').hidden,false);
  f.menus.get('Beat: controls / bring here')(); f.pump(35);
  assert.equal(f.storage.get(prefs).hidden,false); assert.equal(f.storage.get(prefs).mode,'follow');
  assert.equal(f.frames.size,1); assert.equal(f.q('.beat-hit').hidden,false); assert.equal(f.hasInk(),true);
  f.q('#bt-tab-tricks').click(); f.q('[data-move="sidewinder"]').click();
  f.pump(550); assert.ok(f.storage.get('beat-skater-v1:best-v2')>0);
  f.q('#bt-tab-setup').click();
  const classic=f.q('input[value="classic"]'); classic.checked=true; classic.dispatchEvent(new f.Event('change'));
  assert.equal(f.storage.get(prefs).skin,'classic'); f.pump(5); assert.equal(f.hasInk(),true);
  f.remote(prefs,{...f.storage.get(prefs),interact:false}); assert.equal(f.q('.beat-hit').hidden,true);
  f.document.hidden=true; f.document.dispatchEvent(new f.Event('visibilitychange')); assert.equal(f.frames.size,0);
  f.document.hidden=false; f.document.dispatchEvent(new f.Event('visibilitychange')); assert.equal(f.frames.size,1);
  f.run(); assert.equal(f.document.querySelectorAll('#beat-browser-skater').length,1);
  f.window.dispatchEvent(new f.Event('pagehide')); assert.equal(f.frames.size,0); assert.equal(f.subs.size,0); assert.equal(f.timers.size,0);
});
test('offline preview uses the actual userscript deck and embedded renderer without extension grants',async () => {
  const f=fixture({},true); await f.ready; f.pump(35);
  assert.equal(f.frames.size,1); assert.equal(f.hasInk(),true);
  f.q('.bt-dial').click();
  const volume=f.q('#bt-volume'); volume.value='61'; volume.dispatchEvent(new f.Event('input'));
  assert.equal(f.storage.get('preview/beat-skater-v1:volume-v2'),'0.61');
  f.q('.bt-transport').click(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.q('.bt-transport').getAttribute('aria-label'),'Play radio');
  assert.match(f.q('[role="status"]').textContent,/audio is unavailable/i);
  f.q('.bt-hop').click();
  assert.match(f.q('[role="status"]').textContent,/another webpage/i);
  f.q('#bt-tab-tricks').click(); f.q('[data-move="airmail"]').click(); f.pump(560);
  assert.ok(Number(f.q('[data-counter="best"]').textContent)>0);
  const event=new f.Event('pagehide'); Object.defineProperty(event,'persisted',{value:true});
  f.window.dispatchEvent(event); assert.equal(f.frames.size,0);
  f.window.dispatchEvent(new f.Event('pageshow')); f.pump(25); assert.equal(f.hasInk(),true);
  f.window.dispatchEvent(new f.Event('pagehide'));
});
test('public update header preserves Beat’s install identity and universal scope',() => {
  const header=read('Beat-Browser-Skater.meta.js');
  assert.ok(code.startsWith(header)); assert.match(header,/@name\s+Beat — Browser Skater/);
  assert.match(header,/@namespace\s+aseerr-beat-browser-skater/); assert.match(header,/@version\s+3\.0\.0/);
  assert.match(header,/@match\s+http:\/\/\*\/\*/); assert.match(header,/@match\s+https:\/\/\*\/\*/);
  for (const [tag,extension] of [['updateURL','meta'],['downloadURL','user']]) {
    assert.ok(header.includes(tag)); assert.ok(header.includes('main/companions/beat/Beat-Browser-Skater.'+extension+'.js'));
  }
  assert.doesNotMatch(header,/@(?:exclude|connect|require|resource)\b|GM_xmlhttpRequest/);
});
test('installed deck changes crews, performs autonomous duets and recalls the selected station without pressing play',async () => {
  const f=fixture(); await f.ready; f.pump(30);
  f.q('.bt-dial').click();
  const rider=f.q('input[value="yoyo"]'); rider.checked=true; rider.dispatchEvent(new f.Event('change'));
  const partner=f.q('#bt-control-partner');
  partner.querySelector('option[value="zero"]').selected=true; partner.dispatchEvent(new f.Event('change'));
  f.pump(175);
  assert.match(f.q('.bt-cast').textContent,/free skate.*yo-yo.*zero beat/i);
  assert.equal(f.q('.bt-live').hidden,false);
  assert.match(f.q('.beat-hit').getAttribute('aria-label'),/Yo-Yo/);
  assert.equal(f.storage.get('beat-skater-v1:best-v2'),undefined);
  f.q('#bt-tab-station').click();
  const track=f.q('#bt-track'); assert.equal(track.options.length,15);
  track.querySelector('option[value="wisteria"]').selected=true; track.dispatchEvent(new f.Event('change'));
  assert.equal(f.storage.get('beat-skater-v1:track-v3'),'wisteria'); assert.equal(f.q('.bt-track-title').textContent,'Wisteria Underpass');
  f.q('[data-step="1"]').click(); assert.equal(f.q('.bt-track-title').textContent,'Kerosene Laces');
  const order=f.q('#bt-order'); order.querySelector('option[value="shuffle"]').selected=true; order.dispatchEvent(new f.Event('change'));
  assert.equal(f.storage.get('beat-skater-v1:order-v3'),'shuffle');
  assert.equal(f.q('.bt-transport').getAttribute('aria-label'),'Play radio');
  f.remote('beat-skater-v1:track-v3','umbrella'); assert.equal(f.q('.bt-track-title').textContent,'Chrome Umbrella');
  assert.equal(f.storage.get('beat-skater-v1:settings').partner,'zero');
  f.window.dispatchEvent(new f.Event('pagehide'));
  const fresh=fixture(Object.fromEntries(f.storage)); await fresh.ready;
  assert.equal(fresh.q('.bt-track-title').textContent,'Chrome Umbrella'); assert.equal(fresh.q('#bt-order').value,'shuffle');
  assert.match(fresh.q('.beat-hit').getAttribute('aria-label'),/Yo-Yo/); assert.equal(fresh.q('.bt-transport').getAttribute('aria-label'),'Play radio');
  fresh.window.dispatchEvent(new fresh.Event('pagehide'));
});
