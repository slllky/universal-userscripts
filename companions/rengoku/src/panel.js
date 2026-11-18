// The manual is a nonmodal overlay. An idle launcher is the only part that intercepts page clicks.
const PatrolPanel = (() => {
  'use strict';
  const tsuba = `<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">
    <path fill="#a73628" stroke="#271c19" stroke-width="2" d="M29 3c3 6 11 6 14 3l-1 7 8-4-2 9 7-2-3 9 5 1c-2 5-5 8-8 11l6-1c-5 8-10 10-15 12l4 2-12 2-3 6-5-6-9-1 2-4C9 46 4 39 4 34l5 2-5-11 6 2-4-11 7 3-1-10 9 6-2-9 7 4z"/>
    <path fill="#f7bb57" d="M28 10c1 6 6 8 12 4l-2 8 9-4-3 8 7-2c-2 5-5 8-8 10l4 1-10 8 4 1-9 2-4 6-3-6-8-4 2-1c-5-3-8-8-9-12l5 3-3-10 5 3-1-8 7 4-1-8 4 4z"/>
    <path fill="#8d2c26" d="M29 19c4 0 8 3 10 8 4 10-2 16-9 17-8 0-13-6-11-13 1-7 5-10 10-12z"/>
    <path fill="#f6dc8c" d="M29 22c6 0 9 5 8 11-1 5-4 8-8 8-5-1-8-5-7-10s3-8 7-9z"/>
    <path fill="#332722" d="m31 25 2 8-5 5-2-7z"/>
  </svg>`;

  const ranges = [
    ['scale','Sprite size',0.65,2,0.05],
    ['pace','Patrol pace',0.5,2,0.05],
    ['offset','Height above page bottom',0,180,1]
  ];
  const choices = [
    ['frequency','Demon encounters',{off:'Manual only',rare:'Rare',normal:'Normal',frequent:'Frequent'}],
    ['fx','Flame effects',{off:'Off',subtle:'Subtle',full:'Full'}],
    ['motion','Motion',{system:'Follow device',gentle:'Gentle',full:'Full'}]
  ];

  function mount(root, { settings, demonNames, moves, onChange, onSummon, onMove }) {
    const doc = root.ownerDocument;
    const ui = doc.createElement('div');
    ui.className = 'rp-ui';
    ui.innerHTML = `
      <button class="rp-launch" type="button" aria-label="Rengoku patrol settings" title="Rengoku patrol settings"
        aria-haspopup="dialog" aria-expanded="false" aria-controls="rp-manual">${tsuba}</button>
      <section id="rp-manual" class="rp-book" role="dialog" aria-labelledby="rp-title" hidden>
        <header class="rp-cover">
          <div class="rp-cover-text"><p>Kyojuro Rengoku</p><h2 id="rp-title">Patrol manual</h2></div>
          <button type="button" class="rp-close" aria-label="Close patrol manual" title="Close">×</button>
        </header>
        <div class="rp-tabs" role="tablist" aria-label="Manual chapters">
          <button type="button" id="rp-tab-patrol" role="tab" aria-selected="true" aria-controls="rp-page-patrol">Patrol</button>
          <button type="button" id="rp-tab-dojo" role="tab" aria-selected="false" aria-controls="rp-page-dojo" tabindex="-1">Dojo</button>
        </div>
        <div class="rp-sheet">
          <section id="rp-page-patrol" role="tabpanel" aria-labelledby="rp-tab-patrol">
            <label class="rp-toggle"><span>Show patrol</span><input type="checkbox" data-setting="enabled"><i aria-hidden="true"></i></label>
            <label class="rp-toggle"><span>Cursor &amp; click interactions</span><input type="checkbox" data-setting="interact"><i aria-hidden="true"></i></label>
            <div class="rp-ranges"></div>
            <div class="rp-choices"></div>
          </section>
          <section id="rp-page-dojo" role="tabpanel" aria-labelledby="rp-tab-dojo" hidden>
            <div class="rp-dojo-row"><h3>Encounter</h3><label for="rp-demon">Demon</label><select id="rp-demon"></select>
              <button type="button" class="rp-action rp-summon">Summon demon</button></div>
            <div class="rp-dojo-row"><h3>Practice</h3><label for="rp-move">Rengoku’s move</label><select id="rp-move"></select>
              <button type="button" class="rp-action rp-perform">Perform move</button></div>
          </section>
        </div>
        <footer class="rp-footer"><span class="rp-seal" aria-hidden="true"></span><span class="rp-status" role="status" aria-live="polite">On patrol</span></footer>
      </section>`;
    root.append(ui);
    const get = selector => ui.querySelector(selector);
    const book = get('.rp-book');
    const launcher = get('.rp-launch');
    const tabs = Array.from(ui.querySelectorAll('[role="tab"]'));
    const demonSelect = get('#rp-demon');
    const moveSelect = get('#rp-move');
    const scroll = get('.rp-sheet');
    const statusText = get('.rp-status');
    const bindings = new Map();
    const field = (tag, cls, parent) => {
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      parent.append(node);
      return node;
    };
    const option = (select, value, name) => {
      const item = field('option','',select);
      item.value = value;
      item.textContent = name;
    };
    function fillOptions(select, items) {
      for (const [key, spec] of Object.entries(items)) {
        option(select,key,typeof spec === 'string' ? spec : spec.name);
      }
    }
    const display = (key,value) => key === 'offset' ? value + ' px' : Number(value).toFixed(2).replace(/0$/,'').replace(/\.0$/, '') + '×';

    for (const [key,title,min,max,step] of ranges) {
      const row = field('div','rp-range',get('.rp-ranges'));
      const label = field('label','',row);
      label.textContent = title;
      label.htmlFor = 'rp-' + key;
      const valueLabel = field('span','rp-value',row);
      valueLabel.setAttribute('aria-hidden', 'true');
      const input = field('input','',row);
      input.id = label.htmlFor;
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.dataset.setting = key;
      bindings.set(key, {input,valueLabel});
    }
    for (const [key,title,options] of choices) {
      const row = field('div','rp-pick',get('.rp-choices'));
      const label = field('label','',row);
      label.textContent = title;
      label.htmlFor = 'rp-' + key;
      const select = field('select','',row);
      select.id = label.htmlFor;
      select.dataset.setting = key;
      fillOptions(select,options);
      bindings.set(key,{input:select});
    }
    for (const input of ui.querySelectorAll('input[type=checkbox]')) bindings.set(input.dataset.setting,{input});
    option(demonSelect, 'random', 'Surprise me');
    for (const [id, definition] of Object.entries(demonNames)) {
      if (id !== 'random') fillOptions(demonSelect,{[id]:definition});
    }
    fillOptions(moveSelect,moves);
    let busy = false;
    let state = {...settings};
    const showStatus = text => { statusText.textContent = text; };
    function refreshActions() {
      const blocked = busy || !state.enabled;
      get('.rp-summon').disabled = blocked;
      get('.rp-perform').disabled = blocked;
      if (blocked) showStatus(state.enabled ? 'Encounter in progress' : 'Patrol is off');
      else showStatus('On patrol');
    }
    function updateRange(key,value) {
      const {input,valueLabel} = bindings.get(key);
      const text = display(key,value);
      valueLabel.textContent = text;
      input.setAttribute('aria-valuetext',text);
    }
    function sync(next) {
      const previouslyEnabled = state.enabled;
      state = {...state,...next};
      for (const [key,{input,valueLabel}] of bindings) {
        const value = state[key];
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else if (input.tagName === 'SELECT') {
          for (const item of input.options) item.selected = item.value === value;
        } else {
          input.value = String(value);
          if (valueLabel) updateRange(key,value);
        }
      }
      if (state.motion === 'gentle') ui.dataset.gentle = 'true';
      else delete ui.dataset.gentle;
      if (previouslyEnabled !== state.enabled) refreshActions();
    }
    function setEncounter(inEncounter) {
      if (busy === Boolean(inEncounter)) return;
      busy = Boolean(inEncounter);
      refreshActions();
    }
    function selectTab(active,focus) {
      for (const tab of tabs) {
        const selected = tab === active;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        get('#' + tab.getAttribute('aria-controls')).hidden = !selected;
      }
      scroll.scrollTop = 0;
      if (focus) active.focus();
    }
    function open() {
      if (!book.hidden) return;
      book.hidden = false;
      launcher.setAttribute('aria-expanded','true');
      tabs.find(tab=>tab.getAttribute('aria-selected')==='true').focus();
    }
    function close() {
      if (book.hidden) return;
      book.hidden = true;
      launcher.setAttribute('aria-expanded','false');
      launcher.focus();
    }
    const toggle = () => book.hidden ? open() : close();
    launcher.addEventListener('click',toggle);
    get('.rp-close').addEventListener('click',close);
    tabs.forEach(tab=>tab.addEventListener('click',()=>selectTab(tab,false)));
    ui.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !book.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (!tabs.includes(event.target)) return;
      let target;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') target = tabs[1-tabs.indexOf(event.target)];
      else if (event.key === 'Home') target = tabs[0];
      else if (event.key === 'End') target = tabs[1];
      else return;
      event.preventDefault();
      event.stopPropagation();
      selectTab(target,true);
    });
    for (const [key,{input,valueLabel}] of bindings) {
      // The thumb readout follows a drag. Persist once when the browser commits the change.
      if (valueLabel) input.addEventListener('input',()=>updateRange(key,input.value));
      input.addEventListener('change',()=>{
        const value = input.type === 'checkbox' ? input.checked : valueLabel ? Number(input.value) : input.value;
        sync({[key]:value});
        onChange({[key]:value});
      });
    }
    get('.rp-summon').addEventListener('click',()=>{
      if (busy || !state.enabled) return;
      if (onSummon(demonSelect.value) === false) showStatus('An encounter is unavailable right now.');
      else { setEncounter(true); close(); }
    });
    get('.rp-perform').addEventListener('click',()=>{
      if (busy || !state.enabled) return;
      const ok = onMove(moveSelect.value);
      const chosen = moveSelect.options[moveSelect.selectedIndex];
      showStatus(ok === false ? 'Let the current action finish first.' : chosen?.textContent || 'Practicing');
    });
    sync(settings);
    refreshActions();
    return {open,close,toggle,sync,setEncounter,status:showStatus,destroy:()=>ui.remove()};
  }
  return {mount};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PatrolPanel;
