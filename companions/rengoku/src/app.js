// A single patrol follows the focused tab. Its launcher remains available when paused.
(function bootPatrol() {
  if (window.top !== window.self || document.getElementById('rengoku-patrol')) return;
  const bundles = /*PATROL_ART*/null;
  const sheetCSS = /*PATROL_CSS*/"";
  const prefsKey = 'rengoku:field-manual:v2';
  const ownerKey = 'rengoku:patrol-owner:v2';
  const tabId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const local = new Map();
  function read(key, fallback) {
    try {
      if (!PATROL_PREVIEW && typeof GM_getValue === 'function') return GM_getValue(key, fallback);
      if (PATROL_PREVIEW && key === prefsKey) {
        const stored = localStorage.getItem('preview/' + key);
        if (stored) return JSON.parse(stored);
      }
    } catch { /* Storage may be disabled on an offline preview. */ }
    return local.has(key) ? local.get(key) : fallback;
  }
  function write(key, value) {
    local.set(key, value);
    try {
      if (!PATROL_PREVIEW && typeof GM_setValue === 'function') GM_setValue(key, value);
      else if (PATROL_PREVIEW && key === prefsKey) localStorage.setItem('preview/' + key, JSON.stringify(value));
    } catch { /* This tab can continue without persistence. */ }
  }
  const getSettings = () => PatrolEngine.normalize(read(prefsKey, {enabled:!read('rengoku:hidden:v1', false)}));
  const host = document.createElement('div');
  host.id = 'rengoku-patrol';
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;';
  const root = host.attachShadow({mode:'closed'});
  const style = document.createElement('style');
  style.textContent = sheetCSS + '\n.rp-strip{position:absolute;left:0;bottom:0;pointer-events:none}.rp-hit{position:absolute;pointer-events:auto;border:0;background:transparent;padding:0;cursor:pointer}.rp-hit:focus-visible{outline:2px dashed #ffbf62;outline-offset:2px}.rp-hit[hidden],.rp-strip[hidden]{display:none!important}@media print{ :host {display:none!important} }';
  const canvas = document.createElement('canvas');
  canvas.className = 'rp-strip';
  canvas.setAttribute('aria-hidden','true');
  const hit = document.createElement('button');
  hit.className = 'rp-hit';
  hit.type = 'button';
  hit.hidden = true;
  hit.setAttribute('aria-label','Rengoku: perform an action');
  hit.title = 'Rengoku · Click for a move, right-click for a demon';
  root.append(style,canvas,hit);
  document.documentElement.append(host);

  const ctx = canvas.getContext('2d');
  const world = new PatrolEngine.World(getSettings());
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  world.setReduced(media.matches);
  const actors = Object.create(null);
  let width = 0, height = 0, stripHeight = 0, ratio = 1, ready = false, away = false;
  let owned = false, raf = 0, lastFrame = null, checkpointTime = 0;
  const foreground = () => !away && !document.hidden && !document.fullscreenElement && document.hasFocus();
  const running = () => ready && foreground() && owned && world.settings.enabled;
  const panel = PatrolPanel.mount(root, {
    settings:world.settings,
    demonNames:Object.fromEntries(Object.entries(PatrolEngine.species).map(([id,value])=>[id,value.name])),
    moves:PatrolEngine.moves,
    onChange(patch) { apply({...getSettings(), ...patch}, true); },
    onSummon:summon, onMove:perform
  });

  function apply(settings, persist) {
    if (!settings.enabled) leave();
    world.apply(settings);
    if (persist) write(prefsKey, world.settings);
    panel.sync(world.settings);
    resize();
    if (world.settings.enabled) claim();
  }
  function checkpoint() {
    if (owned && read(ownerKey, null)?.id === tabId) write(ownerKey, {id:tabId, state:world.snapshot()});
  }
  function leave() {
    checkpoint();
    owned = false;
    stop();
  }
  function claim() {
    if (!foreground() || !ready || !world.settings.enabled) return;
    const prior = read(ownerKey, null) || read('rengoku:owner:v1', null);
    if (prior?.id !== tabId) {
      if (prior?.state) world.restore(prior.state);
      write(ownerKey, {id:tabId, state:world.snapshot()});
    }
    owned = true;
    panel.setEncounter(Boolean(world.battle));
    start();
  }
  function resize() {
    width = Math.max(1,document.documentElement.clientWidth || window.innerWidth);
    height = Math.max(1,document.documentElement.clientHeight || window.innerHeight);
    world.resize(width,height);
    // Include the tallest leap, its flame trail and the user's bottom offset.
    stripHeight = Math.min(height,Math.ceil(height-world.ground + 272*world.scale + 32));
    ratio = Math.min(window.devicePixelRatio || 1, 2, 8192/width);
    const w = Math.max(1,Math.round(width*ratio)), h = Math.max(1,Math.round(stripHeight*ratio));
    if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; }
    canvas.style.width = width+'px'; canvas.style.height = stripHeight+'px';
    paint();
  }
  function paint() {
    const show = running();
    canvas.hidden = !show;
    hit.hidden = !show || !world.settings.interact;
    if (!ctx || !show) return;
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.setTransform(ratio,0,0,ratio,0,-(height-stripHeight)*ratio);
    ctx.imageSmoothingEnabled=false;
    PatrolDraw.draw(ctx,world,actors);
    if (!hit.hidden) {
      const geom = PatrolDraw.geometry(world.hero,actors.rengoku,world.scale,world.gentle);
      const [l,t,r,b] = geom.rect;
      const left=Math.max(0,l), top=Math.max(0,t);
      hit.style.left=Math.floor(left)+'px'; hit.style.top=Math.floor(top)+'px';
      hit.style.width=Math.max(1,Math.ceil(Math.min(width,r)-left))+'px';
      hit.style.height=Math.max(1,Math.ceil(Math.min(height,b)-top))+'px';
    }
  }
  function processEvents() {
    for(const event of world.takeEvents()) {
      if(event.type==='spawn') panel.status((PatrolEngine.species[event.kind]?.name || 'A demon')+' appeared.');
      if(event.type==='defeat') panel.status('Demon defeated. The patrol continues.');
    }
    panel.setEncounter(Boolean(world.battle));
  }
  function tick(now) {
    raf=0;
    if (!running()) { stop(); return; }
    if (lastFrame===null || now-lastFrame>=1000/40-1) {
      const dt=lastFrame===null?0:Math.min(.08,(now-lastFrame)/1000);
      lastFrame=now; world.step(dt); processEvents(); paint();
      if(now-checkpointTime>5000) { checkpoint(); checkpointTime=now; }
    }
    raf=requestAnimationFrame(tick);
  }
  function start() { if (!raf && running()) { lastFrame=null; paint(); raf=requestAnimationFrame(tick); } }
  function stop() { if(raf)cancelAnimationFrame(raf); raf=0; lastFrame=null; paint(); }
  function summon(id='random') {
    if (!running()) { panel.status(ready?'Enable the patrol to start an encounter.':'The patrol is loading.'); return false; }
    const ok=world.summon(id); processEvents();
    if (!ok) panel.status('Finish the current encounter first.');
    return ok;
  }
  function perform(move) {
    if (!running()) { panel.status(ready?'Enable the patrol to rehearse a move.':'The patrol is loading.'); return false; }
    const ok=world.perform(move); processEvents(); return ok;
  }
  hit.addEventListener('click',()=>perform());
  hit.addEventListener('contextmenu',e=>{e.preventDefault();summon();});
  document.addEventListener('pointermove',e=>{
    if(running() && world.settings.interact && e.pointerType!=='touch' && !e.composedPath().includes(host))world.swipe(e.clientX,e.clientY);
  },{passive:true});
  window.addEventListener('focus',claim);
  window.addEventListener('blur',leave);
  window.addEventListener('resize',resize);
  window.visualViewport?.addEventListener('resize',resize);
  function visibility() { if(foreground())claim();else leave(); }
  document.addEventListener('visibilitychange',visibility);
  document.addEventListener('fullscreenchange',visibility);
  window.addEventListener('pagehide',()=>{away=true;leave();});
  window.addEventListener('pageshow',()=>{away=false;claim();});
  media.addEventListener('change',e=>{world.setReduced(e.matches);paint();});
  if (!PATROL_PREVIEW && typeof GM_addValueChangeListener==='function') {
    GM_addValueChangeListener(prefsKey,(_k,_o,value,remote)=>{if(remote)apply(PatrolEngine.normalize(value),false);});
    GM_addValueChangeListener(ownerKey,(_k,_o,value,remote)=>{
      if(remote && owned && value?.id!==tabId) {owned=false;stop();}
    });
  }
  if (!PATROL_PREVIEW && typeof GM_registerMenuCommand==='function') {
    GM_registerMenuCommand('Rengoku: field manual',()=>panel.open());
    GM_registerMenuCommand('Rengoku: show / hide',()=>apply({...getSettings(),enabled:!world.settings.enabled}, true));
    GM_registerMenuCommand('Rengoku: summon demon',()=>summon());
    GM_registerMenuCommand('Rengoku: extra action',()=>perform());
  }
  async function decode(data) {
    const bytes=Uint8Array.from(atob(data), c=>c.charCodeAt(0));
    if(typeof createImageBitmap==='function') {
      try{return await createImageBitmap(new Blob([bytes],{type:'image/png'}));}catch{/* Try an image element. */}
    }
    return new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Image decode failed'));
      img.src='data:image/png;base64,'+data;
    });
  }
  resize();
  Promise.all(Object.entries(bundles).map(async ([id,entry])=>{
    actors[id]={meta:entry.meta,image:await decode(entry.data)};
  })).then(()=>{
    ready=Boolean(ctx);
    if(!ready){panel.status('This browser could not start the patrol canvas.');return;}
    claim();
  }).catch(()=>panel.status('The patrol sprites could not load. Reload this page to try again.'));
})();
