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
 function pet(s,id='pet',mini=false){
   const l=s.look,kind=s.species||'fox',outline='#5b4b67';
   const fox=kind==='fox',bun=kind==='bunny',ax=kind==='axolotl';
   return `<svg class="pet-art" viewBox="0 0 240 240" data-rig="${id}" role="img" aria-label="${RiftModel.SPECIES[kind].name} companion" style="--coat:${l.coat};--accent:${l.accent};--eye:${l.eyes}">
   <defs>
    <linearGradient id="fur-${id}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="var(--coat)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient>
    <radialGradient id="face-${id}" cx=".4" cy=".25" r=".8"><stop stop-color="#fffdf7" stop-opacity=".75"/><stop offset="1" stop-color="var(--coat)"/></radialGradient>
    <linearGradient id="wing-${id}" x2="1" y2="1"><stop stop-color="#f9ebff" stop-opacity=".9"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".45"/></linearGradient>
   </defs>
   <ellipse data-part="shadow" cx="120" cy="210" rx="64" ry="10" fill="#30213f" opacity=".15"/>
   <g data-part="whole" stroke="${outline}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <g data-part="tail">${fox?`<path d="M154 177C204 187 232 145 217 99c-9 28-46 18-54 39Z" fill="url(#fur-${id})"/><path d="M188 123q21-5 29-24 8 29-5 49l-9-12-12 4Z" fill="#fff4e5" stroke="none"/>`:bun?`<path d="M166 175q28-27 36-7 16 5 3 18 1 22-24 18l-19-13" fill="var(--coat)"/>`:`<path d="M155 184q58 12 60-41-22 24-37 7l-22 10" fill="var(--accent)"/><path d="M170 173q29 0 37-17" fill="none" stroke="#fff" opacity=".5"/>`}</g>
    ${l.back==='wings'?`<g data-part="wings" fill="url(#wing-${id})"><path d="M85 143C30 72 4 132 68 158 24 165 68 204 90 165Z"/><path d="M155 143c55-71 81-11 17 15 44 7 0 46-22 7Z"/><path d="m84 147-44-30m116 30 44-30" stroke="#fff" opacity=".65"/></g>`:''}
    ${l.neck==='cape'?'<path d="M85 133 61 190q58 35 117 0l-23-57" fill="#67608f"/><path d="M76 181q44 24 88 0" fill="none" stroke="#d8bd85"/>':''}
    <g data-part="body"><ellipse cx="120" cy="165" rx="49" ry="43" fill="var(--coat)"/><ellipse cx="120" cy="169" rx="30" ry="30" fill="#fff9ed" stroke="none" opacity=".64"/>
    <g data-part="pawL"><ellipse cx="83" cy="164" rx="12" ry="22" transform="rotate(13 83 164)" fill="var(--coat)"/><path d="m79 178 1 4m5-5v5" stroke-opacity=".25"/></g>
    <g data-part="pawR"><ellipse cx="157" cy="164" rx="12" ry="22" transform="rotate(-13 157 164)" fill="var(--coat)"/><path d="m153 178 1 4m5-5v5" stroke-opacity=".25"/></g></g>
    <g data-part="footL"><ellipse cx="94" cy="200" rx="21" ry="11" fill="${l.marking==='socks'?'#fff9ed':'var(--coat)'}"/><path d="m88 202v4m7-4v4" stroke-opacity=".3"/></g>
    <g data-part="footR"><ellipse cx="149" cy="200" rx="21" ry="11" fill="${l.marking==='socks'?'#fff9ed':'var(--coat)'}"/><path d="m143 202v4m7-4v4" stroke-opacity=".3"/></g>
    ${l.back==='satchel'?'<path d="m164 149-54 42" stroke="#a58e73" stroke-width="6"/><rect x="143" y="166" width="29" height="29" rx="8" fill="#c2ab87"/><path d="M144 174h27m-15 0v8" fill="none"/>':''}
    ${l.neck==='scarf'?'<path d="m97 141-8 38 16-4 7-33" fill="var(--accent)"/><path d="M78 130q42 18 84 0l-3 15q-38 19-78-1Z" fill="var(--accent)"/><path d="m96 156 12 2m-15 5 13 3M89 138q34 10 62-1" stroke="#fff" opacity=".3"/>':''}
    ${l.neck==='ribbon'?'<path d="m120 143-23-12-6 17 24 1m5-6 23-12 6 17-24 1" fill="var(--accent)"/><circle cx="120" cy="145" r="6" fill="#e7c6a0"/>':''}
    ${l.neck==='bell'?'<path d="M80 133q40 24 80 0" fill="none" stroke="var(--accent)" stroke-width="7"/><circle cx="120" cy="151" r="11" fill="#e8c680"/><path d="M112 154h16m-8 0v5" fill="none"/><circle cx="117" cy="147" r="2" fill="#fff7dd" stroke="none"/>':''}
    <g data-part="head">
     <g data-part="earL">${fox?'<path d="M64 100C42 75 40 27 51 18c25 10 46 37 44 66Z" fill="var(--coat)"/><path d="M61 78Q49 49 54 32q25 19 28 46" fill="var(--accent)" stroke="none"/>':bun?'<path d="M70 91C22 108 29 23 48 15c22-8 36 33 34 66Z" fill="var(--coat)"/><path d="M64 79C39 77 40 31 49 29c11-2 19 30 15 50" fill="var(--accent)" stroke="none"/>':'<path d="m64 90-29-32-10 6 25 32-35-3-3 11 39 11-28 13 6 11 35-22" fill="var(--accent)"/><path d="m38 78 17 19m-28 7 28 5m-21 22 22-15" stroke="#ffe9ed" opacity=".6"/>'}</g>
     <g data-part="earR">${fox?'<path d="M176 100c22-25 24-73 13-82-25 10-46 37-44 66Z" fill="var(--coat)"/><path d="M179 78q12-29 7-46-25 19-28 46" fill="var(--accent)" stroke="none"/>':bun?'<path d="M160 89c3-37 13-65 33-59 29 10 23 92 4 97-15 4-23-19-17-43l-12 10" fill="var(--coat)"/><path d="M191 51q17 27 5 59-10-5-3-35l-9-8" fill="var(--accent)" stroke="none"/>':'<path d="m176 90 29-32 10 6-25 32 35-3 3 11-39 11 28 13-6 11-35-22" fill="var(--accent)"/><path d="m202 78-17 19m28 7-28 5m21 22-22-15" stroke="#ffe9ed" opacity=".6"/>'}</g>
     <path d="M64 79Q77 53 120 56q43-3 56 23l12 28-7 2 9 11-11 1q-8 31-59 30-51 1-59-30l-11-1 9-11-7-2Z" fill="url(#fur-${id})"/>
     <path d="M65 105q23-12 55 6 32-18 55-6-1 36-55 37-54-1-55-37" fill="url(#face-${id})" stroke="none"/>
     <path d="m100 60 9-9 1 12 14-11-1 13 13-5" fill="var(--coat)" stroke-opacity=".6"/>
     <ellipse cx="77" cy="119" rx="12" ry="6" fill="#eea6b6" opacity=".48" stroke="none"/><ellipse cx="163" cy="119" rx="12" ry="6" fill="#eea6b6" opacity=".48" stroke="none"/>
     <g data-part="eyes"><g data-part="pupils"><ellipse cx="91" cy="104" rx="10" ry="13" fill="var(--eye)"/><ellipse cx="149" cy="104" rx="10" ry="13" fill="var(--eye)"/><ellipse cx="92" cy="108" rx="6" ry="8" fill="#27323d" stroke="none"/><ellipse cx="148" cy="108" rx="6" ry="8" fill="#27323d" stroke="none"/><ellipse cx="88" cy="99" rx="3.5" ry="4.5" fill="white" stroke="none"/><ellipse cx="146" cy="99" rx="3.5" ry="4.5" fill="white" stroke="none"/><circle cx="95" cy="110" r="1.8" fill="#fff" stroke="none"/><circle cx="153" cy="110" r="1.8" fill="#fff" stroke="none"/></g></g>
     <g data-part="closed" style="opacity:0" fill="none"><path d="M81 108q10-10 20 0m38 0q10-10 20 0" stroke-width="2.5"/></g>
     <path d="M115 117q5-4 10 0l-5 4Z" fill="#786178" stroke="none"/><path d="M120 121v3m-8 0q4 7 8 0 4 7 8 0" fill="none" stroke-width="1.6"/>
     ${l.marking==='freckles'?'<g fill="var(--accent)" stroke="none"><circle cx="73" cy="115" r="1.8"/><circle cx="80" cy="112" r="1.5"/><circle cx="82" cy="118" r="1.5"/><circle cx="167" cy="115" r="1.8"/><circle cx="160" cy="112" r="1.5"/><circle cx="158" cy="118" r="1.5"/></g>':''}
     ${l.marking==='star'?star(120,82,9,'var(--accent)'):''}
     ${l.head==='star'?`<g transform="rotate(14 170 78)">${star(170,78,12,'#ecd49b')}<circle cx="170" cy="78" r="2.5" fill="#fff4d5" stroke="none"/></g>`:''}
     ${l.head==='bow'?'<path d="m164 72-24-15-3 19 25 5m2-9 22-15 6 19-25 5" fill="var(--accent)"/><circle cx="164" cy="76" r="6" fill="#fff0ce"/>':''}
     ${l.head==='mushroom'?'<path d="M84 60q0-41 39-39t43 39Z" fill="#c9879f"/><ellipse cx="125" cy="60" rx="42" ry="9" fill="#f6dcd7"/><g fill="#fff4dc" stroke="none"><circle cx="107" cy="39" r="7"/><circle cx="142" cy="36" r="6"/><circle cx="128" cy="50" r="5"/></g>':''}
     ${l.head==='crown'?'<path d="m95 59-6-23 18 11 13-22 13 22 18-11-6 23Z" fill="#e8cc8e"/><path d="M97 53h46" stroke="#fff1bd"/><circle cx="120" cy="45" r="4" fill="var(--accent)"/>':''}
    </g>
    <g data-part="snackBerry" opacity="0"><path d="M111 158q9-15 18 0" fill="#92ae90"/><path d="M120 161q-21-14-18 9 2 17 18 20 16-3 18-20 3-23-18-9" fill="#c78cae"/><g fill="#ffe3bb" stroke="none"><circle cx="112" cy="169" r="1.5"/><circle cx="127" cy="168" r="1.5"/><circle cx="119" cy="181" r="1.5"/></g></g>
    <g data-part="snackBiscuit" opacity="0"><path d="M103 174q-10-14 2-20 4-9 15-3 11-6 15 3 12 6 2 20Z" fill="#e7c99c"/><path d="M103 174q17 18 34 0" fill="#d4ad83"/><circle cx="112" cy="162" r="2" fill="#a8816f" stroke="none"/><circle cx="128" cy="165" r="2" fill="#a8816f" stroke="none"/></g>
    <g data-part="snackTea" opacity="0"><path d="M135 158q20-1 12 13-5 7-12 0" fill="none" stroke="#d1b9df" stroke-width="4"/><path d="M102 156h34v14q-1 17-17 17t-17-17Z" fill="#e8d7ec"/><ellipse cx="119" cy="156" rx="17" ry="5" fill="#b3968c"/><path d="m116 161 4 5 4-5" stroke="#a887b3" fill="none"/></g>
   </g><g data-part="zzz" opacity="0" fill="#b1a1db" stroke="none" font-family="Georgia" font-weight="bold"><text x="167" y="51" font-size="20">z</text><text x="190" y="30" font-size="14">z</text></g></svg>`;
 }
 function scenery(theme='dusk'){
 const colors={dusk:['#282e4a','#9d8dab','#b8b0bc','#788f8d'],meadow:['#709f9a','#e8ccad','#c9c4a7','#759d8a'],midnight:['#111f37','#535c86','#8b87ad','#557b83']}[theme];
 let stars='';for(let n=0;n<38;n++){const x=(n*127+39)%800,y=(n*43+26)%260;stars+=star(x,y,n%3===0?4:2,'#fff0cb');}
 return `<svg class="scenery" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sky-${theme}" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><radialGradient id="glow-${theme}"><stop stop-color="#ffefbd" stop-opacity=".4"/><stop offset="1" stop-color="#ffefbd" stop-opacity="0"/></radialGradient><linearGradient id="floor-${theme}" x2="0" y2="1"><stop stop-color="#aba4b6"/><stop offset="1" stop-color="#78788e"/></linearGradient></defs>
 <rect width="800" height="480" fill="url(#sky-${theme})"/><g opacity=".8">${stars}</g><circle cx="586" cy="110" r="100" fill="url(#glow-${theme})"/><circle cx="586" cy="110" r="31" fill="#f3dfb4"/><circle cx="598" cy="101" r="29" fill="${colors[0]}" opacity=".92"/>
 <path d="M0 280Q120 192 242 273t266-25 292 0v232H0Z" fill="${colors[2]}" opacity=".4"/><path d="M0 315Q148 241 275 302t293-31 232 20v189H0Z" fill="${colors[3]}" opacity=".72"/>
 <path d="M105 344V133C105-13 695-13 695 133v211" fill="none" stroke="#e8ddd5" stroke-opacity=".4" stroke-width="9"/><path d="M112 344V134C112-1 688-1 688 134v210M400 28v310M112 180h576" fill="none" stroke="#eee0d3" stroke-opacity=".21" stroke-width="3"/>
 <path d="M0 355Q400 308 800 355v125H0Z" fill="url(#floor-${theme})"/><path d="M0 390q400-32 800 0m-800 48q400-25 800 0M220 345l-70 135m430-135 70 135M400 339v141" fill="none" stroke="#dfcfcb" opacity=".13" stroke-width="2"/>
 <ellipse cx="410" cy="403" rx="205" ry="50" fill="#635878" opacity=".25"/><ellipse cx="400" cy="390" rx="187" ry="46" fill="#c8b3c8"/><ellipse cx="400" cy="390" rx="175" ry="37" fill="none" stroke="#e3ccdb" stroke-width="2"/><path d="M265 392q130-42 270 0" fill="none" stroke="#af97b8" opacity=".4"/>
 <g fill="#587e79" stroke="#89a398" stroke-width="2"><path d="M66 368q-48-57-20-114 42 38 20 114Zm0 0q-5-65 44-87 6 49-44 87Zm-1-15q-74-11-64-54 49-3 64 54ZM736 368q48-57 20-114-42 38-20 114Zm0 0q5-65-44-87-6 49 44 87Zm1-15q74-11 64-54-49-3-64 54Z"/></g>
 <path d="M0 40q200 95 400 0 200 95 400 0" stroke="#c9af96" stroke-width="2" fill="none"/>${[44,122,201,281,360,440,519,599,678,756].map((x,i)=>`<path d="M${x} ${i%5<3?70:59}v20" stroke="#c9af96"/><circle cx="${x}" cy="${i%5<3?90:79}" r="16" fill="url(#glow-${theme})"/><circle cx="${x}" cy="${i%5<3?90:79}" r="4" fill="#ffe1a3"/>`).join('')}
 </svg>`;
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
 return {icon,pet,scenery,object,star};
})();
