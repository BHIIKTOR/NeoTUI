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
import { defaultComponentTheme } from "../theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export type DropdownMenuItem =
  | {
      type?: "item";
      id: string;
      label: string;
      description?: string;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      checked?: boolean;
    }
  | {
      type: "separator";
      id: string;
    }
  | {
      type: "label";
      id: string;
      label: string;
    };

interface PopupColors {
  fg?: string;
  bg?: string;
  borderFg?: string;
  titleFg?: string;
}

export interface MenuPopupRenderableOptions {
  items: DropdownMenuItem[];
  activeItemId?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class MenuPopupRenderable extends Renderable {
  items: DropdownMenuItem[];
  activeIndex: number;
  hoveredIndex: number;
  pressedIndex: number | null = null;
  open = false;

  constructor(options: MenuPopupRenderableOptions) {
    super("menu-popup", options.layout, {
      focusable: true,
      fg: defaultComponentTheme.fg,
      bg: defaultComponentTheme.surfaceAltBg,
      borderFg: defaultComponentTheme.borderStrong,
      titleFg: defaultComponentTheme.borderStrong,
      border: true,
      ...options.style,
    });
    this.items = options.items;
    this.activeIndex = findSelectableIndex(this.items, 0, 1);
    this.hoveredIndex = this.activeIndex;

    if (options.activeItemId) {
      this.setActiveItem(options.activeItemId);
    }
  }

  setItems(items: DropdownMenuItem[]): this {
    this.items = items;
    this.activeIndex = findSelectableIndex(this.items, Math.max(0, this.activeIndex), 1);
    this.hoveredIndex = this.activeIndex;
    this.invalidate("menu-popup:items");
    return this;
  }

  setActiveItem(id: string): this {
    const nextIndex = this.items.findIndex(
      (item) => item.type !== "separator" && item.type !== "label" && item.id === id,
    );
    if (nextIndex !== -1) {
      this.activeIndex = nextIndex;
      this.hoveredIndex = nextIndex;
      this.invalidate("menu-popup:active");
    }
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const contentWidth = this.items.reduce((max, item) => {
      if (item.type === "separator") {
        return max;
      }

      if (item.type === "label") {
        return Math.max(max, measureTextWidth(item.label));
      }

      const markerWidth = item.checked ? 2 : 0;
      const shortcutWidth = item.shortcut ? measureTextWidth(item.shortcut) + 2 : 0;
      const descriptionWidth = item.description ? measureTextWidth(` ${item.description}`) : 0;
      const rowWidth =
        markerWidth + measureTextWidth(item.label) + descriptionWidth + shortcutWidth + 2;
      return Math.max(max, rowWidth);
    }, 10);

    return {
      width: Math.max(measured.width, contentWidth + 4),
      height: Math.max(measured.height, this.items.length + 2),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "mouse") {
      const rowIndex = this.rowIndexAt(event.x, event.y);
      if (event.action === "move" && rowIndex !== null) {
        this.hoveredIndex = rowIndex;
        if (isSelectableItem(this.items[rowIndex])) {
          this.activeIndex = rowIndex;
        }
        this.invalidate("menu-popup:hover");
        return;
      }

      if (event.action === "down" && event.button === "left" && rowIndex !== null) {
        if (isSelectableItem(this.items[rowIndex])) {
          this.activeIndex = rowIndex;
          this.hoveredIndex = rowIndex;
          this.pressedIndex = rowIndex;
          this.invalidate("menu-popup:mouse-down");
        }
        event.preventDefault();
        return;
      }

      if (event.action === "up" && event.button === "left") {
        const shouldSelect =
          rowIndex !== null &&
          this.pressedIndex !== null &&
          rowIndex === this.pressedIndex &&
          isSelectableItem(this.items[rowIndex]);
        this.pressedIndex = null;
        this.invalidate("menu-popup:mouse-up");

        if (shouldSelect) {
          this.selectIndex(rowIndex);
          event.preventDefault();
        }
      }

      return;
    }

    if (event.type !== "key") {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        this.moveFocus(1);
        event.preventDefault();
        return;
      case "ArrowUp":
        this.moveFocus(-1);
        event.preventDefault();
        return;
      case "Home":
        this.activeIndex = findSelectableIndex(this.items, 0, 1);
        this.hoveredIndex = this.activeIndex;
        this.invalidate("menu-popup:home");
        event.preventDefault();
        return;
      case "End":
        this.activeIndex = findSelectableIndex(this.items, this.items.length - 1, -1);
        this.hoveredIndex = this.activeIndex;
        this.invalidate("menu-popup:end");
        event.preventDefault();
        return;
      case "Enter":
      case " ":
      case "Space":
        this.selectIndex(this.activeIndex);
        event.preventDefault();
        return;
      case "Escape":
        this.emitCancel("escape");
        event.preventDefault();
        return;
      default:
        break;
    }

    if (event.text && !event.modifiers.alt && !event.modifiers.ctrl && !event.modifiers.meta) {
      const text = event.text.trim().toLowerCase();
      if (!text) {
        return;
      }

      const next = findMatchingIndex(this.items, text, this.activeIndex + 1);
      if (next !== -1) {
        this.activeIndex = next;
        this.hoveredIndex = next;
        this.invalidate("menu-popup:typeahead");
        event.preventDefault();
      }
    }
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, innerBounds, clipRect } = this.layoutState;
    const colors = this.resolveColors();

    buffer.fill(
      {
        char: " ",
        fg: colors.fg,
        bg: colors.bg,
      },
      bounds,
    );

    if (this.hasBorder()) {
      buffer.drawBorder(bounds, undefined, {
        fg: colors.borderFg,
        bg: colors.bg,
        titleFg: colors.titleFg,
      });
    }

    const shortcutColumnWidth = this.items.reduce((max, item) => {
      if (item.type === "separator" || item.type === "label" || !item.shortcut) {
        return max;
      }
      return Math.max(max, measureTextWidth(item.shortcut));
    }, 0);

    for (
      let itemIndex = 0;
      itemIndex < this.items.length && itemIndex < innerBounds.height;
      itemIndex += 1
    ) {
      const item = this.items[itemIndex];
      if (!item) {
        continue;
      }

      const y = innerBounds.y + itemIndex;

      if (item.type === "separator") {
        for (let x = innerBounds.x; x < innerBounds.x + innerBounds.width; x += 1) {
          buffer.setCell(x, y, {
            char: "─",
            fg: defaultComponentTheme.border,
            bg: colors.bg,
          });
        }
        continue;
      }

      const rowColors = this.resolveRowColors(itemIndex);
      buffer.fill(
        {
          char: " ",
          fg: rowColors.fg,
          bg: rowColors.bg,
        },
        {
          x: innerBounds.x,
          y,
          width: innerBounds.width,
          height: 1,
        },
      );

      if (item.type === "label") {
        renderTextBlock(
          buffer,
          {
            x: innerBounds.x,
            y,
            width: innerBounds.width,
            height: 1,
          },
          item.label.toUpperCase(),
          {
            clip: clipRect,
            fg: defaultComponentTheme.muted,
            bg: rowColors.bg,
            wrapMode: "none",
          },
        );
        continue;
      }

      const marker = item.checked ? "✓ " : "  ";
      const label = `${marker}${item.label}`;
      const description = item.description ? ` ${item.description}` : "";
      const shortcut = item.shortcut ?? "";

      const shortcutWidth = shortcutColumnWidth > 0 ? shortcutColumnWidth + 1 : 0;
      const labelWidth = Math.max(0, innerBounds.width - shortcutWidth);

      renderTextBlock(
        buffer,
        {
          x: innerBounds.x,
          y,
          width: labelWidth,
          height: 1,
        },
        label,
        {
          clip: clipRect,
          fg: rowColors.fg,
          bg: rowColors.bg,
          wrapMode: "none",
        },
      );

      if (description) {
        const descriptionX = innerBounds.x + Math.min(labelWidth - 1, measureTextWidth(label));
        renderTextBlock(
          buffer,
          {
            x: Math.max(innerBounds.x, descriptionX),
            y,
            width: Math.max(0, labelWidth - (descriptionX - innerBounds.x)),
            height: 1,
          },
          description,
          {
            clip: clipRect,
            fg: defaultComponentTheme.muted,
            bg: rowColors.bg,
            wrapMode: "none",
          },
        );
      }

      if (shortcut) {
        const shortcutX = innerBounds.x + innerBounds.width - measureTextWidth(shortcut);
        renderTextBlock(
          buffer,
          {
            x: shortcutX,
            y,
            width: Math.max(0, innerBounds.width - (shortcutX - innerBounds.x)),
            height: 1,
          },
          shortcut,
          {
            clip: clipRect,
            fg: defaultComponentTheme.muted,
            bg: rowColors.bg,
            wrapMode: "none",
          },
        );
      }
    }
  }

