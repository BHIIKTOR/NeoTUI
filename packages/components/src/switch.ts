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

export interface SwitchRenderableOptions {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SwitchRenderable extends Renderable {
  checked: boolean;
  label?: string;

  private readonly state: InteractionState;

  constructor(options: SwitchRenderableOptions = {}) {
    super(
      "switch",
      { height: 1, ...options.layout },
      {
        focusable: options.disabled !== true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    );
    this.checked = options.checked ?? false;
    this.label = options.label;
    this.state = createInteractionState(options.disabled ?? false);

    this.on("mouseenter", () => {
      this.state.hovered = true;
      this.invalidate("switch:hover");
    });
    this.on("mouseleave", () => {
      this.state.hovered = false;
      this.state.pressed = false;
      this.invalidate("switch:hover-end");
    });
  }

  isChecked(): boolean {
    return this.checked;
  }

  setChecked(checked: boolean): this {
    const previousValue = this.checked;
    this.checked = checked;
    this.emitChange(previousValue);
    this.invalidate("switch:checked");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.state.disabled = disabled;
    this.styleProps.focusable = disabled !== true;
    this.state.pressed = false;
    this.invalidate("switch:disabled");
    return this;
  }

  toggle(): this {
    if (!canActivate(this.state)) {
      return this;
    }

    const previousValue = this.checked;
    this.checked = !this.checked;
    this.emitChange(previousValue);
    this.emitSubmit();
    this.invalidate("switch:toggle");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const width = 6 + (this.label ? 1 + measureTextWidth(this.label) : 0);
    return {
      width: Math.max(measured.width, width),
      height: Math.max(measured.height, 1),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.state.focused = true;
      this.invalidate("switch:focus");
      return;
    }

    if (event.type === "blur") {
      this.state.focused = false;
      this.state.pressed = false;
      this.invalidate("switch:blur");
      return;
    }

    if (!canActivate(this.state)) {
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      this.state.pressed = true;
      event.preventDefault();
      this.invalidate("switch:mouse-down");
      return;
    }

    if (event.type === "mouse" && event.action === "up" && event.button === "left") {
      const shouldToggle = this.state.pressed && this.containsPoint(event.x, event.y);
      this.state.pressed = false;
      if (shouldToggle) {
        this.toggle();
      }
      event.preventDefault();
      this.invalidate("switch:mouse-up");
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
    const trackBg = this.state.disabled
      ? defaultComponentTheme.surfaceAltBg
      : this.checked
        ? defaultComponentTheme.accent
        : defaultComponentTheme.border;
    const trackFg = this.checked ? defaultComponentTheme.ink : defaultComponentTheme.ink;
    const track = this.checked ? " ON  " : " OFF ";

    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: rowBg,
      },
      bounds,
    );

    renderTextBlock(
      buffer,
      {
        x: bounds.x,
        y: bounds.y,
        width: Math.min(bounds.width, 5),
        height: 1,
      },
      track,
      {
        clip: clipRect,
        fg: this.state.disabled ? defaultComponentTheme.muted : trackFg,
        bg: trackBg,
        wrapMode: "none",
      },
    );

    if (this.label) {
      renderTextBlock(
        buffer,
        {
          x: bounds.x + 6,
          y: bounds.y,
          width: Math.max(0, bounds.width - 6),
          height: 1,
        },
        this.label,
        {
          clip: clipRect,
          fg: this.state.disabled ? defaultComponentTheme.muted : defaultComponentTheme.fg,
          bg: rowBg,
          wrapMode: "none",
        },
      );
    }
  }

  private emitChange(previousValue: boolean): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.checked,
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: this.checked,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }
}
