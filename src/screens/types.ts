import type { Theme } from '../bg/background';
import type { RouteId } from '../app/router';

export interface ScreenContext {
  theme(): Theme;
  /** الموبايل طالب حركة أقل (prefers-reduced-motion) */
  systemReducedMotion(): boolean;
  /** بيتنادي لما الألوان أو الوقت يتغيروا. بيرجّع دالة للإلغاء. */
  onTheme(fn: (t: Theme) => void): () => void;
}

export interface Screen {
  id: RouteId;
  title: string;
  /** بيرسم الشاشة، وممكن يرجّع دالة تنضّف لما نسيبها */
  render(root: HTMLElement, ctx: ScreenContext): void | (() => void);
}
