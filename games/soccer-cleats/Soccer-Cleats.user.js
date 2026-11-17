// ==UserScript==
// @name         Soccer Ball & Cleat Cursor
// @namespace    aseerr-soccer-cleats
// @version      1.1.0
// @description  A gently rolling soccer ball, cleat cursor, and directional kicks on any ordinary webpage.
// @match        https://*/*
// @match        http://*/*
// @run-at       document-end
// @noframes
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(() => {
  'use strict';
  if (window.top !== window.self || document.getElementById('aseerr-soccer')) return;
  const SIZE = 46, R = SIZE / 2, FLOOR_GAP = 7;
  const GRAVITY = 920, ROLL_SPEED = 27;
  let enabled = true, cleats = true, raf = 0, previous = 0;
  let x = Math.max(R, innerWidth * .35), y = innerHeight - R - FLOOR_GAP;
  let vx = ROLL_SPEED, vy = 0, angle = 0, lastKick = -10000;
  const boot = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path d="M6 9L19 8L24 22Q30 25 38 25Q46 25 46 32L43 36L5 36L3 29Z" fill="#141921" stroke="white" stroke-width="2"/><path d="M7 12L17 11L20 20L7 23Z" fill="#ff5539"/><path d="M19 23L24 25M17 27L23 29" stroke="white" stroke-width="2"/><path d="M24 32L30 24L35 26L30 32" fill="#bbff4b"/><path d="M5 35H44" stroke="#bbff4b" stroke-width="3"/><path d="M9 37V41H14V37M23 37V41H28V37M36 37V41H41V37" fill="#202630" stroke="white" stroke-width="1.5"/></svg>`;
  let cursor = `url("data:image/svg+xml,${encodeURIComponent(boot)}") 45 30, auto`;
  const cursorStyle = document.createElement('style');
  function updateCursor() {
    cursorStyle.textContent = enabled && cleats ? `html,body,body * {cursor:${cursor} !important;}` : '';
  }
  const host = document.createElement('div'); host.id = 'aseerr-soccer';
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483646!important;pointer-events:none!important;display:block!important;';
  const root = host.attachShadow({mode:'closed'});
  const css = document.createElement('style');
  css.textContent = `:host{color-scheme:light}button{all:unset;box-sizing:border-box;position:absolute;width:${SIZE}px;height:${SIZE}px;border-radius:50%;pointer-events:auto;touch-action:none;user-select:none;cursor:${cursor};filter:drop-shadow(0 3px 3px #0005);will-change:transform}button:focus-visible{outline:3px solid #ff8438;outline-offset:3px}svg{display:block;width:100%;height:100%;pointer-events:none}.shadow{position:absolute;width:42px;height:7px;border-radius:50%;background:#0003;filter:blur(2px);pointer-events:none}`;
  const shadow = document.createElement('div');shadow.className='shadow';
  const ball = document.createElement('button');ball.type='button';
  ball.setAttribute('aria-label','Kick soccer ball');
  ball.title='Click an edge to kick away from it. Click again in midair to juggle. Right-click: colors. Alt+Shift+S: hide/show.';
  const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="shine" cx="30%" cy="20%" r="85%"><stop offset="0" stop-color="white" stop-opacity=".5"/><stop offset=".55" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="#10202e" stop-opacity=".35"/></radialGradient><clipPath id="round"><circle cx="50" cy="50" r="48"/></clipPath></defs><g clip-path="url(#round)"><circle cx="50" cy="50" r="48" fill="#fafbfc"/><g fill="none" stroke="#555c65" stroke-width="1.7"><path d="M50 30L50 8M31 44L10 34M38 66L24 85M62 66L76 85M69 44L90 34M10 34L19 10L50 8L81 10L90 34L97 61L76 85L50 98L24 85L3 61Z"/></g><g fill="#17212c"><path d="M50 29L70 43L62 67H38L30 43Z"/><path d="M34 0H65L60 9L40 9Z"/><path d="M0 24L12 30L13 47L0 58Z"/><path d="M100 24L88 30L87 47L100 58Z"/><path d="M13 85L23 76L39 84L39 100Z"/><path d="M87 85L77 76L61 84L61 100Z"/></g><circle cx="50" cy="50" r="48" fill="url(#shine)"/></g><circle cx="50" cy="50" r="48" fill="none" stroke="#4d5661" stroke-width="2"/></svg>`,'image/svg+xml').documentElement;
  ball.append(document.importNode(svg,true)); root.append(css,shadow,ball);
  document.documentElement.append(cursorStyle,host); updateCursor();
  const palettes = [
    ['Classic','#fafbfc','#17212c','#bbff4b'],
    ['Neon Pink','#ffe5f5','#e60082','#ff64c8'],
    ['Inferno','#fff0c7','#dc3416','#ffab19'],
    ['Ocean','#dff8ff','#0758ad','#27dcff'],
    ['Toxic','#eaffd1','#225c24','#b6ff26'],
    ['Royal Purple','#f1e5ff','#7136bf','#c79aff'],
    ['Black & Gold','#24242a','#e6b643','#ffe391'],
    ['Ice','#ffffff','#91b4ce','#cdf8ff'],
    ['Crimson','#f7d8db','#8e132d','#ff4267'],
    ['Silver','#eeeeef','#59636e','#c1cbd5']
  ];
  const readChoice=key=>{try{const n=Number(GM_getValue(key,0));return Number.isInteger(n)&&n>=0&&n<palettes.length?n:0;}catch{return 0;}};
  let ballChoice=readChoice('ballColorway'),bootChoice=readChoice('cleatColorway');
  const menu=document.createElement('section');menu.hidden=true;
  menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Soccer colorways');
  menu.style.cssText='position:absolute;width:300px;max-width:calc(100vw - 20px);max-height:calc(100vh - 20px);overflow:auto;box-sizing:border-box;padding:16px;background:#141b28;color:#f7f9ff;border:1px solid #72819b;border-radius:16px;box-shadow:0 10px 35px #0006;pointer-events:auto;font:14px Arial,sans-serif;';
  const menuCSS=document.createElement('style');menuCSS.textContent=`section[hidden]{display:none!important}section button{all:unset;box-sizing:border-box;cursor:pointer!important;display:block;padding:8px;border:1px solid #647089;border-radius:7px;font:12px Arial,sans-serif;color:white;background:#243046;touch-action:manipulation}section button:hover{background:#354b69}section button[aria-pressed="true"]{outline:2px solid #70e4ff;outline-offset:-2px}section h3{font:bold 14px Arial,sans-serif;margin:14px 0 8px}section .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}section button:focus-visible{outline:2px solid #ffb342}`;
  const heading=document.createElement('strong');heading.textContent='Ball & Cleat Colorways';
  const close=document.createElement('button');close.textContent='Close ×';close.style.cssText='float:right;padding:3px 6px;';close.onclick=()=>{menu.hidden=true;ball.focus({preventScroll:true});};menu.append(close,heading);
  function applyColors(){
    const [,light,dark]=palettes[ballChoice];
    const art=ball.querySelector('svg');art.querySelector('g[clip-path] > circle').setAttribute('fill',light);
    art.querySelectorAll('g[clip-path] > g')[1].setAttribute('fill',dark);
    const [,bootLight,bootDark,accent]=palettes[bootChoice];
    const colored=boot.replaceAll('#141921',bootDark).replaceAll('#202630',bootDark).replaceAll('#ff5539',accent).replaceAll('#bbff4b',accent).replaceAll('"white"',`"${bootLight}"`);
    cursor=`url("data:image/svg+xml,${encodeURIComponent(colored)}") 45 30, auto`;
    updateCursor();ball.style.cursor=cleats?cursor:'pointer';
    menu.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.choice)===(b.dataset.kind==='ball'?ballChoice:bootChoice))));
  }
  for(const kind of ['ball','cleat']){
    const label=document.createElement('h3');label.textContent=kind==='ball'?'Soccer ball':'Soccer cleats';
    const grid=document.createElement('div');grid.className='grid';
    palettes.forEach(([name,light,dark],i)=>{const b=document.createElement('button');b.type='button';b.dataset.choice=String(i);b.dataset.kind=kind;b.title=name;b.setAttribute('aria-pressed','false');
      const dot=document.createElement('span');dot.style.cssText=`display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-2px;background:linear-gradient(135deg,${light} 50%,${dark} 50%);border:1px solid #ffffff66;`;b.append(dot,document.createTextNode(name));
      b.onclick=()=>{if(kind==='ball')ballChoice=i;else bootChoice=i;applyColors();try{GM_setValue(kind==='ball'?'ballColorway':'cleatColorway',i);}catch{}};grid.append(b);
    });menu.append(label,grid);
  }
  root.append(menuCSS,menu);
  menu.addEventListener('pointerdown',e=>e.stopPropagation());
  ball.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();menu.hidden=false;menu.style.left=Math.max(10,Math.min(e.clientX,innerWidth-320))+'px';menu.style.top=Math.max(10,Math.min(e.clientY-menu.offsetHeight,innerHeight-menu.offsetHeight-10))+'px';close.focus({preventScroll:true});});
  document.addEventListener('pointerdown',e=>{if(e.target!==host)menu.hidden=true;},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')menu.hidden=true;});
  applyColors();
  function bounds() { return {right:Math.max(R,innerWidth-R), floor:Math.max(R,innerHeight-R-FLOOR_GAP)}; }
  function paint(){
    const {floor}=bounds();
    ball.style.transform=`translate(${x-R}px,${y-R}px) rotate(${angle}rad)`;
    const height=Math.max(0,floor-y);
    shadow.style.transform=`translate(${x-21}px,${floor+R-3}px) scale(${Math.max(.3,1-height/900)})`;
    shadow.style.opacity=String(Math.max(.1,1-height/600));
  }
  function kick(clientX,clientY,keyboard=false){
    const now=performance.now(); if(now-lastKick<80)return;
    lastKick=now;
    let dx=x-clientX,dy=y-clientY;
    if(y<bounds().floor-3){
      // Every midair tap lifts the ball, whether it is rising or falling.
      // Edge taps steer; center taps damp sideways speed for easier juggling.
      const steer=keyboard?0:Math.max(-1,Math.min(1,dx/R));
      vx=Math.max(-220,Math.min(220,vx*.18+steer*190));
      const lift=Math.min(190,Math.max(12,(y-R)*.75));
      vy=-Math.sqrt(2*GRAVITY*lift);
    }else{
      if(keyboard || Math.hypot(dx,dy)<7){const a=Math.random()*Math.PI*2;dx=Math.cos(a);dy=Math.sin(a);}
      const length=Math.hypot(dx,dy)||1, power=530+Math.random()*180;
      vx=dx/length*power;vy=dy/length*power;
      // Ground kicks always launch upward, including clicks on the top edge.
      if(vy> -120)vy=-Math.max(300,Math.abs(vy)*.8);
    }
    ball.animate([{filter:'drop-shadow(0 0 8px #ffbb44)',scale:'1.12'},{filter:'drop-shadow(0 3px 3px #0005)',scale:'1'}],{duration:180});
  }
  ball.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();kick(e.clientX,e.clientY);});
  ball.addEventListener('click',e=>{e.stopPropagation();if(e.detail===0)kick(x,y,true);});
  ball.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();});
  function step(dt){
    const {right,floor}=bounds();
    const grounded=y>=floor-.5&&Math.abs(vy)<1;
    if(grounded){
      y=floor;vy=0;
      const target=(vx<0?-1:1)*ROLL_SPEED;
      vx+=(target-vx)*(1-Math.exp(-1.45*dt));
    }else{vy+=GRAVITY*dt;vx*=Math.exp(-.12*dt);}
    x+=vx*dt;y+=vy*dt;angle=(angle+vx/R*dt)%(Math.PI*2);
    if(x<R){x=R;vx=Math.abs(vx)*.78;}
    if(x>right){x=right;vx=-Math.abs(vx)*.78;}
    if(y<R){y=R;vy=Math.abs(vy)*.7;}
    if(y>=floor){y=floor;vy=Math.abs(vy)>85?-Math.abs(vy)*.57:0;}
  }
  function frame(now){
    raf=0;if(!enabled||document.hidden)return;
    const dt=Math.min((now-(previous||now))/1000,.05);previous=now;
    // Small substeps keep collisions stable across different refresh rates.
    const n=Math.max(1,Math.ceil(dt/.008));if(menu.hidden)for(let i=0;i<n;i++)step(dt/n);
    paint();raf=requestAnimationFrame(frame);
  }
  function resume(){cancelAnimationFrame(raf);raf=0;previous=0;if(enabled&&!document.hidden)raf=requestAnimationFrame(frame);}
  function toggle(){menu.hidden=true;enabled=!enabled;host.style.setProperty('display',enabled?'block':'none','important');updateCursor();resume();}
  addEventListener('resize',()=>{const b=bounds();x=Math.max(R,Math.min(x,b.right));y=Math.max(R,Math.min(y,b.floor));paint();});
  document.addEventListener('visibilitychange',resume);
  addEventListener('keydown',e=>{if(e.altKey&&e.shiftKey&&e.code==='KeyS'&&!e.repeat){e.preventDefault();toggle();}});
  if(typeof GM_registerMenuCommand==='function'){
    GM_registerMenuCommand('Soccer: hide / show',toggle);
    GM_registerMenuCommand('Soccer: toggle cleat cursor',()=>{cleats=!cleats;updateCursor();ball.style.cursor=cleats?cursor:'pointer';});
    GM_registerMenuCommand('Soccer: reset ball',()=>{x=Math.max(R,innerWidth*.35);y=bounds().floor;vx=ROLL_SPEED;vy=0;paint();});
  }
  paint();resume();
})();
