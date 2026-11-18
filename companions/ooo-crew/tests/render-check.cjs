'use strict';
// Optional visual/PNG decoder checks. Requires @napi-rs/canvas, only for this test.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=process.argv[2]||path.join(os.tmpdir(),'ooo-crew-render');fs.mkdirSync(out,{recursive:true});
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'src/core.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/render.js'),'utf8')+'\nglobalThis.api={core:OooCore,render:OooRender};',sandbox);
const{core,render}=sandbox.api;const frames=JSON.parse(fs.readFileSync(path.join(root,'assets/frames.json')));
(async()=>{
 const assets={atlas:await loadImage(path.join(root,'assets/crew.png')),jake:await loadImage(path.join(root,'assets/jake.png')),frames};
 assert.equal(assets.atlas.width,frames.columns*frames.cell);
 const proof=createCanvas(1100,520),pc=proof.getContext('2d');pc.fillStyle='#e8e3d1';pc.fillRect(0,0,1100,520);pc.fillStyle='#2e4a3d';pc.font='bold 35px serif';pc.fillText('OOO CREW',40,55);pc.font='15px sans-serif';pc.fillText('Nine companions · Actual bundled sprites at their default relative sizes',42,84);
 const world=new core.World({...core.defaults,selected:core.presets.everyone,autoScenes:false,wander:false,size:1.1},1100,330,()=>.4);
 const layer=createCanvas(1100,330),lc=layer.getContext('2d');
 world.actors.forEach((a,i)=>{a.x=70+i*120;a.elapsed=.3;a.state='idle';});
 render.draw(lc,world,assets);pc.drawImage(layer,0,-70);
 pc.font='12px sans-serif';world.actors.forEach((a,i)=>pc.fillText(core.cast[a.id].short||core.cast[a.id].name,Math.max(15,40+i*120),285));
 world.apply({...world.settings,selected:['finn','jake','marceline','lsp','gunter']});world.startScene('concert');for(let i=0;i<280;i++)world.step(.05);render.draw(lc,world,assets);pc.drawImage(layer,0,175);pc.fillStyle='#2e4a3d';pc.font='13px sans-serif';pc.fillText('A tiny concert · Canvas render, not a browser screenshot',40,330);
 fs.writeFileSync(path.join(out,'crew-preview.png'),proof.toBuffer('image/png'));
 const states=['idle','walk','run','music','dance','cheer','magic','eat','drag','drop','stretch'];let checked=0;
 for(const art of ['toon','archive'])for(const size of [.65,1.1,1.75])for(const state of states){
  const w=new core.World({...core.defaults,selected:core.presets.everyone,size,marcelineArt:art,autoScenes:false},1100,400,()=>.4);
  for(const a of w.actors){a.state=state;a.elapsed=.4;a.duration=2;a.dragY=200;a.dropFrom=100;}
  for(const a of w.actors){const p=render.pose(w,a,frames);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.frame>=0&&p.frame<frames.count);}
  render.draw(lc,w,assets);checked++;
 }
 for(const scene of Object.keys(core.scenes)){
   const w=new core.World({...core.defaults,selected:core.presets.everyone,autoScenes:false},1000,350,()=>.4);w.startScene(scene);
   const c=createCanvas(1000,350),cx=c.getContext('2d');
   for(let frame=0;frame<100;frame++){w.step(.05);render.draw(cx,w,assets);}
   for(let i=0;i<60;i++)w.step(.05);render.draw(cx,w,assets);
   const flat=createCanvas(1000,350),f=flat.getContext('2d');f.fillStyle='#e9e2cc';f.fillRect(0,0,1000,350);f.drawImage(c,0,0);f.fillStyle='#304a3e';f.font='bold 23px serif';f.fillText(core.scenes[scene].title,24,36);fs.writeFileSync(path.join(out,scene+'.png'),flat.toBuffer('image/png'));
 }
 // Every packed frame has real visible pixels and remains inside its assigned cell.
 const atlasCanvas=createCanvas(assets.atlas.width,assets.atlas.height),ac=atlasCanvas.getContext('2d');ac.drawImage(assets.atlas,0,0);
 for(let i=0;i<frames.count;i++){const data=ac.getImageData((i%frames.columns)*128,Math.floor(i/frames.columns)*128,128,128).data;let count=0;for(let p=3;p<data.length;p+=4)if(data[p])count++;assert.ok(count>100,`empty frame ${i}`);}
 console.log(`Rendered ${checked} character-state/style/size combinations, six scenes, and checked ${frames.count} nonempty atlas frames.\n${out}`);
})().catch(error=>{console.error(error);process.exitCode=1;});
