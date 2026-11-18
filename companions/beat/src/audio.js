// An original two-bar break made from oscillators and a short buffer of noise.
const BeatAudio = (() => {
  const sixteenth = 60 / 108 / 4;
  const kicks = new Set([0, 6, 10, 16, 19, 24, 27]);
  const snares = new Set([4, 12, 20, 28]);
  const ghosts = new Set([11, 23, 31]);
  // MIDI note and length in sixteenths. The bar-two answer ends below the tonic.
  const bassline = new Map([
    [0,[40,2.8]], [5,[43,.8]], [7,[47,1.4]], [10,[40,1.2]], [14,[50,1.1]],
    [16,[40,2]], [19,[47,.8]], [22,[45,1.4]], [25,[43,1.7]], [30,[38,1.3]]
  ]);
  const pitch = note => 440 * 2 ** ((note - 69) / 12);

  function create(win) {
    let station = null;
    let volume = .35;
    function voice(s, source, filter, at, duration, level, attack = .004) {
      const envelope = s.ctx.createGain();
      const nodes = filter ? [source, filter, envelope] : [source, envelope];
      for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
      envelope.connect(s.master);
      envelope.gain.setValueAtTime(.0001, at);
      envelope.gain.exponentialRampToValueAtTime(level, at + attack);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
      const release = () => {
        if (!s.voices.delete(source)) return;
        source.onended = null;
        for (const node of nodes) node.disconnect();
      };
      s.voices.set(source, release);
      source.onended = release;
      source.start(at);
      source.stop(at + duration + .006);
    }

    function tone(s, at, from, to, duration, level, type = 'sine', attack) {
      const osc = s.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(from, at);
      if (from !== to) osc.frequency.exponentialRampToValueAtTime(to, at + duration * .83);
      voice(s, osc, null, at, duration, level, attack);
    }

    function hiss(s, at, hz, duration, level, type = 'highpass', endHz) {
      const source = s.ctx.createBufferSource();
      source.buffer = s.noise;
      const filter = s.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(hz, at);
      filter.Q.value = type === 'bandpass' ? 1.3 : .72;
      if (endHz) filter.frequency.exponentialRampToValueAtTime(endHz, at + duration);
      voice(s, source, filter, at, duration, level);
    }

    function step(s, index, at) {
      if (kicks.has(index)) tone(s, at, 143, 44, .18, .62);
      if (snares.has(index)) {
        hiss(s, at, 1950, .15, .28, 'bandpass');
        tone(s, at, 200, 119, .095, .20, 'triangle');
      } else if (ghosts.has(index)) hiss(s, at, 1640, .066, .075, 'bandpass');
      if (index % 2 === 0 && index !== 14 && index !== 30) {
        hiss(s, at, 6700, index === 26 ? .14 : .043, index % 4 === 0 ? .10 : .068);
      }
      const note = bassline.get(index);
      if (note) {
        const hz = pitch(note[0]);
        tone(s, at + .014, hz, hz, note[1] * sixteenth, .35, 'triangle', .012);
      }
    }

    function schedule(s) {
      if (station !== s || s.ctx.state !== 'running') return;
      const now = s.ctx.currentTime;
      if (s.next < now) {
        // When the browser throttles timers, skip missed notes in musical time.
        const missed = Math.ceil((now - s.next) / sixteenth);
        s.next += missed * sixteenth;
        s.index = (s.index + missed) % 32;
      }
      while (s.next <= now + .13) {
        step(s, s.index, s.next + (s.index % 2 ? .012 : 0));
        s.index = (s.index + 1) % 32;
        s.next += sixteenth;
      }
    }

    function stop() {
      const s = station;
      if (!s) return;
      station = null;
      s.cancelStart?.();
      if (s.timer !== null) win.clearInterval(s.timer);
      s.master?.disconnect();
      for (const [source, release] of s.voices) {
        try { source.stop(); } catch { /* A source may already have ended. */ }
        release();
      }
      if (s.ctx.state !== 'closed') {
        try { Promise.resolve(s.ctx.close()).catch(() => {}); } catch { /* Context already closed. */ }
      }
    }

    async function toggle() {
      if (station) { stop(); return false; }
      const AudioContext = win.AudioContext || win.webkitAudioContext;
      if (!AudioContext) return false;
      let s;
      try {
        const ctx = new AudioContext();
        s = { ctx, voices: new Map(), timer: null, index: 0, next: 0, lastAccent: -1 };
        station = s;
        // Resume within the same user gesture. A later stop may cancel this start.
        if (ctx.state !== 'running') {
          const cancelled = new Promise(resolve => { s.cancelStart = resolve; });
          await Promise.race([ctx.resume(), cancelled]);
          s.cancelStart = null;
        }
        if (station !== s) return false;
        if (ctx.state !== 'running') { stop(); return false; }
        s.master = ctx.createGain();
        s.master.gain.value = volume;
        s.master.connect(ctx.destination);
        s.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .33), ctx.sampleRate);
        const channel = s.noise.getChannelData(0);
        for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
        s.next = ctx.currentTime + .025;
        schedule(s);
        s.timer = win.setInterval(() => schedule(s), 45);
        return true;
      } catch {
        if (s && station === s) stop();
        return false;
      }
    }

    function setVolume(value) {
      if (!Number.isFinite(value)) return;
      volume = Math.min(1, Math.max(0, value));
      if (station?.master) station.master.gain.setTargetAtTime(volume, station.ctx.currentTime, .016);
    }

    function accent(event) {
      const s = station;
      if (!s?.master || s.ctx.state !== 'running') return;
      const type = typeof event === 'string' ? event : event?.type;
      const at = s.ctx.currentTime + .008;
      if (at - s.lastAccent < .26) return;
      if (type === 'line') {
        tone(s, at, pitch(71), pitch(76), .125, .11, 'triangle');
        tone(s, at + .12, pitch(76), pitch(76), .19, .11, 'triangle');
      } else if (type === 'tag') {
        hiss(s, at, 2600, .12, .17, 'bandpass', 1100);
        hiss(s, at + .12, 1300, .1, .14, 'bandpass', 3200);
      } else if (type === 'pickup') tone(s, at, pitch(76), pitch(83), .085, .085);
      else if (type === 'action' && event.move === 'grind') hiss(s, at, 900, .16, .10, 'bandpass', 2150);
      else return;
      s.lastAccent = at;
    }

    return { toggle, stop, setVolume, accent };
  }
  return { create };
})();
