/** أسماء الأيام والشهور بنفس كتابة german-plan.md (الأحد = الحد). */
export const WEEKDAYS = ['الحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'] as const;

export const MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

/** مثلًا: «الاتنين 23 نوفمبر 2026» */
export function formatDate(d: Date, withYear = true): string {
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}

/** مثلًا: «6:05» أو «17:42» بتوقيت الجهاز. */
export function formatClock(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
