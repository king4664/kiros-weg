import { describe, expect, it } from 'vitest';
import { parseOverrides, resolveMotion } from './params';

describe('الحركة', () => {
  it('reduced motion بيوقف الحركة دايمًا', () => {
    expect(resolveMotion(true, undefined, true)).toBe(false);
    expect(resolveMotion(true, true, true)).toBe(false);
  });

  it('قفلها من الإعدادات أو من اللينك', () => {
    expect(resolveMotion(false, undefined, false)).toBe(false);
    expect(resolveMotion(true, false, false)).toBe(false);
    expect(resolveMotion(false, true, false)).toBe(true);
    expect(resolveMotion(true, undefined, false)).toBe(true);
  });
});

describe('اللينك', () => {
  it('?time=night&scene=sea', () => {
    expect(parseOverrides('?time=night&scene=sea')).toEqual({
      scene: 'sea',
      time: { kind: 'phase', phase: 'night' },
    });
  });

  it('بيقرا من بعد الـ# كمان', () => {
    expect(parseOverrides('', '#/today?scene=mountains&time=dawn')).toEqual({
      scene: 'mountains',
      time: { kind: 'phase', phase: 'dawn' },
    });
  });

  it('ساعة معيّنة، وقفل الحركة', () => {
    expect(parseOverrides('?time=18:30&motion=off')).toEqual({
      time: { kind: 'clock', hours: 18, minutes: 30 },
      motion: false,
    });
  });

  it('بيتجاهل القيم الغلط', () => {
    expect(parseOverrides('?time=lunch&scene=desert&motion=maybe')).toEqual({});
    expect(parseOverrides('?time=25:00')).toEqual({});
  });
});
