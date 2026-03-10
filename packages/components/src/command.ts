import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  measureTextWidth,
  type Rect,
  Renderable,
  type RenderEvent,
  renderTextBlock,
  resolveDimension,
  TextRenderable,
} from "@neotui/core";
import { InputControlRenderable } from "./input";
import { isNodeWithin } from "./internal/focus";
import { PanelRenderable } from "./panel";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  group?: string;
  shortcut?: string;
  disabled?: boolean;
  pinned?: boolean;
}

export interface CommandRenderableOptions {
  items: CommandItem[];
  placeholder?: string;
  maxResults?: number;
  recentIds?: string[];
  recentLimit?: number;
  open?: boolean;
  variant?: "overlay" | "inline";
  previewTitle?: string;
  renderPreview?: (item: CommandItem | null) => string | null | undefined;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface CommandListEntry {
  kind: "group" | "item";
  label: string;
  item?: CommandItem;
  itemIndex?: number;
}

class CommandListRenderable extends Renderable {
  entries: CommandListEntry[] = [];
  selectedIndex = 0;
  scrollOffset = 0;

  constructor() {
    super(
      "command-list",
      {
        height: 6,
        minHeight: 4,
      },
      {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.fg,
      },
    );
  }

  setEntries(entries: CommandListEntry[], selectedIndex: number): this {
    this.entries = entries;
    this.selectedIndex = selectedIndex;
    this.ensureSelectionVisible();
    this.invalidate("command-list:entries");
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type !== "mouse" || event.action !== "down" || event.button !== "left") {
      return;
    }

    const index = this.entryIndexAt(event.y);
    const entry = index === null ? null : this.entries[index];
    if (!entry?.item || entry.item.disabled) {
      return;
    }

    const selectEvent = createSyntheticEvent({
      type: "select",
      value: {
        item: entry.item,
        itemIndex: entry.itemIndex ?? 0,
      },
    } as const);
    selectEvent.target = this;
    selectEvent.currentTarget = this;
    this.emit("select", selectEvent as never);
    event.preventDefault();
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const width = this.entries.reduce((max, entry) => {
      if (entry.kind === "group") {
        return Math.max(max, measureTextWidth(entry.label));
      }

      const shortcutWidth = entry.item?.shortcut ? measureTextWidth(entry.item.shortcut) + 1 : 0;
      const subtitleWidth = entry.item?.subtitle ? measureTextWidth(` ${entry.item.subtitle}`) : 0;
      return Math.max(max, measureTextWidth(entry.label) + shortcutWidth + subtitleWidth);
    }, 18);

    return {
      width: Math.max(measured.width, width),
      height: Math.max(measured.height, Math.min(10, this.entries.length || 1)),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    buffer.fill(
      {
        char: " ",
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
      },
      bounds,
    );

    const visibleHeight = Math.max(1, bounds.height);
    for (let row = 0; row < visibleHeight; row += 1) {
      const entry = this.entries[this.scrollOffset + row];
      const y = bounds.y + row;

      if (!entry) {
        continue;
      }

      if (entry.kind === "group") {
        renderTextBlock(
          buffer,
          { x: bounds.x, y, width: bounds.width, height: 1 },
          entry.label.toUpperCase(),
          {
            clip: clipRect,
            fg: defaultComponentTheme.title,
            bg: defaultComponentTheme.surfaceBg,
            wrapMode: "none",
          },
        );
        continue;
      }

      const selected = this.selectedIndex === (entry.itemIndex ?? -1);
      const bg = selected ? defaultComponentTheme.borderStrong : defaultComponentTheme.surfaceBg;
      const fg = entry.item?.disabled
        ? defaultComponentTheme.muted
        : selected
          ? defaultComponentTheme.ink
          : defaultComponentTheme.fg;

      buffer.fill(
        {
          char: " ",
          fg,
          bg,
        },
        {
          x: bounds.x,
          y,
          width: bounds.width,
          height: 1,
        },
      );

      const left = `${selected ? "› " : "  "}${entry.label}`;
      const shortcut = entry.item?.shortcut ?? "";
      const leftWidth = Math.max(0, bounds.width - (shortcut ? measureTextWidth(shortcut) + 1 : 0));
      renderTextBlock(
        buffer,
        { x: bounds.x, y, width: leftWidth, height: 1 },
        truncateText(left, leftWidth),
        {
          clip: clipRect,
          fg,
          bg,
          wrapMode: "none",
        },
      );

      if (shortcut) {
        const shortcutX = bounds.x + bounds.width - measureTextWidth(shortcut);
        renderTextBlock(
          buffer,
          { x: shortcutX, y, width: bounds.width - (shortcutX - bounds.x), height: 1 },
          shortcut,
          {
            clip: clipRect,
            fg: defaultComponentTheme.muted,
            bg,
            wrapMode: "none",
          },
        );
      }
    }

    if (this.entries.length === 0) {
      renderTextBlock(buffer, bounds, "No matches", {
        clip: clipRect,
        fg: defaultComponentTheme.muted,
        bg: defaultComponentTheme.surfaceBg,
        wrapMode: "none",
      });
    }
  }

