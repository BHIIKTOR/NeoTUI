import {
  type ClipboardAccess,
  type ClipboardShortcutProfile,
  NativeClipboardAccess,
} from "./clipboard";
import { createFocusEvent, eventAliases, parseInput, type RenderEvent } from "./events";
import { FrameBuffer } from "./frame-buffer";
import { layoutTree } from "./layout";
import { BoxRenderable, type Renderable, type RenderContext } from "./renderable";
import {
  type RawModeInput,
  type SignalTarget,
  TerminalSession,
  type WritableOutput,
} from "./terminal-session";
import type { CursorState, ImageOperation, RenderDiff, RenderMetrics } from "./types";

export interface CreateKittyRendererOptions {
  appName?: string;
  exitOnCtrlC?: boolean;
  width?: number;
  height?: number;
  input?: RawModeInput;
  output?: WritableOutput;
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
  clipboard?: ClipboardAccess;
  signalTarget?: SignalTarget;
}

export class RootRenderable extends BoxRenderable {
  constructor() {
    super({
      layout: {
        width: "100%",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
      },
      style: {
        backgroundChar: " ",
      },
    });
  }
}

export class KittyRenderer {
  readonly milestone = "M10" as const;
  readonly runtime = "bun" as const;
  readonly terminalTarget = "kitty" as const;
  readonly appName: string;
  readonly exitOnCtrlC: boolean;
  readonly session: TerminalSession;
  readonly clipboard: ClipboardAccess;
  readonly root: RootRenderable;
  readonly metrics: RenderMetrics = {
    frameCount: 0,
    lastFrameDurationMs: 0,
    lastDirtyRows: [],
    lastDirtyCellCount: 0,
    lastInvalidatedIds: [],
    lastRenderedNodeCount: 0,
  };
  readonly invalidationReasons = new Map<string, string[]>();

  width: number;
  height: number;
  debugOverlayVisible = false;
  consoleOverlayVisible = false;
  consoleLines: string[] = [];
  consolePatchRestore: (() => void) | null = null;
  focusedNode: Renderable | null = null;
  hoverNode: Renderable | null = null;
  dragNode: Renderable | null = null;
  cursorState: CursorState | null = null;

  private previousFrame: FrameBuffer;
  private currentFrame: FrameBuffer;
  private dirtyIds = new Set<string>();
  private scheduled = false;
  private running = false;
  private paused = false;
  private liveRefs = 0;
  private liveTimer: ReturnType<typeof setTimeout> | null = null;
  private renderScheduledReason = "manual";
  private eventSubscribers = new Set<(event: RenderEvent) => void>();
  private resizeSubscribers = new Set<() => void>();
  private pendingResizeSync = false;
  private inputRelease: (() => void) | null = null;
  private resizeRelease: (() => void) | null = null;
  private currentImages: ImageOperation[] = [];
  private renderedVisibleImages = false;
  private readonly kittyImageIds = new Map<string, number>();
  private nextKittyImageId = 1;

  constructor(options: CreateKittyRendererOptions = {}) {
    this.appName = options.appName ?? "NeoTui";
    this.exitOnCtrlC = options.exitOnCtrlC ?? true;
    this.session = new TerminalSession({
      appName: this.appName,
      registerSignalHandlers: this.exitOnCtrlC,
      input: options.input,
      output: options.output,
      env: options.env,
      signalTarget: options.signalTarget,
    });
    this.clipboard =
      options.clipboard ??
      new NativeClipboardAccess({
        env: options.env ?? process.env,
        platform: options.platform ?? process.platform,
      });
    const initialSize = this.session.getTerminalSize();
    this.width = options.width ?? initialSize?.width ?? process.stdout.columns ?? 80;
    this.height = options.height ?? initialSize?.height ?? process.stdout.rows ?? 24;
    this.root = new RootRenderable();
    this.root.mount(this);
    this.currentFrame = new FrameBuffer(this.width, this.height);
    this.previousFrame = new FrameBuffer(this.width, this.height);
  }

  add(...children: Renderable[]): this {
    this.root.add(...children);
    return this;
  }

  subscribe(listener: (event: RenderEvent) => void): () => void {
    this.eventSubscribers.add(listener);
    return () => {
      this.eventSubscribers.delete(listener);
    };
  }

  subscribeToResize(listener: () => void): () => void {
    this.resizeSubscribers.add(listener);
    return () => {
      this.resizeSubscribers.delete(listener);
    };
  }

