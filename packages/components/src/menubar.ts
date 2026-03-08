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
import { isNodeWithin } from "./internal/focus";
import {
  type DropdownMenuItem,
  MenuPopupRenderable,
  measureMenuContentWidth,
  resolveMenuPlacement,
} from "./internal/menu-popup";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface MenuBarMenu {
  id: string;
  label: string;
  items: DropdownMenuItem[];
  disabled?: boolean;
}

export interface MenuBarRenderableOptions {
  menus: MenuBarMenu[];
  activeMenuId?: string;
  openOnFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class MenuBarRenderable extends Renderable {
  menus: MenuBarMenu[];
  activeIndex: number;
  openOnFocus: boolean;
  focused = false;

  private readonly popup: MenuPopupRenderable;
  private openMenuIndex: number | null = null;
  private unsubscribeGlobal: (() => void) | null = null;
  private unsubscribeResize: (() => void) | null = null;

  constructor(options: MenuBarRenderableOptions) {
    super("menubar", options.layout, {
      focusable: true,
      fg: defaultComponentTheme.fg,
      bg: defaultComponentTheme.surfaceBg,
      borderFg: defaultComponentTheme.border,
      titleFg: defaultComponentTheme.borderStrong,
      ...options.style,
    });
    this.menus = options.menus;
    this.activeIndex = this.findIndexById(options.activeMenuId);
    this.openOnFocus = options.openOnFocus ?? false;
    this.popup = new MenuPopupRenderable({
      items: this.menus[this.activeIndex]?.items ?? [],
    });

    this.popup.on("select", (event) => {
      const submit = event as {
        value: {
          id: string;
          index: number;
          item: DropdownMenuItem;
        };
      };
      const currentMenu = this.menus[this.openMenuIndex ?? this.activeIndex];
      const selectEvent = createSyntheticEvent({
        type: "submit",
        value: {
          menuId: currentMenu?.id,
          itemId: submit.value.id,
          item: submit.value.item,
        },
      } as const);
      selectEvent.target = this;
      selectEvent.currentTarget = this;
      this.emit("select", selectEvent);
      this.closeMenu("select");
    });

    this.popup.on("cancel", (event) => {
      const reason =
        "reason" in event && typeof event.reason === "string" ? event.reason : "programmatic";
      this.closeMenu(reason);
    });
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const width = this.menus.reduce(
      (total, menu) => total + measureTextWidth(this.renderMenuLabel(menu)) + 1,
      0,
    );
    return {
      width: Math.max(measured.width, width),
      height: Math.max(measured.height, 1),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      if (this.openOnFocus && this.openMenuIndex === null) {
        this.openMenu(this.menus[this.activeIndex]?.id ?? "");
      } else {
        this.invalidate("menubar:focus");
      }
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("menubar:blur");
      return;
    }

    if (event.type === "mouse" && event.action === "down") {
      const index = this.menuIndexAt(event.x, event.y);
      if (index === null || this.menus[index]?.disabled) {
        return;
      }

      this.activeIndex = index;
      this.openMenu(this.menus[index]?.id ?? "");
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    if (event.key === "ArrowRight") {
      this.moveActive(1);
      if (this.openMenuIndex !== null) {
        this.openMenu(this.menus[this.activeIndex]?.id ?? "");
      } else {
        this.invalidate("menubar:next");
      }
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowLeft") {
      this.moveActive(-1);
      if (this.openMenuIndex !== null) {
        this.openMenu(this.menus[this.activeIndex]?.id ?? "");
      } else {
        this.invalidate("menubar:prev");
      }
      event.preventDefault();
      return;
    }

    if (event.key === "Home") {
      this.activeIndex = this.findNextEnabled(0, 1);
      this.invalidate("menubar:home");
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      this.activeIndex = this.findNextEnabled(this.menus.length - 1, -1);
      this.invalidate("menubar:end");
      event.preventDefault();
      return;
    }

    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "Space" ||
      event.key === "ArrowDown"
    ) {
      this.openMenu(this.menus[this.activeIndex]?.id ?? "");
      event.preventDefault();
      return;
    }

    if (event.key === "Escape" && this.openMenuIndex !== null) {
      this.closeMenu("escape");
      event.preventDefault();
    }
  }

  openMenu(id: string): this {
    if (!this.renderer) {
      return this;
    }

    const index = this.findIndexById(id);
    const menu = this.menus[index];
    if (!menu || menu.disabled) {
      return this;
    }

    this.activeIndex = index;
    this.openMenuIndex = index;
    this.popup.setItems(menu.items);
    this.positionPopup(index);

    if (!this.popup.parent) {
      this.renderer.root.add(this.popup);
    }

    this.renderer.focus(this.popup);
    this.ensureGlobalHooks();

    const openEvent = createSyntheticEvent({
      type: "change",
      value: { menuId: menu.id, open: true },
      previousValue: undefined,
    } as const);
    openEvent.target = this;
    openEvent.currentTarget = this;
    this.emit("openChange", openEvent);
    this.invalidate("menubar:open");
    return this;
  }

  closeMenu(reason = "programmatic"): this {
    if (this.openMenuIndex === null) {
      return this;
    }

    this.openMenuIndex = null;
    this.unsubscribeGlobal?.();
    this.unsubscribeGlobal = null;
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;
    if (this.popup.parent) {
      this.popup.parent.remove(this.popup);
    }
    this.renderer?.focus(this);

    if (reason !== "select") {
      const event = createSyntheticEvent({
        type: "cancel",
        reason,
      } as const);
      event.target = this;
      event.currentTarget = this;
      this.emit("cancel", event as never);
    }
    this.invalidate("menubar:close");
    return this;
  }

  setActiveMenu(id: string): this {
    this.activeIndex = this.findIndexById(id);
    this.invalidate("menubar:active");
    return this;
  }

  setMenus(menus: MenuBarMenu[]): this {
    this.menus = menus;
    this.activeIndex = this.findNextEnabled(Math.min(this.activeIndex, menus.length - 1), 1);
    if (this.openMenuIndex !== null) {
      this.openMenu(this.menus[this.activeIndex]?.id ?? "");
    }
    this.invalidate("menubar:menus");
    return this;
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;

    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
    );

    let x = bounds.x;
    for (let index = 0; index < this.menus.length && x < bounds.x + bounds.width; index += 1) {
      const menu = this.menus[index];
      if (!menu) {
        continue;
      }

      const label = this.renderMenuLabel(menu);
      const isActive = index === this.activeIndex;
      const isOpen = index === this.openMenuIndex;
      const fg = menu.disabled
        ? defaultComponentTheme.muted
        : isActive || isOpen
          ? defaultComponentTheme.ink
          : this.styleProps.fg;
      const bg =
        isActive || isOpen
          ? (this.styleProps.titleFg ?? defaultComponentTheme.borderStrong)
          : this.styleProps.bg;

      renderTextBlock(
        buffer,
        {
          x,
          y: bounds.y,
          width: Math.max(0, bounds.x + bounds.width - x),
          height: 1,
        },
        label,
        {
          clip: clipRect,
          fg,
          bg,
          wrapMode: "none",
        },
      );
      x += measureTextWidth(label) + 1;
    }
  }

