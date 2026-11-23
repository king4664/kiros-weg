import { describe, expect, it } from 'vitest';
import { daysBetween, daysLeft, formatClock, formatDate, inDays, parseISO, toISO } from './dates';

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

  it('YYYY-MM-DD رايح جاي', () => {
    const d = parseISO('2027-01-03');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 0, 3, 0]);
    expect(toISO(d)).toBe('2027-01-03');
    expect(toISO(new Date(2026, 10, 23, 23, 59))).toBe('2026-11-23');
  });

  it('فرق الأيام بيعدّي السنة والتوقيت الصيفي', () => {
    expect(daysBetween(parseISO('2026-11-24'), parseISO('2026-11-28'))).toBe(4);
    expect(daysBetween(parseISO('2026-12-31'), parseISO('2027-01-01'))).toBe(1);
    expect(daysBetween(new Date(2026, 10, 24, 23, 50), new Date(2026, 10, 25, 0, 5))).toBe(1);
    expect(daysBetween(parseISO('2027-03-01'), parseISO('2027-07-01'))).toBe(122);
    expect(daysBetween(parseISO('2026-11-28'), parseISO('2026-11-24'))).toBe(-4);
  });

  it('العدّاد بالعامية', () => {
    expect(inDays(0)).toBe('النهارده');
    expect(inDays(1)).toBe('بكرة');
    expect(inDays(2)).toBe('بعد يومين');
    expect(inDays(5)).toBe('بعد 5 أيام');
    expect(inDays(10)).toBe('بعد 10 أيام');
    expect(inDays(11)).toBe('بعد 11 يوم');
    expect(daysLeft(1)).toBe('فاضل يوم');
    expect(daysLeft(2)).toBe('فاضل يومين');
    expect(daysLeft(96)).toBe('فاضل 96 يوم');
  });
});
