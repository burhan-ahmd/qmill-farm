#!/usr/bin/env python3
"""Build a designed Shorts thumbnail: character cut out, put on a made
background, with stacked text. Not a video frame with a word on it.

YouTube recommends 2160 x 3840 (9:16), JPG or PNG, for a Shorts custom
thumbnail. That is what this writes, plus a twelfth-scale preview, which is the
size the thumbnail is actually judged at.

    python3 tools/make_thumbnail.py --video videos/<slug>/<slug>.mp4 --time 3.9 \
        --kicker "1906" --text "A USED|UNIFORM" --bg burst \
        --out videos/<slug>/thumbnail.jpg

    python3 tools/make_thumbnail.py --cutout hero.png --text "WHY?" --bg grid --out t.jpg

The cutout step reads this channel's art style: flat saturated characters with
thick black outlines, standing in a desaturated, slightly blurred set. If a
frame will not cut cleanly, render the character over a plain background and
pass it with --cutout, or pass --no-cut to keep the frame as a backdrop.

Needs Pillow, numpy and scipy; --video also needs ffmpeg on PATH.
"""
import argparse, math, os, shutil, subprocess, sys, tempfile

try:
    import numpy as np
    from scipy import ndimage as ndi
    from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
except ImportError:
    sys.exit("Needs Pillow, numpy and scipy:  pip install pillow numpy scipy")

W, H = 2160, 3840
BLUE = (0, 168, 255)
DEEP = (10, 22, 70)
YELL = (255, 196, 0)
INK = (12, 12, 12)
SIDE = 0.06
TOP_UI = 0.05
BOTTOM_UI = 0.16          # YouTube lays the title and channel over the bottom

FONTS = [
    "C:/Windows/Fonts/impact.ttf", "C:/Windows/Fonts/ariblk.ttf",
    "/System/Library/Fonts/Supplemental/Impact.ttf",
    "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
ACCENTS = {"yellow": YELL, "blue": BLUE, "white": (255, 255, 255), "red": (235, 60, 50)}


def find_font(user):
    for p in ([user] if user else []) + FONTS:
        if p and os.path.exists(p):
            return p
    sys.exit("No heavy font found. Pass --font with a path to a bold TTF.")


def grab(video, t):
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH.")
    out = os.path.join(tempfile.mkdtemp(), "f.png")
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", video,
                        "-frames:v", "1", out], capture_output=True, text=True)
    if r.returncode or not os.path.exists(out):
        sys.exit(f"Could not read a frame at {t}s\n{r.stderr.strip()}")
    return Image.open(out).convert("RGB")


# ----------------------------------------------------------------- cutout
def fill_holes(mask, max_frac=0.45):
    """Fill a face, eyes and buttons, but never the gap between two legs.

    binary_fill_holes closes that gap too and drags the floor in with it. A face
    is an enclosed hole in the middle of the body; the gap between legs is also
    enclosed, but it opens downward and so its bottom edge sits on the bottom of
    the character. That is the rule used here. Sizes are measured against the
    character, not the frame, because a face is large in a close-up.
    """
    holes = ~mask
    lab, n = ndi.label(holes)
    if not n:
        return mask
    ys, xs = np.where(mask)
    if not len(ys):
        return mask
    body_bottom = ys.max()
    out = mask.copy()
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    limit = max_frac * mask.sum()
    objs = ndi.find_objects(lab)
    for k, size in zip(range(1, n + 1), ndi.sum(holes, lab, range(1, n + 1))):
        if k in border or size >= limit:
            continue
        sl = objs[k - 1]
        if sl is None:
            continue
        if body_bottom - sl[0].stop < 0.04 * mask.shape[0]:
            continue                      # opens at the feet: a gap, not a face
        out |= (lab == k)
    return out


def cut_character(im, keep=1, feather=4):
    a = np.asarray(im.convert("RGB")).astype(float) / 255.
    g = a.mean(2)
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / (mx + 1e-6)
    core = sat > 0.42                                  # flat saturated fills
    ink = g < 0.25                                     # thick black outlines
    near = ndi.binary_dilation(core, iterations=10)
    m = core | (ink & near)                            # outlines that hug a fill
    m = ndi.binary_closing(m, structure=np.ones((5, 5)))
    m = fill_holes(m)
    lab, n = ndi.label(m)
    if n:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        order = np.argsort(sizes)[::-1]
        picked = np.zeros_like(m)
        for k in order[:keep]:
            if sizes[k] >= 0.01 * m.size:
                picked |= (lab == k + 1)
        if picked.any():
            m = picked
    m = fill_holes(m)
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(feather))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out, float(m.mean())


