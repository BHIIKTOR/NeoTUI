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
import { isActivationKey } from "./internal/activate";
import {
  canActivate,
  createInteractionState,
  type InteractionState,
} from "./internal/interaction-state";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface CheckboxRenderableOptions {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface CheckboxStateSnapshot {
  checked: boolean;
  indeterminate: boolean;
}

export class CheckboxRenderable extends Renderable {
  checked: boolean;
  indeterminate: boolean;
  label?: string;

  private readonly state: InteractionState;

  constructor(options: CheckboxRenderableOptions = {}) {
    super(
      "checkbox",
      { height: 1, ...options.layout },
      {
        focusable: options.disabled !== true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    );
    this.checked = options.checked ?? false;
    this.indeterminate = options.indeterminate ?? false;
    this.label = options.label;
    this.state = createInteractionState(options.disabled ?? false);

    this.on("mouseenter", () => {
      this.state.hovered = true;
      this.invalidate("checkbox:hover");
    });
    this.on("mouseleave", () => {
      this.state.hovered = false;
      this.state.pressed = false;
      this.invalidate("checkbox:hover-end");
    });
  }

  isChecked(): boolean {
    return this.checked;
  }

  setChecked(checked: boolean): this {
    const previous = this.snapshot();
    this.checked = checked;
    if (checked) {
      this.indeterminate = false;
    }
    this.emitChange(previous);
    this.invalidate("checkbox:checked");
    return this;
  }

  setIndeterminate(indeterminate: boolean): this {
    const previous = this.snapshot();
    this.indeterminate = indeterminate;
    if (indeterminate) {
      this.checked = false;
    }
    this.emitChange(previous);
    this.invalidate("checkbox:indeterminate");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.state.disabled = disabled;
    this.state.pressed = false;
    this.styleProps.focusable = disabled !== true;
    this.invalidate("checkbox:disabled");
    return this;
  }

  toggle(): this {
    if (!canActivate(this.state)) {
      return this;
    }

    const previous = this.snapshot();
    if (this.indeterminate) {
      this.indeterminate = false;
      this.checked = true;
    } else {
      this.checked = !this.checked;
    }

    this.emitChange(previous);
    this.emitSubmit();
    this.invalidate("checkbox:toggle");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const width = 3 + (this.label ? 1 + measureTextWidth(this.label) : 0);
    return {
      width: Math.max(measured.width, width),
      height: Math.max(measured.height, 1),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.state.focused = true;
      this.invalidate("checkbox:focus");
      return;
    }

    if (event.type === "blur") {
      this.state.focused = false;
      this.state.pressed = false;
      this.invalidate("checkbox:blur");
      return;
    }

    if (!canActivate(this.state)) {
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      this.state.pressed = true;
      event.preventDefault();
      this.invalidate("checkbox:mouse-down");
      return;
    }

    if (event.type === "mouse" && event.action === "up" && event.button === "left") {
      const shouldToggle = this.state.pressed && this.containsPoint(event.x, event.y);
      this.state.pressed = false;
      if (shouldToggle) {
        this.toggle();
      }
      event.preventDefault();
      this.invalidate("checkbox:mouse-up");
      return;
    }

    if (isActivationKey(event)) {
      this.state.pressed = false;
      this.toggle();
      event.preventDefault();
    }
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    const rowBg = this.state.focused
      ? defaultComponentTheme.surfaceAltBg
      : (this.styleProps.bg ?? defaultComponentTheme.surfaceBg);

    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: rowBg,
      },
      bounds,
    );

    const marker = this.indeterminate ? "[-]" : this.checked ? "[x]" : "[ ]";
    renderTextBlock(buffer, bounds, marker, {
      clip: clipRect,
      fg: this.resolveMarkerFg(),
      bg: rowBg,
      wrapMode: "none",
    });

    if (this.label) {
      renderTextBlock(
        buffer,
        {
          x: bounds.x + 4,
          y: bounds.y,
          width: Math.max(0, bounds.width - 4),
          height: 1,
        },
        this.label,
        {
          clip: clipRect,
          fg: this.resolveLabelFg(),
          bg: rowBg,
          wrapMode: "none",
        },
      );
    }
  }

  private snapshot(): CheckboxStateSnapshot {
    return {
      checked: this.checked,
      indeterminate: this.indeterminate,
    };
  }

  private resolveMarkerFg(): string {
    if (this.state.disabled) {
      return defaultComponentTheme.muted;
    }

    if (this.checked || this.indeterminate) {
      return defaultComponentTheme.accent;
    }

    if (this.state.focused) {
      return defaultComponentTheme.borderStrong;
    }

    return defaultComponentTheme.border;
  }

  private resolveLabelFg(): string {
    if (this.state.disabled) {
      return defaultComponentTheme.muted;
    }

    return this.styleProps.fg ?? defaultComponentTheme.fg;
  }

  private emitChange(previousValue: CheckboxStateSnapshot): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.snapshot(),
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: this.snapshot(),
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }
}
