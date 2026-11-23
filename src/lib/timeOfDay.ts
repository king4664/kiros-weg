import { sunElevation, sunTimes, ALEXANDRIA } from './sun';

export type Phase = 'dawn' | 'day' | 'sunset' | 'night';
export const PHASES: readonly Phase[] = ['dawn', 'day', 'sunset', 'night'];

export const PHASE_NAMES: Record<Phase, string> = {
  dawn: 'فجر',
  day: 'نهار',
  sunset: 'مغرب',
  night: 'ليل',
};

export type PhaseWeights = Record<Phase, number>;

/** الوقت اللي بنجرّبه من اللينك: اسم وقت، أو ساعة ودقيقة. */
export type TimeOverride = { kind: 'phase'; phase: Phase } | { kind: 'clock'; hours: number; minutes: number };

export interface SkyState {
  weights: PhaseWeights;
  /** ارتفاع الشمس بالدرجات */
  elevation: number;
  /** أعلى ارتفاع للشمس النهارده */
  noonElevation: number;
  /** قبل الضهر ولا بعده */
  morning: boolean;
  /** مكان الشمس من الشروق (0) للغروب (1) */
  dayProgress: number;
  sunrise: Date;
  sunset: Date;
  /** أكتر وقت واضح دلوقتي */
  dominant: Phase;
}

const smooth = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

function oneHot(phase: Phase): PhaseWeights {
  return { dawn: 0, day: 0, sunset: 0, night: 0, [phase]: 1 };
}

function between(a: Phase, b: Phase, t: number): PhaseWeights {
  const w = oneHot(a);
  const s = smooth(t);
  w[a] = 1 - s;
  w[b] += s;
  return w;
}

/**
 * أوزان الأوقات الأربعة حسب ارتفاع الشمس.
 * الصبح:  ليل (≤ -15°) ← فجر (-6° لـ +4°) ← نهار (≥ 14°)
 * بالليل: نهار (≥ 14°) ← مغرب (+4° لـ -5°) ← ليل (≤ -14°)
 * الشروق والغروب الحقيقيين عند حوالي -0.83°.
 */
export function phaseWeights(elevation: number, morning: boolean): PhaseWeights {
  const e = elevation;
  if (morning) {
    if (e <= -15) return oneHot('night');
    if (e < -6) return between('night', 'dawn', (e + 15) / 9);
    if (e <= 4) return oneHot('dawn');
    if (e < 14) return between('dawn', 'day', (e - 4) / 10);
    return oneHot('day');
  }
  if (e >= 14) return oneHot('day');
  if (e > 4) return between('day', 'sunset', (14 - e) / 10);
  if (e >= -5) return oneHot('sunset');
  if (e > -14) return between('sunset', 'night', (-5 - e) / 9);
  return oneHot('night');
}

export function dominantPhase(w: PhaseWeights): Phase {
  return PHASES.reduce((best, p) => (w[p] > w[best] ? p : best), 'day' as Phase);
}

/** حالة السما في لحظة معيّنة في إسكندرية. */
export function skyAt(now: Date, lat: number = ALEXANDRIA.lat, lon: number = ALEXANDRIA.lon): SkyState {
  const times = sunTimes(now, lat, lon);
  const elevation = sunElevation(now, lat, lon);
  const morning = now.getTime() < times.solarNoon.getTime();
  const span = times.sunset.getTime() - times.sunrise.getTime();
  const dayProgress = Math.min(1, Math.max(0, (now.getTime() - times.sunrise.getTime()) / span));
  const weights = phaseWeights(elevation, morning);
  return {
    weights,
    elevation,
    noonElevation: times.noonElevation,
    morning,
    dayProgress,
    sunrise: times.sunrise,
    sunset: times.sunset,
    dominant: dominantPhase(weights),
  };
}

/** شكل ثابت لكل وقت لما نجرّبه من اللينك. */
const PHASE_SAMPLES: Record<Phase, { elevation: number; morning: boolean; dayProgress: number }> = {
  dawn: { elevation: -1.5, morning: true, dayProgress: 0 },
  day: { elevation: 42, morning: true, dayProgress: 0.38 },
  sunset: { elevation: 1.2, morning: false, dayProgress: 1 },
  night: { elevation: -35, morning: false, dayProgress: 1 },
};

/** حالة السما، مع مراعاة الوقت اللي جاي من اللينك لو موجود. */
export function resolveSky(now: Date, override?: TimeOverride): SkyState {
  if (!override) return skyAt(now);
  if (override.kind === 'clock') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), override.hours, override.minutes);
    return skyAt(d);
  }
  const base = skyAt(now);
  const s = PHASE_SAMPLES[override.phase];
  return {
    ...base,
    ...s,
    noonElevation: Math.max(base.noonElevation, 45),
    weights: oneHot(override.phase),
    dominant: override.phase,
  };
}
