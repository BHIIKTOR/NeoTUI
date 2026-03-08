import {
  type BaseLayoutProps,
  type BaseStyleProps,
  measureTextWidth,
  type Rect,
  Renderable,
  renderTextBlock,
} from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

const FRAME_SETS = {
  dots: [".  ", ".. ", "..."],
  line: ["-", "\\", "|", "/"],
  pulse: [".", "o", "O", "o"],
} as const;

export interface SpinnerRenderableOptions {
  label?: string;
  frameSet?: keyof typeof FRAME_SETS;
  intervalMs?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SpinnerRenderable extends Renderable {
  label?: string;
  frameSet: keyof typeof FRAME_SETS;
  intervalMs: number;
  frameIndex = 0;
  running = false;

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: SpinnerRenderableOptions = {}) {
    super(
      "spinner",
      { height: 1, ...options.layout },
      {
        fg: defaultComponentTheme.accent,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    );
    this.label = options.label;
    this.frameSet = options.frameSet ?? "line";
    this.intervalMs = Math.max(16, options.intervalMs ?? 120);
  }

  start(): this {
    this.running = true;
    this.ensureTimer();
    return this;
  }

  stop(): this {
    this.running = false;
    this.clearTimer();
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const frame = this.currentFrame();
    const labelWidth = this.label ? 1 + measureTextWidth(this.label) : 0;

    return {
      width: Math.max(measured.width, measureTextWidth(frame) + labelWidth),
      height: Math.max(measured.height, 1),
    };
  }

  protected override onMount(): void {
    this.ensureTimer();
  }

  protected override onUnmount(): void {
    this.clearTimer();
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    const frame = this.currentFrame();
    const label = this.label ? ` ${this.label}` : "";

    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
    );

    renderTextBlock(buffer, bounds, `${frame}${label}`, {
      clip: clipRect,
      fg: this.styleProps.fg,
      bg: this.styleProps.bg,
      wrapMode: "none",
    });
  }

  private currentFrame(): string {
    const frames = FRAME_SETS[this.frameSet];
    return frames[this.frameIndex % frames.length] ?? frames[0];
  }

  private advanceFrame(): void {
    const frames = FRAME_SETS[this.frameSet];
    this.frameIndex = (this.frameIndex + 1) % frames.length;
    this.invalidate("spinner:frame");
  }

  private ensureTimer(): void {
    if (!this.mounted || !this.running || this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.advanceFrame();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
