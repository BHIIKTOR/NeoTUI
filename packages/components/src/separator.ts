import {
  type BaseLayoutProps,
  type BaseStyleProps,
  Renderable,
  renderTextBlock,
} from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface SeparatorRenderableOptions {
  orientation?: "horizontal" | "vertical";
  inset?: boolean;
  label?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SeparatorRenderable extends Renderable {
  orientation: NonNullable<SeparatorRenderableOptions["orientation"]>;
  inset: boolean;
  label?: string;

  constructor(options: SeparatorRenderableOptions = {}) {
    super("separator", options.layout, {
      fg: defaultComponentTheme.border,
      bg: defaultComponentTheme.surfaceBg,
      ...options.style,
    });
    this.orientation = options.orientation ?? "horizontal";
    this.inset = options.inset ?? false;
    this.label = options.label;
  }

  protected override defaultWidth(): number {
    return this.orientation === "vertical" ? 1 : super.defaultWidth();
  }

  protected override defaultHeight(): number {
    return this.orientation === "horizontal" ? 1 : super.defaultHeight();
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    const fg = this.styleProps.fg ?? defaultComponentTheme.border;
    const bg = this.styleProps.bg;

    if (this.orientation === "vertical") {
      for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
        buffer.setCell(bounds.x, y, {
          char: "│",
          fg,
          bg,
        });
      }
      return;
    }

    const startX = bounds.x + (this.inset ? 1 : 0);
    const endX = bounds.x + bounds.width - (this.inset ? 1 : 0);
    for (let x = startX; x < endX; x += 1) {
      buffer.setCell(x, bounds.y, {
        char: "─",
        fg,
        bg,
      });
    }

    if (this.label) {
      renderTextBlock(
        buffer,
        {
          x: Math.min(startX + 1, bounds.x + bounds.width - 1),
          y: bounds.y,
          width: Math.max(0, bounds.width - 2),
          height: 1,
        },
        ` ${this.label} `,
        {
          clip: clipRect,
          fg,
          bg,
          wrapMode: "none",
        },
      );
    }
  }
}
