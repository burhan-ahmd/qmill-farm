// Test10: 10 s look test in the bridge style. One auction room, two dealers, one gag.
// Hook (cold-read winner, one pattern, no loop): "The Eiffel Tower was sold for scrap. Twice."
// One flow() camera move with stops; ink -> DOF -> bloom/tone/grade post chain, same as the bridge film.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "./grade";
import { flow, lookFrom, checkFlow, flowFocus } from "./flow";
import { assertScene, fitText, drawFittedText } from "./framing";
import { WordCaptions } from "./WordCaptions";
import { CARDS } from "./words";

export const TEST10_FRAMES = 300;

// Hard gate: one continuous move, every stop within 2.5 s of the last (no drift segments).
const STOPS = [
  { f: 0,   ...lookFrom([0.8, 2.45, 11], 1.9, 0, 0),  fov: 44, hold: 18, focus: [0.8, 2.0, 0] as [number, number, number] },
  { f: 65,  ...lookFrom([0.8, 2.35, 9.8], 1.85, 0, 0), fov: 43, hold: 18, focus: [0.9, 2.1, 0] as [number, number, number] },
  { f: 135, ...lookFrom([0.8, 2.25, 8.6], 1.8, 0, 0),  fov: 41, hold: 18, focus: [1.0, 2.2, 0] as [number, number, number] },
  { f: 205, ...lookFrom([0.8, 2.15, 7.6], 1.7, 0, 0),  fov: 39, hold: 18, focus: [1.05, 2.3, 0] as [number, number, number] },
  { f: 260, ...lookFrom([0.8, 2.1, 7.0], 1.6, 0, 0),   fov: 38, hold: 20, focus: [1.1, 2.35, 0] as [number, number, number] },
];
const flowWarnings = checkFlow(STOPS);
if (flowWarnings.length) throw new Error(flowWarnings.join("\n"));
const camPath = flow(STOPS);
const focusAt = flowFocus(STOPS);

// The asserted stand-ins are the same dimensions and positions the room builds below, so the
// stage check measures the real framing at the first, middle and last frame of the move.
const hero = new THREE.Group();
hero.position.set(0, 0.25, 0);
const heroBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.4), new THREE.MeshBasicMaterial());
heroBody.position.y = 0.8; hero.add(heroBody);
const heroHead = new THREE.Group();
heroHead.position.set(0, 1.85, 0);
heroHead.add(new THREE.Mesh(new THREE.SphereGeometry(0.28), new THREE.MeshBasicMaterial()));
hero.add(heroHead);
const placard = new THREE.Group();
placard.position.set(1.35, 2.55, 0);
placard.add(new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.12), new THREE.MeshBasicMaterial()));

const stageCheck = (f: number) => {
  const pose = camPath(f);
  const c = new THREE.PerspectiveCamera(pose.fov, 9 / 16, 0.1, 100);
  c.position.set(...pose.pos); c.lookAt(...pose.look);
  c.updateProjectionMatrix(); c.updateMatrixWorld();
  assertScene(1, {
    camera: c,
    items: [
      { name: "auctioneer", obj: hero, role: "must-fit" },
      { name: "auctioneer head", obj: heroHead, role: "head" },
      { name: "auction placard", obj: placard, role: "must-fit" },
    ],
    read: [{ name: "SOLD placard", obj: placard }],
  });
};
for (const f of [0, 149, 299]) stageCheck(f);

const textProbe = document.createElement("canvas");
textProbe.width = 512; textProbe.height = 256;
const textCtx = textProbe.getContext("2d")!;
const fitted = fitText(textCtx, "SOLD", 440, 200, { font: "bold {px}px Georgia", maxLines: 1 });
if (fitted.px < 24 || textCtx.measureText(fitted.lines[0]).width > 440) throw new Error("SOLD does not fit the placard");

const mat = (color: string) => new THREE.MeshLambertMaterial({ color });

type RoomData = { paddle: THREE.Group; scoreCtx: CanvasRenderingContext2D; scoreTex: THREE.CanvasTexture };

