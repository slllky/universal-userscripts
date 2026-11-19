'use strict';
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {Renderer}=require('../src/draw.js');
const path=require('node:path'),fs=require('node:fs');
const output=process.argv[2]||'.';
(async()=>{
 const ids=['remix','gum','combo','zero','boogie','noise'];
 const names=['Beat','Gum','Combo','Zero Beat','Boogie','Noise Tank'];
 const sets=Object.fromEntries(await Promise.all(ids.map(async id=>{
  const base=path.join(__dirname,'../assets',id);
  return [id,{frames:require(base+'/frames.json'),image:await loadImage(base+'/sheet.png'), motion:{...require(base+'/motion.json'),image:await loadImage(base+'/motion.png')}}];
 })));
 const cv=createCanvas(960,540),g=cv.getContext('2d');
 const combos=[['skate','boost','grind'],['jump','grab','spin'],['wallride','rocket','tag']];
 const buildOld=Object.fromEntries(Object.entries(sets).map(([k,{frames,image}])=>[k,{frames,image}]));
 for(let i=0;i<360;i++){
  const scene=Math.floor(i/120),t=(i%120)/60; 
  g.fillStyle='#142532';g.fillRect(0,0,960,540);
  g.fillStyle='#203646';g.fillRect(12,102,461,391);g.fillStyle='#243944';g.fillRect(487,102,461,391);
  g.font='bold 29px sans-serif';g.fillStyle='#f2ffde';g.fillText('BEAT  /  SPRITE MOTION COMPARISON',23,46);
  g.font='bold 18px sans-serif';g.fillStyle='#ffcfe5';g.fillText('4.0   ORIGINAL POSES',30,84);
  g.fillStyle='#dcff84';g.fillText('4.1   IN-BETWEEN POSES',510,84);
  let j=0;
  for(const action of combos[scene]){
   const idx=(scene*2+j)%ids.length,id=ids[idx],rider=id==='remix'?'beat':id;
   const by=229+j*126, xx=293;
   g.strokeStyle='#6a7f83';g.lineWidth=1;for(const x of [28,510]){g.beginPath();g.moveTo(x,by-1);g.lineTo(x+424,by-1);g.stroke();}
   g.font='bold 15px sans-serif';g.fillStyle='#d6e9eb';
   for(const x of [32,514]){g.fillText(names[idx].toUpperCase(),x,by-69);g.fillStyle='#9dbac5';g.font='14px sans-serif';g.fillText(action.toUpperCase(),x,by-47);g.font='bold 15px sans-serif';g.fillStyle='#d6e9eb';}
   const old=new Renderer(g,buildOld),smooth=new Renderer(g,sets),world={scale:1,settings:{skin:'remix'},gentle:false,ground:by,width:960,height:540};
   const seconds=.92;
   const hero={rider,direction:1,action,elapsed:t,progress:(t%seconds)/seconds,alpha:1,y:by,x:xx};
   // Show the same position, elapsed time and trick progress on both sides.
   old.drawRider(hero,world,'#ff559d','off');smooth.drawRider({...hero,x:xx+480},world,'#dcff84','off');
   j++;
  }
  g.font='15px sans-serif';g.fillStyle='#bccdd2';g.fillText('Same action timing and original poses. New intermediate cels are added only on the right.',24,519);
  fs.writeFileSync(path.join(output,'compare-'+String(i).padStart(4,'0')+'.png'),cv.toBuffer('image/png'));
 }
})();
