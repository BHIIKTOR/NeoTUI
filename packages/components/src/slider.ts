import {
  type BaseLayoutProps,
  type BaseStyleProps,
  createSyntheticEvent,
  measureTextWidth,
  type Rect,
  Renderable,
  type RenderEvent,
  renderTextBlock,
} from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface SliderRenderableOptions {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  disabled?: boolean;
  showValue?: boolean;
  orientation?: "horizontal" | "vertical";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SliderRenderable extends Renderable {
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  showValue: boolean;
  orientation: NonNullable<SliderRenderableOptions["orientation"]>;
  focused = false;

  constructor(options: SliderRenderableOptions = {}) {
    const orientation = options.orientation ?? "horizontal";
    super(
      "slider",
      {
        width: orientation === "horizontal" ? 18 : 3,
        height: orientation === "horizontal" ? 1 : 8,
        ...options.layout,
      },
      {
        focusable: options.disabled !== true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    );
    this.min = options.min ?? 0;
    this.max = options.max ?? 100;
    this.step = Math.max(1, options.step ?? 1);
    this.value = this.clamp(options.value ?? this.min);
    this.disabled = options.disabled ?? false;
    this.showValue = options.showValue ?? true;
    this.orientation = orientation;

    this.on("dragmove", (event) => {
      const dragEvent = event as Extract<RenderEvent, { type: "mouse" }>;
      this.setValueFromPoint(dragEvent.x, dragEvent.y, true);
      dragEvent.preventDefault();
    });
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): this {
    const previousValue = this.value;
    const nextValue = this.clamp(value);
    if (nextValue === previousValue) {
      return this;
    }

    this.value = nextValue;
    this.emitChange(previousValue);
    this.invalidate("slider:value");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.styleProps.focusable = disabled !== true;
    this.invalidate("slider:disabled");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    if (this.orientation === "vertical") {
      const width = this.showValue ? Math.max(4, measureTextWidth(this.renderValue())) : 3;
      return {
        width: Math.max(measured.width, width),
        height: Math.max(measured.height, 8),
      };
    }

    const width = Math.max(12, measured.width, this.showValue ? 16 : 12);
    return {
      width,
      height: Math.max(measured.height, 1),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("slider:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("slider:blur");
      return;
    }

    if (this.disabled) {
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      this.setValueFromPoint(event.x, event.y, true);
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    if (event.key === "Home") {
      this.setValue(this.min);
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      this.setValue(this.max);
      event.preventDefault();
      return;
    }

    const increase =
      event.key === "ArrowRight" || (this.orientation === "vertical" && event.key === "ArrowUp");
    const decrease =
      event.key === "ArrowLeft" || (this.orientation === "vertical" && event.key === "ArrowDown");

    if (increase) {
      this.setValue(this.value + this.step);
      this.emitSubmit();
      event.preventDefault();
      return;
    }

    if (decrease) {
      this.setValue(this.value - this.step);
      this.emitSubmit();
      event.preventDefault();
    }
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
    );

    if (this.orientation === "vertical") {
      this.paintVertical(buffer, bounds, clipRect);
      return;
    }

    this.paintHorizontal(buffer, bounds, clipRect);
  }

  private paintHorizontal(buffer: RenderContext["buffer"], bounds: Rect, clipRect: Rect): void {
    const valueText = this.showValue ? ` ${this.renderValue()}` : "";
    const valueWidth = this.showValue ? measureTextWidth(valueText) : 0;
    const trackWidth = Math.max(1, bounds.width - valueWidth);
    const thumbIndex = Math.min(
      trackWidth - 1,
      Math.max(0, Math.round(this.ratio() * (trackWidth - 1))),
    );
    let track = "";

    for (let index = 0; index < trackWidth; index += 1) {
      if (index === thumbIndex) {
        track += "|";
      } else if (index < thumbIndex) {
        track += "=";
      } else {
        track += "-";
      }
    }

    renderTextBlock(buffer, { x: bounds.x, y: bounds.y, width: trackWidth, height: 1 }, track, {
      clip: clipRect,
      fg: this.resolveTrackFg(),
      bg: this.resolveTrackBg(),
      wrapMode: "none",
    });

    if (this.showValue) {
      renderTextBlock(
        buffer,
        {
          x: bounds.x + trackWidth,
          y: bounds.y,
          width: valueWidth,
          height: 1,
        },
        valueText,
        {
          clip: clipRect,
          fg: this.disabled ? defaultComponentTheme.muted : defaultComponentTheme.fg,
          bg: this.styleProps.bg,
          wrapMode: "none",
        },
      );
    }
  }

  private paintVertical(buffer: RenderContext["buffer"], bounds: Rect, clipRect: Rect): void {
    const trackHeight = Math.max(1, bounds.height - (this.showValue ? 1 : 0));
    const thumbIndex = Math.min(
      trackHeight - 1,
      Math.max(0, Math.round((1 - this.ratio()) * (trackHeight - 1))),
    );

    for (let offset = 0; offset < trackHeight; offset += 1) {
      const y = bounds.y + offset;
      const char = offset === thumbIndex ? "|" : offset > thumbIndex ? "#" : ":";
      renderTextBlock(
        buffer,
        {
          x: bounds.x,
          y,
          width: 1,
          height: 1,
        },
        char,
        {
          clip: clipRect,
          fg: this.resolveTrackFg(),
          bg: this.resolveTrackBg(),
          wrapMode: "none",
        },
      );
    }

    if (this.showValue) {
      renderTextBlock(
        buffer,
        {
          x: bounds.x + 2,
          y: bounds.y + trackHeight - 1,
          width: Math.max(0, bounds.width - 2),
          height: 1,
        },
        this.renderValue(),
        {
          clip: clipRect,
          fg: this.disabled ? defaultComponentTheme.muted : defaultComponentTheme.fg,
          bg: this.styleProps.bg,
          wrapMode: "none",
        },
      );
    }
  }

  private ratio(): number {
    const range = this.max - this.min;
    if (range <= 0) {
      return 0;
    }
    return (this.value - this.min) / range;
  }

  private clamp(value: number): number {
    const clamped = Math.max(this.min, Math.min(this.max, value));
    const stepped = Math.round((clamped - this.min) / this.step) * this.step + this.min;
    return Math.max(this.min, Math.min(this.max, stepped));
  }

  private setValueFromPoint(x: number, y: number, emitSubmit = false): void {
    const previousValue = this.value;
    const nextValue =
      this.orientation === "vertical"
        ? this.valueFromVerticalPoint(y)
        : this.valueFromHorizontalPoint(x);
    this.setValue(nextValue);
    if (emitSubmit && previousValue !== this.value) {
      this.emitSubmit();
    }
  }

  private valueFromHorizontalPoint(x: number): number {
    const { bounds } = this.layoutState;
    const trackWidth = Math.max(
      1,
      bounds.width - (this.showValue ? measureTextWidth(` ${this.renderValue()}`) : 0),
    );
    const local = Math.max(0, Math.min(trackWidth - 1, x - bounds.x));
    const ratio = trackWidth <= 1 ? 0 : local / (trackWidth - 1);
    return this.min + ratio * (this.max - this.min);
  }

  private valueFromVerticalPoint(y: number): number {
    const { bounds } = this.layoutState;
    const trackHeight = Math.max(1, bounds.height - (this.showValue ? 1 : 0));
    const local = Math.max(0, Math.min(trackHeight - 1, y - bounds.y));
    const ratio = trackHeight <= 1 ? 0 : 1 - local / (trackHeight - 1);
    return this.min + ratio * (this.max - this.min);
  }

  private renderValue(): string {
    return `${this.value}`;
  }

  private resolveTrackFg(): string {
    if (this.disabled) {
      return defaultComponentTheme.muted;
    }

    if (this.focused) {
      return defaultComponentTheme.borderStrong;
    }

    return defaultComponentTheme.accent;
  }

  private resolveTrackBg(): string {
    return this.focused
      ? defaultComponentTheme.surfaceAltBg
      : (this.styleProps.bg ?? defaultComponentTheme.surfaceBg);
  }

  private emitChange(previousValue: number): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.value,
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: this.value,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }
}
