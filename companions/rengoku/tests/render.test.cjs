'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {frameFor,geometry,draw}=require('../src/draw.js');

const meta={cell:128,columns:4,pivot:[64,116],facing:-1,
  animations:{idle:[0,1],walk:[2,3],slash:[4,5,6],death:[7,8,9]},
  durations:{idle:[800,200],slash:[100,600,300]},
  bounds:Array(10).fill([12,43,98,116])};
const hero={id:'rengoku',x:47,y:116,direction:1,action:'slash',elapsed:.3,progress:.2,alpha:1};
const asset={meta,image:{}};

test('holds the anticipation cel for its assigned time; clamps finite moves and loops idle timing',()=>{
  const phase=(action,elapsed,progress)=>frameFor({...hero,action,elapsed,progress},meta);
  assert.equal(phase('slash',.59,.59),5);
  assert.equal(phase('slash',1.5,1),6);
  assert.equal(phase('idle',.91,0),1);
  assert.equal(phase('idle',1.11,0),0);
  assert.equal(phase('walk',10,.75),3);
});
test('uses foot registration and asymmetric ink bounds in both directions',()=>{
  assert.deepEqual(geometry({...hero,direction:-1},asset,1).rect,[-5,43,81,116]);
  assert.deepEqual(geometry(hero,asset,1).rect,[13,43,99,116]);
  assert.deepEqual(geometry(hero,asset,2).rect,[-21,-30,151,116]);
});
test('reduced motion holds a readable representative cel and keeps the final dissolve pose',()=>{
  assert.equal(frameFor({...hero,action:'walk',progress:.99},meta,true),2);
  assert.equal(frameFor(hero,meta,true),5);
  assert.equal(frameFor({...hero,action:'death'},meta,true),9);
});
test('works inside the host strip without resetting the transform or handling canvas clears',()=>{
  const calls=[];const ctx=new Proxy({globalAlpha:1},{
    get(obj,key){return key in obj?obj[key]:(...args)=>calls.push([key,...args]);}
  });
  const w={hero,ground:116,settings:{fx:'off',enabled:true},scale:1,gentle:false};
  draw(ctx,w,{rengoku:asset});
  assert.equal(calls.filter(c=>c[0]==='drawImage').length,1);
  assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
  assert.ok(!calls.some(c=>['clearRect','resetTransform','setTransform','lineTo'].includes(c[0])));
  calls.length=0;
  draw(ctx,{...w,settings:{...w.settings,fx:'full'}},{rengoku:asset});
  assert.ok(calls.some(c=>c[0]==='lineTo'));
});
