(async () => {
  'use strict';
  const HOST='aseerr-ooo-crew', KEY='ooo-crew.settings.v1', MEMORY='ooo-crew.memories.v1';
  const PREVIEW=__PREVIEW__;
  if(document.getElementById(HOST)||window.top!==window.self)return;
  const read=(key,fallback)=>{try{return typeof GM_getValue==='function'?GM_getValue(key,fallback):JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}};
  const write=(key,value)=>{try{if(typeof GM_setValue==='function')GM_setValue(key,value);else localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  let settings=OooCore.sanitize(read(KEY,{}));
  const memoryKeys=[...Object.keys(OooCore.scenes),'snack','drag'];
  const validMemories=value=>Array.isArray(value)?[...new Set(value.filter(id=>memoryKeys.includes(id)))]:[];
  let memories=validMemories(read(MEMORY,[]));
  const viewport=()=>({width:Math.min(innerWidth,document.documentElement.clientWidth||innerWidth),height:Math.min(innerHeight,document.documentElement.clientHeight||innerHeight)});
  const initialViewport=viewport();
  const world=new OooCore.World(settings,initialViewport.width,initialViewport.height);
  const host=document.createElement('div');host.id=HOST;
  host.style.cssText='all:initial!important;display:block!important;position:fixed!important;inset:0!important;width:100%!important;height:100%!important;pointer-events:none!important;z-index:2147483646!important;isolation:isolate!important;font-family:Verdana,sans-serif!important;font-size:13px!important;color:var(--ink)!important;';
  const root=host.attachShadow({mode:'closed'});document.documentElement.append(host);
  const style=document.createElement('style');style.textContent=__STYLES__;root.append(style);
  const shell=document.createElement('div');
  shell.innerHTML=`<canvas class="stage" aria-hidden="true"></canvas><div class="hit-layer"></div>
    <div class="launcher-row"><button class="launcher" aria-label="Open Ooo Crew field guide" aria-expanded="false" aria-controls="ooo-book"><b>OOO</b><small>pocket<br>adventures</small></button><button class="pause-mini" aria-label="Pause companions" title="Pause companions">Ⅱ</button></div>
    <section class="book" id="ooo-book" role="dialog" aria-label="Ooo Crew field guide" hidden><header class="cover"><div class="seal" aria-hidden="true">Ooo</div><div><h1>Pocket adventures</h1><p>A field guide to good company</p></div><button class="close" aria-label="Close field guide">×</button></header>
    <nav class="tabs" role="tablist" aria-label="Field guide chapters">${[['crew','The crew'],['play','Adventures'],['style','Your world'],['journal','Postcards']].map(([id,label],i)=>`<button role="tab" id="tab-${id}" data-tab="${id}" aria-controls="page-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${label}</button>`).join('')}</nav>
    <div class="page" role="tabpanel" id="page-crew" aria-labelledby="tab-crew" tabindex="0"></div><footer class="footer"><span class="status">Packing tiny adventures…</span><button data-command="quiet">Hide crew</button></footer></section>
    <div class="toast" hidden></div><div class="tool-banner" hidden></div><div class="sr-only" role="status" aria-live="polite"></div>`;
  root.append(shell);
  const $=q=>root.querySelector(q), $$=q=>[...root.querySelectorAll(q)];
  const canvas=$('.stage'),ctx=canvas.getContext('2d'),book=$('.book'),page=$('.page'),launcher=$('.launcher'),hitLayer=$('.hit-layer'),banner=$('.tool-banner');
  const media=matchMedia('(prefers-reduced-motion: reduce)');world.systemReduced=media.matches;
  let assets,raf=0,last=0,lastPaint=0,tab='crew',playMode=false,tool=null,dragging=null,toastTimer=0,audioContext=null,tones=[],disposed=false,statusText='',assetFailure=false;
  const hitButtons=new Map();
  const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const siteHidden=()=>settings.hiddenSites.includes(location.hostname);
  const suspended=()=>document.hidden||!!document.fullscreenElement||siteHidden()||!settings.enabled||assetFailure;
  function announce(message){$('.sr-only').textContent=message;}
  function toast(message){$('.toast').textContent=message;$('.toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').hidden=true,4200);announce(message);}
  function saveMemory(id){if(memories.includes(id))return;memories=[...new Set([...validMemories(read(MEMORY,[])),...memories,id])];write(MEMORY,memories);if(tab==='journal'&&!book.hidden)renderPage();}
  function stopSound(){for(const node of tones)try{node.stop();}catch{}tones=[];}
  function prepareAudio(){if(!settings.sound)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume()?.catch(()=>{});}catch{toast('Sound is unavailable in this browser. The crew can still play silently.');}}
  function playChime(){
    if(!settings.sound||world.gentle||audioContext?.state!=='running'||suspended())return;
    stopSound();const now=audioContext.currentTime;
    // An original eight-note synth phrase, not a recording or show soundtrack.
    [164.81,196,220,261.63,246.94,196,146.83,164.81].forEach((frequency,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='triangle';oscillator.frequency.value=frequency;const t=now+i*.29;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.028,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.25);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(t);oscillator.stop(t+.27);tones.push(oscillator);});
  }
  function patch(change){
    settings=OooCore.sanitize({...OooCore.sanitize(read(KEY,settings)),...change});
    if(!write(KEY,settings))toast('Your browser could not save these preferences. They still apply to this tab.');
    world.apply(settings);sync();renderPage(true);paint();schedule();
  }
  function sync(){
    host.dataset.theme=settings.theme;host.dataset.gentle=String(world.gentle);host.dataset.suspended=String(suspended());
    $('.pause-mini').textContent=world.paused?'▶':'Ⅱ';$('.pause-mini').setAttribute('aria-label',world.paused?'Resume companions':'Pause companions');$('.pause-mini').title=world.paused?'Resume companions':'Pause companions';
    $('[data-command="quiet"]').textContent=settings.enabled?'Hide crew':'Wake crew';
    launcher.querySelector('small').innerHTML=siteHidden()?'site<br>snoozed':!settings.enabled?'crew<br>sleeping':world.paused?'taking a<br>breather':'pocket<br>adventures';
    if(suspended()||world.paused)stopSound();
    for(const[id,button]of hitButtons)if(!world.actor(id)){button.remove();hitButtons.delete(id);}
    if(!settings.enabled||siteHidden())setTool(null);
    updateStatus();
  }
  function updateStatus(){
    const text=assetFailure?'Sprite loading failed.':siteHidden()?'This site is snoozed.':!settings.enabled?'The crew is tucked away.':world.paused?'Taking a breather.':world.scene?OooCore.scenes[world.scene.id].title:world.actors.length?`${world.actors.length} friends · ${playMode?'play mode':'click-through'}`:'Invite someone from The crew.';
    if(text!==statusText){$('.status').textContent=text;statusText=text;}
  }
  function openBook(open=true){book.hidden=!open;launcher.setAttribute('aria-expanded',String(open));$('.toast').hidden=true;if(open){renderPage();$('.close').focus({preventScroll:true});}else launcher.focus({preventScroll:true});}
  function selectTab(id,focus=false){tab=id;$$('[data-tab]').forEach(b=>{const chosen=b.dataset.tab===id;b.setAttribute('aria-selected',String(chosen));b.tabIndex=chosen?0:-1;});renderPage();if(focus)$(`#tab-${id}`).focus();}
  function renderPage(keepFocus=false){
    const focused=keepFocus?root.activeElement?.getAttribute('data-focus'):null;
    const scroll=keepFocus?page.scrollTop:0;page.id=`page-${tab}`;page.setAttribute('aria-labelledby',`tab-${tab}`);
    if(tab==='crew'){
      page.innerHTML=`<div class="eyebrow">Chapter 01 / Pick your party</div><h2>Good company. Tiny chaos.</h2><p class="muted">Invite your favorites. Each one brings a different kind of adventure.</p><div class="presets">${[['friends','The usual five'],['candy','Candy quest'],['midnight','After dark'],['counterparts','Fionna & Cake'],['royalty','Princess party'],['everyone','Everybody']].map(([id,label])=>`<button data-preset="${id}" data-focus="preset-${id}">${label}</button>`).join('')}</div><div class="crew-list">${Object.entries(OooCore.cast).map(([id,def])=>`<div class="crew-member"><canvas class="portrait" data-portrait="${id}" width="118" height="130" aria-hidden="true"></canvas><div class="member-copy"><strong>${def.name}</strong><small>${def.subtitle}</small><button data-trick="${id}" data-focus="trick-${id}" ${world.actor(id)?'':'disabled'}>${def.trick} ↗</button></div><button class="join" data-join="${id}" data-focus="join-${id}" aria-pressed="${settings.selected.includes(id)}" aria-label="${settings.selected.includes(id)?'Remove':'Invite'} ${def.name}">${settings.selected.includes(id)?'✓':'+'}</button></div>`).join('')}</div><p class="muted" style="margin-top:12px">Everything is available from the start. Your crew and preferences save automatically.</p>`;
      drawPortraits();
    }else if(tab==='play'){
      page.innerHTML=`<div class="eyebrow">Chapter 02 / Make a little moment</div><h2>What time is it?</h2><p class="muted">Scenes also happen on their own. These buttons let you start the fun.</p><div class="tool-row"><button data-command="play" data-focus="play" aria-pressed="${playMode}">${playMode?'✓ Play mode':'Play mode'}</button><button data-command="snack" data-focus="snack">Drop snack</button><button data-command="call" data-focus="call">Gather here</button></div><div class="hint">${playMode?'Drag a character to pick them up. Tap one for a trick. Press Esc to return to click-through browsing.':'The crew lets webpage clicks pass through. Turn on play mode when you want to pick them up.'}</div>${Object.entries(OooCore.scenes).map(([id,def],i)=>`<button class="scene" data-scene="${id}" data-focus="scene-${id}" ${world.available(id)&&settings.enabled&&!world.paused&&!siteHidden()?'':'disabled'}><span class="scene-mark" aria-hidden="true">${['✦','♫','!','⚗','♛','☼','↝','☾'][i]}</span><span><strong>${def.title}</strong><small>${def.note}</small>${world.available(id)?'':`<em>Invite ${def.needs.length?def.needs.filter(k=>!world.actor(k)).map(k=>OooCore.cast[k].short||OooCore.cast[k].name).join(' + ')||'one more friend':'at least two friends'}.</em>`}</span></button>`).join('')}<button class="wide" data-command="stop">End the current scene</button>`;
    }else if(tab==='style'){
      const slider=(key,label,min,max,step,suffix)=>`<div class="row"><label for="setting-${key}">${label}</label><div class="range"><input id="setting-${key}" data-setting="${key}" data-focus="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}"><output for="setting-${key}">${key==='bottom'?Math.round(settings[key]):settings[key].toFixed(2)}${suffix}</output></div></div>`;
      const check=(key,label,help)=>`<label class="check-row"><input data-setting="${key}" data-focus="${key}" type="checkbox" ${settings[key]?'checked':''}><span>${label}<small>${help}</small></span></label>`;
      page.innerHTML=`<div class="eyebrow">Chapter 03 / A place for your people</div><h2>Make yourself at home.</h2><div class="row" style="margin-top:16px"><strong>Field guide cover</strong><div class="themes">${[['treehouse','Treehouse'],['candy','Candy Kingdom'],['night','Nightosphere']].map(([id,label])=>`<button data-theme="${id}" data-focus="theme-${id}" aria-pressed="${settings.theme===id}">${label}</button>`).join('')}</div></div>${slider('size','Companion size',.65,1.75,.05,'×')}${slider('speed','Walking pace',.4,1.8,.1,'×')}${slider('activity','How often things happen',.35,2,.05,'×')}${slider('bottom','Room above the bottom edge',0,240,4,'px')}<div class="row"><label for="motion">Motion</label><select id="motion" data-setting="motion" data-focus="motion">${[['system','Follow my device preference'],['gentle','Gentle — quiet companions'],['full','Full — wandering and hopping']].map(([id,label])=>`<option value="${id}" ${settings.motion===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="row"><label for="marcy-art">Marceline’s sprite style</label><select id="marcy-art" data-setting="marcelineArt" data-focus="marcelineArt"><option value="toon" ${settings.marcelineArt==='toon'?'selected':''}>Cartoon · clean silhouettes</option><option value="archive" ${settings.marcelineArt==='archive'?'selected':''}>Archive · Jarquin10’s pixel sprites</option></select></div>${check('wander','Let them wander','Off keeps their little idle animations in place.')}${check('autoScenes','Let friends start scenes','Pair and group interactions happen occasionally.')}${check('chatter','Speech bubbles','Short character banter, at most two bubbles at once.')}${check('sound','Tiny concert chime','An original, quiet synth phrase. Sound starts only after you enable it.')}<button class="wide" data-command="snooze">${siteHidden()?'Wake crew on this site':'Snooze on this site'}</button><button class="wide" data-command="defaults">Restore default preferences</button><hr class="rule"><p class="credit">Ooo Crew 1.1.0 · An unofficial fan companion.<br>Character art belongs to its respective owners. Adapted from your supplied sheets; archive sprites by Jarquin10, Gunter sheet posted by Popgamer06, game-sprite sheet by ParrishBroadnax. Full source notes and credits: <a href="https://github.com/slllky/universal-userscripts/tree/main/companions/ooo-crew" target="_blank" rel="noopener noreferrer">the repository</a>.</p>`;
    }else{
      const names={...Object.fromEntries(Object.entries(OooCore.scenes).map(([k,v])=>[k,v.title])),snack:'Snack delivery',drag:'A helping hand'};
      page.innerHTML=`<div class="eyebrow">Chapter 04 / Little things worth keeping</div><h2>Postcards from this tab.</h2><p class="muted">${memories.length} of ${memoryKeys.length} moments collected. Finish scenes, feed a friend, or pick someone up to stamp your book.</p><div class="stamps">${memoryKeys.map((id,i)=>`<div class="stamp ${memories.includes(id)?'found':''}"><div><b aria-hidden="true">${memories.includes(id)?['✦','♫','!','⚗','♛','☼','↝','☾','♡','↟'][i]:'?'}</b>${names[id]}<small>${memories.includes(id)?'A GOOD LITTLE MEMORY':'WAITING TO HAPPEN'}</small></div></div>`).join('')}</div><div class="hint">Collected moments stay with this userscript across websites. They never lock characters or features.</div>`;
    }
    if(keepFocus)page.scrollTop=scroll;
    if(focused){const element=$$('[data-focus]').find(el=>el.dataset.focus===focused);element?.focus({preventScroll:true});}
  }
  function drawPortraits(){if(!assets)return;for(const el of $$('[data-portrait]')){const id=el.dataset.portrait;const art=id==='marceline'&&settings.marcelineArt==='archive'?'archive':id;const c=el.getContext('2d');c.clearRect(0,0,118,130);c.imageSmoothingEnabled=false;OooRender.sprite(c,assets.atlas,assets.frames,assets.frames.animations[art+'.idle'][0],59,124,1.35);}}
  function setTool(next){tool=next;canvas.style.pointerEvents=tool?'auto':'none';canvas.style.cursor=tool?'crosshair':'default';banner.hidden=!tool;banner.textContent=tool==='snack'?'Click anywhere to drop a snack · Esc cancels':'Click a gathering spot · Esc cancels';}
  function paint(){
    if(!assets||disposed)return;
    if(suspended()){ctx.clearRect(0,0,world.width,world.height);for(const button of hitButtons.values())button.hidden=true;return;}
    const poses=OooRender.draw(ctx,world,assets)||[];
    for(const[a,p]of poses){let b=hitButtons.get(a.id);if(!b){b=document.createElement('button');b.className='hit';b.dataset.actor=a.id;b.setAttribute('aria-label',`${OooCore.cast[a.id].name}: tap for a trick, or drag`);b.innerHTML=`<span>${OooCore.cast[a.id].short||OooCore.cast[a.id].name}</span>`;hitLayer.append(b);hitButtons.set(a.id,b);}b.hidden=!playMode||world.paused||!!tool;b.style.width=`${p.width}px`;b.style.height=`${p.height}px`;b.style.left=`${p.bounds[0]}px`;b.style.top=`${p.bounds[1]}px`;}
  }
  function resize(){const dpr=Math.min(devicePixelRatio||1,2),view=viewport();world.resize(view.width,view.height);canvas.style.width=`${view.width}px`;canvas.style.height=`${view.height}px`;canvas.width=Math.max(1,Math.round(view.width*dpr));canvas.height=Math.max(1,Math.round(view.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);paint();}
  function handleEvents(){for(const event of world.drain()){
    if(event.type==='scene')announce(event.title);
    if(event.type==='performance'&&['concert','batflight'].includes(event.id))playChime();
    if(event.type==='trick'&&event.id==='marceline')playChime();
    if(event.type==='complete')saveMemory(event.id);
    if(event.type==='fed')saveMemory('snack');
    if(event.type==='drag')saveMemory('drag');
  }updateStatus();}
  function tick(now){raf=0;if(disposed||suspended()||world.paused){last=0;paint();return;}if(!last)last=now;const dt=(now-last)/1000;last=now;world.step(dt);handleEvents();if(now-lastPaint>=(world.gentle?100:1000/30)){paint();lastPaint=now;}schedule();}
  function schedule(){if(!raf&&assets&&!disposed&&!suspended()&&!world.paused)raf=requestAnimationFrame(tick);}
  function pause(){world.paused=!world.paused;last=0;sync();renderPage(true);paint();schedule();}
  function command(name){
    if(name==='quiet'){patch({enabled:!settings.enabled});return;}
    if(name==='play'){playMode=!playMode;setTool(null);renderPage(true);paint();updateStatus();return;}
    if(name==='snack'||name==='call'){if(!settings.enabled||world.paused||siteHidden()){toast('Wake or resume the crew first.');return;}if(!world.actors.length){toast('Invite a friend from The crew first.');return;}openBook(false);setTool(name);paint();return;}
    if(name==='stop'){world.cancelScene();stopSound();paint();updateStatus();return;}
    if(name==='snooze'){if(!location.hostname){toast('Site snoozing is available on websites; this is a local preview.');return;}const hidden=settings.hiddenSites.includes(location.hostname);patch({hiddenSites:hidden?settings.hiddenSites.filter(x=>x!==location.hostname):[...settings.hiddenSites,location.hostname]});toast(hidden?'The crew is back on this site.':'Snoozed here. Use the Ooo button to wake them.');return;}
    if(name==='defaults'){patch({...OooCore.defaults,hiddenSites:settings.hiddenSites});toast('Default crew and preferences restored. Your postcards are safe.');}
  }
  root.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b===launcher){openBook(book.hidden);return;}if(b.classList.contains('close')){openBook(false);return;}if(b.classList.contains('pause-mini')){pause();return;}
    if(b.dataset.tab){selectTab(b.dataset.tab);return;}
    if(b.dataset.join){const id=b.dataset.join;patch({selected:settings.selected.includes(id)?settings.selected.filter(k=>k!==id):[...settings.selected,id]});return;}
    if(b.dataset.preset){patch({selected:OooCore.presets[b.dataset.preset]});return;}
    if(b.dataset.theme){patch({theme:b.dataset.theme});return;}
    if(b.dataset.trick){if(!siteHidden()&&world.trick(b.dataset.trick)){handleEvents();paint();}else toast('Wake or resume the crew first.');return;}
    if(b.dataset.scene){prepareAudio();if(world.startScene(b.dataset.scene)){openBook(false);handleEvents();paint();}return;}
    if(b.dataset.command){command(b.dataset.command);return;}
    if(b.dataset.actor&&event.detail===0){world.trick(b.dataset.actor);handleEvents();paint();}
  });
  root.addEventListener('input',event=>{const el=event.target;if(el.type==='range'&&el.dataset.setting){const value=Number(el.value);el.nextElementSibling.textContent=(el.dataset.setting==='bottom'?Math.round(value):value.toFixed(2))+(el.dataset.setting==='bottom'?'px':'×');settings=OooCore.sanitize({...settings,[el.dataset.setting]:value});world.apply(settings);sync();paint();}});
  root.addEventListener('change',event=>{const el=event.target;if(!el.dataset.setting)return;const key=el.dataset.setting;const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;patch({[key]:value});if(key==='sound'){if(value)prepareAudio();else stopSound();}});
  root.addEventListener('keydown',event=>{const b=event.target.closest('[data-tab]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const ids=['crew','play','style','journal'];let i=ids.indexOf(tab);i=event.key==='Home'?0:event.key==='End'?3:(i+(event.key==='ArrowRight'?1:3))%4;selectTab(ids[i],true);});
  hitLayer.addEventListener('pointerdown',event=>{const b=event.target.closest('[data-actor]');if(!b||event.button!==0||!playMode||!world.startDrag(b.dataset.actor))return;event.preventDefault();dragging={id:b.dataset.actor,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,moved:false,offsetX:world.actor(b.dataset.actor).x-event.clientX,offsetY:(world.floor-(OooCore.cast[b.dataset.actor].float||0)*world.scale)-event.clientY};b.setPointerCapture(event.pointerId);paint();});
  hitLayer.addEventListener('pointermove',event=>{if(!dragging||event.pointerId!==dragging.pointer)return;const d=dragging;d.moved||=Math.hypot(event.clientX-d.startX,event.clientY-d.startY)>5;world.drag(d.id,event.clientX+d.offsetX,event.clientY+d.offsetY);paint();});
  const endDrag=(event,canceled=false)=>{if(!dragging||event.pointerId!==dragging.pointer)return;const d=dragging;dragging=null;world.endDrag(d.id);if(!d.moved&&!canceled)world.trick(d.id);handleEvents();paint();};
  hitLayer.addEventListener('pointerup',e=>endDrag(e));hitLayer.addEventListener('pointercancel',e=>endDrag(e,true));hitLayer.addEventListener('lostpointercapture',e=>endDrag(e,true));
  canvas.addEventListener('pointerdown',event=>{if(!tool||event.button!==0)return;event.preventDefault();const chosen=tool;setTool(null);if(chosen==='snack')world.dropSnack(event.clientX);else world.call(event.clientX);handleEvents();paint();});
  const pointer=event=>{if(event.composedPath().includes(host)||world.gentle)return;world.pointer={x:event.clientX,y:event.clientY,at:world.time};};
  const keys=event=>{if(event.altKey&&event.shiftKey&&event.code==='KeyO'&&!event.repeat){event.preventDefault();openBook(book.hidden);}else if(event.key==='Escape'&&(tool||playMode||!book.hidden)){if(dragging){world.endDrag(dragging.id);dragging=null;}setTool(null);playMode=false;if(!book.hidden)openBook(false);paint();updateStatus();}};
  const visibility=()=>{last=0;if(suspended()){if(dragging){world.endDrag(dragging.id);dragging=null;}stopSound();}sync();paint();schedule();};
  const reduced=()=>{world.systemReduced=media.matches;if(world.gentle)world.cancelScene();sync();paint();schedule();};
  window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('keydown',keys);window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',visibility);document.addEventListener('fullscreenchange',visibility);media.addEventListener?.('change',reduced);
  if(typeof GM_addValueChangeListener==='function')GM_addValueChangeListener(KEY,(_k,_old,value,remote)=>{if(!remote)return;settings=OooCore.sanitize(value);world.apply(settings);sync();if(!book.hidden)renderPage(true);paint();schedule();});
  if(typeof GM_addValueChangeListener==='function')GM_addValueChangeListener(MEMORY,(_k,_old,value,remote)=>{if(remote){memories=validMemories(value);if(!book.hidden&&tab==='journal')renderPage(true);}});
  if(typeof GM_registerMenuCommand==='function'){
    GM_registerMenuCommand('Ooo Crew — open field guide',()=>openBook());
    GM_registerMenuCommand('Ooo Crew — show / hide',()=>command('quiet'));
    GM_registerMenuCommand('Ooo Crew — pause / resume',pause);
    GM_registerMenuCommand('Ooo Crew — snooze / wake this site',()=>command('snooze'));
  }
  window.addEventListener('pagehide',event=>{stopSound();last=0;if(raf)cancelAnimationFrame(raf);raf=0;if(!event.persisted)disposed=true;});
  window.addEventListener('pageshow',()=>{if(!disposed){last=0;sync();schedule();}});
  async function decode(base64){const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const blob=new Blob([bytes],{type:'image/png'});if(typeof createImageBitmap==='function')return createImageBitmap(blob);return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(blob);image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Sprite decode failed'));};image.src=url;});}
  try{
    const [atlas,jake]=await Promise.all([decode(__ATLAS__),decode(__JAKE__)]);assets={atlas,jake,frames:__FRAMES__};resize();sync();renderPage();schedule();
    if(PREVIEW||!read('ooo-crew.welcomed.v1',false)){openBook();write('ooo-crew.welcomed.v1',true);}
  }catch(error){assetFailure=true;sync();toast('Ooo Crew could not decode its bundled sprites. Reinstall the complete userscript and reload.');console.error('[Ooo Crew] Sprite loading failed',error);}
})();
