const RiftArt = (() => {
 const paths={
 heart:'M12 21S3 15 3 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 9 2.8C21 15 12 21 12 21Z',
 star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
 spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z',
 moon:'M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z',
 home:'m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
 brush:'m14 3 7 7-9 9-7-7ZM6 14c-5 0-2 5-5 7 7 1 10-2 7-5',
 shirt:'m8 3 4 3 4-3 6 5-4 5v8H6v-8L2 8Z',
 leaf:'M20 3C7 2 2 6 4 14s14 8 16-11ZM5 19 16 8',
 compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-3 5-5 3 3-5Z',
 book:'M12 5Q6 2 2 4v16q5-2 10 0 5-2 10 0V4q-4-2-10 1Zm0 0v15',
 gift:'M3 8h18v5H3Zm2 5v8h14v-8M12 8v13M12 8C2 8 5 0 9 3Zm0 0c10 0 7-8 3-5Z',
 close:'m6 6 12 12M6 18 18 6', check:'m5 12 4 4L19 6', plus:'M12 4v16M4 12h16',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
 play:'m8 4 13 8-13 8Z', pause:'M8 4v16M16 4v16', sound:'m3 9 5 0 5-5v16l-5-5H3ZM17 8q6 4 0 8',
 arrow:'M4 12h16m-6-6 6 6-6 6', download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4', upload:'M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4',
 paw:'M8 12c-2 2-5 4-3 7s5 0 7 0 5 3 7 0-1-5-3-7q-4-4-8 0ZM5 7a1.6 2.5 0 1 0 0 .1M10 4a1.6 2.5 0 1 0 0 .1M15 4a1.6 2.5 0 1 0 0 .1M20 7a1.6 2.5 0 1 0 0 .1',
 time:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
 ball:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM5 6q12 0 13 12M3 14Q14 15 15 3',
 bubble:'M16 13a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM22 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM7 12l2-2',
 food:'M8 5q-1-3 4-3M5 9q7-5 14 0l-1 9q-6 5-12 0ZM4 9h16',
 sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
 move:'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4',
 lock:'M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4', info:'M12 11v6m0-10v1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
 };
 const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
 const star=(x,y,r=5,fill='#ffe5aa')=>`<path d="M${x} ${y-r}q1 ${r-1} ${r} ${r}q-${r-1} 1-${r} ${r}q-1-${r-1}-${r}-${r}q${r-1}-1 ${r}-${r}Z" fill="${fill}"/>`;
 const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
 // A color separation shader retains the illustration's shading and texture.
 // Rose pigments select ears/gills; blue-green pigments select the irises.
 function pigmentFilter(look,id){
   const ramp=(color)=>[0,1,2].map((channel)=>{
     const c=parseInt(color.slice(channel*2+1,channel*2+3),16)/255;
     const values=[.035,.14+c*.13,.18+c*.36,.12+c*.69,.25+c*.75];
     return `<feFunc${'RGB'[channel]} type="table" tableValues="${values.map(v=>v.toFixed(4)).join(' ')}"/>`;
   }).join('');
   return `<filter id="pigment-${id}" filterUnits="userSpaceOnUse" x="-10" y="0" width="260" height="240" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" values=".213 .715 .072 0 0 .213 .715 .072 0 0 .213 .715 .072 0 0 0 0 0 1 0" result="luma"/><feComponentTransfer in="luma" result="coat">${ramp(look.coat)}</feComponentTransfer><feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 12 -24 12 0 -.09" result="rose"/><feComposite in="rose" in2="SourceAlpha" operator="in" result="roseMask"/><feComponentTransfer in="luma" result="accent">${ramp(look.accent)}</feComponentTransfer><feComposite in="accent" in2="roseMask" operator="in" result="accentInk"/><feComposite in="accentInk" in2="coat" operator="over" result="fur"/><feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -10 10 0 0 -.08" result="teal"/><feComposite in="teal" in2="SourceAlpha" operator="in" result="eyeMask"/><feComponentTransfer in="luma" result="iris">${ramp(look.eyes)}</feComponentTransfer><feComposite in="iris" in2="eyeMask" operator="in" result="eyeInk"/><feComposite in="eyeInk" in2="fur" operator="over" result="colored"/><feComposite in="colored" in2="SourceAlpha" operator="in"/></filter>`;
 }
 function pet(s,id='pet',mini=false){
   const l=s.look,kind=s.species||'fox',ax=kind==='axolotl';
   // Unequal crop windows keep the axolotl's wide gills out of the rabbit frame.
   const crop={fox:{x:0,w:516},bunny:{x:530,w:464},axolotl:{x:994,w:542}}[kind];
   const a={fox:{hx:137,hy:64,nx:99,ny:128,fx:83,fy:201,hatX:118,hatY:49},bunny:{hx:143,hy:51,nx:113,ny:112,fx:108,fy:198,hatX:113,hatY:36},axolotl:{hx:129,hy:100,nx:113,ny:175,fx:112,fy:198,hatX:113,hatY:98}}[kind];
   const ink='#685464',accent=l.accent,bright=mix(accent,'#fff8db',.6);
   const atlas=typeof RIFT_ATLAS==='string'?RIFT_ATLAS:'';
   const frame=(row)=>`<svg x="${120-crop.w/512*115}" y="5" width="${crop.w/512*230}" height="230" viewBox="${crop.x} ${row*512} ${crop.w} 512" overflow="hidden" preserveAspectRatio="none"><use href="#atlas-${id}"/></svg>`;
   return `<svg class="pet-art pet-${kind}" viewBox="0 0 240 240" data-rig="${id}" data-species="${kind}" data-art="painted" role="img" aria-label="${RiftModel.SPECIES[kind].name} companion" style="--coat:${l.coat};--accent:${accent};--eye:${l.eyes}"><defs><image id="atlas-${id}" href="${atlas}" width="1536" height="1024"/>${pigmentFilter(l,id)}<linearGradient id="silk-${id}" x2=".8" y2="1"><stop stop-color="${bright}"/><stop offset="1" stop-color="${accent}"/></linearGradient><linearGradient id="wing-${id}" x2="1" y2="1"><stop stop-color="#fff6de" stop-opacity=".85"/><stop offset="1" stop-color="${accent}" stop-opacity=".5"/></linearGradient></defs><ellipse data-part="shadow" cx="120" cy="220" rx="66" ry="7" fill="#383242" opacity=".14"/><g data-part="whole"><g data-part="body">
   ${l.back==='wings'?`<g data-part="wings" fill="url(#wing-${id})" stroke="${mix(accent,ink,.4)}" stroke-width="1"><path d="M91 156C73 119 23 91 25 124q2 21 39 31-31-3-25 14 8 23 49 1Z"/><path d="M149 156c18-37 68-65 66-32-2 21-39 31-39 31 31-3 25 14-8 23-49 1Z"/><path d="m86 157-44-34m112 34 44-34" stroke="#fff5da" fill="none"/></g>`:''}
   ${l.neck==='cape'?`<path d="M${a.nx-22} ${a.ny}q-21 28-24 65 20 15 43 0 24 15 47-2-6-41-27-62Z" fill="${mix(accent,'#3f3d54',.5)}" stroke="#6f5865" stroke-width="1.2"/><path d="M${a.nx-38} ${a.ny+58}q40 16 76 0" stroke="#d6b781" stroke-dasharray="2 3" fill="none"/>`:''}
   <g data-part="eyes" filter="url(#pigment-${id})">${frame(0)}</g><g data-part="closed" filter="url(#pigment-${id})" style="opacity:0">${frame(1)}</g>
   <g stroke="${ink}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
   ${l.marking==='freckles'?`<g fill="${accent}" stroke="none" opacity=".55" transform="translate(${a.nx-25} ${a.ny-25})"><circle cx="0" cy="0" r="1.2"/><circle cx="5" cy="-2" r="1.1"/><circle cx="6" cy="3" r="1.1"/><circle cx="53" cy="0" r="1.2"/><circle cx="49" cy="-2" r="1.1"/><circle cx="48" cy="3" r="1.1"/></g>`:''}
   ${l.marking==='star'?`<g stroke="none" opacity=".7">${star(a.hatX,a.hatY+22,6,accent)}</g>`:''}
   ${l.marking==='socks'?`<g fill="#fff6e2" opacity=".38" stroke="none"><ellipse cx="${a.fx-11}" cy="${a.fy}" rx="8" ry="5"/><ellipse cx="${a.fx+10}" cy="${a.fy}" rx="8" ry="5"/></g>`:''}
   ${l.back==='satchel'?`<g transform="translate(${a.nx+21} ${Math.min(a.ny+18,176)}) rotate(7)"><path d="m-45-17 55 31" stroke="#947453" stroke-width="3"/><path d="M0 0q13-3 27 1l-1 27q-13 4-26-1Z" fill="#ae8963"/><path d="M0 0q13 14 27 1" fill="#d7b58a"/><path d="M12 8v7" stroke="#efd59c" stroke-width="2"/><path d="M4 23h19" stroke-dasharray="1 2" stroke-opacity=".35"/></g>`:''}
   ${l.neck==='scarf'?`<g transform="translate(${a.nx} ${a.ny}) rotate(-7)"><path d="m-8 4-10 32 10-4 7 5 5-31" fill="url(#silk-${id})"/><path d="M-26-3q25 13 53-2l-3 10q-24 15-48 1Z" fill="url(#silk-${id})"/><path d="m-12 20 12 2m-14 5 12 2M-18 2q16 8 36-1" fill="none" stroke="${bright}" stroke-width="1.5"/></g>`:''}
   ${l.neck==='ribbon'?`<g transform="translate(${a.nx} ${a.ny})"><path d="m0 0-18-10q-7 9-3 18l20-4-5 19 9-7 6 7-3-19 19 4q4-11-3-18Z" fill="url(#silk-${id})"/><ellipse cx="0" cy="2" rx="5" ry="6" fill="${bright}"/></g>`:''}
   ${l.neck==='bell'?`<g transform="translate(${a.nx} ${a.ny})"><path d="M-25-2q25 13 50-2" stroke="${accent}" stroke-width="4" fill="none"/><circle cx="0" cy="12" r="8" fill="#d6b475"/><path d="M-6 14H6m-6 0v4" fill="none"/><path d="m-4 8 3-1" stroke="#fff0c7" stroke-width="2"/></g>`:''}
   <g data-part="headwear">
   ${l.head==='star'?`<g transform="rotate(16 ${a.hx} ${a.hy})">${star(a.hx,a.hy,9,'#dfbf7a')}<path d="m${a.hx-3} ${a.hy-1} 2-3" stroke="#fff5d5" stroke-width="1.7"/><path d="m${a.hx+3} ${a.hy+7} 1 8" stroke="#d7b775"/></g>`:''}
   ${l.head==='bow'?`<g transform="translate(${a.hx} ${a.hy}) rotate(12)"><path d="M-2 1-19-11q-6 9-3 20l21-4L18 12q7-11 0-21L3 1" fill="url(#silk-${id})"/><path d="m-14 1 10 2m9 0 9 1" stroke-opacity=".35"/><circle r="4.5" cy="3" fill="${bright}"/></g>`:''}
   ${l.head==='mushroom'?`<g transform="translate(${a.hatX} ${a.hatY}) rotate(-9)"><path d="M-29 3q2-30 29-29T30 3" fill="#b47285"/><ellipse cy="3" rx="30" ry="6" fill="#ead1bd"/><path d="m-21 2 6 4m9-5 2 6m12-6-2 6m13-6-6 5" stroke="#b48d8d" stroke-width=".6"/><g fill="#f8e8c9" stroke="none"><ellipse cx="-12" cy="-12" rx="6" ry="4" transform="rotate(-24 -12 -12)"/><circle cx="9" cy="-18" r="4"/><ellipse cx="16" cy="-4" rx="4.5" ry="3"/></g></g>`:''}
   ${l.head==='crown'?`<g transform="translate(${a.hatX} ${a.hatY}) rotate(-8)"><path d="m-23 3-4-17 15 8L0-24 11-6 27-14 23 3Z" fill="#dabc81"/><path d="M-19-1h38" stroke="#ffedb0"/><path d="m0-12 4 6-4 5-4-5Z" fill="${accent}"/><g fill="#f8e8bb"><circle cx="-27" cy="-14" r="2"/><circle cy="-24" r="2"/><circle cx="27" cy="-14" r="2"/></g></g>`:''}
   </g>
   <g transform="translate(${a.nx-120} ${ax?24:0})"><g data-part="snackBerry" opacity="0"><path d="m120 158-10-7 10 2 3-7 1 8 9-2-6 7" fill="#839f80"/><path d="M120 159q-17-10-16 6 2 14 16 21 15-7 17-21 1-16-17-6Z" fill="#b67a96"/><path d="m111 165 1 2m14-3 1 2m-8 8 1 2" stroke="#ffe4b2" stroke-width="2"/></g><g data-part="snackBiscuit" opacity="0"><path d="M103 174q-7-10 3-15 4-8 14-4 10-4 14 4 10 5 3 15-17 14-34 0Z" fill="#dcba85"/><path d="M105 174q15 6 29-1" stroke="#f8ddaa" fill="none"/><g fill="#997052" stroke="none"><circle cx="112" cy="164" r="2"/><circle cx="126" cy="168" r="2"/></g></g><g data-part="snackTea" opacity="0"><path d="M133 160q16-2 10 11-3 5-9 0" stroke="#a88d9d" stroke-width="3" fill="none"/><path d="M104 159h30v13q-1 13-15 13t-15-13Z" fill="#e4d2d9"/><ellipse cx="119" cy="159" rx="15" ry="4" fill="#917663"/><path d="m115 170 4-4 4 4-4 5Z" fill="${accent}" stroke="none"/><path d="M113 150q-4-5 0-10m10 10q-4-5 0-10" fill="none" stroke="#fff1d4" opacity=".75"/></g></g>
   </g></g></g><g data-part="zzz" opacity="0" fill="#a78dba" font-family="Georgia" font-style="italic"><text x="178" y="62" font-size="22">z</text><text x="198" y="40" font-size="16">z</text></g></svg>`;
 }
 function scenery(theme='dusk'){
  const scene=typeof RIFT_SCENERY==='string'?RIFT_SCENERY:'';
  return `<svg class="scenery scenery-${theme}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="${scene}" width="1536" height="1024"/><rect class="scene-tint" width="1536" height="1024" fill="${theme==='midnight'?'#1c284e':theme==='meadow'?'#f7cb7e':'#72567c'}" opacity="${theme==='midnight'?'.32':theme==='meadow'?'.14':'.06'}"/></svg>`;
 }
 function object(id){
 const objs={
 cushion:'<ellipse cx="60" cy="71" rx="52" ry="14" fill="#443950" opacity=".15"/><path d="M12 60q0-37 48-37t48 37q-8 25-48 23T12 60" fill="#bfabc9"/><ellipse cx="60" cy="51" rx="44" ry="22" fill="#e5d4e3"/><path d="M26 55q30 21 68 0" fill="none" stroke="#bfabc9"/><path d="m55 48 5-8 5 8 9 1-7 6 2 9-9-4-9 4 2-9-7-6Z" fill="#c2a4c6"/>',
 lantern:'<ellipse cx="60" cy="83" rx="36" ry="7" fill="#443950" opacity=".12"/><path d="M44 24V16q16-26 32 0v8" stroke="#88765e" fill="none" stroke-width="4"/><rect x="37" y="22" width="46" height="57" rx="18" fill="#ead3a4"/><rect x="44" y="28" width="32" height="43" rx="13" fill="#fff0b9"/><path d="M67 39a13 13 0 1 0 0 23q-15-4 0-23" fill="#c5a16e"/><path d="M36 24h48M36 78h48" stroke="#877568" stroke-width="6" stroke-linecap="round"/>',
 plant:'<path d="M40 57h40l-6 29H46Z" fill="#d4b6b0"/><ellipse cx="60" cy="57" rx="21" ry="6" fill="#8a7c80"/><path d="M60 60V13m0 35Q22 48 30 21q28 1 30 27m0-13q32 0 30-24-27 2-30 24m0 22q31 0 35-20-28-6-35 20" fill="#87ab94" stroke="#638773" stroke-width="2"/>',
 books:'<path d="M24 61h69v19H24Z" fill="#8d88ad"/><path d="M30 64h63v11H30Z" fill="#e9dfcb"/><path d="M21 42h72v19H21Z" fill="#bd91a4"/><path d="M28 46h65v10H28Z" fill="#ede1cd"/><path d="m40 22 48 8-2 18-48-8Z" fill="#92b2a4"/><path d="m45 28 38 7" stroke="#dce6ce" stroke-width="3"/><path d="m63 43 8 1-2 24-4-5-5 3Z" fill="#d7b778"/>',
 mushroomHouse:'<path d="M34 43h53v42H34Z" fill="#ead8bc"/><path d="M14 43q40-67 92 0Z" fill="#bf7e92"/><ellipse cx="60" cy="43" rx="47" ry="8" fill="#deb6b9"/><circle cx="46" cy="23" r="7" fill="#f6e3cc"/><circle cx="75" cy="30" r="6" fill="#f6e3cc"/><path d="M48 85V65q12-17 24 0v20" fill="#857c8d"/><circle cx="65" cy="73" r="2" fill="#ead8bc"/><circle cx="81" cy="58" r="6" fill="#a9c4b1"/>',
 starMobile:'<path d="M60 2v20M23 27q37-16 74 0M23 27v29m37-34v50m37-45v24" stroke="#dac4a0" stroke-width="2" fill="none"/>'+star(23,62,10)+star(60,77,11)+star(97,56,9)
 };
 return `<svg viewBox="0 0 120 100" aria-hidden="true">${objs[id]||objs.cushion}</svg>`;
 }
 function accessory(id,look){
   const c=look.accent,light=mix(c,'#fff2d7',.5);
   const art={
    bare:'<path d="M20 34 16 10q16 4 20 20m8 0q4-16 20-20l-4 24" fill="#e4d1b7"/><path d="m23 26-2-8 8 8m22 0 8-8-2 8" fill="#d7a4a3"/>',
    star:star(40,25,16,'#ddbe79')+'<path d="M33 22 38 16m7 19 2 9" stroke="#fff0bf" stroke-width="2"/>',
    bow:`<path d="m39 24-22-13q-7 14-2 27l24-8 24 8q6-17-1-27L42 24" fill="${c}"/><path d="m24 24 12 3m10 0 11-3" stroke="${light}"/><circle cx="40" cy="27" r="6" fill="${light}"/>`,
    mushroom:'<path d="M13 28q6-26 27-26t27 26" fill="#b57585"/><ellipse cx="40" cy="29" rx="29" ry="6" fill="#efdbc3"/><g fill="#f8e6c6" stroke="none"><ellipse cx="27" cy="16" rx="6" ry="4"/><circle cx="47" cy="11" r="4"/><ellipse cx="54" cy="22" rx="5" ry="3"/></g><path d="M26 29v4m9-5v6m10-6v6m9-5v4" stroke="#c8a699"/>',
    crown:`<path d="m17 35-4-23 18 12L40 4l11 20 17-12-5 23Z" fill="#ddbf7d"/><path d="M22 31h37" stroke="#fff0be"/><path d="m40 15 5 7-5 6-5-6Z" fill="${c}"/>`,
    none:'<path d="M15 29q2-15 16-13 10-18 24 0 17 0 12 15-22 10-52-2Z" fill="#e8dbc6" stroke-dasharray="2 3"/>',
    scarf:`<path d="m32 20-6 24 11-4 6 4 4-24" fill="${c}"/><path d="M17 9q23 13 46 0v12q-24 14-46 0Z" fill="${light}"/><path d="m31 31 11 1m-13 5 12 1m-17-21q15 6 31 0" stroke="${c}" stroke-width="2"/>`,
    bell:`<path d="M17 8q23 17 46 0" fill="none" stroke="${c}" stroke-width="5"/><circle cx="40" cy="28" r="13" fill="#d7b775"/><path d="M29 31h22m-11 0v7"/><path d="m34 21 4-2" stroke="#fff3c5" stroke-width="3"/>`,
    ribbon:`<path d="m38 20-19-12q-8 12-1 24l19-7-9 19 12-7 9 7-5-19 18 7q8-14 0-24L43 20" fill="${c}"/><circle cx="40" cy="22" r="6" fill="${light}"/>`,
    cape:`<path d="M28 7 13 37l10 4 9-3 8 5 9-5 8 3 10-4L52 7q-12 11-24 0Z" fill="${mix(c,'#40334e',.4)}"/><path d="M20 34q20 12 40 0" fill="none" stroke="#d8bd82" stroke-dasharray="2 3"/><circle cx="40" cy="13" r="3" fill="#dbbd81"/>`,
    clear:'<path d="m29 36 12-24 8 25M21 35q19 10 38 0" fill="none" stroke="#b2a488" stroke-dasharray="2 4"/>',
    wings:`<path d="M39 32C28 5 7 3 12 20q3 10 18 11-21-2-10 10 8 6 19-4Zm2 0C52 5 73 3 68 20q-3 10-18 11 21-2 10 10-8 6-19-4Z" fill="${light}"/><path d="m36 31-16-15m24 15 16-15" stroke="${c}" fill="none"/>`,
    satchel:'<path d="M21 18q19-7 38 0l-2 25H23Z" fill="#b9946e"/><path d="M25 15q15-27 30 0" stroke="#947459" fill="none" stroke-width="3"/><path d="M21 18q19 19 38 0" fill="#d7b78d"/><path d="M40 26v8" stroke="#f2d8a4" stroke-width="3"/><path d="M27 39h26" stroke-dasharray="2 3"/>'
   };
   return `<svg class="accessory-art" viewBox="0 0 80 50" aria-hidden="true"><g stroke="#836a68" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${art[id]||art.clear}</g></svg>`;
 }
 function food(id){const art={berry:'<path d="m20 11-9-6 8 1 3-5 2 6 7-1-6 7" fill="#8b9c75"/><path d="M20 12q-15-10-14 5 1 13 14 20 13-7 14-20 1-15-14-5Z" fill="#b87a93"/><path d="m13 18 1 2m12-3 1 2m-9 7 1 2" stroke="#ffe3ae" stroke-width="2"/>',biscuit:'<path d="M5 23q-5-9 3-14 5-6 12-3 8-3 12 3 9 5 3 14-15 17-30 0Z" fill="#d9b47a"/><path d="M8 23q12 9 24-1" stroke="#f8ddac" fill="none"/><g fill="#927054" stroke="none"><circle cx="13" cy="14" r="2"/><circle cx="26" cy="17" r="2"/><circle cx="19" cy="26" r="1.5"/></g>',tea:'<path d="M29 13q14-2 8 10-3 4-8 0" fill="none" stroke="#b49caa" stroke-width="3"/><path d="M5 12h25v14q-2 11-12 11T5 26Z" fill="#dfcbd5"/><ellipse cx="18" cy="12" rx="12.5" ry="3" fill="#9a7d68"/><path d="M14 22q4-5 8 0-4 7-8 0Z" fill="#b78a9c" stroke="none"/><path d="M12 7q-3-3 0-6m10 6q-3-3 0-6" fill="none" stroke="#bfae99"/>'};return `<svg class="food-art" viewBox="0 0 40 40" aria-hidden="true"><g stroke="#8f7272" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">${art[id]||art.berry}</g></svg>`;}
 return {icon,pet,scenery,object,star,accessory,food};
})();
