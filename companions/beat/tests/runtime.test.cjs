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
  await f.ready; assert.equal(f.images.length,18); assert.equal(f.frames.size,0);
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
  assert.match(header,/@namespace\s+aseerr-beat-browser-skater/); assert.equal(header.match(/@version\s+(\S+)/)[1],require('../package.json').version);
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
test('installed district tour starts, tracks deliberate tags and resumes persisted progress',async()=>{
 const f=fixture();await f.ready;f.pump(35);f.q('.bt-tour-start').click();
 const prefs=f.storage.get('beat-skater-v1:settings');assert.equal(prefs.district,'spool');assert.equal(prefs.tour,true);assert.equal(prefs.mode,'manual');
 for(let i=0;i<3;i++){f.q('[data-move="tag"]').click();f.pump(55);}
 assert.equal(f.storage.get('beat-skater-v1:tour-v4').districts.spool.tags,3);
 const saved={version:1,districts:{spool:{tags:3,cans:3,best:700}}};f.remote('beat-skater-v1:tour-v4',saved);
 assert.equal(f.q('.bt-tour-next').disabled,false);f.q('.bt-tour-next').click();assert.equal(f.storage.get('beat-skater-v1:settings').district,'crane');
 f.q('.bt-tour-stop').click();assert.equal(f.storage.get('beat-skater-v1:settings').tour,false);assert.equal(f.storage.get('beat-skater-v1:tour-v4').districts.spool.best,700);
 f.window.dispatchEvent(new f.Event('pagehide'));
});
test('manual keyboard works on focused canvas inside closed shadow root and leaves input untouched',async()=>{
 const f=fixture();await f.ready;f.pump(35);f.q('.bt-steer').click();
 const cv=f.q('canvas.beat-stage');const evt=(key,code)=>{const e=new f.Event('keydown',{bubbles:true,cancelable:true,composed:true});Object.assign(e,{key,code});return e;};
 const before=f.q('.beat-hit').style.transform;
 const right=evt('ArrowRight','ArrowRight');cv.dispatchEvent(right);f.pump(15);
 assert.equal(right.defaultPrevented,true);assert.notEqual(f.q('.beat-hit').style.transform,before);
 const up=new f.Event('keyup',{bubbles:true});up.key='ArrowRight';cv.dispatchEvent(up);
 const grind=evt('g','KeyG');cv.dispatchEvent(grind);f.pump(70);assert.equal(grind.defaultPrevented,true);assert.ok(Number(f.q('[data-counter="score"]').textContent)>0);
 const input=f.document.querySelector('input'),typed=evt('g','KeyG');input.dispatchEvent(typed);assert.equal(typed.defaultPrevented,false);
 f.window.dispatchEvent(new f.Event('pagehide'));
});
test('tour earns all first-district objectives through gameplay and survives a fresh runtime',async()=>{
 const f=fixture();await f.ready;f.pump(35);f.q('.bt-tour-start').click();
 for(let i=0;i<3;i++){f.q('[data-move="tag"]').click();f.pump(55);}
 const follow=f.q('input[value="follow"]');follow.checked=true;follow.dispatchEvent(new f.Event('change'));
 for(const x of [140,280,420]){const e=new f.Event('pointermove',{bubbles:true});Object.assign(e,{clientX:x,clientY:360,pointerType:'mouse'});f.document.dispatchEvent(e);f.pump(7);}
 f.pump(350);
 assert.equal(f.storage.get('beat-skater-v1:tour-v4').districts.spool.cans,3);
 f.q('[data-move="needlethread"]').click();f.pump(600);
 const earned=f.storage.get('beat-skater-v1:tour-v4');assert.ok(earned.districts.spool.best>=600);assert.equal(f.q('.bt-tour-next').disabled,false);
 f.window.dispatchEvent(new f.Event('pagehide'));
 const g=fixture(Object.fromEntries(f.storage));await g.ready;g.pump(35);g.q('.bt-tour-start').click();
 assert.equal(g.storage.get('beat-skater-v1:settings').district,'crane');assert.equal(g.storage.get('beat-skater-v1:tour-v4').districts.spool.cans,3);
 g.window.dispatchEvent(new g.Event('pagehide'));
});
test('offline preview persists tour progress through localStorage',async()=>{
 const f=fixture({},true);await f.ready;f.pump(35);f.q('.bt-tour-start').click();f.q('[data-move="tag"]').click();f.pump(55);
 const stored=f.storage.get('preview/beat-skater-v1:tour-v4');assert.equal(JSON.parse(stored).districts.spool.tags,1);
 f.window.dispatchEvent(new f.Event('pagehide'));const g=fixture(Object.fromEntries(f.storage),true);await g.ready;g.pump(35);assert.match(g.q('.bt-tour-progress').textContent,/tags 1\/3/);g.window.dispatchEvent(new g.Event('pagehide'));
});
test('live rival exhibition starts, visibly advances scoring and can stop without tour mutation',async()=>{
 const f=fixture();await f.ready;f.pump(35);f.q('.bt-rival').click();f.pump(300);
 assert.match(f.q('.bt-rival-status').textContent,/You 0 \/ Gum [1-9]/);assert.equal(f.storage.get('beat-skater-v1:tour-v4'),undefined);
 f.q('.bt-rival').click();assert.equal(f.q('.bt-rival-status').textContent,'Exhibition stopped.');f.window.dispatchEvent(new f.Event('pagehide'));
});
test('DJ arrangement setting persists without altering selected song or autoplay',async()=>{
 const f=fixture();await f.ready;const select=f.q('#bt-arrangement');select.querySelector('option[value="dub"]').selected=true;select.dispatchEvent(new f.Event('change'));assert.equal(f.storage.get('beat-skater-v1:arrangement-v4'),'dub');assert.equal(f.q('.bt-transport').getAttribute('aria-label'),'Play radio');f.window.dispatchEvent(new f.Event('pagehide'));const g=fixture(Object.fromEntries(f.storage));await g.ready;assert.equal(g.q('#bt-arrangement').value,'dub');assert.equal(g.q('.bt-track-title').textContent,'Curbside Frequency');g.window.dispatchEvent(new g.Event('pagehide'));
});
test('page exploration hides park without destroying saved backdrop choice',async()=>{
 const f=fixture({'beat-skater-v1:settings':{district:'spool'}});await f.ready;const page=f.q('input[value="page"]');page.checked=true;page.dispatchEvent(new f.Event('change'));assert.equal(f.storage.get('beat-skater-v1:settings').district,'spool');assert.equal(f.q('#bt-control-district').disabled,true);assert.equal(f.q('.bt-page-backdrop').hidden,false);const idle=f.q('input[value="idle"]');idle.checked=true;idle.dispatchEvent(new f.Event('change'));assert.equal(f.storage.get('beat-skater-v1:settings').district,'spool');assert.equal(f.q('#bt-control-district').disabled,false);f.window.dispatchEvent(new f.Event('pagehide'));
});
test('completed tour crew match records at most one result and survives a fresh runtime',async()=>{
 const f=fixture();await f.ready;f.pump(35);f.q('.bt-tour-start').click();f.q('.bt-rival-crew').click();for(const id of ['needlethread','airmail','switchyard']){f.q('[data-move="'+id+'"]').click();f.pump(450);}f.pump(180);const result=f.q('.bt-rival-status').textContent;assert.match(result,/win|Draw/);const saved=f.storage.get('beat-skater-v1:tour-v4');assert.ok(saved);assert.equal(saved.districts.spool.crewMedal,result.startsWith('You win')?1:0);const before=JSON.stringify(saved);f.pump(100);assert.equal(JSON.stringify(f.storage.get('beat-skater-v1:tour-v4')),before);f.window.dispatchEvent(new f.Event('pagehide'));const g=fixture(Object.fromEntries(f.storage));await g.ready;assert.equal(g.storage.get('beat-skater-v1:tour-v4').districts.spool.crewMedal,saved.districts.spool.crewMedal);g.window.dispatchEvent(new g.Event('pagehide'));
});
test('tap steering moves through normal collision path without stealing keyboard focus',async()=>{
 const f=fixture();await f.ready;f.pump(35);const mode=f.q('input[value="park"]');mode.checked=true;mode.dispatchEvent(new f.Event('change'));f.pump(2);const before=f.q('.beat-hit').style.transform;f.q('[data-pad="right"]').click();assert.notEqual(f.q('.beat-hit').style.transform,before);assert.equal(f.storage.get('beat-skater-v1:settings').mode,'park');f.window.dispatchEvent(new f.Event('pagehide'));
});
test('installed district contract credits completed tricks rather than clicks and persists progress',async()=>{
 const f=fixture();await f.ready;f.pump(35);f.q('.bt-tour-start').click();f.q('[data-move="jump"]').click();assert.equal(f.storage.get('beat-skater-v1:tour-v4'),undefined);f.pump(100);assert.equal(f.storage.get('beat-skater-v1:tour-v4').districts.spool.contract,1);f.q('[data-move="grind"]').click();f.pump(100);f.q('[data-move="tag"]').click();f.pump(100);assert.equal(f.storage.get('beat-skater-v1:tour-v4').districts.spool.contract,7);assert.match(f.q('.bt-tour-progress').textContent,/Street initiation/);f.window.dispatchEvent(new f.Event('pagehide'));
});

