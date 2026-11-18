const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../src/pages.js'), 'utf8');
const BeatPages = vm.runInNewContext(code + '\nBeatPages');

function station() {
  let now = 1000, sequence = 0;
  const db = new Map(), subscribers = new Map(), jobs = new Map();
  const schedule = (fn, delay, repeat = false) => {
    const id = ++sequence;
    jobs.set(id, { fn, at: now + delay, repeat: repeat ? delay : 0 });
    return id;
  };
  const clock = {
    now: () => now,
    setTimeout: (fn, ms) => schedule(fn, ms),
    setInterval: (fn, ms) => schedule(fn, ms, true),
    clearTimeout: id => jobs.delete(id), clearInterval: id => jobs.delete(id)
  };
  function tick(ms) {
    const until = now + ms;
    while (true) {
      const next = [...jobs.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > until) break;
      const [id, job] = next;
      now = job.at;
      if (job.repeat) job.at += job.repeat;
      else jobs.delete(id);
      job.fn();
    }
    now = until;
  }
  function open(id, focused, shared = true) {
    const win = new EventTarget(), doc = new EventTarget();
    const tab = { frozen: false, transfers: [], departures: 0, value: { x: .37, best: 712 }, focused };
    doc.hidden = !focused;
    doc.hasFocus = () => tab.focused;
    const store = {
      get: key => db.get(key),
      set(key, value) {
        db.set(key, structuredClone(value));
        for (const listener of subscribers.get(key) || []) listener(value);
      },
      remove: key => db.delete(key),
      keys: () => [...db.keys()],
      watch(key, fn) {
        if (!subscribers.has(key)) subscribers.set(key, new Set());
        const wrapper = v => { if (!tab.frozen) fn(v); };
        subscribers.get(key).add(wrapper);
        return () => subscribers.get(key).delete(wrapper);
      }
    };
    tab.coord = BeatPages.connect({
      id, store: shared ? store : null, document: doc, window: win, clock,
      snapshot: () => ({ ...tab.value }),
      onOwner(active, snapshot) {
        tab.transfers.push(active);
        if (active && snapshot) tab.value = { ...snapshot };
      },
      onDepart() { tab.departures++; }
    });
    tab.focus = () => {
      tab.focused = true; doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
      win.dispatchEvent(new Event('focus'));
    };
    tab.blur = () => {
      tab.focused = false; doc.hidden = true; win.dispatchEvent(new Event('blur'));
      doc.dispatchEvent(new Event('visibilitychange'));
    };
    tab.event = name => win.dispatchEvent(new Event(name));
    tab.coord.start();
    return tab;
  }
  return { db, tick, open, jobs, subscribers };
}

test('one owner, stable manual cycle through tabs, reservations, and transfer state', () => {
  const s = station();
  const a = s.open('a', true), b = s.open('b', false), c = s.open('c', false);
  assert.equal(a.coord.isOwner(), true);
  a.value = { x: .82, best: 830 };
  assert.match(a.coord.jump(), /waiting/);
  assert.equal(a.departures, 1);
  s.tick(421);
  assert.equal(a.coord.isOwner(), false);
  assert.equal(b.coord.isOwner(), true);
  assert.equal(c.coord.isOwner(), false);
  assert.deepEqual(b.value, a.value);
  s.tick(30000);
  assert.equal(b.coord.isOwner(), true, 'source heartbeat leaves the manual hold alone');
  assert.match(a.coord.jump(), /waiting/);
  s.tick(505);
  assert.equal(c.coord.isOwner(), true);
  c.focus(); a.blur();
  assert.equal(s.db.get('owner-v2').holdUntil, 0);
  c.blur(); b.focus();
  s.tick(651);
  assert.equal(b.coord.isOwner(), true);
  assert.equal(a.coord.isOwner(), false);
  assert.equal(c.coord.isOwner(), false);
});

test('latest focused tab wins rapidly replaced requests; duplicate focus cannot steal', () => {
  const s = station();
  const a = s.open('a', true), b = s.open('b', false), c = s.open('c', false);
  b.focus(); c.focus(); a.event('focus');
  s.tick(600);
  assert.equal(c.coord.isOwner(), true);
  assert.equal(b.coord.isOwner(), false);
  assert.equal(a.coord.isOwner(), false);
  s.tick(30000);
  assert.equal(c.coord.isOwner(), true);
});

test('explicit bring cancels an outgoing animated transfer and lost notifications recover', () => {
  const s = station();
  const a = s.open('a', true), b = s.open('b', false);
  a.coord.jump('b');
  assert.equal(a.coord.bring(), true);
  s.tick(601);
  assert.equal(b.coord.isOwner(), false);
  a.value = { x: .22, best: 850 }; a.blur(); a.frozen = true;
  b.focus(); s.tick(651);
  assert.equal(b.coord.isOwner(), true);
  assert.deepEqual(b.value, a.value, 'checkpoint captured on blur survives a frozen source');
  a.frozen = false;
  s.tick(15000);
  assert.equal(a.coord.isOwner(), false);
});

test('a manual reservation expires if the destination stays unseen', () => {
  const s = station();
  const a = s.open('a', true), b = s.open('b', false);
  a.coord.jump('b');
  s.tick(40000);
  assert.equal(b.coord.isOwner(), true);
  s.tick(21000);
  assert.equal(a.coord.isOwner(), true);
  assert.equal(b.coord.isOwner(), false);
});

test('pagehide releases ownership, pageshow registers once; hidden peers cannot steal', () => {
  const s = station();
  const a = s.open('a', true), b = s.open('b', false);
  a.value = { x: .68, best: 900 };
  a.event('pagehide');
  assert.equal(a.coord.isOwner(), false);
  assert.equal(s.db.has('page-v2:a'), false);
  b.focus(); s.tick(651);
  assert.equal(b.coord.isOwner(), true);
  assert.deepEqual(b.value, a.value);
  a.blur(); a.event('pageshow'); a.event('pageshow');
  assert.equal(s.db.has('page-v2:a'), true);
  assert.equal(a.coord.isOwner(), false);
  s.db.set('page-v2:old', { id: 'old', at: -199000 });
  s.tick(15100);
  assert.equal(s.db.has('page-v2:old'), false);
  a.coord.destroy(); b.coord.destroy();
  a.event('pageshow'); b.event('focus');
  assert.equal(s.jobs.size, 0);
  for (const listeners of s.subscribers.values()) assert.equal(listeners.size, 0);
  assert.equal([...s.db.keys()].some(key => key.startsWith('page-v2:')), false);
});

test('preview without GM storage runs independently and reports absent destinations', () => {
  const s = station();
  const a = s.open('a', true, false), b = s.open('b', true, false);
  assert.equal(a.coord.isOwner(), true);
  assert.equal(b.coord.isOwner(), true);
  assert.equal(a.coord.choices().length, 0);
  assert.match(a.coord.jump(), /another webpage/);
  a.coord.stop(); assert.equal(a.coord.isOwner(), false);
  a.coord.start(); assert.equal(a.coord.isOwner(), true);
  assert.equal(s.db.size, 0);
});
