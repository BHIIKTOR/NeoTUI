import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  type ChangeEvent,
  ScrollBoxRenderable,
} from "@neotui/core";
import { findFirstFocusableNode } from "./internal/focus";
import { defaultComponentTheme } from "./theme";
import type { WindowRenderable } from "./window";

export interface WindowManagerRenderableOptions {
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface WindowRecord {
  window: WindowRenderable;
  dispose: Array<() => void>;
}

interface MinimizedPlacement {
  record: WindowRecord;
  width: number;
  row: number;
  left: number;
}

interface OrderedWindowRecord {
  record: WindowRecord;
  order: number;
}

export class WindowManagerRenderable extends BoxRenderable {
  private readonly windows = new Map<string, WindowRecord>();
  private readonly stack: string[] = [];
  private activeWindowId: string | null = null;

  constructor(options: WindowManagerRenderableOptions = {}) {
    super({
      layout: {
        width: "100%",
        height: "100%",
        overflow: "visible",
        ...options.layout,
      },
      style: {
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    });
  }

  addWindow(window: WindowRenderable): this {
    if (this.windows.has(window.id)) {
      return this;
    }

    super.add(window);
    const record: WindowRecord = {
      window,
      dispose: [],
    };
    this.windows.set(window.id, record);
    this.stack.push(window.id);
    this.attachWindowListeners(record);

    if (window.active || this.activeWindowId === null) {
      this.activate(window.id);
    } else {
      this.syncWindows();
    }

    return this;
  }

  removeWindow(windowId: string): this {
    const record = this.windows.get(windowId);
    if (!record) {
      return this;
    }

    record.dispose.forEach((dispose) => {
      dispose();
    });
    this.windows.delete(windowId);
    const stackIndex = this.stack.indexOf(windowId);
    if (stackIndex !== -1) {
      this.stack.splice(stackIndex, 1);
    }
    if (record.window.parent === this) {
      super.remove(record.window);
    }

    if (this.activeWindowId === windowId) {
      this.activeWindowId = this.resolveNextActiveWindow(windowId);
    }

    this.syncWindows();
    this.focusActiveWindow();
    return this;
  }

  activate(windowId: string): this {
    const record = this.windows.get(windowId);
    if (!record) {
      return this;
    }

    if (record.window.minimized) {
      record.window.restore();
    }

    this.activeWindowId = windowId;
    this.moveWindowToFront(windowId);
    this.syncWindows();
    this.focusActiveWindow();
    return this;
  }

  bringToFront(windowId: string): this {
    if (!this.windows.has(windowId)) {
      return this;
    }

    this.moveWindowToFront(windowId);
    this.syncWindows();
    return this;
  }

  minimize(windowId: string): this {
    this.windows.get(windowId)?.window.minimize();
    return this;
  }

  maximize(windowId: string): this {
    this.windows.get(windowId)?.window.maximize();
    return this;
  }

  restore(windowId: string): this {
    this.windows.get(windowId)?.window.restore();
    return this;
  }

  getActiveWindowId(): string | null {
    return this.activeWindowId;
  }

  protected override paint(): void {}

  private attachWindowListeners(record: WindowRecord): void {
    const { window } = record;
    const onActivate = (event: ChangeEvent<Record<string, unknown>>) => {
      if (event.value.active !== true) {
        return;
      }

      this.activate(window.id);
    };
    const onClose = () => {
      this.removeWindow(window.id);
    };
    const onRestoreRequest = () => {
      this.activate(window.id);
    };
    const onMinimize = () => {
      if (this.activeWindowId === window.id) {
        this.activeWindowId = this.resolveNextActiveWindow(window.id);
      }
      this.syncWindows();
      this.focusActiveWindow();
    };
    const onMaximize = () => {
      this.activeWindowId = window.id;
      this.moveWindowToFront(window.id);
      this.syncWindows();
      this.focusActiveWindow();
    };
    const onRestore = () => {
      this.activeWindowId = window.id;
      this.moveWindowToFront(window.id);
      this.syncWindows();
      this.focusActiveWindow();
    };

    window.on("activate", onActivate);
    window.on("close", onClose);
    window.on("restore-request", onRestoreRequest);
    window.on("minimize", onMinimize);
    window.on("maximize", onMaximize);
    window.on("restore", onRestore);

    record.dispose.push(
      () => window.off("activate", onActivate),
      () => window.off("close", onClose),
      () => window.off("restore-request", onRestoreRequest),
      () => window.off("minimize", onMinimize),
      () => window.off("maximize", onMaximize),
      () => window.off("restore", onRestore),
    );
  }

  private moveWindowToFront(windowId: string): void {
    const index = this.stack.indexOf(windowId);
    if (index !== -1) {
      this.stack.splice(index, 1);
    }
    this.stack.push(windowId);
  }

  private syncWindows(): void {
    const activeId = this.activeWindowId;
    const minimized: WindowRecord[] = [];
    const documents: OrderedWindowRecord[] = [];
    const utilities: OrderedWindowRecord[] = [];

    this.stack.forEach((windowId, index) => {
      const record = this.windows.get(windowId);
      if (!record) {
        return;
      }

      if (record.window.minimized && record.window.styleProps.visible !== false) {
        minimized.push(record);
        return;
      }

      if (record.window.role === "utility") {
        utilities.push({ record, order: index });
        return;
      }

      documents.push({ record, order: index });
    });

    this.syncVisibleWindows(documents, activeId, DOCUMENT_WINDOW_Z_INDEX_BASE);
    this.syncVisibleWindows(utilities, activeId, UTILITY_WINDOW_Z_INDEX_BASE);

    const minimizedViewport = this.resolveMinimizedViewport();
    const minimizedPlacements = this.createMinimizedPlacements(
      minimized,
      minimizedViewport.left,
      minimizedViewport.width,
    );
    for (const placement of minimizedPlacements) {
      const top = Math.max(
        minimizedViewport.top,
        minimizedViewport.top +
          minimizedViewport.height -
          MINIMIZED_WINDOW_HEIGHT -
          placement.row * (MINIMIZED_WINDOW_HEIGHT + MINIMIZED_WINDOW_GAP),
      );

      placement.record.window.updateLayout({
        left: placement.left,
        top,
        width: placement.width,
        height: MINIMIZED_WINDOW_HEIGHT,
        zIndex: MINIMIZED_WINDOW_Z_INDEX_BASE + placement.row,
      });
      placement.record.window.setActive(false);
    }
  }

  private syncVisibleWindows(
    records: OrderedWindowRecord[],
    activeId: string | null,
    zIndexBase: number,
  ): void {
    for (const { record, order } of records) {
      const visible = record.window.isVisibleForLayout();
      record.window.updateLayout({
        zIndex: visible ? zIndexBase + order * 10 : 0,
      });
      record.window.setActive(visible && record.window.id === activeId);
    }
  }

  private resolveNextActiveWindow(excludingId?: string): string | null {
    for (let index = this.stack.length - 1; index >= 0; index -= 1) {
      const windowId = this.stack[index];
      if (!windowId || windowId === excludingId) {
        continue;
      }

      const record = this.windows.get(windowId);
      if (record && !record.window.minimized && record.window.isVisibleForLayout()) {
        return windowId;
      }
    }

    return null;
  }

  private focusActiveWindow(): void {
    const active = this.activeWindowId
      ? (this.windows.get(this.activeWindowId)?.window ?? null)
      : null;
    if (!active || !this.renderer) {
      return;
    }

    const focusTarget = findFirstFocusableNode(active, { includeRoot: true }) ?? active;
    this.renderer.focus(focusTarget);
  }

  private resolveMinimizedViewport(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    const scrollParent = this.findNearestScrollParent();
    if (!scrollParent) {
      return {
        left: 0,
        top: 0,
        width: this.layoutState.innerBounds.width,
        height: this.layoutState.innerBounds.height,
      };
    }

    const scrollPosition = getScrollParentPosition(scrollParent);
    const localOffsetX = this.layoutState.innerBounds.x - scrollParent.layoutState.innerBounds.x;
    const localOffsetY = this.layoutState.innerBounds.y - scrollParent.layoutState.innerBounds.y;

    return {
      left: Math.max(0, scrollPosition.x - localOffsetX),
      top: Math.max(0, scrollPosition.y - localOffsetY),
      width: scrollParent.layoutState.innerBounds.width,
      height: scrollParent.layoutState.innerBounds.height,
    };
  }

  private findNearestScrollParent(): ScrollBoxRenderable | null {
    let current = this.parent;

    while (current) {
      if (current instanceof ScrollBoxRenderable) {
        return current;
      }

      current = current.parent;
    }

    return null;
  }

  private createMinimizedPlacements(
    records: WindowRecord[],
    leftOffset = 0,
    availableWidth = this.layoutState.innerBounds.width,
  ): MinimizedPlacement[] {
    const placements: MinimizedPlacement[] = [];
    let row = 0;
    let cursorX = 0;

    for (const record of records) {
      const width = record.window.measureMinimizedWidth(availableWidth);
      const requiredWidth = placements.some((placement) => placement.row === row)
        ? width + MINIMIZED_WINDOW_GAP
        : width;

      if (cursorX > 0 && cursorX + requiredWidth > availableWidth) {
        row += 1;
        cursorX = 0;
      }

      placements.push({
        record,
        width,
        row,
        left: leftOffset + cursorX,
      });
      cursorX += width + MINIMIZED_WINDOW_GAP;
    }

    return placements;
  }
}

function getScrollParentPosition(scrollParent: ScrollBoxRenderable): { x: number; y: number } {
  const position =
    "getScrollPosition" in scrollParent && typeof scrollParent.getScrollPosition === "function"
      ? scrollParent.getScrollPosition()
      : { x: 0, y: scrollParent.scrollY };

  return {
    x: typeof position.x === "number" ? position.x : 0,
    y: typeof position.y === "number" ? position.y : scrollParent.scrollY,
  };
}

const MINIMIZED_WINDOW_GAP = 1;
const MINIMIZED_WINDOW_HEIGHT = 3;
const DOCUMENT_WINDOW_Z_INDEX_BASE = 20;
const UTILITY_WINDOW_Z_INDEX_BASE = 140;
const MINIMIZED_WINDOW_Z_INDEX_BASE = 260;
