'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const read = file => fs.readFileSync(path.join(dir,file),'utf8');
const save = (file,text) => fs.writeFileSync(path.join(dir,file),text);
const name = 'Beat-Browser-Skater';
const raw = 'https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/beat/' + name;
const header = `// ==UserScript==
// @name         Beat — Browser Skater
// @namespace    aseerr-beat-browser-skater
// @version      ${require('./package.json').version}
// @description  Fifteen skaters, crew relays, page exploration and local rivals with fifteen original synth radio tracks.
// @author       Aseerr customization; classic sprite sheet by xugggys; character by SEGA
// @match        http://*/*
// @match        https://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_registerMenuCommand
// @updateURL    ${raw}.meta.js
// @downloadURL  ${raw}.user.js
// ==/UserScript==`;
const bundles = Object.fromEntries(['remix','classic','street','gum','combo','yoyo','corn','zero','poison','cube','garam','boogie','rhyth','jazz','clutch','rapid99','noise','parks'].map(id => {
  const base = 'assets/' + id + '/';
  const frames = JSON.parse(read(base + 'frames.json'));
  const png = fs.readFileSync(path.join(dir,base + 'sheet.png'));
  if (png.readUInt32BE(0) !== 0x89504e47) throw Error('Expected PNG for ' + id);
  const entry = {frames,data:png.toString('base64')};
  if (id !== 'classic' && id !== 'street' && id !== 'parks') entry.portrait = fs.readFileSync(path.join(dir,base+'portrait.png')).toString('base64');
  return [id,entry];
}));
const parts = ['park','engine','pages','audio','draw','tour','geometry','rival','panel','app'].map(id => read('src/' + id + '.js'));
const app = parts.join('\n')
  .replace('/*BEAT_ART*/null',() => JSON.stringify(bundles))
  .replace('/*BEAT_CSS*/""',() => JSON.stringify(read('src/styles.css')));
const render = preview => '(function(module){\n"use strict";\nconst BEAT_PREVIEW = ' + preview + ';\n' + app + '\n})();\n';
save(name + '.meta.js',header + '\n');
save(name + '.user.js',header + '\n\n' + render(false));
save('Beat-Preview.html',read('src/preview.html').replace('<!--BEAT-->',() =>
  '<script>\n' + render(true).replace(/<\/script/gi,'<\\/script') + '\n</script>'));
