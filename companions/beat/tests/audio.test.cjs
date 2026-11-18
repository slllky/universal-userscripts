const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../src/audio.js'), 'utf8');
const BeatAudio = vm.runInNewContext(code + '\nBeatAudio');

function hardware(mode = 'running') {
  const contexts = [], timers = new Map();
  let sequence = 0;
  function param() {
    return {
      value: 0, events: [],
      setValueAtTime(...args) { this.events.push(['start', ...args]); },
      exponentialRampToValueAtTime(...args) { this.events.push(['ramp', ...args]); },
      setTargetAtTime(...args) { this.events.push(['target', ...args]); }
    };
  }
  class AudioContext {
    constructor() {
      contexts.push(this);
      this.currentTime = 0; this.sampleRate = 22050;
      this.state = mode === 'running' ? 'running' : 'suspended';
      this.nodes = []; this.sources = []; this.destination = {}; this.closes = 0;
    }
    node() {
      const node = {
        connected: false,
        connect() { this.connected = true; },
        disconnect() { this.connected = false; }
      };
      this.nodes.push(node);
      return node;
    }
    source() {
      const node = this.node();
      node.start = at => { node.at = at; };
      node.stop = (at = this.currentTime) => { node.until = at; };
      this.sources.push(node);
      return node;
    }
    createGain() { return Object.assign(this.node(), { gain: param() }); }
    createBiquadFilter() { return Object.assign(this.node(), { frequency: param(), Q: param() }); }
    createOscillator() { return Object.assign(this.source(), { frequency: param() }); }
    createBufferSource() { return this.source(); }
    createBuffer(channels, samples) {
      assert.equal(channels, 1); const data = new Float32Array(samples);
      return { getChannelData: () => data };
    }
    resume() {
      if (mode === 'blocked') return Promise.reject(Error('User gesture required'));
      return new Promise(resolve => { this.unblock = () => { this.state = 'running'; resolve(); }; });
    }
    close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
  }
  const win = {
    AudioContext,
    setInterval(fn) { const id = ++sequence; timers.set(id, fn); return id; },
    clearInterval(id) { timers.delete(id); }
  };
  function tick(time) {
    for (const ctx of contexts) {
      ctx.currentTime = time;
      for (const source of ctx.sources) if (source.until <= time) source.onended?.();
    }
    for (const fn of timers.values()) fn();
  }
  return { win, contexts, timers, tick };
}

test('no audio or timers before gesture; failed playback and unsupported devices stay silent', async () => {
  assert.equal(await BeatAudio.create({}).toggle(), false);
  const h = hardware('blocked'), radio = BeatAudio.create(h.win);
  radio.setVolume(.7); radio.accent('tag'); radio.stop();
  assert.equal(h.contexts.length, 0); assert.equal(h.timers.size, 0);
  assert.equal(await radio.toggle(), false);
  assert.equal(h.contexts.length, 1); assert.equal(h.contexts[0].closes, 1);
  assert.equal(h.timers.size, 0);
});

test('synthesizes and repeats its two-bar phrase, accents score events, releases every node', async () => {
  const h = hardware(), radio = BeatAudio.create(h.win);
  assert.equal(await radio.toggle(), true);
  const ctx = h.contexts[0], level = ctx.nodes[0].gain;
  assert.equal(level.value, .35);
  radio.setVolume(2); radio.setVolume(NaN); radio.setVolume(-1);
  assert.deepEqual(level.events.map(e => e[1]), [1, 0]);
  const bar = 16 * 60 / 108 / 4;
  for (let t = .045; t < bar * 2 + .22; t += .045) h.tick(t);
  const kicks = ctx.sources.filter(node => node.frequency?.events[0]?.[1] === 143);
  const positions = kicks.map(kick => kick.at);
  assert.equal(positions.length, 8);
  assert.ok(Math.abs(positions[7] - positions[0] - 2 * bar) < .0001, 'opening kick returns on tempo');
  assert.ok(ctx.sources.some(source => source.buffer), 'hats and snares use a local noise buffer');
  assert.ok(ctx.sources.some(source => source.type === 'triangle'), 'pitched bass and snare body');
  let before = ctx.sources.length;
  radio.accent({ type: 'unknown' }); assert.equal(ctx.sources.length, before);
  radio.accent({ type: 'pickup' }); radio.accent({ type: 'pickup' });
  assert.equal(ctx.sources.length, before + 1);
  h.tick(ctx.currentTime + .3); before = ctx.sources.length;
  radio.accent({ type: 'tag' }); assert.equal(ctx.sources.length, before + 2);
  assert.ok(ctx.nodes.filter(node => node.connected).length < 50, 'completed notes free audio graph resources');
  assert.equal(await radio.toggle(), false); radio.stop();
  assert.equal(h.timers.size, 0); assert.equal(ctx.closes, 1);
  assert.equal(ctx.nodes.some(node => node.connected), false);
});

test('a throttled tab skips missed bars without stacking a burst of notes', async () => {
  const h = hardware(), radio = BeatAudio.create(h.win);
  await radio.toggle();
  const ctx = h.contexts[0], before = ctx.sources.length;
  h.tick(380);
  const newNotes = ctx.sources.slice(before);
  assert.ok(newNotes.length < 8);
  assert.ok(newNotes.every(node => node.at >= 380 && node.at < 380.2));
  radio.stop();
});

test('stop and rapid retuning during pending resume cannot resurrect an old station', async () => {
  const h = hardware('pending'), radio = BeatAudio.create(h.win);
  const first = radio.toggle();
  assert.equal(h.contexts.length, 1);
  assert.equal(await radio.toggle(), false);
  assert.equal(await first, false, 'pending resume settles on cancellation even without a browser reply');
  const second = radio.toggle();
  assert.equal(h.contexts.length, 2);
  h.contexts[0].unblock();
  assert.equal(h.timers.size, 0);
  h.contexts[1].unblock(); assert.equal(await second, true);
  assert.equal(h.timers.size, 1);
  radio.stop(); radio.stop();
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.contexts.map(ctx => ctx.closes), [1, 1]);
  assert.equal(h.contexts[0].sources.length, 0);
});
