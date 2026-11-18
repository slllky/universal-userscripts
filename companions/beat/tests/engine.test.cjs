'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {World, normalize, defaults, moves, lines} = require('../src/engine.js');

function world(prefs = {}, width = 1000, height = 600) {
  return new World({ambient: false, ...prefs}, width, height, () => .36);
}
function near(actual, expected, tolerance = .01) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≉ ${expected}`);
}
function inside(w) {
  const {x, y} = w.hero, s = w.scale, epsilon = 1e-6;
  assert.ok(x - 64 * s >= -epsilon && x + 64 * s <= w.width + epsilon, 'horizontal cell bounds');
  assert.ok(y - 116 * s >= -epsilon && y + 12 * s <= w.height + epsilon, 'vertical cell bounds');
  assert.ok(w.hero.progress >= 0 && w.hero.progress <= 1);
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
    if (id === 'grind') {
      w.step(.60);
      assert.equal(w.hero.action, 'grind');
      near(w.hero.y, w.rail.y);
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
    } else {
      w.step(6); assert.equal(w.hero.action, 'dance'); near(w.hero.x, x0);
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

test('two time-sequenced lines chain different tricks, award bonuses and restore mid-line', () => {
  const sequences = [];
  for (const line of Object.keys(lines)) {
    const a = world();
    a.perform(line);
    a.step(1.1);
    const before = a.takeEvents().filter(e => e.type === 'action');
    const b = world({}, 680, 440);
    assert.equal(b.restore(JSON.parse(JSON.stringify(a.snapshot()))), true);
    assert.deepEqual(b.line, a.line);
    assert.equal(b.hero.action, a.hero.action);
    near(b.hero.progress, a.hero.progress);
    b.arrive(); b.step(.66);
    assert.equal(before.length, 2);
    a.step(6); b.step(6);
    const afterA = a.takeEvents(), afterB = b.takeEvents();
    assert.deepEqual(afterA.filter(e => e.type === 'action').map(e => e.move), afterB.filter(e => e.type === 'action').map(e => e.move));
    assert.equal(afterB.filter(e => e.type === 'line').length, 1);
    assert.equal(b.line, null); assert.equal(b.combo.count, 5);
    const ids = [...before, ...afterA.filter(e => e.type === 'action')].map(e => e.move);
    assert.equal(new Set(ids).size, 4);
    sequences.push(ids.join('/'));
    a.step(5); b.step(5); assert.equal(a.best, b.best); assert.ok(b.best > 600);
  }
  assert.equal(new Set(sequences).size, 2);
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
      for (let i = 0; i < 200; i++) { m.step(.05); inside(m); }
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
