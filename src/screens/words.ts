import planMd from '../../german-plan.md?raw';
import { esc, rich } from '../app/dom';
import { icons } from '../app/icons';
import { checkGermanVoice, speak } from '../app/speech';
import { WORDS, type Word } from '../data';
import { pickRandom } from '../lib/daily';
import { section } from '../lib/markdown';
import type { Screen } from './types';

/** جزء 8: لو الكارت مانطقش */
const VOICE_HELP = (() => {
  const list = section(planMd, 8).blocks.find((b) => b.t === 'list');
  return list && list.t === 'list' ? (list.items.find((i) => i.text.startsWith('**النطق في الكروت:**'))?.text ?? '') : '';
})();

const byId = new Map(WORDS.map((w) => [w.id, w]));
type Filter = 'all' | 1 | 2;

function front(w: Word): string {
  return `<span class="word-de">${rich(w.de)}</span>`;
}

function back(w: Word): string {
  return `<span class="word-meaning">${rich(w.meaning)}</span>${
    w.plural ? `<small class="word-plural">الجمع: ${rich(w.plural)}</small>` : ''
  }`;
}

function card(w: Word, big = false): string {
  return `
    <div class="word-card${big ? ' big' : ''}">
      <button type="button" class="word-face" data-flip="${w.id}" aria-pressed="false"
        aria-label="${esc(w.de)}، لمسة تقلب الكارت">${front(w)}</button>
      <button type="button" class="icon-btn speak" data-speak="${w.id}" aria-label="انطق ${esc(w.de)}">${icons.speaker}</button>
    </div>`;
}

function groupTitle(w: Word): string {
  return w.week === 1 ? `الأسبوع 1 · اليوم ${w.day}` : `الأسبوع 2 · اليوم ${w.day}: ${w.topic ?? ''}`;
}

export const words: Screen = {
  id: 'words',
  title: 'الكلمات',
  render(root, ctx) {
    let filter: Filter = 'all';
    let drill: { ids: string[]; i: number } | null = null;

    const listHtml = () => {
      const shown = WORDS.filter((w) => filter === 'all' || w.week === filter);
      const groups = new Map<string, Word[]>();
      for (const w of shown) {
        const k = groupTitle(w);
        groups.set(k, [...(groups.get(k) ?? []), w]);
      }
      return [...groups]
        .map(
          ([title, ws]) => `
          <section class="card">
            <h2 class="card-title">${rich(title)}</h2>
            <div class="word-grid">${ws.map((w) => card(w)).join('')}</div>
          </section>`,
        )
        .join('');
    };

    const drillHtml = () => {
      if (!drill) return '';
      if (drill.i >= drill.ids.length) {
        return `
          <section class="card drill">
            <p class="eyebrow">تمرين سريع</p>
            <h2 class="title">خلصت الـ10 كلمات.</h2>
            <div class="task-actions">
              <button type="button" class="btn" data-drill="again">تمرين تاني</button>
              <button type="button" class="ghost-btn" data-drill="exit">رجوع للكلمات</button>
            </div>
          </section>`;
      }
      const w = byId.get(drill.ids[drill.i] as string) as Word;
      return `
        <section class="card drill">
          <p class="eyebrow">تمرين سريع · ${drill.i + 1} من ${drill.ids.length}</p>
          ${card(w, true)}
          <div class="task-actions">
            <button type="button" class="btn" data-drill="next">${drill.i + 1 < drill.ids.length ? 'الجاية' : 'خلّصت'}</button>
            <button type="button" class="ghost-btn" data-drill="exit">وقّف التمرين</button>
          </div>
        </section>`;
    };

    const draw = () => {
      root.innerHTML = `
        <section class="card hero">
          <p class="eyebrow">الكلمات</p>
          <h1 class="title">كلمات الأسبوع 1 و2</h1>
          <p class="muted">${WORDS.length} كلمة بأداتها وجمعها ومعناها (جزء 24 و25). الألماني قدّام، واللمسة تقلب الكارت. دي للمراجعة السريعة، والتكرار المتباعد في ${rich('Anki')}.</p>
          <p class="note" data-voice hidden></p>
          ${
            drill
              ? ''
              : `<div class="chips-row" role="group" aria-label="أنهي أسبوع">
                  ${(['all', 1, 2] as const)
                    .map(
                      (f) =>
                        `<button type="button" class="chip-btn" data-filter="${f}" aria-pressed="${filter === f}">${
                          f === 'all' ? 'الكل' : `الأسبوع ${f}`
                        }</button>`,
                    )
                    .join('')}
                </div>
                <button type="button" class="btn" data-drill="start">تمرين سريع: 10 كلمات</button>`
          }
        </section>
        ${drill ? drillHtml() : listHtml()}`;
      checkGermanVoice((ok) => {
        const note = root.querySelector<HTMLElement>('[data-voice]');
        if (!note || ok) return;
        note.innerHTML = ok === null ? 'المتصفح ده مابيدعمش النطق.' : rich(VOICE_HELP);
        note.hidden = false;
      });
    };

    root.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;

      const sp = el.closest<HTMLElement>('[data-speak]');
      if (sp) {
        const w = byId.get(sp.dataset.speak as string);
        if (w) speak(w.de);
        return;
      }

      const flip = el.closest<HTMLButtonElement>('[data-flip]');
      if (flip) {
        const w = byId.get(flip.dataset.flip as string);
        if (!w) return;
        const turned = flip.getAttribute('aria-pressed') !== 'true';
        const swap = () => {
          flip.innerHTML = turned ? back(w) : front(w);
          flip.setAttribute('aria-pressed', String(turned));
          flip.classList.toggle('turned', turned);
        };
        if (ctx.systemReducedMotion()) return swap();
        flip.classList.remove('turning');
        void flip.offsetWidth;
        flip.classList.add('turning');
        window.setTimeout(swap, 110);
        return;
      }

      const f = el.closest<HTMLElement>('[data-filter]');
      if (f) {
        filter = f.dataset.filter === 'all' ? 'all' : (Number(f.dataset.filter) as 1 | 2);
        draw();
        root.querySelector<HTMLElement>(`[data-filter="${f.dataset.filter}"]`)?.focus();
        return;
      }

      const d = el.closest<HTMLElement>('[data-drill]');
      if (d) {
        const a = d.dataset.drill;
        if (a === 'start' || a === 'again') drill = { ids: pickRandom(WORDS, 10).map((w) => w.id), i: 0 };
        else if (a === 'next' && drill) drill.i++;
        else if (a === 'exit') drill = null;
        draw();
        root.querySelector<HTMLElement>(drill ? '[data-flip], [data-drill="again"]' : '[data-drill="start"]')?.focus();
      }
    });

    draw();
    return () => {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  },
};
