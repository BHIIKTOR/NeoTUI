import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Renderable,
} from "@neotui/core";
import { PanelRenderable } from "./panel";
import { type ComponentTone, defaultComponentTheme } from "./theme";

export interface DockItem {
  id: string;
  title: string;
  node: Renderable;
  tone?: ComponentTone;
}

export type DockDropPlacement = "after" | "before" | "swap";

export interface DockLayoutRenderableOptions {
  items: DockItem[];
  direction?: "row" | "column";
  gap?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface DockPaneRecord {
  item: DockItem;
  pane: PanelRenderable;
  baseBorderFg: string;
  baseTitleFg: string;
}

export class DockLayoutRenderable extends BoxRenderable {
  items: DockItem[];
  direction: NonNullable<DockLayoutRenderableOptions["direction"]>;
  gap: number;
  readonly dragPreview: PanelRenderable;
  readonly dropIndicator: BoxRenderable;

  private readonly panes = new Map<string, DockPaneRecord>();
  private readonly dragPreviewBody: BoxRenderable;
  private draggedId: string | null = null;
  private hoverId: string | null = null;
  private hoverPlacement: DockDropPlacement = "swap";
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private unsubscribeGlobal: (() => void) | null = null;

  constructor(options: DockLayoutRenderableOptions) {
    super({
      layout: {
        flexDirection: options.direction ?? "row",
        gap: options.gap ?? 1,
        flexGrow: 1,
        overflow: "visible",
        ...options.layout,
      },
      style: {
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    });
    this.items = options.items;
    this.direction = options.direction ?? "row";
    this.gap = options.gap ?? 1;
    this.dragPreviewBody = new BoxRenderable({
      layout: {
        flexGrow: 1,
      },
      style: {
        fg: defaultComponentTheme.fg,
        bg: "#171310",
      },
    });
    this.dragPreview = new PanelRenderable({
      title: "drag preview",
      tone: "accent",
      layout: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 16,
        height: 8,
        zIndex: 200,
      },
      style: {
        visible: false,
        bg: "#171310",
        borderFg: defaultComponentTheme.borderStrong,
        titleFg: defaultComponentTheme.title,
      },
    });
    this.dragPreview.add(this.dragPreviewBody);
    this.dropIndicator = new BoxRenderable({
      layout: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        zIndex: 150,
      },
      style: {
        visible: false,
        bg: defaultComponentTheme.accent,
      },
    });
    this.syncItems();
    super.add(this.dropIndicator, this.dragPreview);
  }

  setItems(items: DockItem[]): this {
    this.items = items;
    this.resetDragState();
    this.syncItems();
    return this;
  }

  reorder(sourceId: string, targetId: string): this {
    return this.move(sourceId, targetId, "swap");
  }