const Room: React.FC = () => {
  const f = useCurrentFrame();
  const { camera } = useThree();

  const grp = useMemo(() => {
    const g = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
    };
    const cream = mat("#e8d4ae"), brick = mat("#a9573c"), wood = mat("#80553b"), gold = mat("#c99b52"), dark = mat("#29232b");

    // Room shell: warm cream walls, wood floor, tall blue hotel windows with gold trim.
    add(new THREE.BoxGeometry(18, 0.2, 16), wood, 0, -0.1, 0);
    add(new THREE.BoxGeometry(18, 9, 0.2), cream, 0, 4.5, -6);
    add(new THREE.BoxGeometry(0.2, 9, 14), cream, -9, 4.5, 0);
    add(new THREE.BoxGeometry(0.2, 9, 14), cream, 9, 4.5, 0);
    for (let i = 0; i < 5; i++) {
      add(new THREE.BoxGeometry(1.6, 2.1, 0.12), mat(i % 2 ? "#55769a" : "#7796ab"), -6 + i * 3, 4.2, -5.86);
      add(new THREE.BoxGeometry(1.75, 0.14, 0.2), gold, -6 + i * 3, 5.35, -5.82);
    }

    // Auction table.
    add(new THREE.BoxGeometry(4.4, 0.24, 2.1), wood, 0.2, 1.18, 0);
    for (const x of [-1.8, 2.2]) for (const z of [-0.8, 0.8]) add(new THREE.CylinderGeometry(0.08, 0.11, 1.2, 10), gold, x, 0.6, z);

    // Auctioneer: brick-red jacket, cream head, dark hair. Same box/sphere dimensions as the asserted stand-in.
    add(new THREE.BoxGeometry(1.1, 1.6, 0.4), brick, 0, 1.05, 0);
    add(new THREE.SphereGeometry(0.28, 20, 16), mat("#f0c7a0"), 0, 2.1, 0.02);
    add(new THREE.CylinderGeometry(0.27, 0.29, 0.16, 16), dark, 0, 2.34, 0.02);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), wood, 0.62, 1.9, 0.22);

    // The SOLD placard, turned from the first sale to the second on the last word.
    const board = add(new THREE.BoxGeometry(1.05, 1.15, 0.12), wood, 1.35, 2.55, 0);
    const scoreCv = document.createElement("canvas"); scoreCv.width = 512; scoreCv.height = 512;
    const scoreCtx = scoreCv.getContext("2d")!;
    const scoreTex = new THREE.CanvasTexture(scoreCv);
    board.material = new THREE.MeshBasicMaterial({ map: scoreTex });

    // Second dealer on the left: blue coat, raised paddle on the gag.
    add(new THREE.BoxGeometry(1.1, 1.5, 0.3), mat("#4b6884"), -2.4, 1.0, 0.4);
    add(new THREE.SphereGeometry(0.4, 18, 14), mat("#e5b893"), -2.4, 2.0, 0.42);
    const paddle = new THREE.Group();
    paddle.position.set(-2.4, 1.75, 1.0);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 10), wood); stick.position.y = 0.3; paddle.add(stick);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), gold); face.position.y = 0.74; paddle.add(face);
    g.add(paddle);

    (g as THREE.Group & { userData: RoomData }).userData = { paddle, scoreCtx, scoreTex };
    return g;
  }, []);

  const cam = camera as THREE.PerspectiveCamera;
  const pose = camPath(f);
  cam.position.set(...pose.pos); cam.up.set(0, 1, 0); cam.lookAt(...pose.look);
  cam.fov = pose.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();

  // One gag: on "bids." the second dealer's paddle goes up and the placard flips to SOLD AGAIN.
  const reveal = Math.max(0, Math.min(1, (f - 252) / 22));
  const data = (grp as THREE.Group & { userData: RoomData }).userData;
  data.paddle.rotation.z = -0.95 * reveal;
  data.scoreCtx.fillStyle = "#eedab2";
  data.scoreCtx.fillRect(0, 0, 512, 512);
  drawFittedText(data.scoreCtx, reveal > 0.5 ? "SOLD AGAIN" : "SOLD", 18, 18, 476, 476, { font: "bold {px}px Georgia", fill: "#27202a", maxLines: 2 });
  data.scoreTex.needsUpdate = true;

  return (
    <>
      <primitive object={grp} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[-5, 9, 7]} intensity={2.5} />
      <directionalLight position={[4, 6, -6]} intensity={0.5} />
    </>
  );
};

const Post: React.FC = () => {
  const { camera, scene } = useThree();
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1, mipmapBlur: true, levels: 6, radius: 0.6 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);

  const f = useCurrentFrame();
  const focus = focusAt(f);
  fx.lens.focus = Math.max(0.3, (camera as THREE.PerspectiveCamera).position.distanceTo(new THREE.Vector3(...focus)));
  fx.lens.cInf = 8;

  return (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} />
      <primitive object={fx.lens.pre} />
      <primitive object={fx.lens.main} />
      <primitive object={fx.bloom} />
      <primitive object={fx.tone} />
      <primitive object={fx.grade} />
    </EffectComposer>
  );
};

export const Test10: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("test10"));
  useEffect(() => { setReady(true); continueRender(handle); }, [handle]);
  if (!ready) return null;
  return (
    <AbsoluteFill>
      <Audio src={staticFile("test10/mix.wav")} />
      <ThreeCanvas width={1080} height={1920} camera={{ fov: 44, near: 0.1, far: 100 }}>
        <Room />
        <Post />
      </ThreeCanvas>
      <WordCaptions words={CARDS} />
    </AbsoluteFill>
  );
};
