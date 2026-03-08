import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Renderable,
  type RenderEvent,
  resolveDimension,
} from "@neotui/core";
import { cycleFocusableNodes, findFirstFocusableNode, isFocusableVisible } from "./internal/focus";
import { ScrimRenderable } from "./internal/scrim";
import { PanelRenderable } from "./panel";
import { type ComponentTone, defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

export interface DialogRenderableOptions {
  title?: string;
  variant?: "default" | "info" | "danger";
  open?: boolean;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  initialFocus?: Renderable | null;
  restoreFocus?: Renderable | null;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface DialogCloseDetail {
  reason: "escape" | "backdrop" | "action" | "programmatic" | "submit";
}

export class DialogRenderable extends BoxRenderable {
  readonly backdrop: ScrimRenderable;
  readonly card: PanelRenderable;
  readonly body: BoxRenderable;
  readonly footer: ToolbarRenderable;

  title?: string;
  variant: NonNullable<DialogRenderableOptions["variant"]>;
  dialogWidth: number | `${number}%`;
  dialogHeight: number | `${number}%` | "auto";
  closeOnEscape: boolean;
  closeOnBackdrop: boolean;
  initialFocusTarget: Renderable | null;
  restoreFocusTarget: Renderable | null;
  private capturedRestoreFocus: Renderable | null = null;
  private unsubscribeResize: (() => void) | null = null;

  constructor(options: DialogRenderableOptions = {}) {
    super({
      layout: {
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        overflow: "visible",
        ...options.layout,
      },
      style: {
        visible: options.open ?? false,
        focusable: true,
        fg: defaultComponentTheme.fg,
        bg: "#000000",
        ...options.style,
      },
    });
    this.title = options.title;
    this.variant = options.variant ?? "default";
    this.dialogWidth = options.width ?? "60%";
    this.dialogHeight = options.height ?? "auto";
    this.closeOnEscape = options.closeOnEscape ?? true;
    this.closeOnBackdrop = options.closeOnBackdrop ?? true;
    this.initialFocusTarget = options.initialFocus ?? null;
    this.restoreFocusTarget = options.restoreFocus ?? null;

    this.backdrop = new ScrimRenderable({
      style: {
        bg: "#0f0a08",
        fg: defaultComponentTheme.muted,
      },
    });

    this.card = new PanelRenderable({
      title: this.title,
      tone: this.resolveTone(),
      contentMode: "grow",
      layout: {
        position: "absolute",
        width: 40,
        height: 10,
        zIndex: 1,
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
      },
    });
    this.body = new BoxRenderable({
      layout: {
        flexDirection: "column",
        gap: 1,
        flexGrow: 1,
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.fg,
      },
    });
    this.footer = new ToolbarRenderable({
      layout: {
        height: 0,
        width: "100%",
        alignItems: "start",
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.fg,
      },
    });

    super.add(this.backdrop, this.card);
    this.card.add(this.body);
    this.card.body.add(this.footer);

    this.backdrop.on("mousedown", (event) => {
      if (this.closeOnBackdrop) {
        this.close({ reason: "backdrop" });
        event.preventDefault();
      }
    });
  }

  override add(...children: Renderable[]): this {
    this.body.add(...children);
    return this;
  }

  addFooter(...children: Renderable[]): this {
    this.footer.updateLayout({ height: 3, width: "100%" });
    this.footer.add(...children);
    return this;
  }

  setTitle(title?: string): this {
    this.title = title;
    this.card.setTitle(title);
    return this;
  }

  isOpen(): boolean {
    return this.styleProps.visible === true;
  }

  open(): this {
    if (this.isOpen()) {
      return this;
    }

    this.capturedRestoreFocus =
      this.restoreFocusTarget ??
      (this.renderer?.focusedNode && this.renderer.focusedNode !== this
        ? this.renderer.focusedNode
        : null);
    this.setVisible(true);
    this.syncCardLayout();

    const nextFocus = isFocusableVisible(this.initialFocusTarget)
      ? this.initialFocusTarget
      : (findFirstFocusableNode(this.card, { includeRoot: true }) ?? this);
    this.renderer?.focus(nextFocus);

    const event = createSyntheticEvent({
      type: "change",
      value: { open: true },
      previousValue: { open: false },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("openChange", event);
    return this;
  }

  close(detail: DialogCloseDetail = { reason: "programmatic" }): this {
    if (!this.isOpen()) {
      return this;
    }

    this.setVisible(false);

    const closeEvent = createSyntheticEvent({
      type: "cancel",
      reason: detail.reason,
    } as const);
    closeEvent.target = this;
    closeEvent.currentTarget = this;
    this.emit("close", closeEvent as never);

    const restore = isFocusableVisible(this.restoreFocusTarget)
      ? this.restoreFocusTarget
      : isFocusableVisible(this.capturedRestoreFocus)
        ? this.capturedRestoreFocus
        : null;
    if (restore) {
      this.renderer?.focus(restore);
    }

    const event = createSyntheticEvent({
      type: "change",
      value: { open: false, reason: detail.reason },
      previousValue: { open: true },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("openChange", event);
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (!this.isOpen() || event.type !== "key") {
      return;
    }

    if (event.key === "Escape" && this.closeOnEscape) {
      this.close({ reason: "escape" });
      event.preventDefault();
      return;
    }

    if (event.key === "Tab") {
      if (this.renderer) {
        cycleFocusableNodes(this.renderer, this.card, event.modifiers.shift, { includeRoot: true });
      }
      event.preventDefault();
    }
  }

  protected override paint(): void {}

  protected override onMount(): void {
    this.syncCardLayout();
    this.unsubscribeResize =
      this.renderer?.subscribeToResize(() => {
        if (this.isOpen()) {
          this.syncCardLayout();
        }
      }) ?? null;
  }

  protected override onUnmount(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;
  }

  private resolveTone(): ComponentTone {
    switch (this.variant) {
      case "danger":
        return "danger";
      case "info":
        return "info";
      default:
        return "accent";
    }
  }

  private syncCardLayout(): void {
    const viewport = this.resolveViewportSize();
    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const width = clampDialogSize(
      this.dialogWidth,
      viewportWidth,
      24,
      Math.max(24, viewportWidth - 4),
    );
    const height =
      this.dialogHeight === "auto"
        ? Math.max(
            8,
            Math.min(
              viewportHeight - 2,
              this.card.measurePreferredSize({
                x: 0,
                y: 0,
                width: Math.max(24, viewportWidth - 4),
                height: Math.max(8, viewportHeight - 2),
              }).height,
            ),
          )
        : clampDialogSize(this.dialogHeight, viewportHeight, 8, Math.max(8, viewportHeight - 2));
    const left = Math.max(0, Math.floor((viewportWidth - width) / 2));
    const top = Math.max(0, Math.floor((viewportHeight - height) / 2));

    this.card.updateLayout({
      left,
      top,
      width,
      height,
    });
  }

  private resolveViewportSize(): { width: number; height: number } {
    const parentBounds = this.parent?.layoutState.innerBounds;
    if (parentBounds && parentBounds.width > 0 && parentBounds.height > 0) {
      return {
        width: parentBounds.width,
        height: parentBounds.height,
      };
    }

    if (this.layoutState.bounds.width > 0 && this.layoutState.bounds.height > 0) {
      return {
        width: this.layoutState.bounds.width,
        height: this.layoutState.bounds.height,
      };
    }

    return {
      width: this.renderer?.width ?? 0,
      height: this.renderer?.height ?? 0,
    };
  }
}

function clampDialogSize(
  value: number | `${number}%`,
  available: number,
  min: number,
  max: number,
): number {
  const resolved = typeof value === "number" ? value : (resolveDimension(value, available) ?? min);
  return Math.max(min, Math.min(max, resolved));
}