  move(sourceId: string, targetId: string, placement: DockDropPlacement = "swap"): this {
    const sourceIndex = this.items.findIndex((item) => item.id === sourceId);
    const targetIndex = this.items.findIndex((item) => item.id === targetId);
    const source = this.items[sourceIndex];
    const target = this.items[targetIndex];

    if (
      sourceIndex === -1 ||
      targetIndex === -1 ||
      sourceIndex === targetIndex ||
      !source ||
      !target
    ) {
      return this;
    }

    const nextOrder =
      placement === "swap"
        ? swapItems(this.items, sourceIndex, targetIndex)
        : insertItem(this.items, sourceIndex, targetIndex, placement);

    if (sameOrder(this.items, nextOrder)) {
      this.resetDragState();
      this.syncPaneStyles();
      return this;
    }

    this.items = nextOrder;
    this.syncOrder();
    this.resetDragState();
    this.syncPaneStyles();

    const order = this.serializeOrder();
    const event = createSyntheticEvent({
      type: "change",
      value: {
        sourceId,
        targetId,
        placement,
        order,
      },
      previousValue: undefined,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("reorder", event);
    this.emit("change", event);
    return this;
  }

  serializeOrder(): string[] {
    return this.items.map((item) => item.id);
  }

  protected override onMount(): void {
    this.unsubscribeGlobal =
      this.renderer?.subscribe((event) => {
        if (event.type === "mouse" && event.action === "up") {
          if (this.draggedId && this.hoverId && this.draggedId !== this.hoverId) {
            this.move(this.draggedId, this.hoverId, this.hoverPlacement);
            return;
          }

          this.resetDragState();
          this.syncPaneStyles();
        }
      }) ?? null;
  }

  protected override onUnmount(): void {
    this.unsubscribeGlobal?.();
    this.unsubscribeGlobal = null;
  }

  protected override paint(): void {}

  private syncItems(): void {
    for (const child of [...this.children]) {
      if (child !== this.dragPreview && child !== this.dropIndicator) {
        super.remove(child);
      }
    }
    this.panes.clear();

    for (const item of this.items) {
      const pane = new PanelRenderable({
        title: item.title,
        tone: item.tone ?? "default",
        layout: {
          flexGrow: 1,
          minWidth: 16,
          minHeight: 8,
        },
      });
      pane.add(item.node);
      this.attachPaneInteractions(item, pane);

      const baseBorderFg = pane.styleProps.borderFg ?? defaultComponentTheme.border;
      const baseTitleFg = pane.styleProps.titleFg ?? defaultComponentTheme.title;
      this.panes.set(item.id, {
        item,
        pane,
        baseBorderFg,
        baseTitleFg,
      });
      super.add(pane);
    }

    this.syncOrder();
    this.syncPaneStyles();
  }

  private syncOrder(): void {
    for (const child of [...this.children]) {
      if (child !== this.dragPreview && child !== this.dropIndicator) {
        super.remove(child);
      }
    }

    for (const item of this.items) {
      const pane = this.panes.get(item.id)?.pane;
      if (pane) {
        super.add(pane);
      }
    }

    super.add(this.dropIndicator, this.dragPreview);

    this.invalidate("dock-layout:order");
  }

  private attachPaneInteractions(item: DockItem, pane: PanelRenderable): void {
    pane.on("dragstart", (event) => {
      if (event.type !== "mouse") {
        return;
      }

      this.draggedId = item.id;
      this.hoverId = null;
      this.dragOffsetX = event.x - pane.layoutState.bounds.x;
      this.dragOffsetY = event.y - pane.layoutState.bounds.y;
      this.syncPreview(item, pane, event.x, event.y);
      this.syncHoverTarget(event.x, event.y, item.id);
      this.syncPaneStyles();
      event.preventDefault();
    });
    pane.on("dragmove", (event) => {
      if (event.type !== "mouse" || this.draggedId !== item.id) {
        return;
      }

      this.syncPreview(item, pane, event.x, event.y);
      this.syncHoverTarget(event.x, event.y, item.id);
      event.preventDefault();
    });
  }

  private syncPaneStyles(): void {
    for (const [id, record] of this.panes) {
      const isDragged = this.draggedId === id;
      const isHovered = this.hoverId === id;
      record.pane.updateStyle({
        borderFg: isDragged
          ? defaultComponentTheme.borderStrong
          : isHovered
            ? defaultComponentTheme.accent
            : record.baseBorderFg,
        titleFg: isDragged
          ? defaultComponentTheme.title
          : isHovered
            ? this.hoverPlacement === "swap"
              ? defaultComponentTheme.accent
              : defaultComponentTheme.title
            : record.baseTitleFg,
        bg: isDragged ? "#171310" : defaultComponentTheme.surfaceBg,
      });
    }
  }

  private syncPreview(
    item: DockItem,
    pane: PanelRenderable,
    pointerX: number,
    pointerY: number,
  ): void {
    const container = this.layoutState.innerBounds;
    const sourceBounds = pane.layoutState.bounds;
    const previewWidth = sourceBounds.width;
    const previewHeight = sourceBounds.height;
    const left = clamp(
      pointerX - this.dragOffsetX - container.x,
      0,
      Math.max(0, container.width - previewWidth),
    );
    const top = clamp(
      pointerY - this.dragOffsetY - container.y,
      0,
      Math.max(0, container.height - previewHeight),
    );

    this.dragPreview.setTitle(item.title);
    this.dragPreview.setTone(item.tone ?? "default");
    this.dragPreview.updateLayout({
      left,
      top,
      width: previewWidth,
      height: previewHeight,
    });
    this.dragPreview.updateStyle({
      visible: true,
      bg: "#171310",
      borderFg: defaultComponentTheme.borderStrong,
      titleFg: defaultComponentTheme.title,
    });
    this.dragPreviewBody.setContent(extractPreviewContent(item.node));
    this.dragPreviewBody.updateStyle({
      fg: defaultComponentTheme.fg,
      bg: "#171310",
    });
  }

  private resetDragState(): void {
    this.draggedId = null;
    this.hoverId = null;
    this.hoverPlacement = "swap";
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragPreview.setVisible(false);
    this.dragPreviewBody.setContent("");
    this.dropIndicator.setVisible(false);
  }

  private syncHoverTarget(pointerX: number, pointerY: number, draggedId: string): void {
    let nextHoverId: string | null = null;
    let nextPlacement: DockDropPlacement = "swap";

    for (const [id, record] of this.panes) {
      if (id === draggedId) {
        continue;
      }

      if (record.pane.containsPoint(pointerX, pointerY)) {
        nextHoverId = id;
        nextPlacement = resolvePlacement(
          record.pane.layoutState.bounds,
          pointerX,
          pointerY,
          this.direction,
        );
        break;
      }
    }

    if (this.hoverId !== nextHoverId || this.hoverPlacement !== nextPlacement) {
      this.hoverId = nextHoverId;
      this.hoverPlacement = nextPlacement;
      this.syncDropIndicator();
      this.syncPaneStyles();
    }
  }

  private syncDropIndicator(): void {
    if (!this.hoverId || this.hoverPlacement === "swap") {
      this.dropIndicator.setVisible(false);
      return;
    }

    const record = this.panes.get(this.hoverId);

    if (!record) {
      this.dropIndicator.setVisible(false);
      return;
    }

    const bounds = record.pane.layoutState.bounds;
    const thickness =
      this.direction === "row"
        ? Math.max(1, Math.min(2, Math.floor(bounds.width / 8)))
        : Math.max(1, Math.min(2, Math.floor(bounds.height / 6)));

    if (this.direction === "row") {
      this.dropIndicator.updateLayout({
        left:
          this.hoverPlacement === "before"
            ? bounds.x - this.layoutState.bounds.x
            : bounds.x - this.layoutState.bounds.x + bounds.width - thickness,
        top: bounds.y - this.layoutState.bounds.y,
        width: thickness,
        height: bounds.height,
      });
    } else {
      this.dropIndicator.updateLayout({
        left: bounds.x - this.layoutState.bounds.x,
        top:
          this.hoverPlacement === "before"
            ? bounds.y - this.layoutState.bounds.y
            : bounds.y - this.layoutState.bounds.y + bounds.height - thickness,
        width: bounds.width,
        height: thickness,
      });
    }

    this.dropIndicator.setVisible(true);
    this.dropIndicator.updateStyle({
      bg: defaultComponentTheme.accent,
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractPreviewContent(node: Renderable): string {
  if ("content" in node && typeof node.content === "string") {
    return summarizeLines(node.content);
  }

  return "Dragging pane";
}

function summarizeLines(content: string): string {
  return content
    .split("\n")
    .slice(0, 4)
    .map((line) => line.slice(0, 48))
    .join("\n");
}

function resolvePlacement(
  bounds: { x: number; y: number; width: number; height: number },
  pointerX: number,
  pointerY: number,
  direction: "row" | "column",
): DockDropPlacement {
  if (direction === "row") {
    const localX = pointerX - bounds.x;
    const edgeThreshold = Math.max(2, Math.floor(bounds.width * 0.25));

    if (localX <= edgeThreshold) {
      return "before";
    }

    if (localX >= bounds.width - edgeThreshold) {
      return "after";
    }

    return "swap";
  }

  const localY = pointerY - bounds.y;
  const edgeThreshold = Math.max(2, Math.floor(bounds.height * 0.25));

  if (localY <= edgeThreshold) {
    return "before";
  }

  if (localY >= bounds.height - edgeThreshold) {
    return "after";
  }

  return "swap";
}

function swapItems(
  items: readonly DockItem[],
  sourceIndex: number,
  targetIndex: number,
): DockItem[] {
  const next = [...items];
  const source = next[sourceIndex];
  const target = next[targetIndex];

  if (!source || !target) {
    return next;
  }

  next[sourceIndex] = target;
  next[targetIndex] = source;
  return next;
}

function insertItem(
  items: readonly DockItem[],
  sourceIndex: number,
  targetIndex: number,
  placement: "after" | "before",
): DockItem[] {
  const next = [...items];
  const [source] = next.splice(sourceIndex, 1);

  if (!source) {
    return [...items];
  }

  const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertionIndex = placement === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;
  next.splice(Math.max(0, Math.min(next.length, insertionIndex)), 0, source);
  return next;
}

function sameOrder(current: readonly DockItem[], next: readonly DockItem[]): boolean {
  if (current.length !== next.length) {
    return false;
  }

  return current.every((item, index) => item.id === next[index]?.id);
}
