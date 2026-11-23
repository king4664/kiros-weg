import { describe, expect, it } from 'vitest';
import { PHASES, phaseWeights, resolveSky, skyAt } from './timeOfDay';
import { sunTimes } from './sun';

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe('الأوقات الأربعة', () => {
  it('الأوزان مجموعها 1 في أي ارتفاع', () => {
    for (let e = -60; e <= 80; e += 0.5) {
      expect(sum(phaseWeights(e, true))).toBeCloseTo(1, 6);
      expect(sum(phaseWeights(e, false))).toBeCloseTo(1, 6);
    }
  });

  it('الانتقال تدريجي: مفيش قفزة كبيرة بين درجة والتانية', () => {
    for (const morning of [true, false]) {
      for (let e = -40; e < 40; e += 0.25) {
        const a = phaseWeights(e, morning);
        const b = phaseWeights(e + 0.25, morning);
        for (const p of PHASES) expect(Math.abs(a[p] - b[p])).toBeLessThan(0.05);
      }
    }
  });

  it('نص الليل ليل، والضهر نهار', () => {
    const midnight = skyAt(new Date(2026, 10, 24, 0, 30));
    expect(midnight.dominant).toBe('night');
    const t = sunTimes(new Date(2026, 10, 23, 12));
    expect(skyAt(t.solarNoon).dominant).toBe('day');
  });

  it('وقت الشروق فجر، ووقت الغروب مغرب', () => {
    const t = sunTimes(new Date(2026, 10, 23, 12));
    expect(skyAt(t.sunrise).dominant).toBe('dawn');
    expect(skyAt(t.sunset).dominant).toBe('sunset');
  });

  it('ساعة بعد الغروب الدنيا ليل أو قربت', () => {
    const t = sunTimes(new Date(2026, 10, 23, 12));
    const later = skyAt(new Date(t.sunset.getTime() + 75 * 60_000));
    expect(later.weights.night).toBeGreaterThan(0.6);
  });

  it('الوقت من اللينك بيغلب الساعة', () => {
    const now = new Date(2026, 10, 23, 13, 0);
    expect(resolveSky(now, { kind: 'phase', phase: 'night' }).weights.night).toBe(1);
    expect(resolveSky(now, { kind: 'phase', phase: 'dawn' }).dominant).toBe('dawn');
    expect(resolveSky(now, { kind: 'clock', hours: 0, minutes: 0 }).dominant).toBe('night');
    expect(resolveSky(now, { kind: 'clock', hours: 12, minutes: 0 }).dominant).toBe('day');
  });
});
