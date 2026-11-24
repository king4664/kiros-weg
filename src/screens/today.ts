import planMd from '../../german-plan.md?raw';
import { renderBlocks } from '../app/blocks';
import {
  CHANGED,
  getDay,
  getLadder,
  getLastLesson,
  getSentences,
  updateDay,
  setLastLesson,
  type DayRecord,
} from '../app/daystore';
import { esc, rich } from '../app/dom';
import { icons } from '../app/icons';
import { DECISIONS, LINKS, MILESTONES, TEMPLATES, type Link } from '../data';
import {
  fillFollowup,
  followupTemplate,
  lessonTitle,
  nextLesson,
  previousLesson,
  readyMessages,
  sentenceFor,
  wordsForDay,
  type FollowupValues,
} from '../lib/daily';
import { daysLeft, formatDate, inDays, toISO } from '../lib/dates';
import { section, type Block } from '../lib/markdown';
import { weekTitle } from '../lib/plan';
import {
  DAY_TYPE_NAMES,
  RUNG_NAMES,
  doneMinutes,
  milestonesNow,
  nextCountdown,
  planDay,
  type Day,
  type DayType,
  type Task,
} from '../lib/today';
import type { Screen } from './types';

const CLAUDE_URL = 'https://claude.ai';
const linkById = new Map(LINKS.map((l) => [l.id, l]));
const FOLLOWUP = followupTemplate(planMd);
const MESSAGES = readyMessages(planMd);
const RING = 2 * Math.PI * 34;

/** جزء 5: الخميس والسبت */
function weekdayNote(weekday: number): Block[] {
  const list = section(planMd, 5).blocks.find((b) => b.t === 'list');
  if (!list || list.t !== 'list') return [];
  const prefix = weekday === 4 ? '**الخميس:**' : weekday === 6 ? '**السبت: يوم احتياطي.**' : null;
  const item = prefix ? list.items.find((i) => i.text.startsWith(prefix)) : undefined;
  return item ? [{ t: 'p', text: item.text }, ...item.sub] : [];
}

/** جزء 15، أول بند: أقل حاجة */
const SMALL_DAY_TEXT = (() => {
  const list = section(planMd, 15).blocks.find((b) => b.t === 'list');
  return list && list.t === 'list' ? (list.items[0]?.text ?? '') : '';
})();

/** جزء 3: قاعدة الأسبوع اللي قبل امتحان الكلية */
const PRE_EXAM_RULE = (() => {
  const list = section(planMd, 3).blocks.find((b) => b.t === 'list');
  return list && list.t === 'list' ? (list.items.find((i) => i.text.includes('الأسبوع اللي قبل'))?.text ?? '') : '';
})();

/** بينسخ للحافظة. لو الموبايل رفض، بيجرّب الطريقة القديمة. بيرجّع true لو اتنسخ. */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

const COPIED = 'اتنسخت ✓';
const NOT_COPIED = 'مااتنسختش. علّم على الكلام وانسخه بإيدك.';

function linkBtn(l: Link): string {
  return `<a class="chip-btn" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${icons[l.type]}<span>${rich(l.name)}</span></a>`;
}

function claudeBtn(label = 'افتح Claude'): string {
  return `<a class="chip-btn" href="${CLAUDE_URL}" target="_blank" rel="noopener noreferrer">${icons.site}<span>${label}</span></a>`;
}

function taskLinks(t: Task): string {
  if (t.links?.length) return t.links.map((id) => linkById.get(id)).filter((l): l is Link => !!l).map(linkBtn).join('');
  switch (t.kind) {
    case 'nicos':
      return linkBtn(linkById.get('nicos-weg') as Link);
    case 'pronunciation':
      return linkBtn(linkById.get('yaghi-pronunciation') as Link);
    case 'claude':
      return claudeBtn();
    case 'followup':
      return `<button type="button" class="chip-btn" data-goto="followup">${icons.mail}<span>رسالة المتابعة</span></button>`;
    default:
      return '';
  }
}

function ring(done: number, planned: number): string {
  const p = planned ? Math.min(1, done / planned) : 0;
  return `
    <div class="ring" role="img" aria-label="${planned ? `خلصت ${done} دقيقة من ${planned}` : `خلصت ${done} دقيقة`}">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle class="ring-bg" cx="40" cy="40" r="34" />
        ${planned ? `<circle class="ring-fg" cx="40" cy="40" r="34" stroke-dasharray="${RING}" stroke-dashoffset="${RING * (1 - p)}" />` : ''}
      </svg>
      <span class="ring-text"><strong>${done}</strong>${planned ? `<small>من ${planned}</small>` : '<small>دقيقة</small>'}</span>
    </div>`;
}