test('manual mode preserves empty and plaintext-only editable hosts',async()=>{
 const f=fixture({'beat-skater-v1:settings':{mode:'manual',ambient:false}});await f.ready;f.pump(150);f.q('.bt-steer').click();
 const cv=f.q('canvas.beat-stage');
 const key=(k,c)=>{const e=new f.Event('keydown',{bubbles:true,cancelable:true,composed:true});Object.assign(e,{key:k,code:c});return e;};
 for(const value of ['', 'true', 'plaintext-only']){
  const editor=f.document.createElement('div');editor.setAttribute('contenteditable',value);
  const child=f.document.createElement('span');editor.append(child);f.document.body.append(editor);
  for(const [k,c] of [['ArrowRight','ArrowRight'],[' ','Space'],['g','KeyG']]){
   const e=key(k,c);child.dispatchEvent(e);assert.equal(e.defaultPrevented,false,'editor '+value+' key '+c);
  }
 }
 f.window.dispatchEvent(new f.Event('pagehide'));
});
test('focusing a host editor releases held movement without consuming its keys',async()=>{
 const f=fixture({'beat-skater-v1:settings':{mode:'manual',ambient:false,motion:'reduced'}});await f.ready;f.pump(40);f.q('.bt-steer').click();const cv=f.q('canvas.beat-stage'),down=new f.Event('keydown',{bubbles:true,cancelable:true});Object.assign(down,{key:'ArrowRight',code:'ArrowRight'});cv.dispatchEvent(down);f.pump(2);const editor=f.document.createElement('div');editor.setAttribute('contenteditable','');f.document.body.append(editor);editor.dispatchEvent(new f.Event('focusin',{bubbles:true}));f.pump(2);const before=f.q('.beat-hit').style.transform;f.pump(10);assert.equal(f.q('.beat-hit').style.transform,before);f.window.dispatchEvent(new f.Event('pagehide'));
});
