import { links } from '../screens/links';
import { plan } from '../screens/plan';
import { progress, today, words } from '../screens/placeholders';
import { settings } from '../screens/settings';
import type { Screen, ScreenContext } from '../screens/types';
import { de, el } from './dom';
import { icons } from './icons';
import { TABS, onRoute, parseRoute, type RouteId } from './router';

const SCREENS: Record<RouteId, Screen> = { today, links, plan, words, progress, settings };

/** الهيكل: شريط فوق (الاسم والإعدادات)، والشاشة، والشريط اللي تحت. */
export function mountShell(app: HTMLElement, ctx: ScreenContext): void {
  app.innerHTML = '';

  const top = el(`
    <header class="topbar">
      <div class="bar glass">
        <a class="brand" href="#/today" aria-label="Kiros Weg، الصفحة الرئيسية">
          <span class="brand-mark">${icons.brand}</span>
          <span class="brand-text">
            <strong>${de('Kiros Weg')}</strong>
            <small>طريق كيرو</small>
          </span>
        </a>
        <a class="icon-btn" href="#/settings" aria-label="الإعدادات" data-route="settings">${icons.settings}</a>
      </div>
    </header>`);

  const view = el<HTMLElement>(`<main id="view" class="view" tabindex="-1"></main>`);

  const nav = el(`
    <nav class="tabbar glass" aria-label="الشاشات">
      ${TABS.map(
        (id) => `
        <a class="tab" href="#/${id}" data-route="${id}">
          ${icons[id]}
          <span>${SCREENS[id].title}</span>
        </a>`,
      ).join('')}
    </nav>`);

  app.append(top, view, nav);

  let cleanup: void | (() => void);
  let current: RouteId | null = null;

  const show = (id: RouteId) => {
    if (id === current) return;
    if (typeof cleanup === 'function') cleanup();
    current = id;
    const screen = SCREENS[id];
    view.innerHTML = '';
    view.classList.remove('enter');
    cleanup = screen.render(view, ctx);
    void view.offsetWidth;
    view.classList.add('enter');
    document.title = `${screen.title} · Kiros Weg`;
    app.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach((a) => {
      if (a.dataset.route === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  };

  onRoute(show);
  show(parseRoute(location.hash));
}
