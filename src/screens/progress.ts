import planMd from '../../german-plan.md?raw';
import { backupDue, exportNow, lastExportText } from '../app/backupui';
import {
  CHANGED,
  answerLadder,
  getAllDays,
  getDay,
  getLadder,
  getLadderAnswered,
  getLastLesson,
  getMistakes,
  getReview,
  setMistakes,
  setReview,
  updateDay,
  type Mistake,
} from '../app/daystore';
import { esc, rich } from '../app/dom';
import { icons } from '../app/icons';
import { dayMinutes, makeDayStat, totalMinutes } from '../app/stats';
import { HOURS, MILESTONES, SPECIAL_DAYS } from '../data';
import { daysBetween, formatDate, parseISO, toISO } from '../lib/dates';
import { section } from '../lib/markdown';
import {
  expectedHours,
  fillSummary,
  isComplete,
  ladderSuggestion,
  planWeek,
  streak,
  summaryTemplate,
  treeStage,
  weekStats,
} from '../lib/progress';
import { RUNG_NAMES, planDay, type Rung } from '../lib/today';
import type { Screen } from './types';

const SUMMARY = summaryTemplate(planMd);
const SUMMARY_LABELS = [
  'الأسبوع رقم',
  'التاريخ',
  'الساعات الفعلية',
  'المخطط',
  'Nicos Weg: وصلت لدرس',
  'Anki: كروت إجمالي',
  'Anki: نسبة الصح %',
  'اختبار الخميس: كلمات %',
  'اختبار الخميس: قواعد %',
  'غلط 1',
  'غلط 2',
  'غلط 3',
  'القواعد اللي خلصتها',
  'الأسبوع الجاي: دروس',
  'الأسبوع الجاي: قواعد',
  'امتحان تجريبي؟',
  'مواعيد كلية معروفة',
];

/** جزء 14: بنود المراجعة الأسبوعية */
const REVIEW_LIST = (() => {
  const s = section(planMd, 14).blocks;
  const i = s.findIndex((b) => b.t === 'h' && b.text.startsWith('المراجعة الأسبوعية'));
  const list = s.slice(i + 1).find((b) => b.t === 'list');
  return list && list.t === 'list' ? list.items.map((x) => x.text) : [];
})();

/** جزء 14: أعمدة جدول كل يوم */
const LOG_HEAD = section(planMd, 14).blocks.find((b) => b.t === 'table');
/** جزء 21: أعمدة كراسة الأخطاء */
const MISTAKES_HEAD = section(planMd, 21).blocks.find((b) => b.t === 'table');
/** أنواع الغلط اللي Claude بيعلّم بيها (جزء 13) */
const MISTAKE_TYPES = ['أداة تعريف', 'حالة', 'مكان الفعل', 'تصريف'];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** «ساعة»، «ساعتين»، «6 ساعات»، «177 ساعة»، «10–15 ساعة» */
function hoursText(min: number, max = min): string {
  if (min !== max) return `${min}–${max} ${max <= 10 ? 'ساعات' : 'ساعة'}`;
  if (min === 1) return 'ساعة';
  if (min === 2) return 'ساعتين';
  return `${min} ${min >= 3 && min <= 10 ? 'ساعات' : 'ساعة'}`;
}

