// Code-built 3D props: no downloaded models, no asset files. loadKit() in world.ts returns makeKit(), so build.ts
// prop()/kitClone() place these exactly as they placed the old .glb models (base at y = 0, scaled to a height h).
// Trees, bushes, hedges and banners are NOT here: build.ts already draws those as cartoon vegetation / painted cloth.
// To add a prop for a new video: write a function that returns a THREE.Group, add it to the kit below, then
// place it with prop(b, kit, "<name>", x, y, z, height, yaw). Keep shapes chunky and rounded, flat storybook colours.
import * as THREE from "three";
import type { Kit } from "./build";

const mat = (color: string) => new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
const M: Record<string, THREE.MeshLambertMaterial> = {};
const m = (color: string) => (M[color] ??= mat(color));

type G = THREE.BufferGeometry;
const mesh = (g: G, color: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const o = new THREE.Mesh(g, m(color));
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  return o;
};
const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, ry = 0) =>
  mesh(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, 0, ry, 0);
const cyl = (r0: number, r1: number, h: number, color: string, x: number, y: number, z: number, seg = 14) =>
  mesh(new THREE.CylinderGeometry(r1, r0, h, seg), color, x, y + h / 2, z);
const ball = (r: number, color: string, x: number, y: number, z: number, sy = 1) => {
  const o = mesh(new THREE.SphereGeometry(r, 16, 12), color, x, y, z);
  o.scale.y = sy;
  return o;
};
const group = (...parts: THREE.Object3D[]) => { const g = new THREE.Group(); parts.forEach((p) => g.add(p)); return g; };

const WOOD = "#a8724a", WOOD_D = "#7a4f33", WOOD_L = "#c99a6a", STONE = "#b7b4ad", IRON = "#4a4a52", CREAM = "#efe2c2";

