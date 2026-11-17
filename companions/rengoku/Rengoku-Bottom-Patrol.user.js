// ==UserScript==
// @name         Rengoku — Bottom Patrol
// @namespace    aseerr-rengoku-patrol
// @version      1.1.0
// @description  Rengoku patrols, swipes at your cursor, performs click actions and defeats demons in four hits.
// @author       Aseerr customization; Rengoku sprites by Soulfire / SoulfireSprites; Doom Pink Demon sheet credited to id Software / Falcon Delta; additional demons by CraftPix
// @match        http://*/*
// @match        https://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getResourceURL
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @connect      img.craftpix.net
// @grant        GM_registerMenuCommand
// @resource     rengoku https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/167d0353-60ba-4b70-b766-dd9dc81384e2/deju2ax-e93e37d5-3944-4fed-9db1-9b5c82adf89c.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MjA3NiIsInBhdGgiOiIvZi8xNjdkMDM1My02MGJhLTRiNzAtYjc2Ni1kZDlkYzgxMzg0ZTIvZGVqdTJheC1lOTNlMzdkNS0zOTQ0LTRmZWQtOWRiMS05YjVjODJhZGY4OWMucG5nIiwid2lkdGgiOiI8PTEwMzIifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.MwdePJTVKL5fSum0fg77kd-JNJ2sHnHTQTks-UzH3DU
// @resource     demon https://i.pinimg.com/736x/2e/c8/1f/2ec81f85be3c54e03f951f04e12bd928.jpg
// ==/UserScript==

