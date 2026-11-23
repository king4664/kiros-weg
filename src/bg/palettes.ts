import { hex, mixMany, type RGB } from '../lib/color';
import { PHASES, type Phase, type PhaseWeights } from '../lib/timeOfDay';

/** ألوان اللوحة في وقت واحد. ألوان هادية، مش فاقعة. */
export interface Palette {
  sky: {
    top: RGB;
    mid: RGB;
    horizon: RGB;
    /** الشمس، أو القمر بالليل */
    sun: RGB;
    glow: RGB;
    glowStrength: number;
    cloud: RGB;
    cloudShade: RGB;
    cloudAlpha: number;
    /** قد إيه النجوم باينة (0–1) */
    stars: number;
  };
  sea: {
    far: RGB;
    near: RGB;
    crest: RGB;
    glitter: RGB;
    glitterStrength: number;
  };
  mountains: {
    /** من الأبعد للأقرب */
    layers: readonly [RGB, RGB, RGB, RGB, RGB];
    rim: RGB;
    fog: RGB;
    fogAlpha: number;
  };
}

/** ألوان الواجهة (الكروت الزجاج والكلام) لكل وقت. */
export interface UiColors {
  mode: 'light' | 'dark';
  glass: RGB;
  glassAlpha: number;
  ink: RGB;
  muted: RGB;
  accent: RGB;
  /** لون الكلام على زرار لونه accent */
  accentInk: RGB;
}

const h = hex;

export const PALETTES: Record<Phase, Palette> = {
  dawn: {
    sky: {
      top: h('#6d7aa3'),
      mid: h('#b7a6c0'),
      horizon: h('#f1c8ab'),
      sun: h('#fde6c8'),
      glow: h('#f7c7a1'),
      glowStrength: 0.75,
      cloud: h('#efd0cc'),
      cloudShade: h('#a395b4'),
      cloudAlpha: 0.7,
      stars: 0.12,
    },
    sea: {
      far: h('#b2a9c0'),
      near: h('#4f5c80'),
      crest: h('#f4dccf'),
      glitter: h('#ffe9d0'),
      glitterStrength: 0.8,
    },
    mountains: {
      layers: [h('#cbb6c7'), h('#a998b3'), h('#857a9c'), h('#615a7d'), h('#41405f')],
      rim: h('#f3d4c6'),
      fog: h('#efd8d4'),
      fogAlpha: 0.5,
    },
  },
  day: {
    sky: {
      top: h('#6a99c2'),
      mid: h('#a2c3da'),
      horizon: h('#e2ebe7'),
      sun: h('#fff7e2'),
      glow: h('#fff1cc'),
      glowStrength: 0.4,
      cloud: h('#fbfbf7'),
      cloudShade: h('#c6d3de'),
      cloudAlpha: 0.75,
      stars: 0,
    },
    sea: {
      far: h('#93b8c9'),
      near: h('#2f6683'),
      crest: h('#e9f4f3'),
      glitter: h('#fffbea'),
      glitterStrength: 0.55,
    },
    mountains: {
      layers: [h('#bfcfd7'), h('#9ab2bf'), h('#7392a2'), h('#507083'), h('#355262')],
      rim: h('#e8f0f1'),
      fog: h('#eef3f2'),
      fogAlpha: 0.38,
    },
  },
  sunset: {
    sky: {
      top: h('#3f4a78'),
      mid: h('#ad7089'),
      horizon: h('#eda877'),
      sun: h('#ffd8a4'),
      glow: h('#f19c6d'),
      glowStrength: 0.9,
      cloud: h('#e39d8c'),
      cloudShade: h('#6c5579'),
      cloudAlpha: 0.65,
      stars: 0.08,
    },
    sea: {
      far: h('#bf8b8c'),
      near: h('#3a3558'),
      crest: h('#f6c8a4'),
      glitter: h('#ffdaa9'),
      glitterStrength: 0.9,
    },
    mountains: {
      layers: [h('#d39e98'), h('#a8778c'), h('#7a5978'), h('#544063'), h('#342a4a')],
      rim: h('#f5bb91'),
      fog: h('#efbca0'),
      fogAlpha: 0.45,
    },
  },
  night: {
    sky: {
      top: h('#0f1631'),
      mid: h('#1d2b4f'),
      horizon: h('#3b4b71'),
      sun: h('#f0eddc'),
      glow: h('#8996bf'),
      glowStrength: 0.45,
      cloud: h('#3d4869'),
      cloudShade: h('#1b2342'),
      cloudAlpha: 0.55,
      stars: 1,
    },
    sea: {
      far: h('#2d3b5f'),
      near: h('#0c1429'),
      crest: h('#7e8eb6'),
      glitter: h('#dde3f3'),
      glitterStrength: 0.55,
    },
    mountains: {
      layers: [h('#3f4d71'), h('#313e5f'), h('#24304d'), h('#19233b'), h('#0f1729')],
      rim: h('#6b7ba7'),
      fog: h('#4b5981'),
      fogAlpha: 0.3,
    },
  },
};

