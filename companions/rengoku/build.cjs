'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
const name = 'Rengoku-Bottom-Patrol';
const release = '2.0.0';
const raw = 'https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/rengoku/' + name;
const header = `// ==UserScript==
// @name         Rengoku — Bottom Patrol
// @namespace    aseerr-rengoku-patrol
// @version      ${release}
// @description  A miniature Flame Hashira patrol with eight demon encounters and an illustrated field manual.
// @author       Aseerr / slllky; artwork credits in companions/rengoku/assets/README.md
// @match        http://*/*
// @match        https://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @updateURL    ${raw}.meta.js
// @downloadURL  ${raw}.user.js
// ==/UserScript==`;
const {species} = require('./src/engine.js');
const bundles = Object.fromEntries(['rengoku', ...Object.keys(species)].map(id => {
  const meta = JSON.parse(read('assets/'+id+'/frames.json'));
  for (const action of (id === 'rengoku' ? ['idle','walk','run','jump','guard','slash','rising','dash','victory'] : ['idle','run','attack','hurt','death'])) {
    if (!meta.animations[action]?.length) throw Error('Missing '+id+'/'+action);
  }
  const png = fs.readFileSync(path.join(dir,'assets',id,'sheet.png'));
  if(png.readUInt32BE(16)!==meta.cell*meta.columns || png.readUInt32BE(20)!==meta.cell*Math.ceil(meta.count/meta.columns)) throw Error('Bad grid for '+id);
  return [id,{meta,data:png.toString('base64')}];
}));
const modules = ['engine','draw','panel','app'].map(id=>read('src/'+id+'.js')).join('\n');
const app = modules.replace('/*PATROL_ART*/null',()=>JSON.stringify(bundles)).replace('/*PATROL_CSS*/""',()=>JSON.stringify(read('src/styles.css')));
const render = preview => '(function(module){\n"use strict";\nconst PATROL_PREVIEW = '+preview+';\n'+app+'\n})();\n';
fs.writeFileSync(path.join(dir,name+'.meta.js'),header+'\n');
fs.writeFileSync(path.join(dir,name+'.user.js'),header+'\n\n'+render(false));
fs.writeFileSync(path.join(dir,'Patrol-Preview.html'),read('src/preview.html').replace('<!--PATROL-->',()=>'<script>\n'+render(true).replace(/<\/script/gi,'<\\/script')+'\n</script>'));
