// ==UserScript==
// @name         Car Drift Cursor
// @namespace    aseerr-car-drift-cursor
// @version      1.0.1
// @description  Five car-inspired cursors, click-to-drift animation, and colorful neon or flame trails.
// @match        https://*/*
// @match        http://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==
(() => {
 'use strict';
 if(window.top!==window.self||document.getElementById('aseerr-car-cursor'))return;
 const models={nsx:['Acura NSX',19,40],bmw:['BMW coupe',21,43],infiniti:['Infiniti coupe',22,44],amg:['Mercedes-AMG',23,45],mustang:['Mustang',23,46]};
 let saved={};try{saved=GM_getValue('garage',{});}catch{}
 if(!saved||typeof saved!=='object')saved={};
 const validColor=v=>typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v);
 const config={model:models[saved.model]?saved.model:'nsx',paint:validColor(saved.paint)?saved.paint:'#ef3448',trail:saved.trail==='flame'?'flame':'neon',color:validColor(saved.color)?saved.color:'#00eaff'};
 let enabled=true,visible=false,x=0,y=0,heading=0,driftStart=-Infinity,previous=0,raf=0,lastEmit=0;
 const particles=[];
 const host=document.createElement('div');host.id='aseerr-car-cursor';host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
 const root=host.attachShadow({mode:'closed'}),style=document.createElement('style'),hide=document.createElement('style');
 style.textContent=`:host{color-scheme:dark}canvas{position:absolute;inset:0;pointer-events:none} .car{position:absolute;width:46px;height:62px;transform-origin:23px 31px;pointer-events:none;filter:drop-shadow(0 2px 3px #0008)}svg{width:100%;height:100%;display:block} .aim{position:absolute;width:3px;height:3px;background:white;border:1px solid #111;border-radius:50%;pointer-events:none}section{position:absolute;box-sizing:border-box;width:290px;max-width:calc(100vw - 20px);max-height:calc(100vh - 20px);overflow:auto;background:#141923;color:#edf3ff;padding:18px;border:1px solid #7c8da5;border-radius:16px;box-shadow:0 12px 40px #0007;pointer-events:auto;cursor:auto!important;font:14px Arial,sans-serif}section[hidden]{display:none}section *{box-sizing:border-box;cursor:auto!important}label{display:block;margin:14px 0 5px}select,button{font:inherit;padding:8px;background:#283448;color:white;border:1px solid #60748c;border-radius:7px}select{width:100%}button{cursor:pointer!important}input{width:100%;height:34px}h2{font-size:18px;margin:0}p{font-size:12px;line-height:1.5;color:#b8c6d9}`;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
 const car=document.createElement('div');car.className='car';
 const aim=document.createElement('div');aim.className='aim';
 const menu=document.createElement('section');menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Car cursor garage');
 root.append(style,canvas,car,aim,menu);document.documentElement.append(hide,host);
 function cursor(){hide.textContent=enabled&&visible&&menu.hidden?'html,body,body *{cursor:none!important}':'';car.style.display=aim.style.display=enabled&&visible&&menu.hidden?'block':'none';}
 function save(){try{GM_setValue('garage',{...config});}catch{}}
 function drawCar(){
  const [name,w,h]=models[config.model],left=23-w/2,top=31-h/2;
  const grille=config.model==='bmw'?'<rect x="18" y="12" width="4" height="5" rx="1"/><rect x="24" y="12" width="4" height="5" rx="1"/>':config.model==='amg'?'<path d="M17 14H29M19 12V16M23 12V16M27 12V16" stroke="#ddd"/>':config.model==='mustang'?'<path d="M20 11V51M26 11V51" stroke="#eee" stroke-width="2"/>':config.model==='nsx'?'<path d="M12 42L16 36M34 42L30 36" stroke="#111" stroke-width="3"/>':'<path d="M17 14Q23 18 29 14" fill="none" stroke="#ddd"/>';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 62"><g fill="#10151c"><rect x="${left-3}" y="18" width="5" height="9" rx="2"/><rect x="${left+w-2}" y="18" width="5" height="9" rx="2"/><rect x="${left-3}" y="39" width="5" height="9" rx="2"/><rect x="${left+w-2}" y="39" width="5" height="9" rx="2"/></g><path d="M${left+4} ${top}Q23 ${top-3} ${left+w-4} ${top}Q${left+w} ${top+2} ${left+w} 22L${left+w} ${top+h-5}Q23 ${top+h+3} ${left} ${top+h-5}L${left} 22Q${left} ${top+2} ${left+4} ${top}Z" fill="${config.paint}" stroke="#e9f5ff" stroke-width=".7"/><g fill="#111820">${grille}</g><path d="M15 23Q23 19 31 23L29 29H17Z" fill="#8bcae0" stroke="#192a36"/><path d="M17 39H29L31 44Q23 47 15 44Z" fill="#324a60"/><path d="M15 18L19 17M27 17L31 18" stroke="#fffbd1" stroke-width="2"/><path d="M14 48H19M27 48H32" stroke="#ffb2ab" stroke-width="2"/><path d="M13 30L10 29M33 30L36 29" stroke="${config.paint}" stroke-width="3"/><path d="M18 31H28V37H18Z" fill="white" opacity=".12"/></svg>`;
  const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');car.replaceChildren(document.importNode(parsed.documentElement,true));car.setAttribute('aria-label',name);
 }
 const title=document.createElement('h2');title.textContent='Cursor Garage';menu.append(title);
 function select(label,key,values){const l=document.createElement('label');l.textContent=label;const input=document.createElement('select');for(const [value,text] of values){const o=document.createElement('option');o.value=value;o.textContent=text;input.append(o);}input.value=config[key];input.onchange=()=>{config[key]=input.value;save();drawCar();particles.length=0;};l.append(input);menu.append(l);}
 function color(label,key){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='color';input.value=config[key];input.oninput=()=>{config[key]=input.value;drawCar();};input.onchange=save;l.append(input);menu.append(l);}
 select('Car','model',Object.entries(models).map(([k,v])=>[k,v[0]]));color('Car paint','paint');select('Trail','trail',[['neon','Neon glow'],['flame','Flame trail']]);color('Trail color','color');
 const note=document.createElement('p');note.textContent='Stylized car-inspired artwork. Left-click to drift. Shift + right-click always opens the normal browser menu. Alt+Shift+C toggles the cursor.';menu.append(note);
 const close=document.createElement('button');close.textContent='Back to driving';close.onclick=()=>{menu.hidden=true;cursor();};menu.append(close);
 function openMenu(cx,cy){menu.hidden=false;particles.length=0;menu.style.left=Math.max(10,Math.min(cx,innerWidth-310))+'px';menu.style.top=Math.max(10,Math.min(cy,innerHeight-menu.offsetHeight-10))+'px';cursor();close.focus({preventScroll:true});}
 // Only intercept blank, non-interactive surfaces, not content or selected text.
 function emptyArea(e){
  if(e.shiftKey||String(getSelection()).trim())return false;
  const path=e.composedPath().filter(n=>n instanceof Element);
  if(path.some(n=>n===host||n.shadowRoot||n.matches('a,button,input,textarea,select,label,img,svg,canvas,video,audio,iframe,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[tabindex]')))return false;
  const el=path[0];if(!el)return false;
  for(const node of el.childNodes){if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)return false;}}
  return true;
 }
 document.addEventListener('contextmenu',e=>{if(enabled&&emptyArea(e)){e.preventDefault();openMenu(e.clientX,e.clientY);}},true);
 document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const dx=e.clientX-x,dy=e.clientY-y;if(Math.hypot(dx,dy)>2)heading=Math.atan2(dy,dx)+Math.PI/2;x=e.clientX;y=e.clientY;visible=true;cursor();},{passive:true});
 document.addEventListener('pointerdown',e=>{if(e.composedPath().includes(host))return;if(!menu.hidden){menu.hidden=true;cursor();return;}if(enabled&&e.button===0){x=e.clientX;y=e.clientY;visible=true;driftStart=performance.now();cursor();}},{passive:true});
 function leave(){visible=false;particles.length=0;cursor();}
 document.addEventListener('pointerout',e=>{if(!e.relatedTarget)leave();});addEventListener('blur',leave);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;cursor();}if(e.altKey&&e.shiftKey&&e.code==='KeyC'&&!e.repeat){e.preventDefault();toggle();}});
 function toggle(){enabled=!enabled;menu.hidden=true;particles.length=0;cursor();restart();}
 let dpr=1;
 function resize(){dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
 addEventListener('resize',resize);
 function frame(now){
  raf=0;const dt=Math.min(.05,(now-(previous||now))/1000);previous=now;ctx.clearRect(0,0,innerWidth,innerHeight);
  if(!enabled||document.hidden)return;
  const t=(now-driftStart)/520;const drift=t>=0&&t<=1?(1-Math.pow(1-t,3))*Math.PI*2:0;const rotation=heading+drift;
  car.style.transform=`translate(${x-23}px,${y-31}px) rotate(${rotation}rad)`;aim.style.transform=`translate(${x-2}px,${y-2}px)`;
  if(visible&&menu.hidden&&now-lastEmit>22){lastEmit=now;const tailX=x-Math.sin(rotation)*23,tailY=y+Math.cos(rotation)*23;particles.push({x:tailX,y:tailY,life:0,max:config.trail==='flame'?.42:.28,color:config.color,kind:config.trail,vx:(Math.random()-.5)*28,vy:-12-Math.random()*25});}
  while(particles.length>60)particles.shift();
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life+=dt;if(p.life>=p.max){particles.splice(i,1);continue;}const a=1-p.life/p.max;ctx.save();ctx.globalAlpha=a;
   if(p.kind==='neon'){ctx.shadowColor=p.color;ctx.shadowBlur=12;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.5*a+.5,0,Math.PI*2);ctx.fill();}
   else{p.x+=p.vx*dt;p.y+=p.vy*dt;const r=8*a+1,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,'#fff8cc');g.addColorStop(.3,p.color);g.addColorStop(1,p.color+'00');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p.x,p.y,r*.65,r*1.5,0,0,Math.PI*2);ctx.fill();}
   ctx.restore();
  }
  raf=requestAnimationFrame(frame);
 }
 function restart(){cancelAnimationFrame(raf);previous=0;ctx.clearRect(0,0,innerWidth,innerHeight);if(enabled&&!document.hidden)raf=requestAnimationFrame(frame);}
 document.addEventListener('visibilitychange',()=>{leave();restart();});
 if(typeof GM_registerMenuCommand==='function'){GM_registerMenuCommand('Car cursor: open garage',()=>openMenu(innerWidth-310,30));GM_registerMenuCommand('Car cursor: hide / show',toggle);}
 drawCar();resize();cursor();restart();
})();
