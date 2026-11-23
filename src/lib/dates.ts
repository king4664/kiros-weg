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

/** «2026-11-23» ← يوم في توقيت الموبايل، الساعة 00:00 */
export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** فرق الأيام في النتيجة (مش الساعات)، فالتوقيت الصيفي مابيأثرش. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** «بكرة»، «بعد يومين»، «بعد 5 أيام»، «بعد 12 يوم». */
export function inDays(n: number): string {
  if (n <= 0) return 'النهارده';
  if (n === 1) return 'بكرة';
  if (n === 2) return 'بعد يومين';
  if (n <= 10) return `بعد ${n} أيام`;
  return `بعد ${n} يوم`;
}

/** للحاجات اللي ليها آخر ميعاد: «فاضل يوم»، «فاضل يومين»، «فاضل 5 أيام». */
export function daysLeft(n: number): string {
  if (n <= 0) return 'آخر يوم النهارده';
  if (n === 1) return 'فاضل يوم';
  if (n === 2) return 'فاضل يومين';
  if (n <= 10) return `فاضل ${n} أيام`;
  return `فاضل ${n} يوم`;
}
