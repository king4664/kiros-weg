import { toISO } from '../lib/dates';
import type { DayStatFn } from '../lib/progress';
import { doneMinutes, planDay } from '../lib/today';
import { getAllDays, getLadder, type DayRecord } from './daystore';

const hasData = (r: DayRecord) =>
  !!(r.done?.length || (r.minutes && Object.keys(r.minutes).length) || r.log || r.total || r.type || r.small);

/** دقايق اليوم: اللي كتبته في خانة الدقايق، وإلا اللي خلص من المهام والتايمر. */
export function dayMinutes(rec: DayRecord, date: Date, ladder = getLadder()): number {
  const typed = Number(rec.log?.minutes);
  if (rec.log?.minutes?.trim() && Number.isFinite(typed)) return Math.max(0, typed);
  if (typeof rec.total === 'number') return rec.total;
  const plan = planDay(date, { ladder, dayType: rec.type ?? null, small: rec.small ?? false });
  return doneMinutes(plan.tasks, rec.done ?? [], rec.minutes ?? {});
}

/**
 * حالة كل يوم للسلّم والأرقام. الأيام اللي قبل أول يوم اتسجل فيه حاجة
 * مش بتتحسب فايتة (قبل ما تبدأ تستخدم التطبيق).
 */
export function makeDayStat(): DayStatFn {
  const days = getAllDays();
  const ladder = getLadder();
  const tracked = Object.keys(days)
    .filter((k) => hasData(days[k] as DayRecord))
    .sort();
  const first = tracked[0] ?? toISO(new Date());
  return (d) => {
    const iso = toISO(d);
    const rec = days[iso] ?? {};
    const plan = planDay(d, { ladder, dayType: rec.type ?? null });
    const done = new Set(rec.done ?? []);
    return {
      study: !plan.rest && !plan.beforeStart && iso >= first,
      minutes: dayMinutes(rec, d, ladder),
      planned: rec.planned ?? plan.planned,
      allDone: rec.allDone ?? (plan.tasks.length > 0 && plan.tasks.every((t) => done.has(t.key))),
    };
  };
}

/** كل الدقايق اللي اتسجلت */
export function totalMinutes(): number {
  const days = getAllDays();
  return Object.entries(days).reduce((n, [iso, rec]) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    return n + dayMinutes(rec, new Date(y, m - 1, d));
  }, 0);
}
