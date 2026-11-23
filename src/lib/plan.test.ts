import { describe, expect, it } from 'vitest';
import { MILESTONES, WEEKS } from '../data';
import { currentWeek, timeline, weekTitle } from './plan';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0);
const item = (today: Date, id: string) => timeline(MILESTONES, today).find((x) => x.m.id === id);

describe('الخط الزمني', () => {
  it('الاتنين 24 نوفمبر: البداية فاتت، والتشخيص هو الجاي بعد 4 أيام', () => {
    const today = day(2026, 11, 24);
    expect(item(today, 'start')?.status).toBe('past');
    expect(item(today, 'diagnosis')).toMatchObject({ status: 'next', days: 4 });
    expect(timeline(MILESTONES, today).filter((x) => x.status === 'next')).toHaveLength(1);
  });

  it('الميعاد اللي بالشهر بس مالوش عدّاد', () => {
    const x = item(day(2026, 11, 24), 'college-practicals');
    expect(x?.status).toBe('later');
    expect(x?.days).toBeUndefined();
    expect(item(day(2026, 12, 10), 'college-practicals')?.status).toBe('now');
  });

  it('التشخيص شغال يومين، وبعدهم يبقى فات', () => {
    expect(item(day(2026, 11, 28), 'diagnosis')?.status).toBe('now');
    expect(item(day(2026, 11, 29), 'diagnosis')?.status).toBe('now');
    expect(item(day(2026, 11, 30), 'diagnosis')?.status).toBe('past');
  });

  it('الجواز قبل مارس: آخر يوم 28 فبراير', () => {
    expect(item(day(2027, 2, 1), 'passport')).toMatchObject({ days: 27 });
    expect(item(day(2027, 2, 28), 'passport')).toMatchObject({ days: 0 });
    expect(item(day(2027, 3, 1), 'passport')?.status).toBe('past');
  });

  it('الفاينل: 3–23 يناير', () => {
    expect(item(day(2027, 1, 2), 'finals')).toMatchObject({ days: 1 });
    expect(item(day(2027, 1, 10), 'finals')?.status).toBe('now');
    expect(item(day(2027, 1, 24), 'finals')?.status).toBe('past');
  });
});

describe('الأسبوع الحالي', () => {
  it('بيلاقي الأسبوع من التاريخ', () => {
    expect(currentWeek(WEEKS, day(2026, 11, 22))).toBeNull();
    expect(currentWeek(WEEKS, day(2026, 11, 23))?.id).toBe('week-1');
    expect(currentWeek(WEEKS, day(2026, 11, 28))?.id).toBe('week-1');
    expect(currentWeek(WEEKS, day(2026, 11, 29))?.id).toBe('week-2');
    expect(currentWeek(WEEKS, day(2027, 1, 10))?.id).toBe('week-7-9');
    expect(currentWeek(WEEKS, day(2027, 3, 13))?.id).toBe('week-16');
    expect(currentWeek(WEEKS, day(2027, 3, 14))).toBeNull();
  });

  it('العنوان', () => {
    expect(weekTitle(WEEKS[0]!)).toBe('الأسبوع 1');
    expect(weekTitle(WEEKS.find((w) => w.from === 7)!)).toBe('الأسابيع 7–9');
  });
});
