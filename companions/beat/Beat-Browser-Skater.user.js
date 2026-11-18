// ==UserScript==
// @name         Beat — Browser Skater
// @namespace    aseerr-beat-browser-skater
// @version      2.0.0
// @description  Skate the page with Beat, chain inline tricks, paint tags and tune your pirate radio.
// @author       Aseerr customization; classic sprite sheet by xugggys; character by SEGA
// @match        http://*/*
// @match        https://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/beat/Beat-Browser-Skater.meta.js
// @downloadURL  https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/beat/Beat-Browser-Skater.user.js
// ==/UserScript==

(function(module){
"use strict";
const BEAT_PREVIEW = false;
// Beat's simulation uses viewport CSS pixels, seconds and a shared skate pivot at (64, 116).
const BeatEngine = (() => {
  'use strict';

  const defaults = Object.freeze({
    mode: 'idle', scale: 1.5, hidden: false, speed: 1, delay: 4, ambient: true,
    interact: true, fx: 'full', motion: 'system', skin: 'remix', accent: 'lime', offset: 4
  });
  const moves = Object.freeze({
    jump: 'Pop hop', grab: 'Mute grab', grind: 'Soul grind', tag: 'Spray tag',
    boost: 'Power stride', dance: 'Dance break'
  });
  const lines = Object.freeze({sidewinder: 'Sidewinder', airmail: 'Air mail'});
  // Each beat lists its duration, horizontal travel and highest lift in sprite pixels.
  const tricks = {
    jump: {seconds: .88, travel: 64, lift: 43, points: 80},
    grab: {seconds: 1.22, travel: 78, lift: 58, points: 150},
    grind: {seconds: 1.56, travel: 124, lift: 18, points: 180},
    tag: {seconds: 1.30, travel: 0, lift: 0, points: 120},
    boost: {seconds: 1.10, travel: 146, lift: 0, points: 90},
    dance: {seconds: 8, travel: 0, lift: 0, points: 110}
  };
  const choreography = {
    sidewinder: [
      {id: 'boost', time: .65}, {id: 'grind', time: 1.42},
      {id: 'jump', time: .70}, {id: 'tag', time: 1.05}
    ],
    airmail: [
      {id: 'jump', time: .75}, {id: 'grab', time: 1.25},
      {id: 'boost', time: .72}, {id: 'dance', time: 1.45}
    ]
  };
  const comboWindow = 4;
  const inkColors = ['lime', 'pink', 'cyan'];
  const marks = ['bolt', 'cat', 'skull'];
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const bounded = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const pick = (value, options, fallback) => options.includes(value) ? value : fallback;
  const arc = t => 4 * t * (1 - t);
  const smooth = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function normalize(input) {
    const s = input && typeof input === 'object' ? input : {};
    const num = (key, min, max) => bounded(finite(s[key], defaults[key]), min, max);
    const bool = key => typeof s[key] === 'boolean' ? s[key] : defaults[key];
    return {
      mode: pick(s.mode, ['idle', 'follow'], defaults.mode),
      scale: typeof s.scale === 'string' && s.scale.trim() && Number.isFinite(Number(s.scale))
        ? bounded(Number(s.scale), 1, 3) : num('scale', 1, 3),
      hidden: bool('hidden'), speed: num('speed', .5, 2), delay: Math.round(num('delay', 1, 8)),
      ambient: bool('ambient'), interact: bool('interact'),
      fx: pick(s.fx, ['full', 'low', 'off'], defaults.fx),
      motion: pick(s.motion, ['system', 'full', 'reduced'], defaults.motion),
      skin: pick(s.skin, ['classic', 'remix'], defaults.skin),
      accent: pick(s.accent, inkColors, defaults.accent), offset: Math.round(num('offset', 0, 80))
    };
  }
  function emptyCombo() { return {count: 0, score: 0, remaining: 0}; }
  function cleanScore(value) { return Math.floor(bounded(finite(value, 0), 0, 999999999)); }

  class World {
    constructor(settings = {}, width = 1000, height = 600, random = Math.random) {
      this.settings = normalize(settings);
      this.random = random;
      this.time = 0;
      this.systemReduced = false;
      this.width = Math.max(1, finite(width, 1));
      this.height = Math.max(1, finite(height, 1));
      this.hero = {
        x: this.boundX(this.width * .32), y: this.ground, direction: 1,
        action: 'idle', elapsed: 0, progress: 0, alpha: 1
      };
      this.trick = null;
      this.line = null;
      this.rail = null;
      this.tag = null;
      this.tagCount = 0;
      this.transit = null;
      this.events = [];
      this.combo = emptyCombo();
      this.best = 0;
      this.lastTrickScored = '';
      this.ambientAt = this.time + 11;
      this.lastAmbient = '';
      this.pauseAt = this.time + 7;
      this.pauseUntil = 0;
      this.nextCan = 0;
      this.clearTrail();
    }
    get scale() { return Math.min(this.settings.scale, this.width / 128, this.height / 128); }
    get ground() { return Math.max(116 * this.scale, this.height - 12 * this.scale - this.settings.offset); }
    get gentle() {
      return this.settings.motion === 'reduced' || (this.settings.motion === 'system' && this.systemReduced);
    }
    boundX(x) { return bounded(x, 64 * this.scale, Math.max(64 * this.scale, this.width - 64 * this.scale)); }
    boundY(y) { return bounded(y, 116 * this.scale, this.ground); }
    setReduced(value) { this.systemReduced = Boolean(value); }
    setBest(value) { this.best = Math.max(this.best, cleanScore(value)); }
    signal(type, fields = {}) {
      if (this.events.length >= 128) this.events.shift();
      this.events.push({
        type, x: this.hero.x, y: this.hero.y, direction: this.hero.direction,
        move: this.trick?.id || this.hero.action, score: this.combo.score, ...fields
      });
    }
    takeEvents() { return this.events.splice(0); }
    clearTrail() {
      this.trail = [];
      this.cans = [];
      this.lastSample = -Infinity;
      this.lastDrop = null;
    }
    apply(patch) {
      const was = this.settings;
      const next = normalize({...was, ...patch});
      const oldGround = this.ground;
      this.settings = next;
      this.fit(this.width, this.height, oldGround);
      if (was.mode !== next.mode || was.hidden !== next.hidden || was.delay !== next.delay) this.clearTrail();
      if (was.mode !== next.mode || (!was.hidden && next.hidden)) {
        this.trick = this.line = this.rail = this.tag = this.transit = null;
        this.hero.y = this.ground;
        this.pose('idle', 0, 0);
        this.hero.alpha = 1;
        this.ambientAt = this.time + 11;
      }
    }
    resize(width, height) {
      const oldWidth = this.width, oldHeight = this.height, oldGround = this.ground;
      this.width = Math.max(1, finite(width, 1));
      this.height = Math.max(1, finite(height, 1));
      this.fit(oldWidth, oldHeight, oldGround);
    }
    fit(oldWidth, oldHeight, oldGround) {
      const x = n => this.boundX(n * this.width / oldWidth);
      const y = n => this.boundY(this.ground + (n - oldGround) * this.height / oldHeight);
      this.hero.x = x(this.hero.x);
      this.hero.y = y(this.hero.y);
      if (this.trick) {
        this.trick.x0 = x(this.trick.x0);
        this.trick.x1 = x(this.trick.x1);
        this.trick.y0 = y(this.trick.y0);
        this.drawTrick();
      }
      if (this.transit) this.transit.base = y(this.transit.base);
      if (this.tag) {
        this.tag.x = bounded(this.tag.x * this.width / oldWidth, 0, this.width);
        this.tag.y = bounded(this.tag.y * this.height / oldHeight, 0, this.height);
      }
      // Waypoints are page-local pixels. Resizing discards coordinates recorded in the old layout.
      if (this.width !== oldWidth || this.height !== oldHeight) this.clearTrail();
    }
    point(x, y) {
      if (this.settings.hidden || this.settings.mode !== 'follow' || this.transit ||
          !Number.isFinite(x) || !Number.isFinite(y) || this.time - this.lastSample < .06) return false;
      this.lastSample = this.time;
      const px = bounded(x, 0, this.width), py = bounded(y, 0, this.height);
      this.trail.push({x: this.boundX(px), y: this.boundY(py), at: this.time});
      if (this.trail.length > 300) this.trail.shift();
      const previous = this.lastDrop;
      if (!previous || (this.time - previous.at >= .14 && Math.hypot(px - previous.x, py - previous.y) >= 48)) {
        this.lastDrop = {x: px, y: py, at: this.time};
        // Reachable centers keep corners collectible even when a large sprite must stay on-screen.
        const inset = 10 * this.scale;
        const cx = bounded(px, Math.min(48 * this.scale, this.width / 2), Math.max(this.width / 2, this.width - 48 * this.scale));
        const cy = bounded(py, Math.min(48 * this.scale, this.height / 2), Math.max(this.height / 2, this.ground - inset));
        this.cans.push({id: ++this.nextCan, x: cx, y: cy, age: 0});
        if (this.cans.length > 60) this.cans.shift();
      }
      return true;
    }
    perform(id) {
      if (this.settings.hidden || this.transit || (!has(moves, id) && !has(lines, id))) return false;
      if (this.trick && this.trick.source !== 'ambient') return false;
      if (this.trick) this.hero.y = this.trick.y0;
      this.trick = this.rail = null;
      this.ambientAt = this.time + 16;
      if (has(lines, id)) {
        this.line = {id, index: 0, total: choreography[id].length};
        this.startLineBeat();
      } else {
        this.startTrick(id, 'manual', tricks[id].seconds);
      }
      return true;
    }
    startLineBeat() {
      const beat = choreography[this.line.id][this.line.index];
      this.startTrick(beat.id, 'line', beat.time);
    }
    startTrick(id, source, seconds) {
      const h = this.hero, spec = tricks[id];
      let dir = h.direction;
      const travel = spec.travel * this.scale;
      if (travel && Math.abs(this.boundX(h.x + dir * travel) - h.x) < travel * .55) {
        const other = Math.abs(this.boundX(h.x - dir * travel) - h.x);
        if (other > Math.abs(this.boundX(h.x + dir * travel) - h.x)) dir *= -1;
      }
      this.trick = {
        id, source, seconds, elapsed: 0, direction: dir, x0: h.x, y0: h.y,
        x1: this.boundX(h.x + dir * travel)
      };
      h.direction = dir;
      if (id === 'tag') {
        const index = (inkColors.indexOf(this.settings.accent) + this.tagCount++) % marks.length;
        this.tag = {
          x: bounded(h.x + dir * 29 * this.scale, 0, this.width),
          y: bounded(h.y - 49 * this.scale, 0, this.height), direction: dir,
          accent: this.settings.accent, kind: marks[index], progress: 0, alpha: 1, age: 0
        };
      }
      this.drawTrick();
      this.signal('action', {move: id, source});
    }
    pose(action, elapsed, progress) {
      Object.assign(this.hero, {action, elapsed, progress: bounded(progress, 0, 1)});
    }
    drawTrick() {
      const t = this.trick;
      const p = bounded(t.elapsed / t.seconds, 0, 1);
      const spec = tricks[t.id];
      let along = p, lift = 0, action = t.id, frame = p;
      if (t.id === 'jump' || t.id === 'grab') {
        if (p < .86) {
          const air = p / .86;
          lift = spec.lift * (t.id === 'grab' ? Math.sin(Math.PI * air) ** .79 : arc(air));
          frame = air;
        } else {
          action = 'land';
          frame = (p - .86) / .14;
        }
      } else if (t.id === 'grind') {
        const high = Math.min(spec.lift * this.scale, t.y0 - 116 * this.scale);
        this.rail = {
          x1: lerp(t.x0, t.x1, .18), x2: lerp(t.x0, t.x1, .78),
          y: this.boundY(t.y0 - high), alpha: this.gentle ? 1 : Math.min(1, p * 8 + .35, (1 - p) * 8)
        };
        if (p < .18) {
          const entry = p / .18;
          lift = spec.lift * entry + 11 * arc(entry);
          action = 'jump'; frame = entry;
        } else if (p < .78) {
          lift = spec.lift; frame = (p - .18) / .60;
        } else {
          const exit = (p - .78) / .22;
          lift = spec.lift * (1 - exit) + 7 * arc(exit);
          action = exit < .72 ? 'jump' : 'land'; frame = exit;
        }
      } else if (t.id === 'boost') {
        along = smooth(p);
      } else if (t.id === 'tag' && this.tag) {
        this.tag.progress = bounded((p - .14) / .70, 0, 1);
      } else if (t.id === 'dance') {
        frame = (t.elapsed / .95) % 1;
      }
      this.hero.x = this.boundX(this.gentle ? t.x0 : lerp(t.x0, t.x1, along));
      this.hero.y = this.boundY(t.y0 - (this.gentle ? 0 : lift) * this.scale);
      if (this.gentle) {
        action = t.id;
        frame = .5;
        if (t.id === 'grind') {
          this.rail.x1 = Math.max(0, this.hero.x - 30 * this.scale);
          this.rail.x2 = Math.min(this.width, this.hero.x + 30 * this.scale);
          this.rail.y = this.hero.y;
        }
      }
      this.pose(action, t.elapsed, frame);
    }
    award(points, kind, trickId = '') {
      if (trickId && trickId === this.lastTrickScored) return;
      if (trickId) this.lastTrickScored = trickId;
      this.combo.count++;
      const multiplier = 1 + Math.min(this.combo.count - 1, 5) * .20;
      const amount = Math.round(points * multiplier);
      this.combo.score = cleanScore(this.combo.score + amount);
      this.combo.remaining = comboWindow;
      this.signal(kind, {points: amount, move: trickId || this.hero.action});
    }
    bank() {
      const score = this.combo.score;
      if (score) {
        this.signal('bank', {score});
        if (score > this.best) {
          this.best = score;
          this.signal('best', {score});
        }
      }
      this.combo = emptyCombo();
      this.lastTrickScored = '';
    }
    finishTrick() {
      const t = this.trick;
      if (t.id === 'tag' && this.tag) {
        this.tag.progress = 1;
        this.tag.age = 0;
        this.signal('tag');
      }
      if (t.id === 'jump' || t.id === 'grab' || t.id === 'grind') this.signal('land');
      if (t.source !== 'ambient') this.award(tricks[t.id].points, 'trick', t.id);
      this.trick = this.rail = null;
      this.hero.y = t.y0;
      this.pose('idle', 0, 0);
      if (this.line) {
        this.line.index++;
        if (this.line.index < this.line.total) this.startLineBeat();
        else {
          this.award(220, 'line', this.line.id);
          this.line = null;
        }
      }
    }
    follow(dt) {
      let budget = 180 * this.settings.speed * dt;
      let moving = false;
      const h = this.hero;
      // Consume as many reached samples as the distance budget allows. This also drains stationary samples.
      while (this.trail.length && this.trail[0].at <= this.time - this.settings.delay) {
        const goal = this.trail[0];
        const dx = goal.x - h.x, dy = goal.y - h.y;
        const distance = Math.hypot(dx, dy);
        const amount = Math.min(distance, budget);
        if (amount > 0) {
          h.x = this.boundX(h.x + dx * amount / distance);
          h.y = this.boundY(h.y + dy * amount / distance);
          if (Math.abs(dx) > 1) h.direction = dx < 0 ? -1 : 1;
          moving = true;
          budget -= amount;
        }
        if (distance - amount > .001) break;
        this.trail.shift();
      }
      return moving;
    }
    street(dt) {
      const h = this.hero;
      h.y = this.ground;
      if (this.gentle || this.width - 128 * this.scale < 2) return false;
      if (this.time >= this.pauseAt) {
        this.pauseUntil = this.time + 1.1;
        this.pauseAt = this.time + 7 + this.random() * 7;
      }
      if (this.time < this.pauseUntil) return false;
      const next = h.x + h.direction * 95 * this.settings.speed * dt;
      h.x = this.boundX(next);
      if (next !== h.x) h.direction *= -1;
      return true;
    }
    ambient() {
      const choices = ['jump', 'boost', 'tag', 'grab', 'grind'].filter(id => id !== this.lastAmbient);
      const chosen = choices[bounded(Math.floor(this.random() * choices.length), 0, choices.length - 1)];
      this.lastAmbient = chosen;
      this.ambientAt = this.time + 13 + this.random() * 9;
      this.startTrick(chosen, 'ambient', tricks[chosen].seconds);
    }
    updateCans(dt) {
      const h = this.hero, s = this.scale;
      const canCollect = !this.trick && !this.transit;
      for (let i = this.cans.length - 1; i >= 0; i--) {
        const can = this.cans[i];
        can.age += dt;
        if (can.age >= 60) { this.cans.splice(i, 1); continue; }
        if (can.age + 1e-8 < this.settings.delay || !canCollect) continue;
        const closestX = bounded(can.x, h.x - 18 * s, h.x + 18 * s);
        const closestY = bounded(can.y, h.y - 65 * s, h.y + 3 * s);
        if (Math.hypot(can.x - closestX, can.y - closestY) > 10 * s) continue;
        this.cans.splice(i, 1);
        this.award(25, 'can');
        this.signal('pickup', {x: can.x, y: can.y});
      }
    }
    arrive() { return this.travel('arrive'); }
    depart() { return this.travel('depart'); }
    travel(kind) {
      this.clearTrail();
      this.tag = this.rail = null;
      this.transit = {kind, elapsed: 0, duration: kind === 'arrive' ? .65 : .42, base: this.hero.y};
      this.hero.alpha = kind === 'arrive' && !this.gentle ? 0 : 1;
      this.signal(kind);
      return true;
    }
    tick(dt) {
      this.time += dt;
      const h = this.hero;
      if (this.transit) {
        const t = this.transit;
        t.elapsed += dt;
        const p = Math.min(1, t.elapsed / t.duration);
        const away = t.kind === 'arrive' ? 1 - p : p;
        h.y = this.boundY(t.base - (this.gentle ? 0 : 40 * this.scale * smooth(away)));
        h.alpha = this.gentle ? 1 : 1 - smooth(away);
        this.pose(this.gentle ? 'idle' : 'jump', t.elapsed, this.gentle ? .5 : p);
        if (p >= 1) {
          this.transit = null;
          h.y = t.base;
          if (this.trick) this.drawTrick();
          else this.pose('idle', 0, 0);
        }
        return;
      }
      h.alpha = 1;
      const holdsCombo = this.trick && this.trick.source !== 'ambient' && this.trick.id !== this.lastTrickScored;
      if (this.combo.count && !holdsCombo) {
        this.combo.remaining = Math.max(0, this.combo.remaining - dt);
        if (this.combo.remaining <= 1e-8) this.bank();
      }
      if (this.tag && this.trick?.id !== 'tag') {
        this.tag.age += dt;
        this.tag.alpha = bounded(7 - this.tag.age, 0, 1);
        if (this.tag.age >= 7) this.tag = null;
      }
      if (this.trick) {
        const t = this.trick;
        t.elapsed = Math.min(t.seconds, t.elapsed + dt * this.settings.speed);
        this.drawTrick();
        if (t.seconds - t.elapsed < 1e-8) this.finishTrick();
      } else if (this.settings.mode === 'idle' && this.settings.ambient && !this.gentle && this.time >= this.ambientAt) {
        this.ambient();
      } else {
        const moving = this.settings.mode === 'follow' ? this.follow(dt) : this.street(dt);
        const action = moving ? 'skate' : 'idle';
        const elapsed = h.action === action ? h.elapsed + dt * this.settings.speed : 0;
        this.pose(action, elapsed, this.gentle ? .5 : (elapsed / (moving ? .69 : 1.5)) % 1);
      }
      this.updateCans(dt);
    }
    step(seconds) {
      if (this.settings.hidden || !Number.isFinite(seconds) || seconds <= 0) return;
      // Substeps keep the same collision and choreography rules for fast and slow displays.
      let left = Math.min(seconds, 120);
      while (left > 1e-8) {
        const dt = Math.min(left, 1 / 30);
        this.tick(dt);
        left -= dt;
      }
    }
    snapshot() {
      // Tab handoff shares the session, never the cursor route or painted page.
      // A cursor-following skater arrives at street level on the destination.
      const follow = this.settings.mode === 'follow';
      const t = this.trick;
      const x = n => follow ? .5 : n / this.width;
      return {
        version: 1, x: x(this.hero.x), direction: this.hero.direction, best: this.best,
        combo: {...this.combo}, lastTrickScored: this.lastTrickScored, tagCount: this.tagCount,
        trick: t && {
          id: t.id, source: t.source, elapsed: t.elapsed, x0: x(t.x0), x1: x(t.x1),
          direction: t.direction
        },
        line: this.line && {id: this.line.id, index: this.line.index}
      };
    }
    restore(saved) {
      if (!saved || saved.version !== 1) { this.clearTrail(); return false; }
      this.clearTrail();
      this.events.length = 0;
      this.trick = this.line = this.rail = this.tag = this.transit = null;
      this.setBest(saved.best);
      this.tagCount = cleanScore(saved.tagCount);
      const c = saved.combo || {};
      const remaining = bounded(finite(c.remaining, 0), 0, comboWindow);
      this.combo = remaining && cleanScore(c.count) && cleanScore(c.score)
        ? {remaining, count: cleanScore(c.count), score: cleanScore(c.score)} : emptyCombo();
      this.lastTrickScored = has(moves, saved.lastTrickScored) || has(lines, saved.lastTrickScored) ? saved.lastTrickScored : '';
      const x = n => this.boundX(bounded(finite(n, .5), 0, 1) * this.width);
      Object.assign(this.hero, {x: x(saved.x), y: this.ground, direction: saved.direction === -1 ? -1 : 1, alpha: 1});
      this.pose('idle', 0, 0);
      this.ambientAt = this.time + 11;
      const t = saved.trick;
      if (!t || !has(moves, t.id) || !['line', 'manual', 'ambient'].includes(t.source)) return true;
      let seconds = tricks[t.id].seconds;
      if (t.source === 'line') {
        const line = saved.line;
        if (!line || !has(lines, line.id) || !Number.isInteger(line.index)) return true;
        const beats = choreography[line.id];
        if (beats[line.index]?.id !== t.id) return true;
        this.line = {id: line.id, index: line.index, total: beats.length};
        seconds = beats[line.index].time;
      }
      this.trick = {
        id: t.id, source: t.source, direction: t.direction === -1 ? -1 : 1,
        x0: x(t.x0), x1: x(t.x1), y0: this.ground, seconds,
        elapsed: bounded(finite(t.elapsed, 0), 0, seconds)
      };
      this.hero.direction = this.trick.direction;
      // A tag already in progress stays on its old page. The gesture itself finishes here.
      this.drawTrick();
      return true;
    }
  }

  return Object.freeze({World, defaults, normalize, moves, lines});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BeatEngine;

// Only anonymous live page IDs and the engine's portable skate state cross tabs.
const BeatPages = (() => {
  const PAGE = 'page-v2:';
  const OWNER = 'owner-v2';
  const REQUEST = 'request-v2';
  const HEARTBEAT = 15000;
  const EXPIRE = 180000; // Background browser timers may run only once a minute.
  const HOLD = 45000;    // Give the skater time to reach a manually chosen tab.
  const REQUEST_LIFE = 5000;
  const DEPARTURE = 420; // Match the skater's animated exit.
  const FALLBACK = 650;

  function connect(options = {}) {
    const win = options.window || window;
    const doc = options.document || document;
    const clock = options.clock || {
      now: Date.now,
      setTimeout: (fn, ms) => win.setTimeout(fn, ms),
      clearTimeout: id => win.clearTimeout(id),
      setInterval: (fn, ms) => win.setInterval(fn, ms),
      clearInterval: id => win.clearInterval(id)
    };
    const token = () => win.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + '-' + clock.now().toString(36);
    const id = options.id || token();
    const born = clock.now();
    // A preview without userscript storage has its own, independent station.
    const memory = new Map();
    const store = options.store || {
      get: key => memory.get(key), set: (key, v) => memory.set(key, v),
      remove: key => memory.delete(key), keys: () => Array.from(memory.keys()),
      watch: () => () => {}
    };
    let live = false, enabled = false, destroyed = false, active = false, focused = false;
    let pulse = 0, transfer = 0, pending = '', departing = null, unwatch = [];
    const read = key => store.get(key, null);
    const ticket = () => read(OWNER);
    const state = () => options.snapshot?.() ?? null;
    const hasFocus = () => !doc.hidden && (doc.hasFocus?.() ?? true);
    const fresh = page => page && clock.now() - page.at < EXPIRE;

    function register() {
      const page = { id, born, at: clock.now(), visible: !doc.hidden, focused: hasFocus() };
      if (active) page.snapshot = state();
      store.set(PAGE + id, page);
    }

    function roster(prune = false) {
      const entries = [];
      for (const key of store.keys()) {
        if (!key.startsWith(PAGE)) continue;
        const page = read(key);
        if (fresh(page)) entries.push(page);
        else if (prune) store.remove(key);
      }
      return entries.sort((a, b) => a.born - b.born || a.id.localeCompare(b.id));
    }

    function currentRequest(req, owner) {
      return req && owner && req.from === owner.id && req.ticket === owner.ticket &&
        clock.now() - req.at < REQUEST_LIFE && fresh(read(PAGE + req.to));
    }

    function sync() {
      if (!live) return;
      const owner = ticket();
      const next = owner?.id === id;
      if (active !== next) {
        active = next;
        options.onOwner?.(next, next ? owner.snapshot : null);
        register();
      }
      if (next && owner.holdUntil && hasFocus()) {
        // Receipt of a manual hop releases its reservation as soon as it is seen.
        store.set(OWNER, { ...owner, holdUntil: 0 });
      }
    }

    function assign(to, snapshot, holdUntil = 0) {
      store.set(OWNER, { id: to, ticket: token(), snapshot, holdUntil });
      sync();
    }

    function saved(owner) {
      if (active && owner?.id === id) return state();
      return (owner?.id && read(PAGE + owner.id)?.snapshot) ?? owner?.snapshot ?? null;
    }

    function finish(req) {
      if (!live || read(REQUEST)?.nonce !== req.nonce) return;
      const owner = ticket();
      if (!currentRequest(req, owner)) return;
      // Snapshot the source before its departure animation changes its pose.
      const snapshot = departing?.nonce === req.nonce ? departing.snapshot : saved(owner);
      const destination = read(PAGE + req.to);
      assign(req.to, snapshot, req.manual && !destination.focused ? clock.now() + HOLD : 0);
    }

    function receive() {
      if (!live) return;
      const req = read(REQUEST);
      const owner = ticket();
      if (!currentRequest(req, owner) || ![req.from, req.to, req.sender].includes(id)) return;
      if (pending === req.nonce) return;
      pending = req.nonce;
      clock.clearTimeout(transfer);
      if (req.from === id) {
        departing = { nonce: req.nonce, snapshot: state() };
        if (doc.hidden) { finish(req); return; }
        options.onDepart?.();
        transfer = clock.setTimeout(() => finish(req), DEPARTURE);
      } else {
        // A suspended source cannot acknowledge a request. The receiver (or
        // sender of a manual hop) can finish it using the source's last checkpoint.
        transfer = clock.setTimeout(() => finish(req), FALLBACK);
      }
    }

    function request(to, manual) {
      const owner = ticket();
      if (!owner?.id || !fresh(read(PAGE + owner.id))) {
        const hold = manual && !read(PAGE + to)?.focused;
        assign(to, saved(owner), hold ? clock.now() + HOLD : 0);
        return;
      }
      if (to === owner.id) return;
      const previous = read(REQUEST);
      if (!manual && (owner.holdUntil > clock.now() ||
          (currentRequest(previous, owner) && (previous.manual || previous.to === to)))) return;
      store.set(REQUEST, { from: owner.id, ticket: owner.ticket, to, sender: id, at: clock.now(), nonce: token(), manual });
      receive();
    }

    function activity() {
      if (!live) return;
      register();
      const nowFocused = hasFocus();
      const gained = nowFocused && !focused;
      focused = nowFocused;
      if (gained) request(id, false);
      // A visible source might become hidden during its departure animation.
      const req = read(REQUEST);
      if (doc.hidden && req?.from === id && currentRequest(req, ticket())) finish(req);
      sync();
    }

    function heartbeat() {
      if (!live) return;
      register();
      roster(true);
      sync();
      const owner = ticket();
      const reservedButUnseen = owner?.holdUntil && owner.holdUntil <= clock.now();
      if (hasFocus() && (!fresh(owner?.id && read(PAGE + owner.id)) || reservedButUnseen)) request(id, false);
    }

    function choices() {
      const from = ticket()?.id || id;
      return roster().filter(page => page.id !== from).map(page => ({ id: page.id, visible: page.visible }));
    }

    function jump(targetId) {
      if (!live) return 'Beat is off air.';
      const pages = roster();
      const from = ticket()?.id || id;
      const index = pages.findIndex(page => page.id === from);
      const target = targetId ? pages.find(page => page.id === targetId) :
        pages[(index + 1) % pages.length];
      if (!target || target.id === from) return 'Open another webpage with Beat enabled to hop tabs.';
      request(target.id, true);
      return target.visible ? 'Beat is hopping to the next page.' : 'Beat is waiting in another tab. Switch over to see him.';
    }

    function bring() {
      if (!live) return false;
      const owner = ticket();
      if (owner?.id !== id) assign(id, saved(owner));
      else if (currentRequest(read(REQUEST), owner)) assign(id, state()); // Cancel an outgoing transfer.
      else sync();
      return active;
    }

    function resume() {
      if (!enabled || destroyed || live) return;
      live = true;
      register();
      unwatch = [store.watch(OWNER, sync), store.watch(REQUEST, receive)];
      win.addEventListener('focus', activity);
      win.addEventListener('blur', activity);
      doc.addEventListener('visibilitychange', activity);
      activity();
      heartbeat();
      pulse = clock.setInterval(heartbeat, HEARTBEAT);
    }

    function suspend() {
      if (!live) return;
      live = false;
      clock.clearInterval(pulse);
      clock.clearTimeout(transfer);
      unwatch.forEach(off => off?.());
      unwatch = [];
      win.removeEventListener('focus', activity);
      win.removeEventListener('blur', activity);
      doc.removeEventListener('visibilitychange', activity);
      const owner = ticket();
      if (owner?.id === id) {
        const req = read(REQUEST);
        const pages = roster().filter(page => page.id !== id);
        const due = currentRequest(req, owner);
        const to = due ? pages.find(page => page.id === req.to) :
          pages.find(page => page.focused) || pages.find(page => page.visible);
        const snapshot = due && departing?.nonce === req.nonce ? departing.snapshot : state();
        assign(to?.id || null, snapshot, due && req.manual && !to?.focused ? clock.now() + HOLD : 0);
      }
      store.remove(PAGE + id);
      if (active) options.onOwner?.(false, null);
      active = false;
      focused = false;
      pending = '';
      departing = null;
    }

    function start() {
      if (destroyed || enabled) return;
      enabled = true;
      win.addEventListener('pagehide', suspend);
      win.addEventListener('pageshow', resume);
      resume();
    }

    function stop() {
      enabled = false;
      suspend();
      win.removeEventListener('pagehide', suspend);
      win.removeEventListener('pageshow', resume);
    }

    return {
      start, stop, bring, jump, choices, isOwner: () => active,
      destroy() { stop(); destroyed = true; }
    };
  }
  return { connect };
})();

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

// Draw in viewport CSS pixels. The host owns the backing resolution and DPR transform.
const BeatDraw = (() => {
  'use strict';
  const ink = '#162024', paper = '#fff9d6', pale = '#d8f9dc';
  const inks = {lime:'#c0fb33',pink:'#ff549d',cyan:'#48dbde'};
  const stickers = {bolt:0,cat:1,skull:2,can:3};
  const timing = {idle:290,skate:135,boost:105,jump:125,grab:155,grind:140,tag:165,dance:145,land:125};
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const bounded = v => clamp(v,0,1);
  const cycle = t => t-Math.floor(t);
  const fullCircle = 2*Math.PI;
  function frameFor(actor, meta, gentle) {
    const key = meta.animations[actor.action]?.length ? actor.action : 'idle';
    const seq = meta.animations[key];
    if (!seq?.length) return 0;
    if (gentle) return seq[key==='idle'||key==='skate' ? 0 : Math.floor(seq.length/2)];
    const loops = key==='skate'||key==='idle'||key==='dance'||key==='grind'||key==='boost';
    const durations = meta.durations?.[key];
    const weighted = Array.isArray(durations) && durations.length===seq.length;
    const total = weighted ? durations.reduce((sum,n)=>sum+n,0) : seq.length*timing[key];
    const at = loops ? (Math.max(0,actor.elapsed)*1000)%total : bounded(actor.progress)*total;
    if (!weighted) return seq[Math.min(seq.length-1,Math.floor(at/timing[key]))];
    let end=0;
    for(let i=0;i<seq.length;i++) { end+=durations[i]; if(at<end)return seq[i]; }
    return seq[seq.length-1];
  }
  function geometry(actor,asset,scale,gentle) {
    const meta=asset.frames, n=frameFor(actor,meta,gentle), pivot=meta.pivot||[64,116];
    const cell=meta.cell, b=meta.bounds?.[n] || [0,0,cell,cell];
    const flip=actor.direction!==(meta.facing ?? 1);
    const x=Math.round(actor.x),y=Math.round(actor.y);
    return {n,flip,x,y,rect:{x:x+(flip ? pivot[0]-b[2] : b[0]-pivot[0])*scale,
      y:y+(b[1]-pivot[1])*scale,width:(b[2]-b[0])*scale,height:(b[3]-b[1])*scale}};
  }
  function poly(g,points,fill) {
    g.fillStyle=fill;g.beginPath();g.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
    g.closePath();g.fill();
  }
  function stroke(g,points,color,width) {
    g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
    g.stroke();
  }
  function ellipse(g,x,y,rx,ry,color) {
    g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,fullCircle);g.fill();
  }
  function diamond(g,x,y,w,h,color) { poly(g,[[x-w,y],[x,y-h],[x+w,y],[x,y+h]],color); }
  function rect(g,x,y,w,h,color) {g.fillStyle=color;g.fillRect(x,y,w,h);}
  function mark(renderer,id,x,y,w,h) {
    const g=renderer.ctx, art=renderer.assets.street||renderer.assets.marks;
    if(!art?.image)return false;
    const cell=art.frames?.cell || 128, index=art.frames?.frames?.[id] ?? stickers[id] ?? 0;
    const [cw,ch]=Array.isArray(cell)?cell:[cell,cell];
    g.drawImage(art.image,index*cw,0,cw,ch,x,y,w,h);return true;
  }
  function rail(renderer,w,accent,level) {
    const {x1,x2,y,alpha}=w.rail,g=renderer.ctx,scale=w.scale;
    const left=Math.min(x1,x2),right=Math.max(x1,x2);
    const postHeight=Math.max(5*scale,Math.min(w.ground-y,24*scale));
    renderer.region(left-10*scale,y-3*scale,right-left+20*scale,postHeight+9*scale);
    g.save();g.globalAlpha=bounded(alpha);g.lineCap='round';
    for(const x of [left+(right-left)*.18,right-(right-left)*.18]){
      const foot=x-4*scale;
      stroke(g,[[x,y+2*scale],[foot,y+postHeight]],ink,4*scale);
      stroke(g,[[foot-3*scale,y+postHeight],[foot+4*scale,y+postHeight]],ink,2.5*scale);
    }
    stroke(g,[[left,y+2*scale],[right,y+2*scale]],ink,5*scale);
    stroke(g,[[left,y+.5*scale],[right,y+.5*scale]],pale,1.65*scale);
    if(level!=='off')for(let x=left+8*scale;x<right-7*scale;x+=31*scale){
      stroke(g,[[x,y+.5*scale],[x+5*scale,y+.5*scale]],accent,2*scale);
    }
    g.restore();
  }
  function tag(renderer,w,accent) {
    const tag=w.tag,g=renderer.ctx, unit=Math.min(w.scale,1.45);
    const span=Math.min(w.width,82*unit,w.height),inkX=clamp(tag.x,span/2,Math.max(span/2,w.width-span/2));
    const inkY=clamp(tag.y,span/2,Math.max(span/2,w.height-span/2));
    const left=Math.round(inkX-span/2),top=Math.round(inkY-span/2);
    renderer.region(left,top,span,span);
    g.save();g.globalAlpha=bounded(tag.alpha);
    const reveal=w.gentle ? 1 : bounded(tag.progress);
    const width=span*reveal;
    g.beginPath();g.rect(tag.direction===-1 ? left+span-width : left,top,width,span);g.clip();
    const id=tag.kind||({lime:'bolt',pink:'cat',cyan:'skull'}[tag.accent]||'bolt');
    if(!mark(renderer,id,left,top,span,span)){
      g.translate(inkX,inkY);g.scale(span/80,span/80);
      const points=[[-4,-29],[21,-27],[6,-6],[26,-8],[-16,31],[-5,7],[-25,10]];
      g.lineWidth=5;g.lineJoin='round';poly(g,points,paper);g.strokeStyle=ink;g.stroke();poly(g,points,accent);
    }
    g.restore();
  }
  function pickup(renderer,can,w,accent) {
    const g=renderer.ctx,unit=Math.min(w.scale,1.55),size=Math.min(23*unit,w.width,w.height);
    const bob=w.gentle ? 0 : Math.sin(can.age*4+can.id)*1.4*unit;
    const angle=w.gentle ? 0 : Math.sin(can.age*2.7+can.id*.87)*.24;
    const extent=size/2*(Math.abs(Math.cos(angle))+Math.abs(Math.sin(angle)));
    const x=clamp(can.x,extent,Math.max(extent,w.width-extent));
    const y=clamp(can.y+bob,extent,Math.max(extent,w.height-extent));
    renderer.region(x-extent,y-extent,extent*2,extent*2);
    g.save();g.globalAlpha=bounded((60-can.age)*1.4)*.96;
    g.translate(x,y);g.rotate(angle);
    if(!mark(renderer,'can',-size/2,-size/2,size,size)){
      g.scale(size/20,size/20);g.rotate(-.2);
      rect(g,-2,-8,4,3,ink);rect(g,-5,-5,10,13,ink);rect(g,-3,-4,6,3,paper);rect(g,-3,0,6,5,accent);
    }
    g.restore();
  }
  function shadow(renderer,w) {
    const g=renderer.ctx,s=w.scale,a=w.hero,alt=Math.max(0,(w.ground-a.y)/s);
    if(alt>120)return;
    const rx=19*s/(1+alt/125), ry=2.5*s/(1+alt/100),x=a.x,y=w.ground+2*s;
    renderer.region(x-rx,y-ry,rx*2,ry*2);g.save();
    g.globalAlpha=.20*a.alpha/(1+alt/45);ellipse(g,x,y,rx,ry,ink);g.restore();
  }
  function drawActor(renderer,a,asset,pose,s) {
    const g=renderer.ctx,{n,x,y,flip,rect:b}=pose,meta=asset.frames;
    const {cell,columns,pivot=[64,116]}=meta;
    renderer.region(b.x,b.y,b.width,b.height);
    g.save();g.globalAlpha=bounded(a.alpha);g.translate(x,y);g.scale(flip?-s:s,s);
    g.imageSmoothingEnabled=false;
    g.drawImage(asset.image,(n%columns)*cell,Math.floor(n/columns)*cell,cell,cell,-pivot[0],-pivot[1],cell,cell);
    g.restore();
  }
  // All motion marks live near his wheels or shoulders. No screen-wide flashes or particles.
  function accents(renderer,w,color,level,b) {
    const g=renderer.ctx,a=w.hero,key=a.action;
    if(level==='off'||w.gentle||!['boost','grind','grab','land','dance','tag'].includes(key))return;
    const full=level==='full',s=w.scale,t=a.elapsed,p=bounded(a.progress),d=a.direction;
    const top=(b.y-a.y)/s, half=Math.min(26,b.width/(2*s));
    renderer.region(a.x-78*s,Math.min(b.y-14*s,a.y-39*s),156*s,Math.max(53*s,a.y-b.y+25*s));
    g.save();g.translate(a.x,a.y);g.scale(s*d,s);g.globalAlpha=bounded(a.alpha);
    if(key==='grind'){
      for(let i=0;i<(full?7:3);i++){
        const u=cycle(t*2.7+i*.381),x=-5-u*(16+(i%3)*9),y=-2-(8+i%4*3)*Math.sin(Math.PI*u)+u*3;
        g.globalAlpha=(1-u)*a.alpha;
        poly(g,[[x+2,y+1],[x,y-1.2],[x-3.5-u*3,y-2.5],[x-1,y+.4]],i%3===0?paper:color);
      }
    } else if(key==='boost'){
      for(let i=0;i<(full?5:2);i++){
        const u=cycle(t*2+i*.27),x=-11-22*u,y=-2-i*4;
        g.globalAlpha=(1-u)*.78*a.alpha;
        poly(g,[[x,y],[x-16-i,y+.8],[x-22-i*1.3,y+2.6],[x-2,y+1.9]],i%2?color:paper);
      }
    } else if(key==='grab'){
      const n=full?3:1;
      for(let i=0;i<n;i++){
        const u=cycle(i/n+p*.58),x=(half+4)*Math.cos(-Math.PI+u*4.6),y=top*.47+(9+half*.38)*Math.sin(-Math.PI+u*4.6);
        diamond(g,x,y,2.6,4.2,i%2?paper:color);
      }
    } else if(key==='land'){
      const u=bounded(p*1.7);
      g.globalAlpha*=1-u;
      for(const sign of [-1,1]){
        const x=sign*(half*.4+u*24),y=-2-u*4;
        stroke(g,[[x,y],[x+sign*(7+u*3),y-1.5]],color,2);
        if(full)stroke(g,[[x+sign*2,y-3],[x+sign*6,y-6]],paper,1.3);
      }
    } else if(key==='dance'){
      for(let i=0;i<(full?2:1);i++){
        const u=cycle(t*.9+i*.5),x=(i?-1:1)*(half+1+u*6),y=top*.54-16*u;
        g.globalAlpha=(1-u)*a.alpha;ellipse(g,x,y,2.5,1.8,color);
        stroke(g,[[x+2,y],[x+2,y-7],[x+6,y-5]],i?paper:color,1.7);
      }
    } else if(w.tag && p>.15 && p<.88){
      for(let i=0;i<(full?7:2);i++){
        const u=cycle(t*3.1+i*.233),x=half*.63+8+u*12,y=top*.48+(i%3-1)*u*8;
        g.globalAlpha=(1-u)*a.alpha;diamond(g,x,y,1.5,1.5,color);
      }
    }
    g.restore();
  }
  function combo(renderer,w,accent,b) {
    const {score,count}=w.combo;
    if(!score||count<2||w.settings.fx==='off'||w.gentle)return;
    const g=renderer.ctx,s=clamp(w.scale*.8,.8,1.25),h=17*s;
    const text=String(count)+'×  '+Math.round(score);
    g.save();g.font=`bold ${Math.round(10*s)}px monospace`;
    const width=Math.ceil(g.measureText(text).width+15*s);
    if(width>w.width || h>w.height){g.restore();return;}
    const x=clamp(w.hero.x-width/2,0,w.width-width);
    const y=clamp(b.y-h-4,0,w.height-h);
    renderer.region(x,y,width,h);
    poly(g,[[x+3*s,y],[x+width,y],[x+width-3*s,y+h],[x,y+h]],ink);
    poly(g,[[x+3*s,y],[x+6*s,y],[x+3*s,y+h],[x,y+h]],accent);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle=paper;g.fillText(text,x+width/2+s,y+h*.53);g.restore();
  }
  class Renderer {
    constructor(ctx,assets) { this.ctx=ctx;this.assets=assets;this.dirty=[];this.hitBox=null; }
    region(x,y,width,height) {
      const l=Math.floor(x)-2,t=Math.floor(y)-2,r=Math.ceil(x+width)+2,b=Math.ceil(y+height)+2;
      this.dirty.push([l,t,r-l,b-t]);
    }
    clear() {
      for(const rect of this.dirty)this.ctx.clearRect(...rect);
      this.dirty.length=0;this.hitBox=null;
    }
    draw(w) {
      this.clear();
      if(w.settings.hidden)return;
      const asset=this.assets[w.settings.skin]||this.assets.remix||this.assets.classic;
      if(!asset?.image)return;
      const accent=inks[w.settings.accent]||inks.lime,level=w.settings.fx;
      if(w.tag)tag(this,w,inks[w.tag.accent]||accent);
      if(w.rail)rail(this,w,accent,level);
      for(const can of w.cans)pickup(this,can,w,accent);
      if(w.hero.alpha<=0)return;
      const a=w.hero,pose=geometry(a,asset,w.scale,w.gentle);
      if(level!=='off')shadow(this,w);
      drawActor(this,a,asset,pose,w.scale);
      accents(this,w,accent,level,pose.rect);
      combo(this,w,accent,pose.rect);
      this.hitBox=pose.rect;
    }
  }
  return {Renderer,frameFor,geometry};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BeatDraw;

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

// The overlay only owns its controls, the skater's hit area and its own canvas.
(function bootBeat() {
  if (window.top !== window.self || document.getElementById('beat-browser-skater')) return;
  const bundles = {"remix":{"frames":{"cell":128,"columns":6,"count":36,"bounds":[[47,17,86,116],[46,17,84,116],[47,15,86,116],[50,17,88,116],[25,26,102,116],[55,26,100,116],[25,27,104,116],[55,26,100,116],[10,43,106,116],[27,39,105,116],[21,36,104,116],[46,36,105,116],[38,46,93,116],[34,36,97,116],[33,49,104,116],[33,33,96,116],[42,23,103,116],[40,29,101,116],[44,49,105,116],[36,28,104,116],[32,43,105,116],[32,36,113,116],[36,33,107,116],[32,33,113,116],[39,18,82,116],[41,18,86,116],[41,19,118,116],[42,18,88,116],[34,19,103,116],[43,20,101,116],[44,19,95,116],[37,23,106,116],[30,14,89,116],[34,39,101,116],[37,32,92,116],[44,14,88,116]],"pivot":[64,116],"facing":1,"animations":{"idle":[0,1,2,3],"skate":[4,5,6,7],"boost":[8,9,10,11],"jump":[12,13,14,15],"grab":[16,17,18,19],"grind":[20,21,22,23],"tag":[24,25,26,27],"dance":[28,29,30,31],"land":[32,33,34,35]}},"data":"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"},"classic":{"frames":{"cell":128,"columns":5,"count":15,"bounds":[[42,12,86,116],[42,12,84,116],[42,12,84,116],[28,20,100,116],[18,30,108,116],[18,30,108,116],[24,26,104,116],[34,10,92,116],[28,40,100,116],[38,14,90,116],[20,8,106,116],[12,2,114,116],[12,6,114,116],[28,16,98,116],[38,14,90,116]],"pivot":[64,116],"facing":1,"animations":{"idle":[0,1,2,1],"skate":[3,4,5,6],"boost":[4,5,6,3],"jump":[7,8],"grab":[8,13,8,7],"grind":[6,8,6,3],"tag":[9,10,13,14],"dance":[9,10,11,12,13,14,13,12,11,10],"land":[7,8,8,3]}},"data":"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"},"street":{"frames":{"cell":[128,128],"anchor":[64,64],"frames":{"bolt":0,"cat":1,"skull":2,"can":3}},"data":"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"}};
  const sheetCSS = ".bt-radio {\n  --bt-ink: #202321; --bt-paper: #f3efdf;\n  --bt-paint: #d3fa43;\n  --bt-mono: \"IBM Plex Mono\", \"SFMono-Regular\", Consolas, monospace;\n  --bt-body: \"Barlow\", \"Arial\", sans-serif;\n  --bt-left: max(12px, env(safe-area-inset-left, 0px));\n  --bt-lift: 12px; --bt-bottom: calc(var(--bt-lift) + env(safe-area-inset-bottom, 0px));\n  direction: ltr; writing-mode: horizontal-tb; text-align: start; color-scheme: light;\n  color: var(--bt-ink); font: 14px/1.35 var(--bt-body); font-weight: 500; letter-spacing: normal;\n  pointer-events: none;\n}\n.bt-radio[data-accent=pink] { --bt-paint: #ff86aa; }\n.bt-radio[data-accent=cyan] { --bt-paint: #6debdf; }\n.bt-radio[data-dock=middle] { --bt-lift: 70px; }\n.bt-radio[data-dock=high] { --bt-lift: 130px; }\n.bt-radio *, .bt-radio *::before, .bt-radio *::after { box-sizing: border-box; }\n.bt-radio [hidden] { display: none !important; }\n.bt-radio button,.bt-radio input,.bt-radio select {\n  font: inherit; letter-spacing: normal; margin: 0; accent-color: #3b5b20; color: inherit;\n}\n.bt-radio button,.bt-radio select { cursor: pointer; touch-action: manipulation; }\n.bt-radio button:focus-visible,.bt-radio input:focus-visible,.bt-radio select:focus-visible {\n  outline: 3px solid #375caa; outline-offset: 2px; z-index: 1;\n}\n.bt-radio .bt-dial,.bt-radio .bt-deck {\n  position: fixed; margin: 0; left: var(--bt-left); pointer-events: auto;\n}\n.bt-radio .bt-dial {\n  bottom: var(--bt-bottom); z-index: 20; display: grid; justify-items: center; align-content: center;\n  width: 53px; height: 43px; padding: 3px 4px 5px; gap: 1px; isolation: isolate;\n  border: 2px solid var(--bt-ink); border-radius: 6px 6px 5px 5px;\n  background: linear-gradient(to bottom, #4c5251 0 2px, #2c3030 2px 77%, #494d49 77%);\n  box-shadow: inset 0 -2px #1b1d1c, 1px 2px 0 #191d1c, 2px 3px 7px #13161142;\n  transition: transform .15s ease-out;\n}\n.bt-dial::before,.bt-dial::after {\n  content: ''; position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #a2a699; bottom: 3px;\n}\n.bt-dial::before { left: 4px; }\n.bt-dial::after { right: 4px; }\n.bt-mini-label {\n  display: block; min-width: 36px; padding-right: 2px; transform: rotate(-3deg); background: var(--bt-paint);\n  color: #202321; font: italic 1000 12px/.95 \"Arial Black\", var(--bt-body); letter-spacing: -.08em;\n}\n.bt-tape {\n  display: flex; align-items: center; justify-content: center; width: 36px; height: 13px; gap: 2px;\n  border: 1px solid #191c1b; border-radius: 7px; background: #c5c6b8;\n}\n.bt-tape i,.bt-spool {\n  display: block; border-radius: 50%;\n  background: radial-gradient(circle, #202421 0 21%, transparent 23%),\n    repeating-conic-gradient(#ebe7d6 0 33deg, #555e54 34deg 60deg);\n}\n.bt-tape i { width: 8px; height: 8px; border: 1px solid #53584f; }\n.bt-tape b { width: 9px; height: 4px; background: #57574b; border-block: 1px solid #303632; }\n.bt-dial:hover,.bt-dial[aria-expanded=true] { transform: rotate(-4deg) translateY(-1px); }\n.bt-deck {\n  z-index: 21; bottom: calc(var(--bt-bottom) + 51px); display: flex; flex-direction: column;\n  width: 332px; max-width: calc(100vw - var(--bt-left) - 12px);\n  max-height: calc(100vh - var(--bt-bottom) - 63px); max-height: calc(100dvh - var(--bt-bottom) - 63px);\n  overflow: hidden; border: 2px solid #202421; border-radius: 13px 13px 7px 7px;\n  background: var(--bt-paper); box-shadow: 2px 3px 0 #171b1a, 4px 8px 22px #171d1e48;\n  transform-origin: 24px bottom; animation: bt-deck-open .18s ease-out both;\n}\n@keyframes bt-deck-open {\n  from { opacity: 0; transform: translateY(6px) rotate(-1deg); } to { opacity: 1; transform: none; }\n}\n.bt-head {\n  position: relative; flex: none; overflow: hidden; padding: 14px 15px 10px; color: var(--bt-paper);\n  background: repeating-linear-gradient(0deg,#ffffff05 0 1px,transparent 1px 3px), #2a3031;\n  box-shadow: inset 0 2px #6e7471; border-bottom: 3px solid #151b19;\n}\n.bt-heading { display: flex; align-items: center; gap: 17px; min-height: 43px; margin-bottom: 8px; padding-right: 46px; }\n.bt-heading h2 {\n  position: relative; flex: none; z-index: 0; margin: 0 0 0 3px;\n  color: #292c26; font: italic 1000 38px/.96 \"Archivo Black\",\"Arial Black\",Impact,var(--bt-body);\n  letter-spacing: -.09em; text-transform: uppercase; transform: rotate(-4deg) skewX(-3deg);\n}\n.bt-heading h2::before {\n  content: ''; position: absolute; z-index: -1; inset: -1px -7px -3px;\n  background: var(--bt-paint); box-shadow: -2px 3px 0 #080f0c;\n  clip-path: polygon(1% 3%, 100% 0, 97% 25%, 100% 34%, 95% 98%, 0 97%, 3% 60%, 0% 55%);\n}\n.bt-heading h2 em { margin-left: 1px; color: #31352b; font: italic 900 19px/1 var(--bt-body); letter-spacing: -.1em; vertical-align: .32em; }\n.bt-vents {\n  flex: 1; height: 19px; max-width: 67px; transform: skewX(-19deg);\n  background: repeating-linear-gradient(90deg,#151a19 0 3px,#454b49 3px 4px,transparent 4px 7px);\n}\n.bt-radio .bt-close {\n  position: absolute; top: 11px; right: 12px; width: 33px; height: 33px; padding: 0; color: #f0ecdc;\n  background: #303635; border: 1px solid #858b81; border-radius: 4px; font: 23px/1 var(--bt-body);\n}\n.bt-close:hover { background: #49504c; }\n.bt-counter {\n  display: flex; align-items: center; gap: 8px; padding: 3px 7px;\n  border: 1px solid #131b14; border-radius: 15px;\n  background: #aeb4a5; box-shadow: inset 0 2px #899083, 0 1px #646961;\n}\n.bt-spool { flex: 0 0 14px; width: 14px; height: 14px; border: 1px solid #5b6258; }\n.bt-counter dl {\n  flex: 1; display: grid; grid-template-columns: 1.2fr 1fr; min-width: 0; margin: 0;\n  padding: 2px 4px; border: 1px solid #68755f; background: #c2d1ae; border-radius: 2px;\n  color: #283525; font: 700 11px/1.15 var(--bt-mono);\n}\n.bt-counter dl div { display: flex; align-items: baseline; justify-content: center; gap: 5px; min-width: 0; }\n.bt-counter dl div + div { border-left: 1px solid #86947a; }\n.bt-counter dt { font-size: 9px; text-transform: uppercase; letter-spacing: .005em; }\n.bt-counter dd { min-width: 0; margin: 0; white-space: nowrap; font-variant-numeric: tabular-nums; }\n.bt-tabs { flex: none; display: flex; gap: 2px; padding: 3px 5px 0; background: #363b39; }\n.bt-radio .bt-tabs button {\n  flex: 1; min-width: 0; min-height: 34px; padding: 5px 4px; background: #424945; color: #f2f0e5;\n  border: 1px solid #737970; border-bottom: 0; border-radius: 3px 3px 0 0;\n  font: bold 12px/1.2 var(--bt-mono);\n}\n.bt-radio .bt-tabs button[aria-selected=true] { color: var(--bt-ink); background: var(--bt-paper); border-color: #f7f3e7; box-shadow: inset 0 3px var(--bt-paint); }\n.bt-radio .bt-tabs button:focus-visible,.bt-radio .bt-close:focus-visible { outline-color: #77b6ff; outline-offset: -3px; }\n.bt-pages {\n  flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin;\n  scrollbar-color: #858c7a var(--bt-paper); padding: 13px 15px 14px; background: var(--bt-paper);\n}\n.bt-pages h3,.bt-group legend {\n  font: 800 12px/1.25 var(--bt-body); color: #3d453d; letter-spacing: .035em; margin: 0;\n}\n.bt-pages h3 { margin-bottom: 7px; }\n.bt-sequence { margin: 0 0 9px; padding: 4px 8px; border-left: 3px solid #637746; background: #e3e7d5; color: #3b4734; font: 700 11px/1.3 var(--bt-mono); }\n.bt-pads + h3 { margin-top: 12px; }\n.bt-group { padding: 0; border: 0; margin: 0 0 11px; min-width: 0; }\n.bt-group legend { padding: 0; margin-bottom: 5px; }\n.bt-band { display: flex; gap: 3px; }\n.bt-band label { position: relative; flex: 1; min-width: 0; cursor: pointer; }\n.bt-band input,.bt-switch input { position: absolute; width: 1px; height: 1px; opacity: 0; }\n.bt-band label > span,.bt-radio .bt-pads button,.bt-radio .bt-lines button {\n  display: flex; justify-content: center; align-items: center; gap: 4px; min-height: 35px; padding: 6px 4px;\n  border: 1px solid #8b9080; border-radius: 4px; color: var(--bt-ink); background: #fdf9e9;\n  font: 700 13px/1.2 var(--bt-body);\n}\n.bt-band label > span { text-align: center; }\n.bt-band input:checked + span { border-color: #353c32; background: #323a31; color: #faf7e9; }\n.bt-band input:focus-visible + span,.bt-switch input:focus-visible + i { outline: 3px solid #375caa; outline-offset: 2px; }\n.bt-swatch::before { content: ''; width: 12px; height: 12px; flex: none; border: 1px solid #586153; border-radius: 50%; }\n.bt-swatch.bt-lime::before { background: #d3fa43; }\n.bt-swatch.bt-pink::before { background: #ff86aa; }\n.bt-swatch.bt-cyan::before { background: #6debdf; }\n.bt-trail-help { margin: -2px 0 6px; font: 12px/1.4 var(--bt-body); color: #4d554b; }\n.bt-switches { padding: 4px 0; margin: 8px 0 10px; border-block: 1px dashed #a7ac9c; }\n.bt-switch { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 34px; cursor: pointer; }\n.bt-switch i { position: relative; width: 32px; height: 18px; flex: none; border: 1px solid #71796c; background: #ced0c2; border-radius: 4px; }\n.bt-switch i::after { content: ''; position: absolute; width: 11px; height: 10px; top: 3px; left: 3px; background: #555e51; border-radius: 1px; transition: transform .12s ease; }\n.bt-switch input:checked + i { background: #333d32; border-color: #263023; }\n.bt-switch input:checked + i::after { background: var(--bt-paint); transform: translateX(13px); }\n.bt-stereo {\n  display: grid; grid-template-columns: minmax(95px,1fr) minmax(75px,1fr); align-items: center;\n  column-gap: 10px; padding: 8px; margin: 0 0 10px; border: 1px solid #a9af9c;\n  border-radius: 5px; background: #e3e6d6;\n}\n.bt-radio .bt-transport {\n  grid-row: span 2; display: flex; align-items: center; justify-content: center; gap: 5px;\n  min-height: 35px; padding: 4px 6px; color: #fcfaec; background: #384035;\n  border: 1px solid #333b2e; border-bottom: 3px solid #21261d; border-radius: 3px; font-size: 12px; font-weight: 700;\n}\n.bt-transport i { flex: none; border: solid transparent; border-width: 4px 0 4px 7px; border-left-color: var(--bt-paint); }\n.bt-transport[data-playing=true] i { width: 7px; height: 7px; border: 0; background: var(--bt-paint); }\n.bt-stereo label { display: flex; align-items: baseline; justify-content: space-between; gap: 3px; font-size: 11px; font-weight: 700; }\n.bt-volume-value { font: 11px/1.2 var(--bt-mono); }\n.bt-stereo input { width: 100%; min-width: 0; height: 17px; cursor: pointer; }\n.bt-radio .bt-hop {\n  display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 6px 10px; min-height: 36px;\n  background: #373e35; border: 1px solid #20271c; border-radius: 3px; color: #fffbea; font-weight: 700;\n}\n.bt-hop span { font-size: 19px; color: var(--bt-paint); line-height: 1; }\n.bt-faders { margin: 8px 0; padding: 5px 0; border-block: 1px dashed #a7ac9c; }\n.bt-fader { display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 6px; margin: 4px 0; }\n.bt-readout { color: #47513c; font: 700 12px/1.2 var(--bt-mono); }\n.bt-fader input { width: 100%; min-width: 0; grid-column: 1 / -1; cursor: pointer; height: 18px; }\n.bt-select { display: grid; grid-template-columns: 1fr minmax(110px,55%); align-items: center; gap: 6px; margin-top: 6px; }\n.bt-radio select { border: 1px solid #919885; border-radius: 3px; background-color: #fffbea; padding: 5px; min-height: 32px; width: 100%; }\n.bt-pads { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }\n.bt-radio .bt-pads button { position: relative; padding-inline: 10px; border: 1px solid #818976; border-bottom-width: 3px; }\n.bt-radio .bt-lines { display: flex; gap: 5px; }\n.bt-radio .bt-lines button {\n  flex: 1; justify-content: space-between; padding-inline: 9px; background: #363a36; border-color: #222722;\n  color: #fffcea; border-bottom: 3px solid #181d19;\n}\n.bt-lines button span { color: var(--bt-paint); }\n.bt-radio .bt-pads button:hover:enabled,.bt-radio .bt-band label:hover > span { box-shadow: inset 0 -2px #899577; }\n.bt-radio .bt-lines button:hover:enabled,.bt-radio .bt-hop:hover { background: #464e43; }\n.bt-radio .bt-pads button:active:enabled,.bt-radio .bt-lines button:active:enabled { transform: translateY(1px); }\n.bt-radio button:disabled { cursor: default; opacity: .5; }\n.bt-footer {\n  display: flex; align-items: center; gap: 7px; flex: none; min-height: 25px; padding: 5px 14px;\n  border-top: 1px solid #232924; background: #363c37; color: #f3f1df; font: 11px/1.35 var(--bt-mono);\n}\n.bt-footer i { width: 7px; height: 7px; flex: none; background: var(--bt-paint); border-radius: 50%; }\n.bt-radio[data-motion=reduced] *, .bt-radio[data-motion=reduced] *::after { animation: none !important; transition: none !important; }\n@media (prefers-reduced-motion: reduce) {\n  .bt-radio *, .bt-radio *::after { animation: none !important; transition: none !important; }\n}\n@media (max-height: 520px) {\n  .bt-deck { left: calc(var(--bt-left) + 59px) !important; bottom: max(8px,env(safe-area-inset-bottom,0px));\n    max-height: calc(100vh - 18px); max-height: calc(100dvh - 18px);\n    max-width: calc(100vw - var(--bt-left) - 70px); }\n  .bt-head { padding-block: 8px; }\n  .bt-heading { margin-bottom: 3px; }\n}\n@media (max-width: 280px), (max-width: 380px) and (max-height: 520px) {\n  .bt-radio .bt-deck { left: 5px !important; bottom: 5px; max-width: calc(100vw - 12px); max-height: calc(100dvh - 12px); }\n  .bt-pages { padding-inline: 8px; }\n  .bt-vents { display: none; }\n}\n@media (forced-colors: active) {\n  .bt-band input:checked + span,.bt-switch input:checked + i,.bt-radio .bt-tabs button[aria-selected=true] { outline: 2px solid Highlight; outline-offset: -3px; }\n  .bt-switch input:checked + i::after,.bt-swatch::before { background: ButtonText; }\n}\n@media print { .bt-radio { display: none !important; } }\n";
  const prefix = 'beat-skater-v1:';
  const shared = !BEAT_PREVIEW && typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
  const fallback = new Map();
  function read(key, initial) {
    try {
      if (shared) return GM_getValue(prefix + key, initial);
      if (BEAT_PREVIEW && (key === 'settings' || key === 'best-v2' || key === 'volume-v2')) {
        const value = window.localStorage.getItem('preview/' + prefix + key);
        if (value !== null) return JSON.parse(value);
      }
    } catch { /* Sandboxed pages and offline previews can run in memory. */ }
    return fallback.has(key) ? fallback.get(key) : initial;
  }
  function write(key, value) {
    fallback.set(key, value);
    try {
      if (shared) GM_setValue(prefix + key, value);
      else if (BEAT_PREVIEW && (key === 'settings' || key === 'best-v2' || key === 'volume-v2')) window.localStorage.setItem('preview/' + prefix + key, JSON.stringify(value));
    } catch { /* Keep the session running when persistence is unavailable. */ }
  }
  function watch(key, fn) {
    if (!shared || typeof GM_addValueChangeListener !== 'function') return () => {};
    const id = GM_addValueChangeListener(prefix + key, (_key, _old, value, remote) => { if (remote) fn(value); });
    return () => { if (typeof GM_removeValueChangeListener === 'function') GM_removeValueChangeListener(id); };
  }
  const pageStore = shared && typeof GM_listValues === 'function' && typeof GM_deleteValue === 'function' ? {
    get:read, set:write, watch,
    remove(key) { fallback.delete(key); GM_deleteValue(prefix + key); },
    keys() { return GM_listValues().filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length)); }
  } : null;

  const host = document.createElement('div');
  host.id = 'beat-browser-skater';
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;';
  const root = host.attachShadow({mode:'closed'});
  const style = document.createElement('style');
  style.textContent = sheetCSS + '\n.beat-stage,.beat-hit{position:absolute;top:0;left:0;margin:0}.beat-stage{pointer-events:none}.beat-hit{pointer-events:auto;cursor:pointer;background:transparent;color:inherit;border:none;border-radius:12px;padding:0;touch-action:manipulation}.beat-hit:focus-visible{outline:2px dashed #bbff31;outline-offset:2px}.beat-stage[hidden],.beat-hit[hidden]{display:none!important}@media print{:host{display:none!important}}';
  const canvas = document.createElement('canvas');
  canvas.className = 'beat-stage'; canvas.hidden = true; canvas.setAttribute('aria-hidden','true');
  const hit = document.createElement('button');
  hit.className = 'beat-hit'; hit.type = 'button'; hit.hidden = true;
  hit.title = 'Beat · Click to dance, right-click for the radio';
  hit.setAttribute('aria-label','Beat. Dance, or open the radio with Shift F10.');
  root.append(style, canvas, hit);
  document.documentElement.append(host);

  const world = new BeatEngine.World(BeatEngine.normalize(read('settings', {})));
  world.setBest(read('best-v2', 0));
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  world.setReduced(media.matches);
  const ctx = canvas.getContext('2d');
  let view = null, pages = null, owned = false, suspended = false, disposed = false;
  let summoningForMove = false;
  let raf = 0, frameTime = null, ratio = 1, width = 1, height = 1, statsStamp = '';
  const cleanup = [];
  const radio = BeatAudio.create(window);
  const clampVolume = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(1,value)) : .35;
  let volume = clampVolume(read('volume-v2',.35)), audioEpoch = 0;
  radio.setVolume(volume);
  const panel = BeatPanel.mount(root, {
    settings:world.settings, moves:BeatEngine.moves, lines:BeatEngine.lines,
    onChange:patch => apply({...read('settings', world.settings), ...patch}, true),
    onRadio:toggleRadio, onVolume:value => { applyVolume(value); write('volume-v2',volume); },
    onMove:perform, onJump:() => pages ? pages.jump() : 'Loading Beat…'
  });
  let playing = false;
  function applyVolume(value) {
    volume = clampVolume(value); radio.setVolume(volume); panel.audio(playing,volume);
  }
  function quietRadio() {
    audioEpoch++; radio.stop(); playing = false; panel.audio(false,volume);
  }
  async function toggleRadio() {
    if (!view || world.settings.hidden || suspended || document.hidden || document.fullscreenElement) {
      panel.status('Show Beat on this page to play the tape.'); return;
    }
    if (!owned) pages.bring();
    if (!owned) return;
    const epoch = ++audioEpoch, wasPlaying = playing;
    try {
      const on = await radio.toggle();
      if (disposed || audioEpoch !== epoch) return;
      playing = on;
      panel.audio(on,volume);
      panel.status(on ? 'On air · Breakbeat playing' : wasPlaying ? 'Tape stopped' : 'Audio is unavailable on this page');
    } catch { if (audioEpoch === epoch) { quietRadio(); panel.status('Audio is unavailable on this page'); } }
  }
  applyVolume(volume);
  function apply(settings, persist) {
    const wasHidden = world.settings.hidden;
    world.apply(BeatEngine.normalize(settings || {}));
    if (persist) write('settings', {...world.settings});
    panel.sync(world.settings);
    if (view && wasHidden !== world.settings.hidden) {
      if (world.settings.hidden) pages.stop();
      else pages.start();
    }
    resize();
    updateLoop();
  }
  function hasStage() { return Boolean(view && owned && !suspended && !disposed && !world.settings.hidden && !document.hidden && !document.fullscreenElement); }
  function paint() {
    canvas.hidden = !hasStage();
    if (canvas.hidden) {
      hit.hidden = true;
      if (view) view.clear();
      return;
    }
    view.draw(world);
    const box = view.hitBox;
    hit.hidden = !world.settings.interact || !box;
    if (!hit.hidden) {
      hit.style.transform = 'translate3d(' + Math.round(box.x) + 'px,' + Math.round(box.y) + 'px,0)';
      hit.style.width = Math.ceil(box.width) + 'px';
      hit.style.height = Math.ceil(box.height) + 'px';
    }
  }
  function resize() {
    width = Math.max(1, document.documentElement.clientWidth || window.innerWidth);
    height = Math.max(1, document.documentElement.clientHeight || window.innerHeight);
    world.resize(width,height);
    // Bound the backing store on giant monitors. The input and world remain in CSS pixels.
    ratio = Math.min(window.devicePixelRatio || 1, 1.5, 8192 / Math.max(width,height), Math.sqrt(6000000 / (width * height)));
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      if (view) view.clear();
      canvas.width = w; canvas.height = h;
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      if (ctx) { ctx.setTransform(w/width,0,0,h/height,0,0); ctx.imageSmoothingEnabled = false; }
    }
    paint();
  }
  function scorePanel() {
    const line = world.line ? BeatEngine.lines[world.line.id] : '';
    const score = world.combo.score, count = world.combo.count, best = world.best;
    const stamp = [score,count,best,line].join('/');
    if (stamp === statsStamp) return;
    statsStamp = stamp;
    panel.stats({score,count,best,line});
  }
  function processEvents() {
    for (const event of world.takeEvents()) {
      if (playing) radio.accent(event);
      if (event.type === 'best') {
        const best = Math.max(event.score, Number(read('best-v2',0)) || 0);
        world.setBest(best); write('best-v2',best);
        panel.status('Personal best · ' + best.toLocaleString() + ' points');
      }
    }
    scorePanel();
  }
  function tick(now) {
    raf = 0;
    if (!hasStage()) { updateLoop(); return; }
    if (frameTime === null || now-frameTime >= 1000/40-1) {
      const dt = frameTime === null ? 0 : Math.min(.08, (now-frameTime)/1000);
      frameTime = now; world.step(dt); processEvents(); paint();
    }
    raf = requestAnimationFrame(tick);
  }
  function updateLoop() {
    if (!hasStage()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; frameTime = null; paint(); return;
    }
    if (!raf) { frameTime = null; paint(); raf = requestAnimationFrame(tick); }
  }
  function perform(id) {
    if (!view || world.settings.hidden || document.hidden || document.fullscreenElement) return false;
    if (!owned) {
      summoningForMove = true;
      try { pages.bring(); } finally { summoningForMove = false; }
    }
    if (!owned) return false;
    const ok = world.perform(id);
    processEvents(); paint();
    return ok;
  }
  function bringAndOpen() {
    if (world.settings.hidden) apply({...read('settings',world.settings),hidden:false},true);
    if (view && !owned) pages.bring();
    panel.open();
  }
  pages = BeatPages.connect({
    store:pageStore, window, document,
    snapshot:() => world.snapshot(),
    onDepart:() => { world.depart(); paint(); },
    onOwner(active, state) {
      owned = active;
      if (active) {
        if (state) world.restore(state);
        world.setBest(Math.max(world.best, Number(read('best-v2',0)) || 0));
        if (!summoningForMove) world.arrive();
      } else { world.clearTrail(); quietRadio(); }
      scorePanel(); updateLoop();
    }
  });
  function listen(target, name, handler, options) {
    if (!target) return;
    target.addEventListener(name,handler,options);
    cleanup.push(() => target.removeEventListener(name,handler,options));
  }
  listen(hit,'click',() => perform('dance'));
  listen(hit,'contextmenu',event => { event.preventDefault(); event.stopPropagation(); bringAndOpen(); });
  listen(hit,'keydown',event => {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault(); bringAndOpen();
    }
  });
  listen(document,'pointermove',event => {
    if (hasStage() && world.settings.mode === 'follow' && event.pointerType !== 'touch' && !event.composedPath().includes(host)) {
      world.point(event.clientX,event.clientY);
    }
  }, {passive:true});
  listen(window,'blur',quietRadio);
  listen(window,'resize',resize);
  listen(window.visualViewport,'resize',resize);
  listen(media,'change',event => { world.setReduced(event.matches); paint(); });
  function visibility() {
    if (document.hidden || document.fullscreenElement) { world.clearTrail(); quietRadio(); }
    updateLoop();
  }
  listen(document,'visibilitychange',visibility);
  listen(document,'fullscreenchange',visibility);
  listen(window,'pageshow',() => {
    suspended = false;
    if (view && !world.settings.hidden) pages.start();
    resize(); updateLoop();
  });
  listen(window,'pagehide',event => {
    suspended = true; quietRadio(); updateLoop();
    if (!event.persisted) {
      disposed = true; pages.destroy();
      for (const off of cleanup.splice(0)) off();
      panel.destroy(); host.remove();
    }
  });
  cleanup.push(watch('settings',value => apply(value,false)), watch('volume-v2',applyVolume),
    watch('best-v2',value => { world.setBest(Math.max(world.best, Number(value) || 0)); scorePanel(); }));
  if (!BEAT_PREVIEW && typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Beat: controls / bring here',bringAndOpen);
    GM_registerMenuCommand('Beat: show / hide',() => apply({...read('settings',world.settings),hidden:!world.settings.hidden},true));
  }
  async function decode(data) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
        return await createImageBitmap(new Blob([bytes],{type:'image/png'}));
      } catch { /* Some browsers only support decoding PNG through an image element. */ }
    }
    return new Promise((resolve,reject) => {
      const image = new Image();
      image.onload = () => resolve(image); image.onerror = () => reject(Error('Embedded image decode failed'));
      image.src = 'data:image/png;base64,' + data;
    });
  }
  scorePanel(); resize();
  Promise.all(Object.entries(bundles).map(async ([id,entry]) =>
    [id,{frames:entry.frames,image:await decode(entry.data)}]
  )).then(entries => {
    if (disposed) return;
    if (!ctx) throw Error('Canvas unavailable');
    view = new BeatDraw.Renderer(ctx,Object.fromEntries(entries));
    if (!world.settings.hidden && !suspended) pages.start();
    updateLoop();
  }).catch(() => panel.status('Beat’s sprites could not load. Reload this page to try again.'));
})();

})();
