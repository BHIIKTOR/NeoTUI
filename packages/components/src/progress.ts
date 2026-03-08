import {
  type BaseLayoutProps,
  type BaseStyleProps,
  createSyntheticEvent,
  measureTextWidth,
  type Rect,
  Renderable,
  renderTextBlock,
} from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface ProgressRenderableOptions {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ProgressRenderable extends Renderable {
  value: number;
  max: number;
  label?: string;
  showPercentage: boolean;
  variant: NonNullable<ProgressRenderableOptions["variant"]>;

  constructor(options: ProgressRenderableOptions) {
    super(
      "progress",
      { height: options.label || options.showPercentage ? 2 : 1, ...options.layout },
      {
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    );
    this.max = Math.max(1, options.max ?? 100);
    this.value = clampProgressValue(options.value, this.max);
    this.label = options.label;
    this.showPercentage = options.showPercentage ?? true;
    this.variant = options.variant ?? "default";
  }

  setValue(value: number): this {
    const previousValue = this.value;
    const next = clampProgressValue(value, this.max);
    if (next === previousValue) {
      return this;
    }

    this.value = next;
    const event = createSyntheticEvent({
      type: "change",
      value: next,
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
    this.invalidate("progress:value");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const labelWidth = this.label ? measureTextWidth(this.label) : 0;
    const percentageWidth = this.showPercentage ? measureTextWidth(this.renderPercentage()) + 1 : 0;
    return {
      width: Math.max(measured.width, Math.max(12, labelWidth + percentageWidth, 12)),
      height: Math.max(measured.height, this.label || this.showPercentage ? 2 : 1),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    const barY = this.label || this.showPercentage ? bounds.y + 1 : bounds.y;
    const fillWidth = Math.round(this.ratio() * Math.max(0, bounds.width));
    const barFg = progressColor(this.variant);

    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
    );

    if (this.label || this.showPercentage) {
      const percentage = this.showPercentage ? this.renderPercentage() : "";
      const percentageWidth = this.showPercentage ? measureTextWidth(percentage) : 0;
      const labelWidth = Math.max(
        0,
        bounds.width - percentageWidth - (percentageWidth > 0 ? 1 : 0),
      );

      if (this.label) {
        renderTextBlock(
          buffer,
          {
            x: bounds.x,
            y: bounds.y,
            width: labelWidth,
            height: 1,
          },
          this.label,
          {
            clip: clipRect,
            fg: this.styleProps.fg,
            bg: this.styleProps.bg,
            wrapMode: "none",
          },
        );
      }

      if (percentageWidth > 0) {
        renderTextBlock(
          buffer,
          {
            x: bounds.x + bounds.width - percentageWidth,
            y: bounds.y,
            width: percentageWidth,
            height: 1,
          },
          percentage,
          {
            clip: clipRect,
            fg: defaultComponentTheme.muted,
            bg: this.styleProps.bg,
            wrapMode: "none",
          },
        );
      }
    }

    for (let offset = 0; offset < bounds.width; offset += 1) {
      buffer.setCell(bounds.x + offset, barY, {
        char: offset < fillWidth ? "#" : "-",
        fg: offset < fillWidth ? barFg : defaultComponentTheme.border,
        bg: this.styleProps.bg,
      });
    }
  }

  private ratio(): number {
    return Math.max(0, Math.min(1, this.value / this.max));
  }

  private renderPercentage(): string {
    return `${Math.round(this.ratio() * 100)}%`;
  }
}

function clampProgressValue(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function progressColor(variant: NonNullable<ProgressRenderableOptions["variant"]>): string {
  switch (variant) {
    case "success":
      return defaultComponentTheme.success;
    case "warning":
      return defaultComponentTheme.title;
    case "danger":
      return defaultComponentTheme.danger;
    default:
      return defaultComponentTheme.accent;
  }
}
