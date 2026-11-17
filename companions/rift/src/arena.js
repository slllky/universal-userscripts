class RiftArena {
 constructor(container,state,onWin,sound){this.el=container;this.state=state;this.onWin=onWin;this.sound=sound;this.canvas=container.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.keys=new Set();this.status='ready';this.last=0;this.t=0;this.player={x:.5,y:.78,faceX:0,faceY:-1};this.target=null;this.reset();
   this.avatar=document.createElement('div');this.avatar.className='arena-avatar';this.avatar.setAttribute('aria-hidden','true');this.avatar.innerHTML=RiftArt.pet(state,'arena');this.el.append(this.avatar);
   this.canvas.width=900;this.canvas.height=500;this.canvas.addEventListener('pointerdown',e=>{if(this.status!=='playing')return;this.canvas.setPointerCapture(e.pointerId);this.aim(e);});
   this.canvas.addEventListener('pointermove',e=>{if(e.buttons&&this.status==='playing')this.aim(e);});this.draw();
 }
 reset(){this.health=4;this.progress=0;this.charge=0;this.time=0;this.spawnClock=0;this.shardClock=0;this.bullets=[];this.shards=[];this.sparks=[];this.rings=[];this.player={x:.5,y:.78,faceX:0,faceY:-1};this.target=null;this.invulnerable=0;this.dashCooldown=0;this.dashTime=0;this.wave=1;this.keys.clear();}
 start(){this.reset();this.runId=crypto.randomUUID?.()||Math.random().toString(36).slice(2);this.status='playing';this.el.querySelector('.arena-overlay').hidden=true;for(let i=0;i<5;i++)this.spawnShard();this.updateHUD();this.canvas.focus();}
 aim(e){const r=this.canvas.getBoundingClientRect();this.target={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
 key(e,down){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s','A','D','W','S',' ','Shift'].includes(e.key))return false;
   if(this.status!=='playing')return false;if(down){this.keys.add(e.key.toLowerCase());if(!e.repeat&&e.key===' ')this.soothe();if(!e.repeat&&e.key==='Shift')this.dash();}else this.keys.delete(e.key.toLowerCase());return true;}
 dash(){if(this.status!=='playing'||this.dashCooldown>0)return;this.dashTime=.2;this.dashCooldown=2.5;this.invulnerable=.45;this.sound.play('boop');}
 soothe(){if(this.status!=='playing'||this.charge<3)return;this.charge-=3;this.progress+=3;this.rings.push({x:this.player.x,y:this.player.y,age:0});this.bullets=[];this.sound.play('reward');if(this.progress>=18)this.finish(true);this.updateHUD();}
 spawnShard(){this.shards.push({x:.12+Math.random()*.76,y:.26+Math.random()*.61,phase:Math.random()*6});}
 tick(now){const dt=Math.min(.035,(now-(this.last||now))/1000);this.last=now;this.t=now/1000;if(this.status==='playing'){this.time+=dt;this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.wave=Math.min(3,1+Math.floor(this.progress/6));
   let dx=(this.keys.has('arrowright')||this.keys.has('d')?1:0)-(this.keys.has('arrowleft')||this.keys.has('a')?1:0),dy=(this.keys.has('arrowdown')||this.keys.has('s')?1:0)-(this.keys.has('arrowup')||this.keys.has('w')?1:0);
   if(dx||dy)this.target=null;else if(this.target){dx=(this.target.x-this.player.x)*8;dy=(this.target.y-this.player.y)*8;}
   const len=Math.hypot(dx,dy);if(len>.03){const scale=Math.max(1,len);dx/=scale;dy/=scale;this.player.faceX=dx/(Math.hypot(dx,dy)||1);this.player.faceY=dy/(Math.hypot(dx,dy)||1);}
   if(this.dashTime>0){dx=this.player.faceX*4;dy=this.player.faceY*4;}
   this.player.x=Math.max(.035,Math.min(.965,this.player.x+dx*dt*.3));this.player.y=Math.max(.18,Math.min(.94,this.player.y+dy*dt*.5));
   this.spawnClock+=dt;this.shardClock+=dt;if(this.shardClock>1.5&&this.shards.length<6){this.shardClock=0;this.spawnShard();}
   if(this.spawnClock>1.25-this.wave*.17){this.spawnClock=0;const base=Math.atan2((this.player.y-.25)*500,(this.player.x-.5)*900);for(let i=0;i<this.wave+1;i++){const a=base+(i-this.wave/2)*.36;this.bullets.push({x:.5,y:.25,vx:Math.cos(a)*.14,vy:Math.sin(a)*.25});}}
   for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;if(Math.hypot((b.x-this.player.x)*900,(b.y-this.player.y)*500)<24&&!this.invulnerable){this.health--;this.invulnerable=1.3;b.x=-10;this.sound.play('soft');if(this.health<=0)this.finish(false);}}
   this.bullets=this.bullets.filter(b=>b.x>-.1&&b.x<1.1&&b.y>-.1&&b.y<1.1);
   this.shards=this.shards.filter(s=>{if(Math.hypot((s.x-this.player.x)*900,(s.y-this.player.y)*500)<32){this.charge++;this.progress++;this.sound.play('pop');for(let i=0;i<8;i++)this.sparks.push({x:s.x,y:s.y,angle:i*Math.PI/4,age:0});return false;}return true;});
   for(const p of this.sparks)p.age+=dt;this.sparks=this.sparks.filter(p=>p.age<.6);for(const r of this.rings)r.age+=dt;this.rings=this.rings.filter(r=>r.age<1);
   if(this.progress>=18)this.finish(true);else if(this.time>=60)this.finish(false);this.updateHUD();
 }this.draw();}
 updateHUD(){const hud=this.el.querySelector('.arena-hud');hud.innerHTML=`<span>${'♥'.repeat(Math.max(0,this.health))}${'♡'.repeat(4-Math.max(0,this.health))}</span><span>Wave ${this.wave} · ${Math.min(18,this.progress)}/18 light</span><span>${Math.max(0,Math.ceil(60-this.time))}s</span>`;
   const charge=this.el.parentElement.querySelector('[data-arena-charge]');if(charge)charge.textContent=`${this.charge}/3 glow`;
   const btn=this.el.parentElement.querySelector('[data-action="soothe"]');if(btn)btn.disabled=this.charge<3||this.status!=='playing';
   const dash=this.el.parentElement.querySelector('[data-action="dash"]');if(dash)dash.disabled=this.dashCooldown>0||this.status!=='playing';}
 finish(win){if(this.status!=='playing')return;this.status=win?'won':'lost';this.keys.clear();const overlay=this.el.querySelector('.arena-overlay');overlay.hidden=false;overlay.innerHTML=`<div><div class="eyebrow" style="justify-content:center">${win?'A little light goes a long way':'No hurry. You can try again.'}</div><h2>${win?'A wisp, welcomed home.':'A softer landing.'}</h2><p>${win?'You gathered the scattered light and calmed the rift. Your companion is very proud. +18 stardust · +10 bond':'The rift was a little too swirly this time. Your companion is safe, and you keep everything you brought.'}</p><button class="btn primary" data-action="${win?'leaveArena':'startArena'}">${win?'Back to the sanctuary':'Try a gentler approach'}</button></div>`;if(win){this.onWin(this.runId);this.sound.play('reward');}}
 draw(){const c=this.ctx,W=900,H=500;c.clearRect(0,0,W,H);const g=c.createRadialGradient(450,180,30,450,240,500);g.addColorStop(0,'#443457');g.addColorStop(.5,'#25243e');g.addColorStop(1,'#131c2e');c.fillStyle=g;c.fillRect(0,0,W,H);
   c.strokeStyle='#b29bc31b';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.ellipse(450,270,100+i*90,55+i*45,0,0,Math.PI*2);c.stroke();}
   for(let i=0;i<65;i++){const x=(i*137)%W,y=(i*67)%H;c.fillStyle=`rgba(226,208,244,${this.state.settings.motion?.15+.2*Math.sin(this.t*.5+i)**2:.25})`;c.beginPath();c.arc(x,y,i%5===0?1.8:.8,0,7);c.fill();}
   const wx=450,wy=120+(this.state.settings.motion?Math.sin(this.t*2)*7:0);c.save();c.translate(wx,wy);const calm=Math.min(1,this.progress/18);c.shadowColor='#cfb1f4';c.shadowBlur=35;c.fillStyle=calm>.6?'#e6d0ef':'#9d86bb';c.beginPath();c.moveTo(-34,12);c.bezierCurveTo(-48,-50,45,-53,34,10);c.quadraticCurveTo(22,0,15,23);c.quadraticCurveTo(0,4,-13,24);c.quadraticCurveTo(-23,4,-34,12);c.fill();c.shadowBlur=0;c.fillStyle='#483c5d';for(const x of [-12,12]){c.beginPath();c.ellipse(x,-13,3,5,0,0,7);c.fill();}c.strokeStyle='#483c5d';c.beginPath();c.arc(0,-4,5,0,Math.PI);c.stroke();c.restore();
   for(const s of this.shards){c.save();c.translate(s.x*W,s.y*H+Math.sin(this.t*3+s.phase)*4);c.rotate(Math.PI/4);c.shadowColor='#f9dda3';c.shadowBlur=14;c.fillStyle='#f4d8a0';c.fillRect(-6,-6,12,12);c.restore();}
   for(const b of this.bullets){c.fillStyle='#bd8db6';c.shadowColor='#dc9fc8';c.shadowBlur=12;c.beginPath();c.arc(b.x*W,b.y*H,7,0,7);c.fill();}c.shadowBlur=0;
   for(const p of this.sparks){c.globalAlpha=1-p.age/.6;c.fillStyle='#ffe1a4';c.beginPath();c.arc(p.x*W+Math.cos(p.angle)*p.age*75,p.y*H+Math.sin(p.angle)*p.age*75,2,0,7);c.fill();}c.globalAlpha=1;
   for(const r of this.rings){c.strokeStyle=`rgba(216,191,248,${1-r.age})`;c.lineWidth=5;c.beginPath();c.arc(r.x*W,r.y*H,r.age*380,0,7);c.stroke();}
   const p=this.player;this.avatar.style.left=p.x*100+'%';this.avatar.style.top=p.y*100+'%';if(this.invulnerable>0){c.strokeStyle='#e4cef5';c.lineWidth=2;c.beginPath();c.arc(p.x*W,p.y*H,28,0,7);c.stroke();}
 }
 destroy(){this.status='closed';this.keys.clear();}
}
