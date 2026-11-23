import planMd from '../../german-plan.md?raw';
import { renderBlocks } from '../app/blocks';
import { esc, rich } from '../app/dom';
import { icons } from '../app/icons';
import { isObject, isStringArray, readJSON, writeJSON } from '../app/storage';
import { DECISIONS, MILESTONES, WEEKS, type Checkpoint, type ExamPart } from '../data';
import { daysBetween, daysLeft, inDays, parseISO } from '../lib/dates';
import { droppedParts, parseScore, pickBand, weakestParts, weeklyDecision, type Scores } from '../lib/decisions';
import { section, type Block } from '../lib/markdown';
import { currentWeek, timeline, weekTitle } from '../lib/plan';
import { matches } from '../lib/search';
import type { Screen } from './types';

const KEY = 'kirosweg.plan.v1';

interface PlanState {
  /** درجات كل محطة: checkpoint ← الجزء ← الدرجة */
  scores: Record<string, Record<string, number>>;
  /** الحجوزات اللي خلصت (مفتاح من نص البند) */
  bookings: string[];
}

const valid = (v: unknown): v is PlanState =>
  isObject(v) &&
  isObject(v.scores) &&
  Object.values(v.scores).every((s) => isObject(s) && Object.values(s).every((n) => typeof n === 'number')) &&
  isStringArray(v.bookings);

const WEEKLY_FIELDS = [
  { id: 'w0', label: 'الأسبوع ده' },
  { id: 'w1', label: 'الأسبوع اللي فات' },
  { id: 'w2', label: 'اللي قبله' },
  { id: 'anki', label: 'نسبة الصح في Anki' },
] as const;

const partInfo = new Map(DECISIONS.parts.map((p) => [p.id, p]));

