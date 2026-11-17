// usage: node scripts/check-assets.mjs  (run from studio/)
// Cloud-render gate: fails loudly if any static asset the Remotion bundle needs is missing from the
// repo tree, BEFORE any render minutes are spent.
//
// Since the toonfacts v3.12 merge (2026-11-17) all 3D props are BUILT IN CODE (src/videos/bridge/props.ts):
// there are no Kenney GLB files and no colormap to check anymore.
//
// Layers:
//   1. SHARED assets every render needs: the smoke-test soundtrack and the caption font.
//   2. A GENERIC scan: every `staticFile("<path>")` string literal under src/ must exist under public/.
//      New projects are gated automatically — no edits needed here when you add one.
//      (Dynamically built paths, e.g. `${name}.glb`, can't be scanned — the regex only matches plain
//      string literals; keep dynamic file lists in a constant and check them explicitly.)
import fs from "node:fs";
import path from "node:path";

const smokeWav = path.resolve("public/audio/smoke-15s.wav");  // ColdframeSmokeTest soundtrack
const font = path.resolve("public/fonts/LilitaOne-Regular.ttf"); // word-synced captions (fredlorz canon)

const missing = [];
if (!fs.existsSync(smokeWav)) missing.push("public/audio/smoke-15s.wav");
if (!fs.existsSync(font)) missing.push("public/fonts/LilitaOne-Regular.ttf");

// --- generic staticFile() scan over all project + template sources ---
const SRC = path.resolve("src");
const refs = new Map(); // referenced public path -> first source file that used it
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      const text = fs.readFileSync(p, "utf8");
      for (const m of text.matchAll(/staticFile\(\s*["']([^"']+)["']\s*\)/g)) {
        const ref = m[1];
        if (!refs.has(ref)) refs.set(ref, path.relative(SRC, p));
      }
    }
  }
};
walk(SRC);
for (const [ref, from] of refs) {
  if (!fs.existsSync(path.join("public", ref))) missing.push(`public/${ref}  (referenced in src/${from})`);
}

if (missing.length) {
  console.error(`MISSING ASSETS (${missing.length}):\n  ` + missing.join("\n  "));
  console.error("Fix locally, then commit. Project assets: generate/commit them inside that project's folder before dispatching.");
  process.exit(1);
}
console.log(`assets ok: smoke-15s.wav (${(fs.statSync(smokeWav).size / 1e6).toFixed(1)} MB) + LilitaOne-Regular.ttf (${(fs.statSync(font).size / 1e3).toFixed(0)} kB) + ${refs.size} staticFile() references all present (props are code-built, no model files)`);
