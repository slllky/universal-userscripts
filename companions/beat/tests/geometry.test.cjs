'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{scan}=require('../src/geometry'),{World}=require('../src/engine');
function fixture(nodes){let i=0;return {body:{},activeElement:{},createTreeWalker(){return {nextNode(){return nodes[i++]||null;}};}};}
const node=(left=20,top=240,width=600)=>({tagName:'SECTION',closest:()=>null,contains:()=>false,getBoundingClientRect:()=>({left,right:left+width,top,width,height:90}),get textContent(){throw Error('must not read text');}});
test('sampler reads only bounded geometry and ignores fields, invalid rectangles and duplicate edges',()=>{
 const hidden=node();hidden.closest=()=>({});const bad=node();bad.getBoundingClientRect=()=>({left:NaN,right:900,top:200,width:800,height:80});
 const field=node();field.tagName='INPUT';
 const rows=scan(fixture([node(),node(),hidden,bad,field,node(40,400,500)]),null,800,600,1);
 assert.deepEqual(rows,[{left:64,right:620,y:240},{left:64,right:540,y:400}]);
});
test('sampler traversal and layout reads are capped even on huge pages',()=>{
 let measured=0,walked=0;const nodes=Array.from({length:10000},(_,i)=>{const n=node();n.getBoundingClientRect=()=>{measured++;return {left:0,right:10,top:i,width:10,height:10};};return n;});
 const doc=fixture(nodes);const orig=doc.createTreeWalker;doc.createTreeWalker=()=>{const w=orig();return {nextNode(){walked++;return w.nextNode();}};};
 assert.deepEqual(scan(doc,null,800,600,1),[]);assert.ok(measured<=48);assert.ok(walked<=401);
});
test('page exploration visits content edges, remains bounded and does not serialize page geometry',()=>{
 const w=new World({mode:'page',ambient:false},900,700,()=>.2);w.setPlatforms([{left:100,right:700,y:300},{left:140,right:600,y:500}]);
 const ys=new Set();for(let i=0;i<300;i++){w.step(.05);ys.add(Math.round(w.hero.y));assert.ok(w.hero.x>=64*w.scale&&w.hero.x<=900-64*w.scale);assert.ok(w.hero.y>=116*w.scale&&w.hero.y<=w.ground);}
 assert.ok(ys.size>30);const snap=w.snapshot();assert.equal('platforms' in snap,false);assert.equal('pageRoute' in snap,false);
 const b=new World(w.settings);b.setPlatforms([{left:100,right:400,y:250}]);b.restore(snap);assert.deepEqual(b.platforms,[]);
});
test('empty or malformed page geometry safely falls back to floor skating',()=>{
 const w=new World({mode:'page'},320,200);w.setPlatforms([{left:NaN,right:30,y:200},null]);assert.equal(w.platforms.length,0);w.step(10);assert.equal(w.hero.y,w.ground);assert.ok(Number.isFinite(w.hero.x));
});
test('reduced motion does not roam between content edges',()=>{
 const w=new World({mode:'page',motion:'reduced'},800,600);w.setPlatforms([{left:100,right:600,y:300}]);const start={x:w.hero.x,y:w.hero.y};w.step(20);assert.equal(w.hero.x,start.x);assert.equal(w.hero.y,start.y);
});
