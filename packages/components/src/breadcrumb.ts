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
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface BreadcrumbItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface BreadcrumbRenderableOptions {
  items: BreadcrumbItem[];
  maxVisibleItems?: number;
  separator?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface VisibleBreadcrumbItem {
  kind: "item" | "ellipsis";
  itemIndex?: number;
  label: string;
}

export class BreadcrumbRenderable extends Renderable {
  items: BreadcrumbItem[];
  maxVisibleItems?: number;
  separator: string;
  focusIndex: number;
  focused = false;

  constructor(options: BreadcrumbRenderableOptions) {
    super("breadcrumb", options.layout, {
      focusable: true,
      fg: defaultComponentTheme.fg,
      bg: defaultComponentTheme.surfaceBg,
      borderFg: defaultComponentTheme.border,
      titleFg: defaultComponentTheme.borderStrong,
      ...options.style,
    });
    this.items = options.items;
    this.maxVisibleItems = options.maxVisibleItems;
    this.separator = options.separator ?? "/";
    this.focusIndex = Math.max(0, this.items.length - 1);
  }

  setItems(items: BreadcrumbItem[]): this {
    this.items = items;
    this.focusIndex = Math.max(0, Math.min(this.focusIndex, items.length - 1));
    this.invalidate("breadcrumb:items");
    return this;
  }

  getFocusedItemId(): string | undefined {
    return this.items[this.focusIndex]?.id;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const text = this.visibleItems()
      .map((entry) => entry.label)
      .join(` ${this.separator} `);
    return {
      width: Math.max(measured.width, measureTextWidth(text)),
      height: Math.max(measured.height, 1),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("breadcrumb:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("breadcrumb:blur");
      return;
    }

    if (event.type === "mouse" && event.action === "down") {
      const itemIndex = this.itemIndexAt(event.x, event.y);
      if (itemIndex === null) {
        return;
      }

      this.focusIndex = itemIndex;
      this.emitSelect(itemIndex);
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    if (event.key === "ArrowLeft") {
      this.moveFocus(-1);
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowRight") {
      this.moveFocus(1);
      event.preventDefault();
      return;
    }

    if (event.key === "Home") {
      this.focusIndex = this.firstVisibleItemIndex();
      this.invalidate("breadcrumb:home");
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      this.focusIndex = this.lastVisibleItemIndex();
      this.invalidate("breadcrumb:end");
      event.preventDefault();
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "Space") {
      this.emitSelect(this.focusIndex);
      event.preventDefault();
    }
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

    let cursor = bounds.x;
    const visible = this.visibleItems();
    for (let index = 0; index < visible.length; index += 1) {
      const entry = visible[index];
      if (!entry) {
        continue;
      }

      const colors = this.resolveColors(entry);
      renderTextBlock(
        buffer,
        { x: cursor, y: bounds.y, width: Math.max(0, bounds.x + bounds.width - cursor), height: 1 },
        entry.label,
        {
          clip: clipRect,
          fg: colors.fg,
          bg: colors.bg,
          wrapMode: "none",
        },
      );
      cursor += measureTextWidth(entry.label);

      if (index < visible.length - 1) {
        const separatorText = ` ${this.separator} `;
        renderTextBlock(
          buffer,
          {
            x: cursor,
            y: bounds.y,
            width: Math.max(0, bounds.x + bounds.width - cursor),
            height: 1,
          },
          separatorText,
          {
            clip: clipRect,
            fg: defaultComponentTheme.muted,
            bg: this.styleProps.bg,
            wrapMode: "none",
          },
        );
        cursor += measureTextWidth(separatorText);
      }
    }
  }

  private visibleItems(): VisibleBreadcrumbItem[] {
    if (!this.maxVisibleItems || this.items.length <= this.maxVisibleItems) {
      return this.items.map((item, itemIndex) => ({
        kind: "item",
        itemIndex,
        label: item.label,
      }));
    }

    const trailingCount = Math.max(1, this.maxVisibleItems - 1);
    const startIndex = Math.max(1, this.items.length - trailingCount);
    const visible: VisibleBreadcrumbItem[] = [
      {
        kind: "item",
        itemIndex: 0,
        label: this.items[0]?.label ?? "",
      },
      {
        kind: "ellipsis",
        label: "…",
      },
    ];

    for (let index = startIndex; index < this.items.length; index += 1) {
      const item = this.items[index];
      if (!item) {
        continue;
      }
      visible.push({
        kind: "item",
        itemIndex: index,
        label: item.label,
      });
    }

    return visible;
  }

  private resolveColors(entry: VisibleBreadcrumbItem) {
    if (entry.kind === "ellipsis") {
      return {
        fg: defaultComponentTheme.muted,
        bg: this.styleProps.bg,
      };
    }

    const item = this.items[entry.itemIndex ?? -1];
    if (!item) {
      return {
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      };
    }

    if (item.disabled) {
      return {
        fg: defaultComponentTheme.muted,
        bg: this.styleProps.bg,
      };
    }

    if (this.focused && entry.itemIndex === this.focusIndex) {
      return {
        fg: defaultComponentTheme.ink,
        bg: this.styleProps.titleFg ?? defaultComponentTheme.borderStrong,
      };
    }

    if (entry.itemIndex === this.items.length - 1) {
      return {
        fg: this.styleProps.titleFg ?? defaultComponentTheme.borderStrong,
        bg: this.styleProps.bg,
      };
    }

    return {
      fg: this.styleProps.fg,
      bg: this.styleProps.bg,
    };
  }

  private moveFocus(delta: 1 | -1): void {
    const visibleIndexes = this.visibleItems()
      .filter(
        (entry): entry is VisibleBreadcrumbItem & { itemIndex: number } =>
          entry.kind === "item" &&
          typeof entry.itemIndex === "number" &&
          this.items[entry.itemIndex]?.disabled !== true,
      )
      .map((entry) => entry.itemIndex);

    if (visibleIndexes.length === 0) {
      return;
    }

    const currentPosition = Math.max(0, visibleIndexes.indexOf(this.focusIndex));
    const nextPosition = Math.max(0, Math.min(currentPosition + delta, visibleIndexes.length - 1));
    this.focusIndex = visibleIndexes[nextPosition] ?? this.focusIndex;
    this.invalidate("breadcrumb:focus-move");
  }

  private firstVisibleItemIndex(): number {
    return (
      this.visibleItems().find(
        (entry): entry is VisibleBreadcrumbItem & { itemIndex: number } =>
          entry.kind === "item" && typeof entry.itemIndex === "number",
      )?.itemIndex ?? 0
    );
  }

  private lastVisibleItemIndex(): number {
    const visible = this.visibleItems()
      .filter(
        (entry): entry is VisibleBreadcrumbItem & { itemIndex: number } =>
          entry.kind === "item" && typeof entry.itemIndex === "number",
      )
      .map((entry) => entry.itemIndex);
    return visible.at(-1) ?? 0;
  }

  private emitSelect(itemIndex: number): void {
    const item = this.items[itemIndex];
    if (!item || item.disabled) {
      return;
    }

    const event = createSyntheticEvent({
      type: "change",
      value: {
        id: item.id,
        index: itemIndex,
      },
      previousValue: undefined,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("select", event);
    this.invalidate("breadcrumb:select");
  }

  private itemIndexAt(x: number, y: number): number | null {
    const { bounds } = this.layoutState;
    if (y !== bounds.y || x < bounds.x || x >= bounds.x + bounds.width) {
      return null;
    }

    let cursor = bounds.x;
    const visible = this.visibleItems();
    for (let index = 0; index < visible.length; index += 1) {
      const entry = visible[index];
      if (!entry) {
        continue;
      }
      const width = measureTextWidth(entry.label);
      if (entry.kind === "item" && x >= cursor && x < cursor + width) {
        return entry.itemIndex ?? null;
      }
      cursor += width;
      if (index < visible.length - 1) {
        cursor += measureTextWidth(` ${this.separator} `);
      }
    }

    return null;
  }
}
