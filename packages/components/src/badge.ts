import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  measureTextWidth,
  type Rect,
  type Renderable,
  renderTextBlock,
} from "@neotui/core";
import {
  type ComponentTheme,
  type ComponentTone,
  defaultComponentTheme,
  resolveToneColor,
} from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface BadgeRenderableOptions {
  label: string;
  tone?: ComponentTone;
  emphasis?: "subtle" | "solid";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class BadgeRenderable extends BoxRenderable {
  label: string;
  tone: ComponentTone;
  emphasis: NonNullable<BadgeRenderableOptions["emphasis"]>;

  constructor(options: BadgeRenderableOptions) {
    super({
      layout: {
        height: 1,
        ...options.layout,
      },
      style: {
        ...options.style,
      },
    });
    this.label = options.label;
    this.tone = options.tone ?? "default";
    this.emphasis = options.emphasis ?? "subtle";
  }

  setLabel(label: string): this {
    this.label = label;
    this.invalidate("badge:label");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);

    if (typeof this.layoutProps.width === "number" || this.layoutProps.width === "100%") {
      return measured;
    }

    return {
      width: Math.max(measured.width, measureTextWidth(this.label) + 2),
      height: Math.max(measured.height, 1),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds } = this.layoutState;
    const style = resolveBadgeStyle(this.tone, this.emphasis, this.styleProps);

    buffer.fill(
      {
        char: " ",
        fg: style.fg,
        bg: style.bg,
      },
      bounds,
    );

    renderTextBlock(buffer, bounds, ` ${this.label} `, {
      clip: this.layoutState.clipRect,
      fg: style.fg,
      bg: style.bg,
      wrapMode: "none",
    });
  }
}

function resolveBadgeStyle(
  tone: ComponentTone,
  emphasis: NonNullable<BadgeRenderableOptions["emphasis"]>,
  overrides: BaseStyleProps,
  theme: ComponentTheme = defaultComponentTheme,
) {
  const accent = resolveToneColor(tone, theme);
  const fg = emphasis === "solid" ? theme.ink : accent;
  const bg = emphasis === "solid" ? accent : theme.surfaceAltBg;

  return {
    fg: overrides.fg ?? fg,
    bg: overrides.bg ?? bg,
  };
}
