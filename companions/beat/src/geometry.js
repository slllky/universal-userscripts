// Opt-in, bounded geometric sampling. Never reads page text, URLs, form values or attributes.
const BeatGeometry=(()=>{
 const tags=new Set(['ARTICLE','SECTION','MAIN','ASIDE','HEADER','FOOTER','DIV','IMG','H1','H2','H3','UL','OL','TABLE','PRE']);
 function scan(doc,host,width,height,scale=1){
  if(!doc?.createTreeWalker||!doc.body)return [];
  const walker=doc.createTreeWalker(doc.body,1),out=[],seen=new Set();let node,visited=0,measured=0;
  while((node=walker.nextNode())&&visited++<400&&measured<48){
   if(node===host||host?.contains?.(node)||!tags.has(node.tagName)||node.contains?.(doc.activeElement))continue;
   if(node.isContentEditable||node.closest?.('input,textarea,select,button,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[hidden],[aria-hidden="true"]'))continue;
   measured++;let r;try{r=node.getBoundingClientRect();}catch{continue;}
   if(!r||![r.left,r.right,r.top,r.width,r.height].every(Number.isFinite))continue;
   const left=Math.max(64*scale,r.left),right=Math.min(width-64*scale,r.right),y=r.top;
   if(r.width<100*scale||r.height<16||right-left<72*scale||y<120*scale||y>height-24*scale)continue;
   const key=[Math.round(left/8),Math.round(right/8),Math.round(y/8)].join('/');if(seen.has(key))continue;
   seen.add(key);out.push({left,right,y});if(out.length===16)break;
  }
  return out;
 }
 return {scan};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BeatGeometry;
