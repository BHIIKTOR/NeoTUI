import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  EditingBuffer,
  measureTextWidth,
  type RenderEvent,
  renderTextBlock,
  splitGraphemes,
} from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<BoxRenderable["render"]>[0];

export interface InputControlRenderableOptions {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  type?: "text" | "search" | "password";
  width?: number | "fill";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class InputControlRenderable extends BoxRenderable {
  readonly buffer: EditingBuffer;

  placeholder: string;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
  inputType: NonNullable<InputControlRenderableOptions["type"]>;
  focused = false;

  constructor(options: InputControlRenderableOptions = {}) {
    const layout: BaseLayoutProps = {
      height: 3,
      ...options.layout,
    };
    if (options.width === "fill") {
      layout.width = "100%";
    } else if (typeof options.width === "number") {
      layout.width = options.width;
    }

    super({
      layout,
      style: {
        border: true,
        focusable: options.disabled !== true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceAltBg,
        borderFg: resolveInputBorderColor(options.invalid ?? false, false),
        titleFg: defaultComponentTheme.borderStrong,
        ...options.style,
      },
    });

    this.buffer = new EditingBuffer(options.value ?? "");
    this.placeholder = options.placeholder ?? "";
    this.disabled = options.disabled ?? false;
    this.readOnly = options.readOnly ?? false;
    this.invalid = options.invalid ?? false;
    this.inputType = options.type ?? "text";
  }

  getValue(): string {
    return this.buffer.getText();
  }

  setValue(value: string): this {
    const previousValue = this.getValue();
    this.buffer.setText(value);
    this.emitChange(previousValue);
    this.invalidate("input-control:value");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.styleProps.focusable = disabled !== true;
    this.syncChrome();
    this.invalidate("input-control:disabled");
    return this;
  }

  setReadOnly(readOnly: boolean): this {
    this.readOnly = readOnly;
    this.syncChrome();
    this.invalidate("input-control:readonly");
    return this;
  }

  setInvalid(invalid: boolean): this {
    this.invalid = invalid;
    this.syncChrome();
    this.invalidate("input-control:invalid");
    return this;
  }

  setType(type: NonNullable<InputControlRenderableOptions["type"]>): this {
    this.inputType = type;
    this.invalidate("input-control:type");
    return this;
  }

  focus(): this {
    this.renderer?.focus(this);
    return this;
  }

  blur(): this {
    if (this.renderer?.focusedNode === this) {
      this.renderer.focus(null);
    }
    return this;
  }

  clear(): this {
    return this.setValue("");
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.syncChrome();
      this.invalidate("input-control:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.syncChrome();
      this.invalidate("input-control:blur");
      return;
    }

    if (this.disabled) {
      return;
    }

    if (event.type === "paste") {
      if (this.readOnly) {
        event.preventDefault();
        return;
      }
      this.insertValue(event.text);
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const previousValue = this.getValue();

    switch (event.key) {
      case "ArrowLeft":
        this.buffer.moveLeft(event.modifiers.shift);
        break;
      case "ArrowRight":
        this.buffer.moveRight(event.modifiers.shift);
        break;
      case "Home":
        this.buffer.moveHome(event.modifiers.shift);
        break;
      case "End":
        this.buffer.moveEnd(event.modifiers.shift);
        break;
      case "Backspace":
        if (this.readOnly) {
          event.preventDefault();
          return;
        }
        this.buffer.backspace();
        break;
      case "Delete":
        if (this.readOnly) {
          event.preventDefault();
          return;
        }
        this.buffer.deleteForward();
        break;
      case "Enter":
        this.emitSubmit(this.getValue());
        event.preventDefault();
        return;
      case "Tab":
        return;
      default:
        if (event.text && !event.modifiers.ctrl && !event.modifiers.meta) {
          if (this.readOnly) {
            event.preventDefault();
            return;
          }
          this.insertValue(event.text);
          event.preventDefault();
        }
        return;
    }

    if (previousValue !== this.getValue()) {
      this.emitChange(previousValue);
    }

    this.invalidate("input-control:key");
  }

  override measurePreferredSize(
    parentBounds: Parameters<BoxRenderable["measurePreferredSize"]>[0],
  ) {
    const measured = super.measurePreferredSize(parentBounds);
    const displayWidth = Math.max(
      measureTextWidth(this.placeholder),
      measureTextWidth(this.getValue()),
      10,
    );
    return {
      width: Math.max(measured.width, displayWidth + 4),
      height: Math.max(measured.height, 3),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, innerBounds, clipRect } = this.layoutState;
    const fillChar = this.styleProps.backgroundChar ?? " ";
    const displayValue = this.renderDisplayValue();
    const fg = this.disabled
      ? defaultComponentTheme.muted
      : this.focused
        ? (this.styleProps.titleFg ?? this.styleProps.borderFg ?? this.styleProps.fg)
        : this.getValue().length === 0
          ? defaultComponentTheme.muted
          : this.styleProps.fg;

    buffer.fill(
      {
        char: fillChar,
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
      clipRect,
    );

    if (this.hasBorder()) {
      buffer.drawBorder(
        bounds,
        this.styleProps.title,
        {
          fg: this.styleProps.borderFg ?? this.styleProps.fg,
          bg: this.styleProps.bg,
          titleFg: this.styleProps.titleFg ?? this.styleProps.borderFg ?? this.styleProps.fg,
        },
        clipRect,
      );
    }

    renderTextBlock(buffer, innerBounds, displayValue, {
      clip: clipRect,
      fg,
      bg: this.styleProps.bg,
      wrapMode: "none",
    });
  }

  private insertValue(value: string): void {
    const previousValue = this.getValue();
    this.buffer.insert(value);
    if (previousValue !== this.getValue()) {
      this.emitChange(previousValue);
      this.invalidate("input-control:insert");
    }
  }

  private renderDisplayValue(): string {
    const value = this.getValue();
    const source =
      this.inputType === "password" && value.length > 0
        ? "•".repeat(splitGraphemes(value).length)
        : value;

    if (!this.focused && source.length === 0) {
      return this.placeholder;
    }

    const graphemes = splitGraphemes(source);
    if (this.focused) {
      graphemes.splice(this.buffer.getCursorIndex(), 0, "|");
    }
    return graphemes.join("");
  }

  private emitChange(previousValue: string): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.getValue(),
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(value: string): void {
    const event = createSyntheticEvent({
      type: "submit",
      value,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }

  private syncChrome(): void {
    this.styleProps.borderFg = resolveInputBorderColor(this.invalid, this.focused);
    this.styleProps.titleFg = this.disabled
      ? defaultComponentTheme.muted
      : defaultComponentTheme.borderStrong;
  }
}

function resolveInputBorderColor(invalid: boolean, focused: boolean): string {
  if (invalid) {
    return defaultComponentTheme.danger;
  }

  return focused ? defaultComponentTheme.borderStrong : defaultComponentTheme.border;
}
