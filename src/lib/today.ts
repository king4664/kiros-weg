import {
  MILESTONES,
  PLAN_DAYS,
  SPECIAL_DAYS,
  TEMPLATES,
  WEEKS,
  type Milestone,
  type PlanDay,
  type SpecialDay,
  type TaskRow,
  type TemplateId,
  type Week,
} from '../data';
import { daysBetween, parseISO, toISO } from './dates';
import { currentWeek, timeline } from './plan';

/**
 * السلّم (جزء 3): 0 ساعة، 1 ساعة ونص، 2 أنواع الأيام، 3 أنواع الأيام واليوم اللي من غير جيم 4 ساعات.
 * «auto» يعني زي مواعيد الخطة: ساعة لحد 28 نوفمبر، وساعة ونص لحد 5 ديسمبر، وأنواع الأيام من 6 ديسمبر.
 */
export type Rung = 0 | 1 | 2 | 3;
export type LadderSetting = 'auto' | Rung;
export type DayType = 'gym' | 'nogym' | 'college';

export const RUNG_NAMES: Record<Rung, string> = {
  0: 'ساعة في اليوم',
  1: 'ساعة ونص في اليوم',
  2: 'يوم الجيم ساعتين، واليوم اللي من غير جيم 3 ساعات',
  3: 'يوم الجيم ساعتين، واليوم اللي من غير جيم 4 ساعات',
};

export const DAY_TYPE_NAMES: Record<DayType, string> = {
  gym: 'يوم جيم',
  nogym: 'يوم من غير جيم',
  college: 'يوم امتحان كلية',
};

function milestone(id: string): Milestone {
  const m = MILESTONES.find((x) => x.id === id);
  if (!m) throw new Error(`محطة ${id} مش موجودة`);
  return m;
}

const START = milestone('start').date;
const NINETY_FROM = milestone('ninety-minutes').date;
const DAY_TYPES_FROM = milestone('day-types').date;

/** أعلى درجة الخطة بتسمح بيها في التاريخ ده */
function capFor(iso: string): Rung {
  if (iso < NINETY_FROM) return 0;
  if (iso < DAY_TYPES_FROM) return 1;
  return 3;
}

/** الدرجة لو ماشي زي مواعيد الخطة (الـ4 ساعات محتاجة تأكيد منك) */
function scheduledRung(iso: string): Rung {
  if (iso < NINETY_FROM) return 0;
  if (iso < DAY_TYPES_FROM) return 1;
  return 2;
}

export function effectiveRung(iso: string, ladder: LadderSetting): Rung {
  const want = ladder === 'auto' ? scheduledRung(iso) : ladder;
  return Math.min(want, capFor(iso)) as Rung;
}

export interface Task extends TaskRow {
  /** مفتاح ثابت للمهمة في اليوم ده */
  key: string;
}

export interface Day {
  iso: string;
  weekday: number;
  beforeStart: boolean;
  week: Week | null;
  /** رقم الأسبوع (7 أو 8 أو 9 جوه «7–9») */
  weekNo: number | null;
  /** اليوم في الأسبوع: 1–6 (الجمعة راحة ومالهاش رقم، إلا في الأسبوع 1) */
  dayNo: number | null;
  rest: boolean;
  special: SpecialDay | null;
  planDay: PlanDay | null;
  finals: boolean;
  /** الأسبوع اللي قبل الفاينل: الساعة الزيادة (17–18) رايحة للكلية */
  preFinals: boolean;
  rung: Rung;
  /** محتاج تختار نوع اليوم (جيم، من غير جيم، امتحان كلية) */
  needsDayType: boolean;
  dayType: DayType | null;
  template: TemplateId | null;
  small: boolean;
  tasks: Task[];
  /** دقايق اليوم في الخطة */
  planned: number;
}

const RUNG_MINUTES: Record<Rung, number> = { 0: 60, 1: 90, 2: 0, 3: 0 };

function rowsOf(id: TemplateId): TaskRow[] {
  const t = TEMPLATES[id];
  return t.base ? [...TEMPLATES[t.base].rows, ...t.rows] : t.rows;
}

const sum = (rows: readonly TaskRow[]) => rows.reduce((n, r) => n + (r.minutes ?? 0), 0);

export interface DayOptions {
  ladder?: LadderSetting;
  dayType?: DayType | null;
  /** «يوم صغير» (جزء 15) */
  small?: boolean;
}

