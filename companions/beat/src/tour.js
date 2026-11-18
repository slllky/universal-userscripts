// Versioned, bounded campaign progress. Only deliberate tricks and collected cans count.
const BeatTour=(()=>{
 const districts=Object.freeze([
  {id:'spool',name:'Spool',rival:'Gum',target:600},
  {id:'crane',name:'Crane',rival:'Garam',target:900},
  {id:'canal',name:'Canal',rival:'Rhyth',target:1200},
  {id:'foundry',name:'Foundry',rival:'Combo',target:1500},
  {id:'signal',name:'Signal',rival:'Noise Tank',target:1800},
  {id:'terminal',name:'Terminal',rival:'Beat',target:2200}
 ]);
 const contracts=Object.freeze({
  spool:{name:'Street initiation',moves:['jump','grind','tag']},
  crane:{name:'Above the yard',moves:['wallride','rocket','fishbrain']},
  canal:{name:'Flow control',moves:['crossover','manual','slalom']},
  foundry:{name:'Heavy rotation',moves:['circle','makio','soultransfer']},
  signal:{name:'Signal scramble',moves:['heelflip','rewind','bio']},
  terminal:{name:'Crew finale',moves:['crewrelay','needlethread','bassdrop']}
 });
 const clean=n=>Number.isFinite(n)?Math.max(0,Math.min(999999999,Math.floor(n))):0;
 function normalize(raw){const out={version:1,districts:{}};for(const d of districts){const r=raw?.districts?.[d.id];out.districts[d.id]={tags:Math.min(3,clean(r?.tags)),cans:Math.min(3,clean(r?.cans)),best:clean(r?.best),crewMedal:r?.crewMedal===1?1:0,contract:clean(r?.contract)&7};}return out;}
 function merge(a,b){a=normalize(a);b=normalize(b);for(const d of districts){for(const k of ['tags','cans','best','crewMedal'])a.districts[d.id][k]=Math.max(a.districts[d.id][k],b.districts[d.id][k]);a.districts[d.id].contract|=b.districts[d.id].contract;}return a;}
 function complete(state,id){const d=districts.find(d=>d.id===id),r=normalize(state).districts[id];return !!(d&&((r.tags>=3&&r.cans>=3&&(r.best>=d.target||r.crewMedal===1))||(r.contract===7&&r.crewMedal===1)));}
 function unlocked(state,id){const i=districts.findIndex(d=>d.id===id);return i>=0&&districts.slice(0,i).every(d=>complete(state,d.id));}
 function first(state){return districts.find(d=>!complete(state,d.id))?.id||'terminal';}
 function record(state,id,event){const next=normalize(state);if(!unlocked(next,id))return next;const r=next.districts[id];if(['trick','line'].includes(event.type)&&event.source!=='ambient'){const i=contracts[id].moves.indexOf(event.move);if(i>=0)r.contract|=1<<i;}if(event.type==='tag'&&event.source!=='ambient')r.tags=Math.min(3,r.tags+1);if(event.type==='pickup')r.cans=Math.min(3,r.cans+1);if(event.type==='rival-result'&&event.finished===true&&event.crewSize===3&&Number.isFinite(event.player)&&Number.isFinite(event.opponent)&&event.opponent>0&&event.player>event.opponent)r.crewMedal=1;if(event.type==='bank')r.best=Math.max(r.best,clean(event.score));return next;}
 function describe(state,id){const d=districts.find(d=>d.id===id);if(!d)return 'Choose Start tour to begin. Your previous progress is kept.';const r=normalize(state).districts[id];return `${d.name}: tags ${r.tags}/3 · paint cans ${r.cans}/3 · rival ${d.rival}: ${r.best}/${d.target} banked points${complete(state,id)?' · district cleared':''}. Paint cans: switch to Cursor trail and collect the cans you leave. Clear the score target OR win a live crew relay to satisfy the rival objective. Crew medal: ${r.crewMedal?'earned':'not yet earned'}. Alternate route: complete ${contracts[id].name} + crew victory. ${contracts[id].moves.map((m,i)=>(r.contract&(1<<i)?'✓ ':'○ ')+m).join(' · ')}.`;}
 return {districts,contracts,normalize,merge,complete,unlocked,first,record,describe};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BeatTour;
