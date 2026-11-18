'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),frames=JSON.parse(fs.readFileSync(path.join(root,'assets/frames.json')));
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'src/core.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/render.js'),'utf8')+'\nglobalThis.api={core:OooCore,render:OooRender};',sandbox);
const{core,render}=sandbox.api;
const pixels=async file=>{const img=await loadImage(file),c=createCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);return{ctx,img,data:ctx.getImageData(0,0,img.width,img.height).data};};
const atlas=pixels(path.join(root,'assets/crew.png'));
function rgbaFrame(ctx,id){return ctx.getImageData(id%frames.columns*128,Math.floor(id/frames.columns)*128,128,128).data;}
function palette(data){const colors=new Set();for(let i=0;i<data.length;i+=4)if(data[i+3])colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);return colors;}
test('Finn’s source-sheet cycles preserve the original hat, backpack and palette',async()=>{
 const {ctx}=await atlas,original=await pixels(path.join(root,'assets/source-sheets/finn.png')),allowed=palette(original.data);let whites=0,greens=0;
 for(const [name,ids]of Object.entries(frames.animations).filter(([name,ids])=>name.startsWith('finn.')&&ids[0]<160))for(const id of ids){
  const data=rgbaFrame(ctx,id);for(let i=0;i<data.length;i+=4)if(data[i+3]){const rgb=`${data[i]},${data[i+1]},${data[i+2]}`;assert.ok(allowed.has(rgb),`${name}: invented JPEG color ${rgb}`);assert.notEqual(rgb,'154,235,105');if(rgb==='245,245,245')whites++;if(rgb==='181,230,29')greens++;}
 }
 assert.ok(whites>1000,'hat should remain solid white');assert.ok(greens>100,'backpack must not be keyed away');
});
test('LSP’s original source-sheet cycles discard the separate shadow palette entry',async()=>{
 const{ctx}=await atlas;for(const[name,ids]of Object.entries(frames.animations).filter(([name,ids])=>name.startsWith('lsp.')&&ids[0]<160))for(const id of ids){const colors=palette(rgbaFrame(ctx,id));assert.ok(!colors.has('48,48,48'),`${name}/${id}: stray floor shadow`);assert.ok(!colors.has('154,235,105'));}
});
test('every packed frame has exact recorded opaque bounds and padding from its atlas neighbors',async()=>{
 const{ctx}=await atlas;assert.equal(frames.bounds.length,frames.count);
 for(let id=0;id<frames.count;id++){const data=rgbaFrame(ctx,id);let left=128,top=128,right=-1,bottom=-1;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  assert.deepEqual(frames.bounds[id],[left,top,right+1,bottom+1]);assert.ok(left>0&&right<127&&top>0&&bottom<127,`atlas padding ${id}`);
 }
});
test('all character frames, rotations, and drag heights fit within small and large viewports',()=>{
 let samples=0;
 for(const[sizeW,sizeH]of [[320,220],[900,700],[84,72],[1600,900]])for(const size of [.65,1.1,1.75])for(const art of ['toon','archive']){
  const w=new core.World({...core.defaults,selected:core.presets.everyone,size,marcelineArt:art,autoScenes:false},sizeW,sizeH,()=>.1);
  for(const a of w.actors)for(const state of ['idle','walk','run','music','dance','cheer','drag','drop','stretch','read'])for(const elapsed of [0,.3,.7,1.2]){
   a.state=state;a.elapsed=elapsed;a.duration=2;a.x=elapsed<.5?0:sizeW;a.dragY=0;a.dropFrom=-20;a.reach={x:sizeW,y:0};
   const p=render.pose(w,a,frames),[l,t,r,b]=p.bounds;
   assert.ok(l>=-.001&&t>=-.001&&r<=sizeW+.001&&b<=sizeH+.001,`${a.id}/${state} ${sizeW}x${sizeH}: ${p.bounds}`);samples++;
  }
 }
 assert.ok(samples>10000);
});
test('Fionna and Cake use one palette rather than cycling through alternate costumes',()=>{
 for(const id of ['fionna','cake']){assert.deepEqual(frames.animations[id+'.run'],frames.animations[id+'.walk']);assert.deepEqual(frames.animations[id+'.cheer'],frames.animations[id+'.idle']);}
});

test('first 160 atlas cells and their animation map match the 1.1.0 release', async () => {
  const crypto = require('node:crypto');
  const {ctx} = await atlas;
  const original = crypto.createHash('sha256');
  for (let i = 0; i < 160; i++) original.update(rgbaFrame(ctx, i));
  assert.equal(original.digest('hex'), '3b7edec98c42fc37724b9cc94dc2373d3163347dda4115dbb843d699844bc3e8');
  const baseSets = Object.fromEntries(Object.entries(frames.animations).filter(([,ids]) => ids.every(i => i < 160)));
  const definition = JSON.stringify([frames.bounds.slice(0, 160), baseSets]);
  assert.equal(crypto.createHash('sha256').update(definition).digest('hex'), '73637c68139e49f0038783e20ef78eedc9be861377314d763ff5f5be0acac8f1');
});

test('every companion has two independently animated personal actions with display labels and facing', async () => {
  const {ctx} = await atlas;
  for (const actor of [...Object.keys(core.cast), 'archive']) {
    const actions = actor === 'lemongrab' ? ['inspect', 'outburst'] : ['greet', 'flair'];
    const used = new Set();
    for (const action of actions) {
      const key = actor + '.' + action;
      const ids = frames.animations[key];
      const details = frames.actionDetails[key];
      assert.ok(ids && ids.length >= 2, key);
      assert.ok(details && details.label && [1,-1].includes(details.facing), key);
      const samples = new Set(ids.map(id => Buffer.from(rgbaFrame(ctx, id)).toString('base64')));
      assert.ok(samples.size >= 2, key + ' must animate');
      for (const id of ids) {
        assert.ok(id >= 160 && !used.has(id), key + ' needs distinct new cells');
      }
      ids.forEach(id => used.add(id));
    }
  }
});

test('new actions animate in both directions through the standard trick path and stay on narrow screens', () => {
  for (const marcelineArt of ['toon','archive']) {
    const world = new core.World({...core.defaults, selected: Object.keys(core.cast), marcelineArt, autoScenes:false}, 100, 82, () => 0.2);
    for (const actor of world.actors) {
      for (const action of core.newActions(actor.id)) {
        assert.equal(world.trick(actor.id, action), true);
        const art = actor.id === 'marceline' && marcelineArt === 'archive' ? 'archive' : actor.id;
        const key = art + '.' + action;
        const ids = frames.animations[key];
        const facing = frames.actionDetails[key].facing;
        const seen = new Set();
        for (const direction of [-1,1]) {
          actor.direction = direction;
          actor.x = direction < 0 ? -10 : world.width + 10;
          for (let sample = 0; sample < 160; sample++) {
            actor.elapsed = sample / 60;
            const pose = render.pose(world,actor,frames);
            assert.equal(pose.action, action);
            assert.ok(ids.includes(pose.frame));
            assert.equal(pose.flip, direction !== facing);
            const [l,t,r,b] = pose.bounds;
            assert.ok(l >= 0 && t >= 0 && r <= world.width && b <= world.height, key);
            seen.add(pose.frame);
          }
        }
        assert.deepEqual([...seen].sort((a,b)=>a-b), [...new Set(ids)].sort((a,b)=>a-b), key);
      }
    }
  }
});
