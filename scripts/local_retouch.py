"""Offline experimental retouch baseline. No requests/uploads; never overwrites sources.

Automatic masks are proposals, NOT semantic proof that every nipple was found.
Only compact dark marks are eligible; large structures and skin boundaries are locked.
"""
import argparse
import json
import time
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / 'private-retouch'

def read(path):
    with Image.open(path) as im:
        return np.array(ImageOps.exif_transpose(im).convert('RGB'))

def ellipse(n):
    n = max(3, int(n) | 1)
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n,n))

def masks(rgb):
    h,w = rgb.shape[:2]
    scale = min(1, 1400/max(h,w))
    small = cv2.resize(rgb, (round(w*scale), round(h*scale)), interpolation=cv2.INTER_AREA)
    sh,sw = small.shape[:2]
    f = small.astype(np.float32)
    gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    # Suppress sub-pixel pores / compression grain before selecting lesions.
    detection = cv2.GaussianBlur(gray, (5,5), 1.1)
    # Color gate isolates skin from the gray/blue clinic backdrop. No background replacement.
    skin = ((f[:,:,0]-f[:,:,2]>8)&(f[:,:,0]-f[:,:,1]>3)&(gray>45)).astype('uint8')*255
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, ellipse(13))
    n,labels,stats,_ = cv2.connectedComponentsWithStats(skin)
    keep = np.zeros(n, dtype=np.uint8)
    for k in range(1,n):
        if stats[k,cv2.CC_STAT_AREA] > sh*sw*.02: keep[k]=255
    skin = keep[labels]
    # Preserve silhouette and all non-skin pixels, with an inward safety margin.
    interior = cv2.erode(skin, ellipse(19))
    protected = 255-interior
    # Broad contrast marks include nipples/navel/axillary folds. Protect them before spot detection.
    broad = cv2.morphologyEx(detection, cv2.MORPH_BLACKHAT, ellipse(91))
    large = ((broad>19)&(skin>0)).astype('uint8')*255
    large = cv2.morphologyEx(large, cv2.MORPH_CLOSE, ellipse(7))
    n,ll,st,_ = cv2.connectedComponentsWithStats(large)
    structure = np.zeros_like(gray)
    for k in range(1,n):
        x,y,bw,bh,area = st[k]
        if area>330 or max(bw,bh)>60:
            structure[ll==k]=255
    structure = cv2.dilate(structure, ellipse(25))
    # Preserve long skin folds / breast creases before isolated-spot reconstruction.
    ridge = (cv2.morphologyEx(detection, cv2.MORPH_BLACKHAT, ellipse(41))>5).astype('uint8')*255
    curves=np.zeros_like(gray)
    for angle in (-30,-15,0,15,30,60,90):
        kernel=np.zeros((51,51),np.uint8)
        rad=np.deg2rad(angle)
        dx,dy=int(24*np.cos(rad)),int(24*np.sin(rad))
        cv2.line(kernel,(25-dx,25-dy),(25+dx,25+dy),1,1)
        curves=cv2.bitwise_or(curves,cv2.morphologyEx(ridge,cv2.MORPH_OPEN,kernel))
    structure=cv2.bitwise_or(structure,cv2.dilate(curves,ellipse(15)))
    protected = cv2.bitwise_or(protected, structure)
    # Local dark spots, in several sizes, without smoothing all skin.
    fine = cv2.morphologyEx(detection, cv2.MORPH_BLACKHAT, ellipse(17))
    medium = cv2.morphologyEx(detection, cv2.MORPH_BLACKHAT, ellipse(33))
    raw = (((fine>10)|(medium>13))&(interior>0)&(protected==0)).astype('uint8')*255
    raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, ellipse(3))
    n,ll,st,_ = cv2.connectedComponentsWithStats(raw)
    selected = np.zeros_like(raw)
    count = 0
    for k in range(1,n):
        x,y,bw,bh,area=st[k]
        if 9<=area<=330 and max(bw,bh)<=45:
            selected[ll==k]=255
            count+=1
    selected = cv2.dilate(selected,ellipse(5))
    selected[protected>0]=0
    full_protected=cv2.resize(protected,(w,h),interpolation=cv2.INTER_NEAREST)
    full_mask=cv2.resize(selected,(w,h),interpolation=cv2.INTER_NEAREST)
    full_mask[full_protected>0]=0
    return full_mask,full_protected,count

