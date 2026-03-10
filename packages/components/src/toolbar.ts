import { type BaseLayoutProps, type BaseStyleProps, BoxRenderable, type Rect } from "@neotui/core";

export interface ToolbarRenderableOptions {
  orientation?: "horizontal" | "vertical";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToolbarRenderable extends BoxRenderable {
  orientation: NonNullable<ToolbarRenderableOptions["orientation"]>;

  constructor(options: ToolbarRenderableOptions = {}) {
    const orientation = options.orientation ?? "horizontal";
    super({
      layout: {
        flexDirection: orientation === "horizontal" ? "row" : "column",
        gap: 1,
        alignItems: "center",
        ...options.layout,
      },
      style: {
        ...options.style,
      },
    });
    this.orientation = orientation;
  }

  setOrientation(orientation: NonNullable<ToolbarRenderableOptions["orientation"]>): this {
    this.orientation = orientation;
    this.updateLayout({
      flexDirection: orientation === "horizontal" ? "row" : "column",
    });
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);

    if (this.children.length === 0) {
      return measured;
    }

    const childSizes = this.children.map((child) => child.measurePreferredSize(parentBounds));
    const gap = this.layoutProps.gap ?? 0;

    if (this.orientation === "horizontal") {
      const width =
        childSizes.reduce((total, size) => total + size.width, 0) +
        gap * Math.max(0, childSizes.length - 1);
      const height = childSizes.reduce((max, size) => Math.max(max, size.height), 0);
      return {
        width: Math.max(measured.width, width),
        height: Math.max(measured.height, height),
      };
    }

    const width = childSizes.reduce((max, size) => Math.max(max, size.width), 0);
    const height =
      childSizes.reduce((total, size) => total + size.height, 0) +
      gap * Math.max(0, childSizes.length - 1);
    return {
      width: Math.max(measured.width, width),
      height: Math.max(measured.height, height),
    };
  }

  protected override paint(context: Parameters<BoxRenderable["render"]>[0]): void {
    if (
      this.hasBorder() ||
      typeof this.styleProps.bg !== "undefined" ||
      typeof this.styleProps.backgroundChar !== "undefined"
    ) {
      super.paint(context);
    }
  }
}
