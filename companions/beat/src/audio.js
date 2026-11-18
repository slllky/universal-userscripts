// Original offline scores for Beat FM. Bars use a sixteen-step grid. In a drum
// pattern, 0–f are hits within a bar and a space separates the two bars.
// A note is written step:semitones:length. Melody pitches are relative to the
// key; bass pitches follow the local chord. Each letter of the form is four bars.
const BeatAudio = (() => {
  const scores = [
    {
      id:'curbside', title:'Curbside Frequency', genre:'Big beat', bpm:108, key:40, form:'IABDF', swing:.088,
      kit:'breaks', kick:'06a 038b', snare:'4c 4c', hat:'02468ac 02468ac', ghost:'b 7f',
      harmony:'0m7 0m7 5m7 7sus 8M7 5m7 0m9 7sus', instruments:['rubber','dust','brass'],
      bass:'0:0:2.8 5:3:.8 7:7:1.4 10:0:1.2 14:10:1.1 16:0:2 19:7:.8 22:5:1.4 25:3:1.7 30:-2:1.3',
      verse:'2:7:2 6:10 9:12:3 18:15 21:12:2 27:7:3', hook:'0:12:3 5:15 7:17:2 11:15 16:19:3 22:17 25:15:2 29:10:2',
      comp:'27b 36c', harmonyStyle:'stab'
    },
    {
      id:'wisteria', title:'Wisteria Underpass', genre:'Dusty hip-hop', bpm:82, key:38, form:'IABDAF', swing:.16,
      kit:'dust', kick:'069 09e', snare:'4c 4c', hat:'0268ace 0248ae', ghost:'b f',
      harmony:'0m9 5m9 10M7 3M7 8M7 5m7 3M7 7sus', instruments:['upright','dust','glass'],
      bass:'0:0:4.5 7:7:2 11:12:2 16:0:5 25:7:2 29:-2:2',
      verse:'3:10:3 8:7:2 13:5:2 21:3:4 29:0:2', hook:'0:7:4 6:10:2 10:14:4 17:15:3 22:14:3 28:10:3',
      comp:'06a 149', harmonyStyle:'keys'
    },
    {
      id:'kerosene', title:'Kerosene Laces', genre:'Jungle', bpm:168, key:41, form:'IABBDF', swing:.025,
      kit:'jungle', kick:'07a 038b', snare:'4ac 46c', hat:'02468ace 02368acf', ghost:'3df 9f',
      harmony:'0m7 0m7 8M7 10sus 5m7 8M7 10sus 7sus', instruments:['reese','air','reed'],
      bass:'0:0:5 7:12:1 10:0:4 16:0:3 19:-12:3 25:7:3 30:10:1.5',
      verse:'1:19:2 5:17:2 10:12:3 18:10:2 22:12:2 27:7:2', hook:'0:12:3 4:15:2 7:17 10:19:3 16:22:2 19:19:2 24:17:3 29:15:2',
      comp:'0 0', harmonyStyle:'wash'
    },
    {
      id:'umbrella', title:'Chrome Umbrella', genre:'Two-step garage', bpm:132, key:45, form:'IABDBF', swing:.15,
      kit:'garage', kick:'06b 029', snare:'4c 4c', hat:'267ae 236abef', ghost:'9 f',
      harmony:'0m9 5M7 7m7 2m7 5M7 7m7 0m9 10M7', instruments:['sub','bellkeys','reed'],
      bass:'0:-12:2 3:0:1 7:7:2 11:0:2 18:0:2 22:12:1 25:7:1.5 30:0:1.5',
      verse:'2:7:2 6:12 9:10:2 14:9 19:5:2 26:7:3', hook:'1:12:2 5:16 8:14:2 11:12 17:9:3 22:10 25:7:2 29:9',
      comp:'269 36ae', harmonyStyle:'stab'
    },
    {
      id:'quarters', title:'Pocket Full of Quarters', genre:'Arcade electro', bpm:119, key:36, form:'IABDBF', swing:.01,
      kit:'electro', kick:'08a 068', snare:'4c 4c', hat:'02468ace 0268ae', ghost:'f b',
      harmony:'0m 8M 3M 7sus 5m 10M 3M 7M', instruments:['pulse','prism','pixel'],
      bass:'0:0:2 3:12 6:7:2 10:0:2 14:12 16:0:2 20:7 23:12 26:7:2 30:10',
      verse:'0:0 2:7 4:12 7:15:2 11:14 14:10 16:7 18:12 21:10:2 26:5 29:7',
      hook:'0:12:2 3:15 6:19:2 10:22 12:19 14:15 16:17:2 20:15 23:14:2 28:7 30:10',
      comp:'08 08', harmonyStyle:'arp'
    },
    {
      id:'moonroof', title:'Exit Through the Moonroof', genre:'Synthwave', bpm:89, key:43, form:'IABDBF', swing:0,
      kit:'electro', kick:'08 08a', snare:'4c 4c', hat:'02468ace 02468ace', ghost:'- f',
      harmony:'0m 8M7 3M7 10sus 5m7 8M7 0m 7sus', instruments:['saw','air','neon'],
      bass:'0:-12:1.7 2:0:1.6 4:-12:1.7 6:7:1.7 8:-12:1.7 10:0:1.6 12:7:1.7 14:0:1.6',
      verse:'0:7:5 8:10:3 12:12:3 16:15:6 25:14:3 29:10:2', hook:'0:19:6 7:17:3 11:15:4 16:14:5 22:12:3 27:7:4',
      comp:'0 0', harmonyStyle:'wash'
    },
    {
      id:'soda', title:'Peach Soda Static', genre:'Future funk', bpm:103, key:41, form:'IABABF', swing:.095,
      kit:'disco', kick:'048c 048c', snare:'4c 4c', hat:'246ae 2469ace', ghost:'b 3',
      harmony:'0M9 2m7 7_9 0M7 5M7 4m7 2m9 7_9', instruments:['rubber','clav','brass'],
      bass:'0:0:2 3:12 6:7:2 9:10 12:12:2 15:7 16:0:2 21:7 23:9 26:12:2 30:7',
      verse:'1:4:2 4:7 7:9:2 11:12:3 19:11 22:9:2 26:7:3', hook:'0:12:2 3:16 5:14 8:12:3 13:9:2 17:7 20:9:3 26:12:3',
      comp:'269e 26be', harmonyStyle:'chop'
    },
    {
      id:'boiler', title:'Boiler Room Broadcast', genre:'Acid techno', bpm:137, key:37, form:'IABDBBF', swing:.025,
      kit:'machine', kick:'048c 048c', snare:'4c 4c', hat:'26ae 26aef', ghost:'- b',
      harmony:'0m 0m 3M 0m 5m 3M 0m 7sus', instruments:['acid','midnight','wire'],
      bass:'0:0:2 2:12 4:0 6:7:2 9:0 11:12 13:10:2 15:7 16:0:2 18:12 21:7 23:0:2 26:15 28:12 30:7',
      verse:'3:12 7:7:2 14:10 19:15 23:12:2 30:7', hook:'0:12:2 4:15 6:19:2 11:17:2 15:15 19:12 23:10:3 29:7:2',
      comp:'2a 2a', harmonyStyle:'stab'
    },
    {
      id:'platform', title:'Blue Hour at Platform Nine', genre:'Liquid halftime', bpm:74, key:35, form:'IABDAF', swing:.05,
      kit:'liquid', kick:'0b 069', snare:'8 8', hat:'02468acf 03468ace', ghost:'6f 4e',
      harmony:'0m9 3M7 8M9 5m9 10sus 5m9 3M9 7sus', instruments:['sub','air','glass'],
      bass:'0:0:9 12:7:2.5 16:0:6 25:12:3 30:7:1.5',
      verse:'2:14:4 8:10:5 17:7:5 26:3:4', hook:'0:19:6 8:22:3 13:19:2 17:17:5 24:15:4 29:14:2',
      comp:'0 0', harmonyStyle:'wash'
    },
    {
      id:'chalk', title:'Chalk Lines in Dub', genre:'Dub', bpm:76, key:45, form:'IABDDF', swing:.11,
      kit:'dub', kick:'8 8e', snare:'8 8', hat:'26ace 26ae', ghost:'- 3',
      harmony:'0m7 0m7 5m7 7sus 5m7 0m7 10M 7sus', instruments:['sub','clav','reed'],
      bass:'0:-12:3.8 6:0:2 9:3:2 13:7:2 17:0:4 24:-12:3 29:7:2',
      verse:'4:7:2 11:10:2 19:7:4 28:5:2', hook:'1:12:3 6:10:2 10:7:4 18:5:3 24:3:2 29:0:2',
      comp:'26ae 26ae', harmonyStyle:'skank'
    },
    {
      id:'safetypin', title:'Safety Pin Polaroid', genre:'Skate punk', bpm:151, key:38, form:'IABABDF', swing:0,
      kit:'live', kick:'068 028a', snare:'4c 4c', hat:'02468ace 02468ace', ghost:'b f',
      harmony:'0p 7p 9p 5p 5p 7p 0p 9p', instruments:['pick','guitar','twin'],
      bass:'0:0:1.6 2:0:1.5 4:7:1.6 6:0:1.6 8:0:1.6 10:7:1.6 12:12:1.5 14:7:1.5',
      verse:'0:7:3 4:9:2 8:7:2 12:4:3 18:2:3 23:4:2 28:7:3', hook:'0:12:4 5:14:2 8:16:4 13:14:2 16:12:4 21:9:2 24:7:5',
      comp:'02468ace 02468ace', harmonyStyle:'chop'
    },
    {
      id:'lantern', title:'Paper Lantern Express', genre:'Deep house', bpm:124, key:45, form:'IABDBBF', swing:.06,
      kit:'house', kick:'048c 048c', snare:'4c 4c', hat:'26ae 26aef', ghost:'b 3',
      harmony:'0m9 5m9 8M9 7sus 3M7 10_9 5m9 7sus', instruments:['sub','bellkeys','prism'],
      bass:'2:-12:2.5 6:0:1.6 9:7:2 14:0:1.5 18:-12:2.5 22:0:2 26:7:1.6 29:10:2',
      verse:'3:7:2 7:10:2 12:14:2 19:12:3 27:7:3', hook:'0:12:3 4:15:2 7:19:3 12:17:2 16:14:4 23:10:3 29:7:2',
      comp:'26b 26a', harmonyStyle:'keys'
    },
    {
      id:'mirage', title:'Quarterpipe Mirage', genre:'Desert trip-hop', bpm:95, key:40, form:'IABDAF', swing:.13,
      kit:'dust', kick:'07a 03a', snare:'4c c', hat:'0369c 036ace', ghost:'9 47',
      harmony:'0sus 1M7 0m 10m7 1M 5m 8M7 7sus', instruments:['upright','midnight','oud'],
      bass:'0:0:4 6:7:2 10:0:4 16:0:3 21:12:1 23:7:3 28:-2:2',
      verse:'0:0:2 3:1 5:5:2 9:4:3 15:1 18:0:4 25:-2:2 29:1:2', hook:'0:12:4 6:13:2 9:12:3 14:8 16:7:3 21:5:2 25:4:3 30:1',
      comp:'0 08', harmonyStyle:'wash'
    },
    {
      id:'serration', title:'Neon Serration', genre:'Grime', bpm:146, key:41, form:'IABDBF', swing:.025,
      kit:'grime', kick:'03b 069e', snare:'8 8', hat:'036abe 02569cef', ghost:'7 f',
      harmony:'0m 0m 1M 0m 6p 1M 0m 7p', instruments:['reese','midnight','brass'],
      bass:'0:-12:4 6:0:1.5 11:-12:4 17:0:2 22:7:1.8 25:0:3 30:-12:1.5',
      verse:'0:7 3:12 6:7 11:6:3 16:0:3 22:1 28:6:2', hook:'0:12:2 4:13 7:18:3 12:13 16:12:3 22:7 25:6:3 30:1',
      comp:'0 8', harmonyStyle:'stab'
    },
    {
      id:'firstlight', title:'Last Train, First Light', genre:'Balearic house', bpm:110, key:38, form:'IABDBF', swing:.075,
      kit:'coast', kick:'048c 048c', snare:'4c 4c', hat:'26ace 246ae', ghost:'f 3',
      harmony:'0M9 7M 9m7 5M9 2m9 5M7 0M9 7sus', instruments:['upright','air','steel'],
      bass:'0:0:3 6:7:2 10:12:2 14:7 16:0:4 22:7:2 26:9:2 30:7',
      verse:'1:4:3 6:7:2 10:9:3 18:7:4 26:2:3', hook:'0:12:4 5:14:2 9:16:4 16:19:4 22:16:2 26:14:3 30:9',
      comp:'0 0', harmonyStyle:'wash'
    }
  ];

  const chords = {
    M:[0,4,7], m:[0,3,7], M7:[0,4,7,11], m7:[0,3,7,10], sus:[0,5,7,10],
    _9:[0,4,10,14], M9:[0,4,11,14], m9:[0,3,10,14], p:[0,7,12]
  };
  // Drum kit voicings are kick sweep start, kick body, snare color, hat color.
  const kits = {
    breaks:[143,44,1950,6700], dust:[112,49,1380,4900], jungle:[164,52,2350,7600],
    garage:[131,46,2190,7200], electro:[155,44,1580,6440], disco:[129,52,2400,7300],
    machine:[157,43,1880,8200], liquid:[111,40,1310,6850], dub:[103,48,980,5200],
    live:[174,65,2250,6550], house:[132,47,1890,7600], grime:[125,39,2450,7900],
    coast:[115,50,2130,6850]
  };
  // Waveform, opening/closing filter frequencies, resonance, peak, attack, sustain.
  const patches = {
    rubber:['triangle',1600,410,.85,.34,.008,.31], upright:['triangle',1050,270,.75,.36,.012,.23],
    sub:['sine',0,0,0,.44,.014,.74], pulse:['square',1180,380,1,.17,.006,.42],
    reese:['sawtooth',695,232,1.3,.24,.024,.7], saw:['sawtooth',940,265,.9,.25,.009,.48],
    acid:['sawtooth',2400,270,5,.23,.006,.48], pick:['sawtooth',2030,510,.78,.27,.004,.41],
    dust:['triangle',2050,700,.9,.26,.012,.23], glass:['sine',0,0,0,.25,.006,.15],
    brass:['sawtooth',830,2570,1.25,.19,.045,.56], reed:['triangle',1800,2870,1.8,.24,.035,.50],
    air:['sawtooth',690,1520,.65,.16,.16,.82], bellkeys:['sine',0,0,0,.28,.007,.26],
    pixel:['square',2790,1930,.74,.13,.005,.67], prism:['triangle',4100,1280,1.1,.26,.008,.40],
    neon:['sawtooth',1170,3450,.92,.19,.063,.67], clav:['square',2060,510,1.9,.19,.005,.16],
    midnight:['triangle',580,1040,1.15,.23,.08,.71], wire:['square',2370,840,2.5,.13,.008,.43],
    guitar:['sawtooth',2730,1560,.72,.18,.006,.6], twin:['square',2320,1580,.85,.15,.019,.68],
    oud:['triangle',3150,540,2.1,.28,.004,.16], steel:['sine',0,0,0,.28,.008,.34]
  };
  const pitch = note => 440 * 2 ** ((note - 69) / 12);
  function hits(pattern) {
    const steps = new Set();
    pattern.split(' ').forEach((bar, i) => {
      for (const mark of bar) if (mark !== '-') steps.add(i * 16 + Number.parseInt(mark, 16));
    });
    return steps;
  }
  function notes(phrase, repeatBar = false) {
    const events = new Map();
    for (const item of phrase.split(' ')) {
      const [step, offset, length = 1.25] = item.split(':').map(Number);
      events.set(step, { offset, length });
    }
    if (repeatBar && ![...events.keys()].some(step => step >= 16)) {
      for (const [step, note] of [...events]) events.set(step + 16, note);
    }
    return events;
  }
  for (const song of scores) {
    song.bars = song.form.length * 4;
    for (const name of ['kick','snare','hat','ghost','comp']) song[name] = hits(song[name]);
    song.changes = song.harmony.split(' ').map(name => {
      const [, root, symbol] = /^(\d+)(.+)$/.exec(name);
      return { root: Number(root), intervals: chords[symbol] };
    });
    for (const name of ['bass','verse','hook']) song[name] = notes(song[name], name === 'bass');
  }
  const tracks = Object.freeze(scores.map(({id,title,genre,bpm,bars}) => Object.freeze({id,title,genre,bpm,bars})));

  function create(win, options = {}) {
    let station = null, volume = .35, selected = 0, order = 'sequence';
    let shuffleBag = [], history = [];
    function voice(s, source, filter, at, duration, level, attack = .004, sustain = 0) {
      const envelope = s.ctx.createGain();
      const nodes = filter ? [source, filter, envelope] : [source, envelope];
      for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
      envelope.connect(s.master);
      envelope.gain.setValueAtTime(.0001, at);
      envelope.gain.exponentialRampToValueAtTime(level, at + Math.min(duration * .35, attack));
      if (sustain) envelope.gain.exponentialRampToValueAtTime(level * sustain, at + duration * .70);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
      const release = () => {
        if (!s.voices.delete(source)) return;
        source.onended = null;
        for (const node of nodes) node.disconnect();
      };
      if (envelope.gain.cancelScheduledValues) release.fade = () => {
        const now = s.ctx.currentTime;
        if (envelope.gain.cancelAndHoldAtTime) envelope.gain.cancelAndHoldAtTime(now);
        else {
          const level = envelope.gain.value;
          envelope.gain.cancelScheduledValues(now);
          envelope.gain.setValueAtTime(Math.max(.0001,level),now);
        }
        envelope.gain.exponentialRampToValueAtTime(.0001,now + .015);
        try { source.stop(now + .018); } catch { release(); }
      };
      s.voices.set(source, release);
      source.onended = release;
      source.start(at);
      source.stop(at + duration + .006);
    }

    function tone(s, at, from, to, duration, level, type = 'sine', attack, filter = null, sustain = 0) {
      const osc = s.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(from, at);
      if (from !== to) osc.frequency.exponentialRampToValueAtTime(to, at + duration * .83);
      voice(s, osc, filter, at, duration, level, attack, sustain);
    }

    function instrument(s, patch, note, at, duration, weight, motion = 1) {
      const [wave, from, to, q, level, attack, sustain] = patches[patch];
      const hz = pitch(note);
      let filter = null;
      if (from) {
        filter = s.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = q;
        filter.frequency.setValueAtTime(from * motion, at);
        filter.frequency.exponentialRampToValueAtTime(to * motion, at + duration * .8);
      }
      tone(s, at, hz, hz, duration, level * weight, wave, attack, filter, sustain);
      // A second, quieter oscillator gives these voices their characteristic attack or width.
      if (['glass','steel','bellkeys'].includes(patch)) {
        const ratio = patch === 'glass' ? 3.01 : patch === 'steel' ? 2.38 : 2;
        tone(s, at, hz * ratio, hz * ratio, Math.min(duration * .55,.24), level * weight * .30);
      } else if (patch === 'reese' || patch === 'neon' || patch === 'twin') {
        const ratio = patch === 'twin' ? 1.499 : 1.006;
        tone(s, at + .003, hz * ratio, hz * ratio, duration * .92, level * weight * .24, 'triangle', attack);
      }
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

    function drums(s, song, section, bar, index, at) {
      const [top, bottom, skin, metal] = kits[song.kit];
      const beat = index % 16;
      const drop = section === 'D', hook = section === 'B' || section === 'F';
      if (song.kick.has(index) && (!drop || beat === 0 || beat === 8)) {
        tone(s, at, top, bottom, song.kit === 'live' ? .135 : .18, .58);
      }
      if (song.snare.has(index) && (!drop || beat >= 8)) {
        if (song.kit === 'dub') tone(s, at, 544, 347, .095, .24, 'triangle');
        else {
          hiss(s, at, skin, song.kit === 'jungle' ? .105 : .15, .25, 'bandpass');
          tone(s, at, 200, 119, .09, .16, 'triangle');
          if (['garage','house','disco','coast'].includes(song.kit)) hiss(s, at + .016, skin * 1.24, .080, .12, 'bandpass');
        }
      } else if (!drop && song.ghost.has(index)) hiss(s, at, skin * .82, .057, .068, 'bandpass');
      if (song.hat.has(index) && (!drop || beat % 4 === 2)) {
        const open = beat === 10 && bar % 2 || (song.kit === 'house' && beat % 4 === 2);
        hiss(s, at, metal, open ? .135 : .042, beat % 4 === 0 ? .10 : .077);
      }
      if (hook && bar % 4 === 3 && beat >= 13 && beat !== 14) {
        hiss(s, at, skin * (beat === 13 ? .85 : 1.18), .065, .1, 'bandpass');
      }
    }

    function comp(s, song, harmony, section, index, at, unit) {
      const style = song.harmonyStyle, beat = index % 16;
      const isArp = style === 'arp' || (section === 'D' && style === 'keys');
      if (isArp ? beat % 2 : !song.comp.has(index)) return;
      const length = {wash:14.5, keys:4.8, stab:1.6, chop:1.0, skank:1.15, arp:1.5}[style];
      const root = song.key + harmony.root;
      // Compact voicings keep the comping register below the main melody.
      const voicing = harmony.intervals.map(n => root + 12 + n);
      if (isArp) {
        const note = voicing[([0,2,1,3,1,2,0,1][beat / 2]) % voicing.length];
        instrument(s,song.instruments[1],note,at,unit * 1.75,.43);
        return;
      }
      if (style === 'wash' && beat !== 0) return;
      const weight = style === 'wash' ? .43 : .45;
      voicing.forEach((note, i) => {
        // A few milliseconds of roll make stabs and keyboard chords breathe.
        const when = at + i * (style === 'keys' ? .011 : .002);
        instrument(s,song.instruments[1],note,when,length * unit,weight);
        if (style === 'skank' && beat === 14) {
          instrument(s,song.instruments[1],note,when + unit * 3,length * unit,weight * .28);
        }
      });
    }

    function step(s, at) {
      const song = scores[selected];
      const unit = 60 / song.bpm / 4;
      const bar = Math.floor(s.step / 16), index = s.step % 32, beat = index % 16;
      const section = song.form[Math.floor(bar / 4)], hook = section === 'B' || section === 'F';
      const harmony = song.changes[(hook ? 4 : 0) + (bar + (section === 'D' ? 2 : 0)) % 4];
      const nudged = at + (index % 2 ? unit * song.swing : 0);
      const closing = bar === song.bars - 1;
      if (closing && beat >= 12) {
        if (beat === 12) {
          instrument(s,song.instruments[0],song.key,nudged,unit * 3,.8);
          instrument(s,song.instruments[2],song.key + 24,nudged,unit * 3.4,.67);
        }
        return;
      }
      drums(s,song,section,bar,index,nudged);
      const bass = song.bass.get(index);
      if (bass && (section !== 'D' || beat % 4 === 0)) {
        const filter = song.id === 'boiler' ? .72 + .1 * (bar % 6) + .06 * beat : 1;
        instrument(s,song.instruments[0],song.key + harmony.root + bass.offset,nudged + .008,
          bass.length * unit,1,filter);
      }
      // Start Curbside with the original unaccompanied two-bar beat and bass.
      if (song.id === 'curbside' && bar < 2) return;
      comp(s,song,harmony,section,index,nudged,unit);
      const phrase = hook ? song.hook : song.verse;
      const note = phrase.get(index);
      if (!note || (section === 'I' && bar < 2) || (section === 'D' && beat % 4 > 1)) return;
      const lastAnswer = bar % 4 >= 2;
      const octave = section === 'D' ? 0 : 12;
      const midi = song.key + octave + note.offset + (lastAnswer && hook && beat >= 12 ? 12 : 0);
      instrument(s,song.instruments[2],midi,nudged,note.length * unit,hook ? .92 : .75);
      if ((song.kit === 'dub' || song.kit === 'liquid') && beat < 11) {
        instrument(s,song.instruments[2],midi,nudged + unit * 3,note.length * unit * .73,.23);
      }
    }

    function nextIndex() {
      if (order !== 'shuffle') return (selected + 1) % scores.length;
      if (!shuffleBag.length) {
        shuffleBag = scores.map((_, index) => index).filter(index => index !== selected);
        for (let i = shuffleBag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffleBag[i],shuffleBag[j]] = [shuffleBag[j],shuffleBag[i]];
        }
      }
      return shuffleBag.pop();
    }

    function quietVoices(s, fade = false) {
      for (const [source, release] of s.voices) {
        if (fade && release.fade) { release.fade(); continue; }
        try { source.stop(); } catch { /* A source may already have ended. */ }
        release();
      }
    }

    function change(index, manual, remember = true) {
      if (remember && selected !== index) {
        history.push(selected);
        if (history.length > 60) history.shift();
      }
      selected = index;
      const s = station;
      if (s?.master) {
        s.step = 0;
        if (manual) {
          quietVoices(s,true);
          s.lastAccent = -1;
          s.next = s.ctx.currentTime + .032;
        }
      }
      options.onTrack?.(tracks[selected]);
      return tracks[selected];
    }

    function schedule(s) {
      if (station !== s || s.ctx.state !== 'running') return;
      const now = s.ctx.currentTime;
      function advanceIfNeeded() {
        if (s.step < scores[selected].bars * 16) return;
        if (order === 'loop') s.step = 0;
        else change(nextIndex(),false);
      }
      // A large operating-system clock jump resumes the current spot. Shorter
      // stalls skip ahead on the grid, including across track/tempo boundaries.
      if (now - s.next > 600) s.next = now + .025;
      while (s.next < now && station === s) {
        advanceIfNeeded();
        const song = scores[selected], unit = 60 / song.bpm / 4;
        const missed = Math.min(song.bars * 16 - s.step, Math.ceil((now - s.next) / unit));
        s.step += missed;
        s.next += missed * unit;
      }
      while (s.next <= now + .13 && station === s) {
        advanceIfNeeded();
        step(s,s.next);
        s.step++;
        s.next += 60 / scores[selected].bpm / 4;
      }
    }

    function stop() {
      const s = station;
      if (!s) return;
      station = null;
      s.cancelStart?.();
      if (s.timer !== null) win.clearInterval(s.timer);
      s.master?.disconnect();
      quietVoices(s);
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
        s = { ctx, voices: new Map(), timer: null, step: 0, next: 0, lastAccent: -1 };
        station = s;
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
        s.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .34), ctx.sampleRate);
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
      const tonic = scores[selected].key + 36;
      if (type === 'line') {
        tone(s, at, pitch(tonic - 5), pitch(tonic), .125, .11, 'triangle');
        tone(s, at + .12, pitch(tonic), pitch(tonic), .19, .11, 'triangle');
      } else if (type === 'tag') {
        hiss(s, at, 2600, .12, .17, 'bandpass', 1100);
        hiss(s, at + .12, 1300, .1, .14, 'bandpass', 3200);
      } else if (type === 'pickup') tone(s, at, pitch(tonic), pitch(tonic + 7), .085, .085);
      else if (type === 'action' && event.move === 'grind') hiss(s, at, 900, .16, .10, 'bandpass', 2150);
      else return;
      s.lastAccent = at;
    }

    return {
      toggle, stop, setVolume, accent, current: () => tracks[selected],
      select(id) {
        const index = tracks.findIndex(track => track.id === id);
        if (index >= 0 && index !== selected) { shuffleBag = []; return change(index,true); }
        return tracks[selected];
      },
      next: () => change(nextIndex(),true),
      previous() {
        const index = order === 'shuffle' && history.length ? history.pop() : (selected + scores.length - 1) % scores.length;
        return change(index,true,false);
      },
      setOrder(value) {
        if (['sequence','loop','shuffle'].includes(value) && order !== value) {
          order = value; shuffleBag = [];
        }
        return order;
      }
    };
  }
  return { create, tracks };
})();