  protected override onUnmount(): void {
    this.closeMenu("unmount");
  }

  private ensureGlobalHooks(): void {
    if (!this.renderer) {
      return;
    }

    if (!this.unsubscribeGlobal) {
      this.unsubscribeGlobal = this.renderer.subscribe((event) => {
        if (this.openMenuIndex === null) {
          return;
        }

        if (event.type === "key" && event.key === "Escape") {
          this.closeMenu("escape");
          event.preventDefault();
          return;
        }

        if (
          event.type === "key" &&
          isNodeWithin(event.target, this.popup) &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) {
          this.moveActive(event.key === "ArrowRight" ? 1 : -1);
          this.openMenu(this.menus[this.activeIndex]?.id ?? "");
          event.preventDefault();
          return;
        }

        if (
          event.type === "mouse" &&
          event.action === "down" &&
          !isNodeWithin(event.target, this.popup) &&
          !isNodeWithin(event.target, this)
        ) {
          this.closeMenu("outside");
        }
      });
    }

    if (!this.unsubscribeResize) {
      this.unsubscribeResize = this.renderer.subscribeToResize(() => {
        if (this.openMenuIndex !== null) {
          this.positionPopup(this.openMenuIndex);
        }
      });
    }
  }

  private moveActive(delta: 1 | -1): void {
    this.activeIndex = this.findNextEnabled(this.activeIndex + delta, delta);
  }

  private findIndexById(id?: string): number {
    const index =
      typeof id === "string"
        ? this.menus.findIndex((menu) => menu.id === id && menu.disabled !== true)
        : -1;
    if (index !== -1) {
      return index;
    }
    return this.findNextEnabled(0, 1);
  }

  private findNextEnabled(start: number, delta: 1 | -1): number {
    if (this.menus.length === 0) {
      return 0;
    }

    let index = Math.max(0, Math.min(start, this.menus.length - 1));
    for (let attempts = 0; attempts < this.menus.length; attempts += 1) {
      const menu = this.menus[index];
      if (menu && menu.disabled !== true) {
        return index;
      }
      index = (index + delta + this.menus.length) % this.menus.length;
    }

    return 0;
  }

  private renderMenuLabel(menu: MenuBarMenu): string {
    return ` ${menu.label} `;
  }

  private menuIndexAt(x: number, y: number): number | null {
    const { bounds } = this.layoutState;
    if (
      y < bounds.y ||
      y >= bounds.y + bounds.height ||
      x < bounds.x ||
      x >= bounds.x + bounds.width
    ) {
      return null;
    }

    let cursor = bounds.x;
    for (let index = 0; index < this.menus.length; index += 1) {
      const label = this.renderMenuLabel(this.menus[index] ?? { id: "", label: "", items: [] });
      const width = measureTextWidth(label);
      if (x >= cursor && x < cursor + width) {
        return index;
      }
      cursor += width + 1;
    }

    return null;
  }

  private positionPopup(index: number): void {
    if (!this.renderer) {
      return;
    }

    const menu = this.menus[index];
    if (!menu) {
      return;
    }

    const rootBounds = this.renderer.root.layoutState.innerBounds;
    const anchorRect = this.menuAnchorRect(index);
    const anchor = {
      x: anchorRect.x - rootBounds.x,
      y: anchorRect.y - rootBounds.y,
      width: anchorRect.width,
      height: anchorRect.height,
    };
    const width = Math.max(anchor.width, measureMenuContentWidth(menu.items));
    const height = Math.max(3, menu.items.length + 2);
    const placement = resolveMenuPlacement({
      anchor,
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
      zIndex: 230,
    });
  }

  private menuAnchorRect(index: number): Rect {
    const { bounds } = this.layoutState;
    let x = bounds.x;
    for (let menuIndex = 0; menuIndex < this.menus.length; menuIndex += 1) {
      const menu = this.menus[menuIndex];
      const width = measureTextWidth(
        this.renderMenuLabel(menu ?? { id: "", label: "", items: [] }),
      );
      if (menuIndex === index) {
        return { x, y: bounds.y, width, height: 1 };
      }
      x += width + 1;
    }

    return { x: bounds.x, y: bounds.y, width: 1, height: 1 };
  }
}
