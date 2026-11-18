'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {create, parse, newer, META, INSTALL} = require('../src/updates.js');
const realHeader = fs.readFileSync(path.join(__dirname,'../Adventure-Time-Ooo-Crew.meta.js'), 'utf8');
const at = v => realHeader.replace(/(@version\s+)\S+/, (_,field)=>field+v);
const {parseHTML} = require('linkedom');
function fixture(options={}) {
  const memory = options.memory || new Map(), notices = [];
  let time = 10000000, count = 0;
  const updater = create({current:'1.2.0', preview:false,
    read:(key, fallback)=>memory.has(key)?memory.get(key):fallback,
    write:(key, value)=>{memory.set(key,value); return true;},
    request:async()=>{count++;return '1.3.0';}, settle:async()=>{},
    now:()=>time, notify:message=>notices.push(message), ...options});
  const {document} = parseHTML('<html><body>'+updater.markup()+'</body></html>');
  updater.bind(document.body);
  return {updater, notices, memory, document, count:()=>count, advance:ms=>{time+=ms;}};
}
test('accepts bounded numeric versions and validates metadata for this script',()=>{
  assert.equal(parse(at('1.10.0')),'1.10.0'); assert.ok(newer('1.10.0','1.2.9'));
  assert.equal(newer('1.2','1.2.0'),false);assert.equal(newer('1.1.99','1.2.0'),false);
  for(const bad of ['1.02','1.3.0<script>','1.3-beta','1.200000000']) assert.throws(()=>parse(at(bad)));
  for(const header of [at('2.0')+'\nalert(1)',at('2.0').replace('aseerr-adventure-time-ooo-crew','wrong'),
    at('2.0').replace('// @author','// @version 4.0\n// @author'),'<p>404</p>']) assert.throws(()=>parse(header));
});
test('daily foreground checks coalesce across tabs, expire, and notify once per newer version', async()=>{
  const f=fixture(), other=fixture({memory:f.memory});
  await Promise.all([f.updater.auto(),other.updater.auto(),f.updater.auto()]);
  assert.equal(f.count()+other.count(),1);assert.equal(f.notices.length+other.notices.length,1);
  const latest=f.document.querySelector('[data-update-link]');
  assert.equal(latest.getAttribute('href'),INSTALL);
  assert.match(latest.textContent,/1.3.0/);
  f.advance(86400001);await f.updater.auto();
  assert.equal(f.count(),2);assert.equal(f.notices.length,1);
});
test('honors opt-out and manual checks, and retains a stable manual fallback on failure', async()=>{
  let called=0; const f=fixture({request:async()=>{called++;throw Error('offline');}});
  const toggle=f.document.querySelector('[data-update-auto]');
  toggle.checked=false;toggle.onchange();
  await f.updater.auto();assert.equal(called,0);
  await f.updater.check();
  assert.equal(called,1);assert.match(f.document.querySelector('[data-update-status]').textContent,/Couldn’t check/);
  assert.equal(f.document.querySelector('[data-update-link]').getAttribute('href'),INSTALL);
  toggle.checked=true;toggle.onchange();await f.updater.auto();assert.equal(called,1);
});
test('offline preview skips checks and an unavailable manager offers the fixed published file',async()=>{
  const sim=fixture({preview:true});await sim.updater.check();await sim.updater.auto();assert.equal(sim.count(),0);
  assert.equal(sim.document.querySelector('[data-update-link]'),null);
  const missing=fixture({request:null});await missing.updater.check();
  assert.equal(missing.document.querySelector('[data-update-check]').disabled,true);
  assert.equal(missing.document.querySelector('[data-update-link]').getAttribute('href'),INSTALL);
});
test('disallow background requests if the shared cache cannot be used',async()=>{
  const f=fixture({write:()=>false}); await f.updater.auto();assert.equal(f.count(),0);
  await f.updater.check();assert.equal(f.count(),1);
});
test('manager transport sends one anonymous metadata GET and rejects redirects, server errors and invalid payloads',async()=>{
  const source = fs.readFileSync(path.join(__dirname,'../src/updates.js'),'utf8');
  let response, request;
  const context=vm.createContext({module:{exports:{}},setTimeout,clearTimeout,GM_xmlhttpRequest:options=>{
    request=options; options.onload(response);return {abort(){}};
  }});
  vm.runInContext(source,context);
  const memory=new Map(), notes=[];
  const checker=context.module.exports.create({current:'1.2.0',preview:false,read:(k,f)=>memory.get(k)??f,
    write:(k,v)=>{memory.set(k,v);return true;},notify:msg=>notes.push(msg),settle:async()=>{}});
  response={status:200,finalUrl:META,responseText:at('1.5.0')};await checker.auto();
  assert.equal(request.url,META);assert.equal(request.anonymous,true);assert.equal(request.redirect,'error');assert.equal(request.method,'GET');
  assert.equal(notes.length,1);assert.equal(Object.hasOwn(request,'data'),false);
  for(response of [{status:404},{status:200,finalUrl:'https://example.org/',responseText:at('8.0')},{status:200,responseText:'nope'}]){
    await checker.check(); assert.equal(memory.get('ooo-crew.updates.result').latest,'1.5.0');assert.equal(memory.get('ooo-crew.updates.result').failed,true);
  }
});

test('disabling notices while a tab waits for the lease releases it for a manual check',async()=>{
  let resume;
  const f=fixture({settle:()=>new Promise(resolve=>{resume=resolve;})});
  const checking=f.updater.auto();
  const toggle=f.document.querySelector('[data-update-auto]');
  toggle.checked=false;toggle.onchange(); resume();await checking;
  assert.equal(f.memory.get('ooo-crew.updates.lease'),null);
  assert.equal(f.count(),0);
  const manual=f.updater.check();resume();await manual;
  assert.equal(f.count(),1);
});
