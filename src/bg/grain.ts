import { rng } from './util';

/** طبقة grain خفيفة زي ورق الرسم: صورة صغيرة بتتكرر، بتترسم مرة واحدة. */
export function grainDataUrl(size = 140): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(size, size);
  const r = rng(5);
  for (let i = 0; i < size * size; i++) {
    // ضوضاء ناعمة حوالين الرمادي، مع ألياف أفقية خفيفة زي الورق
    const fiber = Math.sin(i * 0.37) * 4;
    const v = 128 + (r() + r() - 1) * 40 + fiber;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
