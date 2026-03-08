import type { BaseLayoutProps, BaseStyleProps, Rect, RenderEvent, SubmitEvent } from "@neotui/core";
import { createSyntheticEvent, Renderable } from "@neotui/core";
import { ButtonRenderable } from "./button";
import { isNodeWithin } from "./internal/focus";
import {
  countMenuRows,
  type DropdownMenuItem,
  MenuPopupRenderable,
  measureMenuContentWidth,
  resolveMenuPlacement,
} from "./internal/menu-popup";
import { defaultComponentTheme } from "./theme";

export type { DropdownMenuItem } from "./internal/menu-popup";

export interface DropdownMenuRenderableOptions {
  triggerLabel?: string;
  items: DropdownMenuItem[];
  open?: boolean;
  side?: "bottom" | "top" | "left" | "right";
  align?: "start" | "center" | "end";
  width?: number | "trigger" | "content";
  minWidth?: number;
  maxWidth?: number;
  closeOnSelect?: boolean;
  disabled?: boolean;
  restoreFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DropdownMenuRenderable extends Renderable {
  readonly trigger: ButtonRenderable;
  readonly popup: MenuPopupRenderable;

  items: DropdownMenuItem[];
  side: NonNullable<DropdownMenuRenderableOptions["side"]>;
  align: NonNullable<DropdownMenuRenderableOptions["align"]>;
  menuWidthMode: NonNullable<DropdownMenuRenderableOptions["width"]>;
  minWidth?: number;
  maxWidth?: number;
  closeOnSelect: boolean;
  restoreFocus: boolean;
  disabled: boolean;
  private openState = false;
  private restoreTarget: Renderable | null = null;
  private unsubscribeGlobal: (() => void) | null = null;
  private unsubscribeResize: (() => void) | null = null;

  constructor(options: DropdownMenuRenderableOptions) {
    super("dropdown-menu", {
      overflow: "visible",
      ...options.layout,
    });
    this.items = options.items;
    this.side = options.side ?? "bottom";
    this.align = options.align ?? "start";
    this.menuWidthMode = options.width ?? "content";
    this.minWidth = options.minWidth;
    this.maxWidth = options.maxWidth;
    this.closeOnSelect = options.closeOnSelect ?? true;
    this.restoreFocus = options.restoreFocus ?? true;
    this.disabled = options.disabled ?? false;

    this.trigger = new ButtonRenderable({
      label: options.triggerLabel ?? "Menu",
      variant: "secondary",
      disabled: this.disabled,
      layout: {
        height: 3,
      },
      style: {
        ...options.style,
      },
    });
    this.popup = new MenuPopupRenderable({
      items: this.items,
      style: {
        border: true,
        fg: options.style?.fg ?? defaultComponentTheme.fg,
        bg: options.style?.bg ?? defaultComponentTheme.surfaceAltBg,
        borderFg: options.style?.borderFg ?? defaultComponentTheme.borderStrong,
        titleFg: options.style?.titleFg ?? defaultComponentTheme.borderStrong,
      },
    });

    super.add(this.trigger);

    this.trigger.on("press", (event) => {
      this.toggle();
      event.preventDefault();
    });

    this.popup.on("select", (event) => {
      const submit = event as SubmitEvent<{ id: string; index: number; item: DropdownMenuItem }>;
      const payload = {
        id: submit.value.id,
        index: submit.value.index,
        item: submit.value.item,
      };
      const selectEvent = createSyntheticEvent({
        type: "submit",
        value: payload,
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

    if (options.open) {
      this.openState = true;
    }
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type !== "key" || event.defaultPrevented) {
      return;
    }

    if (!isNodeWithin(event.target, this.trigger)) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!this.openState) {
        this.open();
      }
      event.preventDefault();
    }
  }

  override measurePreferredSize(parentBounds: Rect) {
    return this.trigger.measurePreferredSize(parentBounds);
  }

  isOpen(): boolean {
    return this.openState;
  }

  open(): this {
    if (this.openState || this.disabled || !this.renderer) {
      return this;
    }

    const host = this.renderer.root;
    this.openState = true;
    this.restoreTarget = this.renderer.focusedNode;
    this.trigger.setLabel(this.trigger.getLabel());
    this.trigger.updateStyle({
      borderFg: defaultComponentTheme.borderStrong,
      titleFg: defaultComponentTheme.borderStrong,
    });
    this.popup.setItems(this.items);

    if (!this.popup.parent) {
      host.add(this.popup);
    }

    this.positionPopup();
    this.popup.open = true;
    this.renderer.focus(this.popup);
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
        !isNodeWithin(event.target, this.trigger)
      ) {
        this.close("outside");
        event.preventDefault();
      }
    });
    this.unsubscribeResize = this.renderer.subscribeToResize(() => {
      if (this.openState) {
        this.positionPopup();
      }
    });
    this.emitOpenChange(true);
    this.invalidate("dropdown-menu:open");
    return this;
  }

  close(reason: string = "programmatic"): this {
    if (!this.openState) {
      return this;
    }

    this.openState = false;
    this.popup.open = false;
    this.unsubscribeGlobal?.();
    this.unsubscribeGlobal = null;
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;

    if (this.popup.parent) {
      this.popup.parent.remove(this.popup);
    }

    this.trigger.updateStyle({
      borderFg: defaultComponentTheme.border,
      titleFg: defaultComponentTheme.title,
    });

    if (this.restoreFocus && this.renderer) {
      const nextFocus =
        this.restoreTarget?.isFocusable() && this.restoreTarget.isVisibleForLayout()
          ? this.restoreTarget
          : this.trigger;
      this.renderer.focus(nextFocus);
    }

    if (reason !== "select") {
      const cancelEvent = createSyntheticEvent({
        type: "cancel",
        reason,
      } as const);
      cancelEvent.target = this;
      cancelEvent.currentTarget = this;
      this.emit("cancel", cancelEvent as never);
    }
    this.emitOpenChange(false);
    this.invalidate("dropdown-menu:close");
    return this;
  }

  toggle(): this {
    if (this.openState) {
      return this.close("toggle");
    }

    return this.open();
  }

  setItems(items: DropdownMenuItem[]): this {
    this.items = items;
    this.popup.setItems(items);
    if (this.openState) {
      this.positionPopup();
    }
    this.invalidate("dropdown-menu:items");
    return this;
  }

  setActiveItem(id: string): this {
    this.popup.setActiveItem(id);
    this.invalidate("dropdown-menu:active");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.trigger.setDisabled(disabled);
    if (disabled && this.openState) {
      this.close("disabled");
    }
    return this;
  }

  protected override paint(): void {}

  protected override onMount(): void {
    if (this.openState) {
      this.openState = false;
      this.open();
    }
  }

  protected override onUnmount(): void {
    this.close("unmount");
  }

  private emitOpenChange(open: boolean): void {
    const event = createSyntheticEvent({
      type: "change",
      value: { open },
      previousValue: undefined,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("openChange", event);
  }

  private positionPopup(): void {
    if (!this.renderer) {
      return;
    }

    const rootBounds = this.renderer.root.layoutState.innerBounds;
    const viewport = {
      x: 0,
      y: 0,
      width: rootBounds.width,
      height: rootBounds.height,
    };
    const triggerBounds = this.trigger.layoutState.bounds;
    const anchor = {
      x: triggerBounds.x - rootBounds.x,
      y: triggerBounds.y - rootBounds.y,
      width: triggerBounds.width,
      height: triggerBounds.height,
    };
    const triggerWidth = Math.max(1, triggerBounds.width);
    const contentWidth = measureMenuContentWidth(this.items);
    const requestedWidth =
      typeof this.menuWidthMode === "number"
        ? this.menuWidthMode
        : this.menuWidthMode === "trigger"
          ? triggerWidth
          : contentWidth;
    const minWidth = this.minWidth ?? 0;
    const maxWidth = this.maxWidth ?? Math.max(contentWidth, triggerWidth, minWidth);
    const menuWidth = Math.max(minWidth, Math.min(maxWidth, requestedWidth));
    const menuHeight = Math.max(3, countMenuRows(this.items) + 2);

    const placement = resolveMenuPlacement({
      anchor,
      viewport,
      menuWidth,
      menuHeight,
      side: this.side,
      align: this.align,
    });

    this.popup.updateLayout({
      position: "absolute",
      left: placement.left,
      top: placement.top,
      width: placement.width,
      height: placement.height,
      zIndex: 220,
    });
  }
}
