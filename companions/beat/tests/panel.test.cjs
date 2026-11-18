const test = require('node:test');
const assert = require('node:assert/strict');
const {parseHTML} = require('linkedom');
const BeatPanel = require('../src/panel.js');

function mount() {
  const {document, Event} = parseHTML('<html><body><div id="beat"></div></body></html>').window;
  const root = document.getElementById('beat').attachShadow({mode:'open'});
  const changes = [], moves = [], tape = [];
  const panel = BeatPanel.mount(root,{
    settings: {mode:'idle', scale:1.5, hidden:false, speed:1, delay:4, ambient:true, interact:true,
      fx:'full', motion:'system', skin:'remix', accent:'lime', offset:4},
    moves: {jump:'Pop hop'}, lines:{airmail:'Air mail'},
    onChange:patch => changes.push(patch), onMove:id => { moves.push(id); return id === 'airmail'; },
    onJump:() => 'Beat is hopping to the next page.', onRadio:() => tape.push('pressed'), onVolume:volume => tape.push(volume)
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
  assert.match(get('[role=status]').textContent,/current move/);
  get('[data-move="airmail"]').click();
  assert.deepEqual(moves,['jump','airmail']);
  assert.equal(get('[role=status]').textContent,'Air mail');
  panel.stats({score:190,best:125,count:2,line:'Air mail'});
  assert.equal(get('[data-counter=score]').textContent,'190');
  assert.equal(get('[data-counter=best]').textContent,'125');
  assert.equal(get('.bt-sequence').textContent,'Air mail · 2 tricks');
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
  assert.equal(button.getAttribute('aria-label'),'Play breakbeat');
  button.click();
  assert.deepEqual(tape,['pressed']);
  panel.audio(true,0.65);
  assert.equal(button.getAttribute('aria-label'),'Stop breakbeat');
  assert.equal(volume.value,'65');
  volume.value = '82'; fire(volume,'input');
  assert.deepEqual(tape,['pressed',0.82]);
  panel.audio(false);
  assert.equal(button.getAttribute('aria-label'),'Play breakbeat');
  assert.equal(volume.value,'82');
});