/** مفتاح ثابت من نص البند، فلو بند اتغير في الخطة بيرجع مش متعلّم عليه */
function keyOf(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function partLabel(p: ExamPart): string {
  const info = partInfo.get(p);
  return info ? `${rich(info.de)} <span class="muted">(${esc(info.ar)})</span>` : esc(p);
}

function sec(id: string, n: number, title: string, body: string, open = false): string {
  return `
    <details class="card sec" id="sec-${id}"${open ? ' open' : ''}>
      <summary class="sec-head">
        <span class="sec-title"><span class="card-title">${rich(title)}</span><span class="part-tag">جزء ${n}</span></span>
        ${icons.chevron}
      </summary>
      <div class="sec-body prose">${body}</div>
    </details>`;
}

function splitAtTable(blocks: Block[]): { before: Block[]; table?: Block & { t: 'table' }; after: Block[] } {
  const i = blocks.findIndex((b) => b.t === 'table');
  if (i < 0) return { before: blocks, after: [] };
  return { before: blocks.slice(0, i), table: blocks[i] as Block & { t: 'table' }, after: blocks.slice(i + 1) };
}

/* المحطات */

function milestonesHtml(today: Date): string {
  const s1 = section(planMd, 1);
  const { before } = splitAtTable(s1.blocks);
  const items = timeline(MILESTONES, today)
    .map(({ m, status, days }) => {
      let pill = '';
      if (status === 'now') pill = '<span class="pill now">دلوقتي</span>';
      else if (days !== undefined) pill = `<span class="pill">${m.deadline ? daysLeft(days) : inDays(days)}</span>`;
      return `
        <li class="tl ${status}">
          <span class="tl-dot" aria-hidden="true"></span>
          <div class="tl-body">
            <p class="tl-when">${rich(m.when)}${status === 'past' ? '<span class="sr-only"> (فات)</span>' : ''}${
              status === 'next' ? '<span class="sr-only"> (المحطة الجاية)</span>' : ''
            }</p>
            <p class="tl-what">${rich(m.what)}</p>
            ${pill}
          </div>
        </li>`;
    })
    .join('');
  return `${renderBlocks(before)}<ol class="timeline">${items}</ol>`;
}

/* المنهج */

function weeksHtml(today: Date): string {
  const s6 = section(planMd, 6);
  const { table, after } = splitAtTable(s6.blocks);
  const head = table?.head ?? [];
  const cw = currentWeek(WEEKS, today);
  const weeks = WEEKS.map((w) => {
    const isNow = w === cw;
    const past = daysBetween(parseISO(w.end), today) > 0;
    const rows: [string | undefined, string][] = [
      [head[2], w.hours],
      [head[3], w.nicos],
      [head[4], w.grammar],
      [head[5], w.topics],
      [head[6], w.output],
    ];
    return `
      <details class="week${past ? ' past' : ''}${isNow ? ' now' : ''}"${isNow ? ' open' : ''}>
        <summary>
          <span class="week-line">
            <span class="week-title">${weekTitle(w)}</span>
            <span class="week-dates">${rich(w.dates)}</span>
          </span>
          <span class="week-tags">
            ${isNow ? '<span class="pill now">الأسبوع ده</span>' : ''}
            ${w.afterDiagnosis ? '<span class="pill outline">التوزيع بعد التشخيص</span>' : ''}
          </span>
        </summary>
        <dl class="kv">${rows.map(([k, v]) => `<div><dt>${rich(k ?? '')}</dt><dd>${rich(v)}</dd></div>`).join('')}</dl>
      </details>`;
  }).join('');
  return `
    <div class="weeks">${weeks}</div>
    <details class="sub">
      <summary>باقي A1 وملاحظات المنهج ${icons.chevron}</summary>
      <div class="prose">${renderBlocks(after)}</div>
    </details>`;
}

/* القرارات */

function scoreInput(cp: string, field: string, label: string, value: number | undefined): string {
  const id = `score-${cp}-${field}`;
  return `
    <div class="score">
      <label for="${id}">${label}</label>
      <span class="score-box">
        <span aria-hidden="true">%</span>
        <input id="${id}" type="text" inputmode="decimal" maxlength="5" autocomplete="off"
          data-cp="${cp}" data-field="${field}" value="${value ?? ''}" />
      </span>
    </div>`;
}

function rules(list: { if: string; then: string }[], active: number): string {
  return `<ul class="rules">${list
    .map(
      (r, i) =>
        `<li class="${i === active ? 'active' : ''}">${i === active ? '<span class="sr-only">ده القرار: </span>' : ''}<strong>${rich(r.if)}:</strong> ${rich(r.then)}</li>`,
    )
    .join('')}</ul>`;
}

function verdict(cp: Checkpoint, state: PlanState): string {
  const s = (state.scores[cp.id] ?? {}) as Scores & Record<string, number>;
  switch (cp.kind) {
    case 'bands': {
      const band = pickBand(cp.bands, s, cp.parts);
      const idx = band ? cp.bands.indexOf(band) : -1;
      const weak =
        band && band.then.includes('أضعف')
          ? `<p class="small">الجزء الأضعف: ${weakestParts(s, cp.parts).map(partLabel).join('، ')}</p>`
          : '';
      return `${rules(cp.bands, idx)}${
        band
          ? `<p class="result"><span class="muted">القرار:</span> ${rich(band.then)}</p>${weak}`
          : '<p class="small muted">اكتب درجة كل جزء، والقرار بيطلع على أقل جزء فيهم.</p>'
      }`;
    }
    case 'weekly': {
      const d = weeklyDecision([s.w0, s.w1, s.w2], s.anki);
      const list = [cp.up, cp.keep, cp.down];
      const idx = d === null ? -1 : ['up', 'keep', 'down'].indexOf(d);
      const chosen = list[idx];
      return `${rules(list, idx)}${
        chosen
          ? `<p class="result"><span class="muted">القرار:</span> ${rich(chosen.then)}</p>`
          : '<p class="small muted">اكتب درجة اختبار الخميس، والأسابيع اللي فاتت لو عندك.</p>'
      }`;
    }
    case 'compare': {
      const before = (state.scores[cp.compareWith] ?? {}) as Scores;
      const dropped = droppedParts(s, before, cp.parts);
      let out = `<p>${rich(cp.text)}</p>`;
      if (cp.parts.some((p) => before[p] === undefined)) {
        out += '<p class="small muted">اكتب درجات امتحان 13 فبراير فوق الأول، علشان نقارن.</p>';
      } else if (dropped === null) {
        out += '<p class="small muted">اكتب درجة كل جزء علشان نقارن بـ13 فبراير.</p>';
      } else if (dropped.length) {
        out += `<p class="result"><span class="muted">نزلت في:</span> ${dropped.map(partLabel).join('، ')}. صلّح بدل ما تبدأ B1.</p>`;
      } else {
        out += '<p class="result">ولا جزء نزل عن 13 فبراير.</p>';
      }
      return out;
    }
    case 'info':
      return `<p>${rich(cp.text)}</p>`;
  }
}

function inputsFor(cp: Checkpoint, state: PlanState): string {
  const s = state.scores[cp.id] ?? {};
  if (cp.kind === 'bands' || cp.kind === 'compare') {
    return `<div class="score-grid">${cp.parts.map((p) => scoreInput(cp.id, p, partLabel(p), s[p])).join('')}</div>`;
  }
  if (cp.kind === 'weekly') {
    return `<div class="score-grid">${WEEKLY_FIELDS.map((f) => scoreInput(cp.id, f.id, f.label, s[f.id])).join('')}</div>`;
  }
  return '';
}

function decisionsHtml(state: PlanState): string {
  const cards = DECISIONS.checkpoints
    .map(
      (cp) => `
      <article class="decision" id="dec-${cp.id}">
        <header class="decision-head">
          <span class="num" aria-hidden="true">${cp.n}</span>
          <div>
            <h3 class="decision-title">${rich(cp.title)}</h3>
            ${cp.when || cp.exam ? `<p class="small muted">${[cp.when, cp.exam].filter(Boolean).map((x) => rich(x as string)).join(' · ')}</p>` : ''}
          </div>
        </header>
        ${cp.note ? `<p class="small">${rich(cp.note)}</p>` : ''}
        ${inputsFor(cp, state)}
        <div class="verdict" aria-live="polite" data-verdict="${cp.id}">${verdict(cp, state)}</div>
      </article>`,
    )
    .join('');
  return `${cards}${DECISIONS.notes.map((n) => `<p class="small">${rich(n)}</p>`).join('')}`;
}

/* الحجوزات */

function bookingsHtml(state: PlanState): string {
  const s16 = section(planMd, 16);
  const list = s16.blocks.find((b): b is Block & { t: 'list' } => b.t === 'list');
  const rest = s16.blocks.filter((b) => b !== list);
  const items = list?.items ?? [];
  const done = items.filter((i) => state.bookings.includes(keyOf(i.text))).length;
  const heading = rest.find((b) => b.t === 'h');
  return `
    <p class="small muted" data-booking-count>خلصت ${done} من ${items.length}</p>
    <ul class="checklist">${items
      .map((i, n) => {
        const k = keyOf(i.text);
        return `
          <li>
            <label class="check">
              <input type="checkbox" data-booking="${k}"${state.bookings.includes(k) ? ' checked' : ''} />
              <span><span class="check-n">${n + 1}.</span> ${rich(i.text)}</span>
            </label>
          </li>`;
      })
      .join('')}</ul>
    <details class="sub">
      <summary>${heading && heading.t === 'h' ? rich(heading.text.replace(/:$/, '')) : 'الإيميل'} ${icons.chevron}</summary>
      <div class="prose">${renderBlocks(rest.filter((b) => b !== heading))}</div>
    </details>`;
}

/* القاموس */

interface Term {
  term: string;
  meaning: string;
}

function glossary(): Term[] {
  const list = section(planMd, 23).blocks.find((b): b is Block & { t: 'list' } => b.t === 'list');
  return (list?.items ?? []).map((i) => {
    const m = i.text.match(/^\*\*(.+?):\*\*\s*(.*)$/);
    return m ? { term: m[1] as string, meaning: m[2] as string } : { term: i.text, meaning: '' };
  });
}

function glossaryList(terms: Term[]): string {
  if (!terms.length) return '<p class="muted">مالقيتش الكلمة دي في القاموس.</p>';
  return `<dl class="glossary">${terms
    .map((t) => `<div><dt>${rich(t.term)}</dt><dd>${rich(t.meaning)}</dd></div>`)
    .join('')}</dl>`;
}

/* الشاشة */

const PROSE = [
  { id: 'chance', n: 2, chip: 'الفرصة' },
  { id: 'placement', n: 10, chip: 'اختبار مارس' },
  { id: 'b1', n: 11, chip: 'امتحان B1' },
  { id: 'people', n: 12, chip: 'ناس حقيقيين' },
  { id: 'late', n: 15, chip: 'لو اتأخرت' },
] as const;

const AFTER = [
  { id: 'risks', n: 19, chip: 'المخاطر' },
  { id: 'unsure', n: 22, chip: 'لسه مش متأكدين' },
] as const;

export const plan: Screen = {
  id: 'plan',
  title: 'الخطة',
  render(root, ctx) {
    let state = readJSON<PlanState>(KEY, { scores: {}, bookings: [] }, valid);
    const save = () => writeJSON(KEY, state);
    const today = new Date();
    const cw = currentWeek(WEEKS, today);
    const next = timeline(MILESTONES, today).find((x) => x.status === 'next');
    const terms = glossary();

    const chips: [string, string][] = [
      ['milestones', 'المحطات'],
      ['weeks', 'المنهج'],
      ['decisions', 'القرارات'],
      ...PROSE.map((p): [string, string] => [p.id, p.chip]),
      ['bookings', 'الحجوزات'],
      ...AFTER.map((p): [string, string] => [p.id, p.chip]),
      ['glossary', 'القاموس'],
    ];

    const nextLine = next
      ? `المحطة الجاية${next.days !== undefined ? ` ${next.m.deadline ? `(${daysLeft(next.days)})` : inDays(next.days)}` : ''}: ${rich(next.m.when)}`
      : '';

    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">الخطة</p>
        <h1 class="title">من A1 لـB1</h1>
        ${cw ? `<p>النهارده ${weekTitle(cw)} من 16 (${rich(cw.dates)})</p>` : ''}
        ${nextLine ? `<p class="muted">${nextLine}</p>` : ''}
      </section>
      <nav class="chips" aria-label="أجزاء الخطة">
        ${chips.map(([id, label]) => `<button type="button" class="chip glass" data-jump="${id}">${label}</button>`).join('')}
      </nav>
      ${sec('milestones', 1, 'المحطات', milestonesHtml(today), true)}
      ${sec('weeks', 6, section(planMd, 6).title, weeksHtml(today), true)}
      ${sec('decisions', 9, section(planMd, 9).title, decisionsHtml(state))}
      ${PROSE.map((p) => {
        const s = section(planMd, p.n);
        return sec(p.id, p.n, s.title, renderBlocks(s.blocks));
      }).join('')}
      ${sec('bookings', 16, section(planMd, 16).title, bookingsHtml(state))}
      ${AFTER.map((p) => {
        const s = section(planMd, p.n);
        return sec(p.id, p.n, s.title, renderBlocks(s.blocks));
      }).join('')}
      ${sec(
        'glossary',
        23,
        section(planMd, 23).title,
        `<label class="search">${icons.search}<input type="search" placeholder="دوّر: Perfekt، شهادة، DSH…" aria-label="دوّر في القاموس" autocomplete="off" data-glossary /></label>
         <div data-glossary-list>${glossaryList(terms)}</div>`,
      )}`;

    root.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-jump]');
      if (!chip) return;
      const target = root.querySelector<HTMLDetailsElement>(`#sec-${chip.dataset.jump}`);
      if (!target) return;
      target.open = true;
      target.scrollIntoView({ behavior: ctx.systemReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      target.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
    });

    root.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;

      if (input.matches('[data-glossary]')) {
        const list = root.querySelector('[data-glossary-list]');
        if (list) list.innerHTML = glossaryList(terms.filter((t) => matches(`${t.term} ${t.meaning}`, input.value)));
        return;
      }

      const cpId = input.dataset.cp;
      const field = input.dataset.field;
      if (!cpId || !field) return;
      const value = parseScore(input.value);
      const bad = input.value.trim() !== '' && value === undefined;
      input.setAttribute('aria-invalid', String(bad));
      const scores = { ...(state.scores[cpId] ?? {}) };
      if (value === undefined) delete scores[field];
      else scores[field] = value;
      state = { ...state, scores: { ...state.scores, [cpId]: scores } };
      save();
      // القرار ده، وأي قرار بيقارن بيه
      for (const cp of DECISIONS.checkpoints) {
        if (cp.id === cpId || (cp.kind === 'compare' && cp.compareWith === cpId)) {
          const box = root.querySelector(`[data-verdict="${cp.id}"]`);
          if (box) box.innerHTML = verdict(cp, state);
        }
      }
    });

    root.addEventListener('change', (e) => {
      const box = e.target as HTMLInputElement;
      const k = box.dataset.booking;
      if (!k) return;
      const set = new Set(state.bookings);
      if (box.checked) set.add(k);
      else set.delete(k);
      state = { ...state, bookings: [...set] };
      save();
      const count = root.querySelector('[data-booking-count]');
      const all = root.querySelectorAll('[data-booking]').length;
      const checked = root.querySelectorAll('[data-booking]:checked').length;
      if (count) count.textContent = `خلصت ${checked} من ${all}`;
    });
  },
};