  private ensureSelectionVisible(): void {
    const entryIndex = this.entries.findIndex((entry) => entry.itemIndex === this.selectedIndex);
    if (entryIndex === -1) {
      this.scrollOffset = 0;
      return;
    }

    const visibleHeight = Math.max(1, this.layoutState.bounds.height || 8);
    if (entryIndex < this.scrollOffset) {
      this.scrollOffset = entryIndex;
      return;
    }

    if (entryIndex >= this.scrollOffset + visibleHeight) {
      this.scrollOffset = Math.max(0, entryIndex - visibleHeight + 1);
    }
  }

  private entryIndexAt(y: number): number | null {
    if (!this.containsPoint(this.layoutState.bounds.x, y)) {
      return null;
    }

    const local = y - this.layoutState.bounds.y;
    if (local < 0 || local >= this.layoutState.bounds.height) {
      return null;
    }

    return this.scrollOffset + local;
  }
}

export class CommandRenderable extends BoxRenderable {
  readonly backdrop: BoxRenderable;
  readonly panel: PanelRenderable;
  readonly queryInput: InputControlRenderable;
  readonly list: CommandListRenderable;
  readonly preview: PanelRenderable;
  readonly previewText: TextRenderable;
  readonly hint: BoxRenderable;

  items: CommandItem[];
  placeholder: string;
  maxResults: number;
  recentIds: string[];
  recentLimit: number;
  variant: NonNullable<CommandRenderableOptions["variant"]>;
  previewTitle: string;
  renderPreview?: (item: CommandItem | null) => string | null | undefined;
  selectedIndex = 0;
  query = "";

  private restoreTarget: Renderable | null = null;
  private unsubscribeGlobal: (() => void) | null = null;
  private unsubscribeResize: (() => void) | null = null;
  private syncingQueryInput = false;

