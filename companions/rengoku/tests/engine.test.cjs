'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {World,defaults,normalize,species,moves}=require('../src/engine.js');
const quiet={frequency:'off'};
function forward(w,seconds){
  const events=[]; for(let n=0;n<Math.ceil(seconds*60);n++){w.step(1/60);events.push(...w.takeEvents());}
  return events;
}
test('every available encounter lands four hits, includes an enemy counter and turns control back to patrol',()=>{
  const patterns=new Set();
  for(const [id,kind] of Object.entries(species)){
    const w=new World(quiet,1100,765,()=>.3);
    assert.ok(w.summon(id));assert.equal(w.summon(id),false);
    const states=new Set(),phases=new Set(),events=[];
    for(let i=0;i<2200&&w.battle;i++){
      w.step(1/60);states.add(w.hero.action);if(w.battle)phases.add(w.battle.phase);events.push(...w.takeEvents());
      if(w.enemy)assert.ok(w.enemy.alpha>=0&&w.enemy.alpha<=1);
    }
    assert.equal(w.battle,null,id);assert.equal(w.enemy,null,id);
    assert.deepEqual(events.filter(e=>e.type==='impact').map(e=>e.hits),[1,2,3,4]);
    assert.deepEqual(events.filter(e=>e.type==='impact').map(e=>e.move),['slash','rising','dash','rising']);
    assert.equal(events.filter(e=>e.type==='defeat').length,1);
    assert.equal(events.filter(e=>e.type==='evade'||e.type==='block').length,3);
    for(const p of ['approach','windup','strike','tell','counter','death'])assert.ok(phases.has(p));
    for(const state of ['run','slash','rising','dash','guard','victory'])assert.ok(states.has(state),id+' '+state);
    patterns.add(kind.pattern);
  }
  assert.equal(patterns.size,8);
});
test('patrol has an actual walk, run, arc with a grounded takeoff and landing, and a nearby-cursor move',()=>{
  const w=new World(quiet,1400,640,()=>.4),start=w.hero.x;
  forward(w,.3);assert.ok(w.hero.x>start);assert.equal(w.hero.action,'walk');
  assert.ok(w.perform('run'));const at=w.hero.x;forward(w,.3);assert.ok(w.hero.x-at>20);
  for(const move of Object.keys(moves)){assert.ok(w.perform(move));assert.equal(w.demo.move,move);}
  assert.ok(w.perform('jump')); const ground=w.ground;forward(w,.42);assert.ok(ground-w.hero.y>25*w.scale);
  forward(w,.45);assert.equal(w.hero.y,ground);
  forward(w,2);assert.equal(w.swipe(-200,0),false);
  assert.ok(w.swipe(w.hero.x-3,w.hero.y-25));assert.equal(w.hero.action,'slash');assert.equal(w.hero.direction,-1);
  assert.equal(w.swipe(w.hero.x,w.hero.y),false);assert.equal(w.perform('interrogate'),false);
});
test('restoring an encounter at each phase continues its remaining hits once on a differently sized page',()=>{
  const w=new World(quiet,1120,720,()=>.55);w.summon('moth');w.takeEvents();const visited=new Set();
  for(let i=0;i<2000&&w.battle;i++){
    w.step(1/60);w.takeEvents();if(!w.battle)break;
    const b=w.battle,key=b.phase+b.hits+b.triggered;if(visited.has(key))continue;visited.add(key);
    const save=JSON.parse(JSON.stringify(w.snapshot())),next=new World(quiet,330,210,()=>.2);
    assert.ok(next.restore(save));assert.equal(next.battle.phase,b.phase);assert.equal(next.battle.hits,b.hits);
    const remaining=forward(next,31);assert.equal(next.battle,null,key);
    assert.deepEqual(remaining.filter(e=>e.type==='impact').map(e=>e.hits),Array.from({length:4-b.hits},(_,i)=>i+b.hits+1),key);
  }
  assert.ok(visited.size>=20);
});
test('legacy snapshot preserves patrol position, facing and earned duel hits; malformed input remains bounded',()=>{
  const w=new World(quiet,800,450,()=>.4);
  assert.equal(w.restore(null),false);assert.equal(w.restore({}),false);
  assert.ok(w.restore({x:.36,dir:-1}));assert.equal(w.hero.x,288);assert.equal(w.hero.direction,-1);
  assert.ok(w.restore({x:.27,dir:1,battle:{kind:'demon',hits:2}}));assert.equal(w.battle.kind,'pink');
  assert.deepEqual(forward(w,25).filter(e=>e.type==='impact').map(e=>e.hits),[3,4]);
  const saved={version:2,hero:{x:.45},enemy:{x:.5},battle:{kind:'foxfire',phase:'reset',hits:1e10,duration:-1}};
  assert.ok(w.restore(saved));assert.equal(w.battle.hits,3);assert.equal(forward(w,25).filter(e=>e.type==='defeat').length,1);
});
test('viewport changes constrain the full cell while walking, jumping, fighting or reading corrupt saved settings',()=>{
  for(const [width,height] of [[1,1],[32,40],[110,90],[220,140],[1920,1080]]){
    const w=new World({...quiet,scale:2,offset:180},width,height,()=>.7);
    const inside=a=>{assert.ok(a.x-64*w.scale>=-1e-6);assert.ok(a.x+64*w.scale<=w.width+1e-6);
      assert.ok(a.y-116*w.scale>=-1e-6);assert.ok(a.y+12*w.scale<=w.height+1e-6);};
    w.perform('jump');for(let i=0;i<70;i++){w.step(1/60);inside(w.hero);}
    assert.ok(w.summon('bell'));
    for(let i=0;i<1400;i++){
      if(i===40)w.resize(width*1.25,height*1.6);
      w.step(1/60);inside(w.hero);if(w.enemy)inside(w.enemy);
    }
    assert.equal(w.battle,null);
  }
  assert.equal(normalize({scale:NaN}).scale,defaults.scale);
  assert.equal(normalize({offset:-150}).offset,0);
  assert.equal(normalize({frequency:'__proto__'}).frequency,'normal');
});
test('reduced motion leaves a quiet patrol and supports manual encounters with stationary choreography',()=>{
  const w=new World({frequency:'frequent'},900,600,()=>.4);w.setReduced(true);
  const x=w.hero.x;forward(w,150);assert.equal(w.hero.x,x);assert.equal(w.battle,null);
  assert.equal(w.swipe(w.hero.x,w.hero.y),false);assert.ok(w.perform('jump'));forward(w,.4);assert.equal(w.hero.y,w.ground);
  assert.ok(w.summon('oni'));forward(w,.06);const anchors=[w.hero.x,w.enemy.x];
  for(let i=0;i<650&&w.battle;i++){w.step(1/60);assert.equal(w.hero.x,anchors[0]);if(w.enemy)assert.equal(w.enemy.x,anchors[1]);}
  assert.ok(w.gentle);w.apply({motion:'full'});assert.equal(w.gentle,false);
});
test('encounter frequency, interaction opt-out, pause and frame throttling work independently',()=>{
  const w=new World({frequency:'frequent',interact:false},850,500,()=>.4);
  assert.equal(w.swipe(w.hero.x,w.hero.y),false);
  assert.equal(forward(w,25).filter(e=>e.type==='spawn').length,1);
  const t=w.time;w.apply({enabled:false});w.step(99);assert.equal(w.time,t);assert.equal(w.summon(),false);
  w.apply({enabled:true});w.step(120);assert.ok(w.time-t<.26);assert.ok(w.time>t);
  w.apply({frequency:'off'});assert.equal(forward(w,200).filter(e=>e.type==='spawn').length,0);
});

test('chained drills play their poses in sequence and keep their place after changing tabs',()=>{
  const paths={crescent:['guard','jump','rising','slash','guard'],reversal:['guard','dash','slash','idle'],relay:['run','slash','rising','dash','victory']};
  for(const [move,expected] of Object.entries(paths)){
    let w=new World(quiet,910,600,()=>.4);
    assert.ok(w.perform(move));const poses=[];
    for(let i=0;i<200&&w.demo;i++){
      w.step(1/60);if(poses[poses.length-1]!==w.hero.action)poses.push(w.hero.action);
      if(i===37){
        const save=JSON.parse(JSON.stringify(w.snapshot()));
        w=new World(quiet,740,540,()=>.3);assert.ok(w.restore(save));assert.equal(w.demo.move,move);
      }
    }
    assert.deepEqual(poses,expected);assert.equal(w.hero.y,w.ground);assert.equal(w.demo,null);
  }
});
