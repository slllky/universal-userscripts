// Optional local 45-second exhibition. AI earns points from the same engine events.
// Separate from persistent district score targets; no invented campaign unlocks.
const BeatRival=(()=>{
 class Match{
  constructor(Engine,player,rider,crew=false){
   this.Engine=Engine;this.crew=crew?[rider,...Object.keys(Engine.riders).filter(id=>id!==rider&&id!==player.settings.rider)].slice(0,3):[rider];this.leg=0;
   this.player=0;this.score=0;this.left=45;this.active=true;this.next=1;this.index=0;
   this.world=new Engine.World({...player.settings,rider,mode:'idle',ambient:false,partner:'off',tour:false,speed:1});
   this.world.resize(player.width,player.height);this.world.hero.x=this.world.boundX(player.width*.78);
   this.choose(rider);
  }
  choose(rider){
   const styles={beat:['jump','grind','spin'],gum:['crossover','grab','spin'],combo:['grind','circle','manual'],garam:['wallride','rocket','grind'],rhyth:['slalom','pivot','spin'],noise:['heelflip','grind','rewind'],cube:['stale','grind','grab'],boogie:['manual','dance','spin'],jazz:['crossover','pivot','grab'],clutch:['grind','soultransfer','jump'],rapid99:['heelflip','crossover','jump']};
   this.moves=(styles[rider]||['jump','grind','grab','spin','tag','crossover']).filter(id=>this.Engine.moves[id]);this.name=this.Engine.riders[rider];this.index=0;
  }
  event(e){if(this.active&&e.type==='bank'&&Number.isFinite(e.score))this.player+=Math.max(0,e.score);}
  step(dt,player){
   if(!this.active||!Number.isFinite(dt)||dt<=0)return;
   const elapsed=Math.min(.08,dt,this.left);this.left=Math.max(0,this.left-elapsed);
   this.world.resize(player.width,player.height);this.world.setReduced(player.gentle);
   this.world.apply({scale:player.settings.scale,motion:player.settings.motion,hidden:false});
   const leg=Math.min(this.crew.length-1,Math.floor((45-this.left)/15));
   if(leg>this.leg&&!this.world.trick){this.leg=leg;this.world.apply({rider:this.crew[leg]});this.choose(this.crew[leg]);this.next=.5;}
   this.next-=elapsed;
   if(this.next<=0&&!this.world.trick){this.world.perform(this.moves[this.index++%this.moves.length]);this.next=2.6;}
   this.world.step(elapsed);
   if(!this.world.trick&&this.world.combo.score)this.world.bank();
   for(const e of this.world.takeEvents())if(e.type==='bank')this.score+=e.score;
   if(this.left<=0)this.active=false;
  }
  result(){return {type:'rival-result',finished:!this.active&&this.left===0,crewSize:this.crew.length,player:this.player,opponent:this.score};}
  get actor(){return this.world.hero;}
  get text(){return this.active?`${Math.ceil(this.left)}s · You ${this.player} / ${this.name} ${this.score}${this.crew.length>1?' · rival relay '+(this.leg+1)+'/3':''} · bank combos to score`:`${this.player>this.score?'You win':this.player===this.score?'Draw':this.name+' wins'} · ${this.player}–${this.score}`;}
 }
 return {Match};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BeatRival;
