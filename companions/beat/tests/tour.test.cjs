'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),T=require('../src/tour');
test('tour normalizes untrusted saves and begins with only first district unlocked',()=>{
 const a=T.normalize({districts:{spool:{tags:Infinity,cans:-10,best:'9000'},canal:{tags:99,cans:99,best:1e100}}});
 assert.deepEqual(a.districts.spool,{tags:0,cans:0,best:0,crewMedal:0,contract:0});assert.equal(a.districts.canal.tags,3);
 assert.equal(T.unlocked(a,'spool'),true);assert.equal(T.unlocked(a,'canal'),false);assert.equal(T.unlocked(a,'__proto__'),false);
});
test('three deliberate tags, three cans and rival score unlock next district; ambient does not advance',()=>{
 let a=T.normalize();a=T.record(a,'spool',{type:'tag',source:'ambient'});assert.equal(a.districts.spool.tags,0);
 for(let n=0;n<3;n++){a=T.record(a,'spool',{type:'tag',source:'manual'});a=T.record(a,'spool',{type:'pickup'});}
 a=T.record(a,'spool',{type:'bank',score:599});assert.equal(T.complete(a,'spool'),false);
 a=T.record(a,'spool',{type:'bank',score:600});assert.equal(T.complete(a,'spool'),true);assert.equal(T.first(a),'crane');assert.equal(T.unlocked(a,'crane'),true);
 const old=JSON.stringify(a);T.record(a,'terminal',{type:'bank',score:1e6});assert.equal(JSON.stringify(a),old);
});
test('save merging is monotonic and preserved across JSON reloads',()=>{
 const a={districts:{spool:{tags:3,cans:1,best:700}}},b={districts:{spool:{tags:1,cans:3,best:500}}};
 const c=T.merge(a,b);assert.deepEqual(c.districts.spool,{tags:3,cans:3,best:700,crewMedal:0,contract:0});assert.equal(T.complete(JSON.parse(JSON.stringify(c)),'spool'),true);assert.deepEqual(T.merge(c,a),c);
});
test('all six rival challenges can be cleared sequentially without rerunning completed districts',()=>{
 let s=T.normalize();for(const d of T.districts){assert.equal(T.first(s),d.id);for(let n=0;n<3;n++){s=T.record(s,d.id,{type:'tag',source:'line'});s=T.record(s,d.id,{type:'pickup'});}s=T.record(s,d.id,{type:'bank',score:d.target});assert.equal(T.complete(s,d.id),true);}assert.equal(T.first(s),'terminal');
});
test('finished crew victory satisfies rival objective and persists without resetting legacy clear paths',()=>{
 let s=T.normalize();for(let i=0;i<3;i++){s=T.record(s,'spool',{type:'tag',source:'manual'});s=T.record(s,'spool',{type:'pickup'});}const event={type:'rival-result',finished:true,crewSize:3,player:900,opponent:800};s=T.record(s,'spool',event);assert.equal(s.districts.spool.best,0);assert.equal(T.complete(s,'spool'),true);assert.equal(T.unlocked(s,'crane'),true);const merged=T.merge(JSON.parse(JSON.stringify(s)),T.normalize());assert.equal(merged.districts.spool.crewMedal,1);assert.deepEqual(T.record(merged,'spool',event),merged);
});
test('unfinished, solo, losing, tied and invalid rival results cannot earn a medal',()=>{
 const base={type:'rival-result',finished:true,crewSize:3,player:900,opponent:800};for(const patch of [{finished:false},{crewSize:1},{player:700},{player:800},{opponent:0},{player:Infinity}])assert.equal(T.record(T.normalize(),'spool',{...base,...patch}).districts.spool.crewMedal,0);assert.equal(T.record(T.normalize(),'terminal',base).districts.terminal.crewMedal,0);
});
test('district-specific contracts provide a real alternative progression route with crew victory',()=>{
 let s=T.normalize();for(const d of T.districts){for(const move of T.contracts[d.id].moves)s=T.record(s,d.id,{type:d.id==='terminal'?'line':'trick',move});assert.equal(s.districts[d.id].contract,7);assert.equal(T.complete(s,d.id),false);s=T.record(s,d.id,{type:'rival-result',finished:true,crewSize:3,player:1200,opponent:1000});assert.equal(T.complete(s,d.id),true);assert.equal(s.districts[d.id].cans,0);}
});
test('contract bits merge as union, reject ambient/unrelated tricks and survive JSON',()=>{
 let a=T.record(T.normalize(),'spool',{type:'trick',move:'jump'}),b=T.record(T.normalize(),'spool',{type:'trick',move:'grind'});assert.equal(T.merge(a,b).districts.spool.contract,3);a=T.record(a,'spool',{type:'trick',move:'tag',source:'ambient'});assert.equal(a.districts.spool.contract,1);a=T.record(a,'spool',{type:'trick',move:'rocket'});assert.equal(a.districts.spool.contract,1);assert.deepEqual(T.normalize(JSON.parse(JSON.stringify(a))),a);
});
