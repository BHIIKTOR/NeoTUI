import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  measureTextWidth,
  type Rect,
  type Renderable,
  type RenderEvent,
  renderTextBlock,
} from "@neotui/core";
import { isActivationKey } from "./internal/activate";
import {
  canActivate,
  createInteractionState,
  type InteractionState,
} from "./internal/interaction-state";
import {
  type ComponentTheme,
  type ComponentTone,
  defaultComponentTheme,
  resolveToneColor,
} from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface ButtonRenderableOptions {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "compact" | "regular";
  width?: number | "auto" | "fill";
  minWidth?: number;
  disabled?: boolean;
  stretch?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  tone?: ComponentTone;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface ButtonPressDetail {
  type: "press";
  label: string;
  variant: NonNullable<ButtonRenderableOptions["variant"]>;
}

export class ButtonRenderable extends BoxRenderable {
  label: string;
  variant: NonNullable<ButtonRenderableOptions["variant"]>;
  size: NonNullable<ButtonRenderableOptions["size"]>;
  minWidth?: number;
  leftIcon?: string;
  rightIcon?: string;
  tone: ComponentTone;

  private readonly state: InteractionState;

  constructor(options: ButtonRenderableOptions) {
    const layout: BaseLayoutProps = {
      height: 3,
      ...options.layout,
    };

    if (options.width === "fill") {
      layout.width = "100%";
    } else if (typeof options.width === "number") {
      layout.width = options.width;
    }

    if (options.stretch) {
      layout.flexGrow = options.layout?.flexGrow ?? 1;
    }

    super({
      layout,
      style: {
        border: true,
        focusable: options.disabled !== true,
        ...options.style,
      },
    });

    this.label = options.label;
    this.variant = options.variant ?? "secondary";
    this.size = options.size ?? "compact";
    this.minWidth = options.minWidth;
    this.leftIcon = options.leftIcon;
    this.rightIcon = options.rightIcon;
    this.tone = options.tone ?? (this.variant === "danger" ? "danger" : "accent");
    this.state = createInteractionState(options.disabled ?? false);

    this.on("mouseenter", () => {
      this.state.hovered = true;
      this.invalidate("button:hover");
    });
    this.on("mouseleave", () => {
      this.state.hovered = false;
      this.state.pressed = false;
      this.invalidate("button:hover-end");
    });
  }

  getLabel(): string {
    return this.label;
  }

  setLabel(label: string): this {
    this.label = label;
    this.invalidate("button:label");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.state.disabled = disabled;
    this.state.pressed = false;
    this.styleProps.focusable = disabled !== true;
    this.invalidate("button:disabled");
    return this;
  }

  press(): this {
    if (!canActivate(this.state)) {
      return this;
    }

    const pressEvent = createSyntheticEvent({
      type: "press",
      label: this.label,
      variant: this.variant,
    } satisfies ButtonPressDetail);
    pressEvent.target = this;
    pressEvent.currentTarget = this;
    this.emit("press", pressEvent as never);

    const submitEvent = createSyntheticEvent({
      type: "submit",
      value: {
        label: this.label,
        variant: this.variant,
      },
    } as const);
    submitEvent.target = this;
    submitEvent.currentTarget = this;
    this.emit("submit", submitEvent);

    this.invalidate("button:press");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);

    if (typeof this.layoutProps.width === "number" || this.layoutProps.width === "100%") {
      return measured;
    }

    const paddingX = this.size === "regular" ? 2 : 1;
    const borderWidth = this.hasBorder() ? 2 : 0;
    const labelWidth = measureTextWidth(this.renderLabel());
    const minWidth = this.minWidth ?? 0;

    return {
      width: Math.max(measured.width, labelWidth + paddingX * 2 + borderWidth, minWidth),
      height: Math.max(measured.height, 3),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.state.focused = true;
      this.invalidate("button:focus");
      return;
    }

    if (event.type === "blur") {
      this.state.focused = false;
      this.state.pressed = false;
      this.invalidate("button:blur");
      return;
    }

    if (!canActivate(this.state)) {
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      this.state.pressed = true;
      event.preventDefault();
      this.invalidate("button:mouse-down");
      return;
    }

    if (event.type === "mouse" && event.action === "up") {
      const shouldPress = this.state.pressed && this.containsPoint(event.x, event.y);
      this.state.pressed = false;
      if (shouldPress) {
        this.press();
      }
      event.preventDefault();
      this.invalidate("button:mouse-up");
      return;
    }

    if (isActivationKey(event)) {
      this.state.pressed = false;
      this.press();
      event.preventDefault();
    }
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, innerBounds, clipRect } = this.layoutState;
    const style = resolveButtonStyle(this.variant, this.tone, this.state, this.styleProps);

    buffer.fill(
      {
        char: " ",
        fg: style.fg,
        bg: style.bg,
      },
      bounds,
      clipRect,
    );

    if (this.hasBorder()) {
      buffer.drawBorder(
        bounds,
        undefined,
        {
          fg: style.borderFg,
          bg: style.bg,
          titleFg: style.borderFg,
        },
        clipRect,
      );
    }

    const label = this.renderLabel();
    const labelWidth = measureTextWidth(label);
    const labelX = innerBounds.x + Math.max(0, Math.floor((innerBounds.width - labelWidth) / 2));

    renderTextBlock(
      buffer,
      {
        x: labelX,
        y: innerBounds.y,
        width: Math.max(0, innerBounds.width - (labelX - innerBounds.x)),
        height: innerBounds.height,
      },
      label,
      {
        clip: clipRect,
        fg: style.fg,
        bg: style.bg,
        wrapMode: "none",
      },
    );
  }

  private renderLabel(): string {
    const parts = [this.leftIcon, this.label, this.rightIcon].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    return parts.join(" ");
  }
}