function heroHtml(day: Day, today: Date, done: number): string {
  let line: string;
  if (day.beforeStart) {
    const start = MILESTONES.find((m) => m.id === 'start');
    line = `الخطة بتبدأ ${rich(start?.when ?? '')}.`;
  } else if (day.rest) {
    line = `${day.weekNo ? `الأسبوع ${day.weekNo} · ` : ''}الجمعة راحة بجد.`;
  } else {
    const parts = [];
    if (day.weekNo) parts.push(`الأسبوع ${day.weekNo}`);
    if (day.dayNo) parts.push(`اليوم ${day.dayNo}`);
    if (!day.special?.tasks || day.special.kind === 'diagnosis') parts.push(
      day.finals
        ? 'أيام الفاينل: ساعة'
        : day.small
          ? 'يوم صغير'
          : day.dayType
            ? DAY_TYPE_NAMES[day.dayType]
            : esc(RUNG_NAMES[day.rung]),
    );
    line = parts.join(' · ');
  }
  const now = milestonesNow(today);
  const next = nextCountdown(today);
  const countdown = [
    ...now.map((m) => `النهارده: ${rich(m.short)}`),
    next ? `${rich(next.m.short)} ${next.m.deadline ? `(${daysLeft(next.days)})` : inDays(next.days)}` : '',
  ].filter(Boolean);
  return `
    <section class="card hero today-hero">
      <div class="hero-row">
        <div class="hero-text">
          <p class="eyebrow">النهارده</p>
          <h1 class="title">${formatDate(today)}</h1>
          <p>${line}</p>
          ${countdown.length ? `<p class="muted">${countdown.join(' · ')}</p>` : ''}
        </div>
        ${day.rest || day.beforeStart ? '' : ring(done, day.planned)}
      </div>
      ${day.rest || day.beforeStart ? '' : `<button type="button" class="ghost-btn" data-calm>دقيقة هدوء قبل المذاكرة</button>`}
    </section>`;
}

function dayTypeHtml(day: Day): string {
  if (day.rung < 2 || day.rest || day.finals || day.special?.tasks || day.week?.from === 1 || day.small) return '';
  const four = day.rung === 3;
  const opts: [DayType, string][] = [
    ['gym', 'ساعتين · 12:00–14:00'],
    ['nogym', `${four ? '4 ساعات' : '3 ساعات'} · 09:00–11:00، وبعدين 17:00–18:00`],
    ['college', 'ساعة · أي وقت في اليوم'],
  ];
  return `
    <section class="card">
      <h2 class="card-title" id="daytype-label">${day.needsDayType ? 'النهارده نوعه إيه؟' : 'نوع اليوم'}</h2>
      <div class="daytype" role="radiogroup" aria-labelledby="daytype-label">
        ${opts
          .map(
            ([id, sub]) => `
          <label class="choice">
            <input type="radio" name="daytype" value="${id}"${day.dayType === id ? ' checked' : ''} />
            <span class="choice-body"><span>${DAY_TYPE_NAMES[id]}</span><small class="muted">${sub}</small></span>
          </label>`,
          )
          .join('')}
      </div>
      ${day.preFinals ? `<p class="note">${rich(PRE_EXAM_RULE)}</p>` : ''}
    </section>`;
}

function specialHtml(day: Day): string {
  const out: string[] = [];
  if (day.special?.kind === 'diagnosis') {
    out.push(`<p class="eyebrow">التشخيص</p><p>${rich(MILESTONES.find((m) => m.id === 'diagnosis')?.what ?? '')}</p>
      <p class="small">لما الدرجات تطلع، اكتبها في <a href="#/plan">الخطة ← القرارات</a>.</p>`);
  }
  if (day.special?.kind === 'mock') {
    const cp = DECISIONS.checkpoints.find((c) => c.id === day.special?.checkpoint);
    if (cp) {
      out.push(`<p class="eyebrow">امتحان تجريبي</p>
        <p><strong>${rich(cp.title)}</strong>${cp.exam ? `: ${rich(cp.exam)}` : ''}</p>
        ${cp.note ? `<p class="small">${rich(cp.note)}</p>` : ''}
        ${DECISIONS.notes.map((n) => `<p class="small">${rich(n)}</p>`).join('')}
        <p class="small">بعد التصحيح، اكتب درجاتك في <a href="#/plan">الخطة ← القرارات</a>.</p>`);
    }
  }
  if (day.finals) {
    const m = MILESTONES.find((x) => x.id === 'finals');
    out.push(`<p class="eyebrow">الفاينل</p><p>${rich(m?.what ?? '')}</p>`);
  }
  if (!out.length) return '';
  return `<section class="card special">${out.join('')}</section>`;
}

