// Beat's floating radio deck lives inside the companion's shadow root.
const BeatPanel = (() => {
  'use strict';

  const tape = '<span class="bt-tape" aria-hidden="true"><i></i><b></b><i></i></span>';
  const chapters = {session:'Crew', tricks:'Tricks', station:'Radio', setup:'Setup'};
  const rangeFields = {
    speed:['Skate speed',0.5,2,0.1,'×'], scale:['Sprite size',1,3,0.1,'×'],
    delay:['Trail delay',1,8,1,' s'], offset:['Ground clearance',0,80,1,' px']
  };
  const toggleFields = {hidden:'Show skater', ambient:'Auto combos in Free skate', interact:'Clickable skater'};
  const pickFields = {
    district:['Park backdrop',{off:'Website (transparent)',spool:'Spool',crane:'Crane',canal:'Canal',foundry:'Foundry',signal:'Signal',terminal:'Terminal'}],
    mode:['Skating mode',{idle:'Free skate',follow:'Cursor trail',manual:'Manual arrows',page:'Page exploration',park:'Practice skatepark'}],
    skin:['Beat’s sprite set',{remix:'Remix',classic:'Classic'}],
    accent:['Paint color',{lime:'Lime',pink:'Pink',cyan:'Cyan'}],
    fx:['Visual effects',{off:'Off',low:'Low',full:'Full'}],
    motion:['Motion',{system:'Use device setting',reduced:'Reduced',full:'Full motion'}]
  };

  function mount(root, {
    settings,moves,lines,riders={beat:'Beat'},signatures={},duets=[],lineMoves={},tracks=[],portraits:initialPortraits={},
    onChange,onMove,onJump,onRadio,onVolume,onTrack,onStationStep,onOrder,onTourStart,onTourNext,onTourStop,onSteer,onRival,onArrangement,onPad
  }) {
    const doc = root.ownerDocument;
    const ui = doc.createElement('div');
    ui.className = 'bt-radio';
    const get = selector => ui.querySelector(selector);
    const buttons = Object.entries(chapters).map(([id,name],index) =>
      `<button id="bt-tab-${id}" type="button" role="tab" aria-selected="${index === 0}" aria-controls="bt-page-${id}" tabindex="${index === 0 ? 0 : -1}">${name}</button>`
    ).join('');
    ui.innerHTML = `
      <button type="button" class="bt-dial" title="Beat FM controls" aria-label="Open Beat FM controls" aria-haspopup="dialog" aria-controls="bt-deck" aria-expanded="false">
        <span class="bt-mini-label" aria-hidden="true">BEAT</span>${tape}
      </button>
      <section class="bt-deck" id="bt-deck" role="dialog" aria-labelledby="bt-title" hidden>
        <header class="bt-head">
          <div class="bt-heading"><h2 id="bt-title">Beat <em>FM</em></h2>
            <span aria-hidden="true" class="bt-vents"></span></div>
          <button type="button" class="bt-close" aria-label="Close Beat FM controls" title="Close">×</button>
          <div class="bt-counter">
            <span aria-hidden="true" class="bt-spool"></span>
            <dl><div><dt>Combo</dt><dd data-counter="score">0</dd></div><div><dt>Best</dt><dd data-counter="best">0</dd></div></dl>
            <span aria-hidden="true" class="bt-spool"></span>
          </div>
        </header>
        <div class="bt-tabs" role="tablist" aria-label="Beat FM controls">${buttons}</div>
        <div class="bt-pages">
          <section id="bt-page-session" role="tabpanel" aria-labelledby="bt-tab-session">
            <fieldset class="bt-group bt-crew"><legend>Featured skater</legend><div class="bt-roster"></div></fieldset>
            <button type="button" class="bt-featured" hidden><span>Run signature</span><strong></strong><i aria-hidden="true">▷</i></button>
            <div class="bt-select bt-partner"><label for="bt-control-partner">Duet partner</label><select id="bt-control-partner"></select></div>
            <div class="bt-switches"><div data-field="ambient"></div></div>
            <div data-field="mode"></div><p class="bt-manual-help">Practice skatepark: arrows to navigate, follow four numbered markers for a lap; G near the rail to grind. Manual: choose Steer now, then arrow keys to skate, Space to jump, G to grind, T to tag. Keys do not override text fields or menu controls.</p><button type="button" class="bt-steer">Steer now</button><div class="bt-step-pad" role="group" aria-label="Tap steering"><p>Tap to step (manual or practice yard)</p><button type="button" data-pad="up" aria-label="Step up">↑</button><button type="button" data-pad="left" aria-label="Step left">←</button><button type="button" data-pad="down" aria-label="Step down">↓</button><button type="button" data-pad="right" aria-label="Step right">→</button></div><div data-field="district"></div><p class="bt-page-backdrop" hidden>Page exploration / practice park temporarily hides your park backdrop. Your chosen park returns when you leave this mode.</p><button type="button" class="bt-rival">Start / stop live rival (45s)</button><button type="button" class="bt-rival-crew">Challenge rival crew relay</button><p class="bt-rival-status">Local exhibition: score earned from live tricks, separate from tour unlocks.</p><section class="bt-tour"><h3>District tour</h3><p class="bt-tour-progress"></p><button type="button" class="bt-tour-start">Start / resume tour</button><button type="button" class="bt-tour-next" disabled>Next district</button><button type="button" class="bt-tour-stop">Leave tour</button></section>
            <p>Page exploration hops between visible content edges. It only samples nearby layout, never page text or inputs. Empty pages use the floor.</p><p class="bt-trail-help" hidden>Move your cursor to leave paint cans for your skater.</p>
            <div data-field="delay" hidden></div>
            <button type="button" class="bt-hop">Jump to another tab <span aria-hidden="true">↗</span></button>
          </section>
          <section id="bt-page-tricks" role="tabpanel" aria-labelledby="bt-tab-tricks" hidden>
            <h3>Combo lines</h3><div class="bt-lines" data-bank="lines"></div>
            <h3>Individual tricks</h3><div class="bt-pads" data-bank="moves"></div>
          </section>
          <section id="bt-page-station" role="tabpanel" aria-labelledby="bt-tab-station" hidden>
            <div class="bt-track-face">
              <div class="bt-track-details"><p class="bt-track-title"></p><p class="bt-track-meta"></p></div>
              <div class="bt-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            </div>
            <div class="bt-playbar">
              <button type="button" class="bt-skip" data-step="-1" aria-label="Previous track" title="Previous track">◂◂</button>
              <button type="button" class="bt-transport" aria-label="Play radio"><i aria-hidden="true"></i><span>Play radio</span></button>
              <button type="button" class="bt-skip" data-step="1" aria-label="Next track" title="Next track">▸▸</button>
            </div>
            <div class="bt-select bt-library"><label for="bt-track">Track library</label><select id="bt-track"></select></div>
            <div class="bt-select"><label for="bt-order">Playback order</label><select id="bt-order">
              <option value="sequence">Play in order</option><option value="shuffle">Shuffle tracks</option><option value="loop">Repeat track</option>
            </select></div>
            <div class="bt-select"><label for="bt-arrangement">DJ arrangement</label><select id="bt-arrangement"><option value="original">Original mix</option><option value="breaks">Drum break</option><option value="dub">Dub breakdown</option><option value="peak">Peak-time hooks</option></select></div><p>15 original synthesized tracks, not official JSRF recordings. DJ changes enter on the next bar; existing notes fade naturally.</p><div class="bt-fader bt-volume"><label for="bt-volume">Volume</label><span class="bt-volume-value" aria-hidden="true">35%</span>
              <input id="bt-volume" type="range" min="0" max="100" step="1" value="35" aria-valuetext="35 percent">
            </div>
          </section>
          <section id="bt-page-setup" role="tabpanel" aria-labelledby="bt-tab-setup" hidden>
            <div class="bt-switches"><div data-field="hidden"></div><div data-field="interact"></div></div>
            <div data-field="skin"></div><div data-field="accent"></div>
            <div class="bt-faders"><div data-field="speed"></div><div data-field="scale"></div><div data-field="offset"></div></div>
            <div data-field="fx"></div><div data-field="motion"></div>
          </section>
        </div>
        <div class="bt-live" hidden><div><b class="bt-sequence"></b><span class="bt-cast"></span></div><span class="bt-step" hidden></span></div>
        <div class="bt-footer"><i aria-hidden="true"></i><span role="status" aria-live="polite" aria-atomic="true">Free skating</span></div>
      </section>`;
    root.append(ui);
    const panel = get('.bt-deck');
    const dial = get('.bt-dial');
    const pages = get('.bt-pages');
    const tabs = Array.from(ui.querySelectorAll('[role="tab"]'));
    const bindings = new Map();
    const actionButtons = [];
    const counter = {score:get('[data-counter="score"]'),best:get('[data-counter="best"]')};
    const statusText = get('[role="status"]');
    let state = {};
    let activeTab = tabs[0];

    function append(parent,tag,text) {
      const node = doc.createElement(tag);
      if (text !== undefined) node.textContent = text;
      parent.append(node);
      return node;
    }
    function status(text) {
      if (typeof text === 'string' && text !== statusText.textContent) statusText.textContent = text;
    }
    function sessionStatus() {
      return state.hidden ? (riders[state.rider] || 'Beat') + ' is hidden' : state.mode === 'follow' ? 'Following the cursor trail' : 'Free skating';
    }
    function edit(key,value) {
      if (state[key] === value) return;
      sync({[key]:value});
      onChange({[key]:value});
    }
    function selectValue(select,value) {
      // Only change the chosen option. Deselecting every other option in turn can reset native selects.
      const option = Array.from(select.options).find(item => item.value === value);
      if (option) option.selected = true;
    }
    function run(id,name) {
      if (!id || state.hidden) return;
      const result = onMove(id);
      status(typeof result === 'string' ? result : result === false ? 'Move unavailable. Try again in a moment.' : name);
    }
    const mugshots = new Map();
    for(const b of ui.querySelectorAll('[data-pad]'))b.addEventListener('click',()=>onPad?.(b.dataset.pad));
    get('.bt-steer').addEventListener('click',()=>onSteer?.());
    get('.bt-rival').addEventListener('click',()=>onRival?.(false));
    get('.bt-rival-crew').addEventListener('click',()=>onRival?.(true));
    function rival(text){get('.bt-rival-status').textContent=text;}
    get('.bt-tour-start').addEventListener('click',()=>onTourStart?.());
    get('.bt-tour-next').addEventListener('click',()=>onTourNext?.());
    get('.bt-tour-stop').addEventListener('click',()=>onTourStop?.());
    function tour(text,canNext=false){get('.bt-tour-progress').textContent=text;get('.bt-tour-next').disabled=!canNext;}
    const riderInputs = new Map();
    const roster = get('.bt-roster');
    const partner = get('#bt-control-partner');
    for (const [id,name] of Object.entries({auto:'Crew rotation',off:'Skate solo',...riders})) {
      append(partner,'option',name).value = id;
    }
    for (const [id,name] of Object.entries(riders)) {
      const label = append(roster,'label');
      const radio = append(label,'input');
      radio.type = 'radio'; radio.name = 'beat-fm-rider'; radio.value = id;
      const card = append(label,'span');
      card.className = 'bt-card'; card.dataset.rider = id;
      const art = append(card,'img');
      art.alt = ''; art.hidden = true;
      // Some sites disallow data: images through CSP. A decoded local bitmap can still be drawn.
      art.addEventListener('error',async () => {
        const src = art.getAttribute('src');
        art.hidden = true;
        const win = doc.defaultView;
        if (!src?.startsWith('data:image/png;base64,') || !win?.createImageBitmap) return;
        try {
          const bytes = Uint8Array.from(win.atob(src.slice(src.indexOf(',') + 1)),char => char.charCodeAt(0));
          const bitmap = await win.createImageBitmap(new win.Blob([bytes],{type:'image/png'}));
          try {
            if (art.getAttribute('src') !== src || !card.isConnected) return;
            const canvas = card.querySelector('canvas') || doc.createElement('canvas');
            canvas.width = bitmap.width; canvas.height = bitmap.height;
            canvas.getContext('2d').drawImage(bitmap,0,0);
            canvas.setAttribute('aria-hidden','true');
            card.insertBefore(canvas,art);
          } finally { bitmap.close(); }
        } catch { /* The skater can still be selected by name. */ }
      });
      append(card,'b',name);
      mugshots.set(id,art); riderInputs.set(id,radio);
      radio.addEventListener('change',() => { if (radio.checked) edit('rider',id); });
    }
    function portraits(sources) {
      for (const [id,src] of Object.entries(sources)) {
        const image = mugshots.get(id);
        if (image && typeof src === 'string' && src.startsWith('data:image/') && src !== image.getAttribute('src')) {
          image.parentNode.querySelector('canvas')?.remove();
          image.src = src; image.hidden = false;
        }
      }
    }
    portraits(initialPortraits);
    const featured = get('.bt-featured');
    bindings.set('rider',id => {
      for (const [key,input] of riderInputs) input.checked = key === id;
      const line = signatures[id];
      featured.hidden = !lines[line];
      featured.querySelector('strong').textContent = lines[line] || '';
      featured.setAttribute('aria-label','Run ' + (riders[id] || 'skater') + ' signature: ' + (lines[line] || ''));
    });
    featured.addEventListener('click',() => run(signatures[state.rider],lines[signatures[state.rider]]));
    actionButtons.push(featured);
    partner.addEventListener('change',() => edit('partner',partner.value));
    for (const [key,[title,min,max,step,unit]] of Object.entries(rangeFields)) {
      const row = get(`[data-field="${key}"]`);
      row.className = 'bt-fader';
      const label = append(row,'label',title);
      const readout = append(row,'span');
      readout.className = 'bt-readout';
      readout.setAttribute('aria-hidden','true');
      const input = append(row,'input');
      input.id = 'bt-control-' + key;
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      label.setAttribute('for',input.id);
      function show(value) {
        input.value = String(value);
        const text = Number(value) + unit;
        readout.textContent = text;
        input.setAttribute('aria-valuetext',text);
      }
      bindings.set(key,show);
      input.addEventListener('input',() => show(input.value));
      input.addEventListener('change',() => edit(key,Number(input.value)));
    }
    for (const [key,title] of Object.entries(toggleFields)) {
      const row = get(`[data-field="${key}"]`);
      const label = append(row,'label');
      label.className = 'bt-switch';
      append(label,'span',title);
      const input = append(label,'input');
      input.type = 'checkbox';
      input.id = 'bt-control-' + key;
      append(label,'i').setAttribute('aria-hidden','true');
      bindings.set(key,value => { input.checked = key === 'hidden' ? !value : Boolean(value); });
      input.addEventListener('change',() => edit(key,key === 'hidden' ? !input.checked : input.checked));
    }
    for (const [key,[title,choices]] of Object.entries(pickFields)) {
      const row = get(`[data-field="${key}"]`);
      if (key === 'motion' || key === 'fx' || key === 'district') {
        row.className = 'bt-select';
        const label = append(row,'label',title);
        const select = append(row,'select');
        select.id = 'bt-control-' + key;
        label.setAttribute('for',select.id);
        for (const [value,name] of Object.entries(choices)) append(select,'option',name).value = value;
        bindings.set(key,value => selectValue(select,value));
        select.addEventListener('change',() => edit(key,select.value));
        continue;
      }
      const group = append(row,'fieldset');
      group.className = 'bt-group';
      append(group,'legend',title);
      const band = append(group,'div');
      band.className = 'bt-band';
      const radios = [];
      for (const [value,name] of Object.entries(choices)) {
        const label = append(band,'label');
        const radio = append(label,'input');
        radio.type = 'radio';
        radio.name = 'beat-fm-' + key;
        radio.value = value;
        radios.push(radio);
        const item = append(label,'span',name);
        if (key === 'accent') item.className = 'bt-swatch bt-' + value;
        radio.addEventListener('change',() => { if (radio.checked) edit(key,value); });
      }
      bindings.set(key,value => { for (const radio of radios) radio.checked = radio.value === value; });
    }
    function pad(parent,id,name) {
      const button = append(parent,'button');
      button.type = 'button';
      button.dataset.move = id;
      button.addEventListener('click',() => run(id,name));
      actionButtons.push(button);
      return button;
    }
    const moveBank = get('[data-bank="moves"]');
    for (const [id,name] of Object.entries(moves)) pad(moveBank,id,name).textContent = name;
    const lineBank = get('[data-bank="lines"]');
    const signatureOwners = Object.fromEntries(Object.entries(signatures).map(([rider,line]) => [line,riders[rider]]));
    const lineEntries = Object.entries(lines);
    const lineGroups = [
      ['Crew signatures',lineEntries.filter(([id]) => signatureOwners[id])],
      ['Crew routines',lineEntries.filter(([id]) => duets.includes(id))],
      ['Street lines',lineEntries.filter(([id]) => !signatureOwners[id] && !duets.includes(id))]
    ];
    for (const [title,entries] of lineGroups) {
      if (!entries.length) continue;
      const group = append(lineBank,'details');
      const summary = append(group,'summary',title);
      append(summary,'span',String(entries.length));
      for (const [id,name] of entries) {
        const button = pad(group,id,name);
        const label = append(button,'b',name);
        const info = [signatureOwners[id],id==='crewrelay'?'Three-person relay':duets.includes(id) ? 'Duet' : ''].filter(Boolean).join(' · ');
        if (info) append(label,'small',info);
        const route = (lineMoves[id] || []).map(move => moves[move] || move);
        if (route.length) append(button,'span',route.join(' → '));
        button.title = 'Run ' + name;
      }
    }
    const trackSelect = get('#bt-track');
    const orderSelect = get('#bt-order');
    function arrangement(value){selectValue(get('#bt-arrangement'),value);}
    get('#bt-arrangement').addEventListener('change',()=>onArrangement?.(get('#bt-arrangement').value));
    for (const track of tracks) append(trackSelect,'option',track.title).value = track.id;
    function station(record,order) {
      const track = typeof record === 'string' ? tracks.find(entry => entry.id === record) : record;
      if (track) {
        selectValue(trackSelect,track.id);
        get('.bt-track-title').textContent = track.title;
        get('.bt-track-meta').textContent = [track.genre,track.bpm + ' BPM'].join('  /  ');
      }
      if (order) selectValue(orderSelect,order);
    }
    trackSelect.addEventListener('change',() => onTrack?.(trackSelect.value));
    orderSelect.addEventListener('change',() => onOrder?.(orderSelect.value));
    for (const button of ui.querySelectorAll('[data-step]')) {
      button.addEventListener('click',() => onStationStep?.(Number(button.dataset.step)));
    }
    station(tracks[0],'sequence');
    const transport = get('.bt-transport');
    const volumeInput = get('#bt-volume');
    const volumeLabel = get('.bt-volume-value');
    function showVolume(value) {
      const percent = Math.round(Math.min(1,Math.max(0,value)) * 100);
      volumeInput.value = String(percent);
      volumeInput.setAttribute('aria-valuetext',percent + ' percent');
      volumeLabel.textContent = percent + '%';
    }
    function audio(on,volume) {
      const text = on ? 'Stop radio' : 'Play radio';
      ui.dataset.playing = String(Boolean(on));
      transport.dataset.playing = String(Boolean(on));
      transport.setAttribute('aria-label',text);
      transport.querySelector('span').textContent = text;
      if (Number.isFinite(volume)) showVolume(volume);
    }
    transport.addEventListener('click',() => onRadio?.());
    volumeInput.addEventListener('input',() => {
      const level = Number(volumeInput.value) / 100;
      showVolume(level);
      onVolume?.(level);
    });
    get('.bt-hop').addEventListener('click',() => {
      const result = onJump();
      if (typeof result === 'string') status(result);
      if (result === false) status('Open a second tab with Beat installed to jump');
    });

    function sync(patch) {
      const previous = state;
      state = {...state,...patch};
      for (const [key,show] of bindings) {
        if (key in patch) show(state[key]);
      }
      if ('rider' in patch || 'partner' in patch) {
        for (const option of partner.options) option.disabled = option.value === state.rider;
        selectValue(partner,state.partner === state.rider ? 'auto' : state.partner);
      }
      get('#bt-control-district').disabled=['page','park'].includes(state.mode);
      get('.bt-page-backdrop').hidden=state.mode!=='page';
      ui.dataset.accent = state.accent;
      ui.dataset.motion = state.motion;
      get('[data-field="delay"]').hidden = state.mode !== 'follow';
      get('.bt-trail-help').hidden = state.mode !== 'follow';
      for (const pad of actionButtons) pad.disabled = Boolean(state.hidden);
      if (previous.mode !== state.mode || previous.hidden !== state.hidden || (previous.rider !== state.rider && state.hidden)) status(sessionStatus());
    }
    function stats({score=0,best=0,count=0,line='',step=0,total=0,source='',partner='',rider=''} = {}) {
      const countText = count ? count + (count === 1 ? ' trick' : ' tricks') : '';
      const description = [line,countText].filter(Boolean).join(' · ');
      const cast = [riders[rider] || rider,riders[partner] || partner].filter(Boolean).join(' + ');
      const sourceText = source === 'ambient' ? 'Free skate' : source === 'manual' ? 'Manual' : '';
      const names = [sourceText,cast].filter(Boolean).join(' · ');
      const position = step && total && line ? step + ' / ' + total : '';
      const sequence = get('.bt-sequence'), people = get('.bt-cast'), progress = get('.bt-step');
      get('.bt-live').hidden = !description;
      if (sequence.textContent !== description) sequence.textContent = description;
      if (people.textContent !== names) people.textContent = names;
      people.hidden = !names;
      progress.hidden = !position;
      if (progress.textContent !== position) {
        progress.textContent = position;
        progress.setAttribute('aria-label','Step ' + step + ' of ' + total);
      }
      const values = {score:String(score),best:String(best)};
      for (const [key,value] of Object.entries(values)) {
        if (counter[key].textContent !== value) counter[key].textContent = value;
      }
    }
    function selectTab(tab, focus = true) {
      activeTab = tab;
      for (const button of tabs) {
        const selected = button === tab;
        button.setAttribute('aria-selected',String(selected));
        button.tabIndex = selected ? 0 : -1;
        get('#' + button.getAttribute('aria-controls')).hidden = !selected;
      }
      pages.scrollTop = 0;
      if (focus) tab.focus();
    }
    function open() {
      if (!panel.hidden) return;
      panel.hidden = false;
      dial.setAttribute('aria-expanded','true');
      dial.setAttribute('aria-label','Close Beat FM controls');
      activeTab.focus();
      doc.addEventListener('pointerdown',outside,true);
    }
    function close(restoreFocus = true) {
      if (panel.hidden) return;
      panel.hidden = true;
      dial.setAttribute('aria-expanded','false');
      dial.setAttribute('aria-label','Open Beat FM controls');
      doc.removeEventListener('pointerdown',outside,true);
      if (restoreFocus) dial.focus();
    }
    function outside(event) {
      const path = event.composedPath();
      if (!path.includes(ui) && !path.includes(root.host || root)) close(false);
    }
    function toggle() { if (panel.hidden) open(); else close(); }
    dial.addEventListener('click',toggle);
    get('.bt-close').addEventListener('click',() => close());
    tabs.forEach(tab => tab.addEventListener('click',() => selectTab(tab)));
    ui.addEventListener('keydown',event => {
      if (panel.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      const index = tabs.indexOf(event.target);
      if (index < 0) return;
      const target = {
        ArrowLeft:(index + tabs.length - 1) % tabs.length, ArrowRight:(index + 1) % tabs.length,
        Home:0, End:tabs.length - 1
      }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      selectTab(tabs[target]);
    });

    // Our other companions mount directly on <html>. No observation of page content is needed.
    function place() {
      ui.dataset.dock = doc.getElementById('rengoku-patrol') ? 'high' : doc.getElementById('aseerr-ooo-crew') ? 'middle' : 'low';
    }
    const Observer = doc.defaultView?.MutationObserver;
    const dockObserver = Observer ? new Observer(place) : null;
    place();
    dockObserver?.observe(doc.documentElement,{childList:true});
    sync({rider:'beat',partner:'auto',...settings});
    return {
      open,close,toggle,isOpen:() => !panel.hidden,sync,stats,status,audio,station,portraits,tour,rival,arrangement,
      destroy() {
        doc.removeEventListener('pointerdown',outside,true);
        dockObserver?.disconnect();
        ui.remove();
      }
    };
  }
  return {mount};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BeatPanel;