/** شجرة أصلية على 5 مراحل */
function treeSvg(stage: number): string {
  const leaf = (cx: number, cy: number, r: number) => `<circle class="tree-leaf" cx="${cx}" cy="${cy}" r="${r}" />`;
  const parts: string[] = ['<ellipse class="tree-ground" cx="60" cy="110" rx="40" ry="5" />'];
  if (stage === 1) {
    parts.push(
      '<path class="tree-trunk" d="M60 110 V88" stroke-width="3" />',
      '<path class="tree-leaf" d="M60 94 C47 92 42 82 45 78 C55 79 60 86 60 94 Z" />',
      '<path class="tree-leaf" d="M60 90 C73 88 78 78 75 74 C65 75 60 82 60 90 Z" />',
    );
  }
  if (stage === 2) {
    parts.push(
      '<path class="tree-trunk" d="M60 110 V80" stroke-width="3.5" />',
      '<path class="tree-trunk" d="M60 92 L70 85 M60 98 L51 92" stroke-width="2" />',
      leaf(71, 82, 6),
      leaf(50, 89, 6),
      leaf(60, 76, 8),
    );
  }
  if (stage >= 3) {
    const w = stage === 3 ? 5 : stage === 4 ? 7 : 8;
    parts.push(
      `<path class="tree-trunk" d="M60 110 C59 95 61 82 60 ${stage === 3 ? 66 : 56}" stroke-width="${w}" />`,
      `<path class="tree-trunk" d="M60 86 C66 80 72 76 78 72 M60 92 C54 86 48 82 42 79" stroke-width="${w / 2.2}" />`,
    );
    const crown =
      stage === 3
        ? [
            [60, 60, 15],
            [76, 68, 11],
            [44, 72, 11],
          ]
        : stage === 4
          ? [
              [60, 50, 18],
              [80, 60, 14],
              [40, 62, 14],
              [70, 40, 12],
              [48, 42, 12],
            ]
          : [
              [60, 46, 20],
              [84, 56, 15],
              [36, 58, 15],
              [74, 32, 14],
              [46, 32, 14],
              [92, 72, 10],
              [28, 74, 10],
            ];
    parts.push(...crown.map(([x, y, r]) => leaf(x as number, y as number, r as number)));
    if (stage === 5) {
      parts.push(
        ...[
          [52, 40],
          [70, 52],
          [82, 64],
          [38, 60],
          [62, 28],
        ].map(([x, y]) => `<circle class="tree-fruit" cx="${x}" cy="${y}" r="2.6" />`),
      );
    }
  }
  return `<svg class="tree" viewBox="0 0 120 120" role="img" aria-label="شجرة في المرحلة ${stage} من 5">${parts.join('')}</svg>`;
}

function numbersHtml(today: Date, rung: Rung): string {
  const stat = makeDayStat();
  const hours = round1(totalMinutes() / 60);
  const exp = expectedHours(today);
  const s = streak(today, stat);
  const w = planWeek(today);
  const ws = w ? weekStats(w, today, today, stat) : null;
  let studyInWeek = 0;
  if (w) {
    for (let d = w.start; daysBetween(d, w.end) >= 0; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const p = planDay(d);
      if (!p.rest && !p.beforeStart) studyInWeek++;
    }
  }
  const tree = treeStage(hours);
  return `
    <section class="card">
      <h2 class="card-title">الأرقام</h2>
      <div class="stats">
        <div class="stat"><strong>${hours}</strong><span>ساعة لحد دلوقتي</span></div>
        <div class="stat"><strong>${s === 2 ? 'يومين' : s}</strong><span>${s === 2 ? '' : s === 1 || s > 10 ? 'يوم ' : 'أيام '}ورا بعض من غير يوم صفر</span></div>
        <div class="stat"><strong>${ws ? ws.complete : 0}${studyInWeek ? `<small> من ${studyInWeek}</small>` : ''}</strong><span>أيام كاملة الأسبوع ده</span></div>
      </div>
      <p class="small">المفروض لحد النهارده حوالي ${hoursText(exp.min, exp.max)}. الهدف كله حوالي ${HOURS.total.min}–${HOURS.total.max} ساعة لحد نص مارس، والواقعي ${HOURS.realistic.min}–${HOURS.realistic.max} (جزء 3).</p>
      <p class="small muted">درجة السلّم: ${esc(RUNG_NAMES[rung])}.</p>
    </section>
    <section class="card tree-card">
      ${treeSvg(tree.stage)}
      <div>
        <h2 class="card-title">المرحلة ${tree.stage} من 5</h2>
        <p class="small muted">${tree.next !== null ? `الشجرة بتكبر تاني عند ${tree.next} ساعة.` : 'الشجرة كبرت خالص: 180 ساعة أو أكتر.'}</p>
      </div>
    </section>`;
}

function ladderHtml(today: Date, rung: Rung): string {
  const s = ladderSuggestion(today, rung, makeDayStat(), getLadderAnswered());
  if (!s) return '';
  const to = (s.kind === 'up' ? rung + 1 : rung - 1) as Rung;
  const text =
    s.kind === 'up'
      ? `كمّلت ${s.stats.complete} أيام كاملة في الأسبوع. تطلع درجة؟`
      : `فاتك ${s.stats.missed} أيام في الأسبوع. تنزل درجة؟`;
  return `
    <section class="card special">
      <p class="eyebrow">السلّم</p>
      <p><strong>${text}</strong></p>
      <p class="small">من «${esc(RUNG_NAMES[rung])}» لـ«${esc(RUNG_NAMES[to])}».</p>
      <p class="small muted">${rich('**السلّم:** تطلع درجة بس لما تكمّل 6 أيام في الأسبوع. ولو فاتك يومين، تنزل درجة.')}</p>
      <div class="task-actions">
        <button type="button" class="btn" data-ladder="yes" data-key="${s.weekId}:${s.kind}" data-to="${to}">${s.kind === 'up' ? 'أيوه، اطلع' : 'أيوه، انزل'}</button>
        <button type="button" class="ghost-btn" data-ladder="no" data-key="${s.weekId}:${s.kind}">لأ</button>
      </div>
    </section>`;
}

