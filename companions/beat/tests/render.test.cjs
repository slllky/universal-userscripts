'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {Renderer,frameFor,geometry}=require('../src/draw.js');
const {World,riders,lines,duets}=require('../src/engine.js');
const assetsRoot=path.resolve(__dirname,'../assets');
const riderAtlases=['remix','classic','gum','combo','yoyo','corn','zero','poison'];
const assetsPromise=Promise.all([...riderAtlases,'street'].map(async key=>{
  const dir=path.join(assetsRoot,key);
  return [key,{frames:require(path.join(dir,'frames.json')),image:await loadImage(path.join(dir,'sheet.png'))}];
})).then(Object.fromEntries);

function pixels(canvas) {
  return Buffer.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.buffer);
}

test('every frame of every crew atlas is registered to the skates facing either page edge',async()=>{
  const assets=await assetsPromise;
  for(const skin of riderAtlases){
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

test('a duet uses two different atlases while only the lead owns the hitbox',async()=>{
  const assets=await assetsPromise, w=new World({rider:'gum',skin:'classic',fx:'off'},480,210);
  const lead={...w.hero,rider:'gum',x:131,action:'crossover',progress:.6,elapsed:.7,alpha:1};
  const other={...lead,rider:'poison',action:'manual',x:341,direction:-1};
  w.hero=lead;w.partner=other;
  const canvas=createCanvas(w.width,w.height),renderer=new Renderer(canvas.getContext('2d'),assets);
  renderer.draw(w);
  const both=pixels(canvas);
  assert.deepEqual(renderer.hitBox,geometry(lead,assets.gum,w.scale,w.gentle).rect);
  w.partner=null;renderer.draw(w);
  const justLead=pixels(canvas);
  assert.ok(!both.equals(justLead));
  for(let y=0;y<w.height;y++){
    const offset=y*w.width*4;
    const end=offset+Math.round(w.width/2)*4;
    assert.ok(both.subarray(offset,end).equals(justLead.subarray(offset,end)));
  }
  lead.alpha=0;w.partner=other;renderer.draw(w);
  assert.equal(renderer.hitBox,null);assert.ok(pixels(canvas).some(Boolean));
});

test('all six new moves render through both directions, back-to-back wall rides and direction changes without leftover pixels',async()=>{
  const assets=await assetsPromise,w=new World({rider:'zero',partner:'auto',ambient:false,scale:1.25},440,242);
  const cv=createCanvas(w.width,w.height),fresh=createCanvas(w.width,w.height);
  const run=new Renderer(cv.getContext('2d'),assets),control=new Renderer(fresh.getContext('2d'),assets);
  const seen=new Set();
  for(const action of ['crossover','rocket','fishbrain','wallride','wallride','spin','manual']){
    assert.ok(w.perform(action),action);
    let n=0;
    while(w.trick && n++<120){
      w.step(.09);w.takeEvents();if(w.hero.action===action)seen.add(action);
      run.draw(w);fresh.getContext('2d').clearRect(0,0,w.width,w.height);control.draw(w);
      assert.ok(pixels(cv).equals(pixels(fresh)),'dirty bounds '+action+' / '+n);
    }
    assert.ok(n<120);
  }
  assert.equal(seen.size,6);
});

test('each rider can complete the automatic Free Skate deck and all five reduced-motion duets fit at phone width',async()=>{
  const assets=await assetsPromise;
  for(const rider of Object.keys(riders)){
    const w=new World({rider,scale:1.1,speed:2,ambient:true,motion:'full'},347,199,()=>.4);
    const canvas=createCanvas(w.width,w.height),view=new Renderer(canvas.getContext('2d'),assets);
    const seen=new Set(), pairs=new Set(), lineCount=Object.keys(lines).length;
    for(let i=0;i<2700&&seen.size<lineCount;i++){
      w.step(.15);w.takeEvents();
      if(w.line?.source!=='ambient')continue;
      if(w.hero.alpha>0){
        view.draw(w);
        const b=view.hitBox;
        assert.ok(b && b.x>=-.5 && b.y>=-.5 && b.x+b.width<=w.width+.5 && b.y+b.height<=w.height+.5);
      }
      if(w.partner?.alpha>.1)pairs.add(w.line.id);
      if(w.line.index===w.line.total-1)seen.add(w.line.id);
    }
    assert.equal(seen.size,lineCount,rider);assert.equal(pairs.size,duets.length,rider);
    w.apply({motion:'reduced',ambient:false});
    for(const id of duets){
      const calm=new World({...w.settings,scale:1.1},321,183);
      calm.perform(id);calm.step(.35);view.draw(calm);
      assert.ok(calm.partner);assert.ok(view.hitBox);
      const asset=view.assetFor(calm.partner,calm),b=geometry(calm.partner,asset,calm.scale,true).rect;
      assert.ok(b.x>=-.5&&b.x+b.width<=calm.width+.5&&b.y>=-.5&&b.y+b.height<=calm.height+.5);
    }
  }
});
