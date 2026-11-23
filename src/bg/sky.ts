import { css, mix, type RGB } from '../lib/color';
import type { SkyState } from '../lib/timeOfDay';
import { PALETTES, type Palette } from './palettes';
import { TAU, makeSprite, rng, smoothstep, type Sprite } from './util';

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  period: number;
  phase: number;
}

interface Puff {
  dx: number;
  dy: number;
  rx: number;
  ry: number;
}

interface Cloud {
  y: number;
  x0: number;
  speed: number;
  w: number;
  h: number;
  puffs: Puff[];
  sprite?: Sprite;
}

export interface Lights {
  sunX: number;
  sunY: number;
  sunR: number;
  /** قد إيه نور الشمس باين (حتى لو تحت الأفق بشوية) */
  sunGlow: number;
  moonX: number;
  moonY: number;
  moonR: number;
  moonVis: number;
}

const MOON: RGB = PALETTES.night.sky.sun;

/** مكان الشمس والقمر. الشمس بتطلع من اليمين وتغرب ناحية الشمال. */
export function lightsFor(w: number, h: number, horizonY: number, sky: SkyState): Lights {
  const night = sky.weights.night;
  const topY = horizonY * 0.14;
  const frac = sky.elevation / Math.max(sky.noonElevation, 25);
  const m = Math.min(w, h);
  return {
    sunX: w * (0.78 - 0.56 * sky.dayProgress),
    sunY: horizonY - frac * (horizonY - topY),
    sunR: m * 0.05 + 6,
    sunGlow: smoothstep((sky.elevation + 7) / 8) * (1 - night),
    moonX: w * 0.27,
    moonY: horizonY * 0.27,
    moonR: m * 0.03 + 5,
    moonVis: smoothstep(night),
  };
}

/** السما: التدرّج، والنجوم، والشمس أو القمر، والسحاب. مشتركة بين المنظرين. */
export class SkyLayer {
  private stars: Star[] = [];
  private clouds: Cloud[] = [];
  private w = 0;
  private horizonY = 0;
  private scale = 1;

  constructor(private readonly seed: number) {}

  layout(w: number, horizonY: number, scale: number): void {
    this.w = w;
    this.horizonY = horizonY;
    this.scale = scale;
    const r = rng(this.seed);

    const starCount = Math.round(60 + (w * horizonY) / 2600);
    this.stars = Array.from({ length: starCount }, () => {
      const big = r() < 0.08;
      return {
        x: r() * w,
        y: Math.pow(r(), 1.5) * horizonY * 0.85,
        r: big ? 1.1 + r() * 0.6 : 0.4 + r() * 0.6,
        a: big ? 0.9 : 0.35 + r() * 0.5,
        period: 20 + r() * 20,
        phase: r() * TAU,
      };
    });

    const cloudCount = 3 + Math.min(5, Math.floor(w / 420));
    const sizeK = w > 800 ? 1.35 : 1;
    this.clouds = Array.from({ length: cloudCount }, (_, i) => {
      const cw = (130 + r() * 150) * sizeK;
      const ch = cw * 0.42;
      const n = 6 + Math.floor(r() * 4);
      const puffs: Puff[] = Array.from({ length: n }, (_, k) => {
        const u = k / (n - 1) - 0.5;
        const mid = 1 - Math.abs(2 * u);
        const rx = cw * (0.13 + 0.13 * mid + r() * 0.04);
        return {
          dx: cw / 2 + u * cw * 0.72 + (r() - 0.5) * cw * 0.06,
          dy: ch * 0.62 - rx * 0.55 * (0.3 + mid * 0.7) + (r() - 0.5) * ch * 0.08,
          rx,
          ry: rx * (0.55 + r() * 0.15),
        };
      });
      return {
        y: horizonY * (0.1 + (i / cloudCount) * 0.45 + r() * 0.06),
        x0: r(),
        speed: 2.2 + r() * 2.6,
        w: cw,
        h: ch,
        puffs,
      };
    });
  }

  invalidate(): void {
    for (const c of this.clouds) c.sprite = undefined;
  }

