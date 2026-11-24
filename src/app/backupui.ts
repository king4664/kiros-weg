import { collect, parseBackup, restore, toFileText } from '../lib/backup';
import { daysBetween, parseISO, toISO } from '../lib/dates';
import { getAllDays, getLastExport, getSentences, setLastExport } from './daystore';

/** بيعمل ملف JSON بكل البيانات ويحمّله على الموبايل */
export function exportNow(): void {
  const now = new Date();
  setLastExport(toISO(now));
  const blob = new Blob([toFileText(collect(localStorage, now))], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kiros-weg-${toISO(now)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** بيقرا الملف، وبعد ما توافق بيحط البيانات اللي فيه مكان الحالية */
export async function importFile(file: File): Promise<string | null> {
  let backup;
  try {
    backup = parseBackup(await file.text());
  } catch (e) {
    return e instanceof Error ? e.message : 'الملف ده مااتقراش.';
  }
  const ok = window.confirm('الـImport هيمسح بياناتك الحالية على الموبايل ويحط اللي في الملف. متأكد؟');
  if (!ok) return 'مااتغيرش حاجة.';
  restore(localStorage, backup);
  location.reload();
  return null;
}

/** تذكير كل أسبوع: لو فيه بيانات ومافيش نسخة من 7 أيام أو أكتر */
export function backupDue(today = new Date()): boolean {
  const last = getLastExport();
  if (last) return daysBetween(parseISO(last), today) >= 7;
  return Object.keys(getAllDays()).length > 0 || !!getSentences();
}

export function lastExportText(): string {
  const last = getLastExport();
  if (!last) return 'لسه ماعملتش نسخة احتياطية.';
  const d = daysBetween(parseISO(last), new Date());
  return d <= 0 ? 'آخر نسخة: النهارده.' : d === 1 ? 'آخر نسخة: امبارح.' : `آخر نسخة: من ${d} ${d <= 10 ? 'أيام' : 'يوم'}.`;
}
