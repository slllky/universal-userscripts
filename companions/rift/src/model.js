/* RIFT's deterministic save reducer. One immutable record per action prevents
   two open tabs from overwriting each other's entire save. */
const RiftModel = (() => {
  const VERSION = 1;
  const SPECIES = {
    fox: {name:'Cloudfox', note:'Curious, expressive & a little mischievous', favorite:'berry', trait:'Treasure sniffer'},
    bunny: {name:'Moonbun', note:'Soft-hearted, bouncy & very cuddly', favorite:'biscuit', trait:'Garden friend'},
    axolotl: {name:'Dewdrop', note:'Dreamy, wiggly & delighted by bubbles', favorite:'tea', trait:'Bubble enthusiast'}
  };
  const TEMPERAMENTS={curious:{name:'Curious',note:'A tiny explorer. Loves fetch.',favorites:['fetch']},cuddly:{name:'Cuddly',note:'Your personal pocket cuddle. Loves pets and hugs.',favorites:['pet','cuddle']},dreamy:{name:'Dreamy',note:'A soft little daydream. Loves naps and bubbles.',favorites:['nap','bubbles']}};
  const PALETTES = [
    {name:'Moonmilk', coat:'#eee6fb', accent:'#b9a0e3', eyes:'#526d78'},
    {name:'Peach cloud', coat:'#ffe2ca', accent:'#e7a4a2', eyes:'#7a687d'},
    {name:'Mint tea', coat:'#daeee1', accent:'#84bda9', eyes:'#687099'},
    {name:'Berry dusk', coat:'#b8a3dd', accent:'#755c9c', eyes:'#d6ab69'},
    {name:'Black velvet', coat:'#53495f', accent:'#aaa1cf', eyes:'#d9ba78'},
    {name:'Rosewater', coat:'#f4cddd', accent:'#cd91b3', eyes:'#667a93'},
    {name:'Star blue', coat:'#c4dfef', accent:'#8baed3', eyes:'#746b97'},
    {name:'Honey oat', coat:'#ead8b2', accent:'#bc9973', eyes:'#6b9184'}
  ];
  const ITEMS = {
    bare:{name:'Bare ears',slot:'head',cost:0}, star:{name:'Starlight clip',slot:'head',cost:0}, bow:{name:'Silk bow',slot:'head',cost:14}, mushroom:{name:'Mushroom beret',slot:'head',cost:24}, crown:{name:'Moon crown',slot:'head',cost:38},
    none:{name:'Cloud-soft',slot:'neck',cost:0}, scarf:{name:'Knitted scarf',slot:'neck',cost:0}, bell:{name:'Little bell',slot:'neck',cost:12}, ribbon:{name:'Velvet ribbon',slot:'neck',cost:18}, cape:{name:'Stargazer cape',slot:'neck',cost:30},
    clear:{name:'Natural',slot:'back',cost:0}, wings:{name:'Gossamer wings',slot:'back',cost:26}, satchel:{name:'Forager satchel',slot:'back',cost:20},
    cushion:{name:'Cloud cushion',slot:'room',cost:0}, lantern:{name:'Moon lantern',slot:'room',cost:0}, plant:{name:'Little fern',slot:'room',cost:0}, books:{name:'Bedtime books',slot:'room',cost:16}, mushroomHouse:{name:'Mushroom house',slot:'room',cost:32}, starMobile:{name:'Star mobile',slot:'room',cost:24}
  };
  const ROUTES = {
    grove:{name:'Whispering grove',duration:60000,reward:12,description:'A tiny trail, a big leaf, and something shiny.',icon:'leaf'},
    library:{name:'Moonlit library',duration:120000,reward:20,description:'Follow the glow between the forgotten books.',icon:'book'},
    pond:{name:'Stardrop pond',duration:180000,reward:30,description:'Find reflections that shimmer back.',icon:'moon'}
  };
  const ACTIONS = {
    pet:{joy:5,energy:0,fullness:0,bond:2,cooldown:3500}, boop:{joy:4,energy:0,fullness:0,bond:1,cooldown:3000},
    brush:{joy:8,energy:2,fullness:0,bond:3,cooldown:6000}, cuddle:{joy:7,energy:4,fullness:0,bond:3,cooldown:6000},
    dance:{joy:9,energy:-3,fullness:0,bond:3,cooldown:8000}, nap:{joy:3,energy:20,fullness:0,bond:2,cooldown:20000},
    fetch:{joy:12,energy:-4,fullness:-4,bond:5,cooldown:12000}, bubbles:{joy:12,energy:-2,fullness:-2,bond:5,cooldown:12000},
    berry:{joy:4,energy:3,fullness:12,bond:2,cooldown:5000}, biscuit:{joy:4,energy:5,fullness:16,bond:2,cooldown:5000}, tea:{joy:5,energy:7,fullness:8,bond:2,cooldown:5000}
  };
  const clamp = (v,min=0,max=100) => Math.max(min,Math.min(max,Number(v)||0));
  const clean = (v,n=24) => String(v??'').replace(/[\u0000-\u001f<>]/g,'').slice(0,n);
  const color = v => /^#[a-f\d]{6}$/i.test(v||'') ? v : null;
  const fresh = () => ({version:VERSION,name:'Mochi',species:'fox',temperament:'curious',adopted:false,look:{...PALETTES[0],marking:'freckles',head:'star',neck:'scarf',back:'clear'},
    joy:80,energy:85,fullness:75,bond:0,stardust:35,owned:['bare','star','none','scarf','clear','cushion','lantern','plant'],
    garden:[0,0,0],expedition:null,room:[{id:'cushion',x:48,y:77},{id:'lantern',x:17,y:64},{id:'plant',x:81,y:66}],theme:'dusk',outfits:[null,null,null,null],
    sites:{},settings:{sound:false,motion:true,roam:true,size:120},memories:[],last:{},counts:{},daily:{},badges:[],focus:null,seed:431});
  const level = s => 1 + Math.floor(Math.sqrt(s.bond / 18));
  function memory(s,text,at,kind='heart') {s.memories.unshift({text,at,kind});s.memories=s.memories.slice(0,70);}
  function validateLook(l,owned) {
    const base={...PALETTES[0],marking:'freckles',head:'star',neck:'scarf',back:'clear'};
    if(!l||typeof l!=='object')return base;
    for(const k of ['coat','accent','eyes']) if(color(l[k])) base[k]=l[k];
    if(['freckles','star','socks','plain'].includes(l.marking))base.marking=l.marking;
    for(const k of ['head','neck','back'])if(ITEMS[l[k]]?.slot===k&&owned.includes(l[k]))base[k]=l[k];
    return base;
  }
  function validateSave(input) {
    if(!input||input.version!==VERSION||typeof input.name!=='string'||!SPECIES[input.species])throw new Error('This is not a compatible RIFT save.');
    const s=fresh();s.name=clean(input.name)||'Mochi';s.species=input.species;s.adopted=!!input.adopted;if(TEMPERAMENTS[input.temperament])s.temperament=input.temperament;
    for(const k of ['joy','energy','fullness'])s[k]=clamp(input[k]);
    s.bond=clamp(input.bond,0,1000000);s.stardust=clamp(input.stardust,0,1000000);
    s.owned=[...new Set([...s.owned,...(Array.isArray(input.owned)?input.owned.filter(x=>ITEMS[x]):[])])];
    s.look=validateLook(input.look,s.owned);
    if(['dusk','meadow','midnight'].includes(input.theme))s.theme=input.theme;
    s.room=Array.isArray(input.room)?input.room.filter(x=>x&&ITEMS[x.id]?.slot==='room'&&s.owned.includes(x.id)).slice(0,12).map(x=>({id:x.id,x:clamp(x.x,6,94),y:clamp(x.y,20,85)})):s.room;
    s.garden=[0,1,2].map(i=>clamp(input.garden?.[i],0,Date.now()));
    s.outfits=[0,1,2,3].map(i=>input.outfits?.[i]?{name:clean(input.outfits[i].name),look:validateLook(input.outfits[i].look,s.owned)}:null);
    if(input.expedition&&ROUTES[input.expedition.route]&&Number.isFinite(input.expedition.start))s.expedition={route:input.expedition.route,start:clamp(input.expedition.start,0,Date.now()),id:clean(input.expedition.id,100)};
    if(input.focus&&Number.isFinite(input.focus.start))s.focus={start:clamp(input.focus.start,0,Date.now()),duration:clamp(input.focus.duration,60000,3600000),id:clean(input.focus.id,100)};
    for(const k of ['sound','motion','roam'])if(typeof input.settings?.[k]==='boolean')s.settings[k]=input.settings[k];
    s.settings.size=clamp(input.settings?.size||120,80,180);
    if(input.sites&&typeof input.sites==='object')for(const [k,v]of Object.entries(input.sites).slice(0,500))if(/^[a-z\d.:-]+$/i.test(k)&&typeof v==='boolean'&&!['__proto__','constructor','prototype'].includes(k))s.sites[k]=v;
    s.memories=(Array.isArray(input.memories)?input.memories:[]).slice(0,70).filter(m=>m&&Number.isFinite(m.at)).map(m=>({text:clean(m.text,160),at:m.at,kind:'heart'}));
    s.badges=(Array.isArray(input.badges)?input.badges:[]).filter(x=>['friend','gardener','explorer','stylist','guardian','focused'].includes(x));
    for(const field of ['counts','last','daily'])if(input[field]&&typeof input[field]==='object')for(const [k,v]of Object.entries(input[field]).slice(0,400))if(/^[a-z\d_-]+$/i.test(k)&&!['__proto__','constructor','prototype'].includes(k)&&Number.isFinite(v))s[field][k]=clamp(v,0,field==='last'?Date.now():1000000);
    return s;
  }
  function badge(s,id,condition,text,at){if(condition&&!s.badges.includes(id)){s.badges.push(id);memory(s,text,at,'star');s.stardust+=8;}}
  function apply(s,e) {
    if(!e||!Number.isFinite(e.at)||typeof e.type!=='string')return s;
    const p=e.payload||{},t=e.at;
    switch(e.type){
      case 'adopt':if(!s.adopted){s.adopted=true;s.name=clean(p.name)||'Mochi';if(SPECIES[p.species])s.species=p.species;memory(s,`${s.name} found a home with you.`,t,'spark');}break;
      case 'rename':s.name=clean(p.name)||s.name;break;
      case 'species':if(SPECIES[p.species]){s.species=p.species;memory(s,`${s.name} tried their ${SPECIES[s.species].name} form.`,t,'spark');}break;
      case 'temperament':if(TEMPERAMENTS[p.temperament])s.temperament=p.temperament;break;
      case 'look':s.look=validateLook({...s.look,...p},s.owned);break;
      case 'care':{
        const a=ACTIONS[p.action];if(!a||(s.last[p.action]&&t-s.last[p.action]<a.cooldown))break;
        s.last[p.action]=t;s.counts[p.action]=(s.counts[p.action]||0)+1;
        for(const k of ['joy','energy','fullness'])s[k]=clamp(s[k]+a[k]);
        const favorite=p.action===SPECIES[s.species].favorite;s.bond+=a.bond+(favorite?2:0)+(TEMPERAMENTS[s.temperament].favorites.includes(p.action)?1:0);
        if(['fetch','bubbles'].includes(p.action))s.stardust+=3;
        if(s.counts[p.action]===1)memory(s,({pet:`${s.name} leaned into their first head scratch.`,boop:'A tiny nose. A tiny boop. An enormous opinion.',brush:'Their fur has never been this ridiculously fluffy.',cuddle:'You became a very acceptable pillow.',dance:'Two left paws. Absolutely no regrets.',nap:'They fell asleep knowing you were nearby.',fetch:'A successful delivery. The ball is a little damp.',bubbles:'The bubbles were defeated. All of them.'})[p.action]||`${s.name} tried ${p.action}${favorite?' — a new favorite!':'.'}`,t);
        badge(s,'friend',s.bond>=40,'Little milestone: trusted friend. +8 stardust',t);break;
      }
      case 'buy':{const item=ITEMS[p.id];if(item&&!s.owned.includes(p.id)&&s.stardust>=item.cost){s.stardust-=item.cost;s.owned.push(p.id);memory(s,`A little present: ${item.name.toLowerCase()}.`,t,'gift');}break;}
      case 'outfitSave':if(Number.isInteger(p.slot)&&p.slot>=0&&p.slot<4){s.outfits[p.slot]={name:clean(p.name)||`Look ${p.slot+1}`,look:{...s.look}};badge(s,'stylist',s.outfits.filter(Boolean).length>=2,'Little milestone: personal stylist. +8 stardust',t);}break;
      case 'outfitLoad':if(s.outfits[p.slot])s.look=validateLook(s.outfits[p.slot].look,s.owned);break;
      case 'theme':if(['dusk','meadow','midnight'].includes(p.theme))s.theme=p.theme;break;
      case 'place':if(ITEMS[p.id]?.slot==='room'&&s.owned.includes(p.id)){const a=s.room.find(x=>x.id===p.id);const pos={id:p.id,x:clamp(p.x,6,94),y:clamp(p.y,20,85)};if(a)Object.assign(a,pos);else if(s.room.length<12)s.room.push(pos);}break;
      case 'remove':s.room=s.room.filter(x=>x.id!==p.id);break;
      case 'plant':if(Number.isInteger(p.slot)&&p.slot>=0&&p.slot<3&&!s.garden[p.slot])s.garden[p.slot]=t;break;
      case 'harvest':if(Number.isInteger(p.slot)&&p.slot>=0&&p.slot<3&&s.garden[p.slot]&&t-s.garden[p.slot]>=120000){s.garden[p.slot]=0;s.stardust+=6;s.counts.harvest=(s.counts.harvest||0)+1;badge(s,'gardener',s.counts.harvest>=3,'Little milestone: moonberry gardener. +8 stardust',t);}break;
      case 'expedition':if(!s.expedition&&ROUTES[p.route]){s.expedition={route:p.route,start:t,id:e.id};memory(s,`${s.name} set off for the ${ROUTES[p.route].name.toLowerCase()}.`,t,'compass');}break;
      case 'claimExpedition':if(s.expedition&&p.id===s.expedition.id&&t-s.expedition.start>=ROUTES[s.expedition.route].duration){const r=ROUTES[s.expedition.route];s.stardust+=r.reward;s.bond+=8;s.counts.trips=(s.counts.trips||0)+1;memory(s,`${s.name} brought home ${r.reward} stardust and a story from the ${r.name.toLowerCase()}.`,t,'compass');s.expedition=null;badge(s,'explorer',s.counts.trips>=3,'Little milestone: pocket explorer. +8 stardust',t);}break;
      case 'riftWin':if(/^[a-z\d-]{5,80}$/i.test(p.runId||'')&&!s.last['rift_'+p.runId]){s.last['rift_'+p.runId]=t;s.stardust+=18;s.bond+=10;s.counts.rifts=(s.counts.rifts||0)+1;memory(s,'A lost wisp found its way home. +18 stardust',t,'spark');badge(s,'guardian',s.counts.rifts>=3,'Little milestone: rift guardian. +8 stardust',t);}break;
      case 'focusStart':if(!s.focus)s.focus={start:t,duration:clamp(p.minutes,1,60)*60000,id:e.id};break;
      case 'focusCancel':s.focus=null;break;
      case 'focusClaim':if(s.focus&&p.id===s.focus.id&&t-s.focus.start>=s.focus.duration){s.focus=null;s.stardust+=12;s.bond+=6;memory(s,'A quiet moment, shared. Focus session complete. +12 stardust',t,'moon');badge(s,'focused',true,'Little milestone: study buddy. +8 stardust',t);}break;
      case 'daily':if(/^\d{4}-\d{2}-\d{2}$/.test(p.day)&&!s.daily[p.day]){s.daily[p.day]=1;s.stardust+=8;memory(s,`${s.name} left a welcome-home gift. +8 stardust`,t,'gift');}break;
      case 'setting':if(['sound','motion','roam'].includes(p.key)&&typeof p.value==='boolean')s.settings[p.key]=p.value;else if(p.key==='size')s.settings.size=clamp(p.value,80,180);break;
      case 'site':if(/^[a-z\d.:-]+$/i.test(p.host||'')&&!['__proto__','constructor','prototype'].includes(p.host)&&typeof p.enabled==='boolean')s.sites[p.host]=p.enabled;break;
      case 'restore':try{return validateSave(p.save);}catch{}break;
      case 'reset':return fresh();
    }
    badge(s,'friend',s.bond>=40,'Little milestone: trusted friend. +8 stardust',t);
    return s;
  }
  function reduce(events){let s=fresh();for(const e of [...events].sort((a,b)=>a.at-b.at||String(a.id).localeCompare(String(b.id))))s=apply(s,e);return s;}
  return {VERSION,SPECIES,TEMPERAMENTS,PALETTES,ITEMS,ROUTES,ACTIONS,fresh,level,reduce,apply,validateSave,clamp,clean};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=RiftModel;
