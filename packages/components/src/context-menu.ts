import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Renderable,
} from "@neotui/core";
import { isNodeWithin } from "./internal/focus";
import {
  type DropdownMenuItem,
  MenuPopupRenderable,
  measureMenuContentWidth,
  resolveMenuPlacement,
} from "./internal/menu-popup";

export type { DropdownMenuItem } from "./internal/menu-popup";

export interface ContextMenuRenderableOptions {
  items: DropdownMenuItem[];
  open?: boolean;
  anchorPoint?: { x: number; y: number };
  restoreFocus?: boolean;
  closeOnSelect?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ContextMenuRenderable extends BoxRenderable {
  items: DropdownMenuItem[];
  restoreFocus: boolean;
  closeOnSelect: boolean;

  private readonly popup: MenuPopupRenderable;
  private openState = false;
  private anchorPoint: { x: number; y: number } | null;
  private restoreTarget: Renderable | null = null;
  private unsubscribeGlobal: (() => void) | null = null;
  private unsubscribeResize: (() => void) | null = null;

  constructor(options: ContextMenuRenderableOptions) {
    super({
      layout: options.layout,
      style: {
        ...options.style,
      },
    });
    this.items = options.items;
    this.restoreFocus = options.restoreFocus ?? true;
    this.closeOnSelect = options.closeOnSelect ?? true;
    this.anchorPoint = options.anchorPoint ?? null;
    this.popup = new MenuPopupRenderable({
      items: options.items,
      style: {
        ...options.style,
      },
    });

    this.popup.on("select", (event) => {
      const value = "value" in event ? event.value : undefined;
      const selectEvent = createSyntheticEvent({
        type: "submit",
        value,
      } as const);
      selectEvent.target = this;
      selectEvent.currentTarget = this;
      this.emit("select", selectEvent);
      if (this.closeOnSelect) {
        this.close("select");
      }
    });

    this.popup.on("cancel", (event) => {
      const reason =
        "reason" in event && typeof event.reason === "string" ? event.reason : "programmatic";
      this.close(reason);
    });

    if (options.open && options.anchorPoint) {
      this.openState = true;
    }
  }

  override handleEvent(event: Parameters<BoxRenderable["handleEvent"]>[0]): void {
    if (event.type === "mouse" && event.action === "down" && event.button === "right") {
      this.openAt(event.x, event.y);
      event.preventDefault();
      return;
    }

    if (
      event.type === "key" &&
      (event.key === "Enter" || event.key === " " || event.key === "Space")
    ) {
      const { bounds } = this.layoutState;
      this.openAt(bounds.x, bounds.y);
      event.preventDefault();
    }
  }

  isOpen(): boolean {
    return this.openState;
  }

  openAt(x: number, y: number): this {
    if (!this.renderer) {
      this.anchorPoint = { x, y };
      this.openState = true;
      return this;
    }

    this.openState = true;
    this.anchorPoint = { x, y };
    this.restoreTarget = this.renderer.focusedNode;
    this.popup.setItems(this.items);
    this.positionPopup();

    if (!this.popup.parent) {
      this.renderer.root.add(this.popup);
    }

    this.renderer.focus(this.popup);
    this.unsubscribeGlobal?.();
    this.unsubscribeResize?.();
    this.unsubscribeGlobal = this.renderer.subscribe((event) => {
      if (!this.openState) {
        return;
      }

      if (event.type === "key" && event.key === "Escape") {
        this.close("escape");
        event.preventDefault();
        return;
      }

      if (
        event.type === "mouse" &&
        event.action === "down" &&
        !isNodeWithin(event.target, this.popup) &&
        !isNodeWithin(event.target, this)
      ) {
        this.close("outside");
      }
    });
    this.unsubscribeResize = this.renderer.subscribeToResize(() => {
      if (this.openState) {
        this.positionPopup();
      }
    });

    const event = createSyntheticEvent({
      type: "change",
      value: { open: true, x, y },
      previousValue: undefined,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("openChange", event);
    this.invalidate("context-menu:open");
    return this;
  }

  close(reason = "programmatic"): this {
    if (!this.openState) {
      return this;
    }

    this.openState = false;
    this.unsubscribeGlobal?.();
    this.unsubscribeGlobal = null;
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;
    if (this.popup.parent) {
      this.popup.parent.remove(this.popup);
    }

    if (this.restoreFocus && this.renderer && this.restoreTarget?.isFocusable()) {
      this.renderer.focus(this.restoreTarget);
    }

    if (reason !== "select") {
      const event = createSyntheticEvent({
        type: "cancel",
        reason,
      } as const);
      event.target = this;
      event.currentTarget = this;
      this.emit("cancel", event as never);
    }
    this.invalidate("context-menu:close");
    return this;
  }

  setItems(items: DropdownMenuItem[]): this {
    this.items = items;
    this.popup.setItems(items);
    if (this.openState) {
      this.positionPopup();
    }
    this.invalidate("context-menu:items");
    return this;
  }

  protected override onMount(): void {
    if (this.openState && this.anchorPoint) {
      this.openAt(this.anchorPoint.x, this.anchorPoint.y);
    }
  }

  protected override onUnmount(): void {
    this.close("unmount");
  }

  protected override paint(): void {}

  private positionPopup(): void {
    if (!this.renderer || !this.anchorPoint) {
      return;
    }

    const rootBounds = this.renderer.root.layoutState.innerBounds;
    const width = measureMenuContentWidth(this.items);
    const height = Math.max(3, this.items.length + 2);
    const placement = resolveMenuPlacement({
      anchor: {
        x: this.anchorPoint.x - rootBounds.x,
        y: this.anchorPoint.y - rootBounds.y,
        width: 1,
        height: 1,
      },
      viewport: { x: 0, y: 0, width: rootBounds.width, height: rootBounds.height },
      menuWidth: width,
      menuHeight: height,
      side: "bottom",
      align: "start",
    });
    this.popup.updateLayout({
      position: "absolute",
      left: placement.left,
      top: placement.top,
      width: placement.width,
      height: placement.height,
      zIndex: 235,
    });
  }
}
