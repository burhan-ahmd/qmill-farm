// Self-test for templates/bridge/framing.ts. Run:  npx tsx templates/scripts/framing_selftest.ts
// Needs `three` installed in the project.
import * as THREE from 'three';
import {checkShot, checkFacing, checkAim, checkHeld, checkReadable, offTarget, fitText, FORWARD} from '../src/videos/bridge/framing';

const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 500);
cam.position.set(0, 1.5, 8);
cam.lookAt(0, 1.5, 0);
cam.updateMatrixWorld(true);

const box = (x: number, y: number, z: number, w: number, h: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3));
  m.position.set(x, y, z);
  m.updateMatrixWorld(true);
  return m;
};

let failed = 0;
const expect = (label: string, got: string[], wantProblem: boolean) => {
  const ok = wantProblem ? got.length > 0 : got.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${got.length ? '  -> ' + got.join(' | ') : ''}`);
};

expect('character fully inside the safe area', checkShot(cam, [{name: 'hero', obj: box(0, 1.5, 0, 1, 2.2), role: 'must-fit'}]), false);
expect('character cut off at the bottom', checkShot(cam, [{name: 'hero', obj: box(0, -0.4, 0, 1, 2.2), role: 'must-fit'}]), true);
expect('prop pushed off the right edge', checkShot(cam, [{name: 'folder', obj: box(2.0, 1.5, 0, 1.2, 0.8), role: 'must-fit'}]), true);
expect('small head', checkShot(cam, [{name: 'head', obj: box(0, 1.5, 0, 0.6, 0.6), role: 'head'}]), false);
expect('giant head close to the lens', checkShot(cam, [{name: 'head', obj: box(0, 1.5, 5.5, 1.0, 1.0), role: 'head'}]), true);
expect('huge cut-off foreground prop', checkShot(cam, [{name: 'bush', obj: box(1.0, 1.0, 6.5, 3, 3), role: 'foreground'}]), true);
expect('small foreground prop at the edge', checkShot(cam, [{name: 'pillar', obj: box(1.3, 1.5, 3, 0.4, 3), role: 'foreground'}]), false);
expect('object behind the camera', checkShot(cam, [{name: 'ghost', obj: box(0, 1.5, 12, 1, 1), role: 'must-fit'}]), true);


/* ---------------- physical truth ---------------- */

const at = (x: number, y: number, z: number) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.updateMatrixWorld(true);
  return o;
};
/** A character at `x` built facing +Z, turned by `yaw` degrees. */
const actor = (x: number, yawDeg: number) => {
  const o = at(x, 1.5, 0);
  o.rotation.y = THREE.MathUtils.degToRad(yawDeg);
  o.updateMatrixWorld(true);
  return o;
};

const painting = at(0, 1.6, -4);            // on the far wall
// facing: an actor turned to face -Z is looking at the wall
expect('facing: looking at the painting', checkFacing([
  {name: 'visitor', obj: actor(0, 180), target: painting}]), false);
expect('facing: back turned to the painting', checkFacing([
  {name: 'visitor', obj: actor(0, 0), target: painting}]), true);
expect('facing: 30 deg off still reads as looking', checkFacing([
  {name: 'visitor', obj: actor(0, 150), target: painting}]), false);

// aim is far stricter than a look
const target = at(0, 1.5, -10);
expect('aim: 3 deg off passes', checkAim([
  {name: 'rifle', obj: actor(0, 183), target}]), false);
expect('aim: 20 deg off fails', checkAim([
  {name: 'rifle', obj: actor(0, 200), target}]), true);

// held props
const body = at(0, 1.2, 0);
const hand = at(0.3, 1.1, 0.2);
expect('held: in the hand and in front of the body', checkHeld(cam, [
  {name: 'canvas', prop: at(0.3, 1.1, 0.45), hand, body}]), false);
expect('held: behind the body', checkHeld(cam, [
  {name: 'canvas', prop: at(0.3, 1.1, -0.3), hand, body}]), true);
expect('held: nowhere near the hand', checkHeld(cam, [
  {name: 'canvas', prop: at(2.5, 1.1, 0.45), hand, body}]), true);

// a prop that must be read
expect('read: a big sign in the middle of frame', checkReadable(cam, [
  {name: 'sign', obj: box(0, 1.5, 0, 2.4, 1.6)}]), false);
expect('read: a sign running off the right edge', checkReadable(cam, [
  {name: 'sign', obj: box(2.4, 1.5, 0, 2.4, 1.6)}]), true);
expect('read: a sign too small to read', checkReadable(cam, [
  {name: 'sign', obj: box(0, 1.5, 0, 0.15, 0.1)}]), true);

if (Math.abs(offTarget(actor(0, 180), painting, FORWARD) - 0) > 1) {
  console.error('FAIL offTarget: a turned actor should read as 0 deg off'); failed++;
}

/* text fitting, with a stub measureText: width = characters x 0.6 x px */
const stub = {
  font: '',
  measureText(this: { font: string }, s: string) {
    const px = parseInt(this.font.match(/(\d+)px/)?.[1] ?? '10', 10);
    return {width: s.length * 0.6 * px} as TextMetrics;
  },
} as unknown as CanvasRenderingContext2D;

const long = fitText(stub, '10,000 ROUNDS', 300, 160, {maxLines: 2});
const widest = Math.max(...long.lines.map((l) => l.length * 0.6 * long.px));
if (widest > 300) { console.error(`FAIL fitText: "${long.lines}" is ${widest.toFixed(0)}px wide, box is 300`); failed++; }
if (long.lines.length * long.lineHeight > 160) { console.error('FAIL fitText: too tall'); failed++; }
console.log(`  fitText("10,000 ROUNDS", 300x160) -> ${long.px}px, ${long.lines.length} line(s): ${long.lines.join(' / ')}`);

const tight = fitText(stub, 'FINAL REPORT', 120, 40, {maxLines: 1});
const tw = tight.lines[0].length * 0.6 * tight.px;
if (tw > 120) { console.error(`FAIL fitText: narrow box overflowed (${tw.toFixed(0)} > 120)`); failed++; }
console.log(`  fitText("FINAL REPORT", 120x40, 1 line) -> ${tight.px}px`);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll framing self-tests passed.');
process.exit(failed ? 1 : 0);