function logHtml(today: Date): string {
  const iso = toISO(today);
  const rec = getDay(iso);
  const log = rec.log ?? {};
  const last = getLastLesson();
  const head = LOG_HEAD && LOG_HEAD.t === 'table' ? LOG_HEAD.head : [];
  const auto = dayMinutes(rec, today);
  return `
    <section class="card" id="log">
      <h2 class="card-title">تسجيل النهارده</h2>
      <p class="small muted">${formatDate(today)} · نفس خانات جزء 14، ونفس خانات رسالة المتابعة في «النهارده».</p>
      <div class="form-grid">
        <label class="field"><span>${rich(head[1] ?? 'الدقايق')}</span><input inputmode="numeric" data-log="minutes" value="${esc(log.minutes ?? '')}" placeholder="${auto}" /></label>
        <label class="field"><span>${rich(head[3] ?? 'درس Nicos')}</span><input inputmode="numeric" data-log="lesson" value="${esc(log.lesson ?? '')}" placeholder="${last ? last.n : ''}" /></label>
        <label class="field"><span>${rich(head[4] ?? 'دقايق كلام')}</span><input inputmode="numeric" data-log="speaking" value="${esc(log.speaking ?? '')}" /></label>
        <label class="field"><span>${rich(head[5] ?? 'دقايق استماع')}</span><input inputmode="numeric" data-log="listening" value="${esc(log.listening ?? '')}" /></label>
        <label class="check field-check"><input type="checkbox" data-log="anki"${log.anki ? ' checked' : ''} /><span>${rich(head[2] ?? 'Anki ✓')}</span></label>
        <label class="field wide"><span>${rich(head[6] ?? 'غلط واحد اتعلمته')}</span><input data-log="mistake" value="${esc(log.mistake ?? '')}" autocomplete="off" /></label>
      </div>
      <p class="small muted" data-saved aria-live="polite"></p>
    </section>`;
}

function reviewPrefill(today: Date): string[] {
  const w = planWeek(today);
  const stat = makeDayStat();
  let minutes = 0;
  if (w) for (let d = w.start; daysBetween(d, today) >= 0; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) minutes += stat(d).minutes;
  const iso = toISO(today);
  const period = HOURS.periods.find((p) => iso >= p.start && iso <= p.end);
  const last = getLastLesson();
  const top = [...getMistakes()].sort((a, b) => b.count - a.count).slice(0, 3);
  let mock = '';
  if (w) {
    const from = toISO(new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate() + 1));
    const to = toISO(new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate() + 7));
    const next = SPECIAL_DAYS.find((s) => s.kind === 'mock' && s.date >= from && s.date <= to);
    const m = next && MILESTONES.find((x) => x.date === next.date);
    mock = next ? `أيوه: ${m?.when ?? next.date}` : 'لأ';
  }
  return [
    String(planDay(today).weekNo ?? ''),
    formatDate(today, false),
    String(round1(minutes / 60)),
    period?.perWeek ?? '',
    last ? String(last.n) : '',
    '',
    '',
    '',
    '',
    top[0] ? `${top[0].wrong} ← ${top[0].right}` : '',
    top[1] ? `${top[1].wrong} ← ${top[1].right}` : '',
    top[2] ? `${top[2].wrong} ← ${top[2].right}` : '',
    '',
    '',
    '',
    mock,
    '',
  ];
}

function reviewValues(today: Date): string[] {
  const w = planWeek(today);
  const saved = w ? getReview(w.id) : [];
  const pre = reviewPrefill(today);
  return pre.map((v, i) => saved[i] ?? v);
}

function reviewHtml(today: Date): string {
  const values = reviewValues(today);
  const level = getLastLesson()?.level;
  const saturday = today.getDay() === 6;
  return `
    <details class="card sec" id="review"${saturday ? ' open' : ''}>
      <summary class="sec-head">
        <span class="sec-title"><span class="card-title">المراجعة الأسبوعية</span><span class="part-tag">السبت، 10 دقايق · جزء 14</span></span>
        ${icons.chevron}
      </summary>
      <div class="sec-body">
        <ul class="prose-list">${REVIEW_LIST.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>
        <h3 class="sub-title">ملخص الأسبوع اللي بيتبعت لـClaude</h3>
        <div class="form-grid two">
          ${SUMMARY_LABELS.map(
            (label, i) =>
              `<label class="field${i === 12 || i === 16 ? ' wide' : ''}"><span>${rich(label)}</span><input data-review="${i}" value="${esc(values[i] ?? '')}" autocomplete="off" /></label>`,
          ).join('')}
        </div>
        <pre class="code" dir="rtl" data-summary>${esc(fillSummary(SUMMARY, values, level))}</pre>
        <div class="task-actions">
          <button type="button" class="btn" data-copy-summary>انسخ ملخص الأسبوع</button>
          <span class="small" data-summary-copied aria-live="polite"></span>
        </div>
      </div>
    </details>`;
}

