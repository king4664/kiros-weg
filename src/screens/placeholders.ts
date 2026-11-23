import type { Screen } from './types';

/** شاشات فاضية للمرحلة 1. كل واحدة هتتملي في مرحلتها. */

export const words: Screen = {
  id: 'words',
  title: 'الكلمات',
  render(root) {
    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">الكلمات</p>
        <h1 class="title">كلمات الأسبوع 1 و2</h1>
        <p class="muted">الكروت والنطق والتمرين السريع. جايين في المرحلة 4.</p>
      </section>`;
  },
};

export const progress: Screen = {
  id: 'progress',
  title: 'المتابعة',
  render(root) {
    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">المتابعة</p>
        <h1 class="title">إنت ماشي إزاي</h1>
        <p class="muted">تسجيل اليوم، والسلّم، والشجرة، وكراسة الأخطاء. جايين في المرحلة 4.</p>
      </section>`;
  },
};
