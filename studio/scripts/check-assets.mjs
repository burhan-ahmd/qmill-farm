// usage: node scripts/check-assets.mjs  (run from studio/)
// Cloud-render gate: fails loudly if any static asset the Remotion bundle needs is missing from the
// repo tree, BEFORE any render minutes are spent. Missing assets would otherwise fail silently
// (loadKit drops missing models with a .catch per model) and only show as an invisible prop.
//
// Two layers:
//   1. SHARED assets every render needs: the Kenney CC0 kit, its colormap, the smoke-test
//      soundtrack and the caption font.
//   2. A GENERIC scan: every `staticFile("<path>")` string literal under src/ must exist under
//      public/. New projects are gated automatically — no edits needed here when you add one.
//      (Dynamically built paths, e.g. `${name}.glb`, can't be scanned — the regex only matches
//      plain string literals; keep dynamic file lists in a constant like KENNEY and check them
//      explicitly.)
// Keep KENNEY in sync with the model lists in src/videos/bridge/world.ts.
import fs from "node:fs";
import path from "node:path";

const KENNEY = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_cone", "tree-high-round", "tree",
  "plant_bushLarge", "plant_bushDetailed", "plant_bush", "hedge", "flower_redA", "flower_yellowA", "flower_purpleA",
  "grass_large", "grass", "lily_large", "lantern", "cart", "stall-bench", "windmill", "canoe"];

const kenneyDir = path.resolve("public/bridge/kenney");
const tex = path.join(kenneyDir, "Textures", "colormap.png"); // Fantasy Town models read their colours from this
const smokeWav = path.resolve("public/audio/smoke-15s.wav");  // ColdframeSmokeTest soundtrack
const font = path.resolve("public/fonts/LilitaOne-Regular.ttf"); // word-synced captions (fredlorz canon)

const missing = KENNEY.filter((n) => !fs.existsSync(path.join(kenneyDir, `${n}.glb`)));
if (!fs.existsSync(tex)) missing.push("public/bridge/kenney/Textures/colormap.png");
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
  console.error("Fix locally, then commit. Shared kit: `npm run models` (needs network);");
  console.error("project assets: generate/commit them inside that project's folder before dispatching.");
  process.exit(1);
}
console.log(`assets ok: ${KENNEY.length} Kenney models + colormap.png + smoke-15s.wav (${(fs.statSync(smokeWav).size / 1e6).toFixed(1)} MB) + LilitaOne-Regular.ttf (${(fs.statSync(font).size / 1e3).toFixed(0)} kB) + ${refs.size} staticFile() references all present`);
