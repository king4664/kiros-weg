import { loggedMinutes, sentenceFor, timerView, type RunningTimer } from '../lib/daily';
import { toISO } from '../lib/dates';
import { esc, rich } from '../lib/rich';
import { CHANGED, getSentences, getSplashDate, getTimer, setSplashDate, setTimer, updateDay } from './daystore';

/**
 * حاجات بتظهر فوق اللوحة والواجهة مخفية:
 * التايمر (وضع التركيز)، وجملة اليوم أول فتحة في اليوم، ودقيقة الهدوء.
 */

type Mode = 'timer' | 'splash' | 'calm';

const RING = 2 * Math.PI * 92;

export interface Overlays {
  startTimer(t: Omit<RunningTimer, 'startedAt' | 'date'>): void;
  openCalm(): void;
}

export function mountOverlays(reducedMotion: () => boolean): Overlays {
  const box = document.createElement('div');
  box.className = 'overlay';
  box.hidden = true;
  document.body.append(box);
  const app = document.getElementById('app');

  let mode: Mode | null = null;
  let tick = 0;
  let calmTimers: number[] = [];
  let returnFocus: HTMLElement | null = null;

  const open = (m: Mode, html: string, label: string) => {
    if (!mode) returnFocus = document.activeElement as HTMLElement | null;
    mode = m;
    box.innerHTML = html;
    box.hidden = false;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', label);
    document.documentElement.dataset.overlay = m;
    app?.setAttribute('inert', '');
    requestAnimationFrame(() => box.querySelector<HTMLElement>('[data-autofocus]')?.focus());
  };

  const close = () => {
    mode = null;
    window.clearInterval(tick);
    calmTimers.forEach((t) => window.clearTimeout(t));
    calmTimers = [];
    delete document.documentElement.dataset.overlay;
    app?.removeAttribute('inert');
    box.hidden = true;
    box.innerHTML = '';
    returnFocus?.focus?.();
    // لو الجملة لسه ماظهرتش النهارده (مثلًا كان فيه تايمر شغال)
    maybeSplash();
  };

  /* التايمر */

  const paintTimer = () => {
    const t = getTimer();
    if (!t || mode !== 'timer') return;
    const v = timerView(t, Date.now());
    const text = box.querySelector('[data-timer-text]');
    const ring = box.querySelector<SVGCircleElement>('[data-timer-ring]');
    const state = box.querySelector('[data-timer-state]');
    if (text) text.textContent = v.text;
    if (ring) ring.style.strokeDashoffset = String(RING * (1 - (t.planned ? v.progress : 0)));
    if (state) state.textContent = !t.planned ? 'عدّى' : v.over ? 'الوقت خلص، وده الزيادة' : 'فاضل';
  };

  const showTimer = (t: RunningTimer) => {
    open(
      'timer',
      `
      <div class="focus-panel">
        <p class="focus-label">${rich(t.label)}</p>
        <div class="focus-ring">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle class="ring-bg" cx="100" cy="100" r="92" />
            <circle class="ring-fg" data-timer-ring cx="100" cy="100" r="92"
              stroke-dasharray="${RING}" stroke-dashoffset="${RING}" />
          </svg>
          <div class="focus-time">
            <span class="focus-state" data-timer-state></span>
            <span class="focus-clock" data-timer-text dir="ltr" role="timer"></span>
            ${t.planned ? `<span class="focus-state">من ${t.planned} دقيقة</span>` : ''}
          </div>
        </div>
        <button type="button" class="btn big" data-stop data-autofocus>وقّف</button>
      </div>`,
      'التايمر',
    );
    paintTimer();
    window.clearInterval(tick);
    tick = window.setInterval(paintTimer, 500);
  };

  const stopTimer = () => {
    const t = getTimer();
    if (t) {
      const m = loggedMinutes(Date.now() - t.startedAt);
      if (m > 0) {
        updateDay(t.date, (d) => ({ ...d, minutes: { ...d.minutes, [t.key]: (d.minutes?.[t.key] ?? 0) + m } }));
      }
    }
    setTimer(null);
    close();
  };

  /* جملة اليوم: أول فتحة في اليوم */

  function maybeSplash(): void {
    if (mode || getTimer()) return;
    const today = new Date();
    const iso = toISO(today);
    if (getSplashDate() === iso) return;
    const sentence = sentenceFor(getSentences(), today);
    if (!sentence) return;
    open(
      'splash',
      `
      <div class="splash-panel">
        <p class="eyebrow">جملة اليوم</p>
        <p class="splash-text" dir="auto">${esc(sentence)}</p>
        <button type="button" class="btn big" data-start data-autofocus>يلا نبدأ</button>
      </div>`,
      'جملة اليوم',
    );
  }

  /* دقيقة هدوء: شهيق 4 ثواني، وزفير 6 ثواني، 6 مرات */

  const openCalm = () => {
    open(
      'calm',
      `
      <div class="calm-panel">
        <div class="calm-circle${reducedMotion() ? ' still' : ''}" aria-hidden="true"></div>
        <p class="calm-word" data-calm-word aria-live="polite">شهيق</p>
        <p class="small calm-hint" data-calm-hint>شهيق 4 ثواني، وزفير 6 ثواني</p>
        <button type="button" class="btn" data-calm-close data-autofocus>خلاص</button>
      </div>`,
      'دقيقة هدوء',
    );
    const word = box.querySelector('[data-calm-word]');
    const hint = box.querySelector('[data-calm-hint]');
    for (let i = 0; i < 6; i++) {
      calmTimers.push(window.setTimeout(() => word && (word.textContent = 'شهيق'), i * 10_000));
      calmTimers.push(window.setTimeout(() => word && (word.textContent = 'زفير'), i * 10_000 + 4_000));
    }
    calmTimers.push(
      window.setTimeout(() => {
        box.querySelector('.calm-circle')?.classList.add('done');
        if (word) word.textContent = 'خلصت الدقيقة';
        if (hint) hint.textContent = '';
        const btn = box.querySelector('[data-calm-close]');
        if (btn) btn.textContent = 'يلا نبدأ';
      }, 60_000),
    );
  };

  box.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-stop]')) stopTimer();
    else if (el.closest('[data-start]')) {
      setSplashDate(toISO(new Date()));
      close();
    } else if (el.closest('[data-calm-close]')) close();
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode === 'calm') close();
    // التركيز يفضل جوه
    if (e.key === 'Tab') {
      const f = [...box.querySelectorAll<HTMLElement>('button, a[href]')];
      if (f.length === 1) {
        e.preventDefault();
        f[0]?.focus();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (mode === 'timer') paintTimer();
    else maybeSplash();
  });

  window.addEventListener(CHANGED, () => {
    const t = getTimer();
    if (t && mode !== 'timer') showTimer(t);
  });

  // لو كان فيه تايمر شغال قبل ما الصفحة تتقفل، بيكمّل
  const running = getTimer();
  if (running) showTimer(running);
  else maybeSplash();

  return {
    startTimer(t) {
      setTimer({ ...t, date: toISO(new Date()), startedAt: Date.now() });
    },
    openCalm,
  };
}
