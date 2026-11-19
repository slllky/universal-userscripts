'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {Renderer,geometry,sampleFrame}=require('../src/draw.js');
const {World,riders}=require('../src/engine.js');
const ids=['remix','classic',...Object.keys(riders).filter(k=>k!=='beat')];
const assetRoot=path.join(__dirname,'../assets');
const loopKeys=new Set(['skate','idle','dance','grind','boost','crossover','fishbrain','manual']);
const motionAssets=Promise.all(ids.map(async id=>{
  const base=path.join(assetRoot,id);
  return [id,{frames:require(path.join(base,'frames.json')),image:await loadImage(path.join(base,'sheet.png')),
    motion:{...require(path.join(base,'motion.json')),image:await loadImage(path.join(base,'motion.png'))}}];
})).then(Object.fromEntries);
test('every rider motion cel is registered and belongs to an explicit action-frame pair',async()=>{
  const assets=await motionAssets;
  for(const [id,{frames,motion}] of Object.entries(assets)){
    assert.ok(Object.keys(motion.pairs).length>=20,id);
    assert.equal(motion.bounds.length,Object.keys(motion.pairs).length*2);
    assert.equal(motion.image.width,motion.columns*frames.cell);
    for(const [name,seq] of Object.entries(frames.animations)){
      const links=loopKeys.has(name)?seq:[...seq.slice(0,-1)];
      assert.ok(links.some((n,i)=>motion.pairs[n+':'+seq[(i+1)%seq.length]]),id+' '+name+' missing in-betweens');
    }
    const pairs=new Set(Object.entries(frames.animations).flatMap(([name,seq])=>[
      ...seq.slice(1).map((n,i)=>seq[i]+':'+n),...(loopKeys.has(name)?[seq.at(-1)+':'+seq[0]]:[])
    ]));
    const ctx=createCanvas(motion.image.width,motion.image.height).getContext('2d');
    ctx.drawImage(motion.image,0,0);
    for(const [pair,indexes] of Object.entries(motion.pairs)){
      assert.ok(pairs.has(pair),id+' '+pair);
      for(const i of indexes){
        const c=frames.cell,d=ctx.getImageData(i%motion.columns*c,Math.floor(i/motion.columns)*c,c,c).data;
        let bounds=[c,c,0,0];
        for(let y=0;y<c;y++)for(let x=0;x<c;x++)if(d[(y*c+x)*4+3]){
          assert.equal(d[(y*c+x)*4+3],255,'no translucent double-exposure');
          bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x+1),Math.max(bounds[3],y+1)];
        }
        assert.deepEqual(bounds,motion.bounds[i],id+' tween '+i);
        assert.equal(bounds[3],frames.pivot[1],id+' foot pivot');
      }
    }
  }
});
test('two real in-betweens occupy the existing interval; loop wraps, weighted timing and reduced motion are preserved',()=>{
  const frames={cell:128,animations:{skate:[0,1],tag:[0,1]},durations:{skate:[90,180]},bounds:[[8,19,50,116],[18,17,50,116]]};
  const asset={frames,motion:{image:{},pairs:{'0:1':[0,1],'1:0':[2,3]},bounds:[[9,19,50,116],[15,18,50,116],[15,18,50,116],[9,19,50,116]]}};
  const actor={action:'skate',elapsed:0,direction:1,x:90,y:116};
  assert.equal(geometry(actor,asset,1,false).mid,undefined);
  actor.elapsed=.031;assert.equal(geometry(actor,asset,1,false).mid,0);
  actor.elapsed=.061;assert.equal(geometry(actor,asset,1,false).mid,1);
  actor.elapsed=.09;assert.equal(sampleFrame(actor,frames,false).n,1);
  actor.elapsed=.152;assert.equal(geometry(actor,asset,1,false).mid,2);
  actor.elapsed=.219;assert.equal(geometry(actor,asset,1,false).mid,3);
  actor.elapsed=.27;assert.equal(sampleFrame(actor,frames,false).n,0);
  assert.equal(geometry(actor,asset,1,true).mid,undefined);
  actor.action='tag';actor.progress=.99;
  assert.equal(geometry(actor,asset,1,false).mid,undefined,'one-shot never interpolates end to start');
  actor.action='heelflip';actor.progress=.14;
  const alias={...frames,animations:{spin:[0,1]}};
  assert.equal(sampleFrame(actor,alias,false).next,1);
});
test('real motion atlas draws intermediate cels and clears every previous pose, for both directions',async()=>{
  const assets=await motionAssets, canvas=createCanvas(350,220),fresh=createCanvas(350,220);
  const view=new Renderer(canvas.getContext('2d'),assets),control=new Renderer(fresh.getContext('2d'),assets);
  const pixels=cv=>Buffer.from(cv.getContext('2d').getImageData(0,0,350,220).data);
  const getView=(id,skin)=>new World({rider:id,skin,ambient:false,fx:'off'},350,220);
  const touched=new Set();
  for(const id of ids){
    const w=getView(['remix','classic'].includes(id)?'beat':id,id);
    for(const action of ['skate','jump','spin','grind','tag','manual','wallride']){
      for(const dir of [1,-1]){
        for(let i=0;i<22;i++){
          Object.assign(w.hero,{x:160+(i%6)*6,y:175-i%7,direction:dir,action,elapsed:i/60,progress:i/21});
          const a=assets[id],p=geometry(w.hero,a,w.scale,w.gentle);
          if(p.mid!==undefined)touched.add(id);
          view.draw(w);fresh.getContext('2d').clearRect(0,0,350,220);control.draw(w);
          // Clear prior dirty regions using a dedicated compare canvas and verify no trails.
          assert.ok(pixels(canvas).equals(pixels(fresh)),id+' '+action+' '+dir+' '+i);
          assert.ok(p.rect.x>=0&&p.rect.y>=0&&p.rect.x+p.rect.width<=350&&p.rect.y+p.rect.height<=220);
        }
      }
    }
  }
  assert.equal(touched.size,ids.length);
});
