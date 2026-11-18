'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const {World, species} = require('../src/engine');
const {geometry, draw} = require('../src/draw');
const assetDir = path.join(__dirname,'..','assets');

function inkBounds(rgba, size) {
  let left = size, top = size, right = 0, bottom = 0;
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    if (!rgba[(y*size+x)*4+3]) continue;
    left=Math.min(left,x); right=Math.max(right,x+1);
    top=Math.min(top,y); bottom=Math.max(bottom,y+1);
  }
  return [left,top,right,bottom];
}

test('every real sprite has a transparent gutter and its declared bounds match the decoded pixels',async()=>{
  for (const id of ['rengoku', ...Object.keys(species)]) {
    const meta = JSON.parse(fs.readFileSync(path.join(assetDir,id,'frames.json')));
    const image = await loadImage(path.join(assetDir,id,'sheet.png'));
    const canvas = createCanvas(image.width,image.height), ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0);
    for (let i=0;i<meta.count;i++) {
      const x=(i%meta.columns)*meta.cell, y=Math.floor(i/meta.columns)*meta.cell;
      const bounds=inkBounds(ctx.getImageData(x,y,meta.cell,meta.cell).data,meta.cell);
      assert.deepEqual(bounds,meta.bounds[i],id+' frame '+i);
      assert.ok(bounds[0]>0 && bounds[1]>0 && bounds[2]<meta.cell && bounds[3]<meta.cell &&
        bounds[2]>bounds[0] && bounds[3]>bounds[1],id+' frame '+i+' has empty or clipped art');
    }
  }
});

test('draws every opponent through a complete encounter within phone and desktop viewports',async()=>{
  const assets={};
  for (const id of ['rengoku',...Object.keys(species)]) {
    assets[id]={meta:JSON.parse(fs.readFileSync(path.join(assetDir,id,'frames.json'))),
      image:await loadImage(path.join(assetDir,id,'sheet.png'))};
  }
  for (const width of [320,960]) for (const motion of ['full','gentle']) {
    const ctx=createCanvas(width,420).getContext('2d');
    for (const id of Object.keys(species)) {
      const world=new World({frequency:'off',scale:1.5,motion},width,420,()=>.4);
      assert.ok(world.summon(id));
      let completed=false;
      for (let i=0;i<400;i++) {
        world.step(.08);
        ctx.clearRect(0,0,width,world.height);draw(ctx,world,assets);
        for (const actor of [world.hero,world.enemy].filter(Boolean)) {
          const {rect}=geometry(actor,assets[actor.id],world.scale,world.gentle);
          assert.ok(rect[0]>=-.51 && rect[1]>=-.51 && rect[2]<=width+.51 && rect[3]<=420.51,id+' left the visible area');
        }
        if(world.takeEvents().some(event=>event.type==='defeat')) {completed=true;break;}
      }
      assert.ok(completed,id+' did not finish');
    }
  }
});
