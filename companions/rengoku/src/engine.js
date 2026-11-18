// Patrol and encounter choreography. All coordinates are in viewport CSS pixels.
const PatrolEngine = (() => {
  'use strict';

  const defaults = Object.freeze({
    enabled: true, interact: true, pace: 1, scale: 1.2, frequency: 'normal',
    fx: 'full', motion: 'system', offset: 8
  });
  const moves = Object.freeze({
    idle: 'Take a breath', walk: 'Walk', run: 'Run', jump: 'Vault',
    guard: 'Brace', slash: 'Ember sweep', rising: 'Rising flame',
    dash: 'Flame streak', victory: 'Victory salute',
    crescent: 'Crescent vault', reversal: 'Cinder reversal', relay: 'Blazing relay'
  });
  // Each opponent gets a different interval to read its tell, reach, and counter motion.
  const species = Object.freeze({
    pink: {name:'Pink Demon', color:'#f28c99', summary:'A short fuse and a headlong rush.', pattern:'charge', speed:95, tell:.48, attack:.62, reach:29, hover:0},
    pack2: {name:'Lantern Eye', color:'#d6bc78', summary:'Hovers, glows, then swoops in.', pattern:'swoop', speed:83, tell:.66, attack:.74, reach:32, hover:22},
    pack3: {name:'Furnace Brute', color:'#e28e62', summary:'A slow windup with a heavy landing.', pattern:'stomp', speed:67, tell:.91, attack:.71, reach:23, hover:0},
    pack4: {name:'Dusk Stalker', color:'#bb9ad1', summary:'Recoils before a fast spring.', pattern:'pounce', speed:119, tell:.39, attack:.52, reach:40, hover:0},
    moth: {name:'Silk Moth', color:'#baafdf', summary:'Drifts high and dives under its folded wings.', pattern:'dive', speed:78, tell:.85, attack:.83, reach:37, hover:28},
    bell: {name:'Temple Bell', color:'#dfb96e', summary:'Leans back before a ringing shockwave.', pattern:'chime', speed:61, tell:1.03, attack:.84, reach:13, hover:0},
    foxfire: {name:'Foxfire', color:'#81d6d6', summary:'Feints backward and darts in twice.', pattern:'feint', speed:127, tell:.52, attack:.79, reach:34, hover:0},
    oni: {name:'Basalt Oni', color:'#cc806d', summary:'Plants its feet and heaves upward.', pattern:'heave', speed:70, tell:.89, attack:.88, reach:25, hover:0}
  });
  const ids = Object.keys(species);
  const moveset = ['slash','rising','dash','rising'];
  const demonstrations = ['jump','slash','reversal','run','crescent','dash','guard','relay','victory','walk','rising'];
  const cadence = {off:Infinity,rare:150,normal:60,frequent:24};
  const cycle = {idle:1.4,walk:.72,run:.49};
  const moveTime = {idle:1.25, walk:1.85, run:1.45, jump:.85, guard:1.15, slash:.78, rising:1.02, dash:.8, victory:1.37};
  // Rehearsal beats use the action drawings at different tempos and join their arcs.
  const drills = {
    crescent: [
      {pose:'guard', seconds:.24},
      {pose:'jump', seconds:.40, to:46, arc:14, speed:39},
      {pose:'rising', seconds:.36, from:46, to:30, arc:8, speed:29},
      {pose:'slash', seconds:.40, from:30, speed:32},
      {pose:'guard', seconds:.25}
    ],
    reversal: [
      {pose:'guard', seconds:.60, speed:-12},
      {pose:'dash', seconds:.43, speed:112},
      {pose:'slash', seconds:.48, speed:18},
      {pose:'idle', seconds:.32}
    ],
    relay: [
      {pose:'run', seconds:.38, speed:62},
      {pose:'slash', seconds:.43, speed:31},
      {pose:'rising', seconds:.53, arc:25, speed:26},
      {pose:'dash', seconds:.42, speed:96},
      {pose:'victory', seconds:.72}
    ]
  };
  for(const [name,beats] of Object.entries(drills)){
    moveTime[name]=beats.reduce((sum,beat)=>sum+beat.seconds,0);
  }
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
  const finite = (n,fallback) => Number.isFinite(n)?n:fallback;
  const direction = n => n === -1 ? -1 : 1;
  const has = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
  const arc = t => 4*t*(1-t);
  const smooth = t => t*t*(3-2*t);
  const pulse = t => Math.sin(Math.PI*t);
  function normalize(input={}) {
    const value = input && typeof input==='object' ? input : {};
    return {
      enabled: typeof value.enabled==='boolean' ? value.enabled : defaults.enabled,
      interact: typeof value.interact==='boolean' ? value.interact : defaults.interact,
      pace: clamp(finite(value.pace,defaults.pace),.5,2),
      scale: clamp(finite(value.scale,defaults.scale),.65,2),
      frequency: has(cadence,value.frequency)?value.frequency:defaults.frequency,
      fx: ['off','subtle','full'].includes(value.fx)?value.fx:defaults.fx,
      motion: ['system','gentle','full'].includes(value.motion)?value.motion:defaults.motion,
      offset: clamp(finite(value.offset,defaults.offset),0,180)
    };
  }
  function actor(id) {
    return {id,x:0,y:0,direction:1,action:'idle',elapsed:0,progress:0,alpha:1};
  }
  function pose(a,name,dt,progress) {
    if(a.action===name) a.elapsed+=dt;
    else { a.action=name; a.elapsed=0; }
    a.progress=progress===undefined ? (a.elapsed%(cycle[name]||1))/(cycle[name]||1) : clamp(progress,0,1);
  }
  function phase(b,name,seconds) {
    b.phase=name; b.time=0; b.duration=seconds; b.triggered=false;
  }
  function counterTravel(pattern,t) {
    switch(pattern){
      case 'charge': return {x:pulse(t)**.65,y:0};
      case 'swoop': return {x:pulse(t),y:-pulse(t)*15};
      case 'stomp': return {x:pulse(t)*.8,y:t<.55?arc(t/.55)*13:0};
      case 'pounce': return {x:pulse(t),y:arc(t)*25};
      case 'dive': return {x:pulse(t)**1.5,y:-arc(t)*27};
      case 'chime': return {x:Math.sin(t*2*Math.PI)*.22,y:0};
      case 'feint': return {x:t<.28?-arc(t/.28)*.36:Math.sin((t-.28)/.72*Math.PI*2)**2,y:0};
      case 'heave': return {x:pulse(t),y:t<.65?arc(t/.65)*21:0};
      default: return {x:pulse(t),y:0};
    }
  }
  class World {
    constructor(settings={},width=1000,height=600,random=Math.random) {
      this.random=random; this.settings=normalize(settings);
      this.time=0; this.systemReduced=false; this.hero=actor('rengoku'); this.enemy=null;
      this.battle=null; this.events=[]; this.demo=null; this.nextMove=0; this.cooldown=0;
      this.lastKind=''; this.patrol='walk'; this.patrolTime=0; this.patrolLength=3.1;
      this.nextEncounter=this.encounterDelay();
      this.width=0; this.height=0; this.resize(width,height);
      this.hero.x=this.bound(Math.min(this.width*.3,140*this.scale));
    }
    get gentle(){return this.settings.motion==='gentle'||(this.settings.motion==='system'&&this.systemReduced);}
    get scale(){return Math.min(this.settings.scale,this.width/128,this.height/145);}
    get ground(){return clamp(this.height-this.settings.offset-12*this.scale,116*this.scale,this.height-12*this.scale);}
    setReduced(value){this.systemReduced=!!value; this.positionY(this.hero,0);}
    bound(x){const margin=64*this.scale;return clamp(x,margin,Math.max(margin,this.width-margin));}
    positionY(a,lift){a.y=clamp(this.ground-lift*this.scale,116*this.scale,this.ground);}
    encounterDelay(){return cadence[this.settings.frequency]*(.7+this.random()*.65);}
    apply(settings) {
      const old=this.settings; this.settings=normalize({...old,...settings});
      if(old.frequency!==this.settings.frequency) this.nextEncounter=this.encounterDelay();
      this.resize(this.width,this.height);
    }
    resize(width,height) {
      const oldW=this.width, oldScale=this.scale, oldGround=this.ground;
      this.width=Math.max(1,finite(width,1));this.height=Math.max(1,finite(height,1));
      const remap=x=>this.bound(oldW?x*this.width/oldW:this.width/2);
      for(const a of [this.hero,this.enemy].filter(Boolean)){
        const lift=oldScale?Math.max(0,(oldGround-a.y)/oldScale):0;
        a.x=remap(a.x);this.positionY(a,lift);
      }
      if(this.battle){this.battle.h0=remap(this.battle.h0);this.battle.e0=remap(this.battle.e0);}
    }
    signal(type,x=this.hero.x,y=this.hero.y-35*this.scale) {
      const b=this.battle;
      if(this.events.length>=48)this.events.shift();
      this.events.push({type,x,y,direction:this.hero.direction,kind:b?.kind||'',move:b?.move||this.demo?.move||this.hero.action,hits:b?.hits||0,color:b?species[b.kind].color:'#ffa944'});
    }
    takeEvents(){return this.events.splice(0);}
    summon(kind='random'){
      if(!this.settings.enabled||this.battle||!(kind==='random'||has(species,kind)))return false;
      if(kind==='random'){
        const choices=ids.filter(id=>id!==this.lastKind);
        kind=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
      }
      this.lastKind=kind; this.demo=null;
      const dir=this.hero.x<this.width/2?1:-1;
      const h=this.hero, e=this.enemy=actor(kind);
      e.x=this.bound(h.x+dir*470*this.scale);e.direction=-dir;h.direction=dir;
      this.positionY(h,0);this.positionY(e,species[kind].hover);
      const b=this.battle={kind,hits:0,move:moveset[0],dir,h0:h.x,e0:e.x};
      phase(b,'approach',0);this.signal('spawn',e.x,e.y);return true;
    }
    perform(move){
      if(!this.settings.enabled||this.battle)return false;
      if(move===undefined)move=demonstrations[this.nextMove++%demonstrations.length];
      if(!has(moveTime,move))return false;
      this.demo={move,time:0,duration:moveTime[move]};this.cooldown=1.4;this.hero.elapsed=0;
      if(has(drills,move)&&this.bound(this.hero.x+this.hero.direction*60*this.scale)===this.hero.x)this.hero.direction*=-1;
      pose(this.hero,drills[move]?.[0].pose || move,0,0);this.signal('action');return true;
    }
    swipe(x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y)||!this.settings.interact||!this.settings.enabled||this.gentle||this.battle||this.demo||this.cooldown>0)return false;
      if(Math.abs(x-this.hero.x)>74*this.scale||y<this.ground-100*this.scale||y>this.ground+10*this.scale)return false;
      this.hero.direction=x>=this.hero.x?1:-1;
      return this.perform('slash');
    }
    walk(a,velocity,dt){
      const next=a.x+a.direction*velocity*dt*this.scale;
      a.x=this.bound(next); if(a.x!==next)a.direction*=-1;
    }
    rehearseDrill(d,dt){
      const beats=drills[d.move];
      let elapsed=d.time, beat=beats[beats.length-1];
      for(const candidate of beats){
        beat=candidate;
        if(elapsed<=candidate.seconds)break;
        if(candidate!==beats[beats.length-1])elapsed-=candidate.seconds;
      }
      const t=clamp(elapsed/beat.seconds,0,1);
      const lift=(beat.from||0)*(1-t)+(beat.to||0)*t+arc(t)*(beat.arc||0);
      pose(this.hero,beat.pose,dt,has(cycle,beat.pose)?undefined:t);
      this.positionY(this.hero,this.gentle?0:lift);
      if(!this.gentle)this.hero.x=this.bound(this.hero.x+this.hero.direction*(beat.speed||0)*dt*this.scale);
    }
    patrolStep(dt){
      const h=this.hero;
      if(this.demo){
        const d=this.demo;d.time=Math.min(d.duration,d.time+dt);
        if(has(drills,d.move))this.rehearseDrill(d,dt);
        else {
          const t=d.time/d.duration;
          const height=d.move==='jump'?48:d.move==='rising'?20:0;
          pose(h,d.move,dt,has(cycle,d.move)?undefined:t);
          this.positionY(h,this.gentle?0:arc(t)*height);
          if(!this.gentle){
            if(d.move==='walk'||d.move==='run')this.walk(h,d.move==='run'?95:40,dt);
            else if(d.move==='dash'||d.move==='jump'){
              const speed=d.move==='jump'?32:120*pulse(t)**3;
              h.x=this.bound(h.x+h.direction*this.scale*dt*speed);
            }
          }
        }
        if(d.time>=d.duration){this.demo=null;this.positionY(h,0);}
        return;
      }
      this.positionY(h,0);
      if(this.gentle){pose(h,'idle',0,0);return;}
      this.nextEncounter-=dt;
      if(this.nextEncounter<=0){this.nextEncounter=this.encounterDelay();this.summon();return;}
      this.patrolTime+=dt;
      if(this.patrolTime>=this.patrolLength){
        this.patrolTime=0;this.patrolLength=1.6+this.random()*3.6;const roll=this.random();
        if(roll>.95){this.perform('jump');return;}
        this.patrol=roll<.17?'idle':roll<.68?'walk':'run';
      }
      pose(h,this.patrol,dt);
      if(this.patrol!=='idle')this.walk(h,this.patrol==='run'?100:41,dt);
    }
    duelStep(dt) {
      const b=this.battle,h=this.hero,e=this.enemy,k=species[b.kind];
      b.time+=dt;const t=b.duration?clamp(b.time/b.duration,0,1):0;
      const dir=b.dir,scale=this.scale,express=this.gentle?0:1;
      h.direction=dir;e.direction=-dir;h.alpha=1;e.alpha=1;
      this.positionY(h,0);this.positionY(e,k.hover+(!this.gentle&&k.hover?Math.sin(this.time*3.5)*3:0));
      if(b.phase==='approach'){
        const lane=this.width-128*scale;
        const stopping=Math.min(57*scale,Math.max(0,lane*.55));
        const remaining=Math.max(0,Math.abs(e.x-h.x)-stopping);
        const advance=this.gentle?remaining:Math.min(remaining,(k.speed+87)*scale*dt);
        h.x=this.bound(h.x+dir*advance*.43);e.x=this.bound(e.x-dir*advance*.57);
        pose(h,'run',dt);pose(e,'run',dt);
        if(remaining<=advance+0.001){
          b.h0=h.x;b.e0=e.x;phase(b,'windup',.44);
          this.signal('windup',h.x,h.y-44*scale);
        }
        return;
      }
      // Displacements are relative to the settled combatants, so repeated exchanges
      // neither drift into the page nor round off the ground contact point.
      const gap=Math.abs(b.e0-b.h0)/scale;
      let heroForward=0, enemyForward=0, heroLift=0, enemyLift=k.hover;
      switch(b.phase){
        case 'windup':
          heroForward=-5*pulse(t);pose(h,'guard',dt,t);pose(e,'idle',dt);
          if(t===1)phase(b,'strike',b.move==='dash'?.49:.72);
          break;
        case 'strike': {
          const depth=Math.min(gap*.64,b.move==='dash'?38:22);
          const impactAt=.54;
          heroForward=t<impactAt?smooth(t/impactAt)*depth:depth*(1-smooth((t-impactAt)/(1-impactAt)));
          if(b.move==='rising')heroLift=arc(t)*24;
          if(t>=impactAt&&!b.triggered){
            b.hits++;b.triggered=true;
            this.signal('impact',b.e0-dir*6*scale,e.y-28*scale);
          }
          if(b.triggered)enemyForward=-8*pulse(clamp((t-impactAt)/(1-impactAt),0,1));
          pose(h,b.move,dt,t);pose(e,b.triggered?'hurt':'idle',dt,b.triggered?(t-impactAt)/(1-impactAt):undefined);
          if(t===1)phase(b,b.hits===4?'death':'recovery',b.hits===4?.92:.27);
          break;
        }
        case 'recovery':
          pose(h,'guard',dt,t);pose(e,'idle',dt);
          if(t===1){phase(b,'tell',k.tell);this.signal('windup',e.x,e.y-32*scale);}
          break;
        case 'tell':
          enemyForward=-6*pulse(t); if(k.hover)enemyLift+=t*10;
          pose(h,'idle',dt);pose(e,'attack',dt,t*.30);
          if(t===1)phase(b,'counter',k.attack);
          break;
        case 'counter': {
          const travel=counterTravel(k.pattern,t);
          enemyForward=Math.min(gap*.70,k.reach)*travel.x;enemyLift+=travel.y;
          const evade=k.pattern==='chime'||k.pattern==='charge'||k.pattern==='heave'||(k.pattern==='feint'&&b.hits===2);
          heroForward=-pulse(t)*(evade?12:4); if(evade)heroLift=arc(t)*37;
          pose(h,evade?'jump':'guard',dt,t);pose(e,'attack',dt,.30+.70*t);
          if(t>=.50&&!b.triggered){b.triggered=true;this.signal(evade?'evade':'block',h.x+dir*12*scale,h.y-36*scale);}
          if(t===1)phase(b,'reset',.34);break;
        }
        case 'reset':
          pose(h,'idle',dt);pose(e,'idle',dt);
          if(t===1){b.move=moveset[b.hits];phase(b,'windup',.36);}
          break;
        case 'death':
          pose(h,'victory',dt,t);pose(e,'death',dt,t);e.alpha=1-smooth(t);
          if(t===1){
            this.signal('defeat',b.e0,e.y-18*scale);this.battle=null;this.enemy=null;
            this.demo={move:'victory',time:0,duration:moveTime.victory};this.nextEncounter=this.encounterDelay();
            this.cooldown=2;this.positionY(h,0);return;
          }
          break;
      }
      h.x=this.bound(b.h0+dir*heroForward*scale*express);
      e.x=this.bound(b.e0-dir*enemyForward*scale*express);
      this.positionY(h,heroLift*express);this.positionY(e,k.hover+(enemyLift-k.hover)*express);
    }
    step(seconds){
      if(!this.settings.enabled || !Number.isFinite(seconds)||seconds<=0)return;
      let left=Math.min(.25,seconds)*this.settings.pace;
      while(left>1e-8){
        const dt=Math.min(1/30,left);left-=dt;this.time+=dt;
        this.cooldown=Math.max(0,this.cooldown-dt);
        if(this.battle)this.duelStep(dt);else this.patrolStep(dt);
      }
    }
    snapshot(){
      const packActor=a=>({x:a.x/this.width,lift:(this.ground-a.y)/this.scale,direction:a.direction,
        action:a.action,progress:a.progress,elapsed:a.elapsed,alpha:a.alpha});
      return {version:2,time:this.time,hero:packActor(this.hero),enemy:this.enemy?packActor(this.enemy):null,
        battle:this.battle?{...this.battle,h0:this.battle.h0/this.width,e0:this.battle.e0/this.width}:null,
        demo:this.demo?{...this.demo}:null,patrol:this.patrol,patrolTime:this.patrolTime,patrolLength:this.patrolLength,
        nextEncounter:Number.isFinite(this.nextEncounter)?this.nextEncounter:null,lastKind:this.lastKind,
        nextMove:this.nextMove,cooldown:this.cooldown};
    }
    restore(saved){
      if(!saved||typeof saved!=='object')return false;
      // Older installs store the page-relative position and facing at the top level.
      if(saved.version!==2){
        if(!Number.isFinite(saved.x))return false;
        this.hero.x=this.bound(clamp(saved.x,0,1)*this.width);this.hero.direction=direction(saved.dir);
        this.nextMove=Math.max(0,Math.floor(finite(saved.clickIndex,0)));
        const kind=saved.battle?.kind==='demon'?'pink':saved.battle?.kind;
        if(has(species,kind)&&this.summon(kind))this.battle.hits=clamp(Math.floor(finite(saved.battle.hits,0)),0,3);
        this.events=[];return true;
      }
      if(!saved.hero||!Number.isFinite(saved.hero.x))return false;
      const readActor=(id,v,allowed)=>{
        const a=actor(id);a.x=this.bound(clamp(finite(v.x,.5),0,1)*this.width);
        a.direction=direction(v.direction);a.action=allowed.includes(v.action)?v.action:'idle';
        a.elapsed=clamp(finite(v.elapsed,0),0,86400);a.progress=clamp(finite(v.progress,0),0,1);
        a.alpha=clamp(finite(v.alpha,1),0,1);this.positionY(a,clamp(finite(v.lift,0),0,120));return a;
      };
      this.time=Math.max(0,finite(saved.time,0));this.hero=readActor('rengoku',saved.hero,Object.keys(moves));
      this.enemy=null;this.battle=null;this.demo=null;this.events=[];
      this.patrol=has(cycle,saved.patrol)?saved.patrol:'walk';
      this.patrolTime=clamp(finite(saved.patrolTime,0),0,12);this.patrolLength=clamp(finite(saved.patrolLength,2.8),.25,12);
      this.nextEncounter=this.settings.frequency==='off'?Infinity:clamp(finite(saved.nextEncounter,this.encounterDelay()),.1,300);
      this.nextMove=Math.max(0,Math.floor(finite(saved.nextMove,0)));this.lastKind=has(species,saved.lastKind)?saved.lastKind:'';
      this.cooldown=clamp(finite(saved.cooldown,0),0,4);
      if(saved.demo&&has(moveTime,saved.demo.move)){
        const move=saved.demo.move;this.demo={move,duration:moveTime[move],time:clamp(finite(saved.demo.time,0),0,moveTime[move])};
      }
      const b=saved.battle,v=saved.enemy, phases=['approach','windup','strike','recovery','tell','counter','reset','death'];
      if(!b||!v||!has(species,b.kind)||!phases.includes(b.phase))return true;
      this.enemy=readActor(b.kind,v,['idle','run','attack','hurt','death']);
      let hits=clamp(Math.floor(finite(b.hits,0)),0,4);
      const triggered=b.triggered===true;
      if(b.phase==='death')hits=4;
      else if(b.phase==='strike'&&triggered)hits=clamp(hits,1,4);
      else hits=Math.min(hits,3);
      const duration=b.phase==='approach'?0:clamp(finite(b.duration,.5),.05,3);
      this.battle={kind:b.kind,hits,triggered,phase:b.phase,dir:direction(b.dir),
        move:moveset.includes(b.move)?b.move:moveset[Math.min(hits,3)],time:clamp(finite(b.time,0),0,duration),
        duration,h0:this.bound(clamp(finite(b.h0,saved.hero.x),0,1)*this.width),
        e0:this.bound(clamp(finite(b.e0,v.x),0,1)*this.width)};
      this.demo=null;return true;
    }
  }
  return {World,defaults,normalize,species,moves};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PatrolEngine;
