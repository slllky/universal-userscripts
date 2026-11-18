'use strict';
// DOM/event integration in LinkeDOM with native canvas decoding. This is not a browser test.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');const {createCanvas,loadImage}=require('@napi-rs/canvas');
const script=fs.readFileSync(path.join(__dirname,'../Adventure-Time-Ooo-Crew.user.js'),'utf8');
async function fixture(){
  const {window}=parseHTML('<!doctype html><html><body><input id="page-input"><div id="aseerr-jake-walker"></div></body></html>');
  const {document,HTMLElement,HTMLCanvasElement,Event}=window;const canvases=new WeakMap(),storage=new Map(),rafs=new Map(),listeners=new Map(),menus=new Map();
  let root,serial=0,now=0,focus=null;const decodes=[];
  const nativeShadow=HTMLElement.prototype.attachShadow;
  HTMLElement.prototype.attachShadow=function(options){const result=nativeShadow.call(this,options);if(this.id==='aseerr-ooo-crew'){root=result;Object.defineProperty(root,'activeElement',{get:()=>focus,configurable:true});}return result;};
  HTMLElement.prototype.focus=function(){focus=this;};HTMLElement.prototype.setPointerCapture=function(){};
  const backing=el=>{if(!canvases.has(el))canvases.set(el,createCanvas(Number(el.getAttribute('width'))||300,Number(el.getAttribute('height'))||150));return canvases.get(el);};
  HTMLCanvasElement.prototype.getContext=function(){return backing(this).getContext('2d');};
  for(const key of ['width','height'])Object.defineProperty(HTMLCanvasElement.prototype,key,{configurable:true,get(){return Number(this.getAttribute(key))||(key==='width'?300:150);},set(value){this.setAttribute(key,value);if(canvases.has(this))canvases.get(this)[key]=value;}});
  window.top=window;window.self=window;document.hidden=false;document.fullscreenElement=null;
  const media={matches:false,addEventListener(_type,fn){this.change=fn;}};
  const context=vm.createContext({window,document,console,Blob,Uint8Array,atob,URL,innerWidth:1000,innerHeight:700,devicePixelRatio:1,location:{hostname:'example.test'},matchMedia:()=>media,
    requestAnimationFrame:fn=>{const id=++serial;rafs.set(id,fn);return id;},cancelAnimationFrame:id=>rafs.delete(id),setTimeout:()=>++serial,clearTimeout:()=>{},
    GM_getValue:(key,fallback)=>storage.has(key)?structuredClone(storage.get(key)):fallback,
    GM_setValue:(key,value)=>storage.set(key,JSON.parse(JSON.stringify(value))),
    GM_registerMenuCommand:(name,fn)=>menus.set(name,fn),GM_addValueChangeListener:(key,fn)=>listeners.set(key,fn),
    createImageBitmap:blob=>{const promise=blob.arrayBuffer().then(data=>loadImage(Buffer.from(data)));decodes.push(promise);return promise;}});
  vm.runInContext(script,context);
  await Promise.all(decodes);
  await new Promise(resolve=>setImmediate(resolve));
  if(!storage.get('ooo-crew.welcomed.v1'))throw new Error('App did not finish initialization; decodes='+decodes.length+' host='+!!root);
  const query=q=>root.querySelector(q);
  const fire=(el,type,props={})=>{assert.ok(el,`missing target: ${type}`);const event=new Event(type,{bubbles:true,cancelable:true,composed:true});Object.assign(event,props);el.dispatchEvent(event);return event;};
  const click=q=>fire(typeof q==='string'?query(q):q,'click',{detail:1});
  const pump=(count=1)=>{for(let i=0;i<count;i++){now+=50;const batch=[...rafs.values()];rafs.clear();for(const fn of batch)fn(now);}};
  return {window,document,root,context,storage,rafs,media,menus,listeners,query,fire,click,pump,backing};
}
test('actual compiled userscript controls and lifecycle',async t=>{
 const f=await fixture();const{query,click,fire,pump,storage,root,document}=f;
 await t.test('initialization creates one closed shadow host and seventeen controls with five selected',()=>{
  assert.equal(document.querySelectorAll('#aseerr-ooo-crew').length,1);assert.equal(document.getElementById('aseerr-ooo-crew').shadowRoot,null);
  assert.equal(root.querySelectorAll('[data-join]').length,17);assert.equal(root.querySelectorAll('[data-join][aria-pressed="true"]').length,5);assert.equal(query('.book').hidden,false);assert.ok(document.getElementById('aseerr-jake-walker'));assert.equal(f.menus.size,4);
 });
 await t.test('inviting and removing a character updates the rendered crew and persisted settings',()=>{
  click('[data-join="bubblegum"]');assert.equal(query('[data-join="bubblegum"]').getAttribute('aria-pressed'),'true');assert.ok(storage.get('ooo-crew.settings.v1').selected.includes('bubblegum'));
  click('[data-join="bubblegum"]');assert.equal(storage.get('ooo-crew.settings.v1').selected.includes('bubblegum'),false);
 });
 await t.test('presets and theme buttons apply to the actual host',()=>{
  click('[data-preset="everyone"]');assert.equal(storage.get('ooo-crew.settings.v1').selected.length,17);click('[data-tab="style"]');click('[data-theme="night"]');assert.equal(document.getElementById('aseerr-ooo-crew').dataset.theme,'night');
 });
 await t.test('range input previews changes and change persists a numeric value',()=>{
  const input=query('[data-setting="size"]');input.value='1.45';fire(input,'input');assert.equal(input.nextElementSibling.textContent,'1.45×');fire(input,'change');assert.equal(storage.get('ooo-crew.settings.v1').size,1.45);
 });
 await t.test('checkbox changes persist real booleans',()=>{
  const input=query('[data-setting="chatter"]');input.checked=false;fire(input,'change');assert.equal(storage.get('ooo-crew.settings.v1').chatter,false);
 });
 await t.test('tab arrow keys move selection and update the panel relationship',()=>{
  fire(query('[data-tab="style"]'),'keydown',{key:'ArrowRight'});assert.equal(query('[data-tab="journal"]').getAttribute('aria-selected'),'true');assert.equal(query('.page').getAttribute('aria-labelledby'),'tab-journal');
 });
 await t.test('a requested scene runs through the real animation loop and collects a postcard',()=>{
  click('[data-tab="play"]');click('[data-scene="concert"]');assert.equal(query('.book').hidden,true);pump(520);assert.ok(storage.get('ooo-crew.memories.v1').includes('concert'));
 });
 await t.test('play mode exposes actor hit targets; dragging has pointer ownership and returns to the floor',()=>{
  click('.launcher');click('[data-tab="play"]');click('[data-command="play"]');pump();const actor=query('[data-actor="finn"]');assert.equal(actor.hidden,false);
  fire(actor,'pointerdown',{button:0,pointerId:1,clientX:400,clientY:650});fire(actor,'pointermove',{pointerId:1,clientX:600,clientY:350});fire(actor,'pointerup',{pointerId:1,clientX:600,clientY:350});pump(30);assert.ok(storage.get('ooo-crew.memories.v1').includes('drag'));
 });
 await t.test('one-shot snack tool consumes one placement then restores click-through',()=>{
  click('[data-command="snack"]');assert.equal(query('.stage').style.pointerEvents,'auto');fire(query('.stage'),'pointerdown',{button:0,clientX:500,clientY:400});assert.equal(query('.stage').style.pointerEvents,'none');pump(300);assert.ok(storage.get('ooo-crew.memories.v1').includes('snack'));
 });
 await t.test('Escape exits play mode and closes the guide',()=>{
  const event=new f.window.Event('keydown',{bubbles:true});event.key='Escape';f.window.dispatchEvent(event);assert.equal(query('.book').hidden,true);pump();assert.ok([...root.querySelectorAll('.hit')].every(b=>b.hidden));
 });
 await t.test('pause and hidden-page lifecycle stop scheduling frames and resume cleanly',()=>{
  click('.pause-mini');pump(2);assert.equal(f.rafs.size,0);click('.pause-mini');assert.equal(f.rafs.size,1);document.hidden=true;document.dispatchEvent(new f.window.Event('visibilitychange'));pump(2);assert.equal(f.rafs.size,0);document.hidden=false;document.dispatchEvent(new f.window.Event('visibilitychange'));assert.equal(f.rafs.size,1);
 });
 await t.test('site snooze hides rendering and remains reversible from the guide',()=>{
  click('.launcher');click('[data-tab="style"]');click('[data-command="snooze"]');assert.ok(storage.get('ooo-crew.settings.v1').hiddenSites.includes('example.test'));assert.equal(document.getElementById('aseerr-ooo-crew').dataset.suspended,'true');click('[data-command="snooze"]');assert.equal(document.getElementById('aseerr-ooo-crew').dataset.suspended,'false');
 });
 await t.test('canvas dimensions follow the page viewport excluding the scrollbar',()=>{
  Object.defineProperty(document.documentElement,'clientWidth',{configurable:true,value:985});
  f.window.dispatchEvent(new f.window.Event('resize'));
  assert.equal(query('.stage').width,985);assert.equal(query('.stage').style.width,'985px');
  assert.equal(f.backing(query('.stage')).width,985);
 });
 await t.test('remote preference changes update the existing UI without a duplicate host',()=>{
  const remote={...storage.get('ooo-crew.settings.v1'),theme:'candy',selected:['jake','gunter']};f.listeners.get('ooo-crew.settings.v1')('ooo-crew.settings.v1',null,remote,true);assert.equal(document.getElementById('aseerr-ooo-crew').dataset.theme,'candy');vm.runInContext(script,f.context);assert.equal(document.querySelectorAll('#aseerr-ooo-crew').length,1);
 });
});
