// Dedicated practice yard, in normalized viewport coordinates; no external assets.
const BeatPark=(()=>{
 function layout(w){const left=w.boundX(w.width*.12),right=w.boundX(w.width*.88),top=w.boundY(w.height*.46),bottom=Math.max(top,w.ground-34*w.scale);const x=f=>left+(right-left)*f,y=f=>top+(bottom-top)*f;return {left,right,top,bottom,blocks:[{x:x(.38),y:y(.25),width:(right-left)*.18,height:(bottom-top)*.2}],rail:{left:x(.12),right:x(.74),y:y(.72)},markers:[{x:x(.05),y:y(.9)},{x:x(.1),y:y(.1)},{x:x(.9),y:y(.12)},{x:x(.9),y:y(.92)}]};}
 function blocked(w,x,y){const r=layout(w);return r.blocks.some(b=>x>b.x-8&&x<b.x+b.width+8&&y>b.y-5&&y<b.y+b.height+5);}
 function move(w,x,y){const h=w.hero,l=layout(w);x=Math.max(l.left,Math.min(l.right,x));y=Math.max(l.top,Math.min(l.bottom,y));if(!blocked(w,x,h.y))h.x=x;if(!blocked(w,h.x,y))h.y=y;}
 function resolve(w){for(const b of layout(w).blocks){if(!blocked(w,w.hero.x,w.hero.y))continue;const h=w.hero,choices=[{x:b.x-9,y:h.y},{x:b.x+b.width+9,y:h.y},{x:h.x,y:b.y-6},{x:h.x,y:b.y+b.height+6}].sort((a,c)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(c.x-h.x,c.y-h.y));for(const p of choices)if(!blocked(w,p.x,p.y)){h.x=p.x;h.y=p.y;break;}}}
 function tick(w){if(!w.trick){resolve(w);move(w,w.hero.x,w.hero.y);}const l=layout(w),p=l.markers[w.parkCheckpoint||0];if(Math.hypot(w.hero.x-p.x,w.hero.y-p.y)<24){w.parkCheckpoint=(w.parkCheckpoint||0)+1;if(w.parkCheckpoint===4){w.parkCheckpoint=0;w.parkLaps=(w.parkLaps||0)+1;w.signal('park-lap',{laps:w.parkLaps});}}}
 return {layout,blocked,move,tick,resolve};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BeatPark;
