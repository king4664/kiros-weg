/** لون RGB، كل قيمة من 0 لـ255. */
export type RGB = readonly [number, number, number];

export function hex(s: string): RGB {
  const v = s.replace('#', '');
  const n = parseInt(v.length === 3 ? v.replace(/./g, (c) => c + c) : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** متوسط موزون لكذا لون. الأوزان لازم مجموعها يبقى أكبر من صفر. */
export function mixMany(colors: readonly RGB[], weights: readonly number[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  let sum = 0;
  colors.forEach((c, i) => {
    const w = weights[i] ?? 0;
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
    sum += w;
  });
  if (sum <= 0) return colors[0] ?? [0, 0, 0];
  return [r / sum, g / sum, b / sum];
}

/** لون شفاف فوق لون تاني (alpha من 0 لـ1). */
export function composite(fg: RGB, alpha: number, bg: RGB): RGB {
  return mix(bg, fg, alpha);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** الإضاءة النسبية حسب WCAG. */
export function luminance(c: RGB): number {
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

/** نسبة التباين حسب WCAG (من 1 لـ21). */
export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function css(c: RGB, alpha = 1): string {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return alpha >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha.toFixed(3)})`;
}

/** القيم بس، علشان نستخدمها في CSS زي rgb(var(--x) / 0.5). */
export function channels(c: RGB): string {
  return `${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])}`;
}
