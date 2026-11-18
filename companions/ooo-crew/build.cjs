'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const metadata=`// ==UserScript==
// @name         Adventure Time — Ooo Crew
// @namespace    aseerr-adventure-time-ooo-crew
// @version      1.1.0
// @description  Seventeen Adventure Time companions, sprite animations, group adventures, draggable friends, snacks, and a customizable Ooo field guide.
// @author       Aseerr / slllky (compilation); sprite credits in companions/ooo-crew/assets/README.md
// @match        https://*/*
// @match        http://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
// ==/UserScript==

// Unofficial fan companion. Adventure Time characters and third-party sprite art
// belong to their respective owners. No blanket license is asserted over the art.
// Built from src/ and assets/ with: node build.cjs
// Based on the existing Jake Stretch Walker; the original script is unchanged.
`;
const substitutions={
  __STYLES__:JSON.stringify(read('src/styles.css')),
  __ATLAS__:JSON.stringify(fs.readFileSync(path.join(root,'assets/crew.png')).toString('base64')),
  __JAKE__:JSON.stringify(fs.readFileSync(path.join(root,'assets/jake.png')).toString('base64')),
  __FRAMES__:JSON.stringify(JSON.parse(read('assets/frames.json')))
};
function build(preview){
  let app=read('src/app.js');
  for(const[token,value]of Object.entries({...substitutions,__PREVIEW__:String(preview)}))app=app.replaceAll(token,()=>value);
  if(/__[A-Z]+__/.test(app))throw new Error('Unresolved build token');
  // Keep module names isolated from both the page and other userscripts.
  return metadata+'\n(() => {\n'+read('src/core.js')+'\n'+read('src/render.js')+'\n'+app+'\n})();\n';
}
const script=build(false);
fs.writeFileSync(path.join(root,'Adventure-Time-Ooo-Crew.user.js'),script);
const preview=read('src/preview.html').replace('<!-- CREW_SCRIPT -->','<script>\n'+build(true).replaceAll('</script','<\\/script')+'\n</script>');
fs.writeFileSync(path.join(root,'Ooo-Crew-Preview.html'),preview);
console.log(`Built userscript (${Buffer.byteLength(script).toLocaleString()} bytes) and self-contained preview.`);
