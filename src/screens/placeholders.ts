import { de } from '../app/dom';
import { formatDate } from '../lib/dates';
import type { Screen } from './types';

/** شاشات فاضية للمرحلة 1. كل واحدة هتتملي في مرحلتها. */

export const today: Screen = {
  id: 'today',
  title: 'النهارده',
  render(root) {
    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">النهارده</p>
        <h1 class="title">${formatDate(new Date())}</h1>
        <p class="muted">مهام اليوم، والتايمر، ورسالة المتابعة هيبقوا هنا في المرحلة 3.</p>
      </section>
      <section class="card">
        <h2 class="card-title">جملة تجربة</h2>
        <p>${de('Guten Morgen!')} يعني «صباح الخير».</p>
        <p class="muted">الكارت ده علشان نتأكد إن الكلام مقري فوق اللوحة في كل وقت.</p>
      </section>`;
  },
};

export const links: Screen = {
  id: 'links',
  title: 'الروابط',
  render(root) {
    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">الروابط</p>
        <h1 class="title">كل روابط الخطة</h1>
        <p class="muted">الـ45 رابط في مجموعات، مع بحث ومفضلة. جاية في المرحلة 2.</p>
      </section>`;
  },
};

export const plan: Screen = {
  id: 'plan',
  title: 'الخطة',
  render(root) {
    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">الخطة</p>
        <h1 class="title">المحطات والمنهج</h1>
        <p class="muted">الخط الزمني، والأسابيع، والقرارات. جاية في المرحلة 2.</p>
      </section>`;
  },
};

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
