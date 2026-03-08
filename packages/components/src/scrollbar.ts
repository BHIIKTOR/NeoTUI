import { type BaseLayoutProps, type BaseStyleProps, type Rect, Renderable } from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface ScrollbarRenderableOptions {
  orientation?: "vertical" | "horizontal";
  viewportSize?: number;
  contentSize?: number;
  offset?: number;
  alwaysVisible?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ScrollbarRenderable extends Renderable {
  orientation: NonNullable<ScrollbarRenderableOptions["orientation"]>;
  viewportSize: number;
  contentSize: number;
  offset: number;
  alwaysVisible: boolean;

  constructor(options: ScrollbarRenderableOptions = {}) {
    super("scrollbar", options.layout, {
      fg: defaultComponentTheme.border,
      bg: defaultComponentTheme.surfaceBg,
      borderFg: defaultComponentTheme.borderStrong,
      ...options.style,
    });
    this.orientation = options.orientation ?? "vertical";
    this.viewportSize = Math.max(1, options.viewportSize ?? 1);
    this.contentSize = Math.max(this.viewportSize, options.contentSize ?? this.viewportSize);
    this.offset = Math.max(0, options.offset ?? 0);
    this.alwaysVisible = options.alwaysVisible ?? false;
  }

  setMetrics(viewportSize: number, contentSize: number, offset: number): this {
    this.viewportSize = Math.max(1, viewportSize);
    this.contentSize = Math.max(this.viewportSize, contentSize);
    this.offset = Math.max(0, Math.min(offset, this.maxOffset()));
    this.invalidate("scrollbar:metrics");
    return this;
  }

  setOrientation(orientation: NonNullable<ScrollbarRenderableOptions["orientation"]>): this {
    this.orientation = orientation;
    this.invalidate("scrollbar:orientation");
    return this;
  }

  setAlwaysVisible(alwaysVisible: boolean): this {
    this.alwaysVisible = alwaysVisible;
    this.invalidate("scrollbar:visibility");
    return this;
  }

  isOverflowing(): boolean {
    return this.contentSize > this.viewportSize;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    return {
      width:
        this.orientation === "vertical" ? Math.max(1, measured.width) : Math.max(3, measured.width),
      height:
        this.orientation === "horizontal"
          ? Math.max(1, measured.height)
          : Math.max(3, measured.height),
    };
  }

  protected override paint(context: RenderContext): void {
    if (!this.alwaysVisible && !this.isOverflowing()) {
      return;
    }

    const { buffer } = context;
    const { bounds } = this.layoutState;
    const trackLength = this.orientation === "vertical" ? bounds.height : bounds.width;
    if (trackLength <= 0) {
      return;
    }

    const thumbLength = this.isOverflowing()
      ? Math.max(1, Math.round((this.viewportSize / this.contentSize) * trackLength))
      : trackLength;
    const maxOffset = Math.max(1, this.maxOffset());
    const thumbStart = this.isOverflowing()
      ? Math.min(
          Math.max(0, trackLength - thumbLength),
          Math.round((this.offset / maxOffset) * Math.max(0, trackLength - thumbLength)),
        )
      : 0;

    for (let index = 0; index < trackLength; index += 1) {
      const thumb = index >= thumbStart && index < thumbStart + thumbLength;
      const x = this.orientation === "vertical" ? bounds.x : bounds.x + index;
      const y = this.orientation === "vertical" ? bounds.y + index : bounds.y;
      buffer.setCell(x, y, {
        char: thumb ? "█" : this.orientation === "vertical" ? "│" : "─",
        fg: thumb
          ? (this.styleProps.borderFg ?? defaultComponentTheme.borderStrong)
          : (this.styleProps.fg ?? defaultComponentTheme.border),
        bg: this.styleProps.bg,
      });
    }
  }

  private maxOffset(): number {
    return Math.max(0, this.contentSize - this.viewportSize);
  }
}
