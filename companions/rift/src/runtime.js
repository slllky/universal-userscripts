const RiftRuntime = (()=>{
 const PREFIX='rift.v1.event.',SIGNAL='rift.v1.signal';
 const isUserscript=typeof GM_getValue==='function'&&typeof GM_setValue==='function';
 const temporaryValues=new Map();let temporary=false;
 if(!isUserscript){try{const probe='rift.v1.storage-probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);}catch{temporary=true;}}
 const storage={
   get:k=>{try{return isUserscript?GM_getValue(k,null):temporary?temporaryValues.get(k)??null:JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}},
   set:(k,v)=>{if(isUserscript)GM_setValue(k,v);else if(temporary)temporaryValues.set(k,v);else localStorage.setItem(k,JSON.stringify(v));},
   keys:()=>isUserscript?GM_listValues():temporary?[...temporaryValues.keys()]:Object.keys(localStorage)
 };
 class Store{
   constructor(onChange){this.cache=new Map();this.onChange=null;this.state=RiftModel.fresh();this.refresh();this.onChange=onChange;
     if(isUserscript&&typeof GM_addValueChangeListener==='function')GM_addValueChangeListener(SIGNAL,(_k,_o,_n,remote)=>{if(remote)this.schedule();});
     else window.addEventListener('storage',e=>{if(e.key===SIGNAL||e.key?.startsWith(PREFIX))this.schedule();});
   }
   schedule(){clearTimeout(this.pending);this.pending=setTimeout(()=>this.refresh(),35);}
   refresh(){let changed=false;for(const k of storage.keys()){if(!k.startsWith(PREFIX)||this.cache.has(k))continue;const e=storage.get(k);if(e&&e.id&&Number.isFinite(e.at)){this.cache.set(k,e);changed=true;}}
     if(changed){this.state=RiftModel.reduce([...this.cache.values()]);this.onChange?.(this.state);}return this.state;}
   dispatch(type,payload={}){this.refresh();const at=Date.now(),id=`${at}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;const e={id,at,type,payload};
     storage.set(PREFIX+id,e);this.cache.set(PREFIX+id,e);storage.set(SIGNAL,id);this.state=RiftModel.reduce([...this.cache.values()]);this.onChange?.(this.state);return this.state;}
 }
 class Animator{
   constructor(root){this.root=root;this.rigs=[];this.pointer={x:0,y:0};this.action={kind:'idle',start:0,end:0};this.motion=true;this.dragging=false;this.worldWalking=false;this.frame=0;this.time=0;}
   scan(){this.rigs=[...this.root.querySelectorAll('[data-rig]')].map((svg,i)=>({svg,mini:!svg.closest('.stage-pet,.world-pet,.arena-avatar'),phase:i*.6,parts:Object.fromEntries([...svg.querySelectorAll('[data-part]')].map(x=>[x.dataset.part,x]))}));}
   act(kind,seconds=3){this.action={kind,start:performance.now(),end:performance.now()+seconds*1000};}
   tick(now){this.time=now;const t=now/1000,a=this.action,active=now<a.end;let strength=active?(this.motion?Math.min(1,(now-a.start)/280,(a.end-now)/400):1):0;
     const kind=active?a.kind:'idle';
     for(const r of this.rigs){if(!r.svg.isConnected||r.mini||r.svg.closest('.world-pet')?.hidden||r.svg.closest('.scrim')?.hidden)continue;const p=r.parts,mini=r.mini,move=this.motion&&!mini;const ph=t+r.phase,weight=mini?0:strength;
       const breathing=move?Math.sin(ph*2.1)*1.3:0,walk=move&&((r.svg.closest('.world-pet')&&this.worldWalking)||kind==='fetch');
       const dancing=move&&kind==='dance'?weight:0,sleeping=kind==='nap'?weight:0,petting=['pet','brush','cuddle','boop'].includes(kind)?weight:0;
       const feeding=['berry','biscuit','tea'].includes(kind)?weight:0;
       let bounce=walk?Math.abs(Math.sin(ph*12))*4:0;bounce+=dancing*Math.abs(Math.sin(ph*8))*9;
       const bodyTurn=dancing*Math.sin(ph*7)*7,headTurn=(move?Math.sin(ph*1.1)*1.4:0)+petting*5+dancing*Math.sin(ph*7+1)*8;
       p.whole?.setAttribute('transform',`translate(0 ${-bounce+sleeping*18}) rotate(${-sleeping*7} 120 170)`);
       const painted=r.svg.dataset?.art==='painted';
       p.body?.setAttribute('transform',painted?`translate(0 ${breathing}) rotate(${bodyTurn+headTurn*.38+(move?this.pointer.x*.4:0)} 120 192) translate(120 214) scale(${1-(move?Math.sin(ph*2.1)*.006:0)} ${1+(move?Math.sin(ph*2.1)*.008:0)}) translate(-120 -214)`:`translate(0 ${breathing}) rotate(${bodyTurn} 120 170)`);
       p.head?.setAttribute('transform',`translate(0 ${breathing*.7}) rotate(${headTurn+(move?feeding*Math.sin(ph*11)*2:0)} 120 113)`);
       p.earL?.setAttribute('transform',`rotate(${(move?Math.sin(ph*1.9)*3:0)-petting*7+(this.dragging?12:0)} 75 85)`);
       p.earR?.setAttribute('transform',`rotate(${(move?Math.sin(ph*1.8+.9)*3:0)+petting*7-(this.dragging?12:0)} 165 85)`);
       p.tail?.setAttribute('transform',`rotate(${(move?Math.sin(ph*(petting?8:2.2))*5:0)+dancing*Math.sin(ph*9)*8} 166 179)`);
       p.pawL?.setAttribute('transform',`rotate(${walk?Math.sin(ph*12)*10:dancing*25+petting*-8-feeding*16} 83 147)`);
       p.pawR?.setAttribute('transform',`rotate(${walk?-Math.sin(ph*12)*10:dancing*-25+petting*8+feeding*16} 157 147)`);
       p.footL?.setAttribute('transform',`translate(0 ${walk?Math.sin(ph*12)*4:0})`);p.footR?.setAttribute('transform',`translate(0 ${walk?-Math.sin(ph*12)*4:0})`);
       p.wings?.setAttribute('transform',`translate(120 150) scale(${move?1+Math.sin(ph*4)*.06:1} 1) translate(-120 -150)`);
       const blink=move&&((ph%4.8)>4.63),closed=blink||sleeping>.35||petting>.6||kind==='bubbles'&&weight>.5;
       if(p.eyes)p.eyes.style.opacity=closed?'0':'1';if(p.closed)p.closed.style.opacity=closed?'1':'0';
       if(p.zzz)p.zzz.style.opacity=String(sleeping);
       for(const [part,snack]of [['snackBerry','berry'],['snackBiscuit','biscuit'],['snackTea','tea']])if(p[part])p[part].style.opacity=kind===snack?String(weight):'0';
       if(p.pupils&&!mini){p.pupils.setAttribute('transform',`translate(${Math.max(-2.3,Math.min(2.3,this.pointer.x))} ${Math.max(-1.5,Math.min(1.5,this.pointer.y))})`);}
       if(p.shadow)p.shadow.setAttribute('rx',String(64-bounce*.8));
     }
   }
 }
 class Sound{
   constructor(){this.enabled=false;this.context=null;}
   play(kind='soft'){if(!this.enabled)return;try{const ctx=this.context||(this.context=new(window.AudioContext||window.webkitAudioContext)());ctx.resume();const base=kind==='reward'?523:kind==='boop'?880:kind==='pop'?1047:392;
     const notes=kind==='reward'?[0,4,7,12]:[0,kind==='boop'?3:7];notes.forEach((n,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=base*2**(n/12);const st=ctx.currentTime+i*.075;g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(.035,st+.012);g.gain.exponentialRampToValueAtTime(.001,st+.24);o.connect(g);g.connect(ctx.destination);o.start(st);o.stop(st+.26);});}catch{}}
 }
 return {Store,Animator,Sound,isUserscript,temporary};
})();
