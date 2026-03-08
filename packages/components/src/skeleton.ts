import { type BaseLayoutProps, type BaseStyleProps, type Rect, Renderable } from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface SkeletonRenderableOptions {
  width?: number | "fill";
  height?: number;
  variant?: "line" | "block" | "avatar";
  animated?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SkeletonRenderable extends Renderable {
  variant: NonNullable<SkeletonRenderableOptions["variant"]>;
  animated: boolean;
  frameIndex = 0;

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: SkeletonRenderableOptions = {}) {
    const variant = options.variant ?? "line";
    const layout: BaseLayoutProps = {
      height: options.height ?? defaultHeightForVariant(variant),
      ...options.layout,
    };
    if (options.width === "fill") {
      layout.width = "100%";
    } else if (typeof options.width === "number") {
      layout.width = options.width;
    } else if (variant === "avatar") {
      layout.width = layout.width ?? 4;
    }

    super("skeleton", layout, {
      fg: defaultComponentTheme.muted,
      bg: defaultComponentTheme.surfaceAltBg,
      ...options.style,
    });
    this.variant = variant;
    this.animated = options.animated ?? false;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    return {
      width: Math.max(measured.width, defaultWidthForVariant(this.variant)),
      height: Math.max(measured.height, defaultHeightForVariant(this.variant)),
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
    const { bounds } = this.layoutState;
    const fillChar = this.animated && this.frameIndex % 2 === 1 ? ":" : ".";

    buffer.fill(
      {
        char: fillChar,
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
    );
  }

  private advanceFrame(): void {
    this.frameIndex = (this.frameIndex + 1) % 2;
    this.invalidate("skeleton:frame");
  }

  private ensureTimer(): void {
    if (!this.mounted || !this.animated || this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.advanceFrame();
    }, 180);
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

function defaultWidthForVariant(variant: NonNullable<SkeletonRenderableOptions["variant"]>) {
  switch (variant) {
    case "avatar":
      return 4;
    case "block":
      return 12;
    default:
      return 10;
  }
}

function defaultHeightForVariant(variant: NonNullable<SkeletonRenderableOptions["variant"]>) {
  switch (variant) {
    case "avatar":
      return 3;
    case "block":
      return 3;
    default:
      return 1;
  }
}
