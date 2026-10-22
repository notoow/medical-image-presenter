"""Read local clinical examples; keep all image artifacts in ignored private-retouch."""
import json
import argparse
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'private-retouch'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('folders', nargs='+', type=Path)
    args=parser.parse_args()
    OUT.mkdir(exist_ok=True)
    entries = []
    for case, folder in enumerate(args.folders, 1):
        originals = sorted(p for p in folder.iterdir() if p.suffix.lower() in {'.png', '.jpg', '.jpeg'})
        edits = {p.stem: p for p in folder.glob('*/*') if p.suffix.lower() in {'.png', '.jpg', '.jpeg'}}
        sheet = Image.new('RGB', (1000, ((len(originals)+3)//4)*290), 'white')
        draw = ImageDraw.Draw(sheet)
        for i, p in enumerate(originals):
            with Image.open(p) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                entry = {'id': f'case{case}-{i+1:02}', 'source': str(p), 'size': list(im.size), 'reference': str(edits[p.stem]) if p.stem in edits else None}
                entries.append(entry)
                im.thumbnail((246, 260))
                x, y = (i%4)*250, (i//4)*290
                sheet.paste(im, (x+(250-im.width)//2, y))
                draw.text((x+5,y+263), entry['id'] + (' paired' if entry['reference'] else ''), fill='black')
        sheet.save(OUT/f'case{case}-inventory.jpg')
    (OUT/'inventory.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'images':len(entries), 'paired':sum(bool(e['reference']) for e in entries), 'output':str(OUT)}))

if __name__ == '__main__':
    main()