(() => {
 'use strict';
 if (document.getElementById('rengoku-patrol')) return;
 const SCALE = 1.6;
 const ENCOUNTER_INTERVAL = 30;
 const ENCOUNTER_CHANCE = 0.05;
 const HITS_TO_WIN = 4;
 const HERO = {"idle":[[15,225,53,56],[72,224,61,57],[135,225,67,56],[205,226,65,55]],"run":[[11,325,50,48],[67,324,53,49],[124,323,50,50],[186,324,52,49],[250,326,51,47],[314,325,47,48],[385,325,47,50],[444,325,48,48]],"dizzy":[[128,439,30,39],[167,439,31,39],[205,439,32,39]],"crouch":[[13,546,49,42],[65,550,41,37],[110,550,38,37],[156,546,37,42]],"jump":[[222,546,32,42],[261,536,39,53],[306,536,38,53],[348,539,46,45],[401,530,42,59],[450,530,42,59]],"guard":[[13,653,54,57],[71,652,35,58],[118,652,53,59],[176,652,56,56],[238,652,51,56],[296,655,54,53]],"hurt":[[13,769,36,54],[50,769,41,54]],"charge":[[9,854,41,52],[56,854,45,52],[107,854,47,52],[163,854,46,52]],"attack1":[[12,940,42,49],[58,941,80,48],[142,942,55,47],[203,942,46,47],[250,940,41,49]],"attack2":[[304,944,42,45],[351,944,42,45],[398,927,48,62],[452,927,44,62],[501,927,44,62],[549,937,31,52]],"attack3":[[8,1018,39,54],[53,1024,41,47],[100,1028,47,44],[170,1021,53,51],[225,1011,52,55],[279,1011,54,55],[347,1007,42,61],[396,1007,39,61]],"attack4":[[4,1109,51,46],[59,1112,51,43],[118,1097,95,59],[229,1097,77,59],[311,1100,47,56]],"victory":[[12,1831,31,57],[51,1829,41,57],[106,1829,44,57],[163,1829,43,57],[223,1829,41,57]]};
 const DEMON = {
  run: [[0,126,58,58],[60,126,64,58],[125,126,59,58],[185,126,64,58],[250,126,59,58],[310,126,74,58],[385,126,74,58]],
  attack: [[0,355,63,60],[64,355,65,60],[130,355,57,60],[188,355,61,60],[250,355,63,60],[314,355,64,60],[379,355,70,60]],
  hurt: [[0,510,43,56]],
  death: [[0,569,58,63],[59,569,64,63],[124,569,58,63],[183,569,58,63],[242,569,61,63],[304,569,61,63],[366,569,59,63]]
 };
 const host = document.createElement('div');
 host.id = 'rengoku-patrol';
 host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;';
 const root = host.attachShadow({mode:'closed'});
 root.innerHTML = `<style>
  canvas{position:absolute;inset:0;pointer-events:none}
  button{position:absolute;width:68px;height:100px;border:0;padding:0;background:transparent;pointer-events:auto;cursor:pointer;border-radius:10px}
  button:focus-visible{outline:2px solid #ff9c30}
  #message{position:absolute;bottom:120px;left:50%;transform:translateX(-50%);max-width:85vw;padding:8px 12px;background:#251a16ed;color:#ffe9bd;border:1px solid #fa8738;border-radius:8px;font:13px Arial;pointer-events:none}
  [hidden]{display:none!important}
  @media print{canvas,button,#message{display:none!important}}
 </style><canvas></canvas><button hidden aria-label="Rengoku: perform an action" title="Click: special action · Right-click: demon encounter"></button><div id="message" role="status">Loading Rengoku…</div>`;
 document.documentElement.append(host);
 const canvas = root.querySelector('canvas');
 const ctx = canvas.getContext('2d');
 const button = root.querySelector('button');
 const message = root.getElementById('message');
 const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
 const pick = list=>list[Math.floor(Math.random()*list.length)];
 let W=innerWidth,H=innerHeight,dpr=1;
 let heroSheet=null,demonSheet=null,loading=false,hidden=false;
 const demons=[];
 let x=100,dir=1,clock=0,last=0,raf=0,roll=0,cooldown=0;
 let patrol='run',speed=55,nextPatrol=4,action=null,battle=null;
 let mouse=null,noticeUntil=0,effects=[],clickIndex=0;
 const OWNER_KEY='rengoku:owner:v1';
 const HIDDEN_KEY='rengoku:hidden:v1';
 const PAGE_ID=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 let owns=false,departed=false,focusTimer=0,arrivalUntil=0;
 hidden=GM_getValue(HIDDEN_KEY,false);
 function active(){return owns&&!departed&&!hidden&&!document.hidden&&document.hasFocus();}
 function snapshot(){
  return {x:x/Math.max(1,W),dir,clock,roll,cooldown,patrol,speed,nextPatrol,action,clickIndex,
   battle:battle?{...battle,kind:battle.kind.name,x:battle.x/Math.max(1,W)}:null};
 }
 function restore(s){
  if(!s)return;
  x=clamp(s.x*W,45,Math.max(45,W-45));dir=s.dir;clock=s.clock;
  roll=s.roll;cooldown=s.cooldown;patrol=s.patrol;speed=s.speed;
  nextPatrol=s.nextPatrol;action=s.action;clickIndex=s.clickIndex;
  battle=null;
  if(s.battle){
   const kind=demons.find(d=>d.name===s.battle.kind)||demons[0];
   if(kind)battle={...s.battle,kind,x:clamp(s.battle.x*W,45,Math.max(45,W-45))};
  }
  effects=[];mouse=null;
 }
 function checkpoint(){
  const current=GM_getValue(OWNER_KEY,null);
  if(owns&&current?.id===PAGE_ID)GM_setValue(OWNER_KEY,{id:PAGE_ID,state:snapshot()});
 }
 function syncOwner(){
  owns=GM_getValue(OWNER_KEY,null)?.id===PAGE_ID;
  if(!active())pause();else start();
 }
 function claim(){
  if(departed||hidden||document.hidden||!document.hasFocus()||!heroSheet||loading)return;
  const current=GM_getValue(OWNER_KEY,null);
  if(current?.id!==PAGE_ID){
   restore(current?.state);
   arrivalUntil=clock+.65;
   GM_setValue(OWNER_KEY,{id:PAGE_ID,state:snapshot()});
  }
  owns=true;render();start();
 }
 function focusPage(){
  clearTimeout(focusTimer);
  focusTimer=setTimeout(claim,60);
 }
 function leavePage(){
  clearTimeout(focusTimer);checkpoint();pause();
 }

 const extras=['charge','jump','guard','attack4','crouch','attack2','victory','attack3','dizzy','attack1'];
 function say(text,seconds=3){message.textContent=text;message.hidden=false;noticeUntil=clock+seconds;}
 function resize(){
  W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  x=clamp(x,40,Math.max(40,W-40));
  if(battle)battle.x=clamp(battle.x,40,Math.max(40,W-40));
  render();
 }
 async function sheet(name){
  const url=name.startsWith('pack')?await craftImage(name):GM_getResourceURL(name);
  if(!url)throw new Error('Missing '+name+' resource');
  const img=await new Promise((resolve,reject)=>{
   const image=new Image();
   const timer=setTimeout(()=>reject(new Error(name+' image timed out')),15000);
   image.onload=()=>{clearTimeout(timer);resolve(image);};
   image.onerror=()=>{clearTimeout(timer);reject(new Error(name+' image could not load'));};
   image.src=url;
  });
  if(name==='rengoku'&&(img.naturalWidth!==1032||img.naturalHeight!==2076))throw new Error('Unexpected Rengoku sheet dimensions');
  if(name==='demon'&&(img.naturalWidth!==480||img.naturalHeight!==643))throw new Error('Unexpected demon sheet dimensions');
  const clean=document.createElement('canvas');
  clean.width=name.startsWith('pack')?720:img.naturalWidth;clean.height=name.startsWith('pack')?480:img.naturalHeight;
  const c=clean.getContext('2d',{willReadFrequently:true});
  c.imageSmoothingEnabled=false;c.drawImage(img,0,0,clean.width,clean.height);
  const pixels=c.getImageData(0,0,clean.width,clean.height),p=pixels.data;
  for(let i=0;i<p.length;i+=4){
   const r=p[i],g=p[i+1],b=p[i+2];
   if(name==='rengoku'){
    if(Math.max(Math.abs(r-115),Math.abs(g-57),Math.abs(b-132))<28)p[i+3]=0;
   }else if(name.startsWith('pack')){
    if(Math.max(Math.abs(r-162),Math.abs(g-162),Math.abs(b-162))<28)p[i+3]=0;
   }else if(g>130&&b>120&&g-r>65&&b-r>65)p[i+3]=0;
  }
  c.putImageData(pixels,0,0);return clean;
 }
 async function craftImage(name){
  const key='rengoku-image-v1:'+name;
  const cached=GM_getValue(key,'');if(cached)return cached;
  const n=name.slice(-1);
  const url='https://img.craftpix.net/2025/01/Demon-Sprite-Sheet-Pixel-Art-Pack'+n+(n==='3'?'-720x480':'')+'.webp';
  return new Promise((resolve,reject)=>GM_xmlhttpRequest({
   method:'GET',url,headers:{Referer:'https://craftpix.net/'},responseType:'blob',timeout:20000,
   onload:r=>{
    if(r.status!==200){reject(new Error(name+' HTTP '+r.status));return;}
    const reader=new FileReader();reader.onerror=()=>reject(new Error(name+' read failed'));
    reader.onload=()=>{GM_setValue(key,reader.result);resolve(reader.result);};reader.readAsDataURL(r.response);
   },onerror:()=>reject(new Error(name+' download failed')),ontimeout:()=>reject(new Error(name+' timed out'))
  }));
 }
 function craftFrames(image,name){
  const c=image.getContext('2d'),p=c.getImageData(0,0,720,480).data;
  const counts={idle:6,run:name==='pack2'?5:8,attack:name==='pack2'?6:5,hurt:name==='pack2'?4:3,death:name==='pack4'?5:3};
  const rows={idle:10,run:100,attack:190,hurt:285,death:380},map={};
  for(const [pose,count] of Object.entries(counts)){
   map[pose]=[];
   for(let i=0;i<count;i++){
    const left=90+i*77,top=rows[pose];let x0=720,y0=480,x1=0,y1=0;
    for(let y=top;y<top+85;y++)for(let x=left;x<Math.min(720,left+77);x++){
     if(p[(y*720+x)*4+3]>100){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    }
    if(x1>=x0)map[pose].push([x0,y0,x1-x0+1,y1-y0+1]);
   }
  }
  return map;
 }
 async function load(){
  if(loading)return;loading=true;
  say('Loading sprite sheets…',60);
  const names=['rengoku','demon','pack2','pack3','pack4'];
  const results=await Promise.allSettled(names.map(sheet));
  if(results[0].status==='fulfilled')heroSheet=results[0].value;
  demons.length=0;
  results.forEach((result,i)=>{
   if(result.status==='rejected'){console.error('Rengoku:',result.reason);return;}
   if(i===0)return;
   const name=names[i],image=result.value;
   demons.push({name,image,frames:i===1?DEMON:craftFrames(image,name),native:i===1?-1:1,hover:name==='pack2'?28:0});
  });
  demonSheet=demons[0]?.image||null;loading=false;
  if(!heroSheet)say('Rengoku could not load. Save the script again and refresh, or use “retry images” in Tampermonkey.',3600);
  else say('Rengoku ready — '+demons.length+' of 4 demon types loaded. Click him for extra actions.',6);
  claim();render();start();
 }
 function spawn(){
  if(!active()||!heroSheet||!demonSheet||battle)return false;
  action=null;mouse=null;
  const side=x<W/2?1:-1;
  battle={kind:pick(demons),x:side===1?W-45:45,phase:'approach',time:0,hits:0,struck:false,attack:'attack1'};
  say('A demon appeared!');return true;
 }
 function perform(){
  if(!heroSheet||!active())return;
  if(battle){say('He’s busy fighting!');return;}
  const type=extras[clickIndex++%extras.length];
  action={type,start:clock,duration:type==='jump'?1.1:1.4};
  cooldown=clock+2.3;
 }
 function strike(px,py,color){effects.push({x:px,y:py,color,start:clock});}
 function update(dt){
  clock+=dt;
  if(clock>noticeUntil&&!loading)message.hidden=true;
  effects=effects.filter(e=>clock-e.start<.4);
  if(!heroSheet||clock<arrivalUntil)return;
  if(battle){
   const b=battle;b.time+=dt;
   const gap=Math.abs(b.x-x);dir=b.x>=x?1:-1;
   if(b.phase==='approach'){
    if(gap>100)b.x-=dir*Math.min(110*dt,gap-100);
    else{b.phase='hero';b.time=0;b.struck=false;b.attack=pick(['attack1','attack2','attack3','attack4']);}
   }else if(b.phase==='hero'||b.phase==='demon'){
    if(!b.struck&&b.time>=.42){
     b.struck=true;
     strike(b.phase==='hero'?b.x:x,H-48,b.phase==='hero'?'#ffb22b':'#ec6051');
     if(b.phase==='hero'){
      b.hits++;
      if(b.hits>=HITS_TO_WIN){b.phase='death';b.time=0;return;}
     }
    }
    if(b.time>=.95){
     b.phase=b.phase==='hero'?'demon':'hero';b.time=0;b.struck=false;
     b.attack=pick(['attack1','attack2','attack3','attack4']);
    }
   }else if(b.phase==='death'&&b.time>=1.1){
    battle=null;action={type:'victory',start:clock,duration:1.6};
    cooldown=clock+3;roll=0;say('Demon defeated — four hits!');
   }
   return;
  }
  if(action){if(clock-action.start>=action.duration)action=null;else return;}
  roll+=dt;
  if(roll>=ENCOUNTER_INTERVAL){roll=0;if(Math.random()<ENCOUNTER_CHANCE&&spawn())return;}
  if(mouse&&clock>=cooldown&&H-mouse.y<115&&Math.abs(mouse.x-x)<100){
   dir=mouse.x>=x?1:-1;
   action={type:pick(['attack1','attack2','attack4']),start:clock,duration:.85};
   cooldown=clock+2;return;
  }
  if(clock>=nextPatrol){
   patrol=Math.random()<.18?'idle':'run';speed=Math.random()<.5?55:105;
   nextPatrol=clock+3+Math.random()*5;
  }
  if(patrol==='run'){
   x+=dir*speed*dt;
   if(x>W-45){x=Math.max(45,W-45);dir=-1;}
   if(x<45){x=45;dir=1;}
  }
 }
 function sprite(image,rect,cx,ground,facing,alpha=1){
  if(!image||!rect)return;
  const [sx,sy,sw,sh]=rect;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,ground);ctx.scale(facing*SCALE,SCALE);
  ctx.drawImage(image,sx,sy,sw,sh,-sw/2,-sh,sw,sh);ctx.restore();
 }
 function frame(list,time,step=.11,once=false){
  const i=Math.floor(Math.max(0,time)/step);
  return list[once?Math.min(list.length-1,i):i%list.length];
 }
 function render(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=false;
  host.style.visibility=active()?'visible':'hidden';
  button.hidden=!active()||!heroSheet;
  if(!active()||!heroSheet)return;
  let pose=patrol,time=clock,ground=H-7;
  if(action){
   pose=action.type;time=clock-action.start;
   if(pose==='jump')ground-=Math.sin(Math.PI*Math.min(1,time/action.duration))*65;
  }
  if(battle){
   const b=battle;
   pose=b.phase==='hero'?b.attack:b.phase==='demon'?(b.struck?'hurt':'guard'):b.phase==='death'?'victory':'idle';
   time=b.time;
   const demonPose=b.phase==='death'?'death':b.phase==='demon'?'attack':b.phase==='hero'&&b.struck?'hurt':'run';
   const facing=b.x>x?1:-1;
   const knock=b.phase==='hero'&&b.struck?Math.sin(Math.min(1,(b.time-.42)/.53)*Math.PI)*9*facing:0;
   sprite(b.kind.image,frame(b.kind.frames[demonPose],b.time,.13,demonPose==='death'),b.x+knock,H-7-b.kind.hover,-facing*b.kind.native,b.phase==='death'?Math.max(0,1-b.time/1.1):1);
   if(b.phase!=='death'){
    for(let i=0;i<HITS_TO_WIN;i++){ctx.fillStyle=i<HITS_TO_WIN-b.hits?'#ff5140':'#4b3434';ctx.fillRect(b.x-23+i*13,H-115,9,4);}
   }
  }
  if(clock<arrivalUntil){pose='jump';time=.65-(arrivalUntil-clock);ground-=Math.sin(Math.PI*time/.65)*100;}
  sprite(heroSheet,frame(HERO[pose]||HERO.idle,time,pose==='run'?(speed<80?.16:.09):.13),x,ground,dir);
  for(const e of effects){
   const t=(clock-e.start)/.4;
   ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=e.color;ctx.lineWidth=3;
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*5,e.y+Math.sin(a)*5);
    ctx.lineTo(e.x+Math.cos(a)*(10+25*t),e.y+Math.sin(a)*(10+25*t));ctx.stroke();
   }ctx.restore();
  }
  button.style.left=(x-34)+'px';button.style.top=(ground-100)+'px';
 }
 function tick(now){
  raf=0;if(!active()){render();return;}
  const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
  update(dt);render();raf=requestAnimationFrame(tick);
 }
 function start(){if(!raf&&active()){last=0;raf=requestAnimationFrame(tick);}}
 function pause(){cancelAnimationFrame(raf);raf=0;last=0;mouse=null;render();}
 button.addEventListener('click',perform);
 button.addEventListener('contextmenu',event=>{event.preventDefault();spawn();});
 document.addEventListener('pointermove',e=>{if(active()&&e.pointerType!=='touch')mouse={x:e.clientX,y:e.clientY};},{passive:true});
 document.addEventListener('pointerout',e=>{if(!e.relatedTarget)mouse=null;},{passive:true});
 window.addEventListener('blur',leavePage);
 window.addEventListener('focus',focusPage);
 window.addEventListener('resize',resize);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)leavePage();else focusPage();});
 window.addEventListener('pagehide',()=>{departed=true;leavePage();});
 window.addEventListener('pageshow',()=>{departed=false;focusPage();});
 GM_addValueChangeListener(OWNER_KEY,syncOwner);
 GM_addValueChangeListener(HIDDEN_KEY,(_k,_old,value)=>{
  hidden=Boolean(value);if(hidden)leavePage();else claim();
 });
 setInterval(()=>{
  if(departed)return;
  if(document.hasFocus()&&!document.hidden&&!hidden){claim();checkpoint();}
 },1200);
 GM_registerMenuCommand('Rengoku: show / hide',()=>{
  checkpoint();hidden=!hidden;GM_setValue(HIDDEN_KEY,hidden);
  if(hidden)pause();else claim();
 });
 GM_registerMenuCommand('Rengoku: summon demon',()=>{if(!spawn())say('Load both images and finish the current fight first.');});
 GM_registerMenuCommand('Rengoku: extra action',perform);
 GM_registerMenuCommand('Rengoku: retry images',()=>{if(battle)return;for(const n of ['pack2','pack3','pack4'])GM_setValue('rengoku-image-v1:'+n,'');load();});
 resize();load();start();
})();