/** flower: stem, round bloom, a few petals */
const flower = (petal: string) => {
  const g = group(cyl(0.025, 0.025, 0.4, "#4f9a3c", 0, 0, 0, 6), ball(0.075, "#f3c94a", 0, 0.42, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(ball(0.085, petal, Math.cos(a) * 0.115, 0.42, Math.sin(a) * 0.115, 0.55));
  }
  g.add(mesh(new THREE.ConeGeometry(0.1, 0.14, 6), "#58a843", 0.08, 0.12, 0, 0, 0, -0.9));
  return g;
};
/** grass tuft: a fan of blades */
const grass = (n: number, h: number) => {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, lean = 0.25 + (i % 3) * 0.12;
    const blade = mesh(new THREE.ConeGeometry(0.05, h * (0.7 + (i % 4) * 0.1), 5), i % 2 ? "#5aa83c" : "#69b545", Math.cos(a) * 0.08, (h * 0.8) / 2, Math.sin(a) * 0.08);
    blade.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
    g.add(blade);
  }
  return g;
};
const lily = () => group(
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), "#4f9a3c", 0, 0.025, 0),
  ball(0.12, "#f4a6c0", 0.1, 0.1, 0.05, 0.7), ball(0.1, "#f8c8d8", -0.05, 0.12, 0.1, 0.7),
);
/** street lantern on a post */
const lantern = () => group(
  cyl(0.09, 0.12, 0.25, IRON, 0, 0, 0, 10), cyl(0.05, 0.05, 2.1, IRON, 0, 0.25, 0, 8),
  box(0.36, 0.06, 0.36, IRON, 0, 2.3, 0), box(0.28, 0.34, 0.28, "#ffe39a", 0, 2.36, 0),
  mesh(new THREE.ConeGeometry(0.27, 0.22, 4), IRON, 0, 2.82, 0, 0, Math.PI / 4, 0), ball(0.04, IRON, 0, 2.97, 0),
);
const wheel = (x: number, z: number, r: number) => {
  const w = new THREE.Group();
  w.add(mesh(new THREE.TorusGeometry(r, r * 0.16, 8, 20), WOOD_D));
  for (let i = 0; i < 4; i++) w.add(mesh(new THREE.BoxGeometry(r * 1.8, r * 0.1, r * 0.1), WOOD_D, 0, 0, 0, 0, 0, (i / 4) * Math.PI));
  w.position.set(x, r, z);
  return w;
};
/** hand cart with two wheels, a crate and two handles */
const cart = () => group(
  box(1.5, 0.12, 0.9, WOOD, 0, 0.55, 0), box(1.5, 0.35, 0.08, WOOD_L, 0, 0.67, 0.43), box(1.5, 0.35, 0.08, WOOD_L, 0, 0.67, -0.43),
  box(0.08, 0.35, 0.9, WOOD_L, 0.71, 0.67, 0), box(0.08, 0.35, 0.9, WOOD_L, -0.71, 0.67, 0),
  wheel(0, 0.52, 0.5), wheel(0, -0.52, 0.5),
  box(1.2, 0.05, 0.06, WOOD_D, 1.3, 0.62, 0.3), box(1.2, 0.05, 0.06, WOOD_D, 1.3, 0.62, -0.3),
  box(0.4, 0.3, 0.4, "#c8a064", -0.3, 0.67, 0.1), ball(0.17, "#d9573f", 0.35, 0.75, -0.1), ball(0.17, "#e8b13a", 0.1, 0.75, -0.25),
);
/** market stall: four posts, striped awning, counter with goods */
const stall = (awning: string) => {
  const g = group(
    box(0.1, 2.3, 0.1, WOOD_D, -0.9, 0, -0.55), box(0.1, 2.3, 0.1, WOOD_D, 0.9, 0, -0.55),
    box(0.1, 1.9, 0.1, WOOD_D, -0.9, 0, 0.55), box(0.1, 1.9, 0.1, WOOD_D, 0.9, 0, 0.55),
    box(1.9, 0.9, 0.7, WOOD, 0, 0, 0.45), box(2.0, 0.08, 0.8, WOOD_L, 0, 0.9, 0.45), box(1.9, 1.6, 0.06, WOOD, 0, 0.3, -0.6),
  );
  for (let i = 0; i < 6; i++) {
    const s = box(0.34, 0.07, 1.5, i % 2 ? CREAM : awning, -0.85 + i * 0.34, 0, 0);
    s.position.set(-0.85 + i * 0.34, 2.15, 0); s.rotation.x = 0.28;
    g.add(s);
  }
  g.add(ball(0.13, "#d9573f", -0.5, 1.07, 0.45), ball(0.13, "#e8b13a", -0.2, 1.07, 0.5), ball(0.13, "#7fb856", 0.15, 1.07, 0.45), box(0.3, 0.2, 0.3, "#c8a064", 0.6, 0.98, 0.45));
  return g;
};
const bench = () => group(
  box(1.6, 0.1, 0.45, WOOD, 0, 0.42, 0), box(1.6, 0.35, 0.08, WOOD_L, 0, 0.55, -0.22),
  box(0.1, 0.42, 0.4, WOOD_D, -0.65, 0, 0), box(0.1, 0.42, 0.4, WOOD_D, 0.65, 0, 0),
);
/** stone windmill: tapered tower, conical roof, four sails */
const windmill = () => {
  const g = group(
    mesh(new THREE.CylinderGeometry(0.55, 0.9, 1.6, 16), "#e9dcc0", 0, 0.8, 0), mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.12, 16), STONE, 0, 1.55, 0),
    mesh(new THREE.ConeGeometry(0.72, 0.8, 16), "#b8553a", 0, 2.0, 0), box(0.28, 0.5, 0.06, WOOD_D, 0, 0, 0.88),
  );
  const hub = new THREE.Group();
  hub.position.set(0, 1.55, 0.62);
  hub.add(ball(0.1, IRON, 0, 0, 0));
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i / 4) * Math.PI * 2 + 0.4;
    arm.add(box(0.08, 1.5, 0.05, WOOD_D, 0, 0, 0), box(0.4, 1.0, 0.03, CREAM, 0.22, 0.45, 0.02));
    hub.add(arm);
  }
  g.add(hub);
  return g;
};
/** dugout canoe: a stretched, hollowed half-capsule with two seats */
const canoe = () => {
  const hull = mesh(new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), "#a8724a");
  hull.scale.set(1, 0.5, 3.2);
  hull.rotation.z = Math.PI; hull.position.y = 0.25;
  return group(hull, box(0.8, 0.05, 0.12, WOOD_D, 0, 0.18, 0.45), box(0.8, 0.05, 0.12, WOOD_D, 0, 0.18, -0.45));
};

const BUILDERS: Record<string, () => THREE.Object3D> = {
  flower_redA: () => flower("#e0533f"), flower_yellowA: () => flower("#f2cd45"), flower_purpleA: () => flower("#9a63c4"),
  grass_large: () => grass(11, 0.7), grass: () => grass(7, 0.45), lily_large: lily, lantern, cart,
  "stall-red": () => stall("#c8553d"), "stall-green": () => stall("#5b9a59"), "stall-bench": bench, windmill, canoe,
};

/** the prop kit, built once (synchronous; wrapped in a Promise by loadKit so callers stay the same) */
export const makeKit = (): Kit => Object.fromEntries(Object.entries(BUILDERS).map(([n, f]) => [n, f()]));
