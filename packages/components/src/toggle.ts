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

export interface ToggleRenderableOptions {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToggleRenderable extends Renderable {
  label: string;
  pressed: boolean;

  private readonly state: InteractionState;

  constructor(options: ToggleRenderableOptions) {
    super(
      "toggle",
      { height: 1, ...options.layout },
      {
        focusable: options.disabled !== true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    );
    this.label = options.label;
    this.pressed = options.pressed ?? false;
    this.state = createInteractionState(options.disabled ?? false);

    this.on("mouseenter", () => {
      this.state.hovered = true;
      this.invalidate("toggle:hover");
    });
    this.on("mouseleave", () => {
      this.state.hovered = false;
      this.state.pressed = false;
      this.invalidate("toggle:hover-end");
    });
  }

  isPressed(): boolean {
    return this.pressed;
  }

  setPressed(pressed: boolean): this {
    const previousValue = this.pressed;
    this.pressed = pressed;
    this.emitChange(previousValue);
    this.invalidate("toggle:pressed");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.state.disabled = disabled;
    this.state.pressed = false;
    this.styleProps.focusable = disabled !== true;
    this.invalidate("toggle:disabled");
    return this;
  }

  toggle(): this {
    if (!canActivate(this.state)) {
      return this;
    }

    const previousValue = this.pressed;
    this.pressed = !this.pressed;
    this.emitChange(previousValue);
    this.emitSubmit();
    this.invalidate("toggle:toggle");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const width = measureTextWidth(`[ ${this.label} ]`);
    return {
      width: Math.max(measured.width, width),
      height: Math.max(measured.height, 1),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.state.focused = true;
      this.invalidate("toggle:focus");
      return;
    }

    if (event.type === "blur") {
      this.state.focused = false;
      this.state.pressed = false;
      this.invalidate("toggle:blur");
      return;
    }

    if (!canActivate(this.state)) {
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      this.state.pressed = true;
      event.preventDefault();
      this.invalidate("toggle:mouse-down");
      return;
    }

    if (event.type === "mouse" && event.action === "up" && event.button === "left") {
      const shouldToggle = this.state.pressed && this.containsPoint(event.x, event.y);
      this.state.pressed = false;
      if (shouldToggle) {
        this.toggle();
      }
      event.preventDefault();
      this.invalidate("toggle:mouse-up");
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
    const fg = this.state.disabled
      ? defaultComponentTheme.muted
      : this.pressed
        ? defaultComponentTheme.ink
        : defaultComponentTheme.fg;
    const bg = this.state.disabled
      ? defaultComponentTheme.surfaceBg
      : this.pressed
        ? defaultComponentTheme.borderStrong
        : this.state.hovered
          ? "#31271f"
          : this.state.focused
            ? "#3a2d22"
            : defaultComponentTheme.surfaceBg;

    buffer.fill(
      {
        char: " ",
        fg,
        bg,
      },
      bounds,
    );

    renderTextBlock(buffer, bounds, `[ ${this.label} ]`, {
      clip: clipRect,
      fg,
      bg,
      wrapMode: "none",
    });
  }

  private emitChange(previousValue: boolean): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.pressed,
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: this.pressed,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }
}
