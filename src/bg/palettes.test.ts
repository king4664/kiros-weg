import { describe, expect, it } from 'vitest';
import { composite, contrast, hex, type RGB } from '../lib/color';
import type { Phase, PhaseWeights } from '../lib/timeOfDay';
import { blendPalette, blendUi, type Palette } from './palettes';

const MIN = 4.5;

function weights(parts: Partial<PhaseWeights>): PhaseWeights {
  return { dawn: 0, day: 0, sunset: 0, night: 0, ...parts };
}

/** كل الأوقات الأربعة، وكمان نقط في نص الانتقال بين كل وقتين ورا بعض. */
function samples(): { label: string; w: PhaseWeights }[] {
  const order: Phase[] = ['night', 'dawn', 'day', 'sunset', 'night'];
  const out: { label: string; w: PhaseWeights }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = order[i] as Phase;
    const b = order[i + 1] as Phase;
    out.push({ label: a, w: weights({ [a]: 1 }) });
    for (const t of [0.25, 0.45, 0.5, 0.55, 0.75]) {
      out.push({ label: `${a}→${b} ${t}`, w: weights({ [a]: 1 - t, [b]: t }) });
    }
  }
  return out;
}

/**
 * الألوان اللي ممكن تبقى ورا كارت في كل منظر.
 * التفاصيل الصغيرة (نجوم، لمعة، حواف الموج) بتتمسح بالـblur فمش محسوبة.
 * الشمس والقمر محسوبين بلونهم الكامل احتياطًا.
 */
function backdrops(p: Palette, scene: 'sea' | 'mountains'): RGB[] {
  const sky = [p.sky.top, p.sky.mid, p.sky.horizon, p.sky.sun, p.sky.glow, p.sky.cloud, p.sky.cloudShade];
  if (scene === 'sea') return [...sky, p.sea.far, p.sea.near, p.sea.crest];
  return [...sky, ...p.mountains.layers, p.mountains.fog, p.mountains.rim];
}

describe('التباين على الكروت الزجاج', () => {
  for (const scene of ['sea', 'mountains'] as const) {
    for (const { label, w } of samples()) {
      it(`${scene} / ${label}: الكلام والكلام الباهت واللون المميز ≥ ${MIN}`, () => {
        const pal = blendPalette(w);
        const ui = blendUi(w);
        let worst = Infinity;
        for (const bg of backdrops(pal, scene)) {
          const card = composite(ui.glass, ui.glassAlpha, bg);
          worst = Math.min(worst, contrast(ui.ink, card), contrast(ui.muted, card), contrast(ui.accent, card));
        }
        expect(worst).toBeGreaterThanOrEqual(MIN);
        expect(contrast(ui.accentInk, ui.accent)).toBeGreaterThanOrEqual(MIN);
      });
    }
  }

  // جوه الكارت فيه أسطح خفيفة: كروت صغيرة (ink 6%)، وتظليل بلون مميز (accent 13%) للحاجة المختارة
  for (const scene of ['sea', 'mountains'] as const) {
    for (const { label, w } of samples()) {
      it(`${scene} / ${label}: الكلام على الأسطح اللي جوه الكارت ≥ ${MIN}`, () => {
        const pal = blendPalette(w);
        const ui = blendUi(w);
        let worst = Infinity;
        for (const bg of backdrops(pal, scene)) {
          const card = composite(ui.glass, ui.glassAlpha, bg);
          // نفس --tint في main.css: بيغمّق في الوضعين
          const inkTint = ui.mode === 'dark' ? composite([0, 0, 0], 0.16, card) : composite(ui.ink, 0.06, card);
          const accentTint = composite(ui.accent, 0.13, card);
          worst = Math.min(
            worst,
            contrast(ui.ink, inkTint),
            contrast(ui.muted, inkTint),
            contrast(ui.accent, inkTint),
            // على التظليل المميز بنستخدم الكلام الأساسي بس (مش الباهت)
            contrast(ui.ink, accentTint),
          );
        }
        expect(worst).toBeGreaterThanOrEqual(MIN);
      });
    }
  }

  it('حساب التباين نفسه مظبوط (أبيض وأسود = 21)', () => {
    expect(contrast(hex('#000'), hex('#fff'))).toBeCloseTo(21, 5);
  });
});
