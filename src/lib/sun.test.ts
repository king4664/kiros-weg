import { describe, expect, it } from 'vitest';
import { sunElevation, sunTimes } from './sun';

const minutes = (ms: number) => ms / 60_000;
const utcMinutes = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;

describe('الشمس في إسكندرية', () => {
  it('طول اليوم في الشتا (21 ديسمبر) حوالي 10 ساعات و7 دقايق', () => {
    const t = sunTimes(new Date(2026, 11, 21, 12));
    const len = minutes(t.sunset.getTime() - t.sunrise.getTime());
    expect(len).toBeGreaterThan(10 * 60 + 2);
    expect(len).toBeLessThan(10 * 60 + 12);
  });

  it('طول اليوم في الصيف (21 يونيو) حوالي 14 ساعة و11 دقيقة', () => {
    const t = sunTimes(new Date(2027, 5, 21, 12));
    const len = minutes(t.sunset.getTime() - t.sunrise.getTime());
    expect(len).toBeGreaterThan(14 * 60 + 6);
    expect(len).toBeLessThan(14 * 60 + 16);
  });

  it('الضهر الشمسي أول نوفمبر بدري (معادلة الوقت +16 دقيقة): حوالي 09:44 UTC', () => {
    const t = sunTimes(new Date(2026, 10, 3, 12));
    expect(utcMinutes(t.solarNoon)).toBeGreaterThan(9 * 60 + 42);
    expect(utcMinutes(t.solarNoon)).toBeLessThan(9 * 60 + 46);
  });

  it('الشروق قبل الضهر قبل الغروب، والشروق الصبح بدري بتوقيت UTC', () => {
    const t = sunTimes(new Date(2026, 10, 23, 12));
    expect(t.sunrise.getTime()).toBeLessThan(t.solarNoon.getTime());
    expect(t.solarNoon.getTime()).toBeLessThan(t.sunset.getTime());
    // 23 نوفمبر: الشروق حوالي 04:2x UTC والغروب حوالي 14:5x UTC
    expect(utcMinutes(t.sunrise)).toBeGreaterThan(4 * 60);
    expect(utcMinutes(t.sunrise)).toBeLessThan(5 * 60);
    expect(utcMinutes(t.sunset)).toBeGreaterThan(14 * 60 + 30);
    expect(utcMinutes(t.sunset)).toBeLessThan(15 * 60 + 15);
  });

  it('الشمس عند الشروق والغروب على الأفق تقريبًا (-0.83°)', () => {
    const t = sunTimes(new Date(2027, 2, 15, 12));
    expect(sunElevation(t.sunrise)).toBeCloseTo(-0.83, 0);
    expect(sunElevation(t.sunset)).toBeCloseTo(-0.83, 0);
  });

  it('أعلى ارتفاع في 21 يونيو حوالي 82°، وفي 21 ديسمبر حوالي 35°', () => {
    expect(sunTimes(new Date(2027, 5, 21, 12)).noonElevation).toBeCloseTo(82.2, 0);
    expect(sunTimes(new Date(2026, 11, 21, 12)).noonElevation).toBeCloseTo(35.4, 0);
  });

  it('نص الليل الشمس تحت الأفق خالص', () => {
    expect(sunElevation(new Date(Date.UTC(2026, 10, 23, 22, 0)))).toBeLessThan(-50);
  });
});
