import type { Milestone, Week } from '../data/types';
import { daysBetween, parseISO } from './dates';

export type MilestoneStatus = 'past' | 'now' | 'next' | 'later';

export interface TimelineItem {
  m: Milestone;
  status: MilestoneStatus;
  /** الأيام لحد البداية (أو لحد آخر ميعاد في deadline). مش موجودة لو اللي فات أو لو الميعاد شهر بس. */
  days?: number;
}

function statusOf(m: Milestone, today: Date): { status: 'past' | 'now' | 'later'; days?: number } {
  const start = daysBetween(today, parseISO(m.date));
  if (m.deadline) {
    return start < 0 ? { status: 'past' } : { status: 'later', days: start };
  }
  const end = daysBetween(today, parseISO(m.end ?? m.date));
  if (end < 0) return { status: 'past' };
  if (start <= 0) return { status: 'now' };
  return m.approx ? { status: 'later' } : { status: 'later', days: start };
}

/** المحطات بالترتيب: اللي فات، واللي شغال دلوقتي، والجاية (أول واحدة «next»). */
export function timeline(milestones: readonly Milestone[], today: Date): TimelineItem[] {
  let marked = false;
  return milestones.map((m) => {
    const s = statusOf(m, today);
    if (s.status === 'later' && !marked) {
      marked = true;
      return { m, status: 'next', days: s.days };
    }
    return { m, ...s };
  });
}

/** الأسبوع اللي النهارده فيه، أو null قبل البداية وبعد آخر أسبوع. */
export function currentWeek(weeks: readonly Week[], today: Date): Week | null {
  return (
    weeks.find((w) => daysBetween(parseISO(w.start), today) >= 0 && daysBetween(today, parseISO(w.end)) >= 0) ?? null
  );
}

/** «الأسبوع 3» أو «الأسابيع 7–9» */
export function weekTitle(w: Week): string {
  return w.from === w.to ? `الأسبوع ${w.from}` : `الأسابيع ${w.from}–${w.to}`;
}
