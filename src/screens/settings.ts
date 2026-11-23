import { icons } from '../app/icons';
import { getSettings, updateSettings } from '../app/settings';
import { formatClock } from '../lib/dates';
import { parseOverrides, type Scene } from '../lib/params';
import { PHASE_NAMES } from '../lib/timeOfDay';
import type { Screen } from './types';

const SCENE_NAMES: Record<Scene, string> = {
  sea: 'بحر إسكندرية',
  mountains: 'جبال وضباب',
};

export const settings: Screen = {
  id: 'settings',
  title: 'الإعدادات',
  render(root, ctx) {
    const s = getSettings();
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
        <h2 class="card-title">درجة السلّم</h2>
        <p class="muted">هتقدر تغيّرها بإيدك من هنا في المرحلة 4.</p>
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
