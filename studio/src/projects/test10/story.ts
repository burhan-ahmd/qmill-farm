// Test10 timeline declaration: one shot, 300 frames, 30 fps. The camera move itself lives in
// Test10.tsx (a single flow() path), so this file holds only what the scene checker reads.
export const FPS = 30;
export const TOTAL = 300;
export type ShotDef = { id: number; a: number; b: number; light: "day"; crowd: "none"; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 300, light: "day", crowd: "none", tau: (t) => t },
];
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -1;
