// Framing checks for a vertical short: safe area, head size, cut-off foreground blobs.
// Pure three.js maths, no rendering. Run it per shot, on the first, middle and last frame, BEFORE rendering stills:
//
//   import {checkShot} from './framing';
//   const problems = checkShot(camera, [
//     {name: 'hero',   obj: heroGroup,  role: 'must-fit'},   // whole body + props must sit inside the safe area
//     {name: 'heroHead', obj: heroHead, role: 'head'},       // head height <= 30 % of the frame
//     {name: 'pillar', obj: pillar,     role: 'foreground'}, // may be cut by the edge, but not a huge blob
//   ]);
//   if (problems.length) throw new Error(problems.join('\n'));
//
// y is measured from the TOP of the frame (0 = top, 1 = bottom), x from the left.
import * as THREE from 'three';

/** Fractions of the frame that must stay free: platform UI at the bottom, captions, rounded screen corners. */
export const SAFE = {left: 0.06, right: 0.06, top: 0.08, bottom: 0.15};
export const MAX_HEAD_HEIGHT = 0.3; // fraction of frame height (one-shot reaction gags may use 0.4)
export const MAX_FOREGROUND_AREA = 0.35; // fraction of frame area for a cut-off foreground prop

export type Bounds = {minX: number; maxX: number; minY: number; maxY: number; behind: boolean};
export type Role = 'must-fit' | 'head' | 'foreground';
export type Item = {name: string; obj: THREE.Object3D; role: Role; maxHead?: number};

const _box = new THREE.Box3();
const _v = new THREE.Vector3();

/** Screen-space bounds of an object's world bounding box, as fractions of the frame. */
export function screenBounds(obj: THREE.Object3D, camera: THREE.Camera): Bounds | null {
  camera.updateMatrixWorld(true);
  obj.updateWorldMatrix(true, true);
  _box.setFromObject(obj);
  if (_box.isEmpty()) return null;
  const {min, max} = _box;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let behind = false;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z);
    // camera space: points in front of the camera have negative z
    const zc = _v.clone().applyMatrix4(camera.matrixWorldInverse).z;
    if (zc >= -0.01) {
      behind = true;
      continue;
    }
    _v.project(camera);
    const x = (_v.x + 1) / 2;
    const y = (1 - _v.y) / 2;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (!isFinite(minX)) return {minX: 0, maxX: 1, minY: 0, maxY: 1, behind: true};
  return {minX, maxX, minY, maxY, behind};
}

const pct = (n: number) => `${(n * 100).toFixed(1)} %`;

/** Returns a list of human-readable problems for one camera pose. Empty list = the shot passes. */
export function checkShot(camera: THREE.Camera, items: Item[], safe = SAFE): string[] {
  const out: string[] = [];
  for (const it of items) {
    const b = screenBounds(it.obj, camera);
    if (!b) { out.push(`${it.name}: empty or missing object`); continue; }
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    if (it.role === 'must-fit') {
      if (b.behind) out.push(`${it.name}: part of it is behind the camera`);
      const sides: string[] = [];
      if (b.minX < safe.left) sides.push(`left (${pct(b.minX)} < ${pct(safe.left)})`);
      if (b.maxX > 1 - safe.right) sides.push(`right (${pct(b.maxX)} > ${pct(1 - safe.right)})`);
      if (b.minY < safe.top) sides.push(`top (${pct(b.minY)} < ${pct(safe.top)})`);
      if (b.maxY > 1 - safe.bottom) sides.push(`bottom (${pct(b.maxY)} > ${pct(1 - safe.bottom)})`);
      if (sides.length) out.push(`${it.name}: outside the safe area at ${sides.join(', ')}`);
    } else if (it.role === 'head') {
      const max = it.maxHead ?? MAX_HEAD_HEIGHT;
      if (h > max) out.push(`${it.name}: head is ${pct(h)} of the frame height, max ${pct(max)}`);
      if (b.minX < 0 || b.maxX > 1 || b.minY < 0 || b.maxY > 1) out.push(`${it.name}: head is cut by the frame edge`);
    } else {
      const cut = b.minX < 0 || b.maxX > 1 || b.minY < 0 || b.maxY > 1;
      const vis = Math.max(0, Math.min(1, b.maxX) - Math.max(0, b.minX)) * Math.max(0, Math.min(1, b.maxY) - Math.max(0, b.minY));
      if (b.behind) out.push(`${it.name}: foreground prop is behind or inside the lens`);
      else if (cut && vis > MAX_FOREGROUND_AREA) out.push(`${it.name}: cut-off foreground blob covering ${pct(vis)} of the frame (${pct(w)} x ${pct(h)})`);
    }
  }
  return out;
}

