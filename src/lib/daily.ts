import { NICOS, WORDS, type Word } from '../data';
import { daysBetween, parseISO } from './dates';
import { section } from './markdown';

/* Nicos Weg: الدرس الجاي بيتحسب من آخر درس خلّصته، مش من التاريخ */

export type Level = 'A1' | 'A2' | 'B1';
export interface Lesson {
  level: Level;
  n: number;
}

const LEVELS: Level[] = ['A1', 'A2', 'B1'];
/** جزء 18: 76 درس في كل مستوى */
export const LESSONS_PER_LEVEL = 76;

export function nextLesson(last: Lesson | null): Lesson {
  if (!last) return { level: 'A1', n: 1 };
  if (last.n < LESSONS_PER_LEVEL) return { level: last.level, n: last.n + 1 };
  const i = LEVELS.indexOf(last.level);
  return i < LEVELS.length - 1 ? { level: LEVELS[i + 1] as Level, n: 1 } : last;
}

export function previousLesson(l: Lesson): Lesson | null {
  if (l.n > 1) return { level: l.level, n: l.n - 1 };
  const i = LEVELS.indexOf(l.level);
  return i > 0 ? { level: LEVELS[i - 1] as Level, n: LESSONS_PER_LEVEL } : null;
}

/** اسم الدرس من صفحة DW (A1 بس) */
export function lessonTitle(l: Lesson): string | undefined {
  return l.level === 'A1' ? NICOS.A1[l.n - 1] : undefined;
}

/* كلمات الأسبوع 1: 10 كل يوم من الاتنين 23 للسبت 28 (جزء 24) */

export const WEEK1_START = '2026-11-23';

export function wordsForDay(date: Date): { day: number; words: Word[] } | null {
  const day = daysBetween(parseISO(WEEK1_START), date) + 1;
  if (day < 1 || day > 6) return null;
  return { day, words: WORDS.filter((w) => w.week === 1 && w.day === day) };
}

/* رسالة المتابعة (جزء 14) */

export interface FollowupValues {
  minutes: string;
  anki: boolean;
  lesson: string;
  speaking: string;
  mistake: string;
}

/** الشكل من الخطة نفسها: «النهارده: __ دقيقة | Anki ✓ | درس __ | كلام __ دقيقة | الغلط: __» */
export function followupTemplate(md: string): string {
  const p = section(md, 14).blocks.find((b) => b.t === 'p' && b.text.includes('رسالة المتابعة اليومية'));
  const m = p && p.t === 'p' ? p.text.match(/«(.+?)»/) : null;
  if (!m) throw new Error('شكل رسالة المتابعة مش موجود في جزء 14');
  return m[1] as string;
}

/** بيملا الخانات بالترتيب. الخانة الفاضية بتفضل __ علشان تبان. */
export function fillFollowup(template: string, v: FollowupValues): string {
  const values = [v.minutes, v.lesson, v.speaking, v.mistake].map((x) => x.trim());
  let i = 0;
  const filled = template.replace(/__/g, () => values[i++] || '__');
  return v.anki ? filled : filled.replace('Anki ✓', 'Anki ✗');
}

/* رسايل Claude الجاهزة (جزء 13) */

export interface ReadyMessage {
  text: string;
  /** الكلام اللي بعد الرسالة بين قوسين، زي البدايل */
  note?: string;
}

export function readyMessages(md: string): ReadyMessage[] {
  const blocks = section(md, 13).blocks;
  const i = blocks.findIndex((b) => b.t === 'h' && b.text.startsWith('رسايل جاهزة'));
  const list = blocks.slice(i + 1).find((b) => b.t === 'list');
  if (!list || list.t !== 'list') return [];
  return list.items.map((item) => {
    const m = item.text.match(/^«(.+?)»\s*(.*)$/);
    if (!m) return { text: item.text };
    const note = (m[2] as string).trim();
    return note ? { text: m[1] as string, note } : { text: m[1] as string };
  });
}

/* جملة اليوم: جملة لكل تاريخ بالترتيب، وبعد آخر جملة ترجع للأولى */

export interface SentencesState {
  lines: string[];
  /** اليوم اللي بنعدّ منه */
  anchor: string;
  /** رقم الجملة يوم anchor */
  offset: number;
}

export function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function sentenceIndex(s: SentencesState, today: Date): number {
  const n = s.lines.length;
  const d = daysBetween(parseISO(s.anchor), today);
  return (((s.offset + d) % n) + n) % n;
}

export function sentenceFor(s: SentencesState | null, today: Date): string | null {
  if (!s || !s.lines.length) return null;
  return s.lines[sentenceIndex(s, today)] ?? null;
}

/**
 * حفظ الجمل: أول مرة بتبدأ من الجملة الأولى النهارده.
 * بعد التعديل، جملة النهارده بتفضل زي ما هي لو لسه موجودة.
 */
export function saveSentences(prev: SentencesState | null, lines: string[], todayIso: string, today: Date): SentencesState | null {
  if (!lines.length) return null;
  if (!prev || !prev.lines.length) return { lines, anchor: todayIso, offset: 0 };
  const i = sentenceIndex(prev, today);
  const current = prev.lines[i];
  const found = current === undefined ? -1 : lines.indexOf(current);
  return { lines, anchor: todayIso, offset: found >= 0 ? found : i % lines.length };
}

/* التايمر: بيحسب من وقت البداية، فبيفضل مظبوط لو الشاشة اتقفلت */

export interface RunningTimer {
  date: string;
  key: string;
  label: string;
  startedAt: number;
  /** الدقايق المخططة للمهمة، لو ليها وقت */
  planned?: number;
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export interface TimerView {
  elapsed: number;
  /** النص الكبير: الباقي، أو +الزيادة، أو اللي عدّى لو مفيش وقت مخطط */
  text: string;
  over: boolean;
  /** من 0 لـ1 */
  progress: number;
}

export function timerView(t: RunningTimer, now: number): TimerView {
  const elapsed = Math.max(0, now - t.startedAt);
  if (!t.planned) return { elapsed, text: clock(elapsed), over: false, progress: 0 };
  const total = t.planned * 60_000;
  const over = elapsed >= total;
  return {
    elapsed,
    text: over ? `+${clock(elapsed - total)}` : clock(total - elapsed),
    over,
    progress: Math.min(1, elapsed / total),
  };
}

/** الدقايق اللي بتتسجل لما توقف التايمر */
export function loggedMinutes(elapsedMs: number): number {
  return Math.round(elapsedMs / 60_000);
}
