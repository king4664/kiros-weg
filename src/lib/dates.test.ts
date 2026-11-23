import { describe, expect, it } from 'vitest';
import { formatClock, formatDate } from './dates';

describe('التواريخ', () => {
  it('بنفس كتابة الخطة', () => {
    expect(formatDate(new Date(2026, 10, 23))).toBe('الاتنين 23 نوفمبر 2026');
    expect(formatDate(new Date(2026, 10, 29), false)).toBe('الحد 29 نوفمبر');
    expect(formatDate(new Date(2027, 0, 10))).toBe('الحد 10 يناير 2027');
  });

  it('الساعة', () => {
    expect(formatClock(new Date(2026, 10, 23, 6, 5))).toBe('6:05');
    expect(formatClock(new Date(2026, 10, 23, 17, 42))).toBe('17:42');
  });
});