function planTextHtml(day: Day): string {
  if (day.planDay) {
    return `
      <section class="card">
        <h2 class="card-title">النهارده في الخطة</h2>
        <p class="muted small">${rich(day.planDay.label)} · جزء 7</p>
        <p>${rich(day.planDay.text)}</p>
      </section>`;
  }
  if (!day.week || day.rest) return '';
  const w = day.week;
  return `
    <details class="card sec">
      <summary class="sec-head">
        <span class="sec-title"><span class="card-title">${weekTitle(w)} في المنهج</span><span class="part-tag">${rich(w.dates)} · جزء 6</span></span>
        ${icons.chevron}
      </summary>
      <div class="sec-body">
        <dl class="kv">
          <div><dt>${rich('Nicos Weg')}</dt><dd>${rich(w.nicos)}</dd></div>
          <div><dt>القواعد</dt><dd>${rich(w.grammar)}</dd></div>
          <div><dt>المواضيع والمحطات</dt><dd>${rich(w.topics)}</dd></div>
          <div><dt>الكتابة والكلام</dt><dd>${rich(w.output)}</dd></div>
        </dl>
      </div>
    </details>`;
}

function tasksHtml(day: Day, rec: DayRecord): string {
  if (day.rest || day.beforeStart) return '';
  if (day.needsDayType) {
    return `<section class="card"><p class="muted">اختار نوع اليوم فوق، والمهام هتظهر.</p></section>`;
  }
  const done = new Set(rec.done ?? []);
  let title = day.template ? TEMPLATES[day.template].title : 'مهام النهارده';
  if (day.preFinals && day.template === 'nogym') title = 'اليوم اللي من غير جيم، ساعتين';
  const items = day.tasks
    .map((t) => {
      const logged = rec.minutes?.[t.key] ?? 0;
      const id = `task-${t.key}`;
      return `
        <li class="task${done.has(t.key) ? ' done' : ''}">
          <label class="task-hit"><input type="checkbox" class="task-check" data-task="${t.key}" data-focus="task-${t.key}" aria-labelledby="${id}"${done.has(t.key) ? ' checked' : ''} /></label>
          <div class="task-body">
            ${t.time || logged ? `<p class="task-time">${t.time ? rich(t.time) : ''}${logged ? `${t.time ? ' · ' : ''}اتسجل ${logged} دقيقة` : ''}</p>` : ''}
            <p class="task-what" id="${id}">${rich(t.what)}</p>
            <div class="task-actions">
              ${t.kind === 'rest' ? '' : `<button type="button" class="chip-btn" data-timer="${t.key}" data-focus="timer-${t.key}">${icons.today}<span>تايمر</span></button>`}
              ${taskLinks(t)}
            </div>
          </div>
        </li>`;
    })
    .join('');
  return `
    <section class="card">
      <h2 class="card-title">${title}</h2>
      ${day.template === 'four' ? '<p class="small muted">نفس يوم الـ3 ساعات، وساعة زيادة (جزء 4).</p>' : ''}
      <ul class="tasks">${items}</ul>
      <div class="small-day">
        ${
          day.small
            ? `<button type="button" class="ghost-btn" data-small="off" data-focus="small">رجّع اليوم العادي</button>`
            : `<p class="small muted">${rich(SMALL_DAY_TEXT)}</p>
               <button type="button" class="ghost-btn" data-small="on" data-focus="small">يوم صغير</button>`
        }
      </div>
    </section>`;
}

function nicosHtml(day: Day): string {
  if (day.rest || day.beforeStart) return '';
  const last = getLastLesson();
  const next = nextLesson(last);
  const title = lessonTitle(next);
  const planned = day.planDay?.lessons;
  return `
    <section class="card">
      <h2 class="card-title">${rich('Nicos Weg')}: الدرس الجاي</h2>
      <p class="lesson"><span class="lesson-n">${rich(next.level)} · ${next.n}</span>${title ? ` ${rich(title)}` : ''}</p>
      <p class="small muted">${last ? `آخر درس خلّصته: ${rich(last.level)} ${last.n}.` : 'لسه ماعلّمتش على أي درس.'} الدرس الجاي بيتحسب من هنا، مش من التاريخ.${
        planned ? ` الخطة النهارده: درس ${planned[0]}${planned[1] !== planned[0] ? `–${planned[1]}` : ''}.` : ''
      }</p>
      <div class="task-actions">
        <button type="button" class="btn" data-lesson="done" data-focus="lesson-done">خلّصت درس ${next.n}</button>
        ${last ? `<button type="button" class="ghost-btn" data-lesson="undo" data-focus="lesson-undo">رجوع درس</button>` : ''}
        ${linkBtn(linkById.get('nicos-weg') as Link)}
      </div>
    </section>`;
}

