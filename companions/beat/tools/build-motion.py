"""Generate pixel-preserving, motion-compensated in-betweens from the reviewed source cels.
Run from any directory: python tools/build-motion.py (Pillow, SciPy, NumPy).
No sprites are downloaded. The original atlases remain unchanged.
"""
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates, uniform_filter, zoom

ROOT=Path(__file__).resolve().parents[1]/"assets"
RIDERS=('remix','classic','gum','combo','yoyo','corn','zero','poison','cube','garam','boogie','rhyth','jazz','clutch','rapid99','noise')
CYCLES={'skate','idle','dance','grind','boost','crossover','fishbrain','manual'}

def features(rgba):
    x=rgba.astype(np.float32)/255
    # Encode visible color and opacity separately so black outlines aren't confused with empty space.
    return np.concatenate((x[:,:,:3]*x[:,:,3:4],x[:,:,3:4]*.9),axis=2)
def sample(x,gy,gx,order=1):
    if x.ndim==2:
        return map_coordinates(x,(gy,gx),order=order,mode='constant',cval=0,prefilter=False)
    return np.stack([sample(x[:,:,ch],gy,gx,order) for ch in range(x.shape[2])],axis=-1)
def field(a,b):
    h,w=a.shape[:2]
    dy=dx=None
    for factor,radius,step in [(4,8,2),(2,3,1),(1,2,1)]:
        af=gaussian_filter(a,(factor*.30,factor*.30,0))[::factor,::factor]
        bf=gaussian_filter(b,(factor*.30,factor*.30,0))[::factor,::factor]
        gy,gx=np.indices(af.shape[:2],dtype=np.float32)
        if dy is None:
            dy=np.zeros_like(gy)
            dx=np.zeros_like(gx)
        else:
            dy=zoom(dy,2,order=1)[:gy.shape[0],:gy.shape[1]]*2
            dx=zoom(dx,2,order=1)[:gy.shape[0],:gy.shape[1]]*2
        best=np.full_like(gy,np.inf);v=dy.copy();u=dx.copy()
        for y in range(-radius,radius+1,step):
            for x in range(-radius,radius+1,step):
                warped=sample(bf,gy+dy+y,gx+dx+x)
                err=uniform_filter(np.mean(np.square(af-warped),axis=2),5)
                err+=.00016*(x*x+y*y)+.00004*((dx+x)**2+(dy+y)**2)
                keep=err<best
                best[keep]=err[keep];v[keep]=dy[keep]+y;u[keep]=dx[keep]+x
        dy=gaussian_filter(v,1.25)
        dx=gaussian_filter(u,1.25)
    return gaussian_filter(dy,1.9),gaussian_filter(dx,1.9)
def tween(a,b,flow,fraction,pivot,shift_limit=5):
    # Inverse-map a single cel. No cross-fading translucent duplicate limbs;
    # the second source takes over at the second in-between.
    gy,gx=np.indices(a.shape[:2],dtype=np.float32)
    dy,dx=flow
    iy,ix=gy.copy(),gx.copy()
    for _ in range(3):
        iy,ix=gy-fraction*sample(dy,iy,ix),gx-fraction*sample(dx,iy,ix)
    out=sample(a,iy,ix,0)
    yy,xx=np.nonzero(out[:,:,3])
    if not len(xx): return out,None
    # Keep the wheel/contact line registered to the existing pivot.
    shift=pivot[1]-int(yy.max())-1
    if abs(shift)>shift_limit or (shift<0 and yy.min()+shift<0): return out,None
    if shift:
        out=np.roll(out,shift,axis=0)
        if shift>0: out[:shift]=0
        else: out[shift:]=0
    return out,[int(xx.min()),int(yy.min()+shift),int(xx.max()+1),int(yy.max()+1+shift)]
def gap(a,b):
    fa,fb=features(a),features(b)
    size=max(1,np.count_nonzero(np.maximum(fa[:,:,3],fb[:,:,3])))
    return float(np.sum(np.abs(gaussian_filter(fa-fb,(1.15,1.15,0))))/size)
def package(rider):
    location=ROOT/rider
    meta=json.loads((location/"frames.json").read_text())
    atlas=np.asarray(Image.open(location/"sheet.png").convert("RGBA"))
    c=meta["cell"];k=meta["columns"]
    frames=[atlas[n//k*c:(n//k+1)*c,n%k*c:(n%k+1)*c].copy() for n in range(meta["count"])]
    pairs=set()
    for key, seq in meta["animations"].items():
        pairs.update(zip(seq,seq[1:]))
        if seq and key in CYCLES:pairs.add((seq[-1],seq[0]))
    entries={};cels=[];bounds=[];cache={}
    for i,j in sorted(pairs):
        a,b=frames[i],frames[j]
        if i==j or np.array_equal(a,b):continue
        for ii,jj in [(i,j),(j,i)]:
            if (ii,jj) not in cache:cache[ii,jj]=field(features(frames[ii]),features(frames[jj]))
        # Reviewed airborne poses have the wheels much higher while tucking.
        # Keep their body motion but register their wheels as for other cels.
        aerial={(7,8),(8,7)} if rider in {'clutch','corn'} else {(4,5),(5,7),(7,5)} if rider=='zero' else set()
        if rider in {'boogie','garam'}: aerial |= {(5,6),(6,7),(5,20),(20,7),(5,23),(23,7)}
        shift_limit=13 if (i,j) in aerial else 5
        first,fb=tween(a,b,cache[i,j],1/3,meta["pivot"],shift_limit)
        last,lb=tween(b,a,cache[j,i],1/3,meta["pivot"],shift_limit)
        direct=gap(a,b)
        # Retain a deliberately held/cut pose if interpolation doesn't reduce the
        # worst jump or drastically changes the amount of ink.
        steps=[gap(a,first),gap(first,last),gap(last,b)]
        sizes=[np.count_nonzero(x[:,:,3]) for x in [a,first,last,b]]
        if not fb or not lb or max(steps)>direct*.97 or min(sizes[1:3])<min(sizes[0],sizes[3])*.81 or max(sizes[1:3])>max(sizes[0],sizes[3])*1.19:
            continue
        entries[f'{i}:{j}']=[len(cels),len(cels)+1]
        cels += [first,last];bounds += [fb,lb]
    columns=min(10,max(1,len(cels)))
    sheet=Image.new('RGBA',(columns*c,max(1,(len(cels)+columns-1)//columns)*c))
    for n,pixels in enumerate(cels):sheet.paste(Image.fromarray(pixels),(n%columns*c,n//columns*c))
    # Nearest-neighbor remaps use the source palette exactly. Preserve it
    # losslessly rather than baking duplicate RGBA data into the userscript.
    array = np.asarray(sheet)
    colors, indexes=np.unique(array.reshape(-1,4),axis=0,return_inverse=True)
    if len(colors)<=256:
        bitmap=Image.fromarray(indexes.reshape(array.shape[:2]).astype(np.uint8)).convert('P')
        bitmap.putpalette(colors[:,:3].reshape(-1).tolist())
        bitmap.info['transparency']=colors[:,3].tobytes()
        bitmap.save(location/"motion.png",optimize=True)
    else:
        sheet.save(location/"motion.png",optimize=True)
    (location/"motion.json").write_text(json.dumps({'columns':columns,'bounds':bounds,'pairs':entries},separators=(',',':'))+'\n')
    return rider,len(entries),len(pairs)
if __name__=='__main__':
    with ProcessPoolExecutor(max_workers=4) as pool:
        for result in pool.map(package,sys.argv[1:] or RIDERS): print(*result,flush=True)
