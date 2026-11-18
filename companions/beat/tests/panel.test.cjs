const test = require('node:test');
const assert = require('node:assert/strict');
const {parseHTML} = require('linkedom');
const BeatPanel = require('../src/panel.js');
const engine = require('../src/engine.js');
const tracks = [
  {id:'one',title:'Track One',genre:'Big beat',bpm:108},
  {id:'two',title:'Track Two',genre:'Jungle',bpm:168}
];

function mount() {
  const {document, Event} = parseHTML('<html><body><div id="beat"></div></body></html>').window;
  const root = document.getElementById('beat').attachShadow({mode:'open'});
  const changes = [], moves = [], tape = [];
  const panel = BeatPanel.mount(root,{
    settings: {mode:'idle', scale:1.5, hidden:false, speed:1, delay:4, ambient:true, interact:true,
      fx:'full', motion:'system', skin:'remix', accent:'lime', offset:4},
    moves:engine.moves, lines:engine.lines, riders:engine.riders, signatures:engine.signatures,
    duets:engine.duets, lineMoves:engine.lineMoves, tracks,
    onChange:patch => changes.push(patch), onMove:id => { moves.push(id); return id === 'airmail'; },
    onJump:() => 'Beat is hopping to the next page.', onRadio:() => tape.push('pressed'), onVolume:volume => tape.push(volume),
    onOrder:order => tape.push(order), onTrack:id => tape.push(id), onStationStep:direction => tape.push(direction)
  });
  const get = selector => root.querySelector(selector);
  const fire = (node,type) => node.dispatchEvent(new Event(type,{bubbles:true}));
  function key(node,value) {
    const event = new Event('keydown',{bubbles:true,cancelable:true});
    event.key = value;
    node.dispatchEvent(event);
    return event;
  }
  return {document,get,panel,changes,moves,tape,fire,key};
}

test('radio supports keyboard tab navigation and Escape',() => {
  const {panel,get,key} = mount();
  get('.bt-dial').click();
  assert.equal(panel.isOpen(),true);
  assert.equal(get('.bt-dial').getAttribute('aria-expanded'),'true');
  key(get('#bt-tab-session'),'ArrowRight');
  assert.equal(get('#bt-tab-tricks').getAttribute('aria-selected'),'true');
  assert.equal(get('#bt-page-tricks').hidden,false);
  assert.equal(get('#bt-page-session').hidden,true);
  key(get('#bt-tab-tricks'),'End');
  assert.equal(get('#bt-page-setup').hidden,false);
  assert.ok(key(get('#bt-tab-setup'),'Escape').defaultPrevented);
  assert.equal(panel.isOpen(),false);
  panel.open();
  assert.equal(get('#bt-page-setup').hidden,false);
  panel.destroy();
  assert.equal(get('.bt-radio'),null);
});

test('visibility, trail delay, paint and remote sync retain their setting meanings',() => {
  const {get,panel,fire,changes} = mount();
  panel.open();
  const follow = get('input[value="follow"]');
  follow.checked = true;
  fire(follow,'change');
  assert.equal(get('[data-field="delay"]').hidden,false);
  const delay = get('#bt-control-delay');
  delay.value = '2';
  fire(delay,'input');
  assert.equal(delay.getAttribute('aria-valuetext'),'2 s');
  fire(delay,'change');
  const visible = get('#bt-control-hidden');
  assert.equal(visible.checked,true);
  visible.checked = false;
  fire(visible,'change');
  assert.equal(get('[data-move="jump"]').disabled,true);
  assert.deepEqual(changes,[{mode:'follow'},{delay:2},{hidden:true}]);
  panel.sync({skin:'classic',accent:'pink',hidden:false});
  assert.equal(get('.bt-radio').dataset.accent,'pink');
  assert.equal(get('input[value="classic"]').checked,true);
  assert.equal(visible.checked,true);
  assert.equal(get('[data-move="jump"]').disabled,false);
  assert.equal(changes.length,3);
});

test('manual tricks, combo lines and tab jump expose their results',() => {
  const {get,panel,moves} = mount();
  get('[data-move="jump"]').click();
  assert.match(get('[role=status]').textContent,/unavailable/);
  get('[data-move="airmail"]').click();
  assert.deepEqual(moves,['jump','airmail']);
  assert.equal(get('[role=status]').textContent,'Air mail');
  panel.stats({score:190,best:125,count:2,line:'Air mail',step:3,total:4,source:'ambient',rider:'gum',partner:'yoyo'});
  assert.equal(get('[data-counter=score]').textContent,'190');
  assert.equal(get('[data-counter=best]').textContent,'125');
  assert.equal(get('.bt-sequence').textContent,'Air mail · 2 tricks');
  assert.equal(get('.bt-cast').textContent,'Free skate · Gum + Yo-Yo');
  assert.equal(get('.bt-step').getAttribute('aria-label'),'Step 3 of 4');
  panel.stats({best:190});
  assert.equal(get('.bt-live').hidden,true);
  get('.bt-hop').click();
  assert.match(get('[role=status]').textContent,/hopping/);
});