function resolveButtonStyle(
  variant: NonNullable<ButtonRenderableOptions["variant"]>,
  tone: ComponentTone,
  state: InteractionState,
  overrides: BaseStyleProps,
  theme: ComponentTheme = defaultComponentTheme,
) {
  const accent = resolveToneColor(tone, theme);
  const borderless = overrides.border === false;

  let fg = theme.fg;
  let bg = theme.surfaceAltBg;
  let borderFg = accent;

  switch (variant) {
    case "primary":
      fg = accent;
      bg = theme.surfaceAltBg;
      borderFg = accent;
      break;
    case "ghost":
      fg = theme.fg;
      bg = theme.surfaceBg;
      borderFg = theme.border;
      break;
    case "danger":
      fg = theme.danger;
      bg = theme.surfaceAltBg;
      borderFg = theme.danger;
      break;
    default:
      fg = theme.fg;
      bg = theme.surfaceAltBg;
      borderFg = accent;
      break;
  }

  if (state.disabled) {
    fg = theme.muted;
    bg = theme.surfaceBg;
    borderFg = theme.border;
  } else if (state.pressed) {
    if (variant === "primary") {
      bg = accent;
      fg = theme.ink;
      borderFg = accent;
    } else if (variant === "danger") {
      bg = theme.danger;
      fg = theme.ink;
      borderFg = theme.danger;
    } else {
      bg = variant === "ghost" ? theme.surfaceAltBg : theme.borderStrong;
      fg = theme.ink;
      borderFg = theme.borderStrong;
    }
  } else if (state.focused) {
    borderFg = variant === "danger" ? theme.danger : theme.borderStrong;
  } else if (state.hovered) {
    if (variant === "primary") {
      bg = theme.surfaceBg;
      borderFg = theme.borderStrong;
    } else if (variant === "danger") {
      bg = theme.surfaceBg;
      borderFg = theme.danger;
    } else {
      borderFg = accent;
    }
  }

  if (borderless && !state.disabled) {
    if (state.pressed) {
      bg = theme.borderStrong;
      fg = theme.ink;
    } else if (state.focused) {
      bg = variant === "ghost" ? theme.surfaceAltBg : bg;
      fg = variant === "ghost" ? theme.title : fg;
    } else if (state.hovered && variant === "ghost") {
      bg = theme.surfaceAltBg;
    }
  }

  return {
    fg: overrides.fg ?? fg,
    bg: overrides.bg ?? bg,
    borderFg: overrides.borderFg ?? borderFg,
  };
}
