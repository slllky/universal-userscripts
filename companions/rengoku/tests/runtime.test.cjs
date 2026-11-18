'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom'), {createCanvas,loadImage}=require('@napi-rs/canvas');
const dir=path.join(__dirname,'..'), script=fs.readFileSync(path.join(dir,'Rengoku-Bottom-Patrol.user.js'),'utf8');
function fixture(start={}) {
  const {window}=parseHTML('<!doctype html><html><body><input></body></html>');
  const {document,HTMLCanvasElement,HTMLElement,Event}=window;
  const storage=new Map(Object.entries(start)),listeners=new Map(),menus=new Map(),rafs=new Map(),bitmaps=[];
  let root,now=0,serial=0,focused=true;
  const attach=HTMLElement.prototype.attachShadow;
  HTMLElement.prototype.attachShadow=function(options){root=attach.call(this,options);return root;};
  const backing=new WeakMap();
  HTMLCanvasElement.prototype.getContext=function(){if(!backing.has(this))backing.set(this,createCanvas(300,150));return backing.get(this).getContext('2d');};
  for(const key of ['width','height']) {
    Object.defineProperty(HTMLCanvasElement.prototype,key,{configurable:true,get(){return Number(this.getAttribute(key))||0;},set(value){this.setAttribute(key,String(value));if(backing.has(this))backing.get(this)[key]=value;}});
  }
  window.self=window;window.top=window;window.innerWidth=900;window.innerHeight=680;window.devicePixelRatio=1;
  window.matchMedia=()=>({matches:false,addEventListener(){}});
  document.hidden=false;document.hasFocus=()=>focused;
  const context=vm.createContext({document,window,console,Uint8Array,Blob,atob,structuredClone,
    requestAnimationFrame:fn=>{const id=++serial;rafs.set(id,fn);return id;},cancelAnimationFrame:id=>rafs.delete(id),
    createImageBitmap:blob=>{const p=blob.arrayBuffer().then(b=>loadImage(Buffer.from(b)));bitmaps.push(p);return p;},
    GM_getValue:(k,d)=>storage.has(k)?structuredClone(storage.get(k)):d,
    GM_setValue:(k,v)=>storage.set(k,structuredClone(v)),GM_addValueChangeListener:(k,fn)=>listeners.set(k,fn),
    GM_registerMenuCommand:(name,fn)=>menus.set(name,fn)});
  const run=()=>vm.runInContext(script,context);
  run();
  const pump=n=>{for(let i=0;i<n;i++){now+=34;const batch=[...rafs.values()];rafs.clear();for(const f of batch)f(now);}};
  const query=q=>root.querySelector(q);
  return {storage,menus,listeners,pump,query,run,document,window,Event,rafs,bitmaps,ready:Promise.all(bitmaps).then(()=>new Promise(r=>setImmediate(r))),
    setFocus(value){focused=value;window.dispatchEvent(new Event(value?'focus':'blur'));},
    remote(key,value){storage.set(key,structuredClone(value));listeners.get(key)(key,null,value,true);},
    ink(){return backing.get(query('canvas')).toBuffer('image/png').length;}};
}
test('compiled patrol migrates hidden state and the manual can restore, control and hand off the patrol',async()=>{
  const f=fixture({'rengoku:hidden:v1':true});await f.ready;assert.equal(f.bitmaps.length,9);
  assert.equal(f.rafs.size,0);assert.equal(f.query('.rp-strip').hidden,true);
  f.query('.rp-launch').click();assert.equal(f.query('.rp-book').hidden,false);
  const enabled=f.query('[data-setting=enabled]');enabled.checked=true;enabled.dispatchEvent(new f.Event('change'));
  assert.equal(f.storage.get('rengoku:field-manual:v2').enabled,true);assert.equal(f.rafs.size,1);
  f.pump(12);assert.ok(f.ink()>550);assert.equal(f.query('.rp-hit').hidden,false);
  f.query('.rp-hit').dispatchEvent(new f.Event('contextmenu',{cancelable:true}));
  f.pump(30);f.setFocus(false);
  const key='rengoku:patrol-owner:v2';const saved=f.storage.get(key);
  assert.ok(saved.state.battle);assert.equal(f.rafs.size,0);
  f.remote(key,{id:'different-tab',state:saved.state});f.setFocus(true);f.pump(2);assert.equal(f.rafs.size,1);
  f.setFocus(false);assert.equal(f.storage.get(key).state.battle.kind,saved.state.battle.kind);
  f.setFocus(true);f.pump(1);f.remote(key,{id:'different-tab',state:saved.state});assert.equal(f.rafs.size,0);
  f.remote('rengoku:field-manual:v2',{enabled:false,interact:false,scale:1});assert.equal(f.query('.rp-hit').hidden,true);
  f.menus.get('Rengoku: field manual')();assert.equal(f.query('.rp-book').hidden,false);
  f.run();assert.equal(f.document.querySelectorAll('#rengoku-patrol').length,1);
});
test('release uses the original script identity, same public update endpoint and purely local art',()=>{
  const header=fs.readFileSync(path.join(dir,'Rengoku-Bottom-Patrol.meta.js'),'utf8');
  assert.ok(script.startsWith(header));assert.match(header,/@namespace\s+aseerr-rengoku-patrol/);
  assert.match(header,/@downloadURL\s+https:\/\/raw\.githubusercontent\.com\/slllky\/universal-userscripts\/main\/companions\/rengoku\/Rengoku-Bottom-Patrol.user.js/);
  assert.doesNotMatch(header,/@(?:exclude|connect|resource|require)\b|GM_xmlhttpRequest/);
  assert.match(header,/@match\s+https:\/\/\*\/\*/);assert.match(header,/@match\s+http:\/\/\*\/\*/);
});