/** اليوم في الخطة: الأسبوع، ونوعه، ومهامه. */
export function planDay(date: Date, opts: DayOptions = {}): Day {
  const iso = toISO(date);
  const weekday = date.getDay();
  const week = currentWeek(WEEKS, date);
  const weekNo = week ? week.from + Math.floor(daysBetween(parseISO(week.start), date) / 7) : null;
  const special = SPECIAL_DAYS.find((s) => s.date === iso) ?? null;
  const planDayEntry = PLAN_DAYS.find((d) => d.date === iso) ?? null;
  const finalsM = milestone('finals');
  const finals = iso >= finalsM.date && iso <= (finalsM.end ?? finalsM.date);
  const toFinals = daysBetween(date, parseISO(finalsM.date));
  const preFinals = toFinals >= 1 && toFinals <= 7;
  const beforeStart = iso < START;
  const rest = !beforeStart && weekday === 5 && special?.kind !== 'compensation';
  const isWeek1 = week?.from === 1;

  let dayNo: number | null = null;
  if (week && !rest) dayNo = isWeek1 ? weekday : weekday === 6 ? 6 : weekday + 1;

  const rung = effectiveRung(iso, opts.ladder ?? 'auto');
  const base: Day = {
    iso,
    weekday,
    beforeStart,
    week,
    weekNo,
    dayNo,
    rest,
    special,
    planDay: planDayEntry,
    finals,
    preFinals,
    rung,
    needsDayType: false,
    dayType: null,
    template: null,
    small: false,
    tasks: [],
    planned: 0,
  };
  if (beforeStart || rest) return base;

  const withKeys = (source: string, rows: TaskRow[]): Task[] => rows.map((r, i) => ({ ...r, key: `${source}-${i}` }));

  if (opts.small) {
    const rows = rowsOf('small');
    return { ...base, small: true, template: 'small', tasks: withKeys('small', rows), planned: sum(rows) };
  }

  if (special?.tasks) {
    const planned = special.kind === 'diagnosis' ? RUNG_MINUTES[Math.min(rung, 1) as Rung] : sum(special.tasks);
    return { ...base, tasks: withKeys(`special-${special.date}`, special.tasks), planned };
  }

  let template: TemplateId | null;
  let dayType: DayType | null = null;
  let needsDayType = false;
  if (isWeek1) template = 'week1';
  else if (finals) template = 'hour';
  else if (rung === 0) template = 'hour';
  else if (rung === 1) template = 'ninety';
  else {
    dayType = opts.dayType ?? null;
    if (dayType === 'gym') template = 'gym';
    else if (dayType === 'nogym') template = rung === 3 ? 'four' : 'nogym';
    else if (dayType === 'college') template = 'hour';
    else {
      template = null;
      needsDayType = true;
    }
  }
  if (!template) return { ...base, needsDayType };

  let rows = rowsOf(template).filter((r) => !r.weekdays || r.weekdays.includes(weekday));
  if (preFinals && (template === 'nogym' || template === 'four')) rows = rows.filter((r) => !r.evening);
  const planned = isWeek1 ? RUNG_MINUTES[0] : sum(rows);
  return { ...base, dayType, template, tasks: withKeys(template, rows), planned };
}

/** المحطة الجاية اللي ليها تاريخ مظبوط، للعدّاد: «التشخيص بعد 4 أيام». */
export function nextCountdown(today: Date): { m: Milestone; days: number } | null {
  const item = timeline(MILESTONES, today).find((x) => (x.status === 'next' || x.status === 'later') && x.days !== undefined);
  return item ? { m: item.m, days: item.days as number } : null;
}

/** المحطة اللي شغالة النهارده (لو فيه) */
export function milestonesNow(today: Date): Milestone[] {
  return timeline(MILESTONES, today)
    .filter((x) => x.status === 'now' && !x.m.approx)
    .map((x) => x.m);
}

/** الدقايق اللي خلصت النهارده: التايمر، أو وقت المهمة لو علّمت عليها من غير تايمر. */
export function doneMinutes(tasks: readonly Task[], done: readonly string[], logged: Readonly<Record<string, number>>): number {
  const keys = new Set(tasks.map((t) => t.key));
  let total = 0;
  for (const t of tasks) total += Math.max(logged[t.key] ?? 0, done.includes(t.key) ? (t.minutes ?? 0) : 0);
  // تايمر اتعمل لمهمة مش في القايمة دلوقتي (مثلًا قبل ما تقلب ليوم صغير)
  for (const [k, m] of Object.entries(logged)) if (!keys.has(k)) total += m;
  return total;
}
