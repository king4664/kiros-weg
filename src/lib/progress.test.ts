import { describe, expect, it } from 'vitest';
import planMd from '../../german-plan.md?raw';
import { toISO } from './dates';
import {
  blanks,
  expectedHours,
  fillSummary,
  ladderSuggestion,
  planWeek,
  streak,
  summaryTemplate,
  treeStage,
  type DayStat,
  type DayStatFn,
} from './progress';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 20, 0);

/** أيام مذاكرة فيها دقايق معيّنة. الجمعة راحة إلا 27 نوفمبر. */
function fake(minutes: Record<string, number>, planned = 60, allDone: Record<string, boolean> = {}): DayStatFn {
  return (d: Date): DayStat => {
    const iso = toISO(d);
    const study = iso >= '2026-11-23' && (d.getDay() !== 5 || iso === '2026-11-27');
    return { study, minutes: minutes[iso] ?? 0, planned: study ? planned : 0, allDone: allDone[iso] ?? false };
  };
}

const fullWeek1 = {
  '2026-11-23': 60,
  '2026-11-24': 65,
  '2026-11-25': 60,
  '2026-11-26': 70,
  '2026-11-27': 60,
  '2026-11-28': 60,
};

/** الأسبوع 2 كامل (الجمعة 4 راحة) */
const fullWeek2 = {
  '2026-11-29': 120,
  '2026-11-30': 120,
  '2026-12-01': 120,
  '2026-12-02': 120,
  '2026-12-03': 120,
  '2026-12-05': 120,
};

describe('السلّم (جزء 3)', () => {
  it('6 أيام كاملة = اقتراح تطلع', () => {
    const s = ladderSuggestion(day(2026, 11, 28), 0, fake(fullWeek1), {});
    expect(s).toMatchObject({ kind: 'up', weekId: '2026-11-23', stats: { complete: 6 } });
    // ولسه بيظهر أول الأسبوع الجاي لو مارديتش
    expect(ladderSuggestion(day(2026, 11, 29), 0, fake(fullWeek1), {})?.kind).toBe('up');
  });

  it('يوم التشخيص كامل لو كل مهامه خلصت، حتى لو الدقايق أقل', () => {
    const mins = { ...fullWeek1, '2026-11-28': 25 };
    expect(ladderSuggestion(day(2026, 11, 28), 0, fake(mins), {})).toBeNull();
    expect(ladderSuggestion(day(2026, 11, 28), 0, fake(mins, 60, { '2026-11-28': true }), {})?.kind).toBe('up');
  });

  it('يوم الـ4 ساعات بعد أسبوعين منتظمين بس (جزء 3)', () => {
    const w3: Record<string, number> = {};
    for (const d of ['2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-12']) w3[d] = 180;
    const w4: Record<string, number> = {};
    for (const d of ['2026-12-13', '2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-19']) w4[d] = 180;
    const done = { '2026-11-29:up': true };
    // أسبوع واحد كامل على درجة 2: لسه
    expect(ladderSuggestion(day(2026, 12, 12), 2, fake({ ...fullWeek2, ...w3 }, 180), done)).toBeNull();
    // أسبوعين ورا بعض: تطلع
    expect(ladderSuggestion(day(2026, 12, 19), 2, fake({ ...w3, ...w4 }, 180), done)).toMatchObject({ kind: 'up', weekId: '2026-12-13' });
    // ومن درجة 1 لـ2 أسبوع واحد كفاية
    expect(ladderSuggestion(day(2026, 12, 12), 1, fake({ ...fullWeek2, ...w3 }, 180), done)?.kind).toBe('up');
  });

  it('5 أيام كاملة بس: مفيش اقتراح', () => {
    const { '2026-11-26': _, ...five } = fullWeek1;
    expect(ladderSuggestion(day(2026, 11, 28), 0, fake({ ...five, '2026-11-26': 40 }), {})).toBeNull();
  });

  it('يومين فايتين في نفس الأسبوع = اقتراح تنزل', () => {
    const mins = { '2026-12-06': 120, '2026-12-08': 120, '2026-12-10': 120 };
    const s = ladderSuggestion(day(2026, 12, 10), 2, fake(mins, 120), {});
    expect(s).toMatchObject({ kind: 'down', weekId: '2026-12-06', stats: { missed: 2 } });
  });

  it('يوم واحد فايت، والجمعة الراحة مش محسوبة: مفيش اقتراح', () => {
    const mins = { ...fullWeek2, '2026-12-06': 120, '2026-12-07': 120, '2026-12-09': 120, '2026-12-10': 120 };
    expect(ladderSuggestion(day(2026, 12, 12), 2, fake(mins, 120), { '2026-11-29:up': true })).toBeNull();
  });

  it('النهارده مش فايت لسه، واليوم الصغير مش فايت', () => {
    const mins = { ...fullWeek2, '2026-12-06': 25, '2026-12-07': 120 };
    expect(ladderSuggestion(day(2026, 12, 8), 2, fake(mins, 120), { '2026-11-29:up': true })).toBeNull();
  });

  it('مابيقترحش تاني بعد ما ترد، ومابيعديش أول وآخر درجة', () => {
    expect(ladderSuggestion(day(2026, 11, 28), 0, fake(fullWeek1), { '2026-11-23:up': true })).toBeNull();
    expect(ladderSuggestion(day(2026, 11, 28), 3, fake(fullWeek1), {})).toBeNull();
    expect(ladderSuggestion(day(2026, 12, 10), 0, fake({}, 60), {})).toBeNull();
  });

  it('أسابيع الخطة', () => {
    expect(planWeek(day(2026, 11, 22))).toBeNull();
    expect(planWeek(day(2026, 11, 25))?.id).toBe('2026-11-23');
    expect(planWeek(day(2026, 11, 29))?.id).toBe('2026-11-29');
    expect(toISO(planWeek(day(2026, 12, 5))!.end)).toBe('2026-12-05');
  });
});

