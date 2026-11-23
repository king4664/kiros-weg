/** أرقام عشوائية ثابتة (نفس الـseed = نفس الرسمة كل مرة). */
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ضوضاء ناعمة في بُعد واحد، من 0 لـ1. */
export function noise1D(seed: number): (x: number) => number {
  const r = rng(seed);
  const table = Array.from({ length: 256 }, r);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255] as number;
    const b = table[(i + 1) & 255] as number;
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));

export const smoothstep = (x: number): number => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};

export const TAU = Math.PI * 2;

export interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

/** كانفاس صغير بنرسم عليه مرة ونعيد استخدامه كل فريم. */
export function makeSprite(w: number, h: number, scale: number, draw: (g: CanvasRenderingContext2D) => void): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * scale));
  canvas.height = Math.max(1, Math.ceil(h * scale));
  const g = canvas.getContext('2d');
  if (g) {
    g.setTransform(scale, 0, 0, scale, 0, 0);
    draw(g);
  }
  return { canvas, w, h };
}
