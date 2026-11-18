'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {Renderer,frameFor,geometry}=require('../src/draw.js');
const {World}=require('../src/engine.js');
const assetsRoot=path.resolve(__dirname,'../assets');
const assetsPromise=Promise.all(['remix','classic','street'].map(async key=>{
  const dir=path.join(assetsRoot,key);
  return [key,{frames:require(path.join(dir,'frames.json')),image:await loadImage(path.join(dir,'sheet.png'))}];
})).then(Object.fromEntries);

function pixels(canvas) {
  return Buffer.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.buffer);
}

test('every pose in both skins is registered to the skates and can face either page edge',async()=>{
  const assets=await assetsPromise;
  for(const skin of ['remix','classic']){
    const asset=assets[skin],m=asset.frames;
    assert.equal(m.count,m.bounds.length);
    assert.equal(new Set(Object.values(m.animations).flat()).size,m.count);
    const canvas=createCanvas(asset.image.width,asset.image.height),g=canvas.getContext('2d');
    g.drawImage(asset.image,0,0);
    for(const [i,b] of m.bounds.entries()){
      const {data}=g.getImageData((i%m.columns)*m.cell,Math.floor(i/m.columns)*m.cell,m.cell,m.cell);
      let l=m.cell,t=m.cell,r=0,bottom=0;
      for(let y=0;y<m.cell;y++)for(let x=0;x<m.cell;x++){
        if(!data[(y*m.cell+x)*4+3])continue;
        l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);bottom=Math.max(bottom,y+1);
      }
      assert.deepEqual([l,t,r,bottom],b,skin+' frame '+i);
      assert.equal(b[3],m.pivot[1]);
    }
    for(const [width,height] of [[127,111],[358,225]]){
      const w=new World({skin,scale:3},width,height);
      for(const direction of [-1,1])for(const [action,sequence] of Object.entries(m.animations)){
        Object.assign(w.hero,{direction,action,x:w.boundX(direction*width),y:w.boundY(0)});
        for(let step=0;step<=30;step++){
          Object.assign(w.hero,{elapsed:step*.17,progress:step/30});
          const {rect,n}=geometry(w.hero,asset,w.scale,false);
          assert.ok(sequence.includes(n));assert.ok(sequence.includes(frameFor(w.hero,m,true)));
          assert.ok(rect.x>=-.5&&rect.y>=-.5&&rect.x+rect.width<=width+.5&&rect.y+rect.height<=height+.5);
        }
      }
    }
  }
});

test('successive frames clear exactly on a scaled canvas during both trick lines, pickups, a skin switch and hide',async()=>{
  const sprites=await assetsPromise,width=421,height=207,ratio=1.25;
  const moving=createCanvas(Math.round(width*ratio),Math.round(height*ratio));
  const blank=createCanvas(moving.width,moving.height);
  const g=moving.getContext('2d'),fresh=blank.getContext('2d');
  for(const ctx of [g,fresh])ctx.setTransform(ratio,0,0,ratio,0,0);
  const view=new Renderer(g,sprites),control=new Renderer(fresh,sprites);
  const w=new World({ambient:false,scale:1.1},width,height,()=>.4);
  function check(frame){
    view.draw(w);fresh.clearRect(-3,-3,width+8,height+8);control.draw(w);
    assert.ok(pixels(moving).equals(pixels(blank)),'stale ink or clipped dirty bounds at frame '+frame);
  }
  for(let i=0;i<94;i++){
    if(i===0)w.perform('sidewinder');
    if(i===35)w.perform('airmail');
    if(i===57)w.apply({skin:'classic',accent:'cyan'});
    if(i===72)w.apply({mode:'follow',delay:1});
    if(i>=72)w.point((i*71)%width,(i*29)%height);
    w.step(.13);w.takeEvents();check(i);
  }
  w.apply({hidden:true});check(94);assert.equal(view.hitBox,null);
  assert.ok(!pixels(moving).some(Boolean));
});

test('a painted tag remains visible with decorative effects off; reduced motion holds a single action cel',async()=>{
  const sprites=await assetsPromise,w=new World({motion:'reduced',fx:'off'},320,200);
  const canvas=createCanvas(w.width,w.height),view=new Renderer(canvas.getContext('2d'),sprites);
  w.perform('tag');w.step(.4);view.draw(w);
  const first=frameFor(w.hero,sprites.remix.frames,w.gentle);
  w.step(.7);assert.equal(first,frameFor(w.hero,sprites.remix.frames,w.gentle));
  w.hero.alpha=0;view.draw(w);assert.ok(pixels(canvas).some(Boolean));assert.equal(view.hitBox,null);
  w.tag=null;view.draw(w);assert.ok(!pixels(canvas).some(Boolean));
});
