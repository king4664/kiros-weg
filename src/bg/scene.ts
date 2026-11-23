import type { SkyState } from '../lib/timeOfDay';
import type { Palette } from './palettes';

/** أي منظر: بيترسم بمقاسات الشاشة (CSS px)، والـcontext متظبط على الـscale. */
export interface SceneRenderer {
  layout(w: number, h: number, scale: number): void;
  /** الألوان اتغيرت: ارسم الحاجات المتخزّنة تاني */
  invalidate(): void;
  draw(ctx: CanvasRenderingContext2D, t: number, pal: Palette, sky: SkyState): void;
}