  private cloudSprite(c: Cloud, pal: Palette): Sprite {
    if (c.sprite) return c.sprite;
    const { cloud, cloudShade } = pal.sky;
    const light = mix(cloud, [255, 255, 255], 0.35);
    c.sprite = makeSprite(c.w, c.h, this.scale, (g) => {
      const puff = (p: Puff, color: RGB, alpha: number, offY: number, k: number) => {
        g.save();
        g.translate(p.dx, p.dy + offY);
        g.scale(1, p.ry / p.rx);
        const grad = g.createRadialGradient(0, -p.rx * 0.2, 0, 0, 0, p.rx * k);
        grad.addColorStop(0, css(color, alpha));
        grad.addColorStop(0.55, css(color, alpha * 0.7));
        grad.addColorStop(1, css(color, 0));
        g.fillStyle = grad;
        g.beginPath();
        g.arc(0, 0, p.rx * k, 0, TAU);
        g.fill();
        g.restore();
      };
      for (const p of c.puffs) puff(p, cloudShade, 0.55, p.ry * 0.3, 1.05);
      for (const p of c.puffs) puff(p, cloud, 0.85, 0, 1);
      for (const p of c.puffs) puff({ ...p, rx: p.rx * 0.6, ry: p.ry * 0.5 }, light, 0.35, -p.ry * 0.25, 1);
    });
    return c.sprite;
  }

  /** بيرسم السما لحد bottom. */
  draw(ctx: CanvasRenderingContext2D, t: number, pal: Palette, sky: SkyState, lights: Lights, bottom: number): void {
    const { w, horizonY } = this;
    const s = pal.sky;

    const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, css(s.top));
    grad.addColorStop(0.55, css(s.mid));
    grad.addColorStop(1, css(s.horizon));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, horizonY);
    ctx.fillStyle = css(s.horizon);
    ctx.fillRect(0, horizonY - 1, w, bottom - horizonY + 1);

    // النجوم بتلمع ببطء (الدورة 20–40 ثانية)
    if (s.stars > 0.01) {
      for (const st of this.stars) {
        const fade = 1 - (st.y / horizonY) * 0.75;
        const a = s.stars * st.a * fade * (0.55 + 0.45 * Math.sin((TAU * t) / st.period + st.phase));
        if (a < 0.02) continue;
        ctx.fillStyle = `rgb(255 250 240 / ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, TAU);
        ctx.fill();
      }
    }

    // نور الشمس على السما
    if (lights.sunGlow > 0.01) {
      const gy = Math.min(lights.sunY, horizonY);
      const R = Math.max(w, horizonY) * (0.55 + 0.35 * s.glowStrength);
      const a = s.glowStrength * lights.sunGlow;
      const g = ctx.createRadialGradient(lights.sunX, gy, 0, lights.sunX, gy, R);
      g.addColorStop(0, css(s.glow, 0.85 * a));
      g.addColorStop(0.22, css(s.glow, 0.45 * a));
      g.addColorStop(0.6, css(s.glow, 0.12 * a));
      g.addColorStop(1, css(s.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, bottom);
    }

    // القمر
    if (lights.moonVis > 0.01) {
      const { moonX: x, moonY: y, moonR: r, moonVis: v } = lights;
      const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 7);
      halo.addColorStop(0, css(PALETTES.night.sky.glow, 0.35 * v));
      halo.addColorStop(1, css(PALETTES.night.sky.glow, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
      const disc = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r * 1.15);
      disc.addColorStop(0, css(mix(MOON, [255, 255, 255], 0.4), v));
      disc.addColorStop(0.8, css(MOON, v));
      disc.addColorStop(1, css(MOON, 0));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = css(mix(MOON, PALETTES.night.sky.horizon, 0.45), 0.18 * v);
      for (const [dx, dy, rr] of [
        [-0.3, -0.15, 0.32],
        [0.28, 0.2, 0.24],
        [0.05, 0.42, 0.16],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU);
        ctx.fill();
      }
    }

    // قرص الشمس (الأرض أو البحر بيغطّوا الجزء اللي تحت الأفق)
    const sunVis = 1 - sky.weights.night;
    if (sunVis > 0.01 && lights.sunY < horizonY + lights.sunR * 1.4) {
      const { sunX: x, sunY: y, sunR: r } = lights;
      const disc = ctx.createRadialGradient(x, y, 0, x, y, r * 1.5);
      disc.addColorStop(0, css(mix(s.sun, [255, 255, 255], 0.35), sunVis));
      disc.addColorStop(0.62, css(s.sun, sunVis));
      disc.addColorStop(0.7, css(s.sun, 0.75 * sunVis));
      disc.addColorStop(1, css(s.sun, 0));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, TAU);
      ctx.fill();
    }

    // السحاب بيعدّي بالراحة
    ctx.globalAlpha = s.cloudAlpha;
    for (const c of this.clouds) {
      const sp = this.cloudSprite(c, pal);
      const span = w + c.w;
      const x = ((((c.x0 * span - t * c.speed) % span) + span) % span) - c.w;
      ctx.drawImage(sp.canvas, x, c.y, c.w, c.h);
    }
    ctx.globalAlpha = 1;
  }
}