  constructor(options: CommandRenderableOptions) {
    const variant = options.variant ?? "overlay";
    super({
      layout:
        variant === "overlay"
          ? {
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              overflow: "visible",
              ...options.layout,
            }
          : {
              overflow: "visible",
              ...options.layout,
            },
      style: {
        visible: variant === "inline" ? true : (options.open ?? false),
        bg: "#000000",
        focusable: variant === "overlay",
        ...options.style,
      },
    });
    this.items = options.items;
    this.placeholder = options.placeholder ?? "Type a command";
    this.maxResults = Math.max(1, options.maxResults ?? 8);
    this.recentLimit = Math.max(0, options.recentLimit ?? 5);
    this.recentIds = sanitizeRecentIds(options.recentIds ?? [], this.items, this.recentLimit);
    this.variant = variant;
    this.previewTitle = options.previewTitle ?? "Preview";
    this.renderPreview = options.renderPreview;

    this.backdrop = new BoxRenderable({
      layout:
        variant === "overlay"
          ? {
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
            }
          : {
              height: 0,
            },
      style: {
        visible: variant === "overlay",
        bg: "#0f0a08",
      },
    });
    this.panel = new PanelRenderable({
      title: "Command",
      tone: "accent",
      layout:
        variant === "overlay"
          ? {
              position: "absolute",
              width: "62%",
              height: 14,
              zIndex: 1,
            }
          : {
              width: "100%",
              height: 14,
            },
    });
    this.queryInput = new InputControlRenderable({
      placeholder: this.placeholder,
      width: "fill",
      type: "search",
    });
    this.list = new CommandListRenderable();
    this.preview = new PanelRenderable({
      title: this.previewTitle,
      tone: "info",
      contentMode: "grow",
      layout: { height: 0 },
      style: {
        visible: false,
      },
    });
    this.previewText = new TextRenderable({
      content: "",
      wrapMode: "word",
      layout: { height: 0 },
      style: {
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
      },
    });
    this.hint = new BoxRenderable({
      content: "Enter selects | Esc closes | arrows navigate",
      layout: { height: 1 },
      style: {
        fg: defaultComponentTheme.muted,
        bg: defaultComponentTheme.surfaceBg,
      },
    });

    super.add(this.backdrop, this.panel);
    this.preview.add(this.previewText);
    this.panel.add(this.queryInput, this.list, this.preview, this.hint);

    this.queryInput.on("change", (event) => {
      if (this.syncingQueryInput) {
        return;
      }
      const detail = event as { value: string };
      this.setQuery(detail.value, { syncInput: false });
    });
    this.queryInput.on("submit", () => {
      this.submitSelected();
    });
    this.queryInput.on("key", (event) => {
      const renderEvent = event as RenderEvent;
      if (renderEvent.type !== "key") {
        return;
      }

      const items = this.filteredItems();
      switch (renderEvent.key) {
        case "ArrowDown":
          this.moveSelection(items, 1);
          renderEvent.preventDefault();
          renderEvent.stopPropagation();
          return;
        case "ArrowUp":
          this.moveSelection(items, -1);
          renderEvent.preventDefault();
          renderEvent.stopPropagation();
          return;
        case "Escape":
          if (this.variant === "overlay") {
            this.close();
            renderEvent.preventDefault();
            renderEvent.stopPropagation();
          }
          return;
        case "Tab":
          if (this.variant === "overlay") {
            this.focusQueryInput();
            renderEvent.preventDefault();
            renderEvent.stopPropagation();
          }
          return;
        default:
          return;
      }
    });
    this.list.on("select", (event) => {
      const detail = (event as { value: { itemIndex: number } }).value;
      this.selectedIndex = detail.itemIndex;
      this.submitSelected();
    });
    this.backdrop.on("mousedown", (event) => {
      if (this.variant === "overlay") {
        this.close();
        event.preventDefault();
      }
    });

    this.syncLayout();
    this.syncResults();
  }

  isOpen(): boolean {
    return this.styleProps.visible === true;
  }

