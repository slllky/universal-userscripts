// Beat's simulation uses viewport CSS pixels, seconds and a shared skate pivot at (64, 116).
const BeatEngine = (() => {
  'use strict';

  const defaults = Object.freeze({
    mode: 'idle', scale: 1.5, hidden: false, speed: 1, delay: 4, ambient: true,
    interact: true, fx: 'full', motion: 'system', skin: 'remix', accent: 'lime', offset: 4,
    rider: 'beat', partner: 'auto'
  });
  const riders = Object.freeze({
    beat: 'Beat', gum: 'Gum', combo: 'Combo', yoyo: 'Yo-Yo', corn: 'Corn',
    zero: 'Zero Beat', poison: 'Poison Jam'
  });
  const signatures = Object.freeze({
    beat: 'needlethread', gum: 'sugarush', combo: 'bassdrop', yoyo: 'yoexchange',
    corn: 'kernelpanic', zero: 'deadchannel', poison: 'toxicspill'
  });
  const moves = Object.freeze({
    jump: 'Pop hop', grab: 'Mute grab', grind: 'Soul grind', tag: 'Spray tag',
    boost: 'Power stride', dance: 'Dance break', crossover: 'Crossover', rocket: 'Rocket air',
    fishbrain: 'Fishbrain grind', wallride: 'Wallride', spin: 'Flatspin', manual: 'Toe manual'
  });
  const lines = Object.freeze({
    sidewinder: 'Sidewinder', airmail: 'Air mail', needlethread: 'Needle Thread',
    sugarush: 'Sugar Rush', bassdrop: 'Bass Drop', yoexchange: 'Yo-Yo Exchange',
    kernelpanic: 'Kernel Panic', deadchannel: 'Dead Channel', toxicspill: 'Toxic Spill',
    switchyard: 'Switchyard', skyline: 'Skyline Run', backspin: 'Backspin Broadcast',
    nightshift: 'Night Shift', lasttrain: 'Last Train', piraterelay: 'Pirate Relay'
  });
  // Each beat lists its duration, horizontal travel and highest lift in sprite pixels.
  const tricks = {
    jump: {seconds: .88, travel: 64, lift: 43, points: 80},
    grab: {seconds: 1.22, travel: 78, lift: 58, points: 150},
    grind: {seconds: 1.56, travel: 124, lift: 18, points: 180},
    tag: {seconds: 1.30, travel: 0, lift: 0, points: 120},
    boost: {seconds: 1.10, travel: 146, lift: 0, points: 90},
    dance: {seconds: 8, travel: 0, lift: 0, points: 110},
    crossover: {seconds: 1.24, travel: 102, lift: 3, points: 105},
    rocket: {seconds: 1.38, travel: 82, lift: 74, points: 175},
    fishbrain: {seconds: 1.78, travel: 106, lift: 31, points: 215},
    wallride: {seconds: 1.55, travel: 92, lift: 61, points: 205},
    spin: {seconds: 1.18, travel: 59, lift: 37, points: 165},
    manual: {seconds: 1.54, travel: 81, lift: 0, points: 135}
  };
  // Timing is authored per line: a setup can be quick while a freeze or a rail lock gets a full beat.
  const scores = {
    sidewinder: [['boost',.65],['grind',1.42],['jump',.70],['tag',1.05]],
    airmail: [['jump',.75],['grab',1.25],['boost',.72],['dance',1.45]],
    needlethread: [['crossover',.94],['manual',1.24],['grind',1.46],['spin',1.1],['wallride',1.4],['grab',.98],['tag',1.27]],
    sugarush: [['boost',.76],['crossover',1.04],['rocket',1.35],['manual',1.15],['spin',1.09],['fishbrain',1.42],['dance',1.64]],
    bassdrop: [['manual',1.42],['boost',.83],['wallride',1.65],['fishbrain',1.82],['grab',1.23],['grind',1.47],['tag',1.27]],
    yoexchange: [['crossover',1.17],['jump',.83],['manual',1.27],['spin',1.18],['grind',1.45],['rocket',1.31],['dance',1.55]],
    kernelpanic: [['manual',1.25],['spin',1.11],['crossover',.98],['fishbrain',1.62],['jump',.82],['wallride',1.42],['tag',1.23]],
    deadchannel: [['boost',.72],['wallride',1.49],['spin',1.16],['rocket',1.32],['grind',1.41],['manual',1.22],['tag',1.25]],
    toxicspill: [['grind',1.39],['boost',.77],['grab',1.02],['fishbrain',1.71],['wallride',1.57],['spin',1.09],['tag',1.24],['dance',1.53]],
    switchyard: [['boost',.79],['grind',1.53],['crossover',.93],['manual',1.39],['fishbrain',1.84],['spin',1.06],['jump',.82],['tag',1.21]],
    skyline: [['crossover',1.06],['rocket',1.41],['grab',1.23],['wallride',1.58],['spin',1.06],['jump',.85],['manual',1.42]],
    backspin: [['dance',1.30],['manual',1.21],['spin',1.32],['crossover',.98],['grind',1.36],['rocket',1.24],['tag',1.23]],
    nightshift: [['manual',1.49],['grind',1.62],['wallride',1.64],['tag',1.48],['crossover',1.14],['fishbrain',1.69],['dance',1.72]],
    lasttrain: [['boost',.82],['jump',.89],['grind',1.46],['rocket',1.38],['manual',1.41],['wallride',1.56],['fishbrain',1.68],['spin',1.13],['tag',1.22]],
    piraterelay: [['tag',1.24],['crossover',1.04],['grab',1.19],['manual',1.32],['wallride',1.52],['rocket',1.30],['grind',1.58],['spin',1.14],['dance',1.74]]
  };
  const choreography = Object.fromEntries(Object.entries(scores).map(([id, beats]) =>
    [id, beats.map(([move, time]) => ({id: move, time}))]));
  const lineMoves = Object.freeze(Object.fromEntries(Object.entries(scores).map(([id, beats]) =>
    [id, Object.freeze(beats.map(([move]) => move))])));
  // The partner has a separate part: e.g. on Yo-Yo's jump they cruise underneath, then answer with a spin.
  const partnerScores = {
    yoexchange: ['manual','crossover','spin','boost','jump','manual','dance'],
    toxicspill: ['grab','crossover','manual','rocket','spin','boost','dance','tag'],
    switchyard: ['manual','jump','boost','spin','rocket','crossover','grab','dance'],
    lasttrain: ['crossover','manual','rocket','boost','grab','manual','jump','dance','tag'],
    piraterelay: ['dance','boost','crossover','rocket','manual','spin','grab','manual','dance']
  };
  const duets = Object.freeze(Object.keys(partnerScores));
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
      rider: has(riders, s.rider) ? s.rider : defaults.rider,
      partner: s.partner === 'off' || has(riders, s.partner) ? s.partner : defaults.partner,
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
        action: 'idle', elapsed: 0, progress: 0, alpha: 1, rider: this.settings.rider
      };
      this.trick = null;
      this.line = null;
      this.rail = null;
      this.wall = null;
      this.partner = null;
      this.tag = null;
      this.tagCount = 0;
      this.transit = null;
      this.events = [];
      this.combo = emptyCombo();
      this.best = 0;
      this.lastTrickScored = '';
      this.ambientAt = this.time + 4;
      this.lastAmbient = '';
      this.playedLines = [];
      this.nextPartner = 0;
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
    setReduced(value) {
      this.systemReduced = Boolean(value);
      if (this.gentle && this.trick?.source === 'ambient') this.cancelTrick();
    }
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
      this.hero.rider = next.rider;
      if (next.rider !== was.rider) {
        this.playedLines = [];
        this.lastAmbient = '';
        this.nextPartner = 0;
        this.ambientAt = this.time + 3;
      }
      if (this.trick?.source === 'ambient' && (!next.ambient || this.gentle || next.rider !== was.rider)) this.cancelTrick();
      this.fit(this.width, this.height, oldGround);
      if (was.mode !== next.mode || was.hidden !== next.hidden || was.delay !== next.delay) this.clearTrail();
      if (was.mode !== next.mode || (!was.hidden && next.hidden)) {
        this.cancelTrick();
        this.tag = this.transit = null;
        this.hero.y = this.ground;
        this.pose('idle', 0, 0);
        this.hero.alpha = 1;
        this.ambientAt = this.time + 4;
      }
      if (this.trick && this.line && (next.partner !== was.partner || next.rider !== was.rider)) {
        this.setPartnerRoute();
        this.drawTrick();
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
        if (Number.isFinite(this.trick.partnerX0)) {
          this.trick.partnerX0 = x(this.trick.partnerX0);
          this.trick.partnerX1 = x(this.trick.partnerX1);
        }
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
      this.cancelTrick();
      this.ambientAt = this.time + 16;
      if (has(lines, id)) {
        this.startLine(id, 'manual');
      } else {
        this.startTrick(id, 'manual', tricks[id].seconds);
      }
      return true;
    }
    cancelTrick() {
      if (this.trick) this.hero.y = this.trick.y0;
      this.trick = this.rail = this.wall = this.partner = this.line = null;
      this.pose('idle', 0, 0);
    }
    startLine(id, source) {
      this.line = {id, index: 0, total: choreography[id].length, source};
      if (has(partnerScores, id)) {
        const peers = Object.keys(riders).filter(name => name !== this.settings.rider);
        this.line.autoPartner = peers[this.nextPartner % peers.length];
        if (this.settings.partner === 'auto' || this.settings.partner === this.settings.rider) {
          this.nextPartner = (this.nextPartner + 1) % peers.length;
        }
      }
      this.startLineBeat();
    }
    startLineBeat() {
      const beat = choreography[this.line.id][this.line.index];
      this.startTrick(beat.id, this.line.source === 'ambient' ? 'ambient' : 'line', beat.time);
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
      this.setPartnerRoute();
      this.drawTrick();
      this.signal('action', {move: id, source});
    }
    partnerRider() {
      const {rider, partner} = this.settings;
      if (!this.line || !has(partnerScores, this.line.id) || partner === 'off') return null;
      if (has(riders, partner) && partner !== rider) return partner;
      const buddy = this.line.autoPartner;
      return buddy && buddy !== rider ? buddy : Object.keys(riders).find(id => id !== rider);
    }
    setPartnerRoute() {
      const rider = this.partnerRider();
      if (!rider) { this.partner = null; return; }
      const t = this.trick, side = t.direction * (this.line.index % 2 === 0 ? 1 : -1);
      const finish = t.id === 'wallride' ? lerp(t.x0, t.x1, .51) : t.x1;
      // When the formation reaches an edge, place the partner on the open side.
      const alongside = (x, dir) => {
        const gap = 61 * this.scale, target = this.boundX(x + dir * gap);
        return Math.abs(target - x) >= gap * .53 ? target : this.boundX(x - dir * gap);
      };
      t.partnerX0 = this.partner?.x ?? alongside(t.x0, -side);
      t.partnerX1 = alongside(finish, side);
      this.partner = {rider, x: t.partnerX0, y: this.ground, direction: side,
        elapsed: 0, progress: 0, action: 'skate', alpha: 1};
    }
    drawPartner(p) {
      const t = this.trick, rider = this.partnerRider();
      if (!rider) { this.partner = null; return; }
      if (!Number.isFinite(t.partnerX0) || !this.partner) this.setPartnerRoute();
      const a = this.partner;
      const id = partnerScores[this.line.id][this.line.index];
      // Stage the answer just after the lead. The landing and roll-out overlap the next setup.
      const q = bounded((p - .12) / .78, 0, 1);
      const spec = tricks[id];
      const air = ['jump','grab','rocket','spin'].includes(id);
      const yLift = air ? spec.lift * arc(q) : 0;
      const finalBeat = this.line.index === this.line.total - 1;
      a.x = this.boundX(this.gentle ? t.partnerX0 : lerp(t.partnerX0, t.partnerX1, smooth(p)));
      a.y = this.boundY(t.y0 - (this.gentle ? 0 : 5 + yLift) * this.scale);
      a.direction = t.partnerX0 === t.partnerX1 ? t.direction : t.partnerX1 > t.partnerX0 ? 1 : -1;
      a.action = this.gentle || (p >= .12 && p <= .9) ? id : 'skate';
      a.elapsed = q * t.seconds;
      a.progress = this.gentle ? .5 : q;
      a.alpha = this.gentle ? 1 : Math.min(1, this.line.index === 0 ? p * 5 : 1, finalBeat ? (1 - p) * 5 : 1);
      // Two silhouettes completely overlapping on phone slivers would read as one broken sprite.
      if (this.width - 128 * this.scale < 34 * this.scale) a.alpha = 0;
    }
    pose(action, elapsed, progress) {
      Object.assign(this.hero, {action, elapsed, progress: bounded(progress, 0, 1)});
    }
    drawTrick() {
      const t = this.trick;
      const p = bounded(t.elapsed / t.seconds, 0, 1);
      const spec = tricks[t.id];
      let along = p, lift = 0, action = t.id, frame = p;
      this.hero.direction = t.direction;
      if (['jump','grab','rocket','spin'].includes(t.id)) {
        if (p < .86) {
          const air = p / .86;
          lift = spec.lift * (t.id === 'grab' ? Math.sin(Math.PI * air) ** .79 : arc(air));
          if (t.id === 'rocket') {
            // Snap upward, extend both boots through the apex, then release.
            lift = spec.lift * (air < .38 ? smooth(air / .38) : air < .58 ? 1 : 1 - smooth((air - .58) / .42));
            along = .72 * p + .28 * smooth(p);
          }
          frame = air;
        } else {
          action = 'land';
          frame = (p - .86) / .14;
        }
      } else if (t.id === 'grind' || t.id === 'fishbrain') {
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
      } else if (t.id === 'wallride') {
        const foot = t.x1 + t.direction * 11 * this.scale;
        this.wall = {
          x: bounded(foot, 0, this.width), y: t.y0, top: Math.max(0, t.y0 - 74 * this.scale),
          side: t.direction, alpha: this.gentle ? 1 : Math.min(1, p * 6 + .15, (1 - p) * 6)
        };
        if (p < .28) {
          const entry = p / .28;
          along = smooth(entry); lift = 20 * smooth(entry);
          action = 'jump'; frame = entry;
        } else if (p < .68) {
          const contact = (p - .28) / .4;
          along = 1; lift = 20 + (spec.lift - 20) * Math.sin(Math.PI * contact * .67);
          frame = contact;
        } else {
          const exit = (p - .68) / .32;
          const release = 20 + (spec.lift - 20) * Math.sin(Math.PI * .67);
          along = 1 - .49 * smooth(exit); lift = (1 - smooth(exit)) * release + 6 * arc(exit);
          this.hero.direction = -t.direction;
          action = exit < .8 ? 'jump' : 'land'; frame = exit;
        }
      } else if (t.id === 'crossover') {
        // Four weight transfers from skate to skate, each followed by a longer glide.
        along = p - .026 * Math.sin(p * Math.PI * 4);
        lift = spec.lift * Math.sin(p * Math.PI * 2) ** 2;
      } else if (t.id === 'manual') {
        along = .7 * p + .3 * (1 - (1 - p) ** 2);
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
        this.hero.direction = t.direction;
        if (this.rail) {
          this.rail.x1 = Math.max(0, this.hero.x - 30 * this.scale);
          this.rail.x2 = Math.min(this.width, this.hero.x + 30 * this.scale);
          this.rail.y = this.hero.y;
        }
        if (this.wall) this.wall.x = bounded(this.hero.x + 11 * this.scale * t.direction, 0, this.width);
      }
      this.pose(action, t.elapsed, frame);
      if (this.line && has(partnerScores, this.line.id)) this.drawPartner(p);
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
      if (['jump','grab','grind','rocket','spin','fishbrain','wallride'].includes(t.id)) this.signal('land');
      if (t.source !== 'ambient') this.award(tricks[t.id].points, 'trick', t.id);
      this.trick = this.rail = this.wall = null;
      this.hero.y = t.y0;
      this.pose('idle', 0, 0);
      if (this.line) {
        this.line.index++;
        if (this.line.index < this.line.total) this.startLineBeat();
        else {
          if (this.line.source !== 'ambient') this.award(220 + 45 * (this.line.total - 4), 'line', this.line.id);
          else {
            this.signal('line', {move: this.line.id, source: 'ambient'});
            this.ambientAt = this.time + 5 + this.random() * 4;
          }
          this.line = null;
          this.partner = null;
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
      // Open with the selected rider's signature and play the whole deck before repeating.
      const all = Object.keys(lines);
      let remaining = all.filter(id => id !== this.lastAmbient && !this.playedLines.includes(id));
      if (!remaining.length) {
        this.playedLines = [];
        remaining = all.filter(id => id !== this.lastAmbient);
      }
      const alternating = remaining.filter(id => duets.includes(id) !== duets.includes(this.lastAmbient));
      const choices = alternating.length ? alternating : remaining;
      const chosen = this.lastAmbient ? choices[bounded(Math.floor(this.random() * choices.length), 0, choices.length - 1)]
        : signatures[this.settings.rider];
      this.lastAmbient = chosen;
      this.playedLines.push(chosen);
      this.startLine(chosen, 'ambient');
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
      this.tag = this.rail = this.wall = null;
      if (this.partner) this.partner.alpha = 0;
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
        version: 1, followOrigin: follow, x: x(this.hero.x), direction: this.hero.direction, best: this.best,
        combo: {...this.combo}, lastTrickScored: this.lastTrickScored, tagCount: this.tagCount,
        lastAmbient: this.lastAmbient, playedLines: this.playedLines.slice(), nextPartner: this.nextPartner,
        ambientDelay: Math.max(0, this.ambientAt - this.time),
        trick: t && {
          id: t.id, source: t.source, elapsed: t.elapsed, x0: x(t.x0), x1: x(t.x1),
          direction: t.direction,
          ...(Number.isFinite(t.partnerX0) ? {partnerX0: x(t.partnerX0), partnerX1: x(t.partnerX1)} : {})
        },
        line: this.line && {...this.line}
      };
    }
    restore(saved) {
      if (!saved || saved.version !== 1) { this.clearTrail(); return false; }
      this.clearTrail();
      this.events.length = 0;
      this.trick = this.line = this.rail = this.wall = this.partner = this.tag = this.transit = null;
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
      this.ambientAt = this.time + bounded(finite(saved.ambientDelay, 4), 0, 30);
      this.lastAmbient = has(lines, saved.lastAmbient) ? saved.lastAmbient : '';
      this.playedLines = Array.isArray(saved.playedLines)
        ? [...new Set(saved.playedLines.slice(0, Object.keys(lines).length).filter(id => has(lines, id)))] : [];
      this.nextPartner = cleanScore(saved.nextPartner) % (Object.keys(riders).length - 1);
      const t = saved.trick;
      if (!t || !has(moves, t.id) || !['line', 'manual', 'ambient'].includes(t.source)) return true;
      if (t.source === 'ambient' && (this.gentle || !this.settings.ambient || this.settings.mode !== 'idle')) return true;
      let seconds = tricks[t.id].seconds;
      if (t.source === 'line' || (t.source === 'ambient' && saved.line)) {
        const line = saved.line;
        if (!line || !has(lines, line.id) || !Number.isInteger(line.index)) return true;
        const beats = choreography[line.id];
        if (beats[line.index]?.id !== t.id) return true;
        this.line = {id: line.id, index: line.index, total: beats.length, source: t.source === 'line' ? 'manual' : 'ambient'};
        if (has(partnerScores, line.id)) {
          this.line.autoPartner = has(riders, line.autoPartner) && line.autoPartner !== this.settings.rider
            ? line.autoPartner : Object.keys(riders).find(id => id !== this.settings.rider);
        }
        seconds = beats[line.index].time;
      }
      this.trick = {
        id: t.id, source: t.source, direction: t.direction === -1 ? -1 : 1,
        x0: x(t.x0), x1: x(t.x1), y0: this.ground, seconds,
        elapsed: bounded(finite(t.elapsed, 0), 0, seconds)
      };
      if (saved.followOrigin === true) {
        this.trick.x0 = this.boundX(this.width / 2);
        this.trick.x1 = this.boundX(this.trick.x0 + this.trick.direction * tricks[t.id].travel * this.scale);
      }
      this.hero.direction = this.trick.direction;
      this.setPartnerRoute();
      if (this.partner && !saved.followOrigin && Number.isFinite(t.partnerX0) && Number.isFinite(t.partnerX1)) {
        this.trick.partnerX0 = x(t.partnerX0);
        this.trick.partnerX1 = x(t.partnerX1);
      }
      // A tag already in progress stays on its old page. The gesture itself finishes here.
      this.drawTrick();
      return true;
    }
  }

  return Object.freeze({World, defaults, normalize, moves, lines, riders, signatures, lineMoves, duets});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BeatEngine;
