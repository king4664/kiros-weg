import { HOURS } from '../data';
import { daysBetween, parseISO, toISO } from './dates';
import { section } from './markdown';
import type { Rung } from './today';

/** حالة يوم للمتابعة: يوم مذاكرة ولا راحة، واتعمل فيه كام دقيقة من كام. */
export interface DayStat {
  /** يوم مذاكرة (مش الجمعة الراحة، ومش قبل البداية) */
  study: boolean;
  minutes: number;
  /** وقت اليوم في الخطة (اليوم العادي، مش اليوم الصغير) */
  planned: number;
}

export type DayStatFn = (date: Date) => DayStat;

const START = HOURS.periods[0]?.start as string;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** اليوم الكامل: الدقايق وصلت لوقت اليوم في الخطة */
export const isComplete = (s: DayStat) => s.study && s.planned > 0 && s.minutes >= s.planned;
/** اليوم الفايت: يوم مذاكرة صفر. اليوم الصغير مش فايت لأنه «بيتحسب يوم» (جزء 15). */
export const isMissed = (s: DayStat) => s.study && s.minutes <= 0;

/** أسبوع الخطة: الأسبوع 1 من الاتنين 23 للسبت 28، وبعده من الحد للسبت. */
export function planWeek(date: Date): { id: string; start: Date; end: Date } | null {
  const iso = toISO(date);
  if (iso < START) return null;
  const start = iso <= '2026-11-28' ? parseISO(START) : addDays(date, -date.getDay());
  const end = iso <= '2026-11-28' ? parseISO('2026-11-28') : addDays(start, 6);
  return { id: toISO(start), start, end };
}

export interface WeekStats {
  complete: number;
  missed: number;
  /** أيام المذاكرة اللي عدّت لحد النهارده */
  studyDays: number;
}

/** الأسبوع لحد «until» (من غير ما نحسب النهارده فايت لو لسه شغال) */
export function weekStats(week: { start: Date; end: Date }, until: Date, today: Date, stat: DayStatFn): WeekStats {
  const out: WeekStats = { complete: 0, missed: 0, studyDays: 0 };
  for (let d = week.start; daysBetween(d, week.end) >= 0 && daysBetween(d, until) >= 0; d = addDays(d, 1)) {
    const s = stat(d);
    if (!s.study) continue;
    out.studyDays++;
    if (isComplete(s)) out.complete++;
    else if (daysBetween(d, today) > 0 && isMissed(s)) out.missed++;
  }
  return out;
}

export interface LadderSuggestion {
  kind: 'up' | 'down';
  weekId: string;
  stats: WeekStats;
}

/**
 * السلّم (جزء 3): «تطلع درجة بس لما تكمّل 6 أيام في الأسبوع. ولو فاتك يومين، تنزل درجة.»
 * بيبص على الأسبوع ده، وبعدين اللي قبله. «answered» فيها الاقتراحات اللي اترد عليها.
 */
export function ladderSuggestion(
  today: Date,
  rung: Rung,
  stat: DayStatFn,
  answered: Readonly<Record<string, boolean>>,
): LadderSuggestion | null {
  const cur = planWeek(today);
  if (!cur) return null;
  const prev = planWeek(addDays(cur.start, -1));
  const weeks = [
    { w: cur, until: today },
    ...(prev ? [{ w: prev, until: prev.end }] : []),
  ];
  for (const { w, until } of weeks) {
    const stats = weekStats(w, until, today, stat);
    if (stats.missed >= 2 && rung > 0 && !answered[`${w.id}:down`]) return { kind: 'down', weekId: w.id, stats };
    if (stats.complete >= 6 && rung < 3 && !answered[`${w.id}:up`]) return { kind: 'up', weekId: w.id, stats };
  }
  return null;
}

/** أيام ورا بعض من غير يوم صفر. الجمعة الراحة مابتقطعش. النهارده بيتحسب لو اتذاكر فيه بس. */
export function streak(today: Date, stat: DayStatFn): number {
  let n = 0;
  let d = stat(today).minutes > 0 ? today : addDays(today, -1);
  while (toISO(d) >= START) {
    const s = stat(d);
    if (s.study) {
      if (s.minutes <= 0) break;
      n++;
    }
    d = addDays(d, -1);
  }
  return n;
}

/** الساعات اللي المفروض تكون خلصت لحد النهارده حسب جدول جزء 3 */
export function expectedHours(today: Date): { min: number; max: number } {
  let min = 0;
  let max = 0;
  for (const p of HOURS.periods) {
    const days = daysBetween(parseISO(p.start), parseISO(p.end)) + 1;
    const done = Math.min(days, Math.max(0, daysBetween(parseISO(p.start), today) + 1));
    min += (p.min * done) / days;
    max += (p.max * done) / days;
  }
  return { min: Math.round(min), max: Math.round(max) };
}

/** الشجرة: 5 مراحل عند 0 و45 و90 و135 و180 ساعة */
export function treeStage(hours: number): { stage: number; next: number | null } {
  const t = HOURS.tree;
  const stage = t.filter((h) => hours >= h).length;
  return { stage: Math.max(1, stage), next: t[stage] ?? null };
}

/* ملخص الأسبوع (جزء 14) */

export function summaryTemplate(md: string): string {
  const code = section(md, 14).blocks.find((b) => b.t === 'code');
  if (!code || code.t !== 'code') throw new Error('ملخص الأسبوع مش موجود في جزء 14');
  return code.text;
}

/** عدد الخانات في ملخص الأسبوع */
export const blanks = (tpl: string) => (tpl.match(/__/g) ?? []).length;

/** بيملا الخانات بالترتيب. الفاضية بتفضل __، و(A1/A2) بتبقى المستوى لو معروف. */
export function fillSummary(tpl: string, values: readonly string[], level?: string): string {
  let i = 0;
  const filled = tpl.replace(/__/g, () => (values[i++] ?? '').trim() || '__');
  return level ? filled.replace('(A1/A2)', `(${level})`) : filled;
}
