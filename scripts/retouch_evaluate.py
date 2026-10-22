"""Independent visual landmark checks, never used as processing inputs.

Boxes/polylines are approximate human-reviewed test annotations on these examples,
not clinical segmentation ground truth. They prevent claiming automatic mask checks
prove anatomical preservation. No universal perfection metric is asserted.
"""
import json
import argparse
from pathlib import Path
import cv2
import numpy as np
from local_retouch import PRIVATE, read

# Coordinates normalized to original photo; evaluation only.
ANNOTATIONS={
 'case1-01': {'nipples':[[.285,.42,.345,.477],[.735,.42,.795,.48]],'crease':[[.23,.51],[.31,.55],[.40,.52]]},
 'case1-02': {'nipples':[[.218,.36,.265,.42],[.442,.411,.507,.475]]},
 'case1-03': {'nipples':[[.288,.399,.337,.458]]},
 'case1-09': {'nipples':[[.30,.415,.37,.475],[.695,.40,.775,.47]]},
 'case2-01': {'nipples':[[.14,.42,.25,.51],[.68,.44,.79,.52]],'crease':[[.18,.588],[.438,.557],[.759,.626]]},
 'case2-03': {'nipples':[[.22,.35,.31,.43]]},
 'case2-13': {'nipples':[[.33,.263,.405,.324],[.675,.28,.75,.34]],'crease':[[.24,.39],[.43,.38],[.68,.43]]},
}

def main():
    p=argparse.ArgumentParser();p.add_argument('--run',required=True);a=p.parse_args()
    if Path(a.run).name!=a.run: raise ValueError('Invalid run name')
    out=PRIVATE/a.run
    inventory={e['id']:e for e in json.loads((PRIVATE/'inventory.json').read_text(encoding='utf-8'))}
    results=[]
    for id,annotation in ANNOTATIONS.items():
        target=out/id/'retouched.png'
        if not target.exists(): continue
        orig=read(inventory[id]['source']); ret=read(target)
        h,w=orig.shape[:2];changed=np.any(orig!=ret,axis=2)
        nipple=np.zeros((h,w),np.uint8); crease=nipple.copy()
        for x1,y1,x2,y2 in annotation['nipples']:
            nipple[int(y1*h):int(y2*h),int(x1*w):int(x2*w)]=255
        if 'crease' in annotation:
            pts=np.array([[int(x*w),int(y*h)] for x,y in annotation['crease']],np.int32)
            cv2.polylines(crease,[pts],False,255,max(5,round(h*.015)))
        row={'id':id,'evaluation_only_nipple_box_changes':int(changed[nipple>0].sum()),'evaluation_only_crease_band_changes':int(changed[crease>0].sum()),'crease_annotated':'crease' in annotation,'annotation_quality':'approximate independent visual ROI, not expert pixel ground truth'}
        results.append(row)
    (out/'independent-evaluation.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(results,indent=2))

if __name__=='__main__':main()
