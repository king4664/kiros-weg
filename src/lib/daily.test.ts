import { describe, expect, it } from 'vitest';
import planMd from '../../german-plan.md?raw';
import { parseISO } from './dates';
import {
  clock,
  fillFollowup,
  followupTemplate,
  lessonTitle,
  loggedMinutes,
  nextLesson,
  parseLines,
  previousLesson,
  readyMessages,
  saveSentences,
  sentenceFor,
  timerView,
  wordsForDay,
} from './daily';

describe('رسالة المتابعة بنفس شكل جزء 14 بالظبط', () => {
  const tpl = followupTemplate(planMd);

  it('الشكل جاي من الخطة', () => {
    expect(tpl).toBe('النهارده: __ دقيقة | Anki ✓ | درس __ | كلام __ دقيقة | الغلط: __');
  });

  it('بتتملي بالترتيب', () => {
    expect(
      fillFollowup(tpl, { minutes: '60', anki: true, lesson: '4', speaking: '10', mistake: 'die Tisch بدل der Tisch' }),
    ).toBe('النهارده: 60 دقيقة | Anki ✓ | درس 4 | كلام 10 دقيقة | الغلط: die Tisch بدل der Tisch');
  });

  it('الخانة الفاضية بتفضل __، وAnki من غير ✓ بتبقى ✗', () => {
    expect(fillFollowup(tpl, { minutes: '45', anki: false, lesson: '', speaking: '5', mistake: '' })).toBe(
      'النهارده: 45 دقيقة | Anki ✗ | درس __ | كلام 5 دقيقة | الغلط: __',
    );
  });
});

describe('رسايل Claude الجاهزة (جزء 13)', () => {
  it('كلها، والأولى ليها بدايل', () => {
    const msgs = readyMessages(planMd);
    expect(msgs).toHaveLength(7);
    expect(msgs[0]).toEqual({
      text: 'ألماني النهارده. يوم جيم.',
      note: '(أو: يوم من غير جيم، أو: يوم امتحان كلية)',
    });
    expect(msgs[6]?.text).toBe('اعملي ملف Anki بكلمات الأسبوع [رقم].');
  });
});

describe('Nicos Weg', () => {
  it('الدرس الجاي من آخر درس خلص', () => {
    expect(nextLesson(null)).toEqual({ level: 'A1', n: 1 });
    expect(nextLesson({ level: 'A1', n: 4 })).toEqual({ level: 'A1', n: 5 });
    expect(nextLesson({ level: 'A1', n: 76 })).toEqual({ level: 'A2', n: 1 });
    expect(previousLesson({ level: 'A2', n: 1 })).toEqual({ level: 'A1', n: 76 });
    expect(previousLesson({ level: 'A1', n: 1 })).toBeNull();
  });

  it('الترقيم زي ملاحظات جزء 6', () => {
    expect(lessonTitle({ level: 'A1', n: 1 })).toBe('Hallo!');
    expect(lessonTitle({ level: 'A1', n: 2 })).toBe('Kein Problem!');
    expect(lessonTitle({ level: 'A1', n: 3 })).toBe('Tschüss!');
    expect(lessonTitle({ level: 'A1', n: 4 })).toBe('Von A bis Z');
    expect(lessonTitle({ level: 'A2', n: 1 })).toBeUndefined();
  });
});

describe('كلمات الأسبوع 1', () => {
  it('10 كلمات كل يوم من الاتنين للسبت', () => {
    expect(wordsForDay(new Date(2026, 10, 23))?.words.map((w) => w.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(wordsForDay(new Date(2026, 10, 28))).toMatchObject({ day: 6 });
    expect(wordsForDay(new Date(2026, 10, 28))?.words[9]?.de).toBe('die Studentin');
    expect(wordsForDay(new Date(2026, 10, 29))).toBeNull();
  });
});

describe('جملة اليوم', () => {
  const d = (s: string) => parseISO(s);

  it('سطر لكل جملة، والسطور الفاضية مش محسوبة', () => {
    expect(parseLines(' أ \n\n ب\r\nج ')).toEqual(['أ', 'ب', 'ج']);
  });

  it('أول جملة يوم الحفظ، وكل يوم اللي بعدها، وبعد الأخيرة ترجع للأولى', () => {
    const s = saveSentences(null, ['أ', 'ب', 'ج'], '2026-11-24', d('2026-11-24'));
    expect(sentenceFor(s, d('2026-11-24'))).toBe('أ');
    expect(sentenceFor(s, d('2026-11-25'))).toBe('ب');
    expect(sentenceFor(s, d('2026-11-26'))).toBe('ج');
    expect(sentenceFor(s, d('2026-11-27'))).toBe('أ');
    // حتى لو التطبيق مااتفتحش كام يوم
    expect(sentenceFor(s, d('2026-12-04'))).toBe('ب');
  });

  it('التعديل مابيغيّرش جملة النهارده', () => {
    const s = saveSentences(null, ['أ', 'ب', 'ج'], '2026-11-24', d('2026-11-24'));
    const edited = saveSentences(s, ['جديدة', 'أ', 'ب', 'ج'], '2026-11-25', d('2026-11-25'));
    expect(sentenceFor(edited, d('2026-11-25'))).toBe('ب');
    expect(sentenceFor(edited, d('2026-11-26'))).toBe('ج');
    expect(sentenceFor(edited, d('2026-11-27'))).toBe('جديدة');
  });

  it('من غير جمل: مفيش كارت', () => {
    expect(saveSentences(null, [], '2026-11-24', d('2026-11-24'))).toBeNull();
    expect(sentenceFor(null, d('2026-11-24'))).toBeNull();
  });
});

describe('التايمر بيحسب من وقت البداية', () => {
  const start = Date.UTC(2026, 10, 24, 10, 0, 0);

  it('الباقي، وبعد الوقت بيعدّ الزيادة', () => {
    const t = { date: '2026-11-24', key: 'week1-0', label: 'Nicos Weg', startedAt: start, planned: 25 };
    expect(timerView(t, start + 60_000)).toMatchObject({ text: '24:00', over: false });
    // الشاشة اتقفلت 20 دقيقة: الحساب من وقت البداية
    expect(timerView(t, start + 20 * 60_000 + 30_000).text).toBe('4:30');
    expect(timerView(t, start + 25 * 60_000 + 3_000)).toMatchObject({ text: '+0:03', over: true, progress: 1 });
  });

  it('من غير وقت مخطط: بيعدّ لفوق', () => {
    const t = { date: '2026-11-28', key: 'special-0', label: 'Hören', startedAt: start };
    expect(timerView(t, start + 17 * 60_000 + 5_000).text).toBe('17:05');
    expect(clock(3_725_000)).toBe('1:02:05');
    expect(loggedMinutes(17 * 60_000 + 40_000)).toBe(18);
  });
});

describe('التمرين السريع', () => {
  it('10 كلمات مختلفة', async () => {
    const { pickRandom } = await import('./daily');
    const { WORDS } = await import('../data');
    const picked = pickRandom(WORDS, 10);
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((w) => w.id)).size).toBe(10);
    expect(pickRandom([1, 2, 3], 10)).toHaveLength(3);
  });
});