# ------------------------------------------------------------- backgrounds
def bg_burst(cx=0.5, cy=0.46):
    img = Image.new("RGB", (W, H), DEEP)
    d = ImageDraw.Draw(img)
    px, py, r, n = W * cx, H * cy, H * 1.3, 26
    for k in range(0, n, 2):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        d.polygon([(px, py), (px + r * math.cos(a0), py + r * math.sin(a0)),
                   (px + r * math.cos(a1), py + r * math.sin(a1))], fill=(22, 44, 120))
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((px - W * .42, py - W * .42, px + W * .42, py + W * .42), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(W * 0.14))
    return Image.composite(Image.new("RGB", (W, H), BLUE), img, glow.point(lambda v: v * 0.45 // 1))


def bg_grid():
    img = Image.new("RGB", (W, H), (16, 16, 18))
    d = ImageDraw.Draw(img)
    hz = H * 0.46
    d.rectangle((0, 0, W, hz), fill=(26, 26, 30))
    for i in range(-14, 15):                       # perspective lines to the horizon
        d.line([(W / 2 + i * W * 0.16, H), (W / 2 + i * W * 0.012, hz)], fill=(70, 70, 78), width=5)
    y, step = hz, H * 0.012
    while y < H:
        d.line([(0, y), (W, y)], fill=(70, 70, 78), width=4)
        step *= 1.32
        y += step
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W * .1, hz - W * .3, W * .9, hz + W * .3), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(W * 0.10))
    return Image.composite(Image.new("RGB", (W, H), (210, 215, 225)), img, glow.point(lambda v: v * 0.5 // 1))


def bg_split(accent):
    img = Image.new("RGB", (W, H), DEEP)
    d = ImageDraw.Draw(img)
    d.polygon([(0, H * 0.30), (W, H * 0.12), (W, H), (0, H)], fill=accent)
    d.polygon([(0, H * 0.335), (W, H * 0.155), (W, H * 0.20), (0, H * 0.38)], fill=(255, 255, 255))
    return img


def bg_blur(frame):
    im = frame.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(W * 0.02))
    im = ImageEnhance.Brightness(im).enhance(0.55)
    return ImageEnhance.Color(im).enhance(0.7)


def vignette(img, strength=0.5):
    g = Image.new("L", (W, H), 0)
    pad = int(W * 0.30)
    ImageDraw.Draw(g).ellipse((-pad, -pad, W + pad, H + pad), fill=255)
    g = g.filter(ImageFilter.GaussianBlur(W * 0.16))
    return Image.composite(img, Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), strength), g)


# ------------------------------------------------------------------ text
def metrics(path, size):
    sw = max(int(size * 0.12), 2)
    off = max(int(sw * 1.5), 8)
    return ImageFont.truetype(path, size), sw, off


def fit_line(d, text, path, maxw, start):
    size = start
    while size > 36:
        f, sw, off = metrics(path, size)
        b = d.textbbox((0, 0), text, font=f, stroke_width=sw)
        if (b[2] - b[0]) + off <= maxw:
            return f, sw, off, b
        size -= 6
    f, sw, off = metrics(path, 36)
    return f, sw, off, d.textbbox((0, 0), text, font=f, stroke_width=sw)


def draw_line(d, text, font, sw, off, x, y, fill, shadow):
    d.text((x + off, y + off), text, font=font, fill=shadow, stroke_width=sw, stroke_fill=INK)
    for i in range(off - 1, 0, -1):
        d.text((x + i, y + i), text, font=font, fill=shadow, stroke_width=sw, stroke_fill=shadow)
    d.text((x, y), text, font=font, fill=fill, stroke_width=sw, stroke_fill=INK)


