"""Contact sheets for QA: tile many frames per image with frame-number labels.
Usage: python studio/scripts/contact_sheet.py <frame_dir> <out_dir> [step]
Frames must be named f_0001.png.. with f_XXXX = frame index / step (1-based, frame = (idx-1)*step).
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
STEP = int(sys.argv[3]) if len(sys.argv) > 3 else 4
COLS, ROWS = 7, 5          # 35 tiles per sheet
TW = 220                    # tile width; height keeps 1080x1920 aspect
TH = round(TW * 1920 / 1080)
files = sorted(f for f in os.listdir(src) if f.endswith(".png"))
font = ImageFont.truetype("studio/public/fonts/LilitaOne-Regular.ttf", 22)

os.makedirs(out, exist_ok=True)
per = COLS * ROWS
for s in range(0, len(files), per):
    chunk = files[s:s + per]
    sheet = Image.new("RGB", (COLS * TW + (COLS + 1) * 6, ROWS * TH + (ROWS + 1) * 26), (16, 16, 20))
    d = ImageDraw.Draw(sheet)
    for i, name in enumerate(chunk):
        idx = int(name[2:6])                       # f_0001 -> 1
        frame = (idx - 1) * STEP
        im = Image.open(os.path.join(src, name)).resize((TW, TH))
        cx, cy = i % COLS, i // COLS
        x = 6 + cx * (TW + 6); y = 26 + cy * (TH + 26)
        sheet.paste(im, (x, y))
        d.text((x + 4, y - 24), f"f{frame:04d}", font=font, fill=(255, 220, 90))
    n = s // per + 1
    sheet.save(os.path.join(out, f"dense_{n:02d}.png"))
    print(f"dense_{n:02d}.png: {len(chunk)} tiles (frames {(int(chunk[0][2:6])-1)*STEP}..{(int(chunk[-1][2:6])-1)*STEP})")
