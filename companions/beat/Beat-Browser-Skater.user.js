// ==UserScript==
// @name         Beat — Browser Skater
// @namespace    aseerr-beat-browser-skater
// @version      1.1.1
// @description  Beat skates, follows your cursor four seconds behind, dances, and hops between script-enabled pages.
// @author       Aseerr customization; sprite sheet by xugggys; character by SEGA
// @match        http://*/*
// @match        https://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
 'use strict';
 if (document.getElementById('beat-browser-skater')) return;
 const ATLAS='data:image/webp;base64,'+`
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
`.replace(/\s/g,'');
 const CAN_IMAGE='data:image/webp;base64,'+`
UklGRsAFAABXRUJQVlA4WAoAAAAQAAAAHwAANwAAQUxQSDwCAAABoLRtmyHJlv9+ETG2bRvHtm3bts2dV7ZXts/Z2rZtVn7xvQcV
X+SJiAlA64IBN66FKO0l2Z4/7IX/MeAeNd4xtLWA0T+yw49HtpZwBDv8ZiZaD3jS9K+1EduR2BOz/8q6PRLqJaQIQE4nD0NCdYgA
MHi9C15UPRMJbfaeu9ftn5NUO7iFICvf8HYmmZuc+ckAkSo8RFLVSFJ5AmKFhD73Nh1jd7NvRoj4Es6l0qk8H9En6TXLHrOfJ0rw
RGzCTLfyKkRPwF1Un+VmKZwBE3+j+ai825OwH5WVZn/McgQ8XMfMa0oBU/+g1Zh9v2Up4Wg2rG3sXpSl50vMVcqdQyFiGRprs73e
Sxyns6lS7oTYTRDfZK5RPh+DdIuygWXWZm6FiO4Bd7CpUXsuBHQXjP2JVsWdkApJDqeyMtvrvUQKAU/VKfdARPeAJY2xMts7vUUK
CReyqVHuj4Tugj7vM1dke713kELEWsysVO6HBMe1bCqyvddXpCAY8SOtQnksEopJ9qTSb/bVcJFSwONVDU9DRDFg2q9mPrMfx0go
RZzPhn7lpYgoCnq/y+wz+3GihFKSzZjpV56FiHLELdb4zL4dIcGBkd/TfMrzEOE9kEq32XejJXjkaatQnoMI78I/aS6zb0eKuK60
TLfyZES4n2HHle3TASK+FT5gzg7lKUionHAz2RSMnw0VqQjADp/QGvtPk69DRG0IGHcZSapqh09LqAIisOYNH2SSvGvVIC1AIjBo
5TNuvPy6UQioBVZQOCBeAwAAkBEAnQEqIAA4AD5RHI1EI6GhGAwGADgFBLYAXZzgaA8M/s3FwcV97Mnn6AeQDtRbajzAfrB1K/JV
6yj0AP1u9L/2Lf2d9Ja5ucnFurlAtL3+i9OjtA9tf0V7Af8c/mH+x/sfCbfps2tuS+5gFButVFKdFIAGqIUA/2eV564KoihqV9RG
G2cTDnrO9z7it8BTqP8wIkAA/v/+g3Zf//Rw//rs//spxj/8wZu6SpvIUuy7yKf+g2q2b/jF82L6eow1LB9x8mZJY+IPGx4eXKeL
2clergOfFNvJm3lA+Z1Xs+T/pHe8/kVjsjhDGV+qHA18wSYXZp5GyJplJz52m8Y+4I2w1CWTt1Lw7mqpwKo59MOqnt2snFv8P33g
M2PWn98dQWsNrQNLhwvr62IGmdsKnBLP0yOwvYww2xe8lLCQxdQjWkqu0Onzd/yor5ibvbvtI6l6MVoWK9iR3R2ofLZeEL2XrYp6
GfBxJeBx9btZbsKMfGnparxYuqp/+CJXlL6U9P2YHKhBRoHDMJgZ+WyBXAK715SFXGjHPosS5m0cvx38fQkzcE7/4NUWp/tkm8tY
2POioyuf+ZP/+JCILHLYIjzXe+yiSCsV35vXH0OOG1AW5RiQ2v11v0jvbxFOyC2W8Ex2FbIAkw0LbYHr8WDannAKzN4RB8RvPuyG
mPzTMPuWOtklF2CWI8w/Oq4fPEnwqRelv9m8aIFWblCnKm47wLW/RkrSWnksusnFYYG2rGyi6Fm6wEDwtmXSv8wVMIn842Aff+JT
eIggc1EjnpVrV7KtjfXDH1lvKCyLOcrgv1GnSlUpXNMyT6U/w6nRhPWLzMzN4Ii6wru+GLF965XCacYSqpmwH74LobDlUeNEM79H
cu5hc+5JQE5zEghX1W0/7bBPxwfBwYX+hzqm/Py2DBlQhS0R+aMbFrW9EqKhJ35gOEJ8OvsqVtlCxHAZembAtgJ7jFJF9WskfKI2
wvKbH5GjhMX1hYpzKr6SBgVzOMGRlOO7hPgOWy9cmQqPZiAqE08J7TXInaEaR1ZUTfOA9yV+9oH79o+K0M+gY4KxyW+p6WseRuRA
s/9Z/PVfkJeQMfdsp8RTFSG6BeeiS//IVqSubdbfxb/6aGQY6EgfjZJcoJ/vy9viS1+VOMAAAA==
`.replace(/\s/g,'');
 const PREFIX='beat-skater-v1:', ID=crypto.randomUUID(), DELAY=4000;
 const read=(key,fallback)=>GM_getValue(PREFIX+key,fallback);
 const write=(key,value)=>GM_setValue(PREFIX+key,value);
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const frames={idle:[0,1,2,1],skate:[3,4,5,6],jump:[7,8],dance:[9,10,11,12,13,14,13,12,11,10]};
 let prefs={mode:'idle',scale:1.5,hidden:false,...read('settings',{})};
 if(!['idle','follow'].includes(prefs.mode))prefs.mode='idle';
 prefs.scale=clamp(Number(prefs.scale)||1.5,1,3);
 let x=80,y=0,direction=1,owner=false,stopped=false,ready=false;
 let danceUntil=0,jumpAt=0,idlePause=0,nextPause=performance.now()+6000;
 let trail=[],lastSample=0,target=null,raf=0,lastTime=0,leaving=false;
 let cans=[],lastDrop=null;
 let arrivalAt=0,menuOpen=false,noticeTimer=0,transferTimer=0;
 const host=document.createElement('div');host.id='beat-browser-skater';
 const root=host.attachShadow({mode:'closed'});document.documentElement.append(host);
 root.innerHTML=`<style>
 :host{all:initial;color-scheme:dark}*{box-sizing:border-box}
 #sprite{position:fixed;left:0;top:0;padding:0;border:0;background:transparent;z-index:2147483646;cursor:pointer;touch-action:manipulation;image-rendering:pixelated;filter:drop-shadow(0 3px 2px #0005)}
 #cans{position:fixed;inset:0;pointer-events:none;z-index:2147483645;overflow:hidden}
 .can{position:absolute;transform:translate(-50%,-50%);pointer-events:none;width:calc(var(--can-height)*.58);height:var(--can-height)}
 .can img{width:100%;height:100%;object-fit:contain;animation:can-spin 1.8s linear infinite;filter:drop-shadow(0 0 3px #ffe454aa)}
 .can.collected{animation:can-pickup .35s ease-out forwards}
 @keyframes can-spin{from{transform:perspective(150px) rotateY(0deg)}to{transform:perspective(150px) rotateY(360deg)}}
 @keyframes can-pickup{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-95%) scale(1.8)}}
 @media(prefers-reduced-motion:reduce){.can img{animation:none}.can.collected{animation:none;opacity:0}}
 #sprite:focus-visible{outline:2px solid #a8f238;border-radius:12px}
 [hidden]{display:none!important}
 #menu,#notice{position:fixed;z-index:2147483647;font:13px/1.4 Arial,sans-serif;color:#f4f6ed;background:#172025;border:1px solid #93bc39;border-radius:12px;box-shadow:0 6px 24px #0006}
 #menu{width:230px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;padding:12px}
 #menu strong{display:block;color:#b9f44f;font-size:16px;margin-bottom:8px}
 #menu button,#menu select{display:block;width:100%;padding:8px;margin:6px 0;background:#29363c;border:1px solid #566c74;border-radius:7px;color:#fff;font:inherit;text-align:left;cursor:pointer}
 #menu button:hover{background:#40513b}#menu small{display:block;color:#bbc8bf;margin-top:10px}
 #notice{bottom:16px;left:50%;transform:translateX(-50%);padding:10px 14px;max-width:90vw;pointer-events:none}
 @media print{#sprite,#menu,#notice,#cans{display:none!important}}
 </style><div id="cans" aria-hidden="true"></div><canvas id="sprite" width="128" height="144" role="button" tabindex="0" aria-label="Beat: click to dance, right-click for controls" title="Click to dance · Right-click for controls" hidden></canvas>
 <section id="menu" role="dialog" aria-label="Beat controls" hidden>
 <strong>Beat · Browser Skater</strong>
 <button data-action="idle">Skate along the bottom</button>
 <button data-action="follow">Follow cursor · 4s delay</button>
 <button data-action="dance">Dance!</button>
 <button data-action="jump">Jump to another page</button>
 <label>Sprite size<select id="size"><option value="1">Small</option><option value="1.5">Medium</option><option value="2">Large</option><option value="3">Extra large</option></select></label>
 <button data-action="hide">Hide Beat</button><button data-action="close">Close menu</button>
 <small id="mode"></small><small>Follow mode leaves rotating spray cans. Beat collects them along your trail. Up to 60 cans; leftovers expire after a minute.</small><small>Sprite sheet: xugggys · Character: SEGA. Dance uses the sheet’s trick poses. Beat follows you when you focus another supported tab/window.</small>
 </section><div id="notice" role="status" hidden></div>`;
 const canvas=root.getElementById('sprite'),ctx=canvas.getContext('2d');
 const menu=root.getElementById('menu'),size=root.getElementById('size'),notice=root.getElementById('notice');
 const canLayer=root.getElementById('cans');
 const atlas=new Image();
 const width=()=>64*prefs.scale,height=()=>72*prefs.scale;
 const floor=()=>Math.max(0,innerHeight-height()-4);
 const maxX=()=>Math.max(0,innerWidth-width());
 function toast(message){notice.textContent=message;notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.hidden=true,3500);}
 function save(){write('settings',prefs);applySettings();}
 function applySettings(){
  canvas.style.width=width()+'px';canvas.style.height=height()+'px';
  canLayer.style.setProperty('--can-height',(height()*.24)+'px');
  size.value=String(prefs.scale);x=clamp(x,0,maxX());y=clamp(y,0,floor());
  root.getElementById('mode').textContent='Mode: '+(prefs.mode==='idle'?'bottom skating':'cursor trail, delayed 4 seconds');
  if(prefs.hidden)menu.hidden=true;
  visibility();
 }
 function visible(){return owner&&ready&&!prefs.hidden&&!document.hidden;}
 function visibility(){
  canvas.hidden=!visible();
  canLayer.hidden=!visible()||prefs.mode!=='follow';
  if(canLayer.hidden)clearCans();
  if(visible()&&!raf){lastTime=0;raf=requestAnimationFrame(tick);}
  if(!visible()&&raf){cancelAnimationFrame(raf);raf=0;}
 }
 function clearCans(){for(const can of cans)can.node.remove();cans=[];canLayer.replaceChildren();lastDrop=null;}
 function dropCan(px,py,now){
  if(lastDrop&&(now-lastDrop.at<140||Math.hypot(px-lastDrop.x,py-lastDrop.y)<48))return;
  lastDrop={x:px,y:py,at:now};
  const half=height()*.12;
  const cx=clamp(px,half,Math.max(half,innerWidth-half));
  const cy=clamp(py,half,Math.max(half,innerHeight-half));
  const node=document.createElement('span');node.className='can';
  node.style.left=cx+'px';node.style.top=cy+'px';
  const img=document.createElement('img');img.src=CAN_IMAGE;img.alt='';img.draggable=false;
  img.style.animationDelay=-(now%1800)+'ms';node.append(img);canLayer.append(node);
  cans.push({x:cx,y:cy,at:now,node});
  while(cans.length>60)cans.shift().node.remove();
 }
 function collectCans(now,canCollect){
  const radius=height()*.12;
  const touches=can=>Math.hypot(can.x-clamp(can.x,x+width()*.2,x+width()*.8),can.y-clamp(can.y,y+height()*.12,y+height()))<=radius;
  cans=cans.filter(can=>{
   if(now-can.at>60000){can.node.remove();return false;}
   if(canCollect&&now-can.at>=DELAY&&touches(can)){
    can.node.classList.add('collected');setTimeout(()=>can.node.remove(),400);return false;
   }
   return true;
  });
 }
 function pages(){
  return GM_listValues().filter(k=>k.startsWith(PREFIX+'page-v111:')).map(k=>GM_getValue(k)).filter(p=>p&&Date.now()-p.at<9000);
 }
 function heartbeat(){
  if(stopped)return;
  write('page-v111:'+ID,{id:ID,at:Date.now(),visible:!document.hidden});
  for(const key of GM_listValues().filter(k=>k.startsWith(PREFIX+'page-v111:'))){const p=GM_getValue(key);if(!p||Date.now()-p.at>30000)GM_deleteValue(key);}
  const current=read('owner-v111',null);
  if(!document.hidden&&document.hasFocus()&&(!current||!pages().some(p=>p.id===current.id)))requestArrival();
  syncOwner();
 }
 function requestArrival(){
  if(stopped||prefs.hidden||document.hidden)return;
  const current=read('owner-v111',null);
  if(current?.id===ID){syncOwner();return;}
  const request={id:crypto.randomUUID(),to:ID,at:Date.now()};write('request-v111',request);
  if(!current||!pages().some(p=>p.id===current.id))write('owner-v111',{id:ID,at:Date.now()});
 }
 function handleRequest(request){
  if(!request||Date.now()-request.at>5000)return;
  const current=read('owner-v111',null);
  if(current?.id!==ID||request.to===ID)return;
  leaving=true;jumpAt=performance.now();menu.hidden=true;menuOpen=false;
  clearTimeout(transferTimer);
  transferTimer=setTimeout(()=>{
   const latest=read('request-v111',null);
   if(latest?.id===request.id&&read('owner-v111',null)?.id===ID)write('owner-v111',{id:request.to,at:Date.now()});
   leaving=false;syncOwner();
  },document.hidden?0:420);
 }
 function syncOwner(){
  const next=read('owner-v111',null)?.id===ID;
  if(next&&!owner){arrivalAt=performance.now();x=clamp(x,0,maxX());y=floor();trail=[];target=null;danceUntil=0;}
  owner=next;
  if(!owner){menu.hidden=true;menuOpen=false;}
  visibility();
 }
 function jumpPage(){
  const choices=pages().filter(p=>p.id!==ID).sort((a,b)=>Number(b.visible)-Number(a.visible)||b.at-a.at);
  if(!choices.length){toast('Open another normal webpage with this script enabled first.');return;}
  const request={id:crypto.randomUUID(),to:choices[0].id,at:Date.now()};
  write('request-v111',request);handleRequest(request);
  toast(choices[0].visible?'Beat is jumping to another page!':'Beat is waiting in another tab—switch tabs to see him.');
 }
 function dance(){danceUntil=performance.now()+8000;menu.hidden=true;menuOpen=false;visibility();}
 function showMenu(){
  if(prefs.hidden){prefs.hidden=false;save();}
  write('owner-v111',{id:ID,at:Date.now()});syncOwner();menuOpen=true;menu.hidden=false;
  menu.style.left=clamp(x,8,Math.max(8,innerWidth-238))+'px';
  menu.style.top=clamp(y-280,8,Math.max(8,innerHeight-420))+'px';
 }
 canvas.addEventListener('click',dance);
 canvas.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();showMenu();});
 canvas.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();dance();}
  if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();showMenu();}
 });
 root.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='idle'||action==='follow'){
   prefs.mode=action;trail=[];target=null;clearCans();y=floor();save();
   toast(action==='follow'?'Move your cursor. Beat follows its trail after 4 seconds.':'Back to skating along the bottom.');
  }
  if(action==='dance')dance();
  if(action==='jump')jumpPage();
  if(action==='hide'){prefs.hidden=true;save();}
  if(action==='close'){menu.hidden=true;menuOpen=false;}
 });
 size.addEventListener('change',()=>{prefs.scale=Number(size.value);save();});
 document.addEventListener('pointerdown',e=>{
  if(menuOpen&&!e.composedPath().includes(host)){menu.hidden=true;menuOpen=false;}
 },{passive:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;menuOpen=false;}});
 document.addEventListener('pointermove',e=>{
  if(!owner||!ready||prefs.mode!=='follow'||prefs.hidden||document.hidden||menuOpen||e.composedPath().includes(host))return;
  const now=performance.now();if(now-lastSample<60)return;lastSample=now;
  trail.push({at:now,x:e.clientX,y:e.clientY});
  dropCan(e.clientX,e.clientY,now);
  if(trail.length>300)trail.shift();
 },{passive:true});
 function tick(now){
  raf=0;if(!visible())return;
  const dt=lastTime?Math.min((now-lastTime)/1000,.05):0;lastTime=now;
  let state='idle',moving=false,offset=0,rotation=0;
  const dancing=now<danceUntil;
  if(!dancing&&!menuOpen&&!leaving){
   if(prefs.mode==='follow'){
    if(!target&&trail.length&&trail[0].at<=now-DELAY)target=trail.shift();
    if(target){
     const tx=clamp(target.x-width()/2,0,maxX()),ty=clamp(target.y-height()+12,0,floor());
     const dx=tx-x,dy=ty-y,distance=Math.hypot(dx,dy),step=Math.min(distance,180*dt);
     if(distance>2){x+=dx/distance*step;y+=dy/distance*step;moving=true;if(Math.abs(dx)>2)direction=dx>0?1:-1;}
     if(distance<=Math.max(2,step+.01))target=null;
    }
   }else{
    y=floor();
    if(now>=nextPause){idlePause=now+1100;nextPause=now+7000+Math.random()*7000;}
    if(now>idlePause){
     moving=true;x+=direction*95*dt;
     if(x>=maxX()){x=maxX();direction=-1;}else if(x<=0){x=0;direction=1;}
    }
   }
  }
  collectCans(now,prefs.mode==='follow'&&!dancing&&!menuOpen&&!leaving);
  if(moving)state='skate';
  if(dancing){state='dance';offset=-Math.abs(Math.sin(now/140))*9;rotation=Math.sin(now/230)*.06;}
  if(arrivalAt&&now-arrivalAt<650){state='jump';const progress=(now-arrivalAt)/650;offset=-Math.sin(Math.PI*progress)*100;}
  if(leaving){state='jump';offset=-Math.min(1,(now-jumpAt)/420)*180;}
  const sequence=frames[state],frame=sequence[Math.floor(now/(state==='dance'?150:state==='skate'?115:230))%sequence.length];
  ctx.clearRect(0,0,128,144);ctx.imageSmoothingEnabled=false;ctx.save();
  ctx.translate(64,144);ctx.scale(direction,1);ctx.rotate(rotation);
  ctx.drawImage(atlas,frame*64,0,64,72,-64,-144,128,144);ctx.restore();
  canvas.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y+offset)}px,0)`;
  canvas.style.opacity=leaving?String(1-Math.min(1,(now-jumpAt)/420)): '1';
  raf=requestAnimationFrame(tick);
 }
 const listeners=[
  GM_addValueChangeListener(PREFIX+'owner-v111',syncOwner),
  GM_addValueChangeListener(PREFIX+'request-v111',(_key,_old,value)=>handleRequest(value)),
  GM_addValueChangeListener(PREFIX+'settings',(_key,_old,value)=>{
   if(!value)return;prefs={...prefs,...value};trail=[];target=null;clearCans();applySettings();
  })
 ];
 window.addEventListener('focus',()=>{heartbeat();requestArrival();});
 document.addEventListener('visibilitychange',()=>{
  trail=[];target=null;clearCans();heartbeat();visibility();
  if(!document.hidden&&document.hasFocus())requestArrival();
 });
 window.addEventListener('resize',()=>{x=clamp(x,0,maxX());y=clamp(y,0,floor());clearCans();});
 let pulse=setInterval(heartbeat,2000);
 function depart(){
  clearCans();stopped=true;clearInterval(pulse);clearTimeout(transferTimer);cancelAnimationFrame(raf);raf=0;
  GM_deleteValue(PREFIX+'page-v111:'+ID);
  if(read('owner-v111',null)?.id===ID){const next=pages().find(p=>p.id!==ID&&p.visible);write('owner-v111',next?{id:next.id,at:Date.now()}:null);}
 }
 window.addEventListener('pagehide',depart);
 window.addEventListener('pageshow',()=>{
  if(stopped){stopped=false;pulse=setInterval(heartbeat,2000);heartbeat();if(document.hasFocus())requestArrival();}
 });
 GM_registerMenuCommand('Beat: controls / bring here',showMenu);
 GM_registerMenuCommand('Beat: show / hide',()=>{prefs.hidden=!prefs.hidden;save();if(!prefs.hidden)requestArrival();});
 atlas.onload=()=>{ready=true;applySettings();heartbeat();if(document.hasFocus())requestArrival();};
 atlas.onerror=()=>{toast('Beat’s image could not load. Open the Tampermonkey menu → Beat: controls / bring here.');console.error('Beat: embedded sprite failed to decode.');};
 y=floor();applySettings();heartbeat();atlas.src=ATLAS;
})();
