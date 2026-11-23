import { css, mix, type RGB } from '../lib/color';
import type { SkyState } from '../lib/timeOfDay';
import type { Palette } from './palettes';
import type { SceneRenderer } from './scene';
import { SkyLayer, lightsFor } from './sky';
import { TAU, makeSprite, noise1D, rng, type Sprite } from './util';

interface Layer {
  /** y لكل نقطة كل STEP بكسل */
  ridge: Float32Array;
  top: number;
  base: number;
  amp: number;
  sprite?: Sprite;
}

interface FogBand {
  y: number;
  height: number;
  speed: number;
  bobPeriod: number;
  phase: number;
  alpha: number;
  blobs: { x: number; y: number; rx: number; ry: number }[];
  width: number;
  sprite?: Sprite;
}

const STEP = 3;
const LAYERS = 5;
/** عدد القمم في كل 400 بكسل، من الأبعد للأقرب */
const PEAKS = [5.5, 4.2, 3.1, 2.3, 1.7];

/** «جبال وضباب»: طبقات جبال بتفتح كل ما تبعد، وضباب بيمشي بالراحة بينها. */
export class MountainScene implements SceneRenderer {
  private sky = new SkyLayer(4219);
  private layers: Layer[] = [];
  private fog: FogBand[] = [];
  private w = 0;
  private h = 0;
  private scale = 1;
  private horizonY = 0;

  layout(w: number, h: number, scale: number): void {
    this.w = w;
    this.h = h;
    this.scale = scale;
    this.horizonY = Math.round(h * 0.56);
    this.sky.layout(w, this.horizonY, scale);
    const unit = h > w ? h : Math.max(h, w * 0.6);

    this.layers = Array.from({ length: LAYERS }, (_, i) => {
      const n1 = noise1D(101 + i * 17);
      const n2 = noise1D(202 + i * 31);
      const n3 = noise1D(303 + i * 47);
      const base = h * (0.47 + 0.085 * i);
      const amp = unit * (0.085 + 0.02 * i);
      const f = (PEAKS[i] as number) / 400;
      const count = Math.ceil(w / STEP) + 2;
      const ridge = new Float32Array(count);
      let top = h;
      for (let k = 0; k < count; k++) {
        const x = k * STEP;
        // قمم أوضح في الجبال البعيدة، وتلال أنعم في القريبة
        const a = n1(x * f);
        const sharp = 1 - Math.abs(2 * n2(x * f * 2.1) - 1);
        const v = 0.62 * a + 0.26 * sharp * (1 - i * 0.12) + 0.12 * n3(x * f * 5.3);
        const y = base - amp * v;
        ridge[k] = y;
        top = Math.min(top, y);
      }
      return { ridge, top: Math.floor(top) - 2, base, amp };
    });

    const r = rng(77);
    this.fog = Array.from({ length: LAYERS }, (_, i) => {
      const layer = this.layers[i] as Layer;
      const width = Math.max(w * 1.4, 500);
      const height = h * (0.1 + 0.015 * i);
      const blobs = Array.from({ length: 6 + Math.floor(width / 260) }, () => ({
        x: r() * width,
        y: height * (0.35 + r() * 0.3),
        rx: 90 + r() * 160,
        ry: height * (0.22 + r() * 0.18),
      }));
      return {
        y: layer.base - height * 0.55 + layer.amp * 0.1,
        height,
        speed: (3 + i * 1.4) * (i % 2 === 0 ? 1 : -1),
        bobPeriod: 24 + i * 4,
        phase: r() * TAU,
        alpha: 0.95 - i * 0.12,
        blobs,
        width,
      };
    });
  }

  invalidate(): void {
    this.sky.invalidate();
    for (const l of this.layers) l.sprite = undefined;
    for (const f of this.fog) f.sprite = undefined;
  }

  private layerSprite(i: number, pal: Palette): Sprite {
    const layer = this.layers[i] as Layer;
    if (layer.sprite) return layer.sprite;
    const { w, h } = this;
    const m = pal.mountains;
    const color = m.layers[i] as RGB;
    const d = i / (LAYERS - 1);
    const hh = h - layer.top;
    layer.sprite = makeSprite(w, hh, this.scale, (g) => {
      g.translate(0, -layer.top);
      const path = new Path2D();
      path.moveTo(0, h);
      layer.ridge.forEach((y, k) => path.lineTo(k * STEP, y));
      path.lineTo(w, h);
      path.closePath();
      // الجبل بيفتح تحت (الضباب بيتجمّع في الوديان)
      const grad = g.createLinearGradient(0, layer.top, 0, layer.base + layer.amp * 0.4);
      grad.addColorStop(0, css(color));
      grad.addColorStop(0.55, css(mix(color, m.fog, 0.12)));
      grad.addColorStop(1, css(mix(color, m.fog, 0.38 - d * 0.12)));
      g.fillStyle = grad;
      g.fill(path);
      // حافة منوّرة على القمة
      g.beginPath();
      layer.ridge.forEach((y, k) => (k === 0 ? g.moveTo(0, y) : g.lineTo(k * STEP, y)));
      g.strokeStyle = css(m.rim, 0.28 - d * 0.14);
      g.lineWidth = 1.3;
      g.stroke();
    });
    return layer.sprite;
  }

  private fogSprite(band: FogBand, pal: Palette): Sprite {
    if (band.sprite) return band.sprite;
    const fog = pal.mountains.fog;
    band.sprite = makeSprite(band.width, band.height, this.scale, (g) => {
      for (const b of band.blobs) {
        for (const dx of [-band.width, 0, band.width]) {
          g.save();
          g.translate(b.x + dx, b.y);
          g.scale(1, b.ry / b.rx);
          const grad = g.createRadialGradient(0, 0, 0, 0, 0, b.rx);
          grad.addColorStop(0, css(fog, 0.55));
          grad.addColorStop(0.5, css(fog, 0.3));
          grad.addColorStop(1, css(fog, 0));
          g.fillStyle = grad;
          g.fillRect(-b.rx, -b.rx, b.rx * 2, b.rx * 2);
          g.restore();
        }
      }
    });
    return band.sprite;
  }

  draw(ctx: CanvasRenderingContext2D, t: number, pal: Palette, state: SkyState): void {
    const { w, h, horizonY } = this;
    const lights = lightsFor(w, h, horizonY, state);
    this.sky.draw(ctx, t, pal, state, lights, Math.min(h, (this.layers[1] as Layer).base));

    for (let i = 0; i < LAYERS; i++) {
      const layer = this.layers[i] as Layer;
      const sp = this.layerSprite(i, pal);
      ctx.drawImage(sp.canvas, 0, layer.top, sp.w, sp.h);

      // الضباب بيمشي بالراحة قدّام الطبقة دي
      const band = this.fog[i] as FogBand;
      const fs = this.fogSprite(band, pal);
      const off = (((t * band.speed) % band.width) + band.width) % band.width;
      const bob = 4 * Math.sin((TAU * t) / band.bobPeriod + band.phase);
      ctx.globalAlpha = Math.min(1, pal.mountains.fogAlpha * band.alpha * 1.6);
      for (let x = off - band.width; x < w; x += band.width) {
        ctx.drawImage(fs.canvas, x, band.y + bob, fs.w, fs.h);
      }
      ctx.globalAlpha = 1;
    }
  }
}