  invalidate(node: Renderable, reason: string): void {
    this.dirtyIds.add(node.id);
    const reasons = this.invalidationReasons.get(node.id) ?? [];
    reasons.push(reason);
    this.invalidationReasons.set(node.id, reasons);
    this.requestRender(reason);
  }

  requestRender(reason = "manual"): void {
    this.renderScheduledReason = reason;

    if (this.paused) {
      return;
    }

    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;

        if (!this.paused) {
          this.renderFrame();
        }
      });
    }
  }

  start(): this {
    this.session.activate();
    this.inputRelease = this.session.onInput((chunk) => {
      this.dispatchInput(chunk);
    });
    this.resizeRelease = this.session.onResize((size) => {
      this.resize(size.width, size.height);
    });
    this.running = true;

    const size = this.session.getTerminalSize();

    if (size) {
      this.resize(size.width, size.height);
    }

    this.requestRender("start");
    return this;
  }

  async stop(): Promise<void> {
    this.running = false;
    this.clearLiveTimer();
    this.inputRelease?.();
    this.inputRelease = null;
    this.resizeRelease?.();
    this.resizeRelease = null;
    await this.session.destroy();
  }

  pause(): this {
    this.paused = true;
    this.clearLiveTimer();
    return this;
  }

  resume(): this {
    this.paused = false;
    this.requestRender("resume");

    if (this.liveRefs > 0) {
      this.scheduleLiveTick();
    }

    return this;
  }

  requestLive(): this {
    this.liveRefs += 1;
    this.scheduleLiveTick();
    return this;
  }

  dropLive(): this {
    this.liveRefs = Math.max(0, this.liveRefs - 1);

    if (this.liveRefs === 0) {
      this.clearLiveTimer();
    }

    return this;
  }

  resize(width: number, height: number): this {
    const nextWidth = Math.max(1, width);
    const nextHeight = Math.max(1, height);
    const changed = nextWidth !== this.width || nextHeight !== this.height;

    if (!changed) {
      return this;
    }

    this.width = nextWidth;
    this.height = nextHeight;
    this.currentFrame = new FrameBuffer(this.width, this.height);
    this.previousFrame = new FrameBuffer(this.width, this.height);
    this.dirtyIds.add(this.root.id);
    this.invalidationReasons.set(this.root.id, [
      ...(this.invalidationReasons.get(this.root.id) ?? []),
      "resize",
    ]);
    this.pendingResizeSync = true;

    this.requestRender("resize");
    return this;
  }

  setCursorState(state: CursorState | null): this {
    this.cursorState = state;
    this.requestRender("cursor");
    return this;
  }

  writeClipboard(text: string): this {
    this.clipboard.writeText(text);
    this.session.protocol.writeClipboard(text);
    return this;
  }

  readClipboard(): string | null {
    return this.clipboard.readText();
  }

  getClipboardBindings(): ClipboardShortcutProfile {
    return this.clipboard.capabilities.bindings;
  }

  renderToBuffer(): FrameBuffer {
    layoutTree(this.root, { width: this.width, height: this.height });

    if (this.pendingResizeSync) {
      this.pendingResizeSync = false;
      for (const listener of this.resizeSubscribers) {
        listener();
      }
      layoutTree(this.root, { width: this.width, height: this.height });
    }

    const next = new FrameBuffer(this.width, this.height);
    const images: ImageOperation[] = [];
    const context: RenderContext = {
      buffer: next,
      renderer: this,
      images,
    };

    this.root.render(context);

    if (this.consoleOverlayVisible) {
      this.drawConsoleOverlay(next);
    }

    if (this.debugOverlayVisible) {
      this.drawDebugOverlay(next);
    }

    this.currentImages = images;
    return next;
  }

  renderToString(): string {
    return this.renderToBuffer().toLines().join("\n");
  }

  renderFrame(): RenderDiff {
    const startedAt = performance.now();
    this.currentFrame = this.renderToBuffer();
    const diff = diffBuffers(this.previousFrame, this.currentFrame);

    if (this.running && diff.changed) {
      this.flushDiff(this.currentFrame, diff);
    }

    this.previousFrame = this.currentFrame.clone();
    this.metrics.frameCount += 1;
    this.metrics.lastFrameDurationMs = performance.now() - startedAt;
    this.metrics.lastDirtyRows = diff.dirtyRows;
    this.metrics.lastDirtyCellCount = diff.dirtyCellCount;
    this.metrics.lastInvalidatedIds = [...this.dirtyIds];
    this.metrics.lastRenderedNodeCount = this.root.countNodes();
    this.dirtyIds.clear();
    this.invalidationReasons.clear();

    return diff;
  }

  dumpTree(node: Renderable = this.root, depth = 0): string {
    const indent = "  ".repeat(depth);
    const lines = [
      `${indent}${node.type}#${node.id} ${JSON.stringify(node.layoutState.bounds)} focusable=${node.isFocusable()}`,
    ];

    for (const child of node.children) {
      lines.push(this.dumpTree(child, depth + 1));
    }

    return lines.join("\n");
  }

  toggleDebugOverlay(force?: boolean): this {
    this.debugOverlayVisible = force ?? !this.debugOverlayVisible;
    this.requestRender("debug-overlay");
    return this;
  }

  toggleConsoleOverlay(force?: boolean): this {
    this.consoleOverlayVisible = force ?? !this.consoleOverlayVisible;
    this.requestRender("console-overlay");
    return this;
  }

  appendConsoleLine(line: string): void {
    this.consoleLines.push(line);
    this.consoleLines = this.consoleLines.slice(-8);
    this.requestRender("console-log");
  }

  captureConsole(): this {
    if (this.consolePatchRestore) {
      return this;
    }

    const original = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    const patch = (method: keyof typeof original) => {
      console[method] = (...args: unknown[]) => {
        this.appendConsoleLine(args.map(String).join(" "));

        if (!this.running) {
          original[method](...args);
        }
      };
    };

    patch("log");
    patch("info");
    patch("warn");
    patch("error");

    this.consolePatchRestore = () => {
      console.log = original.log;
      console.info = original.info;
      console.warn = original.warn;
      console.error = original.error;
    };

    return this;
  }

  releaseConsoleCapture(): this {
    this.consolePatchRestore?.();
    this.consolePatchRestore = null;
    return this;
  }

  focus(node: Renderable | null): this {
    if (node && !node.isFocusable()) {
      node = findFocusableDescendant(node) ?? findFocusableAncestor(node);
    }

    if (node === this.focusedNode) {
      return this;
    }

    const previous = this.focusedNode;
    this.focusedNode = node;

    if (previous) {
      this.dispatchEvent(previous, createFocusEvent("blur", previous, node));
    }

    if (node) {
      this.dispatchEvent(node, createFocusEvent("focus", node, previous));
    }

    this.requestRender("focus");
    return this;
  }

  focusNext(reverse = false): this {
    const focusables = this.collectFocusableNodes();

    if (focusables.length === 0) {
      this.focus(null);
      return this;
    }

    const currentIndex = this.focusedNode ? focusables.indexOf(this.focusedNode) : -1;
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + (reverse ? -1 : 1) + focusables.length) % focusables.length;

    this.focus(focusables[nextIndex] ?? null);
    return this;
  }

  dispatchInput(chunk: string): void {
    const events = parseInput(chunk);

    for (const event of events) {
      if (event.type === "key") {
        const target = this.focusedNode ?? this.root;
        this.dispatchEvent(target, event);

        if (
          !event.defaultPrevented &&
          this.exitOnCtrlC &&
          event.key === "c" &&
          event.modifiers.ctrl &&
          !event.modifiers.meta &&
          !event.modifiers.alt &&
          !event.modifiers.shift
        ) {
          void this.destroy();
          return;
        }

        if (!event.defaultPrevented && event.key === "Tab") {
          this.focusNext(event.modifiers.shift);
          event.preventDefault();
        }

        continue;
      }

      if (event.type === "paste") {
        const target = this.focusedNode ?? this.root;
        this.dispatchEvent(target, event);
        continue;
      }

      if (event.type === "mouse") {
        this.dispatchMouseEvent(event);
      }
    }
  }

  dispatchEvent(target: Renderable | null, event: RenderEvent): RenderEvent {
    const path = target ? target.ancestors() : [this.root];
    event.target = target;
    const mouseEvent = event.type === "mouse" ? event : null;
    const originalMousePosition = mouseEvent
      ? {
          x: mouseEvent.x,
          y: mouseEvent.y,
        }
      : null;

    for (const node of path) {
      if (mouseEvent && originalMousePosition) {
        const offset = this.getNodeLayoutOffset(node);
        mouseEvent.x = originalMousePosition.x - offset.x;
        mouseEvent.y = originalMousePosition.y - offset.y;
      }

      event.currentTarget = node;
      node.handleEvent(event);
      node.emit(event.type, event);

      for (const alias of eventAliases(event)) {
        node.emit(alias, event);
      }

      if (event.propagationStopped) {
        break;
      }
    }

    if (mouseEvent && originalMousePosition) {
      mouseEvent.x = originalMousePosition.x;
      mouseEvent.y = originalMousePosition.y;
    }

    for (const subscriber of this.eventSubscribers) {
      subscriber(event);
    }

    return event;
  }

  hitTest(
    x: number,
    y: number,
    node: Renderable = this.root,
    offsetX = 0,
    offsetY = 0,
  ): Renderable | null {
    const children = node.children
      .map((child, index) => ({ child, index }))
      .filter(({ child }) => child.isVisibleForLayout())
      .sort((left, right) => {
        const zIndexDelta =
          (right.child.layoutProps.zIndex ?? 0) - (left.child.layoutProps.zIndex ?? 0);
        if (zIndexDelta !== 0) {
          return zIndexDelta;
        }

        return right.index - left.index;
      })
      .map(({ child }) => child);
    const childOffset = node.getChildLayoutOffset();

    for (const child of children) {
      const hit = this.hitTest(x, y, child, offsetX + childOffset.x, offsetY + childOffset.y);

      if (hit) {
        return hit;
      }
    }

    return containsPointWithOffset(node, x, y, offsetX, offsetY) ? node : null;
  }

  async destroy(): Promise<void> {
    this.releaseConsoleCapture();
    await this.stop();
  }

  private dispatchMouseEvent(event: Extract<RenderEvent, { type: "mouse" }>): void {
    const target = this.hitTest(event.x, event.y);

    if (target !== this.hoverNode) {
      if (this.hoverNode) {
        this.dispatchEvent(
          this.hoverNode,
          createSyntheticMouseEvent("move", this.hoverNode, event, "mouseleave"),
        );
      }

      if (target) {
        this.dispatchEvent(target, createSyntheticMouseEvent("move", target, event, "mouseenter"));
      }

      this.hoverNode = target;
    }

    if (event.action === "down") {
      this.dragNode = target;
      this.focus(target);
      if (target) {
        this.dispatchEvent(target, createSyntheticMouseEvent("move", target, event, "dragstart"));
      }
    }

    if (event.action === "up") {
      if (this.dragNode) {
        this.dispatchEvent(
          this.dragNode,
          createSyntheticMouseEvent("move", this.dragNode, event, "dragend"),
        );
      }
      this.dragNode = null;
    }

    const dispatched = this.dispatchEvent(target, event);

    if (this.dragNode && event.action === "move") {
      this.dispatchEvent(
        this.dragNode,
        createSyntheticMouseEvent("move", this.dragNode, event, "dragmove"),
      );
    }

    if (!dispatched.defaultPrevented && event.action === "wheel") {
      const scrollTarget = findScrollableAncestor(target);

      if (
        scrollTarget &&
        "setScrollY" in scrollTarget &&
        typeof scrollTarget.setScrollY === "function"
      ) {
        const currentScroll =
          "scrollY" in scrollTarget && typeof scrollTarget.scrollY === "number"
            ? scrollTarget.scrollY
            : 0;
        scrollTarget.setScrollY(Math.max(0, currentScroll + event.wheelDelta));
      }
    }
  }

  private collectFocusableNodes(node: Renderable = this.root): Renderable[] {
    const nodes: Renderable[] = [];

    if (node.isFocusable() && node.isVisibleForLayout()) {
      nodes.push(node);
    }

    for (const child of node.children) {
      nodes.push(...this.collectFocusableNodes(child));
    }

    return nodes;
  }

  private getNodeLayoutOffset(node: Renderable): { x: number; y: number } {
    let current = node.parent;
    let x = 0;
    let y = 0;

    while (current) {
      const offset = current.getChildLayoutOffset();
      x += offset.x;
      y += offset.y;
      current = current.parent;
    }

    return { x, y };
  }

  private flushDiff(frame: FrameBuffer, diff: RenderDiff): void {
    if (diff.dirtyRows.length === 0) {
      return;
    }

    const flush = () => {
      for (const row of diff.dirtyRows) {
        this.session.protocol.write(`\u001b[${row + 1};1H`);
        this.writeStyledRow(frame, row);
      }

      if (this.currentImages.length > 0 || this.renderedVisibleImages) {
        this.session.protocol.deleteVisibleImages();
      }

      for (const image of this.currentImages) {
        if (image.bounds.width <= 0 || image.bounds.height <= 0) {
          continue;
        }

        this.session.protocol.writeKittyImage({
          imageId: this.resolveKittyImageId(image.imageId),
          source: image.source,
          width: image.bounds.width,
          height: image.bounds.height,
          x: image.bounds.x,
          y: image.bounds.y,
        });
      }

      this.renderedVisibleImages = this.currentImages.length > 0;

      if (this.cursorState) {
        this.session.protocol.setCursorStyle({
          shape: this.cursorState.shape,
          blink: this.cursorState.blink,
          color: this.cursorState.color,
          visible: this.cursorState.visible,
        });
        this.session.protocol.write(`\u001b[${this.cursorState.y + 1};${this.cursorState.x + 1}H`);
      }
    };

    if (this.session.capabilities.supportsSynchronizedUpdates) {
      this.session.protocol.withSynchronizedUpdate(flush);
    } else {
      flush();
    }
  }

  private writeStyledRow(frame: FrameBuffer, row: number): void {
    const cells = frame.getRow(row);
    let activeHref: string | undefined;
    let activeFg: string | undefined;
    let activeBg: string | undefined;
    let chunk = "";

    const flushChunk = () => {
      if (chunk.length > 0) {
        this.session.protocol.write(chunk);
        chunk = "";
      }
    };

    const applyColors = (fg?: string, bg?: string) => {
      if (fg === activeFg && bg === activeBg) {
        return;
      }

      const codes = [...toAnsiColorCodes(fg, false), ...toAnsiColorCodes(bg, true)];

      this.session.protocol.write(`\u001b[${codes.length > 0 ? codes.join(";") : "39;49"}m`);
      activeFg = fg;
      activeBg = bg;
    };

    this.session.protocol.write("\u001b[0m");

    for (const cell of cells) {
      if (cell.href !== activeHref || cell.fg !== activeFg || cell.bg !== activeBg) {
        flushChunk();

        if (activeHref) {
          this.session.protocol.closeHyperlink();
        }

        if (cell.href) {
          this.session.protocol.openHyperlink(cell.href);
        }

        activeHref = cell.href;
        applyColors(cell.fg, cell.bg);
      }

      chunk += cell.char;
    }

    flushChunk();

    if (activeHref) {
      this.session.protocol.closeHyperlink();
    }

    this.session.protocol.write("\u001b[0m");
  }

  private scheduleLiveTick(): void {
    if (this.liveRefs === 0 || this.paused || this.liveTimer) {
      return;
    }

    this.liveTimer = setTimeout(() => {
      this.liveTimer = null;
      this.requestRender("live");

      if (this.liveRefs > 0) {
        this.scheduleLiveTick();
      }
    }, 16);
  }

  private clearLiveTimer(): void {
    if (this.liveTimer) {
      clearTimeout(this.liveTimer);
      this.liveTimer = null;
    }
  }

  private drawDebugOverlay(buffer: FrameBuffer): void {
    const lines = [
      `frame=${this.metrics.frameCount} ms=${this.metrics.lastFrameDurationMs.toFixed(2)}`,
      `dirtyRows=${this.metrics.lastDirtyRows.join(",") || "none"}`,
      `dirtyCells=${this.metrics.lastDirtyCellCount}`,
      `focus=${this.focusedNode?.id ?? "none"}`,
      `reason=${this.renderScheduledReason}`,
    ];

    const startY = Math.max(0, this.height - lines.length);

    for (let index = 0; index < lines.length; index += 1) {
      buffer.drawText(0, startY + index, lines[index] ?? "", this.width);
    }
  }

  private drawConsoleOverlay(buffer: FrameBuffer): void {
    const overlayHeight = Math.min(8, this.height);
    const overlayY = Math.max(0, this.height - overlayHeight);

    buffer.fill(
      { char: " ", bg: "#191512" },
      {
        x: 0,
        y: overlayY,
        width: this.width,
        height: overlayHeight,
      },
    );
    buffer.drawBorder({ x: 0, y: overlayY, width: this.width, height: overlayHeight }, "console", {
      fg: "#f0c674",
      bg: "#191512",
      titleFg: "#ffd27d",
    });

    const lines = this.consoleLines.slice(-Math.max(0, overlayHeight - 2));

    for (let index = 0; index < lines.length; index += 1) {
      buffer.drawText(1, overlayY + 1 + index, lines[index] ?? "", this.width - 2, {
        fg: "#f5e9d4",
        bg: "#191512",
      });
    }
  }

  private resolveKittyImageId(imageId: string): number {
    const existing = this.kittyImageIds.get(imageId);

    if (existing) {
      return existing;
    }

    const next = this.nextKittyImageId;
    this.nextKittyImageId += 1;
    this.kittyImageIds.set(imageId, next);
    return next;
  }
}

