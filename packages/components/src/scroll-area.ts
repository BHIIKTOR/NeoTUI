import {
  type BaseLayoutProps,
  type BaseStyleProps,
  type Renderable,
  type RenderEvent,
  ScrollBoxRenderable,
} from "@neotui/core";
import { ScrollbarRenderable } from "./scrollbar";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface ScrollAreaRenderableOptions {
  direction?: "vertical" | "horizontal" | "both";
  showScrollbars?: boolean;
  scrollbarVisibility?: "always" | "hover" | "auto";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ScrollAreaRenderable extends ScrollBoxRenderable {
  direction: NonNullable<ScrollAreaRenderableOptions["direction"]>;
  showScrollbars: boolean;
  scrollbarVisibility: NonNullable<ScrollAreaRenderableOptions["scrollbarVisibility"]>;
  focused = false;
  hovered = false;
  scrollX = 0;
  readonly verticalScrollbar: ScrollbarRenderable;
  readonly horizontalScrollbar: ScrollbarRenderable;

  constructor(options: ScrollAreaRenderableOptions = {}) {
    super({
      layout: options.layout,
      style: {
        border: true,
        focusable: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        borderFg: defaultComponentTheme.border,
        ...options.style,
      },
    });
    this.direction = options.direction ?? "vertical";
    this.showScrollbars = options.showScrollbars ?? true;
    this.scrollbarVisibility = options.scrollbarVisibility ?? "auto";
    this.verticalScrollbar = new ScrollbarRenderable({
      orientation: "vertical",
      layout: {
        position: "absolute",
        right: 0,
        top: 1,
        width: 1,
        zIndex: 8,
      },
      style: {
        fg: defaultComponentTheme.border,
        borderFg: defaultComponentTheme.borderStrong,
        bg: this.styleProps.bg,
      },
    });
    this.horizontalScrollbar = new ScrollbarRenderable({
      orientation: "horizontal",
      layout: {
        position: "absolute",
        left: 1,
        bottom: 0,
        height: 1,
        zIndex: 8,
      },
      style: {
        fg: defaultComponentTheme.border,
        borderFg: defaultComponentTheme.borderStrong,
        bg: this.styleProps.bg,
      },
    });
    super.add(this.verticalScrollbar, this.horizontalScrollbar);

    this.on("mouseenter", () => {
      this.hovered = true;
      this.invalidate("scroll-area:hover");
    });
    this.on("mouseleave", () => {
      this.hovered = false;
      this.invalidate("scroll-area:hover-end");
    });
  }

  override setScrollY(value: number): this {
    if (this.layoutState.innerBounds.height === 0) {
      return super.setScrollY(Math.max(0, value));
    }

    const next = Math.max(0, Math.min(value, this.getMaxScrollY()));
    return super.setScrollY(next);
  }

  setScrollX(value: number): this {
    if (this.layoutState.innerBounds.width === 0) {
      this.scrollX = Math.max(0, value);
    } else {
      this.scrollX = Math.max(0, Math.min(value, this.getMaxScrollX()));
    }
    this.invalidate("scroll-area:scroll-x");
    return this;
  }

  scrollTo(x: number, y: number): this {
    this.setScrollX(x);
    return this.setScrollY(y);
  }

  scrollBy(dx: number, dy: number): this {
    this.setScrollX(this.scrollX + dx);
    return this.setScrollY(this.scrollY + dy);
  }

  getScrollPosition(): { x: number; y: number } {
    return { x: this.scrollX, y: this.scrollY };
  }

  override getChildLayoutOffset(): { x: number; y: number } {
    return {
      x: -this.scrollX,
      y: -this.scrollY,
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("scroll-area:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("scroll-area:blur");
      return;
    }

    if (event.type !== "key") {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        if (this.direction === "horizontal" || this.direction === "both") {
          this.scrollBy(-1, 0);
          event.preventDefault();
        }
        break;
      case "ArrowRight":
        if (this.direction === "horizontal" || this.direction === "both") {
          this.scrollBy(1, 0);
          event.preventDefault();
        }
        break;
      case "ArrowDown":
        if (this.direction !== "horizontal") {
          this.scrollBy(0, 1);
          event.preventDefault();
        }
        break;
      case "ArrowUp":
        if (this.direction !== "horizontal") {
          this.scrollBy(0, -1);
          event.preventDefault();
        }
        break;
      case "PageDown":
        if (this.direction !== "horizontal") {
          this.scrollBy(0, Math.max(1, this.layoutState.innerBounds.height - 1));
          event.preventDefault();
        }
        break;
      case "PageUp":
        if (this.direction !== "horizontal") {
          this.scrollBy(0, -Math.max(1, this.layoutState.innerBounds.height - 1));
          event.preventDefault();
        }
        break;
      case "Home":
        this.scrollTo(0, 0);
        event.preventDefault();
        break;
      case "End":
        this.scrollTo(this.getMaxScrollX(), this.getMaxScrollY());
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  override render(context: RenderContext): void {
    if (!this.isVisibleForLayout()) {
      return;
    }

    super.paint(context);

    const children = [...this.children]
      .filter((child) => child !== this.verticalScrollbar && child !== this.horizontalScrollbar)
      .sort((left, right) => (left.layoutProps.zIndex ?? 0) - (right.layoutProps.zIndex ?? 0));

    this.renderScrolledChildren(context, children, this.scrollX, this.scrollY);

    this.syncScrollbars();
    this.verticalScrollbar.render(context);
    this.horizontalScrollbar.render(context);
  }

  private syncScrollbars(): void {
    const bounds = this.layoutState.bounds;
    const inset = this.hasBorder() ? 1 : 0;
    const verticalHeight = Math.max(1, bounds.height - inset * 2);
    const horizontalWidth = Math.max(1, bounds.width - inset * 2);
    const visibleHeight = Math.max(1, this.layoutState.innerBounds.height);
    const visibleWidth = Math.max(1, this.layoutState.innerBounds.width);
    const contentHeight = this.measureContentHeight();
    const contentWidth = this.measureContentWidth();
    const showVertical =
      this.showScrollbars &&
      this.direction !== "horizontal" &&
      this.shouldShowScrollbar(contentHeight, visibleHeight);
    const showHorizontal =
      this.showScrollbars &&
      this.direction !== "vertical" &&
      this.shouldShowScrollbar(contentWidth, visibleWidth);

    this.verticalScrollbar.styleProps.visible = showVertical;
    this.horizontalScrollbar.styleProps.visible = showHorizontal;

    if (showVertical) {
      this.verticalScrollbar.layoutProps = {
        ...this.verticalScrollbar.layoutProps,
        position: "absolute",
        left: Math.max(0, bounds.width - 1),
        top: inset,
        width: 1,
        height: verticalHeight,
        zIndex: 8,
      };
      this.verticalScrollbar.viewportSize = visibleHeight;
      this.verticalScrollbar.contentSize = Math.max(visibleHeight, contentHeight);
      this.verticalScrollbar.offset = Math.max(
        0,
        Math.min(
          this.scrollY,
          this.verticalScrollbar.contentSize - this.verticalScrollbar.viewportSize,
        ),
      );
    }

    if (showHorizontal) {
      this.horizontalScrollbar.layoutProps = {
        ...this.horizontalScrollbar.layoutProps,
        position: "absolute",
        left: inset,
        top: Math.max(0, bounds.height - 1),
        width: horizontalWidth,
        height: 1,
        zIndex: 8,
      };
      this.horizontalScrollbar.viewportSize = visibleWidth;
      this.horizontalScrollbar.contentSize = Math.max(visibleWidth, contentWidth);
      this.horizontalScrollbar.offset = Math.max(
        0,
        Math.min(
          this.scrollX,
          this.horizontalScrollbar.contentSize - this.horizontalScrollbar.viewportSize,
        ),
      );
    }
  }

  protected override measureContentHeight(): number {
    const visibleHeight = Math.max(1, this.layoutState.innerBounds.height);

    return this.children.reduce((height, child) => {
      if (child === this.verticalScrollbar || child === this.horizontalScrollbar) {
        return height;
      }
      const bottom =
        child.layoutState.bounds.y +
        child.layoutState.bounds.height -
        this.layoutState.innerBounds.y;
      return Math.max(height, bottom);
    }, visibleHeight);
  }

  protected measureContentWidth(): number {
    const visibleWidth = Math.max(1, this.layoutState.innerBounds.width);

    return this.children.reduce((width, child) => {
      if (child === this.verticalScrollbar || child === this.horizontalScrollbar) {
        return width;
      }
      const right =
        child.layoutState.bounds.x +
        child.layoutState.bounds.width -
        this.layoutState.innerBounds.x;
      return Math.max(width, right);
    }, visibleWidth);
  }

  protected override getMaxScrollY(): number {
    const visibleHeight = Math.max(1, this.layoutState.innerBounds.height);
    return Math.max(0, this.measureContentHeight() - visibleHeight);
  }

  protected getMaxScrollX(): number {
    const visibleWidth = Math.max(1, this.layoutState.innerBounds.width);
    return Math.max(0, this.measureContentWidth() - visibleWidth);
  }

  private shouldShowScrollbar(contentSize: number, viewportSize: number): boolean {
    if (this.scrollbarVisibility === "always") {
      return true;
    }

    if (contentSize <= viewportSize) {
      return false;
    }

    if (this.scrollbarVisibility === "hover") {
      return this.hovered || this.focused;
    }

    return true;
  }
}
