/* Canvas presentation shared by the userscript and the rendering checks. */
const OooRender = (() => {
  'use strict';
  function pose(world, actor, frames) {
    const def=OooCore.cast[actor.id], s=world.scale;
    let art=actor.id==='marceline'&&world.settings.marcelineArt==='archive'?'archive':actor.id;
    const state=actor.state;
    let action={ run:'run', walk:'walk', music:'music', dance:'dance', cheer:'cheer', eat:'cheer', magic:'cheer', drag:'cheer', drop:'cheer' }[state]||'idle';
    if(!frames.animations[art+'.'+action])action=state==='dance'?'cheer':'idle';
    const list=frames.animations[art+'.'+action]||frames.animations[art+'.idle'];
    const rate={walk:9,run:12,dance:7,music:7,idle:3.5}[action]||6;
    const index=world.gentle?0:(actor.id==='finn'&&action==='idle'?1:Math.floor((actor.elapsed+actor.seed)*rate)%list.length);
    const frame=list[Math.min(index,list.length-1)];
    let y=world.floor-(def.float||0)*s;
    if(!world.gentle){
      if(def.float)y+=Math.sin(world.time*2+actor.seed)*3.5*s;
      if(state==='dance')y-=Math.abs(Math.sin(actor.elapsed*5))*7*s;
      if(['cheer','eat'].includes(state))y-=Math.max(0,Math.sin(actor.elapsed*5))*6*s;
      if(state==='walk'&&list.length===1)y-=Math.abs(Math.sin(actor.elapsed*8))*2*s;
    }
    y-=actor.lift||0;
    if(state==='drag')y=actor.dragY;
    if(state==='drop'){
      const p=Math.min(1,actor.elapsed/actor.duration);
      y=world.gentle?world.floor:actor.dropFrom+(world.floor-actor.dropFrom)*p*p;
    }
    return {x:actor.x,y,frame,flip:actor.direction!==def.facing,scale:s,width:Math.min(65*s,world.width),height:def.height*s,art,action};
  }
  function sprite(ctx,atlas,frames,frame,x,y,scale=1,flip=false,angle=0) {
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.scale(flip?-scale:scale,scale);
    const cell=frames.cell;
    ctx.drawImage(atlas,(frame%frames.columns)*cell,Math.floor(frame/frames.columns)*cell,cell,cell,-64,-120,128,128);ctx.restore();
  }
  function icon(ctx,kind,x,y,s=1,color='#efc863') {
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
    const rect=(c,x,y,w,h)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    if(kind==='snack'){
      rect('#49392b',-10,-15,20,14);rect('#bd6941',-8,-12,16,10);rect('#ffdf8a',-11,-18,22,5);rect('#9bc763',-10,-13,20,3);rect('#edac5a',-7,-21,14,3);rect('#fff0ba',-5,-20,2,2);rect('#fff0ba',2,-19,2,2);
    }else if(kind==='heart'){
      rect('#6b3f4c',-6,-10,4,3);rect('#6b3f4c',2,-10,4,3);rect(color,-6,-7,12,5);rect(color,-4,-2,8,3);rect(color,-2,1,4,2);
    }else if(kind==='star'){
      rect(color,-2,-9,4,18);rect(color,-8,-2,16,4);rect('#fff4c6',-2,-2,4,4);
    }else if(kind==='note'){
      rect(color,2,-16,3,14);rect(color,2,-16,8,3);rect(color,-3,-4,7,4);
    }else if(kind==='flask'){
      rect('#304a54',-4,-24,8,8);rect('#304a54',-8,-16,16,8);rect('#304a54',-11,-8,22,9);rect('#bde9dc',-2,-22,4,8);rect('#9ac6ba',-6,-14,12,7);rect('#d081ad',-9,-6,18,5);rect('#ffe6ef',-7,-5,3,3);
    }else if(kind==='fire'){
      rect('#51473d',-16,0,32,5);rect('#947250',-12,5,24,3);rect('#ac5336',-10,-12,20,12);rect('#ec9b42',-7,-22,14,21);rect('#f1c766',-3,-30,7,27);rect('#fff0a0',-3,-12,6,10);
    }else if(kind==='flag'){
      rect('#5b4c37',0,-40,3,40);rect(color,3,-40,20,12);rect(color,3,-28,12,5);
    }
    ctx.restore();
  }
  function rounded(ctx,x,y,w,h,r=6) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function bubble(ctx,text,x,y,width) {
    ctx.save();ctx.font='bold 12px Verdana, sans-serif';
    const words=text.split(' '),lines=[];let line='';const max=Math.min(214,width-16);
    for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>max-20&&line){lines.push(line);line=word;}else line=next;}
    if(line)lines.push(line);const w=Math.min(max,Math.max(...lines.map(l=>ctx.measureText(l).width),20)+20),h=lines.length*17+14;
    const bx=Math.max(6,Math.min(width-w-6,x-w/2)),by=Math.max(6,y-h);
    ctx.fillStyle='#fff8e6';ctx.strokeStyle='#35473c';ctx.lineWidth=2;rounded(ctx,bx,by,w,h,7);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff8e6';ctx.beginPath();ctx.moveTo(x-4,by+h-1);ctx.lineTo(x,by+h+5);ctx.lineTo(x+5,by+h-1);ctx.fill();
    ctx.fillStyle='#30443b';lines.forEach((l,i)=>ctx.fillText(l,bx+10,by+19+i*17));ctx.restore();
  }
  function stretch(ctx,world,a,jake) {
    const s=world.scale,t=a.elapsed/a.duration;
    const envelope=world.gentle?.35:Math.sin(Math.min(1,t)*Math.PI)**.7;
    const target=a.reach||{x:a.x,y:world.floor-180*s};
    const dx=target.x-a.x,dy=world.floor-target.y;
    const length=58*s+Math.max(0,Math.hypot(dx,dy)-58*s)*envelope;
    const angle=Math.atan2(dx,dy)*envelope;
    ctx.save();ctx.translate(a.x,world.floor);ctx.rotate(angle);
    ctx.drawImage(jake,0,24,32,8,-29*s,-14.5*s,58*s,14.5*s);
    ctx.drawImage(jake,0,20,32,4,-29*s,-length+36*s,58*s,Math.max(7.5*s,length-50.5*s));
    ctx.drawImage(jake,0,0,32,20,-29*s,-length,58*s,36*s);ctx.restore();
  }
  function draw(ctx,world,assets) {
    ctx.clearRect(0,0,world.width,world.height);if(!world.settings.enabled)return;
    ctx.imageSmoothingEnabled=false; const scale=world.scale;
    const scene=world.scene;
    if(world.beacon)icon(ctx,'flag',world.beacon.x,world.floor,scale,'#a9cc83');
    for(const p of world.props){
      const elapsed=world.time-p.born;const fall=world.gentle?0:Math.max(0,1-elapsed/.5)**2*70*scale;
      icon(ctx,'snack',p.x,world.floor-fall,scale);
    }
    if(scene?.phase==='play'){
      if(scene.id==='campfire')icon(ctx,'fire',scene.center,world.floor,scale*(world.gentle?1:1+Math.sin(world.time*9)*.04));
      if(scene.id==='science')icon(ctx,'flask',scene.center,world.floor,scale*1.4);
    }
    const poses=[];
    for(const a of world.actors){
      const p=pose(world,a,assets.frames);poses.push([a,p]);
      ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#253f37';ctx.beginPath();ctx.ellipse(a.x,world.floor+1,19*scale,3*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();
      if(a.state==='stretch')stretch(ctx,world,a,assets.jake);
      else sprite(ctx,assets.atlas,assets.frames,p.frame,p.x,p.y,p.scale,p.flip,(!world.gentle&&a.state==='dance'?Math.sin(a.elapsed*5)*.08:0));
      if(a.state==='music'){
        for(let i=0;i<(world.gentle?1:4);i++){
          const phase=world.gentle?.35:(a.elapsed*.45+i*.25)%1;
          ctx.save();ctx.globalAlpha=1-phase;icon(ctx,'note',p.x+(i%2?1:-1)*(17+phase*30)*scale,p.y-(48+phase*70)*scale,scale*.75,i%2?'#d3a4cf':'#8abaaf');ctx.restore();
        }
      }
      if(a.state==='magic'){
        if(a.id==='bubblegum')icon(ctx,'flask',p.x+30*scale,p.y,scale*.8);
        if(a.id==='flame')for(let i=0;i<(world.gentle?2:6);i++){
          const phase=world.gentle?.45:(a.elapsed*.55+i/6)%1;ctx.save();ctx.globalAlpha=1-phase;ctx.fillStyle=i%2?'#f7d684':'#e8844a';ctx.fillRect(p.x+Math.sin(i*2.1)*30*scale,p.y-phase*80*scale,3*scale,5*scale);ctx.restore();
        }
      }
      if(a.state==='eat')icon(ctx,'snack',p.x+24*scale,p.y-15*scale,scale*.8);
    }
    if(scene?.phase==='play'){
      if(scene.id==='heroes'&&scene.elapsed>1&&scene.elapsed<3)icon(ctx,'star',scene.center,world.floor-94*scale,scale*.9);
      if(scene.id==='heist'){
        const g=world.actor('gunter');icon(ctx,'snack',scene.elapsed<2?scene.center:g.x,world.floor-(scene.elapsed<2?0:44*scale),scale*.8);
      }
      if(scene.id==='science')for(let i=0;i<6;i++){
        const phase=world.gentle?(i+.5)/6:(scene.elapsed*.22+i/6)%1;ctx.save();ctx.globalAlpha=1-phase;ctx.strokeStyle=i%2?'#d180ab':'#7eac9b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(scene.center+Math.sin(i*5+phase)*22*scale,world.floor-(20+phase*100)*scale,(2+i%3)*scale,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
    }
    for(const[a,p]of poses)if(a.bubbleUntil>world.time&&world.settings.chatter)bubble(ctx,a.bubble,p.x,p.y-p.height-15*scale,world.width);
    return poses;
  }
  return {pose,sprite,icon,bubble,draw};
})();
if (typeof module !== 'undefined' && module.exports) module.exports=OooRender;