function wordsHtml(today: Date): string {
  const w = wordsForDay(today);
  if (!w) return '';
  return `
    <section class="card">
      <h2 class="card-title">كلمات النهارده (اليوم ${w.day})</h2>
      <p class="small muted">في الأسبوع 1 Claude بيدّيك منها 10 كل يوم في الشات (جزء 24).</p>
      <dl class="words">${w.words
        .map((x) => `<div><dt>${rich(x.de)}</dt><dd>${rich(x.meaning)}</dd></div>`)
        .join('')}</dl>
    </section>`;
}

function weekNoteHtml(day: Day): string {
  if (day.rest || day.beforeStart || day.special || day.week?.from === 1 || !day.week) return '';
  const blocks = weekdayNote(day.weekday);
  if (!blocks.length) return '';
  return `<section class="card prose">${renderBlocks(blocks)}<p class="small muted">جزء 5</p></section>`;
}

function followupValues(day: Day, rec: DayRecord): FollowupValues {
  const log = rec.log ?? {};
  const last = getLastLesson();
  return {
    minutes: log.minutes ?? String(doneMinutes(day.tasks, rec.done ?? [], rec.minutes ?? {})),
    anki: log.anki ?? false,
    lesson: log.lesson ?? (last ? String(last.n) : ''),
    speaking: log.speaking ?? '',
    mistake: log.mistake ?? '',
  };
}

function followupHtml(day: Day, rec: DayRecord): string {
  if (day.rest || day.beforeStart) return '';
  const v = followupValues(day, rec);
  return `
    <section class="card" id="followup">
      <h2 class="card-title">رسالة المتابعة</h2>
      <p class="small muted">املا الخانات، وانسخها لـClaude بنفس شكل جزء 14.</p>
      <div class="form-grid">
        <label class="field"><span>الدقايق</span><input inputmode="numeric" data-log="minutes" value="${esc(v.minutes)}" /></label>
        <label class="field"><span>درس</span><input inputmode="numeric" data-log="lesson" value="${esc(v.lesson)}" /></label>
        <label class="field"><span>كلام (دقايق)</span><input inputmode="numeric" data-log="speaking" value="${esc(v.speaking)}" /></label>
        <label class="check field-check"><input type="checkbox" data-log="anki"${v.anki ? ' checked' : ''} /><span>${rich('Anki')} خلص</span></label>
        <label class="field wide"><span>الغلط</span><input data-log="mistake" value="${esc(v.mistake)}" autocomplete="off" /></label>
      </div>
      <p class="msg-preview" data-preview>${esc(fillFollowup(FOLLOWUP, v))}</p>
      <div class="task-actions">
        <button type="button" class="btn" data-copy="followup">انسخ الرسالة</button>
        ${claudeBtn()}
        <span class="small" data-copied aria-live="polite"></span>
      </div>
    </section>`;
}

function claudeHtml(first: string | null): string {
  const list = MESSAGES.map((m, i) => (i === 0 && first ? { text: first } : m));
  return `
    <section class="card">
      <h2 class="card-title">رسايل Claude الجاهزة</h2>
      <p class="small muted">لمسة على الرسالة بتنسخها (جزء 13).</p>
      <ul class="messages">${list
        .map(
          (m, i) => `
        <li>
          <button type="button" class="msg" data-copy-msg="${i}">
            <span>${rich(m.text)}</span>
            ${'note' in m && m.note ? `<small class="muted">${rich(m.note)}</small>` : ''}
          </button>
        </li>`,
        )
        .join('')}</ul>
      <div class="task-actions">${claudeBtn()}<span class="small" data-copied-msg aria-live="polite"></span></div>
    </section>`;
}

function sentenceHtml(today: Date): string {
  const s = sentenceFor(getSentences(), today);
  if (!s) return '';
  return `
    <section class="card sentence">
      <p class="eyebrow">جملة اليوم</p>
      <p class="sentence-text" dir="auto">${esc(s)}</p>
    </section>`;
}

