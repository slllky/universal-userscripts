// Draw in viewport CSS pixels. The host owns the backing resolution and DPR transform.
const BeatDraw = (() => {
  'use strict';
  const ink = '#162024', paper = '#fff9d6', pale = '#d8f9dc';
  const inks = {lime:'#c0fb33',pink:'#ff549d',cyan:'#48dbde'};
  const stickers = {bolt:0,cat:1,skull:2,can:3};
  const timing = {idle:290,skate:135,boost:105,jump:125,grab:155,grind:140,tag:165,dance:145,land:125,
    crossover:105,rocket:130,fishbrain:145,wallride:120,spin:95,manual:190,circle:160};
  const classicPoses = {crossover:'skate',rocket:'grab',fishbrain:'grind',wallride:'grab',spin:'dance',manual:'grind',circle:'dance',makio:'fishbrain',soultransfer:'grind',acid:'grind',unity:'fishbrain',stale:'grab',method:'grab',heelflip:'spin',bio:'spin',rewind:'spin',slalom:'crossover',pivot:'manual',cess:'grind'};
  const cycles = new Set(['skate','idle','dance','grind','boost','crossover','fishbrain','manual']);
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const bounded = v => clamp(v,0,1);
  const cycle = t => t-Math.floor(t);
  const fullCircle = 2*Math.PI;
  function sampleFrame(actor, meta, gentle) {
    const key = meta.animations[actor.action]?.length ? actor.action : (classicPoses[actor.action] || 'idle');
    const fallback=classicPoses[key];
    const seq=meta.animations[key] || meta.animations[fallback] || meta.animations.idle;
    if (!seq?.length) return {n:0,next:0,fraction:0};
    if (gentle) {
      const n=seq[key==='idle'||key==='skate' ? 0 : Math.floor(seq.length/2)];
      return {n,next:n,fraction:0};
    }
    const loops=cycles.has(actor.action), durations=meta.durations?.[key];
    const weighted=Array.isArray(durations)&&durations.length===seq.length&&durations.every(ms=>Number.isFinite(ms)&&ms>0);
    const ms=timing[key]||140, total=weighted?durations.reduce((a,b)=>a+b,0):seq.length*ms;
    const at=loops?(Math.max(0,actor.elapsed)*1000)%total:bounded(actor.progress)*total;
    let i=0,start=0;
    if(weighted){while(i<seq.length-1&&at>=start+durations[i])start+=durations[i++];}
    else {i=Math.min(seq.length-1,Math.floor(at/ms));start=i*ms;}
    const n=seq[i],next=seq[i+1]??(loops?seq[0]:n);
    return {n,next,fraction:bounded((at-start)/(weighted?durations[i]:ms))};
  }
  const frameFor=(actor,meta,gentle)=>sampleFrame(actor,meta,gentle).n;
  function geometry(actor,asset,scale,gentle) {
    const meta=asset.frames, {n,next,fraction}=sampleFrame(actor,meta,gentle), pivot=meta.pivot||[64,116];
    const motion=asset.motion;
    const inbetweens=!gentle&&motion?.image&&n!==next&&fraction>=1/3?motion.pairs[n+':'+next]:null;
    const mid=inbetweens?.[fraction>=2/3?1:0];
    const cell=meta.cell, b=motion?.bounds?.[mid] || meta.bounds?.[n] || [0,0,cell,cell];
    const facing=meta.facing ?? 1;
    const turn=['spin','heelflip','bio','rewind'].includes(actor.action) && !gentle ? Math.cos(bounded(actor.progress)*fullCircle) : 1;
    const fold=.49+.51*Math.abs(turn);
    const flip=(actor.direction!==facing)!==(turn<0);
    const top=b[1]-pivot[1],bottom=b[3]-pivot[1];
    // Angle the shoulders away from the wall while the wheel pivot stays fixed. Keep the sheared ink in its cell.
    const freeSide=facing>0?b[0]:cell-b[2];
    const lean=actor.action==='wallride' && !gentle ? facing*Math.sin(Math.PI*bounded(actor.progress))*Math.min(.28,freeSide/Math.max(1,-top)) : 0;
    const left=(b[0]-pivot[0]+Math.min(lean*top,lean*bottom))*fold;
    const right=(b[2]-pivot[0]+Math.max(lean*top,lean*bottom))*fold;
    const x=Math.round(actor.x),y=Math.round(actor.y);
    return {n,mid,flip,fold,lean,x,y,rect:{x:x+(flip ? -right : left)*scale,
      y:y+top*scale,width:(right-left)*scale,height:(bottom-top)*scale}};
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
  function wall(renderer,w,accent,level) {
    const {x,y,top,side,alpha}=w.wall,s=w.scale,g=renderer.ctx;
    const h=Math.max(4,(y-top)/s),depth=Math.min(25,Math.max(4,w.width/s/6));
    const left=side<0?x-(depth+3)*s:x-3*s;
    renderer.region(left,top-4*s,(depth+7)*s,(h+9)*s);
    g.save();g.globalAlpha=bounded(alpha);g.translate(x,top);g.scale(side*s,s);
    poly(g,[[0,1],[depth,-2],[depth,h+1],[0,h+3]],ink);
    poly(g,[[2,3],[depth-6,0],[depth-6,h-1],[2,h]],'#597277');
    poly(g,[[depth-6,0],[depth-2,-1],[depth-2,h-1],[depth-6,h]],'#33494e');
    stroke(g,[[.5,1],[.5,h+1]],pale,1.5);
    for(let y=11;y<h-3;y+=16){
      stroke(g,[[3,y],[depth-2,y-2]],ink,1);
      if(level!=='off')poly(g,[[5,y-6],[11,y-11],[12,y-9],[6,y-4]],accent);
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
  function shadow(renderer,w,a) {
    const g=renderer.ctx,s=w.scale,alt=Math.max(0,(w.ground-a.y)/s);
    if(alt>120)return;
    const rx=19*s/(1+alt/125), ry=2.5*s/(1+alt/100),x=a.x,y=w.ground+2*s;
    renderer.region(x-rx,y-ry,rx*2,ry*2);g.save();
    g.globalAlpha=.20*a.alpha/(1+alt/45);ellipse(g,x,y,rx,ry,ink);g.restore();
  }
  function drawActor(renderer,a,asset,pose,s) {
    const g=renderer.ctx,{n,mid,x,y,flip,fold,lean,rect:b}=pose,meta=asset.frames;
    const {cell,pivot=[64,116]}=meta;
    const tween=mid!==undefined, columns=tween?asset.motion.columns:meta.columns, index=tween?mid:n;
    renderer.region(b.x,b.y,b.width,b.height);
    g.save();g.globalAlpha=bounded(a.alpha);g.translate(x,y);
    const horizontal=(flip?-1:1)*s*fold;
    g.transform(horizontal,0,horizontal*lean,s,0,0);
    g.imageSmoothingEnabled=false;
    g.drawImage(tween?asset.motion.image:asset.image,(index%columns)*cell,Math.floor(index/columns)*cell,cell,cell,-pivot[0],-pivot[1],cell,cell);
    g.restore();
  }
  // Light reflects off the engaged wheel; aerial moves use a longer arc around the rider.
  const effects = new Set(['boost','grind','grab','land','dance','tag','crossover','rocket','fishbrain','wallride','spin','manual']);
  function accents(renderer,w,a,color,level,b) {
    const g=renderer.ctx,key=a.action;
    if(level==='off'||w.gentle||!effects.has(key))return;
    const full=level==='full',s=w.scale,t=a.elapsed,p=bounded(a.progress),d=a.direction;
    const top=(b.y-a.y)/s, half=Math.min(26,b.width/(2*s));
    const fxTop=Math.min(b.y-14*s,a.y-39*s);
    renderer.region(a.x-78*s,fxTop,156*s,a.y+26*s-fxTop);
    g.save();g.translate(a.x,a.y);g.scale(s*d,s);g.globalAlpha=bounded(a.alpha);
    if(key==='wallride' && w.wall){
      const contact=(w.wall.x-a.x)*d/s;
      if(contact>0 && contact<21){
        for(let i=0;i<(full?5:2);i++){
          const u=cycle(t*2.4+i*.27),x=contact-1-u*(3+i),y=1+u*(5+i*1.6);
          g.globalAlpha=(1-u)*a.alpha;
          stroke(g,[[x,y],[x-2*u,y+4]],i%2?color:paper,1.4);
        }
      }
    } else if(key==='spin'){
      const rx=half+8, at=top*.43,phase=p*fullCircle;
      g.globalAlpha*=Math.sin(Math.PI*p)*.90;
      for(let i=0;i<(full?2:1);i++){
        const a0=phase+i*Math.PI;
        g.beginPath();g.ellipse(0,at,rx,5,-.16,a0,a0+1.6);
        g.lineWidth=i?1.4:2;g.strokeStyle=i?paper:color;g.stroke();
      }
    } else if(key==='manual'){
      const u=cycle(t*1.8),x=half*.45;
      g.globalAlpha*=(1-u)*.75;
      stroke(g,[[x-3,-.5],[x-8-u*8,-.5]],color,1.5);
      if(full)diamond(g,x+2,-2,1.9,2.8,paper);
    } else if(key==='crossover'){
      for(let i=0;i<(full?3:2);i++){
        const u=cycle(t*2.1+i*.44),x=-8-(8+i*3)*u,y=-2-i*1.6;
        g.globalAlpha=(1-u)*a.alpha;
        g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-8,y+2,x-17-u*3,y-1.5);
        g.lineWidth=i?1.2:1.8;g.strokeStyle=i?paper:color;g.stroke();
      }
    } else if(key==='rocket'){
      const strength=Math.sin(Math.PI*p);
      for(let i=0;i<(full?3:1);i++){
        const u=cycle(p*1.65+i*.29),x=-half*.3-i*3-u*8,y=1+u*4.5;
        g.globalAlpha=a.alpha*strength*(1-u)*.8;
        poly(g,[[x,y],[x-7-u*9,y+2.5],[x-3,y+2]],i%2?paper:color);
      }
    } else if(key==='grind'||key==='fishbrain'){
      for(let i=0;i<(full?7:3);i++){
        const u=cycle(t*2.7+i*.381),x=(key==='fishbrain'?4:-5)-u*(16+(i%3)*9),y=-2-(8+i%4*3)*Math.sin(Math.PI*u)+u*3;
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
    } else if(key==='tag' && w.tag && p>.15 && p<.88){
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
    assetFor(actor,w) {
      const rider=actor.rider || w.settings.rider || 'beat';
      return rider==='beat' ? this.assets[w.settings.skin]||this.assets.remix||this.assets.classic : this.assets[rider];
    }
    drawRider(actor,w,accent,level) {
      const asset=actor && this.assetFor(actor,w);
      if(!asset?.image || actor.alpha<=0)return null;
      if(!w.gentle)asset.loadMotion?.();
      const pose=geometry(actor,asset,w.scale,w.gentle);
      if(level!=='off')shadow(this,w,actor);
      drawActor(this,actor,asset,pose,w.scale);
      accents(this,w,actor,accent,level,pose.rect);
      return pose.rect;
    }
    draw(w) {
      this.clear();
      if(w.settings.hidden)return;
      const park=this.assets.parks, crop=park?.frames?.districts?.[w.settings.district];
      if(!['page','park'].includes(w.settings.mode) && crop && park.image){
        this.region(0,0,w.width,w.height);
        // Park crops are x,y,width,height, unlike exclusive rider bounds.
        const [sx,sy,sw,sh]=crop, factor=Math.max(w.width/sw,w.height/sh);
        const cw=w.width/factor,ch=w.height/factor;
        this.ctx.drawImage(park.image,sx+(sw-cw)/2,sy+(sh-ch)/2,cw,ch,0,0,w.width,w.height);
      }
      const accent=inks[w.settings.accent]||inks.lime,level=w.settings.fx;
      const stereo=()=>{
      if(w.trick?.id==='circle'){
        const s=w.scale, x=w.trick.x0-15*s, y=w.trick.y0-47*s;
        this.region(x-2*s,y-5*s,34*s,25*s);
        rect(this.ctx,x,y,30*s,18*s,ink);
        rect(this.ctx,x+2*s,y+2*s,26*s,14*s,'#6a7880');
        stroke(this.ctx,[[x+8*s,y],[x+8*s,y-4*s],[x+22*s,y-4*s],[x+22*s,y]],ink,2*s);
        ellipse(this.ctx,x+7*s,y+9*s,5*s,5*s,ink);
        ellipse(this.ctx,x+23*s,y+9*s,5*s,5*s,ink);
        rect(this.ctx,x+13*s,y+5*s,4*s,6*s,accent);
      }
      };
      if(w.settings.mode==='park'){
        const l=(typeof module!=='undefined'&&module.exports?require('./park.js'):BeatPark).layout(w),g=this.ctx;
        this.region(0,0,w.width,w.height);g.fillStyle='#20313b';g.fillRect(0,0,w.width,w.height);
        const backdrop=this.assets.parks,crop=backdrop?.frames?.districts?.spool;
        if(backdrop?.image&&crop){const [sx,sy,sw,sh]=crop;const h=l.top+30,scale=Math.max(w.width/sw,h/sh),cw=w.width/scale,ch=h/scale;g.drawImage(backdrop.image,sx+(sw-cw)/2,sy+(sh-ch)/2,cw,ch,0,0,w.width,h);g.fillStyle='rgba(18,30,39,.25)';g.fillRect(0,0,w.width,l.top+30);}
        // Hard rear coping and perspective seams distinguish the playable concrete court.
        g.fillStyle='#15242e';g.fillRect(l.left-29,l.top-29,l.right-l.left+58,l.bottom-l.top+60);
        const concrete=g.createLinearGradient(l.left,l.top,l.right,l.bottom);concrete.addColorStop(0,'#c0c5a5');concrete.addColorStop(.55,'#9eaea5');concrete.addColorStop(1,'#829a9a');g.fillStyle=concrete;g.fillRect(l.left-24,l.top-24,l.right-l.left+48,l.bottom-l.top+48);
        // Deterministic small weathering marks: bounded draw count, no random shimmer.
        for(let i=0;i<100;i++){const x=l.left-16+((i*137)%997)/997*(l.right-l.left+32),y=l.top-14+((i*239)%991)/991*(l.bottom-l.top+28);g.fillStyle=i%3?'rgba(28,54,56,.08)':'rgba(240,240,213,.24)';g.fillRect(x,y,2+i%5,1+i%2);}
        g.fillStyle='rgba(34,57,64,.10)';g.beginPath();g.moveTo(l.left-24,l.top-24);g.lineTo(l.left+80,l.top-24);g.lineTo(l.left+130,l.bottom+24);g.lineTo(l.left+38,l.bottom+24);g.closePath();g.fill();
        g.strokeStyle='#7d9290';g.lineWidth=1;
        for(let i=0;i<=8;i++){const x=l.left+(l.right-l.left)*i/8;g.beginPath();g.moveTo(w.width*.5+(x-w.width*.5)*.75,l.top-24);g.lineTo(x,l.bottom+24);g.stroke();}
        for(let i=1;i<5;i++){const y=l.top+(l.bottom-l.top)*i/5;g.beginPath();g.moveTo(l.left-24,y);g.lineTo(l.right+24,y);g.stroke();}
        g.strokeStyle='#e4e9ca';g.lineWidth=3;g.strokeRect(l.left-14,l.top-14,l.right-l.left+28,l.bottom-l.top+28);
        g.fillStyle='#c5ed43';g.fillRect(l.left-24,l.top-24,l.right-l.left+48,6);
        // Slotted perimeter drain and worn safety paint, outside the playable footprint.
        g.fillStyle='#405661';g.fillRect(l.left-20,l.bottom+13,l.right-l.left+40,8);g.fillStyle='#a1b3ae';for(let x=l.left-16;x<l.right+16;x+=19)g.fillRect(x,l.bottom+14,3,6);
        g.strokeStyle='rgba(238,240,207,.4)';g.lineWidth=2;for(let i=0;i<7;i++){const x=l.left+(l.right-l.left)*(.16+i*.08),y=l.top+(l.bottom-l.top)*.83;g.beginPath();g.ellipse(x,y,19,4,.2,0,Math.PI);g.stroke();}
        // Raised ledge: visual footprint matches the blocked collision rectangle.
        for(const b of l.blocks){g.fillStyle='rgba(25,40,44,.3)';g.fillRect(b.x+8,b.y+8,b.width,b.height);const face=g.createLinearGradient(b.x,b.y,b.x,b.y+b.height);face.addColorStop(0,'#658184');face.addColorStop(1,'#354d5c');g.fillStyle=face;g.fillRect(b.x,b.y,b.width,b.height);g.strokeStyle='#2b414b';g.lineWidth=1;for(let y=b.y+22;y<b.y+b.height-6;y+=12){g.beginPath();g.moveTo(b.x,y);g.lineTo(b.x+b.width,y);g.stroke();}for(let x=b.x+22;x<b.x+b.width;x+=31){g.beginPath();g.moveTo(x,b.y+14);g.lineTo(x,b.y+b.height-8);g.stroke();}g.fillStyle='#d0ded0';g.fillRect(b.x,b.y,b.width,Math.min(14,b.height*.3));g.fillStyle='#f0bc4a';for(let x=b.x+8;x<b.x+b.width-8;x+=25)g.fillRect(x,b.y+b.height-7,13,4);}
        g.strokeStyle='#354c55';g.lineWidth=5;
        for(const x of [l.rail.left,l.rail.right]){g.beginPath();g.moveTo(x,l.rail.y);g.lineTo(x,l.rail.y+14);g.stroke();}
        g.strokeStyle='rgba(28,48,58,.22)';g.lineWidth=7;g.beginPath();g.moveTo(l.rail.left+9,l.rail.y+17);g.lineTo(l.rail.right+9,l.rail.y+17);g.stroke();
        g.strokeStyle='#192c38';g.lineWidth=9;g.beginPath();g.moveTo(l.rail.left,l.rail.y);g.lineTo(l.rail.right,l.rail.y);g.stroke();g.strokeStyle='#dbf6ed';g.lineWidth=4;g.stroke();
        l.markers.forEach((p,i)=>{const active=i===(w.parkCheckpoint||0);g.fillStyle=active?'#c0fb33':'#516c74';g.beginPath();g.ellipse(p.x,p.y,19,12,0,0,Math.PI*2);g.fill();g.strokeStyle=active?'#eaffab':'#bdcfc7';g.lineWidth=2;g.stroke();g.fillStyle=active?'#162024':'#e0ede2';g.font='bold 14px sans-serif';g.fillText(String(i+1),p.x-4,p.y+5);});
        g.fillStyle='#162730';g.fillRect(12,12,Math.min(w.width-24,470),62);g.fillStyle='#c0fb33';g.font='bold 18px sans-serif';g.fillText('SPOOL / PRACTICE YARD',24,36,Math.max(1,w.width-48));g.fillStyle='#e8f1db';g.font='12px sans-serif';g.fillText('Laps '+(w.parkLaps||0)+' · Follow 1–4 · Arrow keys · G near rail',24,58,Math.max(1,w.width-48));
      }
      const behindStereo=w.trick?.id==='circle' && w.hero.y<w.trick.y0-28*w.scale;
      if(!behindStereo)stereo();
      if(w.tag)tag(this,w,inks[w.tag.accent]||accent);
      if(w.wall)wall(this,w,accent,level);
      if(w.rail)rail(this,w,accent,level);
      for(const can of w.cans)pickup(this,can,w,accent);
      if(w.rival)this.drawRider(w.rival,w,'#ff549d',level==='full'?'low':level);
      if(w.rivalText){const g=this.ctx;g.save();g.font='bold 13px sans-serif';g.fillStyle='#162024';g.fillRect(8,8,Math.min(w.width-16,560),42);g.fillStyle='#fff9d6';g.fillText(w.rivalText,16,34,Math.max(1,w.width-32));g.restore();}
      if(w.third)this.drawRider(w.third,w,pale,level==='full'?'low':level);
      if(w.partner)this.drawRider(w.partner,w,pale,level==='full'?'low':level);
      this.hitBox=this.drawRider(w.hero,w,accent,level);
      if(behindStereo)stereo();
      if(this.hitBox)combo(this,w,accent,this.hitBox);
    }
  }
  return {Renderer,frameFor,sampleFrame,geometry};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BeatDraw;
