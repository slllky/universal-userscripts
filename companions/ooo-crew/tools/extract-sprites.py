"""Pack selected animation frames from the supplied sheets; never redraw the characters.

Usage: python tools/extract-sprites.py /path/to/downloaded/sheets
Input filenames and hashes are recorded in assets/sources.json. Pillow, NumPy and SciPy are required.
The checked-in atlas is the build input; ordinary JS builds do not run this tool.
"""
import base64
import json
import math
import re
import sys
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from scipy.ndimage import label, find_objects

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
images = {}
frames = []
animations = {}
recipes = []
LOSSLESS = {4:'candy.png', 6:'lsp.png', 8:'finn.png', 9:'fionna-cake.png', 10:'princesses.png', 11:'bat-bug.png'}

def source(n):
    if n not in images:
        path = ROOT/'assets/source-sheets'/LOSSLESS[n] if n in LOSSLESS else SOURCE / f"sheet-{n}.{'png' if n == 7 else 'jpg'}"
        images[n] = Image.open(path).convert('RGBA')
    return images[n]

component_cache = {}

def clean(n, box):
    # Resolve the whole connected character from a selection window. Several supplied
    # sheets are NOT regular grids: fixed-size slicing chops off hands, basses and feet.
    if n not in component_cache:
        rgba=np.array(source(n)).copy()
        rgb=rgba[:,:,:3].astype(np.float32)
        bg={2:(1,19,127),3:(130,125,255),4:(154,235,105),5:(1,255,2),6:(154,235,105),8:(154,235,105),7:(0,0,0),9:tuple(rgba[-1,-1,:3]),10:(154,235,105),11:(0,0,0)}[n]
        if n in LOSSLESS:
            # Exact matte only. The old broad JPEG key also erased Finn's lime backpack.
            cut=np.all(rgba[:,:,:3]==bg,axis=2) if n!=11 else np.zeros(rgba.shape[:2],dtype=bool)
            if n == 6:
                # LSP's sheet uses this distinct palette entry solely for floor shadows.
                # Remove it BEFORE segmentation, including shadows ABOVE a selection row.
                cut|=np.all(rgba[:,:,:3]==(48,48,48),axis=2)
            rgba[:,:,3][cut]=0
        elif n != 7:
            cut=np.linalg.norm(rgb-np.array(bg),axis=2)<(76 if n in (4,6,8) else 90)
            if n == 5: cut|=(rgb[:,:,1]>110)&(rgb[:,:,1]>rgb[:,:,0]*1.55)&(rgb[:,:,1]>rgb[:,:,2]*1.55)
            rgba[:,:,3][cut]=0
            if n in (4,5,6,8):
                spill=(rgb[:,:,1]>np.maximum(rgb[:,:,0],rgb[:,:,2])+25)&(rgb.sum(axis=2)<270)
                rgba[:,:,1][spill]=np.minimum(rgb[:,:,1],np.maximum(rgb[:,:,0],rgb[:,:,2])+12)[spill].astype(np.uint8)
        labels,count=label(rgba[:,:,3]>0)
        sizes=np.bincount(labels.ravel())
        boxes=find_objects(labels)
        component_cache[n]=(rgba,labels,sizes,boxes)
    rgba,labels,sizes,boxes=component_cache[n]
    x0,y0,x1,y1=box
    overlap=np.bincount(labels[y0:y1,x0:x1].ravel(),minlength=len(sizes));overlap[0]=0
    main=int(overlap.argmax())
    if not main: raise ValueError(('No sprite',n,box))
    selected=[main]
    # Keep detached accessories that genuinely belong to the selected cell, not
    # slivers from the neighboring character or the small painted ground shadows.
    main_slice=boxes[main-1]
    for k in np.flatnonzero(overlap):
        if k==main or sizes[k]<max(10,sizes[main]*.035) or overlap[k]/sizes[k]<.8:continue
        sy,sx=boxes[k-1]
        is_shadow=n in (4,6,8) and sy.start>y0+(y1-y0)*.65 and sy.stop-sy.start<9 and sx.stop-sx.start>7
        if not is_shadow and sizes[k]<sizes[main]*.5:selected.append(int(k))
    sy0=min(boxes[k-1][0].start for k in selected);sy1=max(boxes[k-1][0].stop for k in selected)
    sx0=min(boxes[k-1][1].start for k in selected);sx1=max(boxes[k-1][1].stop for k in selected)
    crop=rgba[sy0:sy1,sx0:sx1].copy()
    crop[:,:,3][~np.isin(labels[sy0:sy1,sx0:sx1],selected)]=0
    image=Image.fromarray(crop)
    image.info['source_bbox']=[sx0,sy0,sx1,sy1]
    return image

