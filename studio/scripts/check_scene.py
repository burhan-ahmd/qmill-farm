#!/usr/bin/env python3
"""Refuse a render whose shots never declared what they claim.

docs/engine.md says every shot calls assertScene and every string painted on a
prop goes through fitText. Saying it was not enough: videos still shipped with
"ROUNDS" hanging off the end of a board, a painting drawn inside the body that
holds it, and a crowd facing away from the thing the narration says they are
staring at. Nothing checked that the calls were ever written.

This checks. Point it at the video's source folder:

    python3 tools/check_scene.py src/videos/<name>

Exits 1 when a shot has no assertScene, when text is painted at a typed size
instead of fitted, or when framing.ts is missing. Run it before the test clip
and again before the full render.
"""
import argparse, os, re, subprocess, shutil, sys

SKIP = {"framing.ts"}          # the checker's own home, and its self-test
TEXT_FILES = (".ts", ".tsx")


def read(p):
    with open(p, encoding="utf-8", errors="ignore") as f:
        return f.read()


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"(^|[^:])//.*$", r"\1", src, flags=re.M)


def sources(root):
    out = []
    for d, _, fs in os.walk(root):
        if "node_modules" in d:
            continue
        for f in fs:
            if f.endswith(TEXT_FILES):
                out.append(os.path.join(d, f))
    return sorted(out)


def shot_ids(files):
    for p in files:
        src = strip_comments(read(p))
        m = re.search(r"SHOTS\s*:\s*ShotDef\[\]\s*=\s*\[(.*?)\n\]", src, re.S)
        if not m:
            m = re.search(r"SHOTS\s*=\s*\[(.*?)\n\]", src, re.S)
        if m:
            ids = re.findall(r"\bid\s*:\s*([0-9]+)", m.group(1))
            if ids:
                return [int(i) for i in ids], p
    return [], None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="the video's source folder, e.g. src/videos/bridge")
    ap.add_argument("--selftest", action="store_true",
                    help="also run the framing self-test with npx tsx")
    a = ap.parse_args()
    if not os.path.isdir(a.folder):
        sys.exit(f"No folder at {a.folder}")

    files = sources(a.folder)
    if not files:
        sys.exit(f"No .ts or .tsx files under {a.folder}")
    fails, warns = [], []

    # 1. the checks have to be present at all
    if not any(os.path.basename(p) == "framing.ts" for p in files):
        fails.append("framing.ts is missing from this video's folder. Copy it from "
                     "templates/bridge/framing.ts; without it nothing can be asserted.")

    # 2. every shot declares what it claims
    ids, story = shot_ids(files)
    if not ids:
        warns.append("Could not find a SHOTS array, so shot coverage was not checked.")
    else:
        declared = set()
        for p in files:
            for m in re.finditer(r"assertScene\s*\(\s*([0-9]+|['\"][^'\"]+['\"])", strip_comments(read(p))):
                tok = m.group(1).strip("'\"")
                if tok.isdigit():
                    declared.add(int(tok))
        missing = [i for i in ids if i not in declared]
        if not declared:
            fails.append(f"No shot calls assertScene. All {len(ids)} shots in "
                         f"{os.path.relpath(story, a.folder)} are unchecked: a cropped sign, a "
                         "wrong eyeline or a prop inside a body will reach the render.")
        elif missing:
            fails.append(f"{len(missing)} of {len(ids)} shots never call assertScene: "
                         f"{', '.join(map(str, missing))}")

    # 3. text painted on a prop is fitted, not typed
    for p in files:
        if os.path.basename(p) in SKIP:
            continue
        src = strip_comments(read(p))
        raw = list(re.finditer(r"\.fillText\s*\(", src))
        if not raw:
            continue
        fitted = "fitText" in src or "drawFittedText" in src
        where = os.path.relpath(p, a.folder)
        lines = [src[:m.start()].count("\n") + 1 for m in raw]
        if not fitted:
            fails.append(f"{where}: {len(raw)} fillText call(s) at line(s) "
                         f"{', '.join(map(str, lines[:6]))} and no fitText anywhere in the file. "
                         "Text typed at a fixed size is what hangs off the end of a sign.")
        else:
            warns.append(f"{where}: {len(raw)} raw fillText call(s) at line(s) "
                         f"{', '.join(map(str, lines[:6]))}. The file does use fitText, so check "
                         "these are decoration, not text the viewer has to read.")

    # 4. somebody's head has to be registered, or faces get cropped
    heads = sum(len(re.findall(r"role\s*:\s*['\"]head['\"]", strip_comments(read(p)))) for p in files)
    if ids and not heads:
        warns.append("No item anywhere uses role: 'head'. Nothing is checking that a face stays "
                     "inside the frame, so a tight shot will crop it. Register the head of every "
                     "character the shot is about, animals included.")

    # 5. the checks themselves still work
    if a.selftest:
        st = os.path.join("templates", "scripts", "framing_selftest.ts")
        if os.path.exists(st) and shutil.which("npx"):
            r = subprocess.run(["npx", "tsx", st], capture_output=True, text=True)
            if r.returncode:
                fails.append("framing_selftest failed:\n" + (r.stdout or r.stderr).strip()[-800:])
            else:
                print("  self-test   framing checks pass")
        else:
            warns.append("Self-test skipped: needs templates/scripts/framing_selftest.ts and npx.")

    print(f"\n  {a.folder}")
    print(f"  files       {len(files)}   shots {len(ids) if ids else '?'}")
    for w in warns:
        print(f"  note        {w}")
    if fails:
        print("\n  BLOCKED - do not render until these are fixed:")
        for f in fails:
            print(f"  - {f}")
        print()
        return 1
    print("  OK          every shot declares its physical truth; prop text is fitted\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