function mistakesHtml(): string {
  const list = [...getMistakes()].sort((a, b) => b.count - a.count);
  const head = MISTAKES_HEAD && MISTAKES_HEAD.t === 'table' ? MISTAKES_HEAD.head : ['الغلط', 'الصح', 'النوع', 'اتكرر كام مرة'];
  return `
    <details class="card sec" id="mistakes">
      <summary class="sec-head">
        <span class="sec-title"><span class="card-title">كراسة الأخطاء</span><span class="part-tag">${list.length} غلط · جزء 21</span></span>
        ${icons.chevron}
      </summary>
      <div class="sec-body">
        <form class="form-grid" data-mistake-form>
          <label class="field"><span>${rich(head[0] ?? '')}</span><input name="wrong" required autocomplete="off" dir="auto" /></label>
          <label class="field"><span>${rich(head[1] ?? '')}</span><input name="right" required autocomplete="off" dir="auto" /></label>
          <label class="field"><span>${rich(head[2] ?? '')}</span><input name="type" list="mistake-types" autocomplete="off" /></label>
          <datalist id="mistake-types">${MISTAKE_TYPES.map((t) => `<option value="${t}"></option>`).join('')}</datalist>
          <button type="submit" class="btn wide">ضيف الغلط</button>
        </form>
        ${
          list.length
            ? `<ul class="mistakes">${list
                .map(
                  (m) => `
              <li class="mistake">
                <p><span class="wrong" dir="auto">${esc(m.wrong)}</span> ← <span class="right" dir="auto">${esc(m.right)}</span></p>
                <p class="small muted">${m.type ? `${esc(m.type)} · ` : ''}${rich(head[3] ?? '')}: ${m.count}</p>
                <div class="task-actions">
                  <button type="button" class="chip-btn" data-mistake-plus="${m.id}">اتكرر تاني</button>
                  <button type="button" class="ghost-btn" data-mistake-del="${m.id}">امسح</button>
                </div>
              </li>`,
                )
                .join('')}</ul>`
            : '<p class="small muted">لسه مفيش أخطاء متسجلة. Claude بيقولك الأخطاء اللي بتتكرر بعد كل اختبار أسبوعي.</p>'
        }
      </div>
    </details>`;
}