def animation(key, n, boxes, height, ref_height=None):
    crops=[clean(n,b) for b in boxes]
    bounds=[c.getbbox() for c in crops]
    if not all(bounds): raise ValueError(key)
    ref_height=ref_height or max(b[3]-b[1] for b in bounds)
    ids=[]
    for box,im,bounds in zip(boxes,crops,bounds):
        im=im.crop(bounds)
        scale=height/ref_height
        im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.NEAREST)
        if im.width>120 or im.height>120: raise ValueError((key,im.size))
        frame=Image.new('RGBA',(128,128));frame.alpha_composite(im,((128-im.width)//2,120-im.height))
        ids.append(len(frames));frames.append(frame)
    animations[key]=ids
    recipes.append(dict(key=key,sheet=n,selectionWindows=boxes,resolvedBoxes=[im.info['source_bbox'] for im in crops],height=height,referenceHeight=ref_height))

def row(xs,y0,y1):
    return [(a,y0,b,y1) for a,b in zip(xs,xs[1:])]

# Finn's front idle, side walk, and running cycle; shadow and background excluded.
animation('finn.idle',8,row([5,38,70,103],3,49),62)
animation('finn.walk',8,row([3,38,70,108],50,94),62)
animation('finn.run',8,row([108,149,182,223,256],50,94),62)
animation('finn.cheer',8,row([108,148,182,216,255],3,49),62)
animation('lsp.idle',6,row([25,63,101,139],5,52),43)
animation('lsp.walk',6,row([25,63,101,139],57,96),43)
animation('lsp.cheer',6,row([143,191,233,274,319],5,52),43)
animation('lsp.dance',6,row([143,191,233,274,319],57,96),43)
animation('gunter.idle',5,row([59,91,122,152,183,213,244,275,306,337],231,268),37)
animation('gunter.walk',5,row([73,104,135,166,197,228,258,290],328,366),37)
animation('gunter.run',5,row([76,119,163,207,251,296,344],419,457),37)
animation('gunter.cheer',5,row([62,94,126,158,197,240,284,328,370,413,451,483,515],897,936),37)
animation('gunter.dance',5,row([62,94,126,159,198,234,274,322,360,392,420,449],968,1006),37)

# Transparent cartoon sheet: use one consistent costume for every Marceline action.
animation('marceline.idle',7,[(0,0,127,127),(127,0,254,127),(254,0,381,127)],77)
animation('marceline.walk',7,[(508,0,635,127),(635,0,762,127)],77)
animation('marceline.music',7,[(254,254,381,381),(381,254,508,381),(508,254,635,381),(127,508,254,635),(254,508,381,635),(381,508,508,635)],77,119)
animation('marceline.cheer',7,[(0,254,127,381),(127,254,254,381)],77)
animation('marceline.bat',7,[(127,381,254,508),(254,381,381,508)],56,84)

# A complete alternative Marceline style, selected explicitly in the character drawer.
animation('archive.idle',3,row([37,65,97,129,160,193,224,253],29,78),77)
animation('archive.walk',3,row([35,66,93,120,148,176,204,231],90,145),77)
animation('archive.music',3,row([5,43,84,121,163,219,275,332,383,431,480,526,569,606],816,867),77)
animation('archive.cheer',3,row([37,65,97],29,78),77)

animation('bubblegum.idle',2,[(152,4,185,59)],69)
animation('bubblegum.cheer',2,[(153,61,184,111)],64)
animation('flame.idle',10,[(55,546,89,616)],64)
animation('flame.walk',10,[(90,546,114,616)],64)
animation('banana.idle',4,[(15,279,54,343)],64)
animation('banana.walk',4,[(54,279,81,343)],64)
animation('corn.idle',4,[(5,3,47,55)],45)
animation('corn.walk',4,[(46,3,81,55)],45)

# New user-supplied sheets. Preserve their original opaque palette/alpha channels.
animation('fionna.idle',9,row([24,52,80,109],53,108),66)
animation('fionna.walk',9,row([23,52,80,110],161,214),66)
animations['fionna.run']=animations['fionna.walk']
animations['fionna.cheer']=animations['fionna.idle']
animation('cake.idle',9,row([13,50,80,110],272,309),40)
animation('cake.walk',9,row([13,50,80,110],345,383),40)
animations['cake.run']=animations['cake.walk']
animations['cake.cheer']=animations['cake.idle']
animation('wildberry.idle',10,[(47,3,83,52)],48)
animation('wildberry.walk',10,[(84,3,114,52)],48)
animation('slime.idle',10,[(54,52,84,89)],30)
animation('slime.walk',10,[(86,52,112,89)],30)
animation('hotdog.idle',10,[(39,91,72,130)],34)
animation('hotdog.walk',10,[(72,91,117,130)],28)
animation('muscle.idle',10,[(5,195,71,278)],78)
animation('muscle.walk',10,[(71,195,115,278)],78)
animation('turtle.idle',10,[(49,411,88,474)],54)
animation('turtle.walk',10,[(88,411,116,474)],54)
animation('batbug.idle',11,[(0,5,53,42),(42,20,105,52),(104,0,155,42)],27)
animations['batbug.walk']=animations['batbug.idle']
animations['batbug.cheer']=animations['batbug.idle']

# Reuse the original Jake's exact palette/RLE frames, including his special stretch body.
code=(SOURCE/'Jake-original.user.js').read_text()
palette=json.loads(re.search(r'const PALETTE = (\[.*?\]);',code).group(1))
packed=re.search(r'const PIXELS = `([\s\S]*?)`',code).group(1)
packed=re.sub(r'\s','',packed).replace('0A0XBQIFBwYLCtAN','0A0XBYIFBwYLCtAN')
pixels=[]
for b in base64.b64decode(packed): pixels.extend([tuple(palette[b&15])]*((b>>4)+1))
assert len(pixels)==320*32
jake=Image.new('RGBA',(320,32));jake.putdata(pixels)
jake.save(ROOT/'assets/jake.png',optimize=True)
ids=[]
for i in range(10):
    crop=jake.crop((i*32,0,(i+1)*32,32)).resize((58,58),Image.Resampling.NEAREST)
    frame=Image.new('RGBA',(128,128));frame.alpha_composite(crop,(35,62));ids.append(len(frames));frames.append(frame)
animations['jake.idle']=[ids[0]];animations['jake.walk']=ids[1:9];animations['jake.cheer']=[ids[9]]

cols=12; atlas=Image.new('RGBA',(cols*128,math.ceil(len(frames)/cols)*128))
for i,im in enumerate(frames):atlas.alpha_composite(im,((i%cols)*128,(i//cols)*128))
atlas.save(ROOT/'assets/crew.png',optimize=True)
(ROOT/'assets/frames.json').write_text(json.dumps(dict(cell=128,columns=cols,count=len(frames),bounds=[list(im.getbbox()) for im in frames],animations=animations),indent=2)+'\n')
(ROOT/'assets/extraction.json').write_text(json.dumps(recipes,indent=2)+'\n')

proof=Image.new('RGB',(1024,math.ceil(len(animations)/4)*140),'#e6dfc9');d=ImageDraw.Draw(proof)
for i,(key,ids) in enumerate(animations.items()):
    x=(i%4)*256;y=(i//4)*140
    d.text((x+6,y+4),key,fill='#223f38')
    proof.paste(frames[ids[0]],(x,y+10),frames[ids[0]])
    proof.paste(frames[ids[-1]],(x+120,y+10),frames[ids[-1]])
proof.save(SOURCE/'selected-frames.png')
print(f'{len(frames)} frames; {len(animations)} cycles; atlas {atlas.size}')
