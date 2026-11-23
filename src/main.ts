import './styles/main.css';
import { Background, type Theme } from './bg/background';
import { grainDataUrl } from './bg/grain';
import { mountOverlays } from './app/overlays';
import { mountShell } from './app/shell';
import { getSettings, onSettings } from './app/settings';
import { channels, css } from './lib/color';
import { parseOverrides, resolveMotion, type UrlOverrides } from './lib/params';

const canvas = document.getElementById('bg') as HTMLCanvasElement;
const paper = document.querySelector<HTMLElement>('.paper');
const app = document.getElementById('app') as HTMLElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

let url: UrlOverrides = parseOverrides(location.search, location.hash);

/** الإعدادات بعد ما ناخد في الاعتبار اللينك وreduced motion. */
function effective() {
  const s = getSettings();
  return {
    scene: url.scene ?? s.scene,
    motion: resolveMotion(s.motion, url.motion, reduced.matches),
    time: url.time,
  };
}

const themeListeners = new Set<(t: Theme) => void>();
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

/** ألوان الواجهة مأخوذة من ألوان اللوحة في الوقت الحالي. */
function applyTheme(t: Theme): void {
  const root = document.documentElement;
  const ui = t.ui;
  root.style.setProperty('--glass', channels(ui.glass));
  root.style.setProperty('--glass-a', ui.glassAlpha.toFixed(3));
  root.style.setProperty('--ink', channels(ui.ink));
  root.style.setProperty('--muted', channels(ui.muted));
  root.style.setProperty('--accent', channels(ui.accent));
  root.style.setProperty('--accent-ink', channels(ui.accentInk));
  root.dataset.mode = ui.mode;
  root.dataset.phase = t.sky.dominant;
  themeMeta?.setAttribute('content', css(t.palette.sky.top));
  themeListeners.forEach((fn) => fn(t));
}

if (paper) paper.style.setProperty('--grain', `url(${grainDataUrl()})`);

const bg = new Background(canvas, effective(), applyTheme);

onSettings(() => bg.set(effective()));
reduced.addEventListener('change', () => bg.set(effective()));
window.addEventListener('hashchange', () => {
  const next = parseOverrides(location.search, location.hash);
  if (JSON.stringify(next) !== JSON.stringify(url)) {
    url = next;
    bg.set(effective());
  }
});

const overlays = mountOverlays(() => reduced.matches);

mountShell(app, {
  overlays,
  theme: () => bg.current,
  systemReducedMotion: () => reduced.matches,
  onTheme(fn) {
    themeListeners.add(fn);
    return () => themeListeners.delete(fn);
  },
});

if (import.meta.env.DEV) {
  (window as unknown as { kirosBg: Background }).kirosBg = bg;
}