function historyHtml(today: Date): string {
  const days = getAllDays();
  const isoToday = toISO(today);
  const rows = Object.keys(days)
    .filter((k) => k < isoToday)
    .sort()
    .reverse()
    .slice(0, 14);
  if (!rows.length) return '';
  const stat = makeDayStat();
  return `
    <details class="card sec">
      <summary class="sec-head">
        <span class="sec-title"><span class="card-title">الأيام اللي فاتت</span><span class="part-tag">آخر ${rows.length} ${rows.length <= 10 ? 'أيام' : 'يوم'}</span></span>
        ${icons.chevron}
      </summary>
      <div class="sec-body rows">${rows
        .map((iso) => {
          const d = parseISO(iso);
          const rec = days[iso] ?? {};
          const log = rec.log ?? {};
          const s = stat(d);
          const bits = [
            `${dayMinutes(rec, d)} دقيقة${isComplete(s) ? ' (كامل)' : ''}`,
            `${rich('Anki')} ${log.anki ? '✓' : '✗'}`,
            log.lesson ? `درس ${esc(log.lesson)}` : '',
            log.speaking ? `كلام ${esc(log.speaking)} دقيقة` : '',
            log.listening ? `استماع ${esc(log.listening)} دقيقة` : '',
          ].filter(Boolean);
          return `
            <div class="row-card">
              <p class="row-title">${formatDate(d)}</p>
              <p class="small">${bits.join(' · ')}</p>
              ${log.mistake ? `<p class="small muted" dir="auto">${esc(log.mistake)}</p>` : ''}
            </div>`;
        })
        .join('')}</div>
    </details>`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
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

export const progress: Screen = {
  id: 'progress',
  title: 'المتابعة',
  render(root) {
    const now = () => new Date();

    const draw = () => {
      const focusId = (document.activeElement as HTMLElement | null)?.id;
      const openIds = [...root.querySelectorAll<HTMLDetailsElement>('details[id]')].filter((d) => d.open).map((d) => d.id);
      const today = now();
      const rung = getLadder();
      root.innerHTML = `
        <section class="card hero">
          <p class="eyebrow">المتابعة</p>
          <h1 class="title">إنت ماشي إزاي</h1>
          ${
            backupDue(today)
              ? `<div class="note backup-note">
                  <p>${lastExportText()} اعمل نسخة كل أسبوع، علشان بياناتك على الموبايل ده بس.</p>
                  <button type="button" class="btn" data-export>${icons.download}<span>اعمل نسخة دلوقتي</span></button>
                </div>`
              : `<p class="small muted">${lastExportText()}</p>`
          }
        </section>
        ${ladderHtml(today, rung)}
        ${numbersHtml(today, rung)}
        ${logHtml(today)}
        ${reviewHtml(today)}
        ${mistakesHtml()}
        ${historyHtml(today)}`;
      for (const id of openIds) root.querySelector<HTMLDetailsElement>(`details#${id}`)?.setAttribute('open', '');
      if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
    };

    const onChange = () => draw();
    window.addEventListener(CHANGED, onChange);

    root.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      const iso = toISO(now());
      if (el.dataset.log && el.dataset.log !== 'anki') {
        const k = el.dataset.log;
        updateDay(iso, (d) => ({ ...d, log: { ...d.log, [k]: el.value } }), true);
        const s = root.querySelector('[data-saved]');
        if (s) s.textContent = 'اتحفظ.';
      }
      if (el.dataset.review !== undefined) {
        const w = planWeek(now());
        if (!w) return;
        const values = [...root.querySelectorAll<HTMLInputElement>('[data-review]')].map((x) => x.value);
        setReview(w.id, values);
        const pre = root.querySelector('[data-summary]');
        if (pre) pre.textContent = fillSummary(SUMMARY, values, getLastLesson()?.level);
      }
    });

    root.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.dataset.log === 'anki') {
        updateDay(toISO(now()), (d) => ({ ...d, log: { ...d.log, anki: el.checked } }), true);
        const s = root.querySelector('[data-saved]');
        if (s) s.textContent = 'اتحفظ.';
      }
    });

    root.addEventListener('submit', (e) => {
      const form = (e.target as HTMLElement).closest<HTMLFormElement>('[data-mistake-form]');
      if (!form) return;
      e.preventDefault();
      const data = new FormData(form);
      const wrong = String(data.get('wrong') ?? '').trim();
      const right = String(data.get('right') ?? '').trim();
      if (!wrong || !right) return;
      const m: Mistake = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        wrong,
        right,
        type: String(data.get('type') ?? '').trim(),
        count: 1,
        added: toISO(now()),
      };
      setMistakes([...getMistakes(), m]);
      root.querySelector<HTMLDetailsElement>('#mistakes')?.setAttribute('open', '');
      root.querySelector<HTMLInputElement>('[data-mistake-form] input[name="wrong"]')?.focus();
    });

    root.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;

      const lad = el.closest<HTMLElement>('[data-ladder]');
      if (lad) {
        const key = lad.dataset.key as string;
        answerLadder(key, lad.dataset.ladder === 'yes' ? (Number(lad.dataset.to) as Rung) : null);
        return;
      }

      if (el.closest('[data-export]')) {
        exportNow();
        draw();
        return;
      }

      const plus = el.closest<HTMLElement>('[data-mistake-plus]');
      if (plus) {
        setMistakes(getMistakes().map((m) => (m.id === plus.dataset.mistakePlus ? { ...m, count: m.count + 1 } : m)));
        return;
      }

      const del = el.closest<HTMLElement>('[data-mistake-del]');
      if (del) {
        const m = getMistakes().find((x) => x.id === del.dataset.mistakeDel);
        if (m && window.confirm(`تمسح «${m.wrong}» من الكراسة؟`)) {
          setMistakes(getMistakes().filter((x) => x.id !== m.id));
        }
        return;
      }

      if (el.closest('[data-copy-summary]')) {
        const text = root.querySelector('[data-summary]')?.textContent ?? '';
        void copyText(text).then((ok) => {
          const s = root.querySelector('[data-summary-copied]');
          if (s) s.textContent = ok ? 'اتنسخ ✓' : 'مااتنسخش. علّم على الكلام وانسخه بإيدك.';
        });
      }
    });

    draw();
    return () => window.removeEventListener(CHANGED, onChange);
  },
};