export function createKittyRenderer(options: CreateKittyRendererOptions = {}): KittyRenderer {
  return new KittyRenderer(options);
}

export function createMinimalRendererTree(): KittyRenderer {
  const renderer = createKittyRenderer({ width: 48, height: 16 });
  renderer.root.updateLayout({ gap: 1, padding: 1 });
  return renderer;
}

function diffBuffers(previous: FrameBuffer, next: FrameBuffer): RenderDiff {
  const maxHeight = Math.max(previous.height, next.height);
  const dirtyRows: number[] = [];
  let dirtyCellCount = 0;

  for (let y = 0; y < maxHeight; y += 1) {
    const left = previous.getRow(y);
    const right = next.getRow(y);
    let rowDirty = false;
    const maxWidth = Math.max(left.length, right.length);

    for (let x = 0; x < maxWidth; x += 1) {
      const previousCell = left[x] ?? { char: " " };
      const nextCell = right[x] ?? { char: " " };

      if (
        previousCell.char !== nextCell.char ||
        previousCell.href !== nextCell.href ||
        previousCell.title !== nextCell.title ||
        previousCell.fg !== nextCell.fg ||
        previousCell.bg !== nextCell.bg
      ) {
        rowDirty = true;
        dirtyCellCount += 1;
      }
    }

    if (rowDirty) {
      dirtyRows.push(y);
    }
  }

  return {
    dirtyRows,
    dirtyCellCount,
    changed: dirtyRows.length > 0,
  };
}

