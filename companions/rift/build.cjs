const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const header=`// ==UserScript==
// @name         RIFT — Cozy Companion
// @namespace    urn:rift:cozy-companion
// @version      1.2.0
// @description  An illustrated storybook familiar, live wardrobe try-ons, cozy sanctuary, garden, expeditions, and playable rifts. All artwork included.
// @author       RIFT
// @match        https://*/*
// @match        http://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==
`;
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const body=['model.js','art.js','runtime.js','arena.js','app.js'].map(p=>fs.readFileSync(path.join(root,'src',p),'utf8')).join('\n');
const atlas=fs.readFileSync(path.join(root,'assets/familiars.webp')).toString('base64');
const scenery=fs.readFileSync(path.join(root,'assets/conservatory.webp')).toString('base64');
const assets=`const RIFT_ATLAS='data:image/webp;base64,${atlas}';\nconst RIFT_SCENERY='data:image/webp;base64,${scenery}';`;
const bundle=header+`\n(() => {\n'use strict';\nconst RIFT_CSS=${JSON.stringify(css)};\n${assets}\n${body}\n})();\n`;
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/RIFT-Cozy-Companion.user.js'),bundle);
const demo=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RIFT — A little world, beside yours.</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1ece6;color:#504957;font:16px/1.8 'Trebuchet MS',sans-serif}header{padding:25px 8%;border-bottom:1px solid #cec2c8;display:flex;align-items:center;justify-content:space-between}header strong{font:25px Georgia;letter-spacing:5px}header span{font-size:11px;letter-spacing:2px;color:#918092}main{max-width:1040px;margin:60px auto;padding:0 28px}.eyebrow{font-size:11px;letter-spacing:3px;color:#9b7e98;text-transform:uppercase}h1{font:68px/1.07 Georgia;max-width:650px;margin:18px 0 30px;letter-spacing:-2px}h2{font:32px Georgia;margin:10px 0 24px}p{max-width:700px}.lead{font-size:18px;color:#817181;max-width:600px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin:50px 0}.card{background:#e7dedf;border:1px solid #cdbfc9;border-radius:20px;padding:32px}.card small{font-size:10px;letter-spacing:2px;color:#9b8098}button.demo-open{background:#5d446b;color:#f5e7fb;border:0;border-radius:30px;padding:15px 24px;font:14px 'Trebuchet MS';cursor:pointer;margin-top:10px}a{color:#886294}footer{padding:60px 0;color:#9d899a;font-size:12px}code{font-size:12px;background:#fff6;padding:3px 5px;border-radius:5px}hr{border:0;height:1px;background:#d3c5ce;margin:60px 0}@media(max-width:600px){h1{font-size:45px}.grid{grid-template-columns:1fr}header span{display:none}main{margin-top:35px}}
</style></head><body><header><strong>RIFT</strong><span>THE STORYBOOK EDITION · 1.2.0</span></header><main><div class="eyebrow">An interactive, offline preview</div><h1>A little world,<br>beside yours.</h1><p class="lead">An expressive little companion. A home made of small comforts. The occasional very important adventure.</p><button class="demo-open" onclick="window.RIFT_PREVIEW?.open()">Open your sanctuary →</button><div class="grid"><article class="card"><small>01 / MEET SOMEONE SMALL</small><h2>Cloud-soft company.</h2><p>A head scratch. A favorite snack. A ridiculous little dance. It’s the little things that make them yours.</p></article><article class="card"><small>02 / MAKE IT YOURS</small><h2>Details with personality.</h2><p>Eight pigment palettes, separate coat and eye colors, accessory try-ons, undo, and named outfits. Three illustrated forms, one very familiar friend.</p></article></div><article><div class="eyebrow">Take a little walk</div><h2>Yes, this is an ordinary webpage.</h2><p>Minimize RIFT using its close button. Your companion can roam the edges of this page, and follow you as you scroll. Drag them to a new spot, click for a nose boop, or double-click to return to the sanctuary.</p><p>On other websites, use <strong>Settings → Companion on this site</strong> to invite them onto the page. The small RIFT button opens your sanctuary wherever userscripts are allowed.</p></article><hr><div class="grid"><article class="card"><small>03 / STAY AWHILE</small><h2>A home that grows.</h2><p>Plant a moonberry. Arrange the furniture. Save for a mushroom house. Your garden never withers while you’re away.</p></article><article class="card"><small>04 / FOLLOW THE GLOW</small><h2>Tiny. Still brave.</h2><p>Send a pocket expedition, or step into a rift to bring a wandering wisp home. All adventures should end somewhere soft.</p></article></div><h2>Ready to take them with you?</h2><p>Install <code>RIFT-Cozy-Companion.user.js</code> in Tampermonkey. This preview and the installed script have separate saves; use <strong>Settings → Export save</strong> here, then import the file into the installed script to carry your companion over.</p><p>No external assets, accounts, or network requests. The complete experience is inside this file.</p><footer>RIFT · Illustrated familiars and original code · Made for gentle adventures.<br>See README.md in the download for installation, controls, and tested limitations.</footer></main><script>${bundle.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
fs.writeFileSync(path.join(root,'dist/RIFT-Preview.html'),demo);
console.log(JSON.stringify({userscriptBytes:Buffer.byteLength(bundle),previewBytes:Buffer.byteLength(demo)}));
