#!/usr/bin/env python3
"""Measure a render against the reference channel's look, instead of judging it.

"Does it have good lighting?" is a yes/no a builder can answer wrongly and move
on. These are numbers, taken from the 38 frames in references/frames/, and a
render that sits outside them looks flat next to the channel it is imitating.

    python3 tools/check_look.py work/<slug>/render/<slug>.mp4
    python3 tools/check_look.py some_still.jpg --sheet work/<slug>/look.jpg

Exits 1 when the look is outside the reference bands. Needs numpy, Pillow, and
ffmpeg for video input.
"""
import argparse, glob, os, shutil, subprocess, sys, tempfile

try:
    import numpy as np
    from PIL import Image
except ImportError:
    sys.exit("Needs numpy and Pillow:  pip install numpy pillow")

# Measured from references/frames/, grouped into the 20 shorts they came from,
# because a video is judged by its median and not by its palest single frame:
#   per-short median saturation  min 0.221  p10 0.312  med 0.520  max 0.634
#   per-short median luminance   min 0.118  p10 0.175  med 0.372  max 0.736
#   per-short dark share <18%    min 0.006  p10 0.020  med 0.248  max 0.623
# Saturation is the measure that holds across day, night, interior and exterior.
# Calibration: at 0.25, nineteen of the twenty reference shorts pass. The one
# that fails is the channel's palest (0.221), and it fails by a hair. The gate is
# tuned to how the channel usually looks, not to its washed-out outlier, because
# a video sitting at 0.21 is the problem this check exists to catch.
SAT_FAIL = 0.25
SAT_WARN = 0.38          # paler than roughly nine of every ten reference shorts
LUM_WARN = 0.74          # brighter than any reference short
DARK_WARN = 0.02         # less shadow than any reference short


def measure(img):
    im = img.convert("RGB")
    im.thumbnail((400, 720))
    a = np.asarray(im).astype(float) / 255.
    lum = a @ [0.2126, 0.7152, 0.0722]
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    return {
        "lum": float(np.percentile(lum, 50)),
        "dark": float((lum < 0.18).mean()),
        "sat": float(np.median(sat)),
        "contrast": float(np.percentile(lum, 95) - np.percentile(lum, 5)),
    }


def frames_from_video(path, n):
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH.")
    d = tempfile.mkdtemp()
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True).stdout.strip()
    try:
        dur = float(dur)
    except ValueError:
        dur = 60.0
    out = []
    for i in range(n):
        t = dur * (i + 0.5) / n
        p = os.path.join(d, f"{i:03d}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", path,
                        "-frames:v", "1", p], capture_output=True)
        if os.path.exists(p):
            out.append((t, Image.open(p)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", nargs="+", help="an mp4, or one or more still images")
    ap.add_argument("--frames", type=int, default=12, help="how many frames to sample from a video")
    ap.add_argument("--sheet", help="write a side-by-side against reference frames here")
    a = ap.parse_args()
    for p_ in a.input:
        if not os.path.exists(p_):
            sys.exit(f"No file at {p_}")
    if len(a.input) == 1 and a.input[0].lower().endswith((".mp4", ".mov", ".mkv", ".webm")):
        shots = frames_from_video(a.input[0], a.frames)
    else:
        shots = [(float(i), Image.open(p_)) for i, p_ in enumerate(a.input)]
    if not shots:
        sys.exit("Could not read any frames.")

    ms = [measure(im) for _, im in shots]
    med = {k: float(np.median([m[k] for m in ms])) for k in ms[0]}

    label = a.input[0] if len(a.input) == 1 else f"{len(a.input)} images"
    print(f"\n  {label}   ({len(shots)} frame(s) sampled)")
    print(f"  {'':18s}{'yours':>8s}{'reference':>12s}")
    print(f"  median saturation {med['sat']:8.3f}{0.520:12.3f}   fails under {SAT_FAIL}")
    print(f"  median luminance  {med['lum']:8.3f}{0.372:12.3f}")
    print(f"  dark share        {med['dark']:8.3f}{0.248:12.3f}")
    print(f"  contrast          {med['contrast']:8.3f}{0.682:12.3f}")

    fails, warns = [], []
    if med["sat"] < SAT_FAIL:
        fails.append(
            f"Saturation {med['sat']:.3f} is below {SAT_FAIL}. The reference channel's median "
            f"is 0.520 and even its palest short only reaches 0.221. This is what 'boring' "
            f"looks like as a number. Raise the albedo saturation in the light preset "
            f"(LOOK.sat, and the lit/shade colours), not the post grade alone.")
    elif med["sat"] < SAT_WARN:
        warns.append(f"Saturation {med['sat']:.3f} is paler than about nine of every ten "
                     f"reference shorts (their median is 0.520).")
    if med["lum"] > LUM_WARN:
        warns.append(
            f"Median luminance {med['lum']:.3f} is brighter than any reference short "
            f"(their brightest is 0.736). The frame sits mid-bright everywhere, so nothing "
            f"reads as lit and nothing reads as shadow: give the place a key direction and "
            f"let the far side fall off.")
    if med["dark"] < DARK_WARN:
        warns.append(
            f"Only {med['dark']*100:.1f}% of the frame is in real shadow; the reference median "
            f"is 25%. Add a dark wall top or ceiling, a vignette, and cast shadows from the key.")

    worst = sorted(range(len(ms)), key=lambda i: ms[i]["sat"])[:3]
    if len(shots) > 1:
        print("\n  flattest frames: " + ", ".join(f"{shots[i][0]:.1f}s (sat {ms[i]['sat']:.2f})" for i in worst))

    if a.sheet:
        refs = sorted(glob.glob(os.path.join("references", "frames", "*_0180.jpg")))[:3]
        if refs:
            tiles = [shots[worst[0]][1]] + [Image.open(r) for r in refs]
            w, h = 300, 533
            sheet = Image.new("RGB", (w * len(tiles) + 10 * (len(tiles) - 1), h), (18, 18, 18))
            for i, t in enumerate(tiles):
                sheet.paste(t.convert("RGB").resize((w, h)), (i * (w + 10), 0))
            os.makedirs(os.path.dirname(os.path.abspath(a.sheet)) or ".", exist_ok=True)
            sheet.save(a.sheet, quality=92)
            print(f"  sheet       {a.sheet}  (yours first, then reference frames)")

    for w_ in warns:
        print(f"\n  note        {w_}")
    if fails:
        print("\n  BLOCKED - the look is outside the reference bands:")
        for f in fails:
            print(f"  - {f}")
        print()
        return 1
    print("\n  OK          the look sits inside the reference bands\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