function findFocusableAncestor(node: Renderable | null): Renderable | null {
  let current = node?.parent ?? null;

  while (current) {
    if (current.isFocusable()) {
      return current;
    }

    current = current.parent;
  }

  return null;
}

function findFocusableDescendant(node: Renderable): Renderable | null {
  if (node.isFocusable()) {
    return node;
  }

  for (const child of node.children) {
    const found = findFocusableDescendant(child);

    if (found) {
      return found;
    }
  }

  return null;
}

function findScrollableAncestor(node: Renderable | null): Renderable | null {
  let current = node;

  while (current) {
    if ("scrollY" in current && typeof current.scrollY === "number") {
      return current;
    }

    current = current.parent;
  }

  return null;
}

function createSyntheticMouseEvent(
  action: "move",
  target: Renderable,
  source: Extract<RenderEvent, { type: "mouse" }>,
  alias: "dragend" | "dragmove" | "dragstart" | "mouseenter" | "mouseleave",
): RenderEvent {
  const event: RenderEvent = {
    ...source,
    target,
    currentTarget: target,
    preventDefault() {
      source.preventDefault();
      this.defaultPrevented = true;
    },
    stopPropagation() {
      source.stopPropagation();
      this.propagationStopped = true;
    },
    action,
  };

  Object.defineProperty(event, "type", {
    value: "mouse",
    enumerable: true,
  });
  Object.defineProperty(event, "alias", {
    value: alias,
    enumerable: false,
  });

  return event;
}

function containsPointWithOffset(
  node: Renderable,
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
): boolean {
  const { bounds } = node.layoutState;

  return (
    x >= bounds.x + offsetX &&
    y >= bounds.y + offsetY &&
    x < bounds.x + offsetX + bounds.width &&
    y < bounds.y + offsetY + bounds.height &&
    node.isVisibleForLayout()
  );
}

function toAnsiColorCodes(color: string | undefined, background: boolean): string[] {
  if (!color) {
    return [background ? "49" : "39"];
  }

  const hex = normalizeHexColor(color);

  if (!hex) {
    return [background ? "49" : "39"];
  }

  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;

  return [background ? "48" : "38", "2", String(red), String(green), String(blue)];
}

function normalizeHexColor(color: string): string | null {
  const value = color.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }

  return null;
}
