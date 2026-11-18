/* Ooo Crew's deterministic simulation. No browser globals or page-content access. */
const OooCore = (() => {
  'use strict';
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const finite = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const cast = {
    finn: { name: 'Finn', subtitle: 'Human. Hero. Excellent hat.', color: '#43a9c2', height: 62, speed: 51, facing: 1, lines: ['Adventure: extremely yes.', 'This tab has quest energy.', 'Mathematical!'], trick: 'Hero hop' },
    jake: { name: 'Jake', subtitle: 'A very flexible best friend.', color: '#dfa32b', height: 58, speed: 40, facing: 1, lines: ['Stretch first. Sandwich later.', 'Dude. We got this.', 'I could probably be a bridge.'], trick: 'Big stretch' },
    marceline: { name: 'Marceline', subtitle: 'Vampire queen. Tiny concert.', color: '#9f6579', height: 77, speed: 38, facing: -1, float: 27, lines: ['This one is for the weird tabs.', 'Okay, one more song.', 'The acoustics in here are bizarre.'], trick: 'Bass solo' },
    lsp: { name: 'Lumpy Space Princess', short: 'LSP', subtitle: 'Every entrance is an event.', color: '#ba8cba', height: 43, speed: 28, facing: -1, float: 24, lines: ['This is MY dramatic entrance.', 'Oh my glob. An audience.', 'I am the main quest.'], trick: 'Drama break' },
    gunter: { name: 'Gunter', subtitle: 'Small penguin. Large agenda.', color: '#637e8c', height: 37, speed: 43, facing: 1, lines: ['Wenk.', 'WENK.', '...wenk?'], trick: 'Penguin wiggle' },
    bubblegum: { name: 'Princess Bubblegum', short: 'Bubblegum', subtitle: 'Science with a candy coating.', color: '#d66e9b', height: 69, speed: 27, facing: -1, lines: ['A perfectly controlled experiment.', 'Probably not radioactive.', 'Data first. Celebrating second.'], trick: 'Candy chemistry' },
    flame: { name: 'Flame Princess', subtitle: 'A little warmth for your world.', color: '#d8803f', height: 64, speed: 33, facing: -1, lines: ['I brought the warm lighting.', 'A tiny, responsible fire.', 'Things are heating up.'], trick: 'Fire flourish' },
    banana: { name: 'Banana Guard', subtitle: 'On patrol. Mostly.', color: '#c7a93f', height: 64, speed: 31, facing: -1, lines: ['Perimeter: banana secured.', 'Was I supposed to be guarding this?', 'Nothing suspicious. Probably.'], trick: 'Royal salute' },
    corn: { name: 'Candy Corn', subtitle: 'Here for the snacks and vibes.', color: '#c99a4d', height: 45, speed: 25, facing: -1, lines: ['A very sweet situation.', 'I brought moral support.', 'Snack break? Snack break.'], trick: 'Happy hop' },
    fionna: { name: 'Fionna', subtitle: 'Big adventures. Bigger hat ears.', color: '#57a7be', height: 66, speed: 54, facing: -1, lines: ['Okay, this is definitely a side quest.', 'Cake. We are taking the scenic route.', 'Adventure is a perfectly good plan.'], trick: 'Hero hop' },
    cake: { name: 'Cake', subtitle: 'A cat with places to be.', color: '#d2b34b', height: 40, speed: 49, facing: -1, lines: ['I found a shortcut. Probably.', 'That snack looks unattended.', 'Follow the fabulous cat.'], trick: 'Cat wiggle' },
    wildberry: { name: 'Wildberry Princess', short: 'Wildberry', subtitle: 'A very berry royal visit.', color: '#c15586', height: 48, speed: 27, facing: -1, lines: ['A berry important appearance.', 'The party needed more pink.', 'Royal snack inspection.'], trick: 'Berry bounce' },
    slime: { name: 'Slime Princess', short: 'Slime', subtitle: 'Tiny crown. Excellent wobble.', color: '#a1ad4c', height: 30, speed: 23, facing: -1, lines: ['Just going with the flow.', 'A royal little wobble.', 'No rush. I am mostly goo.'], trick: 'Royal wobble' },
    hotdog: { name: 'Hot Dog Princess', short: 'Hot Dog', subtitle: 'The sweetest little sausage.', color: '#b47b42', height: 34, speed: 35, facing: -1, lines: ['The bun stops here.', 'I heard there were snacks.', 'A royal walk around the block.'], trick: 'Happy wiggle' },
    muscle: { name: 'Muscle Princess', short: 'Muscle', subtitle: 'Heavy lifting. Light browsing.', color: '#63a579', height: 78, speed: 30, facing: -1, lines: ['I can carry the whole party.', 'Strong opinions. Stronger arms.', 'Victory stretch!'], trick: 'Victory bounce' },
    turtle: { name: 'Turtle Princess', short: 'Turtle', subtitle: 'A quiet chapter between quests.', color: '#94a36a', height: 54, speed: 18, facing: -1, lines: ['Just one more chapter.', 'Every quest needs a reading break.', 'I saved your place.'], trick: 'Book break' },
    batbug: { name: 'Bat Bug', subtitle: 'A tiny flapping troublemaker.', color: '#497f61', height: 27, speed: 56, facing: -1, float: 65, lines: ['Flap. Flap. Very busy.', 'A small nocturnal detour.', 'The ceiling looked interesting.'], trick: 'Wing wiggle' }
  };
  const presets = {
    friends: ['finn', 'jake', 'marceline', 'lsp', 'gunter'],
    candy: ['finn', 'jake', 'bubblegum', 'flame', 'banana', 'corn'],
    midnight: ['marceline', 'lsp', 'gunter'],
    counterparts: ['fionna','cake','finn','jake','batbug'],
    royalty: ['bubblegum','flame','wildberry','slime','hotdog','muscle','turtle'],
    everyone: Object.keys(cast)
  };
  const defaults = { enabled: true, selected: presets.friends, size: 1.1, speed: 1, activity: 1, bottom: 8, theme: 'treehouse', motion: 'system', wander: true, autoScenes: true, chatter: true, sound: false, marcelineArt: 'toon', hiddenSites: [] };
  function sanitize(value) {
    const v = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const out = { ...defaults, selected: [...defaults.selected], hiddenSites: [] };
    for (const k of ['enabled', 'wander', 'autoScenes', 'chatter', 'sound']) if (typeof v[k] === 'boolean') out[k] = v[k];
    for (const [key, min, max] of [['size', .65, 1.75], ['speed', .4, 1.8], ['activity', .35, 2], ['bottom', 0, 240]]) out[key] = clamp(finite(v[key], defaults[key]), min, max);
    for (const [key, allowed] of Object.entries({ theme: ['treehouse', 'candy', 'night'], motion: ['system', 'gentle', 'full'], marcelineArt: ['toon', 'archive'] })) if (allowed.includes(v[key])) out[key] = v[key];
    if (Array.isArray(v.selected)) out.selected = [...new Set(v.selected.filter(k => Object.hasOwn(cast, k)))];
    if (Array.isArray(v.hiddenSites)) out.hiddenSites = [...new Set(v.hiddenSites.filter(k => typeof k === 'string' && /^[a-z0-9.:-]{1,253}$/i.test(k)))].slice(-50);
    return out;
  }
  const scenes = {
    heroes: { title: 'Best-bud bump', note: 'Finn + Jake celebrate a very small victory.', needs: ['finn', 'jake'], duration: 6, color: '#dfac3c' },
    concert: { title: 'Tiny desk concert', note: 'Marceline plays. The crew finds its rhythm.', needs: ['marceline'], min: 2, duration: 11, color: '#bc87af' },
    heist: { title: 'The snack incident', note: 'Gunter borrows a snack. Jake has questions.', needs: ['gunter', 'jake'], duration: 9, color: '#d99553' },
    science: { title: 'Candy chemistry', note: 'Bubblegum and Flame Princess try a tiny experiment.', needs: ['bubblegum', 'flame'], duration: 9, color: '#dd8ba9' },
    parade: { title: 'Lump royalty', note: 'LSP requests a parade. Banana Guard complies.', needs: ['lsp', 'banana'], duration: 9, color: '#b58ac2' },
    campfire: { title: 'Campfire break', note: 'A warm little pause with whoever is here.', needs: [], min: 2, duration: 14, color: '#d08b42' },
    duo: { title: 'Cake’s shortcut', note: 'Cake leads. Fionna tries to keep up.', needs: ['fionna','cake'], duration: 8, color: '#c7ac50' },
    batflight: { title: 'After-dark rehearsal', note: 'Marceline plays while a Bat Bug circles the stage.', needs: ['marceline','batbug'], duration: 10, color: '#79a180' }
  };
  class World {
    constructor(settings = {}, width = 1200, height = 800, random = Math.random) {
      this.settings = sanitize(settings); this.random = random; this.width = Math.max(1, finite(width, 1200)); this.height = Math.max(1, finite(height, 800));
      this.actors = []; this.props = []; this.events = []; this.time = 0; this.scene = null; this.nextScene = 16;
      this.paused = false; this.systemReduced = false; this.pointer = null; this.beacon = null; this.serial = 0; this.sceneCount = 0;
      this.apply(this.settings);
    }
    get gentle() { return this.settings.motion === 'gentle' || (this.settings.motion === 'system' && this.systemReduced); }
    get scale() { return Math.min(this.settings.size, Math.max(.35, this.height / 170), Math.max(.35, this.width / 160)); }
    get floor() { return Math.max(Math.min(100 * this.scale, this.height - 4), this.height - Math.min(this.settings.bottom, this.height * .4) - 7); }
    range() { const pad = Math.min(56 * this.scale, this.width / 2); return [pad, Math.max(pad, this.width - pad)]; }
    bound(x) { const [a,b] = this.range(); return clamp(finite(x, this.width / 2), a, b); }
    emit(type, data = {}) { this.events.push({ type, ...data }); if (this.events.length > 30) this.events.shift(); }
    drain() { return this.events.splice(0); }
    available(id) { const s = scenes[id]; return !!s && s.needs.every(k => this.actors.some(a => a.id === k)) && this.actors.length >= (s.min || 1); }
    apply(settings) {
      const next = sanitize(settings); this.settings = next;
      if (this.scene && (!this.scene.ids.every(id => next.selected.includes(id)) || !next.enabled)) this.cancelScene();
      this.actors = next.selected.map((id, i) => this.actors.find(a => a.id === id) || ({ id, x: this.bound(this.width * (i+1)/(next.selected.length+1)), direction: i%2 ? -1 : 1, state: 'idle', elapsed: 0, duration: 1 + this.random()*3, rest: 2 + this.random()*8, seed: this.random()*100, lift: 0, dragY: null, target: null, bubble: '', bubbleUntil: 0 }));
      for (const p of this.props) if (!this.actors.some(a => a.id === p.owner)) p.owner = null;
      for (const a of this.actors) { a.x = this.bound(a.x); if (a.target !== null) a.target = this.bound(a.target); }
    }
    resize(width, height) {
      const old = this.width; this.width = Math.max(1, finite(width, this.width)); this.height = Math.max(1, finite(height, this.height));
      this.cancelScene(); this.beacon = null;
      for (const a of this.actors) { a.x = this.bound(a.x * this.width/old); a.target = null; a.dragY = null; this.state(a, 'idle', 1); }
      for (const p of this.props) p.x = this.bound(p.x * this.width/old);
    }
    state(a, name, duration) { a.state = name; a.elapsed = 0; a.duration = duration; a.lift = 0; }
    say(a, text, duration = 3) {
      if (!this.settings.chatter) return;
      const others = this.actors.filter(b => b !== a && b.bubbleUntil > this.time);
      if (others.length > 1) others[0].bubbleUntil = 0;
      a.bubble = text; a.bubbleUntil = this.time + duration;
    }
    actor(id) { return this.actors.find(a => a.id === id); }
    cancelScene() {
      if (!this.scene) return;
      for (const a of this.actors) if (this.scene.ids.includes(a.id)) { this.state(a, 'idle', 1); a.target = null; a.rest = 6; }
      this.scene = null; this.nextScene = this.time + 18;
    }
    startScene(id) {
      if (!this.settings.enabled || this.paused || !this.available(id) || this.actors.some(a => a.state === 'drag')) return false;
      this.cancelScene(); const def = scenes[id]; let ids = [...def.needs];
      const guests=this.actors.filter(a=>!ids.includes(a.id));
      const offset=guests.length?this.sceneCount%guests.length:0;
      const rotated=[...guests.slice(offset),...guests.slice(0,offset)];
      if (id === 'concert') ids.push(...rotated.slice(0,4).map(a => a.id));
      if (id === 'campfire') ids = rotated.slice(0,6).map(a => a.id);
      const [min,max] = this.range(); const span = Math.min(max-min, (ids.length-1)*96*this.scale);
      const center = this.width / 2; const positions = ids.map((_,i) => this.bound(center-span/2+(ids.length===1 ? 0 : i*span/(ids.length-1))));
      this.scene = { id, ids, positions, center, phase: 'gather', elapsed: 0, duration: def.duration, announced: false, seed: this.serial++ };
      ids.forEach((key,i) => { const a=this.actor(key); this.state(a,'walk',99); a.target=positions[i]; a.bubbleUntil=0; });
      this.emit('scene', { id, title: def.title }); return true;
    }
    trick(id) {
      const a=this.actor(id); if (!a || !this.settings.enabled || this.paused) return false;
      if (this.scene?.ids.includes(id)) this.cancelScene();
      a.target=null; a.rest=10;
      const state = { jake:'stretch', marceline:'music', lsp:'dance', gunter:'dance', bubblegum:'magic', flame:'magic', cake:'dance', slime:'dance', hotdog:'dance', turtle:'read', batbug:'dance' }[id] || 'cheer';
      this.state(a,state,state==='music'?7:3.5);
      if (state==='stretch') a.reach={ x:a.x, y:Math.max(45,this.floor-180*this.scale) };
      this.say(a,cast[id].lines[Math.floor(this.random()*cast[id].lines.length)]);
      this.emit('trick',{id}); return true;
    }
    dropSnack(x) {
      if (!this.settings.enabled || this.paused || !this.actors.length) return false;
      if(this.gentle){const a=[...this.actors].sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];if(this.scene?.ids.includes(a.id))this.cancelScene();this.state(a,'eat',2.3);this.say(a,a.id==='gunter'?'Wenk. (Mine.)':'Snack acquired.');this.emit('fed',{id:a.id});return true;}
      if(this.props.length>=3) this.props.shift();
      this.props.push({id:++this.serial,x:this.bound(x),born:this.time,owner:null,eaten:false}); this.emit('snack'); return true;
    }
    call(x) {
      if (!this.settings.enabled || this.paused) return;
      this.cancelScene(); this.beacon={x:this.bound(x),until:this.time+12};
      this.actors.forEach((a,i)=>{ if(a.state==='drag')return;this.state(a,'walk',15);a.target=this.bound(x+(i-(this.actors.length-1)/2)*48*this.scale); });
    }
    startDrag(id) {
      const a=this.actor(id); if (!a || this.paused || !this.settings.enabled) return false;
      if(this.scene?.ids.includes(id))this.cancelScene();
      this.state(a,'drag',Infinity);a.target=null;a.dragY=this.floor-(cast[id].float||0)*this.scale;return true;
    }
    drag(id,x,y) { const a=this.actor(id); if(a?.state==='drag'){a.x=this.bound(x);a.dragY=clamp(finite(y,this.floor),cast[id].height*this.scale,Math.max(cast[id].height*this.scale,this.floor));} }
    endDrag(id) {const a=this.actor(id);if(a?.state==='drag'){a.dropFrom=a.dragY??this.floor;a.dragY=null;this.state(a,'drop',.65);a.rest=7;this.emit('drag',{id});}}
    move(a,target,dt,multiplier=1) {
      const delta=target-a.x; if(Math.abs(delta)<1){a.x=target;return true;}
      a.direction=delta>0?1:-1;
      const amount=cast[a.id].speed*this.settings.speed*this.scale*multiplier*dt;
      a.x=this.bound(a.x+a.direction*Math.min(amount,Math.abs(delta)));return Math.abs(a.x-target)<1;
    }
    step(inputDt) {
      if(this.paused || !this.settings.enabled)return;
      const dt=clamp(finite(inputDt,0),0,.05);this.time+=dt;
      this.props=this.props.filter(p=>this.time-p.born<16&&!p.eaten);
      if(this.beacon&&this.time>this.beacon.until)this.beacon=null;
      if(this.scene)this.stepScene(dt);
      for(const a of this.actors){
        a.elapsed+=dt;a.rest=Math.max(0,a.rest-dt);
        if(this.scene?.ids.includes(a.id)||a.state==='drag')continue;
        if(a.state==='drop') {if(a.elapsed>=a.duration){this.state(a,'idle',2);a.dropFrom=null;}continue;}
        if(a.state==='stretch'){if(a.elapsed>=a.duration){this.state(a,'idle',2);a.reach=null;}continue;}
        if(['cheer','dance','music','magic','eat','read'].includes(a.state)){if(a.elapsed>=a.duration)this.state(a,'idle',1+this.random()*3);continue;}
        let snack=this.props.find(p=>p.owner===a.id);
        if(!snack&&!this.gentle){snack=this.props.filter(p=>!p.owner).sort((a1,b)=>Math.abs(a1.x-a.x)-Math.abs(b.x-a.x))[0];if(snack){snack.owner=a.id;a.target=snack.x;this.state(a,'walk',20);}}
        if(snack){a.target=snack.x;if(this.move(a,snack.x,dt,1.6)){snack.eaten=true;a.target=null;this.state(a,'eat',2.3);this.say(a,a.id==='gunter'?'Wenk. (Mine.)':'Snack acquired.');this.emit('fed',{id:a.id});}continue;}
        if(a.target!==null){if(this.move(a,a.target,dt,1.6)){a.target=null;this.state(a,'cheer',1.5);}continue;}
        if(this.gentle){if(a.state!=='idle')this.state(a,'idle',99);continue;}
        if(a.state==='walk' && this.settings.wander){
          a.x=this.bound(a.x+a.direction*cast[a.id].speed*this.scale*this.settings.speed*dt);
          const[lo,hi]=this.range();if(a.x<=lo+.1)a.direction=1;if(a.x>=hi-.1)a.direction=-1;
        }
        if(a.elapsed>=a.duration){
          if(this.settings.wander && a.state!=='walk')this.state(a,'walk',(3+this.random()*5)/this.settings.activity);
          else this.state(a,'idle',(2+this.random()*5)/this.settings.activity);
          if(this.random()<.22 && !a.rest){this.trick(a.id);}
        }
        if(a.id==='jake'&&!a.rest&&this.pointer&&this.time-this.pointer.at<1.2&&this.pointer.y<this.floor-70*this.scale&&this.pointer.y>this.floor-340*this.scale){
          const dx=Math.abs(this.pointer.x-a.x);if(dx<180*this.scale){this.state(a,'stretch',3.1);a.reach={x:this.bound(this.pointer.x),y:Math.max(35,this.pointer.y)};a.rest=15;}
        }
      }
      if(!this.scene&&this.settings.autoScenes&&!this.gentle&&this.time>this.nextScene){
        const possible=Object.keys(scenes).filter(id=>this.available(id));
        if(possible.length)this.startScene(possible[Math.floor(this.random()*possible.length)]);
        this.nextScene=this.time+(24+this.random()*20)/this.settings.activity;
      }
      // A soft personal-space nudge, only during free wandering; never interfere with scripted scenes.
      if(!this.gentle&&!this.beacon)for(let i=0;i<this.actors.length;i++)for(let j=i+1;j<this.actors.length;j++){
        const a=this.actors[i],b=this.actors[j];
        if(this.scene?.ids.includes(a.id)||this.scene?.ids.includes(b.id)||a.target!==null||b.target!==null||!['walk','idle'].includes(a.state)||!['walk','idle'].includes(b.state))continue;
        const gap=a.x-b.x;const space=27*this.scale;if(Math.abs(gap)<space){const n=(gap===0?(i%2?1:-1):Math.sign(gap))*(space-Math.abs(gap))*dt;a.x=this.bound(a.x+n);b.x=this.bound(b.x-n);}
      }
    }
    stepScene(dt) {
      const s=this.scene;s.elapsed+=dt;
      if(s.phase==='gather'){
        let ready=true;
        s.ids.forEach((id,i)=>{const a=this.actor(id);if(this.gentle){a.x=s.positions[i];}else if(!this.move(a,s.positions[i],dt,2.3))ready=false;});
        if(ready||s.elapsed>12){s.ids.forEach((id,i)=>{const a=this.actor(id);a.x=s.positions[i];a.target=null;a.elapsed=0;});s.phase='play';s.elapsed=0;this.emit('performance',{id:s.id});}
        return;
      }
      const t=s.elapsed;
      s.ids.forEach((id,i)=>{const a=this.actor(id);a.state='idle';a.lift=0;a.direction=a.x<s.center?1:-1;});
      const actor=id=>this.actor(id);
      if(s.id==='heroes'){
        const a=actor('finn'),b=actor('jake');a.state='cheer';b.state='cheer';
        if(!this.gentle){const hop=Math.max(0,Math.sin(Math.min(1,t/2.1)*Math.PI));a.lift=hop*38*this.scale;b.lift=hop*28*this.scale;a.x=s.positions[0]+hop*20*this.scale;b.x=s.positions[1]-hop*20*this.scale;}
        if(t>.9&&!s.announced){this.say(a,'Best buds. Best quest.');this.say(b,'Algebraic!');s.announced=true;}
      } else if(s.id==='concert'){
        actor('marceline').state='music';s.ids.filter(id=>id!=='marceline').forEach(id=>actor(id).state='dance');
        if(t>.6&&!s.announced){this.say(actor('marceline'),'This one is for the weird tabs.');s.announced=true;}
      } else if(s.id==='heist'){
        const a=actor('gunter'),b=actor('jake');
        if(t<2){a.state='dance';b.state='idle';}else{a.state='run';b.state='walk';if(!this.gentle){const [lo,hi]=this.range();const travel=Math.min(130*this.scale,(hi-lo)*.25);a.x=this.bound(s.positions[0]-Math.sin((t-2)/7*Math.PI)*travel);b.x=this.bound(a.x+66*this.scale);a.direction=b.direction=-1;}}
        if(t>2&&!s.announced){this.say(a,'WENK.');this.say(b,'Dude. My sandwich.');s.announced=true;}
      } else if(s.id==='science'){
        actor('bubblegum').state='magic';actor('flame').state='magic';
        if(t>2&&!s.announced){this.say(actor('bubblegum'),'Exactly as hypothesized. Mostly.');s.announced=true;}
      } else if(s.id==='parade'){
        actor('lsp').state='dance';actor('banana').state='walk';
        if(!this.gentle)s.ids.forEach((id,i)=>actor(id).x=this.bound(s.positions[i]+Math.sin(t*.5)*30*this.scale));
        if(t>1&&!s.announced){this.say(actor('lsp'),'Make way for my lumps.');s.announced=true;}
      } else if(s.id==='duo'){
        const f=actor('fionna'),c=actor('cake');f.state='run';c.state='run';
        if(!this.gentle){const offset=Math.sin(t*.65)*55*this.scale;f.x=this.bound(s.positions[0]+offset);c.x=this.bound(s.positions[1]+offset);f.direction=c.direction=Math.cos(t*.65)>0?1:-1;c.lift=Math.abs(Math.sin(t*4))*9*this.scale;}
        if(t>1&&!s.announced){this.say(f,'Cake, is this a shortcut?');this.say(c,'It is now!');s.announced=true;}
      } else if(s.id==='batflight'){
        const m=actor('marceline'),b=actor('batbug');m.state='music';b.state='walk';
        if(!this.gentle){b.x=this.bound(m.x+Math.cos(t*1.5)*72*this.scale);b.lift=(30+Math.sin(t*1.5)*24)*this.scale;b.direction=Math.sin(t*1.5)>0?-1:1;}
        if(t>1&&!s.announced){this.say(m,'Okay. You can be the opening act.');s.announced=true;}
      } else if(s.id==='campfire'&&t>1&&!s.announced){this.say(actor(s.ids[0]),'A little break between adventures.',4);s.announced=true;}
      if(t>=s.duration){const id=s.id;this.cancelScene();this.sceneCount++;this.emit('complete',{id,title:scenes[id].title});this.nextScene=this.time+(24+this.random()*20)/this.settings.activity;}
    }
  }
  return { cast, presets, defaults, scenes, sanitize, clamp, World };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OooCore;