def main():
    a = argparse.ArgumentParser()
    src = a.add_mutually_exclusive_group(required=True)
    src.add_argument("--video")
    src.add_argument("--frame")
    src.add_argument("--cutout", help="PNG that already has a transparent background")
    a.add_argument("--time", type=float, default=0.0)
    a.add_argument("--text", required=True, help='Lines split by "|". 2-4 words a line.')
    a.add_argument("--kicker", default="", help="small line above, e.g. a year or a label")
    a.add_argument("--out", required=True)
    a.add_argument("--bg", choices=["burst", "grid", "split", "blur"], default="burst")
    a.add_argument("--accent", choices=list(ACCENTS), default="yellow")
    a.add_argument("--keep", type=int, default=1, help="how many characters to cut out")
    a.add_argument("--no-cut", action="store_true", help="keep the frame as the backdrop")
    a.add_argument("--hero", type=float, default=0.56, help="character height as a share of the canvas")
    a.add_argument("--hero-x", type=float, default=0.5)
    a.add_argument("--font")
    a.add_argument("--guides", action="store_true")
    args = a.parse_args()

    for p in (args.frame, args.video, args.cutout):
        if p and not os.path.exists(p):
            sys.exit(f"No file at {p}")

    font_path = find_font(args.font)
    accent = ACCENTS[args.accent]

    # ---- hero
    covered = None
    if args.cutout:
        hero = Image.open(args.cutout).convert("RGBA")
    else:
        frame = grab(args.video, args.time) if args.video else Image.open(args.frame).convert("RGB")
        if args.no_cut:
            hero = None
        else:
            hero, covered = cut_character(frame, keep=args.keep)
            if covered < 0.02:
                print("  ! The cutout found almost nothing. Pick another frame, or pass "
                      "--cutout with a character rendered over a plain background.")

    # ---- background
    if args.bg == "blur":
        src_frame = Image.open(args.cutout).convert("RGB") if args.cutout else (
            grab(args.video, args.time) if args.video else Image.open(args.frame).convert("RGB"))
        bg = bg_blur(src_frame)
    elif args.bg == "grid":
        bg = bg_grid()
    elif args.bg == "split":
        bg = bg_split(accent)
    else:
        bg = bg_burst()
    canvas = bg.convert("RGBA")

    # ---- place the hero, with a rim and a shadow so it lifts off the background
    if hero is not None:
        box = hero.getbbox()
        if box:
            hero = hero.crop(box)
        scale = (H * args.hero) / hero.height
        hero = hero.resize((max(int(hero.width * scale), 1), int(H * args.hero)), Image.LANCZOS)
        hx = int(W * args.hero_x - hero.width / 2)
        hy = int(H * (1 - 0.02) - hero.height)

        al = hero.split()[3]
        rim_r = max(int(W * 0.012), 6)
        rim = al.filter(ImageFilter.MaxFilter(rim_r * 2 + 1)).filter(ImageFilter.GaussianBlur(rim_r * 0.4))
        rim_img = Image.new("RGBA", hero.size, (255, 255, 255, 0))
        rim_img.putalpha(rim)
        rim_img = Image.composite(Image.new("RGBA", hero.size, (255, 255, 255, 255)),
                                  Image.new("RGBA", hero.size, (255, 255, 255, 0)), rim)
        shadow = Image.new("RGBA", hero.size, (0, 0, 0, 0))
        shadow.putalpha(al.filter(ImageFilter.GaussianBlur(W * 0.02)))
        canvas.alpha_composite(shadow, (hx + int(W * 0.012), hy + int(W * 0.012)))
        canvas.alpha_composite(rim_img, (hx, hy))
        canvas.alpha_composite(hero, (hx, hy))

    canvas = vignette(canvas.convert("RGB"), 0.45).convert("RGBA")

    # ---- text block, stacked, biggest line in the accent colour
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    maxw = int(W * (1 - 2 * SIDE))
    lines = [l.strip() for l in args.text.upper().split("|") if l.strip()]
    if not lines:
        sys.exit("--text was empty.")
    if sum(len(l.split()) for l in lines) > 6:
        print("  ! More than 6 words. Nobody reads a sentence at thumbnail size.")

    y = H * TOP_UI
    if args.kicker:
        kf, ksw, koff = metrics(font_path, int(H * 0.030))
        kb = d.textbbox((0, 0), args.kicker.upper(), font=kf, stroke_width=ksw)
        draw_line(d, args.kicker.upper(), kf, ksw, koff, (W - (kb[2] - kb[0])) / 2 - kb[0],
                  y - kb[1], (255, 255, 255), BLUE)
        y += (kb[3] - kb[1]) + H * 0.016

    big = max(range(len(lines)), key=lambda i: len(lines[i]))
    for i, line in enumerate(lines):
        cap = int(H * (0.105 if i == big else 0.082))
        f, sw, off, b = fit_line(d, line, font_path, maxw, cap)
        x = (W - (b[2] - b[0])) / 2 - b[0]
        draw_line(d, line, f, sw, off, x, y - b[1],
                  accent if i == big else (255, 255, 255), INK if i == big else accent)
        y += (b[3] - b[1]) + H * 0.012

    if y > H * (1 - BOTTOM_UI):
        print("  ! The text runs into the bottom strip YouTube covers with the title. "
              "Use fewer words or shorter lines.")

    out = Image.alpha_composite(canvas, layer).convert("RGB")

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    q = 92
    while True:
        out.save(args.out, quality=q, subsampling=0, optimize=True)
        if os.path.getsize(args.out) <= 2_000_000 or q <= 60:
            break
        q -= 6

    small_path = os.path.splitext(args.out)[0] + "_small.png"
    out.resize((W // 12, H // 12), Image.LANCZOS).save(small_path)

    if args.guides:
        g = out.copy()
        gd = ImageDraw.Draw(g, "RGBA")
        gd.rectangle((0, 0, W, H * TOP_UI), fill=(255, 0, 0, 70))
        gd.rectangle((0, H * (1 - BOTTOM_UI), W, H), fill=(255, 0, 0, 70))
        g.save(os.path.splitext(args.out)[0] + "_guides.png")

    print(f"\n  {args.out}")
    print(f"  size        {W} x {H}   file {os.path.getsize(args.out)/1024:.0f} KB (q{q})")
    if covered is not None:
        print(f"  cutout      character covers {covered*100:.0f}% of the source frame")
    print(f"  background  {args.bg}        accent {args.accent}")
    print(f"  preview     {small_path}  <- judge it at THAT size, not full size.")
    print("              If the words are not instantly readable there, use fewer.\n")


if __name__ == "__main__":
    main()
