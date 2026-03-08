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

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
  badge?: string;
}

export interface TabsRenderableOptions {
  tabs: TabItem[];
  activeTabId: string;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class TabsRenderable extends Renderable {
  tabs: TabItem[];
  activeIndex: number;
  focusedIndex: number;
  orientation: NonNullable<TabsRenderableOptions["orientation"]>;
  activationMode: NonNullable<TabsRenderableOptions["activationMode"]>;
  focused = false;

  constructor(options: TabsRenderableOptions) {
    super("tabs", options.layout, {
      focusable: true,
      fg: defaultComponentTheme.fg,
      bg: defaultComponentTheme.surfaceBg,
      borderFg: defaultComponentTheme.border,
      titleFg: defaultComponentTheme.borderStrong,
      ...options.style,
    });
    this.tabs = options.tabs;
    this.activeIndex = this.findIndexById(options.activeTabId);
    this.focusedIndex = this.activeIndex;
    this.orientation = options.orientation ?? "horizontal";
    this.activationMode = options.activationMode ?? "automatic";
  }

  getActiveTabId(): string | undefined {
    return this.tabs[this.activeIndex]?.id;
  }

  setActiveTab(id: string): this {
    const nextIndex = this.findIndexById(id);
    if (nextIndex === this.activeIndex) {
      return this;
    }

    const previousIndex = this.activeIndex;
    this.activeIndex = nextIndex;
    this.focusedIndex = nextIndex;
    this.emitChange(previousIndex);
    this.invalidate("tabs:active");
    return this;
  }

  focusTab(id: string): this {
    this.focusedIndex = this.findIndexById(id);
    this.invalidate("tabs:focus");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    if (this.orientation === "vertical") {
      const width = this.tabs.reduce(
        (max, tab) => Math.max(max, measureTextWidth(this.renderTabLabel(tab))),
        0,
      );
      return {
        width: Math.max(measured.width, width),
        height: Math.max(measured.height, this.tabs.length),
      };
    }

    const width = this.tabs.reduce(
      (total, tab) => total + measureTextWidth(this.renderTabLabel(tab)) + 1,
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
      this.invalidate("tabs:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("tabs:blur");
      return;
    }

    if (event.type === "mouse" && event.action === "down") {
      const index = this.tabIndexAt(event.x, event.y);
      if (index === null || this.tabs[index]?.disabled) {
        return;
      }

      this.focusedIndex = index;
      if (this.activationMode === "automatic") {
        this.activateFocused();
      } else {
        this.invalidate("tabs:focus");
      }
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const delta =
      this.orientation === "vertical"
        ? event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowUp"
            ? -1
            : 0
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowLeft"
            ? -1
            : 0;

    if (delta !== 0) {
      this.moveFocus(delta);
      if (this.activationMode === "automatic") {
        this.activateFocused();
      } else {
        this.invalidate("tabs:focus-move");
      }
      event.preventDefault();
      return;
    }

    if (event.key === "Home") {
      this.focusedIndex = this.findNextEnabled(0, 1);
      if (this.activationMode === "automatic") {
        this.activateFocused();
      } else {
        this.invalidate("tabs:home");
      }
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      this.focusedIndex = this.findNextEnabled(this.tabs.length - 1, -1);
      if (this.activationMode === "automatic") {
        this.activateFocused();
      } else {
        this.invalidate("tabs:end");
      }
      event.preventDefault();
      return;
    }

    if (
      (event.key === "Enter" || event.key === " " || event.key === "Space") &&
      this.activationMode === "manual"
    ) {
      this.activateFocused();
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

    if (this.orientation === "vertical") {
      let y = bounds.y;
      for (
        let index = 0;
        index < this.tabs.length && y < bounds.y + bounds.height;
        index += 1, y += 1
      ) {
        const tab = this.tabs[index];
        if (!tab) {
          continue;
        }

        const colors = this.resolveTabColors(index);
        renderTextBlock(
          buffer,
          { x: bounds.x, y, width: bounds.width, height: 1 },
          this.renderTabLabel(tab),
          {
            clip: clipRect,
            fg: colors.fg,
            bg: colors.bg,
            wrapMode: "none",
          },
        );
      }
      return;
    }

    let x = bounds.x;
    for (let index = 0; index < this.tabs.length && x < bounds.x + bounds.width; index += 1) {
      const tab = this.tabs[index];
      if (!tab) {
        continue;
      }

      const label = this.renderTabLabel(tab);
      const colors = this.resolveTabColors(index);
      renderTextBlock(
        buffer,
        { x, y: bounds.y, width: Math.max(0, bounds.x + bounds.width - x), height: 1 },
        label,
        {
          clip: clipRect,
          fg: colors.fg,
          bg: colors.bg,
          wrapMode: "none",
        },
      );
      x += measureTextWidth(label) + 1;
    }
  }

  private activateFocused(): void {
    if (this.tabs[this.focusedIndex]?.disabled) {
      return;
    }

    const previousIndex = this.activeIndex;
    this.activeIndex = this.focusedIndex;
    if (previousIndex !== this.activeIndex) {
      this.emitChange(previousIndex);
    }
    this.invalidate("tabs:activate");
  }

  private moveFocus(delta: 1 | -1): void {
    const start = this.focusedIndex + delta;
    this.focusedIndex = this.findNextEnabled(start, delta);
  }

  private findNextEnabled(start: number, delta: 1 | -1): number {
    if (this.tabs.length === 0) {
      return 0;
    }

    let index = Math.max(0, Math.min(start, this.tabs.length - 1));
    for (let attempts = 0; attempts < this.tabs.length; attempts += 1) {
      const tab = this.tabs[index];
      if (tab && tab.disabled !== true) {
        return index;
      }

      index = (index + delta + this.tabs.length) % this.tabs.length;
    }

    return this.activeIndex;
  }

  private findIndexById(id: string): number {
    const index = this.tabs.findIndex((tab) => tab.id === id && tab.disabled !== true);
    if (index !== -1) {
      return index;
    }

    return this.findNextEnabled(0, 1);
  }

  private emitChange(previousIndex: number): void {
    const event = createSyntheticEvent({
      type: "change",
      value: {
        id: this.tabs[this.activeIndex]?.id,
        index: this.activeIndex,
      },
      previousValue: {
        id: this.tabs[previousIndex]?.id,
        index: previousIndex,
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private resolveTabColors(index: number) {
    const tab = this.tabs[index];
    if (!tab) {
      return {
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      };
    }

    if (tab.disabled) {
      return {
        fg: defaultComponentTheme.muted,
        bg: this.styleProps.bg,
      };
    }

    if (index === this.activeIndex) {
      return {
        fg: defaultComponentTheme.ink,
        bg: this.styleProps.titleFg ?? defaultComponentTheme.borderStrong,
      };
    }

    if (this.focused && index === this.focusedIndex) {
      return {
        fg: this.styleProps.fg,
        bg: this.styleProps.borderFg ?? defaultComponentTheme.surfaceAltBg,
      };
    }

    return {
      fg: this.styleProps.fg,
      bg: this.styleProps.bg,
    };
  }

  private renderTabLabel(tab: TabItem): string {
    const suffix = tab.badge ? ` ${tab.badge}` : "";
    return ` ${tab.label}${suffix} `;
  }

  private tabIndexAt(x: number, y: number): number | null {
    const { bounds } = this.layoutState;
    if (
      x < bounds.x ||
      y < bounds.y ||
      x >= bounds.x + bounds.width ||
      y >= bounds.y + bounds.height
    ) {
      return null;
    }

    if (this.orientation === "vertical") {
      const index = y - bounds.y;
      return index >= 0 && index < this.tabs.length ? index : null;
    }

    let cursor = bounds.x;
    for (let index = 0; index < this.tabs.length; index += 1) {
      const width = measureTextWidth(
        this.renderTabLabel(this.tabs[index] ?? { id: "", label: "" }),
      );
      if (x >= cursor && x < cursor + width) {
        return index;
      }
      cursor += width + 1;
    }

    return null;
  }
}
