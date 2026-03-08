import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  type Rect,
  type Renderable,
} from "@neotui/core";
import { ScrollAreaRenderable, type ScrollAreaRenderableOptions } from "./scroll-area";
import { type ComponentTone, defaultComponentTheme, resolveToneColor } from "./theme";

export type PanelContentMode = "fit" | "grow" | "scroll";

export interface PanelRenderableOptions {
  title?: string;
  subtitle?: string;
  tone?: ComponentTone;
  content?: string;
  contentMode?: PanelContentMode;
  scrollDirection?: ScrollAreaRenderableOptions["direction"];
  showScrollbars?: ScrollAreaRenderableOptions["showScrollbars"];
  scrollbarVisibility?: ScrollAreaRenderableOptions["scrollbarVisibility"];
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class PanelRenderable extends BoxRenderable {
  readonly body: BoxRenderable | ScrollAreaRenderable;
  readonly contentBox: BoxRenderable;
  title?: string;
  subtitle?: string;
  tone: ComponentTone;
  contentMode: PanelContentMode;

  constructor(options: PanelRenderableOptions = {}) {
    const tone = options.tone ?? "default";
    const borderFg = resolveToneColor(tone, defaultComponentTheme);
    super({
      layout: {
        padding: 1,
        flexDirection: "column",
        ...options.layout,
      },
      style: {
        border: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        borderFg,
        titleFg: defaultComponentTheme.title,
        title: formatPanelTitle(options.title, options.subtitle),
        ...options.style,
      },
    });
    this.title = options.title;
    this.subtitle = options.subtitle;
    this.tone = tone;
    this.contentMode = options.contentMode ?? "fit";
    const bodyLayout = {
      flexDirection: options.layout?.flexDirection ?? "column",
      gap: options.layout?.gap ?? 0,
      alignItems: options.layout?.alignItems ?? "stretch",
      justifyContent: options.layout?.justifyContent ?? "start",
      flexGrow: 1,
    } satisfies BaseLayoutProps;
    this.body =
      this.contentMode === "scroll"
        ? new ScrollAreaRenderable({
            direction:
              this.contentMode === "scroll"
                ? (options.scrollDirection ?? "vertical")
                : (options.scrollDirection ?? "both"),
            showScrollbars: options.showScrollbars ?? true,
            scrollbarVisibility: options.scrollbarVisibility ?? "auto",
            layout: bodyLayout,
            style: {
              border: false,
              focusable: true,
              bg: this.styleProps.bg,
              fg: this.styleProps.fg,
            },
          })
        : new BoxRenderable({
            layout: bodyLayout,
            style: {
              bg: this.styleProps.bg,
              fg: this.styleProps.fg,
            },
          });
    this.contentBox = new BoxRenderable({
      content: options.content ?? "",
      style: {
        visible: Boolean(options.content),
        bg: this.styleProps.bg,
        fg: this.styleProps.fg,
      },
    });

    super.add(this.body);
    this.body.add(this.contentBox);
  }

  override add(...children: Renderable[]): this {
    this.body.add(...children);
    return this;
  }

  override remove(child: Renderable): this {
    if (child === this.body || child === this.contentBox) {
      return this;
    }

    this.body.remove(child);
    return this;
  }

  override setContent(content: string): this {
    this.contentBox.setContent(content);
    this.contentBox.setVisible(content.length > 0);
    this.invalidate("panel:content");
    return this;
  }

  setTitle(title?: string): this {
    this.title = title;
    this.syncChrome();
    return this;
  }

  setSubtitle(subtitle?: string): this {
    this.subtitle = subtitle;
    this.syncChrome();
    return this;
  }

  setTone(tone: ComponentTone): this {
    this.tone = tone;
    this.syncChrome();
    return this;
  }

  scrollTo(x: number, y: number): this {
    if (this.body instanceof ScrollAreaRenderable) {
      this.body.scrollTo(x, y);
    }
    return this;
  }

  setScrollY(y: number): this {
    if (this.body instanceof ScrollAreaRenderable) {
      this.body.setScrollY(y);
    }
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);

    if (this.contentMode !== "grow") {
      return measured;
    }

    const chromeWidth = measured.width;
    const chromeHeight = measured.height;
    const bodyAvailableWidth = Math.max(1, parentBounds.width - (this.hasBorder() ? 2 : 0) - 2);
    const bodyAvailableHeight = Math.max(1, parentBounds.height - (this.hasBorder() ? 2 : 0) - 2);
    const bodySize = measureChildStack(
      this.body.children,
      {
        x: 0,
        y: 0,
        width: bodyAvailableWidth,
        height: bodyAvailableHeight,
      },
      this.body.layoutProps.flexDirection ?? "column",
      this.body.layoutProps.gap ?? 0,
    );

    return {
      width: Math.max(measured.width, bodySize.width + chromeWidth),
      height: Math.max(measured.height, bodySize.height + chromeHeight),
    };
  }

  private syncChrome(): void {
    this.styleProps.title = formatPanelTitle(this.title, this.subtitle);
    this.styleProps.borderFg = resolveToneColor(this.tone, defaultComponentTheme);
    this.invalidate("panel:chrome");
  }
}

function formatPanelTitle(title?: string, subtitle?: string): string | undefined {
  if (!title && !subtitle) {
    return undefined;
  }

  if (!title) {
    return subtitle;
  }

  if (!subtitle) {
    return title;
  }

  return `${title} | ${subtitle}`;
}

function measureChildStack(
  children: readonly Renderable[],
  parentBounds: Rect,
  direction: BaseLayoutProps["flexDirection"],
  gap: number,
): { width: number; height: number } {
  const visibleChildren = children.filter((child) => child.isVisibleForLayout());
  if (visibleChildren.length === 0) {
    return { width: 0, height: 0 };
  }

  if (direction === "row") {
    const width =
      visibleChildren.reduce(
        (total, child) => total + child.measurePreferredSize(parentBounds).width,
        0,
      ) +
      gap * Math.max(0, visibleChildren.length - 1);
    const height = visibleChildren.reduce(
      (max, child) => Math.max(max, child.measurePreferredSize(parentBounds).height),
      0,
    );
    return { width, height };
  }

  const width = visibleChildren.reduce(
    (max, child) => Math.max(max, child.measurePreferredSize(parentBounds).width),
    0,
  );
  const height =
    visibleChildren.reduce(
      (total, child) => total + child.measurePreferredSize(parentBounds).height,
      0,
    ) +
    gap * Math.max(0, visibleChildren.length - 1);
  return { width, height };
}
