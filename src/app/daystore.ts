import type { FollowupValues, Lesson, RunningTimer, SentencesState } from '../lib/daily';
import type { DayType, LadderSetting } from '../lib/today';
import { isObject, isStringArray, readJSON, writeJSON } from './storage';

/** كل بيانات المتابعة على الموبايل بس، تحت kirosweg.* (Export وImport في المرحلة 4). */

export const KEYS = {
  days: 'kirosweg.days.v1',
  nicos: 'kirosweg.nicos.v1',
  ladder: 'kirosweg.ladder.v1',
  sentences: 'kirosweg.sentences.v1',
  splash: 'kirosweg.splash.v1',
  timer: 'kirosweg.timer.v1',
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
  /** خانات رسالة المتابعة */
  log?: Partial<FollowupValues>;
}

type Days = Record<string, DayRecord>;

const validDays = (v: unknown): v is Days => isObject(v) && Object.values(v).every(isObject);

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

/* السلّم */

const validLadder = (v: unknown): v is { setting: LadderSetting } =>
  isObject(v) && (v.setting === 'auto' || [0, 1, 2, 3].includes(v.setting as number));

export function getLadder(): LadderSetting {
  return readJSON(KEYS.ladder, { setting: 'auto' as LadderSetting }, validLadder).setting;
}

export function setLadder(setting: LadderSetting): void {
  writeJSON(KEYS.ladder, { setting });
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
