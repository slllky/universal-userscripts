const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),sharp=require('sharp');
const path=require('node:path'),root=path.join(__dirname,'..');
let setup;
async function art(){
 if(!setup)setup=(async()=>{
   // librsvg in this runner cannot decode WebP inside SVG. Re-encode the exact
   // shipped pixels as PNG for the renderer; artwork and SVG are unchanged.
   const png=await sharp(path.join(root,'assets/familiars.webp')).png().toBuffer();
   const ctx={RIFT_ATLAS:'data:image/png;base64,'+png.toString('base64')};vm.createContext(ctx);
   vm.runInContext(fs.readFileSync(path.join(root,'src/model.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/art.js'),'utf8')+'\nthis.M=RiftModel;this.A=RiftArt;',ctx);
   return ctx;
 })();return setup;
}
async function raster(species,look={},closed=false){const{M,A}=await art(),s=M.fresh();s.species=species;s.look={...s.look,head:'bare',neck:'none',back:'clear',marking:'plain',...look};let svg=A.pet(s,'test').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" ');if(closed)svg=svg.replace('data-part="eyes"','data-part="eyes" style="opacity:0"').replace('style="opacity:0">\u003csvg','style="opacity:1">\u003csvg');return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
test('all painted forms render visible artwork and clean atlas margins',async()=>{
 for(const species of ['fox','bunny','axolotl']){const{data,info}=await raster(species);let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>128)painted++;assert.ok(painted>35000,species);assert.equal(info.width,480);}
 const bunny=await raster('bunny');let right=0;for(let y=30;y<390;y++)for(let x=464;x<480;x++)right+=bunny.data[(y*480+x)*4+3]>30?1:0;assert.ok(right<30,'neighboring gills must not appear beside the rabbit');
});
test('coat, accent, and iris controls each recolor the actual illustrated pixels',async()=>{
 const base=await raster('fox');for(const channel of ['coat','accent','eyes']){const next=await raster('fox',{[channel]:'#ed754b'});let changed=0,alphaChanged=0;for(let i=0;i<base.data.length;i+=4){if(base.data[i+3]>128&&Math.abs(base.data[i]-next.data[i])+Math.abs(base.data[i+1]-next.data[i+1])+Math.abs(base.data[i+2]-next.data[i+2])>15)changed++;if(base.data[i+3]!==next.data[i+3])alphaChanged++;}assert.ok(changed>150,channel);assert.equal(alphaChanged,0,'pigments must preserve the silhouette');}
});
test('sleepy expressions use the second illustrated frame and retain the body',async()=>{for(const species of ['fox','bunny','axolotl']){const awake=await raster(species),asleep=await raster(species,{},true);let changed=0,visible=0;for(let i=0;i<awake.data.length;i+=4){if(asleep.data[i+3]>128)visible++;if(Math.abs(awake.data[i]-asleep.data[i])>20)changed++;}assert.ok(changed>500,species);assert.ok(visible>35000,species);}});
test('accessories render with the painted character across all forms',async()=>{const{M}=await art();for(const species of ['fox','bunny','axolotl']){const{data}=await raster(species,{...M.PALETTES[4],head:'mushroom',neck:'ribbon',back:'wings'});let n=0;for(let i=3;i<data.length;i+=4)n+=data[i]>128?1:0;assert.ok(n>35000,species);}});
