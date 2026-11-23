import { PHASES, type Phase, type TimeOverride } from './timeOfDay';

export type Scene = 'sea' | 'mountains';
export const SCENES: readonly Scene[] = ['sea', 'mountains'];

/** حاجات بنجرّبها من اللينك ومابتتحفظش. */
export interface UrlOverrides {
  scene?: Scene;
  time?: TimeOverride;
  motion?: boolean;
}

/**
 * الخلفية بتتحرك ولا صورة ثابتة؟
 * اللينك بيغلب الإعدادات، وprefers-reduced-motion بيوقف الحركة دايمًا.
 */
export function resolveMotion(setting: boolean, fromUrl: boolean | undefined, systemReduced: boolean): boolean {
  return (fromUrl ?? setting) && !systemReduced;
}

/**
 * بيقرا ?scene=sea&time=night&motion=off من أول اللينك أو من بعد الـ#.
 * time ممكن يبقى dawn أو day أو sunset أو night، أو ساعة زي 18:30.
 */
export function parseOverrides(search: string, hash = ''): UrlOverrides {
  const params = new URLSearchParams(search);
  const q = hash.indexOf('?');
  if (q >= 0) {
    new URLSearchParams(hash.slice(q + 1)).forEach((v, k) => params.set(k, v));
  }
  const out: UrlOverrides = {};

  const scene = params.get('scene');
  if (scene && (SCENES as readonly string[]).includes(scene)) out.scene = scene as Scene;

  const time = params.get('time')?.trim().toLowerCase();
  if (time) {
    if ((PHASES as readonly string[]).includes(time)) {
      out.time = { kind: 'phase', phase: time as Phase };
    } else {
      const m = /^(\d{1,2}):(\d{2})$/.exec(time);
      if (m) {
        const hours = Number(m[1]);
        const minutes = Number(m[2]);
        if (hours < 24 && minutes < 60) out.time = { kind: 'clock', hours, minutes };
      }
    }
  }

  const motion = params.get('motion')?.toLowerCase();
  if (motion === 'off' || motion === '0' || motion === 'false') out.motion = false;
  if (motion === 'on' || motion === '1' || motion === 'true') out.motion = true;

  return out;
}
