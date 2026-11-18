'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {World,normalize,riders,signatures,lines}=require('../src/engine');
const {Renderer,frameFor}=require('../src/draw');
const root=path.join(__dirname,'../assets');
async function asset(id){return {frames:require(path.join(root,id,'frames.json')),image:await loadImage(path.join(root,id,'sheet.png'))};}
const pixels=cv=>Buffer.from(cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data);
test('new crew signatures remain unique and preserve existing preference normalization',()=>{
 assert.equal(Object.keys(riders).length,15);assert.equal(new Set(Object.values(signatures)).size,15);
 for(const id of Object.keys(riders)){const w=new World({rider:id,ambient:false});assert.equal(w.perform(signatures[id]),true);assert.ok(lines[signatures[id]]);}
 assert.equal(normalize({rider:'noise',district:'terminal',scale:2}).rider,'noise');
 assert.equal(normalize({district:'__proto__'}).district,'off');
});
test('six park crops are valid pixel rectangles and clearing scenery restores transparent page',async()=>{
 const parks=await asset('parks'),cv=createCanvas(480,260),v=new Renderer(cv.getContext('2d'),{parks});
 assert.equal(parks.image.width,parks.frames.width);assert.equal(parks.image.height,parks.frames.height);
 for(const [id,c] of Object.entries(parks.frames.districts)){
  const [x,y,width,height]=c;assert.ok(x>=0&&y>=0&&width>0&&height>0&&x+width<=parks.image.width&&y+height<=parks.image.height);
  const w=new World({district:id,ambient:false},480,260);v.draw(w);assert.ok(pixels(cv).some(Boolean));
  w.apply({district:'off'});v.draw(w);assert.ok(!pixels(cv).some(Boolean));
 }
});
test('Combo circle plays every hands-free cel, keeps boombox fixed and clears without trails',async()=>{
 const combo=await asset('combo'),cv=createCanvas(420,240),ref=createCanvas(420,240);
 const v=new Renderer(cv.getContext('2d'),{combo}),fresh=new Renderer(ref.getContext('2d'),{combo});
 const w=new World({rider:'combo',ambient:false,fx:'off'},420,240);w.perform('circle');
 const anchor=w.trick.x0,seen=new Set(),positions=new Set();
 for(let i=0;i<87;i++){
  w.step(.05);assert.equal(w.trick.x0,anchor);seen.add(frameFor(w.hero,combo.frames,false));positions.add(Math.round(w.hero.x));
  v.draw(w);ref.getContext('2d').clearRect(0,0,420,240);fresh.draw(w);assert.ok(pixels(cv).equals(pixels(ref)));
 }
 assert.deepEqual([...seen].sort((a,b)=>a-b),[16,17,18,19,20,21]);assert.ok(positions.size>20);
 w.apply({hidden:true});v.draw(w);assert.ok(!pixels(cv).some(Boolean));
});
test('manual steering does not auto-roam, stays bounded and uses normalized diagonal speed',()=>{
 const w=new World({mode:'manual',ambient:true},800,600),x=w.hero.x,y=w.hero.y;
 w.step(10);assert.equal(w.hero.x,x);assert.equal(w.hero.y,y);assert.equal(w.trick,null);
 w.steer(1,-1);w.step(.1);assert.ok(Math.abs(Math.hypot(w.hero.x-x,w.hero.y-y)-18)<.01);
 w.steer(-1,-1);w.step(50);assert.equal(w.hero.x,w.boundX(0));assert.equal(w.hero.y,w.boundY(0));
 w.steer(0,0);const stop=w.hero.x;w.step(2);assert.equal(w.hero.x,stop);
});
test('every new trick is playable by old and new riders without invalid frame selection',async()=>{
 const {moves}=require('../src/engine');const {geometry}=require('../src/draw');
 for(const rider of ['beat','combo','cube','jazz']){
  const a=await asset(rider==='beat'?'remix':rider);
  for(const move of Object.keys(moves)){
   const w=new World({rider,ambient:false},320,240);assert.equal(w.perform(move),true);
   for(let i=0;i<100&&w.trick;i++){
    w.step(.05);const p=geometry(w.hero,a,w.scale,false);
    assert.ok(Number.isInteger(p.n)&&p.n>=0&&p.n<a.frames.count,rider+'/'+move);
    assert.ok(Object.values(p.rect).every(Number.isFinite));
   }
  }
 }
});
test('three-person relay uses distinct riders, restores across tabs and cleans up',()=>{
 for(const width of [180,390,900]){
  const w=new World({ambient:false,rider:'combo'},width,320);w.perform('crewrelay');w.step(.4);
  assert.ok(w.partner&&w.third);assert.equal(new Set([w.hero.rider,w.partner.rider,w.third.rider]).size,3);
  for(const a of [w.hero,w.partner,w.third])assert.ok(a.x-64*w.scale>=0&&a.x+64*w.scale<=width);
  const other=new World(w.settings,width,320);assert.ok(other.restore(JSON.parse(JSON.stringify(w.snapshot()))));assert.ok(other.third);assert.equal(other.third.rider,w.third.rider);
  w.apply({partner:'off'});assert.equal(w.partner,null);assert.equal(w.third,null);
  other.cancelTrick();assert.equal(other.third,null);assert.ok(other.hero.x>=64*other.scale);
 }
});
