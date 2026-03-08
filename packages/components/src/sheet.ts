import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Renderable,
  type RenderEvent,
  resolveDimension,
} from "@neotui/core";
import { ButtonRenderable } from "./button";
import { cycleFocusableNodes, findFirstFocusableNode, isFocusableVisible } from "./internal/focus";
import { ScrimRenderable } from "./internal/scrim";
import { PanelRenderable } from "./panel";
import { defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

export interface SheetRenderableOptions {
  title?: string;
  description?: string;
  side?: "left" | "right" | "top" | "bottom";
  open?: boolean;
  modal?: boolean;
  dismissible?: boolean;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  minWidth?: number;
  minHeight?: number;
  showCloseButton?: boolean;
  restoreFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface SheetCloseDetail {
  reason: "escape" | "backdrop" | "action" | "programmatic";
}

export class SheetRenderable extends BoxRenderable {
  readonly backdrop: ScrimRenderable;
  readonly container: PanelRenderable;
  readonly body: BoxRenderable;
  readonly footer: ToolbarRenderable;

  title?: string;
  description?: string;
  side: NonNullable<SheetRenderableOptions["side"]>;
  modal: boolean;
  dismissible: boolean;
  sheetWidth: number | `${number}%`;
  sheetHeight: number | `${number}%`;
  minWidth: number;
  minHeight: number;
  restoreFocus: boolean;
  showCloseButton: boolean;
  private restoreTarget: Renderable | null = null;
  private unsubscribeResize: (() => void) | null = null;

  constructor(options: SheetRenderableOptions = {}) {
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
    this.description = options.description;
    this.side = options.side ?? "right";
    this.modal = options.modal ?? true;
    this.dismissible = options.dismissible ?? true;
    this.sheetWidth = options.width ?? "42%";
    this.sheetHeight = options.height ?? "38%";
    this.minWidth = options.minWidth ?? 24;
    this.minHeight = options.minHeight ?? 8;
    this.restoreFocus = options.restoreFocus ?? true;
    this.showCloseButton = options.showCloseButton ?? false;

    this.backdrop = new ScrimRenderable({
      style: {
        visible: this.modal,
        bg: "#0f0a08",
        fg: defaultComponentTheme.muted,
      },
    });
    this.container = new PanelRenderable({
      title: this.title,
      tone: "accent",
      contentMode: "grow",
      layout: {
        position: "absolute",
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

    super.add(this.backdrop, this.container);
    this.container.add(this.body);
    this.container.body.add(this.footer);

    if (this.description) {
      this.body.add(
        new BoxRenderable({
          content: this.description,
          layout: { height: 2 },
          style: {
            bg: defaultComponentTheme.surfaceBg,
            fg: defaultComponentTheme.muted,
          },
        }),
      );
    }

    if (this.showCloseButton) {
      const closeButton = new ButtonRenderable({
        label: "Close",
        variant: "ghost",
      });
      closeButton.on("submit", () => {
        this.close({ reason: "action" });
      });
      this.addFooter(closeButton);
    }

    this.backdrop.on("mousedown", (event) => {
      if (this.modal && this.dismissible) {
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

  isOpen(): boolean {
    return this.styleProps.visible === true;
  }

  open(): this {
    if (this.isOpen()) {
      return this;
    }

    this.restoreTarget =
      this.restoreFocus && this.renderer?.focusedNode && this.renderer.focusedNode !== this
        ? this.renderer.focusedNode
        : null;
    this.setVisible(true);
    this.syncContainerLayout();

    const nextFocus = findFirstFocusableNode(this.container, { includeRoot: true }) ?? this;
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

  close(detail: SheetCloseDetail = { reason: "programmatic" }): this {
    if (!this.isOpen()) {
      return this;
    }

    this.setVisible(false);

    if (this.restoreFocus && isFocusableVisible(this.restoreTarget)) {
      this.renderer?.focus(this.restoreTarget);
    }

    const closeEvent = createSyntheticEvent({
      type: "cancel",
      reason: detail.reason,
    } as const);
    closeEvent.target = this;
    closeEvent.currentTarget = this;
    this.emit("close", closeEvent as never);

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

  toggle(): this {
    return this.isOpen() ? this.close() : this.open();
  }

  setSide(side: NonNullable<SheetRenderableOptions["side"]>): this {
    this.side = side;
    this.syncContainerLayout();
    this.invalidate("sheet:side");
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (!this.isOpen() || event.type !== "key") {
      return;
    }

    if (event.key === "Escape" && this.dismissible) {
      this.close({ reason: "escape" });
      event.preventDefault();
      return;
    }

    if (this.modal && event.key === "Tab" && this.renderer) {
      cycleFocusableNodes(this.renderer, this.container, event.modifiers.shift, {
        includeRoot: true,
      });
      event.preventDefault();
    }
  }

  protected override paint(): void {}

  protected override onMount(): void {
    this.syncContainerLayout();
    this.unsubscribeResize =
      this.renderer?.subscribeToResize(() => {
        if (this.isOpen()) {
          this.syncContainerLayout();
        }
      }) ?? null;
  }

  protected override onUnmount(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;
  }

  private syncContainerLayout(): void {
    const viewport = this.resolveViewportSize();
    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const width = Math.max(
      this.minWidth,
      resolveDimension(this.sheetWidth, viewportWidth) ??
        (this.side === "left" || this.side === "right"
          ? Math.floor(viewportWidth * 0.42)
          : viewportWidth),
    );
    const height = Math.max(
      this.minHeight,
      resolveDimension(this.sheetHeight, viewportHeight) ??
        (this.side === "top" || this.side === "bottom"
          ? Math.floor(viewportHeight * 0.38)
          : viewportHeight),
    );

    const layout: Partial<BaseLayoutProps> =
      this.side === "left"
        ? { left: 0, top: 0, width: Math.min(width, viewportWidth), height: viewportHeight }
        : this.side === "right"
          ? {
              left: Math.max(0, viewportWidth - Math.min(width, viewportWidth)),
              top: 0,
              width: Math.min(width, viewportWidth),
              height: viewportHeight,
            }
          : this.side === "top"
            ? { left: 0, top: 0, width: viewportWidth, height: Math.min(height, viewportHeight) }
            : {
                left: 0,
                top: Math.max(0, viewportHeight - Math.min(height, viewportHeight)),
                width: viewportWidth,
                height: Math.min(height, viewportHeight),
              };

    this.backdrop.setVisible(this.modal);
    this.container.updateLayout(layout);
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
