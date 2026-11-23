import { SCENES, type Scene } from '../lib/params';

/** الإعدادات بتتحفظ على الموبايل بس (localStorage). */
export interface Settings {
  scene: Scene;
  /** الخلفية بتتحرك */
  motion: boolean;
}

const KEY = 'kirosweg.settings.v1';
const DEFAULTS: Settings = { scene: 'sea', motion: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      scene: v.scene && (SCENES as readonly string[]).includes(v.scene) ? v.scene : DEFAULTS.scene,
      motion: typeof v.motion === 'boolean' ? v.motion : DEFAULTS.motion,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

type Listener = (s: Settings) => void;

let state: Settings = load();
const listeners = new Set<Listener>();

export function getSettings(): Settings {
  return state;
}

export function updateSettings(patch: Partial<Settings>): void {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // لو التخزين مقفول، الإعداد بيشتغل لحد ما الصفحة تتقفل بس
  }
  listeners.forEach((fn) => fn(state));
}

export function onSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