  private moveFocus(delta: 1 | -1): void {
    if (this.items.length === 0) {
      return;
    }

    const next = findSelectableIndex(this.items, this.activeIndex + delta, delta, true);
    if (next !== -1) {
      this.activeIndex = next;
      this.hoveredIndex = next;
      this.invalidate("menu-popup:focus-move");
    }
  }

  private selectIndex(index: number): void {
    const item = this.items[index];
    if (!isSelectableItem(item)) {
      return;
    }

    const event = createSyntheticEvent({
      type: "submit",
      value: {
        id: item.id,
        index,
        item,
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("select", event);
  }

  private emitCancel(reason: "escape" | "outside" | "programmatic"): void {
    const event = createSyntheticEvent({
      type: "cancel",
      reason,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("cancel", event as never);
  }

  private rowIndexAt(x: number, y: number): number | null {
    const { innerBounds } = this.layoutState;
    if (
      x < innerBounds.x ||
      y < innerBounds.y ||
      x >= innerBounds.x + innerBounds.width ||
      y >= innerBounds.y + Math.min(innerBounds.height, this.items.length)
    ) {
      return null;
    }

    return y - innerBounds.y;
  }

  private resolveColors(): PopupColors {
    return {
      fg: this.styleProps.fg ?? defaultComponentTheme.fg,
      bg: this.styleProps.bg ?? defaultComponentTheme.surfaceAltBg,
      borderFg: this.styleProps.borderFg ?? defaultComponentTheme.borderStrong,
      titleFg: this.styleProps.titleFg ?? defaultComponentTheme.borderStrong,
    };
  }

  private resolveRowColors(index: number) {
    const item = this.items[index];
    if (!item) {
      return {
        fg: this.styleProps.fg ?? defaultComponentTheme.fg,
        bg: this.styleProps.bg ?? defaultComponentTheme.surfaceAltBg,
      };
    }

    if (item.type !== "separator" && item.type !== "label" && item.disabled) {
      return {
        fg: defaultComponentTheme.muted,
        bg: this.styleProps.bg ?? defaultComponentTheme.surfaceAltBg,
      };
    }

    if (index === this.activeIndex) {
      return {
        fg: defaultComponentTheme.ink,
        bg:
          item.type !== "separator" && item.type !== "label" && item.danger
            ? defaultComponentTheme.danger
            : (this.styleProps.titleFg ?? defaultComponentTheme.borderStrong),
      };
    }

    if (item.type !== "separator" && item.type !== "label" && item.danger) {
      return {
        fg: defaultComponentTheme.danger,
        bg: this.styleProps.bg ?? defaultComponentTheme.surfaceAltBg,
      };
    }

    return {
      fg: this.styleProps.fg ?? defaultComponentTheme.fg,
      bg: this.styleProps.bg ?? defaultComponentTheme.surfaceAltBg,
    };
  }
}

export function measureMenuContentWidth(items: DropdownMenuItem[]): number {
  const popup = new MenuPopupRenderable({ items });
  return popup.measurePreferredSize({ x: 0, y: 0, width: 120, height: 40 }).width;
}

export function countMenuRows(items: DropdownMenuItem[]): number {
  return items.length;
}

export function resolveMenuPlacement(options: {
  anchor: Rect;
  viewport: Rect;
  menuWidth: number;
  menuHeight: number;
  side?: "bottom" | "top" | "left" | "right";
  align?: "start" | "center" | "end";
}): Pick<BaseLayoutProps, "left" | "top" | "width" | "height"> {
  const side = options.side ?? "bottom";
  const align = options.align ?? "start";
  const { anchor, viewport, menuWidth, menuHeight } = options;

  const horizontalPosition = () => {
    if (align === "center") {
      return anchor.x + Math.floor((anchor.width - menuWidth) / 2);
    }

    if (align === "end") {
      return anchor.x + anchor.width - menuWidth;
    }

    return anchor.x;
  };

  const verticalPosition = () => {
    if (align === "center") {
      return anchor.y + Math.floor((anchor.height - menuHeight) / 2);
    }

    if (align === "end") {
      return anchor.y + anchor.height - menuHeight;
    }

    return anchor.y;
  };

  let x = horizontalPosition();
  let y = anchor.y + anchor.height;

  if (side === "top") {
    y = anchor.y - menuHeight;
  } else if (side === "left") {
    x = anchor.x - menuWidth;
    y = verticalPosition();
  } else if (side === "right") {
    x = anchor.x + anchor.width;
    y = verticalPosition();
  }

  if (side === "bottom" || side === "top") {
    if (
      side === "bottom" &&
      y + menuHeight > viewport.y + viewport.height &&
      anchor.y >= menuHeight
    ) {
      y = anchor.y - menuHeight;
    }

    if (
      side === "top" &&
      y < viewport.y &&
      anchor.y + anchor.height + menuHeight <= viewport.height
    ) {
      y = anchor.y + anchor.height;
    }
  } else {
    if (side === "right" && x + menuWidth > viewport.x + viewport.width && anchor.x >= menuWidth) {
      x = anchor.x - menuWidth;
    }

    if (
      side === "left" &&
      x < viewport.x &&
      anchor.x + anchor.width + menuWidth <= viewport.width
    ) {
      x = anchor.x + anchor.width;
    }
  }

  x = clamp(x, viewport.x, Math.max(viewport.x, viewport.x + viewport.width - menuWidth));
  y = clamp(y, viewport.y, Math.max(viewport.y, viewport.y + viewport.height - menuHeight));

  return {
    left: x,
    top: y,
    width: Math.max(1, menuWidth),
    height: Math.max(1, menuHeight),
  };
}

function findSelectableIndex(
  items: readonly DropdownMenuItem[],
  start: number,
  delta: 1 | -1,
  wrap = false,
): number {
  if (items.length === 0) {
    return -1;
  }

  let index = wrap
    ? ((start % items.length) + items.length) % items.length
    : Math.max(0, Math.min(start, items.length - 1));
  for (let attempts = 0; attempts < items.length; attempts += 1) {
    const item = items[index];
    if (isSelectableItem(item)) {
      return index;
    }

    index += delta;
    if (wrap) {
      index = (index + items.length) % items.length;
    } else if (index < 0 || index >= items.length) {
      break;
    }
  }

  return -1;
}

function findMatchingIndex(
  items: readonly DropdownMenuItem[],
  query: string,
  start: number,
): number {
  if (items.length === 0) {
    return -1;
  }

  for (let attempt = 0; attempt < items.length; attempt += 1) {
    const index = (start + attempt + items.length) % items.length;
    const item = items[index];
    if (item && isSelectableItem(item) && item.label.toLowerCase().startsWith(query)) {
      return index;
    }
  }

  return -1;
}

function isSelectableItem(
  item: DropdownMenuItem | undefined,
): item is Extract<DropdownMenuItem, { type?: "item" }> {
  return !!item && item.type !== "separator" && item.type !== "label" && item.disabled !== true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
