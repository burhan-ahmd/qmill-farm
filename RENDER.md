# qmill-farm — render farm for quiet-mill

This PUBLIC repo renders one project at a time, in the cloud, on 20 free GitHub machines.
It belongs to the private animation studio repo `burhan-ahmd/quiet-mill`.

## The rule that makes this private

The engine here is generic (the bridge template from the original creator + the Remotion/three.js
project). YOUR projects are synced in for a render and WIPED afterwards, including history
(force-pushed single commit). Nothing you write stays here.

## Render a project (agent procedure)

From the local qmill-farm clone (sibling of the quiet-mill clone):

1. **Sync** (the `sync_project.ps1` script in quiet-mill does steps 1–3 automatically):
   - copy `studio/src/projects/<name>/` from quiet-mill → here
   - copy `studio/public/<name>/` from quiet-mill → here
   - copy the caption canon `studio/src/videos/fredlorz/` (`captions.tsx` + `words.ts`) → here
   - add the project's import + `<Composition>` lines to `studio/src/Root.tsx`
2. **Commit + push** (workflow_dispatch reads the default branch at dispatch).
3. **Dispatch:**
   `gh workflow run coldframe.yml -f composition=<CompId> -f chunks=20 -f output-name=<name>.mp4`
4. Watch the run; the MP4 lands as a GitHub Release asset
   (`https://github.com/burhan-ahmd/qmill-farm/releases/tag/render-<runid>`).
5. **Wipe** (the `wipe_project.ps1` script in quiet-mill does this): remove the project's folders,
   the fredlorz canon copy, and the Root.tsx lines; force-push ONE clean commit so the project
   never exists in this public repo's git history.

## Contents

| Path | What it is |
|---|---|
| `studio/` | The Remotion + three.js project (identical layout to quiet-mill's `studio/`) |
| `studio/src/videos/bridge/` | The original creator's proven film + the generic engine (toon/cast/world/paint/flow/framing) |
| `studio/src/projects/<name>/` | The currently-rendering project (synced in, wiped after) |
| `studio/src/videos/fredlorz/` | Caption canon copy (synced in, wiped after) |
| `studio/public/bridge/kenney/` | 26 CC0 GLB models + colormap (permanent, public kit) |
| `studio/public/fonts/` | Lilita One caption font, OFL (permanent) |
| `studio/scripts/` | Asset gate, craft-gate self-tests |
| `.github/workflows/coldframe.yml` | The cloud render workflow (verify assets + craft gate → 20 chunk renders → stitch → release) |

## Quality gates run before every render (in CI)

- `node scripts/check-assets.mjs` — every `staticFile()` reference must exist in `public/`
- flow + framing self-tests — camera/safe-area maths regression gate

A failure here stops the render before any minutes are spent.
