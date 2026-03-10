import type { RenderEvent, RenderEventHandler, RenderEventType } from "./events";
import type { FrameBuffer } from "./frame-buffer";
import { normalizeSpacing, resolveDimension } from "./layout";
import type { KittyRenderer } from "./renderer";
import { measureTextWidth, renderTextBlock, type WrappedLine, wrapText } from "./text";
import type {
  BaseLayoutProps,
  BaseStyleProps,
  ImageOperation,
  LayoutState,
  Rect,
  Size,
  TextSpan,
  WrapMode,
} from "./types";

let nextRenderableId = 1;

export interface RenderContext {
  buffer: FrameBuffer;
  renderer: KittyRenderer;
  images: ImageOperation[];
}

export abstract class Renderable {
  readonly id = `node-${nextRenderableId++}`;
  readonly children: Renderable[] = [];
  readonly type: string;

  parent: Renderable | null = null;
  renderer: KittyRenderer | null = null;
  mounted = false;
  layoutState: LayoutState = {
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    innerBounds: { x: 0, y: 0, width: 0, height: 0 },
    clipRect: { x: 0, y: 0, width: 0, height: 0 },
  };

  layoutProps: BaseLayoutProps;
  styleProps: BaseStyleProps;

  private readonly listeners = new Map<string, Set<RenderEventHandler>>();

  protected constructor(
    type: string,
    layoutProps: BaseLayoutProps = {},
    styleProps: BaseStyleProps = {},
  ) {
    this.type = type;
    this.layoutProps = {
      flexDirection: "column",
      flexGrow: 0,
      flexShrink: 1,
      gap: 0,
      position: "relative",
      alignItems: "stretch",
      justifyContent: "start",
      overflow: "hidden",
      zIndex: 0,
      ...layoutProps,
    };
    this.styleProps = {
      border: false,
      opacity: 1,
      visible: true,
      focusable: false,
      ...styleProps,
    };
  }

  add(...children: Renderable[]): this {
    for (const child of children) {
      if (child === this) {
        throw new Error("Renderable cannot be added to itself.");
      }

      if (isAncestor(child, this)) {
        throw new Error("Renderable cannot be reparented into its descendant.");
      }

      if (child.parent) {
        child.parent.remove(child);
      }

      this.children.push(child);
      child.parent = this;

      if (this.renderer) {
        child.mount(this.renderer);
      }
    }

    this.invalidate("child:add");
    return this;
  }

  remove(child: Renderable): this {
    const index = this.children.indexOf(child);

    if (index === -1) {
      return this;
    }

    this.children.splice(index, 1);
    child.parent = null;
    child.unmount();
    this.invalidate("child:remove");
    return this;
  }

  reparent(parent: Renderable): this {
    parent.add(this);
    return this;
  }

  on<T extends RenderEvent = RenderEvent>(
    type: RenderEventType | string,
    handler: RenderEventHandler<T>,
  ): this {
    const group = this.listeners.get(type) ?? new Set<RenderEventHandler>();
    group.add(handler as RenderEventHandler);
    this.listeners.set(type, group);
    return this;
  }

  off<T extends RenderEvent = RenderEvent>(
    type: RenderEventType | string,
    handler: RenderEventHandler<T>,
  ): this {
    const group = this.listeners.get(type);
    group?.delete(handler as RenderEventHandler);

    if (group && group.size === 0) {
      this.listeners.delete(type);
    }

    return this;
  }

  emit(type: RenderEventType | string, event: RenderEvent): void {
    const group = this.listeners.get(type);

    if (!group) {
      return;
    }

    for (const handler of group) {
      handler(event);

      if (event.propagationStopped) {
        break;
      }
    }
  }

  updateLayout(next: Partial<BaseLayoutProps>): this {
    this.layoutProps = { ...this.layoutProps, ...next };
    this.invalidate("layout:update");
    return this;
  }

  updateStyle(next: Partial<BaseStyleProps>): this {
    this.styleProps = { ...this.styleProps, ...next };
    this.invalidate("style:update");
    return this;
  }

  setVisible(visible: boolean): this {
    this.styleProps.visible = visible;
    this.invalidate("visible");
    return this;
  }

  setOpacity(opacity: number): this {
    this.styleProps.opacity = opacity;
    this.invalidate("opacity");
    return this;
  }

