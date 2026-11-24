import type { FollowupValues, Lesson, RunningTimer, SentencesState } from '../lib/daily';
import { toISO } from '../lib/dates';
import { effectiveRung, type DayType, type LadderSetting, type Rung } from '../lib/today';
import { isObject, isStringArray, readJSON, writeJSON } from './storage';

/** كل بيانات المتابعة على الموبايل بس، تحت kirosweg.* (Export وImport في المرحلة 4). */

export const KEYS = {
  days: 'kirosweg.days.v1',
  nicos: 'kirosweg.nicos.v1',
  ladder: 'kirosweg.ladder.v1',
  sentences: 'kirosweg.sentences.v1',
  splash: 'kirosweg.splash.v1',
  timer: 'kirosweg.timer.v1',
  reviews: 'kirosweg.reviews.v1',
  mistakes: 'kirosweg.mistakes.v1',
  backup: 'kirosweg.backup.v1',
} as const;

/** بيتبعت لما أي حاجة من دول تتغير، علشان الشاشات تتحدّث */
export const CHANGED = 'kirosweg:changed';
const notify = () => window.dispatchEvent(new Event(CHANGED));

/* كل يوم */

export interface DayRecord {
  type?: DayType;
  small?: boolean;
  /** المهام اللي اتعلّم عليها */
  done?: string[];
  /** دقايق التايمر لكل مهمة */
  minutes?: Record<string, number>;
  /** خانات رسالة المتابعة، ودقايق الاستماع (جدول جزء 14) */
  log?: Partial<FollowupValues & { listening: string }>;
  /** الدقايق اللي خلصت (من المهام والتايمر)، بتتحفظ لما شاشة النهارده تتفتح */
  total?: number;
  /** وقت اليوم في الخطة (اليوم العادي) */
  planned?: number;
  /** كل مهام اليوم العادي اتعلّم عليها */
  allDone?: boolean;
}

type Days = Record<string, DayRecord>;

const validDays = (v: unknown): v is Days => isObject(v) && Object.values(v).every(isObject);

export function getAllDays(): Days {
  return readJSON<Days>(KEYS.days, {}, validDays);
}

export function getDay(iso: string): DayRecord {
  return readJSON<Days>(KEYS.days, {}, validDays)[iso] ?? {};
}

/** silent: بيحفظ من غير ما الشاشة تترسم تاني (وإنت بتكتب في خانة) */
export function updateDay(iso: string, fn: (d: DayRecord) => DayRecord, silent = false): void {
  const all = readJSON<Days>(KEYS.days, {}, validDays);
  all[iso] = fn(all[iso] ?? {});
  writeJSON(KEYS.days, all);
  if (!silent) notify();
}

/* Nicos Weg: آخر درس خلص */

const validLesson = (v: unknown): v is { last: Lesson | null } =>
  isObject(v) &&
  (v.last === null ||
    (isObject(v.last) && ['A1', 'A2', 'B1'].includes(v.last.level as string) && typeof v.last.n === 'number'));

export function getLastLesson(): Lesson | null {
  return readJSON(KEYS.nicos, { last: null }, validLesson).last;
}

export function setLastLesson(last: Lesson | null): void {
  writeJSON(KEYS.nicos, { last });
  notify();
}

/* السلّم: بيطلع بس لما كيرو يأكد (المرحلة 4) */

interface LadderState {
  setting: LadderSetting;
  /** الاقتراحات اللي اترد عليها: «2026-11-23:up» */
  answered?: Record<string, boolean>;
}

const validLadder = (v: unknown): v is LadderState =>
  isObject(v) && (v.setting === 'auto' || [0, 1, 2, 3].includes(v.setting as number));

function ladderState(): LadderState {
  return readJSON<LadderState>(KEYS.ladder, { setting: 0 }, validLadder);
}

/** الدرجة الحالية. «زي مواعيد الخطة» القديمة بتبقى درجة النهارده. */
export function getLadder(): Rung {
  const s = ladderState().setting;
  return s === 'auto' ? effectiveRung(toISO(new Date()), 'auto') : s;
}

export function getLadderAnswered(): Record<string, boolean> {
  return ladderState().answered ?? {};
}

export function setLadder(setting: Rung): void {
  writeJSON(KEYS.ladder, { ...ladderState(), setting });
  notify();
}

/** رد على اقتراح السلّم. لو وافقت، الدرجة بتتغير. */
export function answerLadder(key: string, rung: Rung | null): void {
  const s = ladderState();
  writeJSON(KEYS.ladder, { setting: rung ?? s.setting, answered: { ...s.answered, [key]: true } });
  notify();
}

/* جملة اليوم */

const validSentences = (v: unknown): v is SentencesState =>
  isObject(v) && isStringArray(v.lines) && typeof v.anchor === 'string' && typeof v.offset === 'number';

export function getSentences(): SentencesState | null {
  return readJSON<SentencesState | null>(KEYS.sentences, null, (v): v is SentencesState | null => v === null || validSentences(v));
}

export function setSentences(s: SentencesState | null): void {
  if (s) writeJSON(KEYS.sentences, s);
  else {
    try {
      localStorage.removeItem(KEYS.sentences);
    } catch {
      // مفيش تخزين
    }
  }
  notify();
}

/** آخر يوم الجملة ظهرت فيه لوحدها */
export function getSplashDate(): string | null {
  return readJSON<{ date: string | null }>(KEYS.splash, { date: null }, (v): v is { date: string | null } =>
    isObject(v),
  ).date;
}

export function setSplashDate(date: string): void {
  writeJSON(KEYS.splash, { date });
}

/* التايمر */

const validTimer = (v: unknown): v is RunningTimer =>
  isObject(v) && typeof v.key === 'string' && typeof v.startedAt === 'number' && typeof v.date === 'string';

export function getTimer(): RunningTimer | null {
  return readJSON<RunningTimer | null>(KEYS.timer, null, (v): v is RunningTimer | null => v === null || validTimer(v));
}

export function setTimer(t: RunningTimer | null): void {
  writeJSON(KEYS.timer, t);
  notify();
}

/* المراجعة الأسبوعية: خانات «ملخص الأسبوع» لكل أسبوع */

type Reviews = Record<string, string[]>;
const validReviews = (v: unknown): v is Reviews => isObject(v) && Object.values(v).every(isStringArray);

export function getReview(weekId: string): string[] {
  return readJSON<Reviews>(KEYS.reviews, {}, validReviews)[weekId] ?? [];
}

export function setReview(weekId: string, values: string[]): void {
  const all = readJSON<Reviews>(KEYS.reviews, {}, validReviews);
  all[weekId] = values;
  writeJSON(KEYS.reviews, all);
}

/* كراسة الأخطاء (جزء 21) */

export interface Mistake {
  id: string;
  wrong: string;
  right: string;
  type: string;
  count: number;
  added: string;
}

const validMistakes = (v: unknown): v is Mistake[] =>
  Array.isArray(v) && v.every((m) => isObject(m) && typeof m.id === 'string' && typeof m.count === 'number');

export function getMistakes(): Mistake[] {
  return readJSON<Mistake[]>(KEYS.mistakes, [], validMistakes);
}

export function setMistakes(list: Mistake[]): void {
  writeJSON(KEYS.mistakes, list);
  notify();
}

/* آخر نسخة احتياطية */

export function getLastExport(): string | null {
  return readJSON<{ lastExport: string | null }>(KEYS.backup, { lastExport: null }, (v): v is { lastExport: string | null } =>
    isObject(v),
  ).lastExport;
}

export function setLastExport(iso: string): void {
  writeJSON(KEYS.backup, { lastExport: iso });
}
