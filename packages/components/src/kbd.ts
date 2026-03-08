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

export interface KbdRenderableOptions {
  label: string;
  compact?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class KbdRenderable extends Renderable {
  label: string;
  compact: boolean;

  constructor(options: KbdRenderableOptions) {
    super("kbd", options.layout, {
      fg: defaultComponentTheme.ink,
      bg: defaultComponentTheme.borderStrong,
      ...options.style,
    });
    this.label = options.label;
    this.compact = options.compact ?? false;
  }

  setLabel(label: string): this {
    this.label = label;
    this.invalidate("kbd:label");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const content = this.renderLabel();
    return {
      width: Math.max(measured.width, measureTextWidth(content)),
      height: Math.max(measured.height, 1),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    const content = this.renderLabel();

    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
    );

    renderTextBlock(buffer, bounds, content, {
      clip: clipRect,
      fg: this.styleProps.fg,
      bg: this.styleProps.bg,
      wrapMode: "none",
    });
  }

  private renderLabel(): string {
    if (this.compact) {
      return `[${this.label}]`;
    }

    return ` ${this.label} `;
  }
}
