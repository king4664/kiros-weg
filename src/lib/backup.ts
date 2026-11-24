/**
 * النسخ الاحتياطي: كل حاجة تحت kirosweg.* في ملف JSON واحد.
 * بيشتغل على أي حاجة زي localStorage، فبيتعمله تست من غير متصفح.
 */

export const PREFIX = 'kirosweg.';
export const APP_ID = 'kiros-weg';

export interface KeyValueStore {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export interface Backup {
  app: typeof APP_ID;
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

function ownKeys(store: KeyValueStore): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  return keys.sort();
}

export function collect(store: KeyValueStore, now: Date): Backup {
  const data: Record<string, unknown> = {};
  for (const k of ownKeys(store)) {
    const raw = store.getItem(k);
    if (raw === null) continue;
    // نخزن الكائنات زي ما هي علشان الملف يتقري، والنص بنحطه خام علشان يرجع بالحرف
    try {
      const parsed: unknown = JSON.parse(raw);
      data[k] = typeof parsed === 'string' ? raw : parsed;
    } catch {
      data[k] = raw;
    }
  }
  return { app: APP_ID, version: 1, exportedAt: now.toISOString(), data };
}

export function toFileText(b: Backup): string {
  return JSON.stringify(b, null, 2);
}

/** بيقرا ملف النسخة. لو مش ملف Kiros Weg بيرمي رسالة بالعربي. */
export function parseBackup(text: string): Backup {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw new Error('الملف ده مش JSON.');
  }
  const b = v as Partial<Backup>;
  if (!b || typeof b !== 'object' || b.app !== APP_ID || typeof b.data !== 'object' || b.data === null) {
    throw new Error('الملف ده مش نسخة احتياطية من Kiros Weg.');
  }
  if (b.version !== 1) throw new Error('نسخة الملف ده مش معروفة.');
  if (Object.keys(b.data).some((k) => !k.startsWith(PREFIX))) throw new Error('الملف فيه بيانات مش بتاعة التطبيق.');
  return b as Backup;
}

/** بيمسح بيانات التطبيق الحالية، ويحط اللي في النسخة بالظبط. */
export function restore(store: KeyValueStore, b: Backup): void {
  for (const k of ownKeys(store)) store.removeItem(k);
  for (const [k, v] of Object.entries(b.data)) {
    store.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
}
