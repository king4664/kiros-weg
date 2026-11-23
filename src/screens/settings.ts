import { getLadder, getSentences, setLadder, setSentences, setSplashDate } from '../app/daystore';
import { esc, rich } from '../app/dom';
import { icons } from '../app/icons';
import { getSettings, updateSettings } from '../app/settings';
import { parseLines, saveSentences, sentenceFor } from '../lib/daily';
import { formatClock, toISO } from '../lib/dates';
import { parseOverrides, type Scene } from '../lib/params';
import { PHASE_NAMES } from '../lib/timeOfDay';
import { RUNG_NAMES, type LadderSetting } from '../lib/today';
import type { Screen } from './types';

const SCENE_NAMES: Record<Scene, string> = {
  sea: 'بحر إسكندرية',
  mountains: 'جبال وضباب',
};

/** جزء 3 */
const LADDER_RULE = '**السلّم:** تطلع درجة بس لما تكمّل 6 أيام في الأسبوع. ولو فاتك يومين، تنزل درجة.';

const LADDER_OPTIONS: [string, string, string][] = [
  ['auto', 'زي مواعيد الخطة', 'ساعة لحد 28 نوفمبر، وساعة ونص لحد 5 ديسمبر، وأنواع الأيام من 6 ديسمبر'],
  ['0', RUNG_NAMES[0], ''],
  ['1', RUNG_NAMES[1], ''],
  ['2', RUNG_NAMES[2], ''],
  ['3', RUNG_NAMES[3], 'يوم الـ4 ساعات: بعد أسبوعين منتظمين'],
];

export const settings: Screen = {
  id: 'settings',
  title: 'الإعدادات',
  render(root, ctx) {
    const s = getSettings();
    const ladder = getLadder();
    const url = parseOverrides(location.search, location.hash);

    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">الإعدادات</p>
        <h1 class="title">اللوحة وإنت</h1>
      </section>

      <section class="card">
        <h2 class="card-title" id="scene-label">المنظر</h2>
        <div class="choice-row" role="radiogroup" aria-labelledby="scene-label">
          ${(['sea', 'mountains'] as const)
            .map(
              (id) => `
            <label class="choice">
              <input type="radio" name="scene" value="${id}" ${s.scene === id ? 'checked' : ''}>
              <span class="choice-body">${icons[id]}<span>${SCENE_NAMES[id]}</span></span>
            </label>`,
            )
            .join('')}
        </div>
        ${url.scene ? `<p class="note">المنظر دلوقتي جاي من اللينك (${SCENE_NAMES[url.scene]}).</p>` : ''}
      </section>

      <section class="card">
        <label class="switch-row">
          <span>
            <span class="card-title">الحركة</span>
            <span class="muted block">الموج والسحاب والضباب بيتحركوا ببطء.</span>
          </span>
          <input type="checkbox" class="switch" name="motion" ${s.motion ? 'checked' : ''}>
        </label>
        <p class="note" data-reduced hidden>الموبايل طالب حركة أقل، فاللوحة هتفضل صورة ثابتة.</p>
        ${url.motion === false ? '<p class="note">الحركة مقفولة من اللينك.</p>' : ''}
      </section>

      <section class="card">
        <h2 class="card-title">الوقت في اللوحة</h2>
        <p data-sky></p>
        ${url.time ? '<p class="note">الوقت دلوقتي جاي من اللينك.</p>' : ''}
      </section>

      <section class="card">
        <h2 class="card-title" id="ladder-label">درجة السلّم</h2>
        <p class="small">${rich(LADDER_RULE)}</p>
        <div class="radio-list" role="radiogroup" aria-labelledby="ladder-label">
          ${LADDER_OPTIONS.map(
            ([value, label, sub]) => `
            <label class="radio-row">
              <input type="radio" name="ladder" value="${value}" ${String(ladder) === value ? 'checked' : ''}>
              <span><span class="block">${label}</span>${sub ? `<small class="muted block">${sub}</small>` : ''}</span>
            </label>`,
          ).join('')}
        </div>
        <p class="note">الدرجة مابتعديش مواعيد الخطة: ساعة لحد 28 نوفمبر، وساعة ونص لحد 5 ديسمبر.</p>
      </section>

      <section class="card">
        <h2 class="card-title">جمل اليوم</h2>
        <p class="small muted">كل جملة في سطر. بتتحفظ على موبايلك بس، ومش بتترفع في أي حتة. أول جملة بتبدأ يوم ما تحفظ، وكل يوم الجملة اللي بعدها، وبعد الأخيرة ترجع للأولى.</p>
        <label class="sr-only" for="sentences">الجمل، كل جملة في سطر</label>
        <textarea id="sentences" class="textarea" rows="6" dir="auto" data-sentences>${esc((getSentences()?.lines ?? []).join('\n'))}</textarea>
        <div class="task-actions">
          <button type="button" class="btn" data-save-sentences>احفظ الجمل</button>
          <span class="small" data-sentences-status aria-live="polite"></span>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">النسخ الاحتياطي</h2>
        <p class="muted">Export وImport لبياناتك في المرحلة 4.</p>
      </section>`;

    root.querySelectorAll<HTMLInputElement>('input[name="scene"]').forEach((input) =>
      input.addEventListener('change', () => {
        if (input.checked) updateSettings({ scene: input.value as Scene });
      }),
    );
    root.querySelectorAll<HTMLInputElement>('input[name="ladder"]').forEach((input) =>
      input.addEventListener('change', () => {
        if (input.checked) setLadder((input.value === 'auto' ? 'auto' : Number(input.value)) as LadderSetting);
      }),
    );

    root.querySelector('[data-save-sentences]')?.addEventListener('click', () => {
      const box = root.querySelector<HTMLTextAreaElement>('[data-sentences]');
      const status = root.querySelector('[data-sentences-status]');
      const now = new Date();
      const prev = getSentences();
      const next = saveSentences(prev, parseLines(box?.value ?? ''), toISO(now), now);
      setSentences(next);
      // النهارده إنت فاتح التطبيق أصلًا، فالجملة تظهر لوحدها من بكرة
      if (!prev && next) setSplashDate(toISO(now));
      if (status) {
        status.textContent = next
          ? `اتحفظت ${next.lines.length} جملة. جملة النهارده: «${sentenceFor(next, now) ?? ''}»`
          : 'مفيش جمل، فكارت جملة اليوم مش هيظهر.';
      }
    });

    const motion = root.querySelector<HTMLInputElement>('input[name="motion"]');
    motion?.addEventListener('change', () => updateSettings({ motion: motion.checked }));

    const reduced = root.querySelector<HTMLElement>('[data-reduced]');
    if (reduced) reduced.hidden = !ctx.systemReducedMotion();

    const skyLine = root.querySelector<HTMLElement>('[data-sky]');
    const paint = () => {
      const { sky } = ctx.theme();
      if (skyLine) {
        skyLine.textContent = `دلوقتي ${PHASE_NAMES[sky.dominant]}. الشروق في إسكندرية النهارده ${formatClock(
          sky.sunrise,
        )}، والغروب ${formatClock(sky.sunset)}.`;
      }
    };
    paint();
    return ctx.onTheme(paint);
  },
};
