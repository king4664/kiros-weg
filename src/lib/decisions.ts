import type { Band, ExamPart } from '../data/types';

export type Scores = Partial<Record<ExamPart, number>>;

/** «85» ← 85. أي حاجة مش رقم من 0 لـ100 بترجع undefined. */
export function parseScore(raw: string): number | undefined {
  const s = raw.trim().replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace('%', '');
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined;
}

/** أقل درجة في الأجزاء دي، أو undefined لو جزء لسه فاضي. */
export function lowest(scores: Scores, parts: readonly ExamPart[]): number | undefined {
  const values = parts.map((p) => scores[p]);
  if (values.some((v) => v === undefined)) return undefined;
  return Math.min(...(values as number[]));
}

/** الأجزاء اللي فيها أقل درجة (للجزء الأضعف). */
export function weakestParts(scores: Scores, parts: readonly ExamPart[]): ExamPart[] {
  const min = lowest(scores, parts);
  return min === undefined ? [] : parts.filter((p) => scores[p] === min);
}

/**
 * القرار حسب الدرجات. بناخد أقل جزء، لأن القواعد بتقول «في كل جزء» أو «في أي جزء».
 * الـbands مترتبة من الأعلى للأقل.
 */
export function pickBand<B extends Band>(bands: readonly B[], scores: Scores, parts: readonly ExamPart[]): B | null {
  const min = lowest(scores, parts);
  if (min === undefined) return null;
  return bands.find((b) => min >= b.min) ?? null;
}

export type WeeklyResult = 'up' | 'keep' | 'down';

/**
 * اختبار الأسبوع (جزء 9): [الأسبوع ده، اللي قبله، اللي قبله].
 * سرّع: 85% أو أكتر 3 أسابيع ورا بعض، وAnki 90% أو أكتر.
 * هدّي: أقل من 70% أسبوعين ورا بعض. غير كده: كمّل.
 */
export function weeklyDecision(weeks: readonly (number | undefined)[], anki: number | undefined): WeeklyResult | null {
  const [w0, w1, w2] = weeks;
  if (w0 === undefined) return null;
  if (w0 >= 85 && w1 !== undefined && w1 >= 85 && w2 !== undefined && w2 >= 85 && anki !== undefined && anki >= 90) {
    return 'up';
  }
  if (w0 < 70 && w1 !== undefined && w1 < 70) return 'down';
  return 'keep';
}

/** الأجزاء اللي درجتها نزلت عن المرة اللي فاتت. null لو فيه جزء لسه فاضي. */
export function droppedParts(now: Scores, before: Scores, parts: readonly ExamPart[]): ExamPart[] | null {
  if (parts.some((p) => now[p] === undefined || before[p] === undefined)) return null;
  return parts.filter((p) => (now[p] as number) < (before[p] as number));
}
