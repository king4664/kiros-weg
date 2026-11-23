import type { Scene } from '../lib/params';
import { resolveSky, type PhaseWeights, type SkyState, type TimeOverride } from '../lib/timeOfDay';
import { MountainScene } from './mountains';
import { blendPalette, blendUi, type Palette, type UiColors } from './palettes';
import type { SceneRenderer } from './scene';
import { SeaScene } from './sea';

export interface BackgroundOptions {
  scene: Scene;
  /** الحركة مفعّلة (بعد مراعاة الإعدادات وreduced motion) */
  motion: boolean;
  time?: TimeOverride;
}

export interface Theme {
  palette: Palette;
  ui: UiColors;
  sky: SkyState;
}

const MAX_FPS = 30;
const FRAME_MS = 1000 / MAX_FPS;
/** كل قد إيه نحسب مكان الشمس تاني */
const SKY_REFRESH_MS = 20_000;
/** الوقت اللي بنرسم عنده الصورة الثابتة */
const STILL_T = 7;

function weightsKey(w: PhaseWeights, elevation: number): string {
  return `${w.dawn.toFixed(3)}|${w.day.toFixed(3)}|${w.sunset.toFixed(3)}|${w.night.toFixed(3)}|${elevation.toFixed(1)}`;
}

/**
 * اللوحة اللي ورا كل الشاشات.
 * - 30 فريم في الثانية بالكتير.
 * - بتقف لما التطبيق يروح الخلفية.
 * - من غير حركة: بترسم صورة ثابتة بس، وبتحدّثها لما الوقت يتغير.
 */
export class Background {
  private ctx: CanvasRenderingContext2D;
  private scenes: Record<Scene, SceneRenderer> = { sea: new SeaScene(), mountains: new MountainScene() };
  private opts: BackgroundOptions;
  private theme!: Theme;
  private key = '';
  private raf = 0;
  private lastFrame = 0;
  private t0 = performance.now();
  private size = { w: 0, h: 0, scale: 1 };
  private laidOut = new Set<Scene>();
  private skyTimer = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: BackgroundOptions,
    private readonly onTheme: (theme: Theme) => void,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('canvas 2d مش متاح');
    this.ctx = ctx;
    this.opts = opts;
    this.refreshSky(true);
    this.measure();

    window.addEventListener('resize', () => {
      if (this.measure()) this.drawNow();
    });
    document.addEventListener('visibilitychange', () => this.sync());
    this.sync();
  }

  set(next: Partial<BackgroundOptions>): void {
    const prevScene = this.opts.scene;
    this.opts = { ...this.opts, ...next };
    if ('time' in next) this.refreshSky(true);
    if (prevScene !== this.opts.scene) this.ensureLayout();
    this.sync();
  }

  get current(): Theme {
    return this.theme;
  }

  /** بيحسب حالة السما، ولو الألوان اتغيرت بيبلّغ الواجهة. */
  private refreshSky(force = false): void {
    const sky = resolveSky(new Date(), this.opts.time);
    const key = weightsKey(sky.weights, sky.elevation);
    if (!force && key === this.key && this.theme) {
      this.theme = { ...this.theme, sky };
      return;
    }
    this.key = key;
    this.theme = { palette: blendPalette(sky.weights), ui: blendUi(sky.weights), sky };
    for (const s of Object.values(this.scenes)) s.invalidate();
    this.onTheme(this.theme);
  }

  /** بيرجّع true لو المقاس اتغير. */
  private measure(): boolean {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    // دقة أقل من الشاشة شوية: أسرع، وبتدّي حواف ناعمة زي الرسم
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.62;
    if (w === this.size.w && h === this.size.h && scale === this.size.scale) return false;
    this.size = { w, h, scale };
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    this.laidOut.clear();
    this.ensureLayout();
    return true;
  }

  private ensureLayout(): void {
    const scene = this.opts.scene;
    if (this.laidOut.has(scene)) return;
    const { w, h, scale } = this.size;
    this.scenes[scene].layout(w, h, scale);
    this.scenes[scene].invalidate();
    this.laidOut.add(scene);
  }

  /** عدد الفريمات اللي اترسمت (للتجربة بس) */
  frames = 0;

  private render(now: number): void {
    const { scale } = this.size;
    const t = this.opts.motion ? (now - this.t0) / 1000 : STILL_T;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.scenes[this.opts.scene].draw(this.ctx, t, this.theme.palette, this.theme.sky);
    this.frames++;
  }

  private drawNow(): void {
    this.render(performance.now());
  }

  private loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (now - this.lastFrame < FRAME_MS - 2) return;
    this.lastFrame = now;
    this.render(now);
  };

  /** بيشغّل أو يوقف الرسم حسب الحالة. */
  private sync(): void {
    const visible = document.visibilityState === 'visible';
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.clearInterval(this.skyTimer);
    this.skyTimer = 0;
    if (!visible) return;

    this.refreshSky();
    this.skyTimer = window.setInterval(() => {
      this.refreshSky();
      if (!this.opts.motion) this.drawNow();
    }, SKY_REFRESH_MS);

    if (this.opts.motion) {
      this.lastFrame = 0;
      this.raf = requestAnimationFrame(this.loop);
    } else {
      this.drawNow();
    }
  }
}
