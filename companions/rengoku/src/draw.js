// Draw in CSS-pixel world coordinates. The host owns the canvas clear, DPR and strip origin.
const PatrolDraw = (() => {
  'use strict';
  const clamp01 = number => Math.max(0, Math.min(1, number));
  const turn = Math.PI * 2;
  const fire = { scarlet: '#d74232', orange: '#fb8731', gold: '#ffcb54', core: '#fff3bd' };
  const defaultTiming = {
    idle: 190, walk: 150, run: 95, jump: 120, guard: 160, slash: 100, rising: 105,
    dash: 95, victory: 180, attack: 130, hurt: 105, death: 155
  };
  const moveShape = {
    slash: { x: 1, y: -37, rx: 46, ry: 36, from: -1.97, sweep: 2.75 },
    rising: { x: 4, y: -28, rx: 37, ry: 48, from: .97, sweep: -2.55 },
    dash: { x: 1, y: -30, rx: 61, ry: 18, from: 2.85, sweep: -2.98 }
  };
  function frameFor(actor, meta, gentle = false) {
    const key = meta.animations[actor.action]?.length ? actor.action : 'idle';
    const sequence = meta.animations[key];
    if (!sequence?.length) return 0;
    if (gentle) {
      if (key === 'idle' || key === 'run' || key === 'walk') return sequence[0];
      if (key === 'death') return sequence.at(-1);
      return sequence[Math.floor(sequence.length / 2)];
    }
    const times = meta.durations?.[key];
    const step = defaultTiming[key] || 130;
    const weights = Array.isArray(times) && times.length === sequence.length ? times : null;
    const duration = weights ? weights.reduce((sum, ms) => sum + ms, 0) : step * sequence.length;
    const elapsed = Math.max(0, actor.elapsed || 0) * 1000;
    const position = key === 'idle' || !Number.isFinite(actor.progress)
      ? elapsed % duration : clamp01(actor.progress) * duration;
    if (!weights) return sequence[Math.min(sequence.length-1, Math.floor(position / step))];
    let accumulated = 0;
    for (let i=0; i<sequence.length; i++) {
      accumulated += weights[i];
      if (position < accumulated) return sequence[i];
    }
    return sequence.at(-1);
  }
  function geometry(actor, asset, scale, gentle = false) {
    const meta = asset.meta;
    const key = meta.animations[actor.action]?.length ? actor.action : 'idle';
    const frame = frameFor(actor, meta, gentle);
    const pivot = meta.pivot || [64,116];
    const b = meta.bounds?.[frame] || [0,0,meta.cell,meta.cell];
    const flip = actor.direction !== (meta.facing ?? 1);
    const x = Math.round(actor.x), y = Math.round(actor.y);
    const left = flip ? pivot[0] - b[2] : b[0] - pivot[0];
    const right = flip ? pivot[0] - b[0] : b[2] - pivot[0];
    return {frame,key,x,y,flip,rect:[x+left*scale,y+(b[1]-pivot[1])*scale,x+right*scale,y+(b[3]-pivot[1])*scale]};
  }
  function sprite(ctx, actor, asset, scale, gentle) {
    const {frame,x,y,flip} = geometry(actor,asset,scale,gentle);
    const {cell,columns,pivot=[64,116]} = asset.meta;
    ctx.save();
    ctx.globalAlpha *= clamp01(actor.alpha ?? 1);
    ctx.translate(x,y);
    ctx.scale(flip ? -scale : scale,scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(asset.image,(frame % columns)*cell,Math.floor(frame/columns)*cell,cell,cell,-pivot[0],-pivot[1],cell,cell);
    ctx.restore();
  }
  function path(ctx, points, color) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for(let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();
    ctx.fillStyle=color;
    ctx.fill();
  }
  function ribbon(ctx,shape,start,end,width,color,offset=0) {
    // A tapered strip follows the blade sweep. Cut back into its trailing edge for flame tongues.
    const outer=[],inner=[],segments=20;
    for(let i=0;i<=segments;i++){
      const t=i/segments, angle=shape.from + shape.sweep*(start+(end-start)*t);
      const taper=Math.sin(t*Math.PI)**.56;
      const tooth=(i%5===1 ? 1.7 : i%5===2 ? 1.2 : .62);
      const thickness=width*taper*tooth;
      const x=Math.cos(angle), y=Math.sin(angle);
      outer.push([shape.x+x*(shape.rx+offset),shape.y+y*(shape.ry+offset)]);
      inner.push([shape.x+x*(shape.rx+offset-thickness),shape.y+y*(shape.ry+offset-thickness)]);
    }
    path(ctx,outer.concat(inner.reverse()),color);
  }
  function bladeTrail(ctx,move,progress,level) {
    if(progress<.16 || progress>.96) return;
    const shape=moveShape[move],p=clamp01((progress-.16)/.8);
    const head=Math.min(1,p*1.57), tail=Math.max(0,1-(1-p)*1.8);
    if(head-tail<.02)return;
    ctx.globalAlpha *= Math.min(1,(1-p)*4)*.91;
    ribbon(ctx,shape,tail,head,level==='full'?10:5,level==='full'?fire.scarlet:fire.orange);
    if(level==='full'){
      ribbon(ctx,shape,tail+.04*(head-tail),head,5.4,fire.orange,-1.5);
      ribbon(ctx,shape,tail+.18*(head-tail),head,1.85,fire.core,-2);
      const n=5;
      for(let i=0;i<n;i++){
        const t=(i+.5)/n,angle=shape.from+shape.sweep*(tail+t*(head-tail));
        const gap=3+(i%3)*3+p*8;
        const x=Math.round(shape.x+Math.cos(angle)*(shape.rx+gap));
        const y=Math.round(shape.y+Math.sin(angle)*(shape.ry+gap));
        if((i+1)/n<p-.12)continue;
        path(ctx,[[x,y-2],[x+3,y],[x,y+2],[x-2,y]],i%2?fire.gold:fire.orange);
      }
    }
  }
  function ring(ctx,x,y,rx,ry,color,width=1.5) {
    ctx.beginPath();
    ctx.ellipse(x,y,rx,ry,0,0,turn);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  // Each new demon has a recognizable anticipation cue; the charge stays local to its sprite.
  function tell(ctx,id,t,level,color) {
    if(t<.12)return;
    const pulse=Math.sin(Math.PI*t),small=level==='subtle';
    ctx.globalAlpha*=.36+.5*pulse;
    if(id==='bell'){
      const n=small?1:2;
      for(let i=0;i<n;i++)ring(ctx,0,-23,16+t*14+i*5,4+t*2+i,color);
    }else if(id==='moth'||id==='pack2'){
      for(const sign of [-1,1]){
        const x=sign*(15+t*9),y=-37-t*5;
        path(ctx,[[x,y],[x+sign*5,y-6],[x+sign*4,y+2],[x,y+4]],color);
      }
    }else if(id==='foxfire'){
      for(let i=0;i<(small?1:3);i++){
        const a=-1.6+i*1.8+t*1.1;
        const x=Math.cos(a)*23,y=-29+Math.sin(a)*13;
        path(ctx,[[x,y+4],[x-3,y+1],[x+2,y-6],[x+2,y-2],[x+4,y+1]],color);
      }
    }else if(id==='oni'||id==='pink'||id==='pack4'){
      for(const sign of [-1,1]){
        const x=sign*(15+t*10);
        path(ctx,[[x,-2],[x+sign*8,-4],[x+sign*4,-6],[x+sign*9,-9],[x,-6]],color);
      }
    }else {
      for(let i=0;i<(small?1:3);i++){
        const x=12+i*6, y=-32+i*7;
        path(ctx,[[x,y],[x+5,y-3],[x+2,y+2]],color);
      }
    }
  }
  function shadow(ctx,actor,world,foe) {
    if(actor.alpha<=0)return;
    const scale=world.scale, height=Math.max(0,world.ground-actor.y)/scale;
    const width=(foe?16:13)*scale*Math.max(.45,1-height/150);
    ctx.save();ctx.globalAlpha*=.16*(actor.alpha??1)/(1+height/90);
    ctx.fillStyle='#312021';
    ctx.beginPath();ctx.ellipse(actor.x,world.ground+.75*scale,width,2.1*scale,0,0,turn);ctx.fill();ctx.restore();
  }
  function inSpace(ctx,actor,scale,draw) {
    ctx.save();ctx.translate(Math.round(actor.x),Math.round(actor.y));ctx.scale(actor.direction*scale,scale);
    ctx.globalAlpha*=clamp01(actor.alpha??1);draw();ctx.restore();
  }
  function draw(ctx,world,assets) {
    if(!world.hero || !world.settings.enabled)return;
    const hero=world.hero, enemy=world.enemy, scale=world.scale, fx=world.settings.fx;
    const effects=!world.gentle && fx!=='off',battle=world.battle;
    const demonColor=enemy && (typeof PatrolEngine!=='undefined' ? PatrolEngine.species[enemy.id]?.color : null) || '#c583a8';
    shadow(ctx,hero,world,false);if(enemy)shadow(ctx,enemy,world,true);
    if(effects && enemy && battle?.phase==='tell') {
      inSpace(ctx,enemy,scale,()=>tell(ctx,enemy.id,clamp01(battle.time/Math.max(.01,battle.duration)),fx,demonColor));
    }
    if(effects && moveShape[hero.action]){
      inSpace(ctx,hero,scale,()=>bladeTrail(ctx,hero.action,hero.progress,fx));
    }
    if(enemy && assets[enemy.id]) sprite(ctx,enemy,assets[enemy.id],scale,world.gentle);
    if(assets[hero.id])sprite(ctx,hero,assets[hero.id],scale,world.gentle);
    if(effects && enemy?.action==='hurt' && enemy.elapsed<.24){
      inSpace(ctx,enemy,scale,()=>{
        const p=clamp01(enemy.elapsed/.24);ctx.globalAlpha*=(1-p)*.9;
        for(let i=0;i<(fx==='subtle'?3:7);i++){
          const a=-2.55+i*1.08,d=4+p*10;
          const x=Math.cos(a)*d,y=-29+Math.sin(a)*d;
          const tip=4+(1-p)*(i%2?7:4);
          path(ctx,[[x,y],[x+Math.cos(a)*tip,y+Math.sin(a)*tip],[x+Math.sin(a)*1.5,y-Math.cos(a)*1.5]],i%2?fire.gold:fire.core);
        }
      });
    }
  }
  return {frameFor,geometry,draw};
})();
if(typeof module!=='undefined' && module.exports)module.exports=PatrolDraw;