def process(entry, out):
    started=time.time()
    rgb=read(entry['source'])
    mask,protected,count=masks(rgb)
    # Full-resolution reconstruction and hard composition: zero change outside eligible mask.
    restored=cv2.inpaint(rgb,mask,max(3,round(max(rgb.shape[:2])/1400*3)),cv2.INPAINT_TELEA)
    result=rgb.copy()
    result[mask>0]=restored[mask>0]
    delta=np.any(result!=rgb,axis=2)
    assert not np.any(delta[protected>0]), 'Protected pixels changed'
    assert not np.any(delta[mask==0]), 'Pixels outside mask changed'
    dest=out/entry['id']
    dest.mkdir(parents=True,exist_ok=True)
    Image.fromarray(result).save(dest/'retouched.png')
    Image.fromarray(rgb).save(dest/'original.png')
    Image.fromarray(mask).save(dest/'edit-mask.png')
    Image.fromarray(protected).save(dest/'protected-mask.png')
    # Export diagnostic side-by-side, not a clinical before/after presentation.
    overlay=rgb.copy()
    overlay[mask>0]=(0.35*overlay[mask>0]+0.65*np.array([255,40,40])).astype('uint8')
    frames=[('ORIGINAL',rgb),('AUTOMATIC EXPERIMENT',result),('EDIT MASK (RED)',overlay)]
    refstats={}
    if entry.get('reference'):
        ref=read(entry['reference'])
        frames.append(('MANUAL REFERENCE',ref))
        refstats['reference_shape']=list(ref.shape)
        if ref.shape==rgb.shape:
            rd=np.max(np.abs(ref.astype('int16')-rgb.astype('int16')),axis=2)
            refstats['reference_changed_pixels_gt8']=int((rd>8).sum())
            refstats['reference_changed_on_auto_protection_gt8']=int(((rd>8)&(protected>0)).sum())
    board=Image.new('RGB',(420*len(frames),460),'white')
    draw=ImageDraw.Draw(board)
    for i,(label,arr) in enumerate(frames):
        thumb=Image.fromarray(arr); thumb.thumbnail((416,420))
        board.paste(thumb,(420*i+(420-thumb.width)//2,30))
        draw.text((420*i+8,8),label,fill='black')
    board.save(dest/'comparison.jpg',quality=92)
    report={'id':entry['id'],'status':'experimental_not_approved','candidate_components':count,'edited_pixels':int(delta.sum()),'edited_percent':round(100*delta.mean(),3),'protected_pixel_changes':int(delta[protected>0].sum()),'outside_mask_changes':int(delta[mask==0].sum()),'seconds':round(time.time()-started,2),**refstats}
    (dest/'metrics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--ids',nargs='+',required=True)
    parser.add_argument('--run',default='baseline-v1')
    args=parser.parse_args()
    if Path(args.run).name!=args.run: raise ValueError('run must be a directory name')
    out=PRIVATE/args.run
    if out.exists(): raise FileExistsError(f'Choose a new run name: {out}')
    entries=json.loads((PRIVATE/'inventory.json').read_text(encoding='utf-8'))
    chosen=[e for e in entries if e['id'] in args.ids]
    if len(chosen)!=len(set(args.ids)): raise ValueError('Unknown image id')
    out.mkdir(parents=True)
    reports=[]
    for entry in chosen:
        report=process(entry,out); reports.append(report); print(json.dumps(report),flush=True)
    (out/'report.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')

if __name__=='__main__': main()
