import { css, mix } from '../lib/color';
import type { SkyState } from '../lib/timeOfDay';
import type { Palette } from './palettes';
import { SkyLayer, lightsFor } from './sky';
import { TAU, rng } from './util';
import type { SceneRenderer } from './scene';

interface Glint {
  u: number;
  off: number;
  len: number;
  period: number;
  phase: number;
}

const WAVES = 10;

/** «بحر إسكندرية»: أفق، وموج بيتحرك ببطء، ولمعة نور على المية. */
export class SeaScene implements SceneRenderer {
  private sky = new SkyLayer(1907);
  private glints: Glint[] = [];
  private w = 0;
  private h = 0;
  private horizonY = 0;

  layout(w: number, h: number, scale: number): void {
    this.w = w;
    this.h = h;
    this.horizonY = Math.round(h * (h > w ? 0.6 : 0.62));
    this.sky.layout(w, this.horizonY, scale);
    const r = rng(29);
    this.glints = Array.from({ length: 90 }, () => {
      // توزيع قريب من الطبيعي حوالين عمود النور
      const off = (r() + r() + r() - 1.5) / 1.5;
      return { u: Math.pow(r(), 0.8), off, len: 0.5 + r(), period: 20 + r() * 20, phase: r() * TAU };
    });
  }

  invalidate(): void {
    this.sky.invalidate();
  }

  draw(ctx: CanvasRenderingContext2D, t: number, pal: Palette, state: SkyState): void {
    const { w, h, horizonY: hy } = this;
    const sea = pal.sea;
    const lights = lightsFor(w, h, hy, state);
    this.sky.draw(ctx, t, pal, state, lights, hy + 2);

    // المية تحت الأفق
    const base = ctx.createLinearGradient(0, hy, 0, h);
    base.addColorStop(0, css(sea.far));
    base.addColorStop(0.35, css(mix(sea.far, sea.near, 0.55)));
    base.addColorStop(1, css(sea.near));
    ctx.fillStyle = base;
    ctx.fillRect(0, hy, w, h - hy);

    // خط الأفق ناعم: ضباب خفيف من لون السما
    const haze = ctx.createLinearGradient(0, hy - 10, 0, hy + 14);
    haze.addColorStop(0, css(pal.sky.horizon, 0));
    haze.addColorStop(0.45, css(pal.sky.horizon, 0.55));
    haze.addColorStop(1, css(pal.sky.horizon, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, hy - 10, w, 24);

    // انعكاس النور على المية
    const sunVis = lights.sunGlow;
    const useMoon = lights.moonVis > sunVis;
    const lx = useMoon ? lights.moonX : lights.sunX;
    const vis = useMoon ? lights.moonVis * 0.7 : sunVis;
    if (vis > 0.02) {
      const ry = (h - hy) * 0.7;
      const rx = w * 0.16;
      ctx.save();
      ctx.translate(lx, hy);
      ctx.scale(rx / ry, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
      const col = useMoon ? mix(sea.glitter, pal.sky.glow, 0.4) : pal.sky.glow;
      g.addColorStop(0, css(col, 0.42 * vis * sea.glitterStrength));
      g.addColorStop(1, css(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-ry, 0, ry * 2, ry);
      ctx.restore();
    }

    // الموج: طبقات من البعيد للقريب، كل واحدة دورتها 20–40 ثانية
    for (let i = 0; i < WAVES; i++) {
      const d = (i + 1) / (WAVES + 1);
      const y0 = hy + (h - hy) * Math.pow(d, 1.6);
      const amp = 0.4 + 9 * Math.pow(d, 2.2);
      const lambda = 34 + 300 * Math.pow(d, 1.5);
      const period = 20 + ((i * 7) % 21);
      const dir = i % 2 === 0 ? 1 : -1;
      const ph = (dir * TAU * t) / period + i * 1.7;
      const k = TAU / lambda;
      const yAt = (x: number) =>
        y0 + amp * (0.7 * Math.sin(k * x + ph) + 0.3 * Math.sin(k * 2.3 * x - ph + i));

      ctx.beginPath();
      ctx.moveTo(0, h);
      const step = Math.max(4, lambda / 10);
      for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, yAt(x));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = css(mix(sea.far, sea.near, Math.pow(d, 0.75)), 0.55 + 0.35 * d);
      ctx.fill();

      // ضربات فرشة فاتحة على قمة الموجة
      ctx.beginPath();
      for (let x = 0; x <= w + step; x += step) {
        if (x === 0) ctx.moveTo(x, yAt(x));
        else ctx.lineTo(x, yAt(x));
      }
      ctx.setLineDash([lambda * 0.35, lambda * 0.25]);
      ctx.lineDashOffset = (-dir * t * lambda * 0.6) / period;
      ctx.strokeStyle = css(sea.crest, 0.05 + 0.16 * d);
      ctx.lineWidth = 0.6 + 1.6 * d;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // لمعة النور: شرط صغيرة بتنوّر وتطفي بالراحة
    if (vis > 0.02) {
      const strength = sea.glitterStrength * vis;
      ctx.fillStyle = css(sea.glitter);
      for (const g of this.glints) {
        const y = hy + 1 + (h - hy) * Math.pow(g.u, 1.5);
        const spread = 6 + w * 0.2 * g.u;
        const x = lx + g.off * spread + 2 * Math.sin((TAU * t) / g.period + g.phase * 2);
        const tw = Math.max(0, Math.sin((TAU * t) / g.period + g.phase));
        const a = strength * (0.15 + 0.85 * tw) * (1 - 0.45 * g.u);
        if (a < 0.03) continue;
        const len = (3 + 20 * g.u) * g.len;
        ctx.globalAlpha = a;
        ctx.fillRect(x - len / 2, y, len, 0.8 + 1.4 * g.u);
      }
      ctx.globalAlpha = 1;
    }
  }
}
