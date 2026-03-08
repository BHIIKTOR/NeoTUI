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

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupRenderableOptions {
  options: RadioOption[];
  value?: string;
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class RadioGroupRenderable extends Renderable {
  options: RadioOption[];
  disabled: boolean;
  orientation: NonNullable<RadioGroupRenderableOptions["orientation"]>;
  focused = false;
  focusIndex: number;
  private selectedValue?: string;

  constructor(options: RadioGroupRenderableOptions) {
    super("radio-group", options.layout, {
      focusable: options.disabled !== true,
      fg: defaultComponentTheme.fg,
      bg: defaultComponentTheme.surfaceBg,
      ...options.style,
    });
    this.options = options.options;
    this.disabled = options.disabled ?? false;
    this.orientation = options.orientation ?? "vertical";
    this.selectedValue = options.value;
    this.focusIndex = this.resolveInitialFocusIndex(options.value);
  }

  getValue(): string | undefined {
    return this.selectedValue;
  }

  setValue(value: string): this {
    const nextIndex = this.options.findIndex((option) => option.value === value);
    if (nextIndex === -1) {
      return this;
    }

    const previousValue = this.selectedValue;
    this.selectedValue = value;
    this.focusIndex = nextIndex;
    this.emitChange(previousValue);
    this.invalidate("radio-group:value");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.styleProps.focusable = disabled !== true;
    this.invalidate("radio-group:disabled");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    if (this.orientation === "horizontal") {
      const width = this.options.reduce((total, option, index) => {
        const gap = index === 0 ? 0 : 2;
        return total + gap + measureOptionWidth(option);
      }, 0);
      return {
        width: Math.max(measured.width, width),
        height: Math.max(measured.height, 1),
      };
    }

    const width = this.options.reduce(
      (max, option) => Math.max(max, measureOptionWidth(option)),
      0,
    );
    return {
      width: Math.max(measured.width, width),
      height: Math.max(measured.height, Math.max(1, this.options.length)),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("radio-group:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("radio-group:blur");
      return;
    }

    if (this.disabled) {
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      const index = this.optionIndexAt(event.x, event.y);
      if (index === null || this.options[index]?.disabled) {
        return;
      }

      this.focusIndex = index;
      this.selectedValue = this.options[index]?.value;
      this.emitChange(undefined);
      this.emitSubmit();
      this.invalidate("radio-group:mouse");
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    if (
      event.key === "ArrowRight" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowUp"
    ) {
      const delta =
        event.key === "ArrowRight" || event.key === "ArrowDown" ? (1 as const) : (-1 as const);
      this.moveFocus(delta);
      this.selectedValue = this.options[this.focusIndex]?.value;
      this.emitChange(undefined);
      this.invalidate("radio-group:move");
      event.preventDefault();
      return;
    }

    if (event.key === "Home") {
      this.focusIndex = this.findNextEnabled(0, 1);
      this.selectedValue = this.options[this.focusIndex]?.value;
      this.emitChange(undefined);
      this.invalidate("radio-group:home");
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      this.focusIndex = this.findNextEnabled(this.options.length - 1, -1);
      this.selectedValue = this.options[this.focusIndex]?.value;
      this.emitChange(undefined);
      this.invalidate("radio-group:end");
      event.preventDefault();
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "Space") {
      this.selectedValue = this.options[this.focusIndex]?.value;
      this.emitSubmit();
      this.invalidate("radio-group:submit");
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

    if (this.orientation === "horizontal") {
      let cursor = bounds.x;
      for (let index = 0; index < this.options.length; index += 1) {
        const option = this.options[index];
        if (!option) {
          continue;
        }

        const text = renderOption(option, option.value === this.selectedValue);
        const colors = this.resolveOptionColors(index, option);
        renderTextBlock(
          buffer,
          {
            x: cursor,
            y: bounds.y,
            width: Math.max(0, bounds.x + bounds.width - cursor),
            height: 1,
          },
          text,
          {
            clip: clipRect,
            fg: colors.fg,
            bg: colors.bg,
            wrapMode: "none",
          },
        );
        cursor += measureTextWidth(text) + 2;
      }
      return;
    }

    for (let index = 0; index < this.options.length && index < bounds.height; index += 1) {
      const option = this.options[index];
      if (!option) {
        continue;
      }

      const colors = this.resolveOptionColors(index, option);
      renderTextBlock(
        buffer,
        {
          x: bounds.x,
          y: bounds.y + index,
          width: bounds.width,
          height: 1,
        },
        renderOption(option, option.value === this.selectedValue),
        {
          clip: clipRect,
          fg: colors.fg,
          bg: colors.bg,
          wrapMode: "none",
        },
      );
    }
  }

  private resolveInitialFocusIndex(value?: string): number {
    const selectedIndex =
      typeof value === "string"
        ? this.options.findIndex((option) => option.value === value && option.disabled !== true)
        : -1;
    if (selectedIndex !== -1) {
      return selectedIndex;
    }
    return this.findNextEnabled(0, 1);
  }

  private moveFocus(delta: 1 | -1): void {
    this.focusIndex = this.findNextEnabled(this.focusIndex + delta, delta);
  }

  private findNextEnabled(start: number, delta: 1 | -1): number {
    if (this.options.length === 0) {
      return 0;
    }

    let index = Math.max(0, Math.min(start, this.options.length - 1));
    for (let attempts = 0; attempts < this.options.length; attempts += 1) {
      const option = this.options[index];
      if (option && option.disabled !== true) {
        return index;
      }
      index = (index + delta + this.options.length) % this.options.length;
    }
    return 0;
  }

  private optionIndexAt(x: number, y: number): number | null {
    const { bounds } = this.layoutState;
    if (
      x < bounds.x ||
      y < bounds.y ||
      x >= bounds.x + bounds.width ||
      y >= bounds.y + bounds.height
    ) {
      return null;
    }

    if (this.orientation === "vertical") {
      const index = y - bounds.y;
      return index >= 0 && index < this.options.length ? index : null;
    }

    let cursor = bounds.x;
    for (let index = 0; index < this.options.length; index += 1) {
      const option = this.options[index];
      if (!option) {
        continue;
      }
      const width = measureOptionWidth(option);
      if (x >= cursor && x < cursor + width) {
        return index;
      }
      cursor += width + 2;
    }

    return null;
  }

  private resolveOptionColors(index: number, option: RadioOption) {
    if (this.disabled || option.disabled) {
      return {
        fg: defaultComponentTheme.muted,
        bg: this.styleProps.bg,
      };
    }

    if (this.focused && index === this.focusIndex) {
      return {
        fg:
          option.value === this.selectedValue
            ? defaultComponentTheme.ink
            : defaultComponentTheme.fg,
        bg:
          option.value === this.selectedValue
            ? defaultComponentTheme.borderStrong
            : defaultComponentTheme.surfaceAltBg,
      };
    }

    if (option.value === this.selectedValue) {
      return {
        fg: defaultComponentTheme.accent,
        bg: this.styleProps.bg,
      };
    }

    return {
      fg: this.styleProps.fg ?? defaultComponentTheme.fg,
      bg: this.styleProps.bg,
    };
  }

  private emitChange(previousValue?: string): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.selectedValue,
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: this.selectedValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }
}

function renderOption(option: RadioOption, selected: boolean): string {
  const marker = selected ? "(x)" : "( )";
  if (!option.description) {
    return `${marker} ${option.label}`;
  }
  return `${marker} ${option.label} - ${option.description}`;
}

function measureOptionWidth(option: RadioOption): number {
  return measureTextWidth(renderOption(option, false));
}