describe('الأرقام', () => {
  it('أيام ورا بعض من غير يوم صفر، والجمعة مابتقطعش', () => {
    const mins = { '2026-12-01': 90, '2026-12-02': 90, '2026-12-03': 90, '2026-12-05': 30 };
    expect(streak(day(2026, 12, 5), fake(mins))).toBe(4);
    // النهارده لسه مااتذاكرش: بنعدّ من امبارح
    expect(streak(day(2026, 12, 6), fake(mins))).toBe(4);
    expect(streak(day(2026, 12, 7), fake(mins))).toBe(0);
  });

  it('الساعات المفروضة لحد النهارده من جدول جزء 3', () => {
    expect(expectedHours(day(2026, 11, 22))).toEqual({ min: 0, max: 0 });
    expect(expectedHours(day(2026, 11, 28))).toEqual({ min: 6, max: 6 });
    expect(expectedHours(day(2026, 12, 5))).toEqual({ min: 15, max: 15 });
    expect(expectedHours(day(2027, 3, 13))).toEqual({ min: 177, max: 222 });
  });

  it('الشجرة: 5 مراحل عند 0 و45 و90 و135 و180', () => {
    expect(treeStage(0)).toEqual({ stage: 1, next: 45 });
    expect(treeStage(44.9)).toEqual({ stage: 1, next: 45 });
    expect(treeStage(45)).toEqual({ stage: 2, next: 90 });
    expect(treeStage(179)).toEqual({ stage: 4, next: 180 });
    expect(treeStage(230)).toEqual({ stage: 5, next: null });
  });
});

describe('ملخص الأسبوع بنفس شكل جزء 14', () => {
  const tpl = summaryTemplate(planMd);

  it('الشكل من الخطة، وفيه 17 خانة', () => {
    expect(tpl.split('\n')[0]).toBe('الأسبوع رقم: __ | التاريخ: __');
    expect(blanks(tpl)).toBe(17);
  });

  it('بيتملي بالترتيب', () => {
    const out = fillSummary(
      tpl,
      ['2', 'السبت 5 ديسمبر', '8.5', '9', '22', '132', '91', '85', '80', 'der/die', 'Akkusativ', 'Verb', 'الأرقام', '23–36', 'Modalverben', 'لأ', 'مفيش'],
      'A1',
    );
    expect(out).toBe(
      [
        'الأسبوع رقم: 2 | التاريخ: السبت 5 ديسمبر',
        'الساعات الفعلية: 8.5 / المخطط: 9',
        'Nicos Weg: وصلت لدرس 22 (A1)',
        'Anki: كروت إجمالي 132 | نسبة الصح 91%',
        'نتيجة اختبار الخميس: كلمات 85% | قواعد 80%',
        'أهم 3 أخطاء متكررة: 1) der/die 2) Akkusativ 3) Verb',
        'القواعد اللي خلصتها: الأرقام',
        'الأسبوع الجاي: دروس 23–36 | قواعد Modalverben | امتحان تجريبي؟ لأ',
        'مواعيد كلية معروفة: مفيش',
      ].join('\n'),
    );
  });

  it('الفاضي بيفضل __', () => {
    expect(fillSummary(tpl, ['3']).split('\n')[0]).toBe('الأسبوع رقم: 3 | التاريخ: __');
  });
});