export const today: Screen = {
  id: 'today',
  title: 'النهارده',
  render(root, ctx) {
    let now = new Date();
    let iso = toISO(now);
    let messages: string[] = [];

    const state = () => {
      const rec = getDay(iso);
      const day = planDay(now, { ladder: getLadder(), dayType: rec.type ?? null, small: rec.small ?? false });
      return { rec, day };
    };

    const draw = () => {
      const focusId = (document.activeElement as HTMLElement | null)?.dataset?.focus;
      const { rec, day } = state();
      const done = doneMinutes(day.tasks, rec.done ?? [], rec.minutes ?? {});
      // للمتابعة والسلّم: دقايق اليوم ووقته في الخطة (اليوم العادي)
      const full = rec.small ? planDay(now, { ladder: getLadder(), dayType: rec.type ?? null }).planned : day.planned;
      if (!day.rest && !day.beforeStart && (rec.total !== done || rec.planned !== full)) {
        updateDay(iso, (d) => ({ ...d, total: done, planned: full }), true);
      }
      const first = day.dayType ? `ألماني النهارده. ${DAY_TYPE_NAMES[day.dayType]}.` : null;
      messages = MESSAGES.map((m, i) => (i === 0 && first ? first : m.text));
      root.innerHTML = [
        sentenceHtml(now),
        heroHtml(day, now, done),
        dayTypeHtml(day),
        specialHtml(day),
        planTextHtml(day),
        tasksHtml(day, rec),
        nicosHtml(day),
        wordsHtml(now),
        weekNoteHtml(day),
        followupHtml(day, rec),
        day.beforeStart || day.rest ? '' : claudeHtml(first),
      ].join('');
      if (focusId) root.querySelector<HTMLElement>(`[data-focus="${focusId}"]`)?.focus({ preventScroll: true });
    };

    const onChange = () => draw();
    window.addEventListener(CHANGED, onChange);

    // لو اليوم اتغير والتطبيق مفتوح
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const n = new Date();
      if (toISO(n) !== iso) {
        now = n;
        iso = toISO(n);
        draw();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    root.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.name === 'daytype') {
        updateDay(iso, (d) => ({ ...d, type: el.value as DayType }));
      } else if (el.dataset.task) {
        const key = el.dataset.task;
        updateDay(iso, (d) => {
          const set = new Set(d.done ?? []);
          if (el.checked) set.add(key);
          else set.delete(key);
          return { ...d, done: [...set] };
        });
      } else if (el.dataset.log === 'anki') {
        saveLog(el);
      }
    });

    const saveLog = (input: HTMLInputElement) => {
      const k = input.dataset.log as keyof FollowupValues;
      const value = k === 'anki' ? input.checked : input.value;
      updateDay(iso, (d) => ({ ...d, log: { ...d.log, [k]: value } }), true);
      const { day, rec } = state();
      const preview = root.querySelector('[data-preview]');
      if (preview) preview.textContent = fillFollowup(FOLLOWUP, followupValues(day, rec));
    };

    root.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.dataset.log && el.dataset.log !== 'anki') saveLog(el);
    });

    root.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;

      const timer = el.closest<HTMLElement>('[data-timer]');
      if (timer) {
        const task = state().day.tasks.find((t) => t.key === timer.dataset.timer);
        if (task) ctx.overlays.startTimer({ key: task.key, label: task.what, planned: task.minutes });
        return;
      }

      if (el.closest('[data-calm]')) return ctx.overlays.openCalm();

      const small = el.closest<HTMLElement>('[data-small]');
      if (small) return updateDay(iso, (d) => ({ ...d, small: small.dataset.small === 'on' }));

      const lesson = el.closest<HTMLElement>('[data-lesson]');
      if (lesson) {
        const last = getLastLesson();
        if (lesson.dataset.lesson === 'done') setLastLesson(nextLesson(last));
        else if (last) setLastLesson(previousLesson(last));
        return;
      }

      const goto = el.closest<HTMLElement>('[data-goto]');
      if (goto) {
        const target = root.querySelector<HTMLElement>(`#${goto.dataset.goto}`);
        target?.scrollIntoView({ behavior: ctx.systemReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        target?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
        return;
      }

      if (el.closest('[data-copy="followup"]')) {
        const text = root.querySelector('[data-preview]')?.textContent ?? '';
        void copy(text).then((ok) => {
          const s = root.querySelector('[data-copied]');
          if (s) s.textContent = ok ? COPIED : NOT_COPIED;
        });
        return;
      }

      const msg = el.closest<HTMLElement>('[data-copy-msg]');
      if (msg) {
        const text = messages[Number(msg.dataset.copyMsg)] ?? '';
        void copy(text).then((ok) => {
          const s = root.querySelector('[data-copied-msg]');
          if (s) s.textContent = ok ? COPIED : NOT_COPIED;
        });
      }
    });

    draw();

    return () => {
      window.removeEventListener(CHANGED, onChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  },
};
