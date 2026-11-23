import { describe, expect, it } from 'vitest';
import { doneMinutes, effectiveRung, nextCountdown, planDay } from './today';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 30);

describe('أيام المواصفات (المرحلة 3)', () => {
  it('الاتنين 23 نوفمبر 2026 = الأسبوع 1، اليوم 1، ساعة', () => {
    const d = planDay(day(2026, 11, 23));
    expect([d.weekNo, d.dayNo, d.planned, d.rung, d.template]).toEqual([1, 1, 60, 0, 'week1']);
    expect(d.tasks.map((t) => t.minutes)).toEqual([25, 10, 25]);
  });

  it('الجمعة 27 نوفمبر = اليوم 5 (تعويض)', () => {
    const d = planDay(day(2026, 11, 27));
    expect(d.dayNo).toBe(5);
    expect(d.rest).toBe(false);
    expect(d.special?.kind).toBe('compensation');
    expect(d.planDay?.label).toBe('الجمعة 27 (اليوم 5، تعويض)');
    // النطق من الاتنين للخميس بس
    expect(d.tasks.some((t) => t.kind === 'pronunciation')).toBe(false);
  });

  it('السبت 28 = التشخيص (استماع وقراءة)', () => {
    const d = planDay(day(2026, 11, 28));
    expect([d.weekNo, d.dayNo]).toEqual([1, 6]);
    expect(d.special?.kind).toBe('diagnosis');
    expect(d.tasks.map((t) => t.what).join(' ')).toMatch(/Hören[\s\S]*Lesen/);
    expect(d.planned).toBe(60);
  });

  it('الحد 29 = الأسبوع 2، كتابة التشخيص، ساعة ونص', () => {
    const d = planDay(day(2026, 11, 29));
    expect([d.weekNo, d.dayNo, d.rung, d.planned]).toEqual([2, 1, 1, 90]);
    expect(d.special?.kind).toBe('diagnosis');
    expect(d.tasks[0]?.what).toContain('Schreiben');
  });

  it('الجمعة 4 ديسمبر = راحة', () => {
    const d = planDay(day(2026, 12, 4));
    expect(d.rest).toBe(true);
    expect(d.tasks).toEqual([]);
    expect(d.dayNo).toBeNull();
  });

  it('الحد 6 ديسمبر، والسلّم طالع = أول يوم بأنواع الأيام', () => {
    const before = planDay(day(2026, 12, 5));
    expect(before.rung).toBe(1);
    expect(before.needsDayType).toBe(false);
    const d = planDay(day(2026, 12, 6));
    expect([d.weekNo, d.dayNo, d.rung, d.needsDayType]).toEqual([3, 1, 2, true]);
    expect(planDay(day(2026, 12, 6), { dayType: 'gym' })).toMatchObject({ template: 'gym', planned: 120 });
    expect(planDay(day(2026, 12, 6), { dayType: 'nogym' })).toMatchObject({ template: 'nogym', planned: 180 });
    expect(planDay(day(2026, 12, 6), { dayType: 'college' })).toMatchObject({ template: 'hour', planned: 60 });
    // لو السلّم مااطلعش، اليوم بيفضل ساعة ونص
    expect(planDay(day(2026, 12, 6), { ladder: 1 })).toMatchObject({ template: 'ninety', planned: 90 });
  });

  it('السبت 26 ديسمبر = امتحان A1 التجريبي', () => {
    const d = planDay(day(2026, 12, 26));
    expect(d.special).toMatchObject({ kind: 'mock', checkpoint: 'a1-mock' });
    expect(d.tasks[0]?.what).toBe('Start Deutsch 1 Modellsatz');
  });

  it('الحد 10 يناير 2027 = فاينل، ساعة', () => {
    const d = planDay(day(2027, 1, 10));
    expect([d.finals, d.template, d.planned, d.weekNo]).toEqual([true, 'hour', 60, 8]);
    expect(d.needsDayType).toBe(false);
  });
});

describe('السلّم والأسابيع', () => {
  it('الخطة بتحدد أعلى درجة بالتاريخ', () => {
    expect(effectiveRung('2026-11-25', 3)).toBe(0);
    expect(effectiveRung('2026-12-01', 3)).toBe(1);
    expect(effectiveRung('2026-12-10', 3)).toBe(3);
    expect(effectiveRung('2026-12-10', 'auto')).toBe(2);
    expect(effectiveRung('2026-12-10', 0)).toBe(0);
  });

  it('يوم الـ4 ساعات = اليوم اللي من غير جيم وساعة زيادة', () => {
    expect(planDay(day(2027, 2, 1), { ladder: 3, dayType: 'nogym' })).toMatchObject({ template: 'four', planned: 240 });
  });

  it('الأسبوع اللي قبل الفاينل: الساعة الزيادة (17–18) رايحة للكلية', () => {
    const d = planDay(day(2026, 12, 28), { dayType: 'nogym' });
    expect(d.preFinals).toBe(true);
    expect(d.planned).toBe(120);
    expect(d.tasks.some((t) => t.time?.startsWith('17'))).toBe(false);
    expect(planDay(day(2026, 12, 28), { dayType: 'gym' }).planned).toBe(120);
  });

  it('الأيام في الأسبوع: الحد 1 لحد الخميس 5، والسبت 6', () => {
    expect(planDay(day(2026, 12, 10)).dayNo).toBe(5);
    expect(planDay(day(2026, 12, 12)).dayNo).toBe(6);
    expect(planDay(day(2027, 1, 3)).weekNo).toBe(7);
    expect(planDay(day(2027, 1, 23)).weekNo).toBe(9);
  });

  it('قبل البداية مفيش مهام', () => {
    expect(planDay(day(2026, 11, 22))).toMatchObject({ beforeStart: true, tasks: [], weekNo: null });
  });

  it('يوم صغير: 15 دقيقة Anki و10 دقايق استماع', () => {
    const d = planDay(day(2026, 12, 9), { small: true });
    expect(d.tasks.map((t) => [t.what, t.minutes])).toEqual([
      ['Anki', 15],
      ['استماع', 10],
    ]);
    expect(d.planned).toBe(25);
  });
});

describe('العدّاد والدقايق', () => {
  it('«التشخيص بعد 4 أيام»', () => {
    expect(nextCountdown(day(2026, 11, 24))).toMatchObject({ m: { short: 'التشخيص' }, days: 4 });
  });

  it('الدقايق: التايمر أو وقت المهمة اللي اتعلّم عليها', () => {
    const tasks = planDay(day(2026, 11, 24)).tasks;
    const [a, b, c] = tasks.map((t) => t.key);
    expect(doneMinutes(tasks, [a!], {})).toBe(25);
    expect(doneMinutes(tasks, [a!], { [a!]: 31, [b!]: 4 })).toBe(35);
    expect(doneMinutes(tasks, [c!], { 'small-0': 15 })).toBe(40);
  });
});