export const UI: Record<Phase, UiColors> = {
  dawn: {
    mode: 'light',
    glass: h('#fbf6f3'),
    glassAlpha: 0.77,
    ink: h('#25223a'),
    muted: h('#4a4562'),
    accent: h('#6c3560'),
    accentInk: h('#ffffff'),
  },
  day: {
    mode: 'light',
    glass: h('#f7fafb'),
    glassAlpha: 0.77,
    ink: h('#132739'),
    muted: h('#384c5e'),
    accent: h('#184d68'),
    accentInk: h('#ffffff'),
  },
  sunset: {
    mode: 'dark',
    glass: h('#2a2240'),
    glassAlpha: 0.77,
    ink: h('#fff6ee'),
    muted: h('#ead9d3'),
    accent: h('#ffd2ad'),
    accentInk: h('#2a2240'),
  },
  night: {
    mode: 'dark',
    glass: h('#0f1630'),
    glassAlpha: 0.77,
    ink: h('#f2f4fa'),
    muted: h('#cdd3e3'),
    accent: h('#bccfff'),
    accentInk: h('#0f1630'),
  },
};

type Blendable = number | string | RGB | readonly RGB[] | { [k: string]: Blendable };

function isRGB(v: unknown): v is RGB {
  return Array.isArray(v) && v.length === 3 && typeof v[0] === 'number';
}

function blendValues(values: readonly Blendable[], weights: readonly number[]): Blendable {
  const first = values[0] as Blendable;
  if (typeof first === 'number') {
    let sum = 0;
    let wsum = 0;
    values.forEach((v, i) => {
      const w = weights[i] ?? 0;
      sum += (v as number) * w;
      wsum += w;
    });
    return wsum > 0 ? sum / wsum : first;
  }
  if (typeof first === 'string') {
    // نختار القيمة اللي وزنها أكبر
    let best = 0;
    weights.forEach((w, i) => {
      if (w > (weights[best] ?? 0)) best = i;
    });
    return values[best] as Blendable;
  }
  if (isRGB(first)) return mixMany(values as RGB[], weights);
  if (Array.isArray(first)) {
    return first.map((_, idx) => mixMany((values as RGB[][]).map((v) => v[idx] as RGB), weights)) as RGB[];
  }
  const out: Record<string, Blendable> = {};
  for (const key of Object.keys(first)) {
    out[key] = blendValues(
      values.map((v) => (v as Record<string, Blendable>)[key] as Blendable),
      weights,
    );
  }
  return out;
}

function blendRecord<T>(table: Record<Phase, T>, w: PhaseWeights, phases: readonly Phase[] = PHASES): T {
  return blendValues(
    phases.map((p) => table[p] as unknown as Blendable),
    phases.map((p) => w[p]),
  ) as unknown as T;
}

/** ألوان اللوحة لما الوقت بين وقتين (الانتقال التدريجي). */
export function blendPalette(w: PhaseWeights): Palette {
  return blendRecord(PALETTES, w);
}

/**
 * ألوان الواجهة. الكروت يا فاتحة يا غامقة، علشان التباين يفضل 4.5:1 دايمًا.
 * الوضع بيتحدد بالأوقات اللي وزنها أكبر، والألوان بتتخلط من الأوقات اللي على نفس الوضع بس.
 */
export function blendUi(w: PhaseWeights): UiColors {
  const light = PHASES.filter((p) => UI[p].mode === 'light');
  const dark = PHASES.filter((p) => UI[p].mode === 'dark');
  const lightShare = light.reduce((s, p) => s + w[p], 0);
  const group = lightShare >= 0.5 ? light : dark;
  const total = group.reduce((s, p) => s + w[p], 0);
  if (total <= 0) return UI[group[0] as Phase];
  return blendRecord(UI, w, group);
}
