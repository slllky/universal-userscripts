// The overlay only owns its controls, the skater's hit area and its own canvas.
(function bootBeat() {
  if (window.top !== window.self || document.getElementById('beat-browser-skater')) return;
  const bundles = /*BEAT_ART*/null;
  const sheetCSS = /*BEAT_CSS*/"";
  const prefix = 'beat-skater-v1:';
  const shared = !BEAT_PREVIEW && typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
  const fallback = new Map();
  const persistentKeys = new Set(['settings','best-v2','volume-v2','track-v3','order-v3','tour-v4','arrangement-v4']);
  function read(key, initial) {
    try {
      if (shared) return GM_getValue(prefix + key, initial);
      if (BEAT_PREVIEW && persistentKeys.has(key)) {
        const value = window.localStorage.getItem('preview/' + prefix + key);
        if (value !== null) return JSON.parse(value);
      }
    } catch { /* Sandboxed pages and offline previews can run in memory. */ }
    return fallback.has(key) ? fallback.get(key) : initial;
  }
  function write(key, value) {
    fallback.set(key, value);
    try {
      if (shared) GM_setValue(prefix + key, value);
      else if (BEAT_PREVIEW && persistentKeys.has(key)) window.localStorage.setItem('preview/' + prefix + key, JSON.stringify(value));
    } catch { /* Keep the session running when persistence is unavailable. */ }
  }
  function watch(key, fn) {
    if (!shared || typeof GM_addValueChangeListener !== 'function') return () => {};
    const id = GM_addValueChangeListener(prefix + key, (_key, _old, value, remote) => { if (remote) fn(value); });
    return () => { if (typeof GM_removeValueChangeListener === 'function') GM_removeValueChangeListener(id); };
  }
  const pageStore = shared && typeof GM_listValues === 'function' && typeof GM_deleteValue === 'function' ? {
    get:read, set:write, watch,
    remove(key) { fallback.delete(key); GM_deleteValue(prefix + key); },
    keys() { return GM_listValues().filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length)); }
  } : null;

  const host = document.createElement('div');
  host.id = 'beat-browser-skater';
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;';
  const root = host.attachShadow({mode:'closed'});
  const style = document.createElement('style');
  style.textContent = sheetCSS + '\n.beat-stage,.beat-hit{position:absolute;top:0;left:0;margin:0}.beat-stage{pointer-events:none}.beat-hit{pointer-events:auto;cursor:pointer;background:transparent;color:inherit;border:none;border-radius:12px;padding:0;touch-action:manipulation}.beat-hit:focus-visible{outline:2px dashed #bbff31;outline-offset:2px}.beat-stage[hidden],.beat-hit[hidden]{display:none!important}@media print{:host{display:none!important}}';
  const canvas = document.createElement('canvas');
  canvas.className = 'beat-stage'; canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label','Manual skater: arrow keys to move, Space to jump, G to grind, T to tag'); canvas.hidden = true; canvas.setAttribute('aria-hidden','true');
  const hit = document.createElement('button');
  hit.className = 'beat-hit'; hit.type = 'button'; hit.hidden = true;
  hit.title = 'Beat · Click to dance, right-click for the radio';
  hit.setAttribute('aria-label','Beat. Dance, or open the radio with Shift F10.');
  root.append(style, canvas, hit);
  document.documentElement.append(host);

  const world = new BeatEngine.World(BeatEngine.normalize(read('settings', {})));
  world.setBest(read('best-v2', 0));
  const heldKeys=new Set();
  let geometryAt=0, rivalMatch=null;
  let tourState=BeatTour.normalize(read('tour-v4',null));
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  world.setReduced(media.matches);
  const ctx = canvas.getContext('2d');
  let view = null, pages = null, owned = false, suspended = false, disposed = false;
  let summoningForMove = false;
  let raf = 0, frameTime = null, ratio = 1, width = 1, height = 1, statsStamp = '';
  const cleanup = [];
  let panel = null;
  let order = validOrder(read('order-v3','sequence'));
  const radio = BeatAudio.create(window,{onTrack(track) {
    if (!panel) return;
    panel.station(track,order);
    if (read('track-v3','curbside') !== track.id) write('track-v3',track.id);
  }});
  radio.setArrangement(read('arrangement-v4','original'));
  radio.select(read('track-v3','curbside')); radio.setOrder(order);
  function validOrder(value) { return ['loop','sequence','shuffle'].includes(value) ? value : 'sequence'; }
  function changeOrder(value, persist) {
    order = validOrder(value); radio.setOrder(order); panel.station(radio.current(),order);
    if (persist) write('order-v3',order);
  }
  const portraits = Object.fromEntries(Object.keys(BeatEngine.riders).map(id =>
    [id,'data:image/png;base64,' + bundles[id === 'beat' ? 'remix' : id].portrait]
  ));
  const clampVolume = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(1,value)) : .35;
  let volume = clampVolume(read('volume-v2',.35)), audioEpoch = 0;
  radio.setVolume(volume);
  panel = BeatPanel.mount(root, {
    settings:world.settings, moves:BeatEngine.moves, lines:BeatEngine.lines,
    tracks:BeatAudio.tracks, portraits, riders:BeatEngine.riders, signatures:BeatEngine.signatures,
    lineMoves:BeatEngine.lineMoves, duets:BeatEngine.duets,
    onArrangement:value=>{const chosen=radio.setArrangement(value);write('arrangement-v4',chosen);panel.arrangement(chosen);},
    onTrack:id => radio.select(id), onStationStep:direction => direction < 0 ? radio.previous() : radio.next(),
    onOrder:mode => changeOrder(mode,true),
    onChange:patch => apply({...read('settings', world.settings), ...patch,...(patch.mode==='park'?{tour:false,ambient:false}:{}),...('district' in patch?{tour:false}:{})}, true),
    onRadio:toggleRadio, onVolume:value => { applyVolume(value); write('volume-v2',volume); },
    onPad:direction=>{
      if(!['manual','park'].includes(world.settings.mode))apply({...world.settings,mode:'manual'},true);
      const v={up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]}[direction];
      if(!v||world.settings.hidden||world.trick)return;
      resetControls();world.steer(...v);world.manual(.1);world.steer(0,0);paint();
    },
    onSteer:()=>{apply({...world.settings,mode:world.settings.mode==='park'?'park':'manual'},true);panel.close();canvas.focus();},
    onRival:(crew=false)=>{
      if(rivalMatch?.active){rivalMatch=null;world.rival=null;world.rivalText='';panel.rival('Exhibition stopped.');return;}
      world.cancelTrick();world.bank();processEvents();
      const d=BeatTour.districts.find(d=>d.id===world.settings.district);
      const preferred=Object.keys(BeatEngine.riders).find(id=>BeatEngine.riders[id]===d?.rival);
      const rider=preferred&&preferred!==world.settings.rider?preferred:Object.keys(BeatEngine.riders).find(id=>id!==world.settings.rider);
      rivalMatch=new BeatRival.Match(BeatEngine,world,rider,crew);
      rivalMatch.district=world.settings.tour?world.settings.district:null;
      apply({...world.settings,mode:'manual',ambient:false},true);panel.close();canvas.focus();
    },
    onTourStart:()=>enterTour(BeatTour.first(tourState)), onTourNext:nextDistrict,
    onTourStop:()=>{apply({...world.settings,tour:false,district:'off'},true);tourPanel();},
    onMove:perform, onJump:() => pages ? pages.jump() : 'Loading Beat…'
  });
  let playing = false;
  function applyVolume(value) {
    volume = clampVolume(value); radio.setVolume(volume); panel.audio(playing,volume);
  }
  function quietRadio() {
    audioEpoch++; radio.stop(); playing = false; panel.audio(false,volume);
  }
  async function toggleRadio() {
    if (!view || world.settings.hidden || suspended || document.hidden || document.fullscreenElement) {
      panel.status('Show Beat on this page to play the tape.'); return;
    }
    if (!owned) pages.bring();
    if (!owned) return;
    const epoch = ++audioEpoch, wasPlaying = playing;
    try {
      const on = await radio.toggle();
      if (disposed || audioEpoch !== epoch) return;
      playing = on;
      panel.audio(on,volume);
      panel.status(on ? 'On air · ' + radio.current().title : wasPlaying ? 'Tape stopped' : 'Audio is unavailable on this page');
    } catch { if (audioEpoch === epoch) { quietRadio(); panel.status('Audio is unavailable on this page'); } }
  }
  applyVolume(volume);
  panel.station(radio.current(),order);panel.arrangement(radio.arrangement().queued);
  syncActorLabel();
  function tourPanel(){
    const id=world.settings.tour?world.settings.district:null;
    panel.tour(BeatTour.describe(tourState,id),!!id&&id!=='terminal'&&BeatTour.complete(tourState,id));
  }
  function enterTour(id){
    if(!BeatTour.unlocked(tourState,id))return;
    world.cancelTrick();world.bank();processEvents();
    apply({...world.settings,tour:true,district:id,mode:'manual',ambient:false},true);tourPanel();
  }
  function nextDistrict(){
    const i=BeatTour.districts.findIndex(d=>d.id===world.settings.district);
    if(world.settings.tour&&i>=0&&i<5&&BeatTour.complete(tourState,world.settings.district))enterTour(BeatTour.districts[i+1].id);
  }
  tourPanel();
  function syncActorLabel() {
    const label = BeatEngine.riders[world.settings.rider] || 'Beat';
    hit.title = label + ' · Click to dance, right-click for Beat FM';
    hit.setAttribute('aria-label',label + '. Dance, or open the radio with Shift F10.');
  }
  function apply(settings, persist) {
    const wasHidden = world.settings.hidden;
    if(rivalMatch && ((settings?.district && settings.district!==world.settings.district)||(settings?.rider && settings.rider!==world.settings.rider))){rivalMatch=null;world.rival=null;world.rivalText='';panel.rival('Exhibition ended after changing rider or district.');}
    if(settings?.mode!==world.settings.mode || settings?.hidden)resetControls();
    world.apply(BeatEngine.normalize(settings || {}));
    geometryAt=0;if(world.settings.mode!=='page')world.setPlatforms([]);
    if (persist) write('settings', {...world.settings});
    canvas.setAttribute('aria-hidden',['manual','park'].includes(world.settings.mode)?'false':'true');
    panel.sync(world.settings); syncActorLabel(); scorePanel();tourPanel();
    if (view && wasHidden !== world.settings.hidden) {
      if (world.settings.hidden) pages.stop();
      else pages.start();
    }
    resize();
    updateLoop();
  }
  function hasStage() { return Boolean(view && owned && !suspended && !disposed && !world.settings.hidden && !document.hidden && !document.fullscreenElement); }
  function paint() {
    canvas.hidden = !hasStage();
    if (canvas.hidden) {
      hit.hidden = true;
      if (view) view.clear();
      return;
    }
    view.draw(world);
    const box = view.hitBox;
    hit.hidden = !world.settings.interact || !box;
    if (!hit.hidden) {
      hit.style.transform = 'translate3d(' + Math.round(box.x) + 'px,' + Math.round(box.y) + 'px,0)';
      hit.style.width = Math.ceil(box.width) + 'px';
      hit.style.height = Math.ceil(box.height) + 'px';
    }
  }
  function resize() {
    width = Math.max(1, document.documentElement.clientWidth || window.innerWidth);
    height = Math.max(1, document.documentElement.clientHeight || window.innerHeight);
    world.resize(width,height);
    // Bound the backing store on giant monitors. The input and world remain in CSS pixels.
    ratio = Math.min(window.devicePixelRatio || 1, 1.5, 8192 / Math.max(width,height), Math.sqrt(6000000 / (width * height)));
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      if (view) view.clear();
      canvas.width = w; canvas.height = h;
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      if (ctx) { ctx.setTransform(w/width,0,0,h/height,0,0); ctx.imageSmoothingEnabled = false; }
    }
    paint();
  }
  function scorePanel() {
    const line = world.line ? BeatEngine.lines[world.line.id] : '';
    const score = world.combo.score, count = world.combo.count, best = world.best;
    const source = world.line?.source || '', step = world.line ? world.line.index + 1 : 0;
    const total = world.line?.total || 0, partner = BeatEngine.riders[world.partner?.rider] || '';
    const rider = BeatEngine.riders[world.settings.rider];
    const stamp = [score,count,best,line,step,source,partner,rider].join('/');
    if (stamp === statsStamp) return;
    statsStamp = stamp;
    panel.stats({score,count,best,line,step,total,source,partner,rider});
  }
  function processEvents() {
    for (const event of world.takeEvents()) {
      rivalMatch?.event(event);
      if(world.settings.tour && ['tag','pickup','bank','trick','line'].includes(event.type)){
        tourState=BeatTour.merge(tourState,read('tour-v4',null));
        tourState=BeatTour.record(tourState,world.settings.district,event);
        write('tour-v4',tourState);tourPanel();
      }
      if (playing) radio.accent(event);
      if (event.type === 'best') {
        const best = Math.max(event.score, Number(read('best-v2',0)) || 0);
        world.setBest(best); write('best-v2',best);
        panel.status('Personal best · ' + best.toLocaleString() + ' points');
      }
    }
    scorePanel();
  }
  function tick(now) {
    raf = 0;
    if (!hasStage()) { updateLoop(); return; }
    if (frameTime === null || now-frameTime >= 1000/40-1) {
      const dt = frameTime === null ? 0 : Math.min(.08, (now-frameTime)/1000);
      frameTime = now;
      if(world.settings.mode==='page'&&now>=geometryAt){
        world.setPlatforms(BeatGeometry.scan(document,host,width,height,world.scale));geometryAt=now+1000;
      }
      world.step(dt); processEvents();
      if(rivalMatch){rivalMatch.step(dt,world);world.rival=rivalMatch.actor;world.rivalText=rivalMatch.text;panel.rival(rivalMatch.text);
        if(!rivalMatch.active&&!rivalMatch.recorded){
          rivalMatch.recorded=true;
          if(rivalMatch.district&&world.settings.tour&&world.settings.district===rivalMatch.district){tourState=BeatTour.merge(tourState,read('tour-v4',null));tourState=BeatTour.record(tourState,rivalMatch.district,rivalMatch.result());write('tour-v4',tourState);tourPanel();}
        }
      }
      paint();
    }
    raf = requestAnimationFrame(tick);
  }
  function updateLoop() {
    if (!hasStage()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; frameTime = null; paint(); return;
    }
    if (!raf) { frameTime = null; paint(); raf = requestAnimationFrame(tick); }
  }
  function perform(id) {
    if (!view || world.settings.hidden || document.hidden || document.fullscreenElement) return false;
    if (!owned) {
      summoningForMove = true;
      try { pages.bring(); } finally { summoningForMove = false; }
    }
    if (!owned) return false;
    const ok = world.perform(id);
    processEvents(); paint();
    return ok;
  }
  function bringAndOpen() {
    if (world.settings.hidden) apply({...read('settings',world.settings),hidden:false},true);
    if (view && !owned) pages.bring();
    panel.open();
  }
  pages = BeatPages.connect({
    store:pageStore, window, document,
    snapshot:() => world.snapshot(),
    onDepart:() => { world.depart(); paint(); },
    onOwner(active, state) {
      owned = active;
      if (active) {
        if (state) world.restore(state);
        world.setBest(Math.max(world.best, Number(read('best-v2',0)) || 0));
        if (!summoningForMove) world.arrive();
      } else { world.clearTrail(); quietRadio(); }
      scorePanel(); updateLoop();
    }
  });
  function listen(target, name, handler, options) {
    if (!target) return;
    target.addEventListener(name,handler,options);
    cleanup.push(() => target.removeEventListener(name,handler,options));
  }
  listen(hit,'click',() => perform('dance'));
  listen(hit,'contextmenu',event => { event.preventDefault(); event.stopPropagation(); bringAndOpen(); });
  listen(hit,'keydown',event => {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault(); bringAndOpen();
    }
  });
  listen(document,'pointermove',event => {
    if (hasStage() && world.settings.mode === 'follow' && event.pointerType !== 'touch' && !event.composedPath().includes(host)) {
      world.point(event.clientX,event.clientY);
    }
  }, {passive:true});
  function resetControls(){heldKeys.clear();world.steer(0,0);}
  function steering(){world.steer(Number(heldKeys.has('ArrowRight'))-Number(heldKeys.has('ArrowLeft')),Number(heldKeys.has('ArrowDown'))-Number(heldKeys.has('ArrowUp')));}
  function manualKey(event){
    if(!hasStage()||!['manual','park'].includes(world.settings.mode)||event.altKey||event.ctrlKey||event.metaKey)return;
    const target=event.composedPath?.()[0]||event.target;
    if(target?.isContentEditable || target?.closest?.('input,textarea,select,button,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||(event.composedPath?.().includes(host)&&target!==canvas))return;
    const move={Space:'jump',KeyG:'grind',KeyT:'tag'}[event.code];
    if(event.key?.startsWith('Arrow')){event.preventDefault();heldKeys.add(event.key);steering();}
    else if(move){event.preventDefault();if(!event.repeat)perform(move);}
  }
  // Closed shadow roots retarget document events to the host, so listen inside too.
  listen(root,'keydown',manualKey);
  listen(document,'focusin',event=>{const target=event.composedPath?.()[0]||event.target;if(target?.isContentEditable||target?.closest?.('input,textarea,select,button,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))resetControls();});
  listen(document,'keydown',manualKey);
  listen(document,'keyup',event=>{if(heldKeys.delete(event.key))steering();});
  listen(window,'blur',()=>{resetControls();quietRadio();});
  listen(window,'resize',resize);
  listen(window.visualViewport,'resize',resize);
  listen(media,'change',event => { world.setReduced(event.matches); paint(); });
  function visibility() {
    if (document.hidden || document.fullscreenElement) { resetControls();world.clearTrail(); quietRadio(); }
    updateLoop();
  }
  listen(document,'visibilitychange',visibility);
  listen(document,'fullscreenchange',visibility);
  listen(window,'pageshow',() => {
    suspended = false;
    if (view && !world.settings.hidden) pages.start();
    resize(); updateLoop();
  });
  listen(window,'pagehide',event => {
    suspended = true; quietRadio(); updateLoop();
    if (!event.persisted) {
      disposed = true; pages.destroy();
      for (const off of cleanup.splice(0)) off();
      panel.destroy(); host.remove();
    }
  });
  cleanup.push(watch('arrangement-v4',value=>panel.arrangement(radio.setArrangement(value))),watch('tour-v4',value=>{tourState=BeatTour.merge(tourState,value);tourPanel();}),watch('settings',value => apply(value,false)), watch('volume-v2',applyVolume),
    watch('track-v3',value => radio.select(value)), watch('order-v3',value => changeOrder(value,false)),
    watch('best-v2',value => { world.setBest(Math.max(world.best, Number(value) || 0)); scorePanel(); }));
  if (!BEAT_PREVIEW && typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Beat: controls / bring here',bringAndOpen);
    GM_registerMenuCommand('Beat: show / hide',() => apply({...read('settings',world.settings),hidden:!world.settings.hidden},true));
  }
  async function decode(data) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
        return await createImageBitmap(new Blob([bytes],{type:'image/png'}));
      } catch { /* Some browsers only support decoding PNG through an image element. */ }
    }
    return new Promise((resolve,reject) => {
      const image = new Image();
      image.onload = () => resolve(image); image.onerror = () => reject(Error('Embedded image decode failed'));
      image.src = 'data:image/png;base64,' + data;
    });
  }
  scorePanel(); resize();
  Promise.all(Object.entries(bundles).map(async ([id,entry]) =>
    [id,{frames:entry.frames,image:await decode(entry.data)}]
  )).then(entries => {
    if (disposed) return;
    if (!ctx) throw Error('Canvas unavailable');
    view = new BeatDraw.Renderer(ctx,Object.fromEntries(entries));
    if (!world.settings.hidden && !suspended) pages.start();
    updateLoop();
  }).catch(() => panel.status('Beat’s sprites could not load. Reload this page to try again.'));
})();