  isFocusable(): boolean {
    return this.styleProps.focusable === true;
  }

  hasBorder(): boolean {
    return this.styleProps.border === true || this.styleProps.border === "line";
  }

  isVisibleForLayout(): boolean {
    return this.styleProps.visible !== false && (this.styleProps.opacity ?? 1) > 0;
  }

  containsPoint(x: number, y: number): boolean {
    const { bounds } = this.layoutState;
    return (
      x >= bounds.x &&
      y >= bounds.y &&
      x < bounds.x + bounds.width &&
      y < bounds.y + bounds.height &&
      this.isVisibleForLayout()
    );
  }

  getChildLayoutOffset(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  mount(renderer: KittyRenderer): void {
    if (this.renderer === renderer && this.mounted) {
      return;
    }

    this.renderer = renderer;
    this.mounted = true;
    this.onMount();

    for (const child of this.children) {
      child.mount(renderer);
    }
  }

  unmount(): void {
    for (const child of this.children) {
      child.unmount();
    }

    this.onUnmount();
    this.renderer = null;
    this.mounted = false;
  }

  render(context: RenderContext): void {
    if (!this.isVisibleForLayout()) {
      return;
    }

    this.paint(context);

    const children = [...this.children].sort(
      (left, right) => (left.layoutProps.zIndex ?? 0) - (right.layoutProps.zIndex ?? 0),
    );

    for (const child of children) {
      child.render(context);
    }
  }

  handleEvent(_event: RenderEvent): void {}

  measurePreferredSize(parentBounds: Rect): Size {
    const measuredWidth =
      resolveDimension(this.layoutProps.width, parentBounds.width) ?? this.defaultWidth();
    const measuredHeight =
      resolveDimension(this.layoutProps.height, parentBounds.height) ?? this.defaultHeight();

    return { width: measuredWidth, height: measuredHeight };
  }

  invalidate(reason: string): void {
    this.renderer?.invalidate(this, reason);
  }

  countNodes(): number {
    return 1 + this.children.reduce((total, child) => total + child.countNodes(), 0);
  }

  ancestors(): Renderable[] {
    const path: Renderable[] = [];
    let current: Renderable | null = this;

    while (current) {
      path.push(current);
      current = current.parent;
    }

    return path;
  }

  protected defaultWidth(): number {
    const padding = normalizeSpacing(this.layoutProps.padding);
    const margin = normalizeSpacing(this.layoutProps.margin);
    const borderWidth = this.hasBorder() ? 2 : 0;

    return padding.left + padding.right + margin.left + margin.right + borderWidth;
  }

  protected defaultHeight(): number {
    const padding = normalizeSpacing(this.layoutProps.padding);
    const margin = normalizeSpacing(this.layoutProps.margin);
    const borderHeight = this.hasBorder() ? 2 : 0;

    return padding.top + padding.bottom + margin.top + margin.bottom + borderHeight;
  }

  protected abstract paint(context: RenderContext): void;
  protected onMount(): void {}
  protected onUnmount(): void {}
}

export interface BoxRenderableOptions {
  content?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class BoxRenderable extends Renderable {
  content: string;

  constructor(options: BoxRenderableOptions = {}) {
    super("box", options.layout, options.style);
    this.content = options.content ?? "";
  }

  setContent(content: string): this {
    this.content = content;
    this.invalidate("box:content");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect): Size {
    const measured = super.measurePreferredSize(parentBounds);
    const contentLines = this.content.split("\n");
    const contentWidth = contentLines.reduce(
      (width, line) => Math.max(width, measureTextWidth(line)),
      0,
    );
    const contentHeight = contentLines.length;
    const padding = normalizeSpacing(this.layoutProps.padding);
    const borderWidth = this.hasBorder() ? 2 : 0;

    return {
      width: Math.max(measured.width, contentWidth + padding.left + padding.right + borderWidth),
      height: Math.max(measured.height, contentHeight + padding.top + padding.bottom + borderWidth),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, innerBounds, clipRect } = this.layoutState;
    const fillChar = this.styleProps.backgroundChar ?? " ";

    buffer.fill(
      {
        char: fillChar,
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
      clipRect,
    );

    if (this.hasBorder()) {
      buffer.drawBorder(bounds, this.styleProps.title, {
        fg: this.styleProps.borderFg ?? this.styleProps.fg,
        bg: this.styleProps.bg,
        titleFg: this.styleProps.titleFg ?? this.styleProps.borderFg ?? this.styleProps.fg,
      }, clipRect);
    }

    if (this.content) {
      renderTextBlock(buffer, innerBounds, this.content, {
        clip: clipRect,
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
        wrapMode: "none",
      });
    }
  }
}

export interface TextRenderableOptions {
  content: string | TextSpan[];
  href?: string;
  wrapMode?: WrapMode;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class TextRenderable extends Renderable {
  content: string | TextSpan[];
  href?: string;
  wrapMode: WrapMode;

  constructor(options: TextRenderableOptions) {
    super("text", options.layout, options.style);
    this.content = options.content;
    this.href = options.href;
    this.wrapMode = options.wrapMode ?? "none";
  }

  setContent(content: string | TextSpan[]): this {
    this.content = content;
    this.invalidate("text:content");
    return this;
  }

  setHref(href?: string): this {
    this.href = href;
    this.invalidate("text:href");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect): Size {
    const measured = super.measurePreferredSize(parentBounds);
    const maxWidth =
      resolveDimension(this.layoutProps.width, parentBounds.width) ?? parentBounds.width;
    const lines = wrapText(this.content, Math.max(1, maxWidth), this.wrapMode);

    return {
      width: Math.max(
        measured.width,
        lines.reduce((width, line) => Math.max(width, line.width), 0),
      ),
      height: Math.max(measured.height, lines.length),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;

    renderTextBlock(buffer, bounds, this.content, {
      clip: clipRect,
      href: this.href,
      fg: this.styleProps.fg,
      bg: this.styleProps.bg,
      wrapMode: this.wrapMode,
    });
  }
}

export interface ScrollBoxRenderableOptions extends BoxRenderableOptions {
  scrollY?: number;
}

export class ScrollBoxRenderable extends BoxRenderable {
  scrollY: number;

  constructor(options: ScrollBoxRenderableOptions = {}) {
    super(options);
    this.scrollY = options.scrollY ?? 0;
  }

  setScrollY(value: number): this {
    if (this.layoutState.innerBounds.height === 0) {
      this.scrollY = Math.max(0, value);
    } else {
      this.scrollY = Math.max(0, Math.min(value, this.getMaxScrollY()));
    }
    this.invalidate("scrollbox:scroll");
    return this;
  }

  override getChildLayoutOffset(): { x: number; y: number } {
    return {
      x: 0,
      y: -this.scrollY,
    };
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
  }

  override render(context: RenderContext): void {
    if (!this.isVisibleForLayout()) {
      return;
    }

    super.paint(context);
    this.renderScrolledChildren(context, this.children, 0, this.scrollY);
  }

  protected measureContentHeight(): number {
    const visibleHeight = Math.max(1, this.layoutState.innerBounds.height);

    return this.children.reduce((height, child) => {
      const bottom =
        child.layoutState.bounds.y +
        child.layoutState.bounds.height -
        this.layoutState.innerBounds.y;
      return Math.max(height, bottom);
    }, visibleHeight);
  }

  protected getMaxScrollY(): number {
    const visibleHeight = Math.max(1, this.layoutState.innerBounds.height);
    return Math.max(0, this.measureContentHeight() - visibleHeight);
  }

  protected renderScrolledChildren(
    context: RenderContext,
    children: readonly Renderable[],
    scrollX = 0,
    scrollY = this.scrollY,
  ): void {
    const orderedChildren = [...children].sort(
      (left, right) => (left.layoutProps.zIndex ?? 0) - (right.layoutProps.zIndex ?? 0),
    );

    for (const child of orderedChildren) {
      renderTranslatedSubtree(child, context, -scrollX, -scrollY);
    }
  }
}

export interface ScrollBarRenderableOptions {
  ratio?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ScrollBarRenderable extends Renderable {
  ratio: number;

  constructor(options: ScrollBarRenderableOptions = {}) {
    super("scrollbar", options.layout, options.style);
    this.ratio = options.ratio ?? 0;
  }

  setRatio(ratio: number): this {
    this.ratio = Math.max(0, Math.min(1, ratio));
    this.invalidate("scrollbar:ratio");
    return this;
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds } = this.layoutState;
    const thumbY = bounds.y + Math.floor(Math.max(0, bounds.height - 1) * this.ratio);

    for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
      buffer.setCell(bounds.x, y, {
        char: y === thumbY ? "#" : "|",
        fg: this.styleProps.borderFg ?? this.styleProps.fg,
        bg: this.styleProps.bg,
      });
    }
  }
}

export interface FrameBufferRenderableOptions {
  lines: string[];
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class FrameBufferRenderable extends Renderable {
  lines: string[];

  constructor(options: FrameBufferRenderableOptions) {
    super("framebuffer", options.layout, options.style);
    this.lines = options.lines;
  }

  setLines(lines: string[]): this {
    this.lines = lines;
    this.invalidate("framebuffer:lines");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect): Size {
    const measured = super.measurePreferredSize(parentBounds);

    return {
      width: Math.max(
        measured.width,
        this.lines.reduce((width, line) => Math.max(width, measureTextWidth(line)), 0),
      ),
      height: Math.max(measured.height, this.lines.length),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;

    for (let index = 0; index < Math.min(bounds.height, this.lines.length); index += 1) {
      buffer.drawText(bounds.x, bounds.y + index, this.lines[index] ?? "", bounds.width, {
        clip: clipRect,
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      });
    }
  }
}

export class LineCollectionRenderable extends Renderable {
  protected lines: WrappedLine[];

  constructor(
    type: string,
    lines: WrappedLine[],
    layout?: BaseLayoutProps,
    style?: BaseStyleProps,
  ) {
    super(type, layout, style);
    this.lines = lines;
  }

  setLines(lines: WrappedLine[]): this {
    this.lines = lines;
    this.invalidate(`${this.type}:lines`);
    return this;
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;

    for (let row = 0; row < Math.min(bounds.height, this.lines.length); row += 1) {
      renderTextBlock(
        buffer,
        { x: bounds.x, y: bounds.y + row, width: bounds.width, height: 1 },
        this.lines[row]?.spans ?? [],
        {
          clip: clipRect,
          fg: this.styleProps.fg,
          bg: this.styleProps.bg,
        },
      );
    }
  }
}

function isAncestor(candidate: Renderable, target: Renderable): boolean {
  let current: Renderable | null = target.parent;

  while (current) {
    if (current === candidate) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function renderTranslatedSubtree(
  node: Renderable,
  context: RenderContext,
  offsetX: number,
  offsetY: number,
): void {
  if (offsetX === 0 && offsetY === 0) {
    node.render(context);
    return;
  }

  const snapshots: Array<{ node: Renderable; state: LayoutState }> = [];
  translateSubtreeLayout(node, offsetX, offsetY, snapshots);

  try {
    node.render(context);
  } finally {
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      const snapshot = snapshots[index];

      if (!snapshot) {
        continue;
      }

      snapshot.node.layoutState = snapshot.state;
    }
  }
}

function translateSubtreeLayout(
  node: Renderable,
  offsetX: number,
  offsetY: number,
  snapshots: Array<{ node: Renderable; state: LayoutState }>,
): void {
  const parentClipRect = node.parent
    ? isScrollOffsetParent(node.parent)
      ? node.parent.layoutState.innerBounds
      : node.parent.layoutState.clipRect
    : node.layoutState.clipRect;
  const translatedBounds = {
    ...node.layoutState.bounds,
    x: node.layoutState.bounds.x + offsetX,
    y: node.layoutState.bounds.y + offsetY,
  };
  const translatedInnerBounds = {
    ...node.layoutState.innerBounds,
    x: node.layoutState.innerBounds.x + offsetX,
    y: node.layoutState.innerBounds.y + offsetY,
  };

  snapshots.push({
    node,
    state: node.layoutState,
  });
  node.layoutState = {
    ...node.layoutState,
    bounds: translatedBounds,
    innerBounds: translatedInnerBounds,
    clipRect:
      node.layoutProps.overflow === "visible"
        ? parentClipRect
        : intersectLayoutRects(parentClipRect, translatedBounds),
  };

  for (const child of node.children) {
    translateSubtreeLayout(child, offsetX, offsetY, snapshots);
  }
}

function intersectLayoutRects(left: Rect, right: Rect): Rect {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - x);
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - y);

  return { x, y, width, height };
}

function isScrollOffsetParent(node: Renderable): boolean {
  const offset = node.getChildLayoutOffset();
  return offset.x !== 0 || offset.y !== 0;
}