/* ===================================================================
 * Physical truth
 *
 * The safe-area check above only looks at what you hand it, so a shot
 * can pass it and still be wrong: a sign cropped because nobody listed
 * it, a painting drawn behind the body that carries it, a crowd facing
 * away from the thing the narrator says they are staring at.
 *
 * These checks make those failures loud. Declare what a shot claims is
 * true, and checkScene throws when the geometry disagrees.
 * =================================================================== */

/** Default facing axis: characters in this template are built looking down +Z. */
export const FORWARD = new THREE.Vector3(0, 0, 1);
export const MAX_FACING_ANGLE = 35;   // degrees off-target before a look reads as "not looking"
export const MAX_AIM_ANGLE = 6;       // a barrel is unforgiving: a few degrees is a visible miss
export const MIN_READABLE_HEIGHT = 0.10; // a prop whose text must be read, as a share of frame height

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();

/** World position of an object (or of a bare Vector3 target, returned as-is). */
function worldPos(t: THREE.Object3D | THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  if (t instanceof THREE.Vector3) return out.copy(t);
  t.updateWorldMatrix(true, false);
  return out.setFromMatrixPosition(t.matrixWorld);
}

/** Distance in front of the camera. Larger = further away. */
export function depth(obj: THREE.Object3D | THREE.Vector3, camera: THREE.Camera): number {
  camera.updateMatrixWorld(true);
  worldPos(obj, _a);
  return -_a.applyMatrix4(camera.matrixWorldInverse).z;
}

/**
 * Angle in degrees between where `obj` points and where `target` is.
 * `flat` ignores height, which is what you want for a character turning on
 * the spot; leave it off for a gun, a telescope or a pointing arm.
 */
export function offTarget(
  obj: THREE.Object3D,
  target: THREE.Object3D | THREE.Vector3,
  forward: THREE.Vector3 = FORWARD,
  flat = true,
): number {
  obj.updateWorldMatrix(true, false);
  obj.getWorldQuaternion(_q);
  const f = _a.copy(forward).applyQuaternion(_q);
  const to = worldPos(target, _b).sub(obj.getWorldPosition(new THREE.Vector3()));
  if (flat) { f.y = 0; to.y = 0; }
  if (f.lengthSq() < 1e-9 || to.lengthSq() < 1e-9) return 180;
  return THREE.MathUtils.radToDeg(f.normalize().angleTo(to.normalize()));
}

export type FacingItem = {
  name: string; obj: THREE.Object3D; target: THREE.Object3D | THREE.Vector3;
  forward?: THREE.Vector3; maxAngle?: number; flat?: boolean;
};
export type HeldItem = {
  name: string; prop: THREE.Object3D; hand: THREE.Object3D; body: THREE.Object3D;
  maxGap?: number; clearance?: number;
};
export type ReadItem = {name: string; obj: THREE.Object3D; minHeight?: number};

/** Every character who the script says is looking at something must be looking at it. */
export function checkFacing(items: FacingItem[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    const max = it.maxAngle ?? MAX_FACING_ANGLE;
    const a = offTarget(it.obj, it.target, it.forward ?? FORWARD, it.flat ?? true);
    if (a > max) {
      out.push(`${it.name}: facing ${a.toFixed(0)} deg away from what it should be looking at ` +
               `(allowed ${max}). ${a > 120 ? 'It has its back to it.' : 'Turn it with lookAt.'}`);
    }
  }
  return out;
}

/** A gun, a pointing arm or a telescope must line up with what it is aimed at. */
export function checkAim(items: FacingItem[]): string[] {
  return checkFacing(items.map((it) => ({
    ...it,
    maxAngle: it.maxAngle ?? MAX_AIM_ANGLE,
    flat: it.flat ?? false,
  }))).map((m) => m.replace('facing', 'aimed'));
}

/**
 * A carried prop must sit in the hand and in FRONT of the body.
 *
 * The usual bug is a painting or a sign that is positioned at the character
 * but left at the body's own depth, so the torso draws over it and it reads
 * as being inside the character rather than held.
 */
export function checkHeld(camera: THREE.Camera, items: HeldItem[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    const gap = worldPos(it.prop, _a).distanceTo(worldPos(it.hand, _b));
    const max = it.maxGap ?? 0.35;
    if (gap > max) {
      out.push(`${it.name}: ${gap.toFixed(2)} away from the hand (allowed ${max}). ` +
               `Parent it to the hand instead of placing it in world space.`);
    }
    const clear = it.clearance ?? 0.05;
    const dProp = depth(it.prop, camera);
    const dBody = depth(it.body, camera);
    if (dProp > dBody - clear) {
      out.push(`${it.name}: ${(dProp - dBody).toFixed(2)} BEHIND the body in camera space, so the ` +
               `body draws over it. Push it toward the camera until it clears the torso.`);
    }
  }
  return out;
}

