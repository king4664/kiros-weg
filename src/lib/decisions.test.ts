import { describe, expect, it } from 'vitest';
import { DECISIONS, type BandsCheckpoint } from '../data';
import { droppedParts, parseScore, pickBand, weakestParts, weeklyDecision } from './decisions';

const cp = (id: string) => DECISIONS.checkpoints.find((c) => c.id === id) as BandsCheckpoint;

describe('الدرجة', () => {
  it('بتقبل أرقام من 0 لـ100 بس', () => {
    expect(parseScore('85')).toBe(85);
    expect(parseScore(' 72.5 ')).toBe(72.5);
    expect(parseScore('85%')).toBe(85);
    expect(parseScore('١٠٠')).toBe(100);
    expect(parseScore('')).toBeUndefined();
    expect(parseScore('101')).toBeUndefined();
    expect(parseScore('-1')).toBeUndefined();
    expect(parseScore('كتير')).toBeUndefined();
  });
});

describe('قرار التشخيص', () => {
  const d = cp('diagnosis');
  it('75% أو أكتر في القراءة والاستماع: سرّع', () => {
    expect(pickBand(d.bands, { lesen: 80, hoeren: 75 }, d.parts)?.min).toBe(75);
  });
  it('جزء تحت 75: السرعة اللي في الجدول', () => {
    expect(pickBand(d.bands, { lesen: 90, hoeren: 74 }, d.parts)?.min).toBe(50);
    expect(pickBand(d.bands, { lesen: 50, hoeren: 60 }, d.parts)?.min).toBe(50);
  });
  it('أقل من 50: بالراحة', () => {
    expect(pickBand(d.bands, { lesen: 49, hoeren: 90 }, d.parts)?.min).toBe(0);
  });
  it('لسه جزء فاضي: مفيش قرار', () => {
    expect(pickBand(d.bands, { lesen: 90 }, d.parts)).toBeNull();
  });
});

describe('قرار امتحان A1', () => {
  const a1 = cp('a1-mock');
  it('الأربع أجزاء', () => {
    expect(pickBand(a1.bands, { hoeren: 80, lesen: 95, schreiben: 88, sprechen: 81 }, a1.parts)?.min).toBe(80);
    expect(pickBand(a1.bands, { hoeren: 79, lesen: 95, schreiben: 88, sprechen: 81 }, a1.parts)?.min).toBe(60);
    expect(pickBand(a1.bands, { hoeren: 59, lesen: 95, schreiben: 88, sprechen: 81 }, a1.parts)?.min).toBe(0);
  });
  it('الجزء الأضعف', () => {
    expect(weakestParts({ hoeren: 62, lesen: 95, schreiben: 62, sprechen: 81 }, a1.parts)).toEqual([
      'hoeren',
      'schreiben',
    ]);
  });
});

describe('اختبار الأسبوع', () => {
  it('سرّع: 85+ تلات أسابيع، وAnki 90+', () => {
    expect(weeklyDecision([86, 90, 85], 91)).toBe('up');
    expect(weeklyDecision([86, 90, 85], 89)).toBe('keep');
    expect(weeklyDecision([86, 90], 95)).toBe('keep');
  });
  it('هدّي: أقل من 70 أسبوعين ورا بعض', () => {
    expect(weeklyDecision([69, 65], undefined)).toBe('down');
    expect(weeklyDecision([69, 75], undefined)).toBe('keep');
    expect(weeklyDecision([69], undefined)).toBe('keep');
  });
  it('من غير درجة الأسبوع ده: مفيش قرار', () => {
    expect(weeklyDecision([undefined, 80, 80], 95)).toBeNull();
  });
});

describe('امتحان A2 التاني', () => {
  const parts = ['hoeren', 'lesen', 'schreiben', 'sprechen'] as const;
  it('بيقول أنهي جزء نزل', () => {
    const before = { hoeren: 70, lesen: 80, schreiben: 85, sprechen: 66 };
    expect(droppedParts({ hoeren: 72, lesen: 78, schreiben: 85, sprechen: 70 }, before, parts)).toEqual(['lesen']);
    expect(droppedParts({ hoeren: 72, lesen: 80, schreiben: 90, sprechen: 70 }, before, parts)).toEqual([]);
    expect(droppedParts({ hoeren: 72 }, before, parts)).toBeNull();
  });
});
