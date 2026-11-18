// Beat's floating radio deck lives inside the companion's shadow root.
const BeatPanel = (() => {
  'use strict';

  const tape = '<span class="bt-tape" aria-hidden="true"><i></i><b></b><i></i></span>';
  const chapters = {session:'Session', tricks:'Trick deck', setup:'Setup'};
  const rangeFields = {
    speed:['Skate speed',0.5,2,0.1,'×'], scale:['Sprite size',1,3,0.1,'×'],
    delay:['Trail delay',1,8,1,' s'], offset:['Ground clearance',0,80,1,' px']
  };
  const toggleFields = {hidden:'Show Beat', ambient:'Freestyle while cruising', interact:'Clickable skater'};
  const pickFields = {
    mode:['Skating mode',{idle:'Free skate',follow:'Cursor trail'}],
    skin:['Sprite set',{remix:'Remix',classic:'Classic'}],
    accent:['Paint color',{lime:'Lime',pink:'Pink',cyan:'Cyan'}],
    fx:['Visual effects',{off:'Off',low:'Low',full:'Full'}],
    motion:['Motion',{system:'Use device setting',reduced:'Reduced',full:'Full motion'}]
  };

  function mount(root, {settings,moves,lines,onChange,onMove,onJump,onRadio,onVolume}) {
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
            <div data-field="mode"></div>
            <p class="bt-trail-help" hidden>Move your cursor to leave paint cans for Beat to collect.</p>
            <div data-field="delay" hidden></div>
            <div class="bt-switches"><div data-field="hidden"></div><div data-field="ambient"></div><div data-field="interact"></div></div>
            <div class="bt-stereo">
              <button type="button" class="bt-transport" aria-label="Play breakbeat"><i aria-hidden="true"></i><span>Play breakbeat</span></button>
              <label for="bt-volume">Volume <span class="bt-volume-value" aria-hidden="true">35%</span></label>
              <input id="bt-volume" type="range" min="0" max="100" step="1" value="35" aria-valuetext="35 percent">
            </div>
            <button type="button" class="bt-hop">Jump to another tab <span aria-hidden="true">↗</span></button>
          </section>
          <section id="bt-page-tricks" role="tabpanel" aria-labelledby="bt-tab-tricks" hidden>
            <p class="bt-sequence" hidden></p>
            <h3>Tricks</h3><div class="bt-pads" data-bank="moves"></div>
            <h3>Combo lines</h3><div class="bt-lines" data-bank="lines"></div>
          </section>
          <section id="bt-page-setup" role="tabpanel" aria-labelledby="bt-tab-setup" hidden>
            <div data-field="skin"></div><div data-field="accent"></div>
            <div class="bt-faders"><div data-field="speed"></div><div data-field="scale"></div><div data-field="offset"></div></div>
            <div data-field="fx"></div><div data-field="motion"></div>
          </section>
        </div>
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
      return state.hidden ? 'Beat is hidden' : state.mode === 'follow' ? 'Following the cursor trail' : 'Free skating';
    }
    function edit(key,value) {
      if (state[key] === value) return;
      sync({[key]:value});
      onChange({[key]:value});
    }
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
      if (key === 'motion' || key === 'fx') {
        row.className = 'bt-select';
        const label = append(row,'label',title);
        const select = append(row,'select');
        select.id = 'bt-control-' + key;
        label.setAttribute('for',select.id);
        for (const [value,name] of Object.entries(choices)) append(select,'option',name).value = value;
        bindings.set(key,value => {
          for (const option of select.options) option.selected = option.value === value;
        });
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
    for (const [bank,items] of Object.entries({moves,lines})) {
      const group = get(`[data-bank="${bank}"]`);
      for (const [id,name] of Object.entries(items)) {
        const pad = append(group,'button',name);
        pad.type = 'button';
        pad.dataset.move = id;
        if (bank === 'lines') append(pad,'span','▷').setAttribute('aria-hidden','true');
        pad.addEventListener('click',() => {
          if (state.hidden) return;
          const result = onMove(id);
          status(typeof result === 'string' ? result : result === false ? 'Finish the current move first' : name);
        });
        actionButtons.push(pad);
      }
    }
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
      const text = on ? 'Stop breakbeat' : 'Play breakbeat';
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
      ui.dataset.accent = state.accent;
      ui.dataset.motion = state.motion;
      get('[data-field="delay"]').hidden = state.mode !== 'follow';
      get('.bt-trail-help').hidden = state.mode !== 'follow';
      for (const pad of actionButtons) pad.disabled = Boolean(state.hidden);
      if (previous.mode !== state.mode || previous.hidden !== state.hidden) status(sessionStatus());
    }
    function stats({score=0,best=0,count=0,line=''} = {}) {
      const sequence = get('.bt-sequence');
      const countText = count ? count + (count === 1 ? ' trick' : ' tricks') : '';
      const description = [line,countText].filter(Boolean).join(' · ');
      sequence.hidden = !description;
      if (sequence.textContent !== description) sequence.textContent = description;
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
    sync(settings);
    return {
      open,close,toggle,isOpen:() => !panel.hidden,sync,stats,status,audio,
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