/** A prop the viewer is meant to READ must be whole, inside the safe area and big enough. */
export function checkReadable(camera: THREE.Camera, items: ReadItem[], safe = SAFE): string[] {
  const out: string[] = [];
  for (const it of items) {
    const b = screenBounds(it.obj, camera);
    if (!b) { out.push(`${it.name}: empty or missing object`); continue; }
    if (b.behind) { out.push(`${it.name}: must be read, but part of it is behind the camera`); continue; }
    const min = it.minHeight ?? MIN_READABLE_HEIGHT;
    const h = b.maxY - b.minY;
    const cut: string[] = [];
    if (b.minX < safe.left) cut.push('left');
    if (b.maxX > 1 - safe.right) cut.push('right');
    if (b.minY < safe.top) cut.push('top');
    if (b.maxY > 1 - safe.bottom) cut.push('bottom');
    if (cut.length) {
      out.push(`${it.name}: must be read, but it runs past the ${cut.join(' and ')} of the safe area. ` +
               `Pull the camera back or move the prop; do not shrink the text.`);
    }
    if (h < min) {
      out.push(`${it.name}: must be read, but it is only ${pct(h)} of the frame height (min ${pct(min)}).`);
    }
  }
  return out;
}

export type Scene = {
  camera: THREE.Camera;
  items?: Item[];
  facing?: FacingItem[];
  aim?: FacingItem[];
  held?: HeldItem[];
  read?: ReadItem[];
  safe?: typeof SAFE;
};

/** Every check for one shot. Returns a list of problems; empty means it passes. */
export function checkScene(s: Scene): string[] {
  return [
    ...checkShot(s.camera, s.items ?? [], s.safe ?? SAFE),
    ...checkFacing(s.facing ?? []),
    ...checkAim(s.aim ?? []),
    ...checkHeld(s.camera, s.held ?? []),
    ...checkReadable(s.camera, s.read ?? [], s.safe ?? SAFE),
  ];
}

/** Same, but stops the build. Use this in the shot setup so a bad shot never renders. */
export function assertScene(shot: string | number, s: Scene): void {
  const problems = checkScene(s);
  if (problems.length) {
    throw new Error(`Shot ${shot} fails the stage check:\n  - ${problems.join('\n  - ')}`);
  }
}

/* ------------------------------------------------------------------ *
 * Text that cannot overflow the thing it is printed on.
 * ------------------------------------------------------------------ */

export type FittedText = {px: number; lines: string[]; lineHeight: number};

/**
 * Largest font size at which `text` fits a box, wrapped onto at most `maxLines`.
 *
 * Draw sign, label and document text through this. Choosing a size by eye is
 * what produces "10,000 ROUNDS" running off the end of the sign: it fits the
 * word the author tested and overflows the next one.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  opts: {font?: string; startPx?: number; minPx?: number; maxLines?: number; lineGap?: number} = {},
): FittedText {
  const family = opts.font ?? 'bold {px}px sans-serif';
  const minPx = opts.minPx ?? 6;
  const maxLines = opts.maxLines ?? 2;
  const lineGap = opts.lineGap ?? 1.15;
  const words = text.split(/\s+/).filter(Boolean);

  for (let px = Math.floor(opts.startPx ?? maxHeight); px >= minPx; px--) {
    ctx.font = family.replace('{px}', String(px));
    const lines: string[] = [];
    let cur = '';
    let ok = true;
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxWidth) { cur = next; continue; }
      if (!cur) { ok = false; break; }          // one word is wider than the box
      lines.push(cur);
      cur = w;
    }
    if (cur) lines.push(cur);
    if (!ok || lines.length > maxLines) continue;
    if (lines.length * px * lineGap > maxHeight) continue;
    return {px, lines, lineHeight: px * lineGap};
  }
  return {px: minPx, lines: [text], lineHeight: minPx * lineGap};
}

/**
 * Draw text centred inside a box, shrunk until it fits with a margin.
 * `margin` is a fraction of the box, per side.
 */
export function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, w: number, h: number,
  opts: {font?: string; fill?: string; margin?: number; maxLines?: number; lineGap?: number} = {},
): FittedText {
  const m = opts.margin ?? 0.08;
  const bw = w * (1 - 2 * m);
  const bh = h * (1 - 2 * m);
  const fitted = fitText(ctx, text, bw, bh, {
    font: opts.font, maxLines: opts.maxLines, lineGap: opts.lineGap, startPx: bh,
  });
  ctx.font = (opts.font ?? 'bold {px}px sans-serif').replace('{px}', String(fitted.px));
  ctx.fillStyle = opts.fill ?? '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const total = fitted.lines.length * fitted.lineHeight;
  let ly = y + h / 2 - total / 2 + fitted.lineHeight / 2;
  for (const line of fitted.lines) {
    ctx.fillText(line, x + w / 2, ly);
    ly += fitted.lineHeight;
  }
  return fitted;
}