test('dock yields its corner to companions that load later and reclaims it on removal',async () => {
  const {get,document,panel} = mount();
  const host = document.createElement('div');
  host.id = 'rengoku-patrol';
  document.documentElement.append(host);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(get('.bt-radio').dataset.dock,'high');
  host.remove();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(get('.bt-radio').dataset.dock,'low');
  panel.destroy();
});

test('breakbeat starts silent, its transport follows actual playback, and volume is normalized',() => {
  const {get,panel,tape,fire} = mount();
  const button = get('.bt-transport');
  const volume = get('#bt-volume');
  assert.deepEqual(tape,[]);
  assert.equal(volume.value,'35');
  assert.equal(button.getAttribute('aria-label'),'Play radio');
  button.click();
  assert.deepEqual(tape,['pressed']);
  panel.audio(true,0.65);
  assert.equal(button.getAttribute('aria-label'),'Stop radio');
  assert.equal(volume.value,'65');
  volume.value = '82'; fire(volume,'input');
  assert.deepEqual(tape,['pressed',0.82]);
  panel.audio(false);
  assert.equal(button.getAttribute('aria-label'),'Play radio');
  assert.equal(volume.value,'82');
});

test('selecting a portrait features the skater, changes the one-touch signature and filters duet partners',() => {
  const {get,panel,changes,moves,fire} = mount();
  const roster = get('.bt-roster');
  assert.equal(roster.querySelectorAll('input').length,15);
  const portrait = 'data:image/png;base64,AA==';
  panel.portraits({gum:portrait});
  assert.equal(get('[data-rider=gum] img').getAttribute('src'),portrait);
  const gum = get('input[value="gum"]');
  gum.checked = true; fire(gum,'change');
  assert.deepEqual(changes,[{rider:'gum'}]);
  assert.match(get('.bt-featured').getAttribute('aria-label'),/Gum.*Sugar Rush/);
  get('.bt-featured').click();
  assert.deepEqual(moves,['sugarush']);
  assert.equal(get('#bt-control-partner option[value=gum]').disabled,true);
  panel.sync({rider:'poison',partner:'gum'});
  assert.equal(get('input[value=poison]').checked,true);
  assert.equal(get('#bt-control-partner').value,'gum');
  assert.equal(get('#bt-control-partner option[value=poison]').disabled,true);
  assert.deepEqual(changes,[{rider:'gum'}]);
});

test('line book exposes every routine in the signature, duet or street index and spells out every move',() => {
  const {get} = mount();
  assert.equal(get('.bt-lines').querySelectorAll('details').length,3);
  for (const [id,sequence] of Object.entries(engine.lineMoves)) {
    assert.equal(get('.bt-lines [data-move="'+id+'"] > span').textContent,
      sequence.map(move=>engine.moves[move]).join(' → '));
  }
  assert.equal(get('.bt-pads').querySelectorAll('button').length,Object.keys(engine.moves).length);
});

test('station track selection, manual seeking and playback order never turn on playback',() => {
  const {get,panel,fire,tape} = mount();
  assert.equal(get('.bt-track-title').textContent,'Track One');
  assert.match(get('.bt-track-meta').textContent,/Big beat.*108 BPM/);
  get('#bt-track option[value=two]').selected = true; fire(get('#bt-track'),'change');
  get('[data-step="-1"]').click(); get('[data-step="1"]').click();
  get('#bt-order option[value=shuffle]').selected = true; fire(get('#bt-order'),'change');
  assert.deepEqual(tape,['two',-1,1,'shuffle']);
  panel.station(tracks[1],'loop');
  assert.equal(get('#bt-order').value,'loop');
  assert.equal(get('#bt-track').value,'two');
  assert.match(get('.bt-track-meta').textContent,/Jungle.*168 BPM/);
  assert.equal(get('.bt-transport').getAttribute('aria-label'),'Play radio');
});

test('portraits can draw from embedded pixels if a page rejects data images',async () => {
  const {get,panel,document,fire} = mount();
  const win = document.defaultView;
  const createBitmap = win.createImageBitmap;
  const proto = Object.getPrototypeOf(document.createElement('canvas'));
  const getContext = proto.getContext;
  const bitmap = {width:48,height:48,close() {}};
  let drawn;
  try {
    win.createImageBitmap = async () => bitmap;
    proto.getContext = () => ({drawImage(image) { drawn = image; }});
    panel.portraits({gum:'data:image/png;base64,AA=='});
    fire(get('[data-rider=gum] img'),'error');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(drawn,bitmap);
    assert.equal(get('[data-rider=gum] canvas').width,48);
    assert.equal(get('[data-rider=gum] img').hidden,true);
  } finally {
    if (createBitmap) win.createImageBitmap = createBitmap; else delete win.createImageBitmap;
    proto.getContext = getContext;
  }
});