  open(): this {
    if (this.variant === "inline") {
      this.queryInput.focus();
      return this;
    }

    if (this.isOpen()) {
      if (this.renderer?.focusedNode && !isNodeWithin(this.renderer.focusedNode, this)) {
        this.restoreTarget = this.renderer.focusedNode;
      }
      this.syncLayout();
      this.focusQueryInput();
      return this;
    }

    this.restoreTarget =
      this.renderer?.focusedNode && this.renderer.focusedNode !== this
        ? this.renderer.focusedNode
        : null;
    this.setVisible(true);
    this.syncLayout();
    this.installSubscriptions();
    this.focusQueryInput();

    const event = createSyntheticEvent({
      type: "change",
      value: { open: true },
      previousValue: { open: false },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("openChange", event);
    return this;
  }

  close(): this {
    if (this.variant === "inline") {
      return this;
    }

    if (!this.isOpen()) {
      return this;
    }

    this.setVisible(false);
    this.cleanupSubscriptions();
    if (this.restoreTarget?.isFocusable() && this.restoreTarget.isVisibleForLayout()) {
      this.renderer?.focus(this.restoreTarget);
    }

    const event = createSyntheticEvent({
      type: "change",
      value: { open: false },
      previousValue: { open: true },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("openChange", event);
    return this;
  }

  setItems(items: CommandItem[]): this {
    this.items = items;
    this.recentIds = sanitizeRecentIds(this.recentIds, this.items, this.recentLimit);
    this.selectedIndex = firstEnabledItemIndex(this.filteredItems());
    this.syncResults();
    return this;
  }

  setRecentIds(ids: string[]): this {
    this.recentIds = sanitizeRecentIds(ids, this.items, this.recentLimit);
    this.selectedIndex = firstEnabledItemIndex(this.filteredItems());
    this.syncResults();
    return this;
  }

  recordRecent(itemId: string): this {
    const item = this.items.find((candidate) => candidate.id === itemId);

    if (!item || item.pinned || this.recentLimit === 0) {
      return this;
    }

    const next = [itemId, ...this.recentIds.filter((id) => id !== itemId)].slice(
      0,
      this.recentLimit,
    );
    if (
      next.length === this.recentIds.length &&
      next.every((id, index) => id === this.recentIds[index])
    ) {
      return this;
    }

    this.recentIds = next;
    this.selectedIndex = clampSelectedIndex(this.filteredItems(), this.selectedIndex);
    this.syncResults();
    return this;
  }

  clearRecent(): this {
    if (this.recentIds.length === 0) {
      return this;
    }

    this.recentIds = [];
    this.selectedIndex = clampSelectedIndex(this.filteredItems(), this.selectedIndex);
    this.syncResults();
    return this;
  }

  setQuery(query: string, options: { syncInput?: boolean } = {}): this {
    const previousQuery = this.query;
    this.query = query;
    this.selectedIndex = firstEnabledItemIndex(this.filteredItems());
    if (options.syncInput !== false && this.queryInput.getValue() !== query) {
      this.syncingQueryInput = true;
      try {
        this.queryInput.setValue(query);
      } finally {
        this.syncingQueryInput = false;
      }
    }
    this.syncResults();

    const event = createSyntheticEvent({
      type: "change",
      value: { query: this.query },
      previousValue: { query: previousQuery },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("queryChange", event);
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (!this.isOpen() && this.variant === "overlay") {
      return;
    }

    if (event.type === "focus" && this.variant === "overlay") {
      this.focusQueryInput();
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const items = this.filteredItems();
    switch (event.key) {
      case "ArrowDown":
        this.moveSelection(items, 1);
        event.preventDefault();
        return;
      case "ArrowUp":
        this.moveSelection(items, -1);
        event.preventDefault();
        return;
      case "Home":
        this.selectedIndex = firstEnabledItemIndex(items);
        this.syncResults();
        event.preventDefault();
        return;
      case "End":
        this.selectedIndex = lastEnabledItemIndex(items);
        this.syncResults();
        event.preventDefault();
        return;
      case "Escape":
        if (this.variant === "overlay") {
          this.close();
          event.preventDefault();
        }
        return;
      case "Enter":
        this.submitSelected();
        event.preventDefault();
        return;
      default:
        return;
    }
  }

  protected override onMount(): void {
    this.syncLayout();
    if (this.isOpen()) {
      this.installSubscriptions();
    }
  }

  protected override paint(context: RenderContext): void {
    if (this.variant === "overlay") {
      return;
    }

    super.paint(context);
  }

  protected override onUnmount(): void {
    this.cleanupSubscriptions();
  }

  private syncLayout(): void {
    const items = this.filteredItems();
    const entries = buildEntries(items, this.recentIds);
    const viewport = this.resolveViewportSize();
    const previewHeight =
      this.preview.styleProps.visible === false ? 0 : Number(this.preview.layoutProps.height ?? 0);
    const listHeight = resolveListHeight(entries.length, viewport.height, previewHeight);
    const panelHeight = resolvePanelHeight(listHeight, previewHeight);

    this.list.updateLayout({
      height: listHeight,
      minHeight: listHeight,
    });
    this.panel.updateLayout({
      height: panelHeight,
    });

    if (this.variant !== "overlay") {
      return;
    }

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const width = Math.min(
      Math.max(40, resolveDimension(this.panel.layoutProps.width, viewportWidth) ?? 48),
      viewportWidth,
    );
    const requestedHeight =
      resolveDimension(this.panel.layoutProps.height, viewportHeight) ?? panelHeight;
    const height = Math.min(Math.max(10, requestedHeight), viewportHeight);

    this.panel.updateLayout({
      left: Math.max(0, Math.floor((viewportWidth - width) / 2)),
      top: Math.max(0, Math.floor((viewportHeight - height) / 3)),
      width,
      height,
    });
  }

  private focusQueryInput(): void {
    this.queryInput.focus();
    queueMicrotask(() => {
      if (this.isOpen()) {
        this.queryInput.focus();
      }
    });
  }

  private installSubscriptions(): void {
    this.cleanupSubscriptions();

    if (!this.renderer) {
      return;
    }

    this.unsubscribeGlobal = this.renderer.subscribe((event) => {
      if (!this.isOpen()) {
        return;
      }

      if (
        event.type === "focus" &&
        event.target &&
        !isNodeWithin(event.target, this) &&
        this.variant === "overlay"
      ) {
        queueMicrotask(() => {
          if (
            this.isOpen() &&
            this.renderer?.focusedNode &&
            !isNodeWithin(this.renderer.focusedNode, this)
          ) {
            this.focusQueryInput();
          }
        });
        return;
      }

      if (
        (event.type === "key" || event.type === "paste") &&
        event.target &&
        !isNodeWithin(event.target, this) &&
        !event.defaultPrevented
      ) {
        if (event.type === "key" && event.key === "Escape" && this.variant === "overlay") {
          this.close();
          event.preventDefault();
          return;
        }

        this.focusQueryInput();
        const forwarded = cloneEvent(event);
        this.renderer?.dispatchEvent(this.queryInput, forwarded);
        if (forwarded.defaultPrevented) {
          event.preventDefault();
        }
      }
    });

    this.unsubscribeResize =
      this.renderer.subscribeToResize(() => {
        this.syncLayout();
      }) ?? null;
  }

  private cleanupSubscriptions(): void {
    this.unsubscribeGlobal?.();
    this.unsubscribeGlobal = null;
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;
  }

  private resolveViewportSize(): { width: number; height: number } {
    const parentBounds = this.parent?.layoutState.innerBounds;
    if (parentBounds && parentBounds.width > 0 && parentBounds.height > 0) {
      return {
        width: parentBounds.width,
        height: parentBounds.height,
      };
    }

    if (this.layoutState.bounds.width > 0 && this.layoutState.bounds.height > 0) {
      return {
        width: this.layoutState.bounds.width,
        height: this.layoutState.bounds.height,
      };
    }

    return {
      width: this.renderer?.width ?? 0,
      height: this.renderer?.height ?? 0,
    };
  }

  private syncResults(): void {
    const items = this.filteredItems();
    const entries = buildEntries(items, this.recentIds);
    const selectedIndex = clampSelectedIndex(items, this.selectedIndex);
    this.selectedIndex = selectedIndex;
    this.syncPreview(items[selectedIndex] ?? null);
    this.list.setEntries(entries, selectedIndex);
    this.syncLayout();
    this.invalidate("command:results");
  }

  private filteredItems(): CommandItem[] {
    const query = this.query.trim().toLowerCase();
    const source =
      query.length === 0 ? this.items : this.items.filter((item) => matchesQuery(item, query));
    return prioritizeItems(source, this.recentIds).slice(0, this.maxResults);
  }

  private moveSelection(items: readonly CommandItem[], delta: number): void {
    if (items.length === 0) {
      return;
    }

    let nextIndex = this.selectedIndex;
    for (let attempt = 0; attempt < items.length; attempt += 1) {
      nextIndex = (nextIndex + delta + items.length) % items.length;
      if (!items[nextIndex]?.disabled) {
        this.selectedIndex = nextIndex;
        this.syncResults();
        return;
      }
    }
  }

  private submitSelected(): void {
    const items = this.filteredItems();
    const item = items[this.selectedIndex];
    if (!item || item.disabled) {
      return;
    }

    if (!item.pinned) {
      this.recordRecent(item.id);
    }

    const event = createSyntheticEvent({
      type: "submit",
      value: { item, itemIndex: this.selectedIndex },
      previousValue: null,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("select", event as never);

    if (this.variant === "overlay") {
      this.close();
    }
  }

  private syncPreview(item: CommandItem | null): void {
    if (!this.renderPreview) {
      this.preview.setVisible(false);
      this.preview.updateLayout({ height: 0 });
      this.previewText.setContent("");
      this.previewText.updateLayout({ height: 0 });
      return;
    }

    const content = this.renderPreview(item)?.trim() ?? "";
    if (content.length === 0) {
      this.preview.setVisible(false);
      this.preview.updateLayout({ height: 0 });
      this.previewText.setContent("");
      this.previewText.updateLayout({ height: 0 });
      return;
    }

    const contentHeight = Math.min(4, Math.max(1, content.split("\n").length));
    this.preview.setVisible(true);
    this.preview.setTitle(this.previewTitle);
    this.previewText.setContent(content);
    this.previewText.updateLayout({ height: contentHeight });
    this.preview.updateLayout({ height: contentHeight + 4 });
  }
}

function buildEntries(
  items: readonly CommandItem[],
  recentIds: readonly string[],
): CommandListEntry[] {
  const entries: CommandListEntry[] = [];
  const recentSet = new Set(recentIds);
  let previousGroup: string | undefined;
  let previousSection: "grouped" | "pinned" | "recent" | null = null;

  items.forEach((item, itemIndex) => {
    const section = item.pinned ? "pinned" : recentSet.has(item.id) ? "recent" : "grouped";

    if (section !== previousSection) {
      previousSection = section;
      previousGroup = undefined;

      if (section === "pinned") {
        entries.push({
          kind: "group",
          label: "Pinned",
        });
      }

      if (section === "recent") {
        entries.push({
          kind: "group",
          label: "Recent",
        });
      }
    }

    if (section === "grouped") {
      const group = item.group?.trim();
      if (group && group !== previousGroup) {
        entries.push({
          kind: "group",
          label: group,
        });
        previousGroup = group;
      }
    }

    entries.push({
      kind: "item",
      label: item.subtitle ? `${item.title} ${item.subtitle}` : item.title,
      item,
      itemIndex,
    });
  });

  return entries;
}

function matchesQuery(item: CommandItem, query: string): boolean {
  const haystack = [item.title, item.subtitle, item.group, ...(item.keywords ?? [])]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function prioritizeItems(
  items: readonly CommandItem[],
  recentIds: readonly string[],
): CommandItem[] {
  const recentOrder = new Map(recentIds.map((id, index) => [id, index]));
  const pinned: CommandItem[] = [];
  const recent: CommandItem[] = [];
  const grouped: CommandItem[] = [];

  items.forEach((item) => {
    if (item.pinned) {
      pinned.push(item);
      return;
    }

    if (recentOrder.has(item.id)) {
      recent.push(item);
      return;
    }

    grouped.push(item);
  });

  recent.sort(
    (left, right) =>
      (recentOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (recentOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );

  return [...pinned, ...recent, ...grouped];
}

function sanitizeRecentIds(
  ids: readonly string[],
  items: readonly CommandItem[],
  limit: number,
): string[] {
  if (limit <= 0) {
    return [];
  }

  const allowed = new Set(items.filter((item) => !item.pinned).map((item) => item.id));
  const next: string[] = [];

  for (const id of ids) {
    if (next.length >= limit) {
      break;
    }

    if (!allowed.has(id) || next.includes(id)) {
      continue;
    }

    next.push(id);
  }

  return next;
}

function clampSelectedIndex(items: readonly CommandItem[], selectedIndex: number): number {
  if (items.length === 0) {
    return 0;
  }

  const nextIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
  if (!items[nextIndex]?.disabled) {
    return nextIndex;
  }

  return firstEnabledItemIndex(items);
}

function firstEnabledItemIndex(items: readonly CommandItem[]): number {
  const index = items.findIndex((item) => !item.disabled);
  return index === -1 ? 0 : index;
}

function lastEnabledItemIndex(items: readonly CommandItem[]): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!items[index]?.disabled) {
      return index;
    }
  }

  return 0;
}

function truncateText(value: string, width: number): string {
  if (width <= 0 || measureTextWidth(value) <= width) {
    return value;
  }

  let result = "";
  for (const character of value) {
    if (measureTextWidth(`${result}${character}…`) > width) {
      break;
    }
    result += character;
  }
  return `${result}…`;
}

function resolveListHeight(entryCount: number, viewportHeight: number, previewHeight = 0): number {
  const visibleEntries = Math.max(1, entryCount);
  const maxHeight = Math.max(4, viewportHeight - 9 - previewHeight);
  return Math.max(4, Math.min(maxHeight, visibleEntries));
}

function resolvePanelHeight(listHeight: number, previewHeight = 0): number {
  return Math.max(11 + previewHeight, listHeight + 8 + previewHeight);
}

function cloneEvent(event: Extract<RenderEvent, { type: "key" | "paste" }>): typeof event {
  if (event.type === "paste") {
    const forwarded = createSyntheticEvent({
      type: "paste",
      text: event.text,
    } as const);
    return forwarded as typeof event;
  }

  const forwarded = createSyntheticEvent({
    type: "key",
    key: event.key,
    text: event.text,
    modifiers: { ...event.modifiers },
    repeat: event.repeat,
  } as const);
  return forwarded as typeof event;
}
