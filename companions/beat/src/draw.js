// Draw in viewport CSS pixels. The host owns the backing resolution and DPR transform.
const BeatDraw = (() => {
  'use strict';
  const ink = '#162024', paper = '#fff9d6', pale = '#d8f9dc';
  const inks = {lime:'#c0fb33',pink:'#ff549d',cyan:'#48dbde'};
  const stickers = {bolt:0,cat:1,skull:2,can:3};
  const timing = {idle:290,skate:135,boost:105,jump:125,grab:155,grind:140,tag:165,dance:145,land:125};
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const bounded = v => clamp(v,0,1);
  const cycle = t => t-Math.floor(t);
  const fullCircle = 2*Math.PI;
  function frameFor(actor, meta, gentle) {
    const key = meta.animations[actor.action]?.length ? actor.action : 'idle';
    const seq = meta.animations[key];
    if (!seq?.length) return 0;
    if (gentle) return seq[key==='idle'||key==='skate' ? 0 : Math.floor(seq.length/2)];
    const loops = key==='skate'||key==='idle'||key==='dance'||key==='grind'||key==='boost';
    const durations = meta.durations?.[key];
    const weighted = Array.isArray(durations) && durations.length===seq.length;
    const total = weighted ? durations.reduce((sum,n)=>sum+n,0) : seq.length*timing[key];
    const at = loops ? (Math.max(0,actor.elapsed)*1000)%total : bounded(actor.progress)*total;
    if (!weighted) return seq[Math.min(seq.length-1,Math.floor(at/timing[key]))];
    let end=0;
    for(let i=0;i<seq.length;i++) { end+=durations[i]; if(at<end)return seq[i]; }
    return seq[seq.length-1];
  }
  function geometry(actor,asset,scale,gentle) {
    const meta=asset.frames, n=frameFor(actor,meta,gentle), pivot=meta.pivot||[64,116];
    const cell=meta.cell, b=meta.bounds?.[n] || [0,0,cell,cell];
    const flip=actor.direction!==(meta.facing ?? 1);
    const x=Math.round(actor.x),y=Math.round(actor.y);
    return {n,flip,x,y,rect:{x:x+(flip ? pivot[0]-b[2] : b[0]-pivot[0])*scale,
      y:y+(b[1]-pivot[1])*scale,width:(b[2]-b[0])*scale,height:(b[3]-b[1])*scale}};
  }
  function poly(g,points,fill) {
    g.fillStyle=fill;g.beginPath();g.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
    g.closePath();g.fill();
  }
  function stroke(g,points,color,width) {
    g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
    g.stroke();
  }
  function ellipse(g,x,y,rx,ry,color) {
    g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,fullCircle);g.fill();
  }
  function diamond(g,x,y,w,h,color) { poly(g,[[x-w,y],[x,y-h],[x+w,y],[x,y+h]],color); }
  function rect(g,x,y,w,h,color) {g.fillStyle=color;g.fillRect(x,y,w,h);}
  function mark(renderer,id,x,y,w,h) {
    const g=renderer.ctx, art=renderer.assets.street||renderer.assets.marks;
    if(!art?.image)return false;
    const cell=art.frames?.cell || 128, index=art.frames?.frames?.[id] ?? stickers[id] ?? 0;
    const [cw,ch]=Array.isArray(cell)?cell:[cell,cell];
    g.drawImage(art.image,index*cw,0,cw,ch,x,y,w,h);return true;
  }
  function rail(renderer,w,accent,level) {
    const {x1,x2,y,alpha}=w.rail,g=renderer.ctx,scale=w.scale;
    const left=Math.min(x1,x2),right=Math.max(x1,x2);
    const postHeight=Math.max(5*scale,Math.min(w.ground-y,24*scale));
    renderer.region(left-10*scale,y-3*scale,right-left+20*scale,postHeight+9*scale);
    g.save();g.globalAlpha=bounded(alpha);g.lineCap='round';
    for(const x of [left+(right-left)*.18,right-(right-left)*.18]){
      const foot=x-4*scale;
      stroke(g,[[x,y+2*scale],[foot,y+postHeight]],ink,4*scale);
      stroke(g,[[foot-3*scale,y+postHeight],[foot+4*scale,y+postHeight]],ink,2.5*scale);
    }
    stroke(g,[[left,y+2*scale],[right,y+2*scale]],ink,5*scale);
    stroke(g,[[left,y+.5*scale],[right,y+.5*scale]],pale,1.65*scale);
    if(level!=='off')for(let x=left+8*scale;x<right-7*scale;x+=31*scale){
      stroke(g,[[x,y+.5*scale],[x+5*scale,y+.5*scale]],accent,2*scale);
    }
    g.restore();
  }
  function tag(renderer,w,accent) {
    const tag=w.tag,g=renderer.ctx, unit=Math.min(w.scale,1.45);
    const span=Math.min(w.width,82*unit,w.height),inkX=clamp(tag.x,span/2,Math.max(span/2,w.width-span/2));
    const inkY=clamp(tag.y,span/2,Math.max(span/2,w.height-span/2));
    const left=Math.round(inkX-span/2),top=Math.round(inkY-span/2);
    renderer.region(left,top,span,span);
    g.save();g.globalAlpha=bounded(tag.alpha);
    const reveal=w.gentle ? 1 : bounded(tag.progress);
    const width=span*reveal;
    g.beginPath();g.rect(tag.direction===-1 ? left+span-width : left,top,width,span);g.clip();
    const id=tag.kind||({lime:'bolt',pink:'cat',cyan:'skull'}[tag.accent]||'bolt');
    if(!mark(renderer,id,left,top,span,span)){
      g.translate(inkX,inkY);g.scale(span/80,span/80);
      const points=[[-4,-29],[21,-27],[6,-6],[26,-8],[-16,31],[-5,7],[-25,10]];
      g.lineWidth=5;g.lineJoin='round';poly(g,points,paper);g.strokeStyle=ink;g.stroke();poly(g,points,accent);
    }
    g.restore();
  }
  function pickup(renderer,can,w,accent) {
    const g=renderer.ctx,unit=Math.min(w.scale,1.55),size=Math.min(23*unit,w.width,w.height);
    const bob=w.gentle ? 0 : Math.sin(can.age*4+can.id)*1.4*unit;
    const angle=w.gentle ? 0 : Math.sin(can.age*2.7+can.id*.87)*.24;
    const extent=size/2*(Math.abs(Math.cos(angle))+Math.abs(Math.sin(angle)));
    const x=clamp(can.x,extent,Math.max(extent,w.width-extent));
    const y=clamp(can.y+bob,extent,Math.max(extent,w.height-extent));
    renderer.region(x-extent,y-extent,extent*2,extent*2);
    g.save();g.globalAlpha=bounded((60-can.age)*1.4)*.96;
    g.translate(x,y);g.rotate(angle);
    if(!mark(renderer,'can',-size/2,-size/2,size,size)){
      g.scale(size/20,size/20);g.rotate(-.2);
      rect(g,-2,-8,4,3,ink);rect(g,-5,-5,10,13,ink);rect(g,-3,-4,6,3,paper);rect(g,-3,0,6,5,accent);
    }
    g.restore();
  }
  function shadow(renderer,w) {
    const g=renderer.ctx,s=w.scale,a=w.hero,alt=Math.max(0,(w.ground-a.y)/s);
    if(alt>120)return;
    const rx=19*s/(1+alt/125), ry=2.5*s/(1+alt/100),x=a.x,y=w.ground+2*s;
    renderer.region(x-rx,y-ry,rx*2,ry*2);g.save();
    g.globalAlpha=.20*a.alpha/(1+alt/45);ellipse(g,x,y,rx,ry,ink);g.restore();
  }
  function drawActor(renderer,a,asset,pose,s) {
    const g=renderer.ctx,{n,x,y,flip,rect:b}=pose,meta=asset.frames;
    const {cell,columns,pivot=[64,116]}=meta;
    renderer.region(b.x,b.y,b.width,b.height);
    g.save();g.globalAlpha=bounded(a.alpha);g.translate(x,y);g.scale(flip?-s:s,s);
    g.imageSmoothingEnabled=false;
    g.drawImage(asset.image,(n%columns)*cell,Math.floor(n/columns)*cell,cell,cell,-pivot[0],-pivot[1],cell,cell);
    g.restore();
  }
  // All motion marks live near his wheels or shoulders. No screen-wide flashes or particles.
  function accents(renderer,w,color,level,b) {
    const g=renderer.ctx,a=w.hero,key=a.action;
    if(level==='off'||w.gentle||!['boost','grind','grab','land','dance','tag'].includes(key))return;
    const full=level==='full',s=w.scale,t=a.elapsed,p=bounded(a.progress),d=a.direction;
    const top=(b.y-a.y)/s, half=Math.min(26,b.width/(2*s));
    renderer.region(a.x-78*s,Math.min(b.y-14*s,a.y-39*s),156*s,Math.max(53*s,a.y-b.y+25*s));
    g.save();g.translate(a.x,a.y);g.scale(s*d,s);g.globalAlpha=bounded(a.alpha);
    if(key==='grind'){
      for(let i=0;i<(full?7:3);i++){
        const u=cycle(t*2.7+i*.381),x=-5-u*(16+(i%3)*9),y=-2-(8+i%4*3)*Math.sin(Math.PI*u)+u*3;
        g.globalAlpha=(1-u)*a.alpha;
        poly(g,[[x+2,y+1],[x,y-1.2],[x-3.5-u*3,y-2.5],[x-1,y+.4]],i%3===0?paper:color);
      }
    } else if(key==='boost'){
      for(let i=0;i<(full?5:2);i++){
        const u=cycle(t*2+i*.27),x=-11-22*u,y=-2-i*4;
        g.globalAlpha=(1-u)*.78*a.alpha;
        poly(g,[[x,y],[x-16-i,y+.8],[x-22-i*1.3,y+2.6],[x-2,y+1.9]],i%2?color:paper);
      }
    } else if(key==='grab'){
      const n=full?3:1;
      for(let i=0;i<n;i++){
        const u=cycle(i/n+p*.58),x=(half+4)*Math.cos(-Math.PI+u*4.6),y=top*.47+(9+half*.38)*Math.sin(-Math.PI+u*4.6);
        diamond(g,x,y,2.6,4.2,i%2?paper:color);
      }
    } else if(key==='land'){
      const u=bounded(p*1.7);
      g.globalAlpha*=1-u;
      for(const sign of [-1,1]){
        const x=sign*(half*.4+u*24),y=-2-u*4;
        stroke(g,[[x,y],[x+sign*(7+u*3),y-1.5]],color,2);
        if(full)stroke(g,[[x+sign*2,y-3],[x+sign*6,y-6]],paper,1.3);
      }
    } else if(key==='dance'){
      for(let i=0;i<(full?2:1);i++){
        const u=cycle(t*.9+i*.5),x=(i?-1:1)*(half+1+u*6),y=top*.54-16*u;
        g.globalAlpha=(1-u)*a.alpha;ellipse(g,x,y,2.5,1.8,color);
        stroke(g,[[x+2,y],[x+2,y-7],[x+6,y-5]],i?paper:color,1.7);
      }
    } else if(w.tag && p>.15 && p<.88){
      for(let i=0;i<(full?7:2);i++){
        const u=cycle(t*3.1+i*.233),x=half*.63+8+u*12,y=top*.48+(i%3-1)*u*8;
        g.globalAlpha=(1-u)*a.alpha;diamond(g,x,y,1.5,1.5,color);
      }
    }
    g.restore();
  }
  function combo(renderer,w,accent,b) {
    const {score,count}=w.combo;
    if(!score||count<2||w.settings.fx==='off'||w.gentle)return;
    const g=renderer.ctx,s=clamp(w.scale*.8,.8,1.25),h=17*s;
    const text=String(count)+'×  '+Math.round(score);
    g.save();g.font=`bold ${Math.round(10*s)}px monospace`;
    const width=Math.ceil(g.measureText(text).width+15*s);
    if(width>w.width || h>w.height){g.restore();return;}
    const x=clamp(w.hero.x-width/2,0,w.width-width);
    const y=clamp(b.y-h-4,0,w.height-h);
    renderer.region(x,y,width,h);
    poly(g,[[x+3*s,y],[x+width,y],[x+width-3*s,y+h],[x,y+h]],ink);
    poly(g,[[x+3*s,y],[x+6*s,y],[x+3*s,y+h],[x,y+h]],accent);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle=paper;g.fillText(text,x+width/2+s,y+h*.53);g.restore();
  }
  class Renderer {
    constructor(ctx,assets) { this.ctx=ctx;this.assets=assets;this.dirty=[];this.hitBox=null; }
    region(x,y,width,height) {
      const l=Math.floor(x)-2,t=Math.floor(y)-2,r=Math.ceil(x+width)+2,b=Math.ceil(y+height)+2;
      this.dirty.push([l,t,r-l,b-t]);
    }
    clear() {
      for(const rect of this.dirty)this.ctx.clearRect(...rect);
      this.dirty.length=0;this.hitBox=null;
    }
    draw(w) {
      this.clear();
      if(w.settings.hidden)return;
      const asset=this.assets[w.settings.skin]||this.assets.remix||this.assets.classic;
      if(!asset?.image)return;
      const accent=inks[w.settings.accent]||inks.lime,level=w.settings.fx;
      if(w.tag)tag(this,w,inks[w.tag.accent]||accent);
      if(w.rail)rail(this,w,accent,level);
      for(const can of w.cans)pickup(this,can,w,accent);
      if(w.hero.alpha<=0)return;
      const a=w.hero,pose=geometry(a,asset,w.scale,w.gentle);
      if(level!=='off')shadow(this,w);
      drawActor(this,a,asset,pose,w.scale);
      accents(this,w,accent,level,pose.rect);
      combo(this,w,accent,pose.rect);
      this.hitBox=pose.rect;
    }
  }
  return {Renderer,frameFor,geometry};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BeatDraw;
