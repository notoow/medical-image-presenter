"""Local-only CLIPSeg anatomical/blemish segmentation experiment.

Download model files explicitly with --download before handling images. Inference
sets offline mode and loads only local files; no patient content leaves the PC.
"""
import argparse
import os
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MODEL=ROOT/'.tools'/'retouch-models'/'clipseg-rd64-refined'
PROMPTS=['the nipples', 'the areola', 'armpit hair', 'acne scars on skin', 'dark moles on skin']

def main():
    p=argparse.ArgumentParser();p.add_argument('--download',action='store_true');p.add_argument('--ids',nargs='+');a=p.parse_args()
    os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
    if a.download:
        from huggingface_hub import snapshot_download
        snapshot_download('CIDAS/clipseg-rd64-refined',token=False,local_dir=str(MODEL),allow_patterns=['*.json','*.txt','*.safetensors','*.bin'])
        print('Model files downloaded; no patient files accessed.');return
    if not a.ids: p.error('--ids is required for inference')
    os.environ['HF_HUB_OFFLINE']='1'
    os.environ['TRANSFORMERS_OFFLINE']='1'
    import torch
    import cv2
    import numpy as np
    from PIL import Image, ImageDraw
    from transformers import CLIPSegProcessor, CLIPSegForImageSegmentation
    from local_retouch import PRIVATE,read
    torch.set_num_threads(4)
    processor=CLIPSegProcessor.from_pretrained(str(MODEL),local_files_only=True)
    model=CLIPSegForImageSegmentation.from_pretrained(str(MODEL),local_files_only=True).eval()
    entries=json.loads((PRIVATE/'inventory.json').read_text(encoding='utf-8'))
    out=PRIVATE/'semantic-v1';out.mkdir(exist_ok=True)
    for e in entries:
        if e['id'] not in a.ids: continue
        image=Image.fromarray(read(e['source']))
        inputs=processor(text=PROMPTS,images=[image]*len(PROMPTS),padding=True,return_tensors='pt')
        with torch.inference_mode():
            probs=model(**inputs).logits.sigmoid().numpy()
        np.savez_compressed(out/(e['id']+'.npz'),probabilities=probs,prompts=PROMPTS)
        thumb=image.copy();thumb.thumbnail((350,400))
        board=Image.new('RGB',(350*(len(PROMPTS)+1),440),'white');draw=ImageDraw.Draw(board)
        board.paste(thumb,(0,30));draw.text((5,5),'ORIGINAL',fill='black')
        for i,(prompt,prob) in enumerate(zip(PROMPTS,probs),1):
            hm=cv2.resize(prob,thumb.size)
            heat=cv2.cvtColor(cv2.applyColorMap((hm*255).astype('uint8'),cv2.COLORMAP_JET),cv2.COLOR_BGR2RGB)
            blended=(np.array(thumb)*.5+heat*.5).astype('uint8')
            board.paste(Image.fromarray(blended),(350*i,30))
            draw.text((350*i+5,5),f'{prompt} max={prob.max():.2f}',fill='black')
        board.save(out/(e['id']+'.jpg'),quality=92)
        print(json.dumps({'id':e['id'],'max_probabilities':dict(zip(PROMPTS,[round(float(x.max()),3) for x in probs]))}),flush=True)

if __name__=='__main__':main()
