import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  normalizeSpacing,
  type Rect,
  TextRenderable,
} from "@neotui/core";
import { ButtonRenderable } from "./button";
import { defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

export interface ToastRenderableOptions {
  title?: string;
  message: string;
  kind?: "info" | "success" | "warning" | "danger";
  durationMs?: number;
  dismissible?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToastRenderable extends BoxRenderable {
  readonly titleNode: TextRenderable;
  readonly messageNode: TextRenderable;
  readonly actionBar: ToolbarRenderable;

  title?: string;
  message: string;
  kind: NonNullable<ToastRenderableOptions["kind"]>;
  durationMs?: number;
  dismissible: boolean;

  private dismissButton: ButtonRenderable | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: ToastRenderableOptions) {
    super({
      layout: {
        flexDirection: "column",
        gap: 1,
        padding: 1,
        width: 32,
        ...options.layout,
      },
      style: {
        border: true,
        visible: false,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        borderFg: toastColor(options.kind ?? "info"),
        titleFg: defaultComponentTheme.title,
        ...options.style,
      },
    });
    this.title = options.title;
    this.message = options.message;
    this.kind = options.kind ?? "info";
    this.durationMs = options.durationMs;
    this.dismissible = options.dismissible ?? false;

    this.titleNode = new TextRenderable({
      content: this.title ?? "",
      layout: { width: "100%", height: this.title ? 1 : 0 },
      style: { fg: defaultComponentTheme.title },
    });
    this.messageNode = new TextRenderable({
      content: this.message,
      wrapMode: "word",
      layout: { width: "100%", height: 2 },
      style: { fg: defaultComponentTheme.fg },
    });
    this.actionBar = new ToolbarRenderable({
      layout: { height: this.dismissible ? 3 : 0, alignItems: "start" },
    });

    super.add(this.titleNode, this.messageNode, this.actionBar);
    this.syncDismiss();
  }

  show(): this {
    this.setVisible(true);
    this.scheduleHide();
    return this;
  }

  hide(): this {
    this.clearHideTimer();
    this.setVisible(false);
    const event = createSyntheticEvent({
      type: "cancel",
      reason: "hide",
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("close", event as never);
    return this;
  }

  isVisible(): boolean {
    return this.styleProps.visible === true;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const titleSize = this.titleNode.measurePreferredSize(parentBounds);
    const messageSize = this.messageNode.measurePreferredSize(parentBounds);
    const actionSize = this.actionBar.measurePreferredSize(parentBounds);
    const visibleSizes = [titleSize, messageSize, actionSize].filter((size) => size.height > 0);
    const gap = this.layoutProps.gap ?? 0;
    const padding = normalizeSpacing(this.layoutProps.padding);
    const chromeWidth = padding.left + padding.right + (this.hasBorder() ? 2 : 0);
    const chromeHeight = padding.top + padding.bottom + (this.hasBorder() ? 2 : 0);
    const contentWidth = Math.max(titleSize.width, messageSize.width, actionSize.width, 24);

    return {
      width: Math.max(measured.width, contentWidth + chromeWidth),
      height: Math.max(
        measured.height,
        titleSize.height +
          messageSize.height +
          actionSize.height +
          gap * Math.max(0, visibleSizes.length - 1) +
          chromeHeight,
      ),
    };
  }

  protected override onUnmount(): void {
    this.clearHideTimer();
  }

  private syncDismiss(): void {
    for (const child of [...this.actionBar.children]) {
      this.actionBar.remove(child);
    }
    this.dismissButton = null;

    if (!this.dismissible) {
      this.actionBar.updateLayout({ height: 0 });
      return;
    }

    this.actionBar.updateLayout({ height: 3 });
    this.dismissButton = new ButtonRenderable({
      label: "Dismiss",
      variant: "ghost",
    });
    this.dismissButton.on("submit", () => {
      this.hide();
    });
    this.actionBar.add(this.dismissButton);
  }

  private scheduleHide(): void {
    this.clearHideTimer();
    if (!this.isVisible() || typeof this.durationMs !== "number" || this.durationMs <= 0) {
      return;
    }

    this.hideTimer = setTimeout(() => {
      this.hide();
    }, this.durationMs);
    this.hideTimer.unref?.();
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}

function toastColor(kind: NonNullable<ToastRenderableOptions["kind"]>): string {
  switch (kind) {
    case "success":
      return defaultComponentTheme.success;
    case "warning":
      return defaultComponentTheme.title;
    case "danger":
      return defaultComponentTheme.danger;
    default:
      return defaultComponentTheme.info;
  }
}
