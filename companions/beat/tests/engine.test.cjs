'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {World, normalize, defaults, moves, lines, riders, signatures, lineMoves, duets} = require('../src/engine.js');

function world(prefs = {}, width = 1000, height = 600) {
  return new World({ambient: false, ...prefs}, width, height, () => .36);
}
function near(actual, expected, tolerance = .01) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≉ ${expected}`);
}
function inside(w, actor = w.hero) {
  const {x, y} = actor, s = w.scale, epsilon = 1e-6;
  assert.ok(x - 64 * s >= -epsilon && x + 64 * s <= w.width + epsilon, 'horizontal cell bounds');
  assert.ok(y - 116 * s >= -epsilon && y + 12 * s <= w.height + epsilon, 'vertical cell bounds');
  assert.ok(actor.progress >= 0 && actor.progress <= 1);
}
const kinds = (w, type) => w.takeEvents().filter(e => e.type === type);

test('legacy options migrate and invalid or inherited identifiers fall back safely', () => {
  assert.deepEqual(normalize(null), defaults);
  assert.deepEqual(normalize({mode: 'follow', scale: 2, hidden: true}), {...defaults, mode: 'follow', scale: 2, hidden: true});
  assert.equal(normalize({scale: '2.5'}).scale, 2.5);
  const s = normalize({mode: 'constructor', scale: 100, hidden: 'false', speed: NaN, delay: 0, offset: Infinity, fx: '__proto__'});
  assert.deepEqual(s, {...defaults, scale: 3, delay: 1});
  const w = world();
  for (const id of ['constructor', '__proto__', '', undefined]) assert.equal(w.perform(id), false);
  w.apply({mode: 'follow'});
  w.apply({speed: 2});
  assert.equal(w.settings.mode, 'follow');
});

test('street rolls, reverses at the viewport edge and spends time resting', () => {
  const w = world({}, 550, 470);
  let rolled = 0, rested = 0, turned = false;
  for (let i = 0; i < 300; i++) {
    w.step(.04); inside(w);
    if (w.hero.action === 'skate') rolled++;
    if (w.hero.action === 'idle') rested++;
    if (w.hero.direction === -1) turned = true;
    near(w.hero.y, w.ground);
  }
  assert.ok(rolled > 100 && rested > 10 && turned);
});

test('cursor waypoints and spray cans wait four seconds, then collect once, even at corners', () => {
  const w = world({mode: 'follow'});
  const start = w.hero.x;
  assert.equal(w.point(0, 0), true);
  assert.equal(w.point(900, 500), false);
  w.step(3.95);
  near(w.hero.x, start);
  assert.equal(w.cans.length, 1);
  assert.equal(w.combo.count, 0);
  w.step(3.1);
  near(w.hero.x, 64 * w.scale);
  near(w.hero.y, 116 * w.scale);
  assert.equal(w.cans.length, 0);
  assert.equal(w.combo.score, 25);
  assert.equal(kinds(w, 'pickup').length, 1);
  w.step(4.1);
  assert.equal(w.best, 25);
  assert.equal(kinds(w, 'best').length, 1);
  w.step(1); assert.equal(kinds(w, 'best').length, 0);
});

test('trail cans require both time and distance, cap at sixty and expire after a minute', () => {
  const w = world({mode: 'follow', delay: 8}, 10000, 600);
  // Keep Beat occupied so no delayed waypoints or pickups are processed.
  const x = w.hero.x, y = w.hero.y;
  assert.ok(w.perform('dance'));
  w.point(12, 12);
  w.step(.08); w.point(120, 12);
  assert.equal(w.cans.length, 1);
  w.step(.09); w.point(18, 12);
  assert.equal(w.cans.length, 1);
  for (let n = 0; n < 90; n++) {
    w.step(.16);
    w.point(n % 2 ? 23 : 123, 12);
    if (w.hero.action !== 'dance') w.perform('dance');
  }
  assert.equal(w.cans.length, 60);
  near(w.hero.x, x); near(w.hero.y, y);
  const ids = w.cans.map(c => c.id);
  assert.equal(new Set(ids).size, 60);
  for (let i = 0; i < 16; i++) {
    w.step(4);
    if (w.hero.action !== 'dance') w.perform('dance');
  }
  assert.equal(w.cans.length, 0);
  assert.equal(kinds(w, 'pickup').length, 0);
});

test('follow keys clear on mode, delay, visibility and page handoff changes', () => {
  const w = world({mode: 'follow'});
  for (const action of [() => {w.apply({mode:'idle'}); w.apply({mode:'follow'});},
    () => w.apply({delay:2}), () => {w.apply({hidden:true}); w.apply({hidden:false});},
    () => w.clearTrail(), () => w.resize(800, 600)]) {
    assert.ok(w.point(50, 50));
    action(); assert.equal(w.cans.length, 0);
    const start = w.hero.x; w.step(8); near(w.hero.x, start);
  }
  w.point(55, 55);
  const transmitted = w.snapshot();
  assert.equal(transmitted.x, .5);
  assert.equal(transmitted.cans, undefined); assert.equal(transmitted.trail, undefined);
  w.depart(); assert.equal(w.cans.length, 0); assert.equal(w.point(55, 55), false);
  w.step(.42); assert.equal(w.transit, null);
  w.arrive(); w.step(.7);
  assert.equal(w.transit, null); assert.equal(w.hero.alpha, 1);
  assert.ok(w.restore(transmitted)); assert.equal(w.hero.y, w.ground);
});

test('authored tricks have distinct movement, rail contact, tag ink and landing poses', () => {
  for (const id of Object.keys(moves)) {
    const w = world();
    const x0 = w.hero.x;
    assert.ok(w.perform(id));
    if (id === 'grind' || id === 'fishbrain') {
      w.step(.60);
      assert.equal(w.hero.action, id);
      near(w.hero.y, w.rail.y);
      near(w.ground - w.rail.y, w.scale * (id === 'grind' ? 18 : 31));
      assert.ok(w.hero.x >= Math.min(w.rail.x1,w.rail.x2) && w.hero.x <= Math.max(w.rail.x1,w.rail.x2));
    } else if (id === 'jump' || id === 'grab') {
      w.step(id === 'jump' ? .4 : .55);
      assert.equal(w.hero.action, id);
      assert.ok(w.ground - w.hero.y > (id === 'grab' ? 75 : 48));
      w.step(id === 'jump' ? .4 : .55);
      assert.equal(w.hero.action, 'land');
    } else if (id === 'boost') {
      w.step(.55); assert.equal(w.hero.action, 'boost'); assert.ok(w.hero.x - x0 > 95);
    } else if (id === 'tag') {
      w.step(.7); assert.ok(w.tag.progress > .4 && w.tag.progress < .85);
      assert.equal(w.tag.kind, 'bolt'); assert.equal(w.tag.accent, 'lime');
      w.step(.7); assert.equal(w.tag.progress, 1);
      assert.ok(w.perform('tag')); assert.equal(w.tag.kind, 'cat');
      w.step(9); assert.equal(w.tag, null);
    } else if (id === 'dance') {
      w.step(6); assert.equal(w.hero.action, 'dance'); near(w.hero.x, x0);
    } else if (id === 'wallride') {
      w.step(.68);
      assert.equal(w.hero.action, id);
      const plane = w.wall.x, xContact = w.hero.x, firstY = w.hero.y;
      near(Math.abs(w.hero.x - plane), 11 * w.scale); assert.ok(w.wall.top < firstY);
      w.step(.2); near(w.hero.x, xContact); assert.ok(w.hero.y < firstY);
      w.step(.57); assert.ok(w.hero.x < xContact && w.hero.y > firstY);
      w.step(.13); assert.equal(w.wall, null);
    } else if (id === 'rocket') {
      w.step(.5); assert.equal(w.hero.action,id);
      const peak = w.hero.y; near(w.ground - peak, 74 * w.scale);
      w.step(.15); near(w.hero.y,peak);
      w.step(.85); assert.equal(w.hero.y,w.ground);
    } else if (id === 'spin') {
      w.step(.45); assert.equal(w.hero.action,id);
      assert.ok(w.hero.y < w.ground - 34*w.scale);
      w.step(.65); assert.equal(w.hero.action,'land');
    } else if (id === 'crossover') {
      w.step(.30); assert.equal(w.hero.action,id);
      assert.ok(w.hero.x > x0 && w.hero.y < w.ground - 2*w.scale);
      w.step(.32); near(w.hero.y,w.ground);
    } else if (id === 'manual') {
      w.step(.5); assert.equal(w.hero.action,id);
      assert.ok(w.hero.x > x0 && w.hero.y === w.ground);
      w.step(.8); assert.equal(w.hero.action,id); assert.ok(w.hero.progress > .8);
    }
    inside(w);
  }
});

test('an input scores once, repeated copies do not extend a line, and records only rise', () => {
  const w = world(); w.setBest(15);
  assert.ok(w.perform('jump'));
  assert.equal(w.perform('jump'), false);
  w.step(.9);
  assert.equal(w.combo.score, 80); assert.equal(w.best, 15);
  assert.ok(w.perform('jump')); w.step(.9);
  assert.equal(w.combo.count, 1);
  assert.ok(w.combo.remaining < 3.5);
  assert.ok(w.perform('grab')); w.step(1.25);
  assert.equal(w.combo.count, 2);
  assert.equal(w.combo.score, 80 + 180);
  w.step(4.2);
  assert.equal(w.best, 260);
  assert.equal(w.combo.count, 0);
  assert.deepEqual(kinds(w, 'best').map(e => e.score), [260]);
  w.setBest(100); assert.equal(w.best, 260);
  w.setBest(800); w.perform('boost'); w.step(6);
  assert.equal(w.best, 800); assert.equal(kinds(w, 'best').length, 0);
});

test('all fifteen authored lines play their advertised sequence, restore mid-line and award a single bonus', () => {
  const sequences = [];
  for (const line of Object.keys(lines)) {
    const a = world();
    a.perform(line);
    a.step(2.15);
    const before = a.takeEvents().filter(e => e.type === 'action');
    const b = world({}, 680, 440);
    assert.equal(b.restore(JSON.parse(JSON.stringify(a.snapshot()))), true);
    assert.deepEqual(b.line, a.line);
    assert.equal(b.hero.action, a.hero.action);
    near(b.hero.progress, a.hero.progress);
    b.arrive(); b.step(.66);
    assert.ok(before.length >= 2);
    let ticks = 0;
    while ((a.line || b.line) && ticks++ < 300) { a.step(.05); b.step(.05); }
    const afterA = a.takeEvents(), afterB = b.takeEvents();
    assert.deepEqual(afterA.filter(e => e.type === 'action').map(e => e.move), afterB.filter(e => e.type === 'action').map(e => e.move));
    assert.equal(afterB.filter(e => e.type === 'line').length, 1);
    assert.equal(b.line, null); assert.equal(b.combo.count, lineMoves[line].length + 1);
    const ids = [...before, ...afterA.filter(e => e.type === 'action')].map(e => e.move);
    assert.deepEqual(ids,lineMoves[line]);
    assert.equal(new Set(ids).size, ids.length);
    sequences.push(ids.join('/'));
    a.step(5); b.step(5); assert.equal(a.best, b.best); assert.ok(b.best > 600);
  }
  assert.equal(new Set(sequences).size, 24);
});

test('gentle mode is stationary on the street, freezes manual poses and suppresses ambient stunts', () => {
  const w = world({ambient: true});
  w.setReduced(true);
  assert.ok(w.gentle);
  const {x, y} = w.hero;
  w.step(42); assert.deepEqual(kinds(w, 'action'), []); near(w.hero.x, x); near(w.hero.y, y);
  assert.ok(w.perform('grind')); w.step(.7);
  near(w.hero.x, x); near(w.hero.y, y); near(w.hero.progress, .5);
  assert.equal(w.hero.action, 'grind'); near(w.rail.y, y);
  assert.ok(w.rail.x1 < x && x < w.rail.x2);
  w.step(2); w.apply({motion:'full'});
  assert.equal(w.gentle, false);
  w.step(28); assert.ok(kinds(w, 'action').some(e => e.source === 'ambient'));
  w.apply({motion:'reduced'}); w.setReduced(false); assert.ok(w.gentle);
  const idle = world({ambient:true});
  idle.step(50); assert.equal(idle.best, 0); assert.equal(idle.combo.count, 0);
});

test('all actions and transitions fit complete cells even on narrow or subcell viewports', () => {
  for (const [width, height] of [[1, 1], [20, 90], [73, 25], [325, 260], [800, 600]]) {
    const w = world({scale:3, offset:80}, width, height);
    if (width - 128 * w.scale < 2) {
      w.step(2); assert.equal(w.hero.action, 'idle'); assert.equal(w.hero.direction, 1);
    }
    for (const id of [...Object.keys(moves), ...Object.keys(lines)]) {
      const m = world(w.settings, width, height);
      assert.ok(m.perform(id));
      for (let i = 0; i < 250; i++) {
        m.step(.05); inside(m);
        if (m.partner) inside(m, m.partner);
        if (m.wall) assert.ok(m.wall.x >= 0 && m.wall.x <= width && m.wall.top >= 0 && m.wall.y <= height);
      }
      m.arrive(); m.step(.2); inside(m); m.depart(); m.step(.35); inside(m);
      m.resize(height, width); inside(m);
    }
  }
});

test('malformed saves cannot introduce unknown choreography or invalid positions', () => {
  const w = world();
  assert.equal(w.restore(null), false);
  assert.equal(w.restore({version:1, x:NaN,best:-30, combo:{count:Infinity},
    trick:{id:'jump',source:'line'}, line:{id:'sidewinder',index:500}}), true);
  inside(w); assert.equal(w.line, null); assert.equal(w.trick, null);
  assert.equal(w.combo.count, 0); assert.equal(w.best, 0);
});

test('the seven leads open Free Skate with their own signature and give the first complementary spot to a fresh line', () => {
  assert.equal(Object.keys(riders).length, 15);
  assert.equal(Object.keys(moves).length, 25);
  assert.equal(new Set(Object.values(signatures)).size, 15);
  for (const rider of Object.keys(riders)) {
    const w = world({ambient:true, rider});
    w.step(4.1);
    assert.equal(w.hero.rider,rider);
    assert.equal(w.line.id,signatures[rider]); assert.equal(w.line.source,'ambient');
    assert.ok(w.line.total >= 7);
    const first = w.line.id;
    for (let i=0; i<250 && w.line?.id===first; i++) w.step(.06);
    assert.equal(w.line,null);
    let wait = 0;
    while (!w.line && wait < 10) { w.step(.1); wait += .1; }
    assert.ok(wait >= 4.9 && wait <= 9.2);
    assert.notEqual(duets.includes(w.line.id),duets.includes(first));
    assert.equal(w.combo.score,0); assert.equal(w.best,0);
  }
  const w = world({ambient:true});
  w.step(6); w.apply({rider:'poison'}); w.step(3.1);
  assert.equal(w.line.id,signatures.poison); assert.equal(w.hero.rider,'poison');
});

test('ambient plays fifteen lines before recycling, rotates all six partners across a tab transfer, and leaves scoring to the player', () => {
  let w = world({ambient:true});
  const lineup = [], partners = [];
  for (let i = 0; i < 10000 && (lineup.length < 25 || partners.length < 15); i++) {
    w.step(.25);
    if (w.line && w.line.id !== lineup.at(-1)) {
      lineup.push(w.line.id);
      if (w.partner) partners.push(w.partner.rider);
      if (lineup.length===7) {
        const transfer = JSON.parse(JSON.stringify(w.snapshot()));
        w = world({ambient:true});
        assert.ok(w.restore(transfer));
        assert.equal(w.line.source,'ambient');
        w.arrive(); w.step(.66);
      }
    }
  }
  assert.equal(new Set(lineup.slice(0,24)).size,24);
  assert.notEqual(lineup[23],lineup[24]);
  assert.equal(new Set(partners.slice(0,14)).size,14);
  assert.equal(partners[0],partners[14]); assert.ok(!partners.includes('beat'));
  assert.equal(w.best,0); assert.equal(w.combo.count,0);
  assert.ok(w.perform('spin')); assert.equal(w.line,null); assert.equal(w.partner,null);
  w.step(1.3); assert.equal(w.combo.score,165);
  w.step(4.1); assert.equal(w.best,165);
});

test('the second rider crosses, answers the lead, and respects explicit partner or solo choices', () => {
  const w = world({rider:'gum',partner:'zero'});
  assert.ok(w.perform('piraterelay'));
  const buddy = w.partner;
  assert.equal(buddy.rider,'zero');
  w.step(.30);
  assert.equal(w.hero.action,'tag'); assert.equal(buddy.action,'dance');
  const before = buddy.x - w.hero.x;
  w.step(.65);
  assert.ok((buddy.x - w.hero.x) * before < 0, 'partner passes the lead independently');
  w.step(.5); const transferred = w.snapshot();
  const b = world(w.settings); b.restore(transferred);
  assert.equal(b.partner.rider,'zero'); near(b.partner.x,w.partner.x); near(b.partner.y,w.partner.y);
  assert.equal(b.partner.action,w.partner.action);
  b.apply({partner:'off'}); assert.equal(b.partner,null);
  b.apply({partner:'gum'}); assert.ok(b.partner && b.partner.rider!=='gum');
  const quiet = world({rider:'combo',partner:'off'}); quiet.perform('lasttrain');
  quiet.step(4); assert.equal(quiet.partner,null);
});

test('ambient aborts immediately on manual input, reduced motion, cursor mode or disabled auto lines', () => {
  for (const change of ['manual','motion','system','mode','ambient']) {
    const w = world({ambient:true,rider:'poison'}); w.step(6.0);
    assert.equal(w.line.id,'toxicspill'); assert.ok(w.partner);
    if (change === 'manual') { w.perform('wallride'); w.step(.6); assert.ok(w.wall); }
    else if (change === 'system') w.setReduced(true);
    else w.apply({[change]:change==='motion'?'reduced':change==='mode'?'follow':false});
    assert.equal(w.line,null); assert.equal(w.partner,null);
    assert.equal(w.combo.score,0); assert.equal(w.best,0);
    if (change !== 'manual') {
      assert.equal(w.trick,null);
      w.step(30); assert.equal(w.line,null);
    }
  }
  const w = world({motion:'reduced'}); w.perform('piraterelay');
  const x = w.hero.x, allyX = w.partner.x;
  for (let i=0; i<70; i++) {
    w.step(.05); near(w.hero.x,x); near(w.partner.x,allyX);
    near(w.hero.progress,.5); near(w.partner.progress,.5);
  }
});

test('2.x sessions resume legacy singles and legacy sidewinder saves, and saved Follow routines relocate privately', () => {
  const w = world({ambient:true});
  assert.ok(w.restore({version:1, x:.5, trick:{id:'jump',source:'ambient',elapsed:.4,x0:.4,x1:.5}, line:null}));
  w.step(1); assert.equal(w.combo.score,0);
  assert.ok(w.restore({version:1, x:.5, trick:{id:'grind',source:'line',elapsed:.9,x0:.4,x1:.65},
    line:{id:'sidewinder',index:1}, combo:{score:90,count:1,remaining:3}}));
  assert.equal(w.line.source,'manual');
  w.step(4); assert.equal(w.line,null); assert.ok(w.combo.score>300);

  const old = world({mode:'follow'}); old.point(35,60); old.step(10);
  old.perform('piraterelay'); old.step(1.64);
  const saved = old.snapshot();
  assert.equal(saved.x,.5);
  for (const k of ['x0','x1','partnerX0','partnerX1']) assert.equal(saved.trick[k],.5);
  const next = world({mode:'follow'},720,420); next.restore(saved);
  assert.notEqual(next.trick.x0,next.trick.x1);
  assert.notEqual(next.trick.partnerX0,next.trick.partnerX1);
  assert.equal(next.cans.length,0); near(next.hero.y, next.ground, 8);
});
test('2.0 parity: adjustable size and speed affect actual movement while four-second chase stays default',()=>{
 assert.equal(defaults.delay,4);const slow=world({mode:'manual',speed:.5,scale:1}),fast=world({mode:'manual',speed:2,scale:2});slow.hero.x=fast.hero.x=300;slow.steer(1,0);fast.steer(1,0);slow.step(.5);fast.step(.5);near(fast.hero.x-300,4*(slow.hero.x-300));assert.equal(slow.scale,1);assert.equal(fast.scale,2);const snap=fast.snapshot(),next=world({mode:'manual',speed:2,scale:2},1200,700);assert.equal(next.restore(snap),true);assert.deepEqual(next.combo,fast.combo);
});
