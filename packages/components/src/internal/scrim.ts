import { type BaseLayoutProps, type BaseStyleProps, Renderable } from "@neotui/core";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface ScrimRenderableOptions {
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ScrimRenderable extends Renderable {
  constructor(options: ScrimRenderableOptions = {}) {
    super(
      "scrim",
      {
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        ...options.layout,
      },
      {
        visible: true,
        bg: "#120d0a",
        fg: "#c4b39d",
        ...options.style,
      },
    );
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;

    for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
        if (
          x < clipRect.x ||
          y < clipRect.y ||
          x >= clipRect.x + clipRect.width ||
          y >= clipRect.y + clipRect.height
        ) {
          continue;
        }

        const current = buffer.getCell(x, y) ?? { char: " " };
        buffer.setCell(x, y, {
          char: current.char,
          href: current.href,
          title: current.title,
          fg: current.char === " " ? current.fg : (this.styleProps.fg ?? current.fg),
          bg: this.styleProps.bg ?? current.bg,
        });
      }
    }
  }
}
