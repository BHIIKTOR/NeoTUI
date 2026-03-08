import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  measureTextWidth,
  type Renderable,
  type RenderEvent,
  renderTextBlock,
} from "@neotui/core";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
  shortcut?: string;
  disabled?: boolean;
  description?: string;
}

export interface SidebarGroup {
  id: string;
  label?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  items: SidebarItem[];
}

export interface SidebarRenderableOptions {
  title?: string;
  subtitle?: string;
  side?: "left" | "right";
  width?: number;
  collapsedWidth?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  groups: SidebarGroup[];
  activeItemId?: string;
  showBadges?: boolean;
  showShortcuts?: boolean;
  footerActions?: Array<{
    id: string;
    label: string;
    icon?: string;
  }>;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface SidebarRow {
  key: string;
  kind: "subtitle" | "collapse" | "group-label" | "group-toggle" | "item" | "footer";
  label: string;
  icon?: string;
  badge?: string;
  shortcut?: string;
  disabled?: boolean;
  itemId?: string;
  groupId?: string;
  actionId?: string;
  focusable: boolean;
  active?: boolean;
}

export class SidebarRenderable extends BoxRenderable {
  title?: string;
  subtitle?: string;
  side: NonNullable<SidebarRenderableOptions["side"]>;
  collapsedWidth: number;
  collapsible: boolean;
  collapsed: boolean;
  groups: SidebarGroup[];
  activeItemId?: string;
  showBadges: boolean;
  showShortcuts: boolean;
  footerActions: NonNullable<SidebarRenderableOptions["footerActions"]>;
  focused = false;

  private focusedKey: string | null = null;
  private readonly collapsedGroups = new Set<string>();
  private expandedWidth: number;

  constructor(options: SidebarRenderableOptions) {
    super({
      layout: {
        width: options.width ?? 24,
        ...options.layout,
      },
      style: {
        border: true,
        focusable: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        borderFg: defaultComponentTheme.border,
        titleFg: defaultComponentTheme.title,
        title: formatSidebarTitle(options.title, options.subtitle),
        ...options.style,
      },
    });
    this.title = options.title;
    this.subtitle = options.subtitle;
    this.side = options.side ?? "left";
    this.collapsedWidth = options.collapsedWidth ?? 8;
    this.collapsible = options.collapsible ?? false;
    this.collapsed = options.collapsed ?? false;
    this.expandedWidth = options.width ?? 24;
    this.groups = options.groups;
    this.activeItemId = options.activeItemId;
    this.showBadges = options.showBadges ?? true;
    this.showShortcuts = options.showShortcuts ?? true;
    this.footerActions = options.footerActions ?? [];

    for (const group of this.groups) {
      if (group.collapsed) {
        this.collapsedGroups.add(group.id);
      }
    }
  }

  getActiveItemId(): string | undefined {
    return this.activeItemId;
  }

  setGroups(groups: SidebarGroup[]): this {
    const nextCollapsed = new Set<string>();
    for (const group of groups) {
      if (group.collapsed === true || this.collapsedGroups.has(group.id)) {
        nextCollapsed.add(group.id);
      }
    }

    this.groups = groups;
    this.collapsedGroups.clear();
    for (const groupId of nextCollapsed) {
      this.collapsedGroups.add(groupId);
    }

    const availableItemIds = new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
    if (this.activeItemId && !availableItemIds.has(this.activeItemId)) {
      this.activeItemId = groups.flatMap((group) => group.items)[0]?.id;
    }

    this.ensureFocusTarget();
    this.invalidate("sidebar:groups");
    return this;
  }

  setActiveItem(id: string): this {
    this.activeItemId = id;
    this.focusedKey = `item:${id}`;
    this.invalidate("sidebar:active");
    return this;
  }

  setCollapsed(collapsed: boolean): this {
    if (this.collapsed === collapsed) {
      return this;
    }

    if (collapsed && typeof this.layoutProps.width === "number") {
      this.expandedWidth = this.layoutProps.width;
    }

    this.collapsed = collapsed;
    this.updateLayout({
      width: collapsed ? this.collapsedWidth : this.expandedWidth,
    });
    this.emitCollapseChange();
    return this;
  }

  toggleCollapsed(): this {
    return this.setCollapsed(!this.collapsed);
  }

  collapseGroup(id: string): this {
    this.collapsedGroups.add(id);
    this.emitGroupCollapseChange(id, true);
    this.invalidate("sidebar:group-collapse");
    return this;
  }

  expandGroup(id: string): this {
    this.collapsedGroups.delete(id);
    this.emitGroupCollapseChange(id, false);
    this.invalidate("sidebar:group-expand");
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.ensureFocusTarget();
      this.invalidate("sidebar:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("sidebar:blur");
      return;
    }

    if (event.type === "mouse" && event.action === "down") {
      const row = this.rowAt(event.x, event.y);
      if (!row || !row.focusable || row.disabled) {
        return;
      }

      this.focusedKey = row.key;
      this.activateRow(row);
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    if (event.key === "ArrowDown") {
      this.moveFocus(1);
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp") {
      this.moveFocus(-1);
      event.preventDefault();
      return;
    }

    if (event.key === "Home") {
      this.focusedKey = this.focusableRows()[0]?.key ?? this.focusedKey;
      this.invalidate("sidebar:home");
      event.preventDefault();
      return;
    }

    if (event.key === "End") {
      this.focusedKey = this.focusableRows().at(-1)?.key ?? this.focusedKey;
      this.invalidate("sidebar:end");
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowLeft") {
      const row = this.currentRow();
      if (row?.kind === "group-toggle" && row.groupId) {
        this.collapseGroup(row.groupId);
        event.preventDefault();
        return;
      }
      if (this.collapsible && !this.collapsed) {
        this.setCollapsed(true);
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowRight") {
      const row = this.currentRow();
      if (row?.kind === "group-toggle" && row.groupId) {
        this.expandGroup(row.groupId);
        event.preventDefault();
        return;
      }
      if (this.collapsible && this.collapsed) {
        this.setCollapsed(false);
        event.preventDefault();
      }
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "Space") {
      const row = this.currentRow();
      if (row) {
        this.activateRow(row);
        event.preventDefault();
      }
    }
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    const { buffer } = context;
    const { innerBounds, clipRect } = this.layoutState;

    const rows = this.bodyRows();
    const footerRows = this.footerRows();
    const reservedFooter = footerRows.length;
    const availableBodyHeight = Math.max(0, innerBounds.height - reservedFooter);
    const subtitleOffset = this.subtitle && !this.collapsed ? 1 : 0;

    if (subtitleOffset === 1) {
      renderTextBlock(
        buffer,
        { x: innerBounds.x, y: innerBounds.y, width: innerBounds.width, height: 1 },
        this.subtitle ?? "",
        {
          clip: clipRect,
          fg: defaultComponentTheme.muted,
          bg: this.styleProps.bg,
          wrapMode: "none",
        },
      );
    }

    for (
      let rowIndex = 0;
      rowIndex < rows.length && rowIndex + subtitleOffset < availableBodyHeight;
      rowIndex += 1
    ) {
      const row = rows[rowIndex];
      if (!row) {
        continue;
      }

      const y = innerBounds.y + subtitleOffset + rowIndex;
      const colors = this.resolveRowColors(row);
      renderTextBlock(
        buffer,
        { x: innerBounds.x, y, width: innerBounds.width, height: 1 },
        this.renderRowLabel(row, innerBounds.width),
        {
          clip: clipRect,
          fg: colors.fg,
          bg: colors.bg,
          wrapMode: "none",
        },
      );
    }

    const footerStart = innerBounds.y + innerBounds.height - footerRows.length;
    for (let index = 0; index < footerRows.length; index += 1) {
      const row = footerRows[index];
      if (!row) {
        continue;
      }

      const colors = this.resolveRowColors(row);
      renderTextBlock(
        buffer,
        { x: innerBounds.x, y: footerStart + index, width: innerBounds.width, height: 1 },
        this.renderRowLabel(row, innerBounds.width),
        {
          clip: clipRect,
          fg: colors.fg,
          bg: colors.bg,
          wrapMode: "none",
        },
      );
    }
  }

  private bodyRows(): SidebarRow[] {
    const rows: SidebarRow[] = [];

    if (this.collapsible) {
      rows.push({
        key: "collapse",
        kind: "collapse",
        label: this.collapsed ? "Expand" : "Collapse",
        icon: this.collapsed ? "»" : "«",
        focusable: true,
      });
    }

    for (const group of this.groups) {
      const groupLabel = group.label ?? group.id;
      const collapsible = group.collapsible === true;

      if (!this.collapsed) {
        rows.push({
          key: collapsible ? `group:${group.id}` : `group-label:${group.id}`,
          kind: collapsible ? "group-toggle" : "group-label",
          label: groupLabel,
          icon: collapsible ? (this.collapsedGroups.has(group.id) ? "▸" : "▾") : undefined,
          groupId: group.id,
          focusable: collapsible,
        });
      }

      if (this.collapsedGroups.has(group.id)) {
        continue;
      }

      for (const item of group.items) {
        rows.push({
          key: `item:${item.id}`,
          kind: "item",
          label: item.label,
          icon: item.icon,
          badge: this.showBadges ? item.badge : undefined,
          shortcut: this.showShortcuts ? item.shortcut : undefined,
          disabled: item.disabled,
          itemId: item.id,
          focusable: item.disabled !== true,
          active: item.id === this.activeItemId,
        });
      }
    }

    return rows;
  }

  private footerRows(): SidebarRow[] {
    return this.footerActions.map((action) => ({
      key: `footer:${action.id}`,
      kind: "footer",
      label: action.label,
      icon: action.icon,
      actionId: action.id,
      focusable: true,
    }));
  }

  private focusableRows(): SidebarRow[] {
    return [...this.bodyRows(), ...this.footerRows()].filter(
      (row) => row.focusable && row.disabled !== true,
    );
  }

  private currentRow(): SidebarRow | undefined {
    this.ensureFocusTarget();
    return this.focusableRows().find((row) => row.key === this.focusedKey);
  }

  private ensureFocusTarget(): void {
    const focusable = this.focusableRows();
    if (focusable.length === 0) {
      this.focusedKey = null;
      return;
    }

    const active = focusable.find((row) => row.itemId === this.activeItemId);
    if (!this.focusedKey) {
      this.focusedKey = active?.key ?? focusable[0]?.key ?? null;
      return;
    }

    if (!focusable.some((row) => row.key === this.focusedKey)) {
      this.focusedKey = active?.key ?? focusable[0]?.key ?? null;
    }
  }

  private moveFocus(delta: 1 | -1): void {
    const rows = this.focusableRows();
    if (rows.length === 0) {
      return;
    }

    this.ensureFocusTarget();
    const currentIndex = Math.max(
      0,
      rows.findIndex((row) => row.key === this.focusedKey),
    );
    const nextIndex = Math.max(0, Math.min(currentIndex + delta, rows.length - 1));
    this.focusedKey = rows[nextIndex]?.key ?? this.focusedKey;
    this.invalidate("sidebar:focus-move");
  }

  private activateRow(row: SidebarRow): void {
    if (row.disabled) {
      return;
    }

    if (row.kind === "collapse") {
      this.toggleCollapsed();
      return;
    }

    if (row.kind === "group-toggle" && row.groupId) {
      if (this.collapsedGroups.has(row.groupId)) {
        this.expandGroup(row.groupId);
      } else {
        this.collapseGroup(row.groupId);
      }
      return;
    }

    if (row.kind === "item" && row.itemId) {
      const previous = this.activeItemId;
      this.activeItemId = row.itemId;
      const event = createSyntheticEvent({
        type: "change",
        value: {
          id: row.itemId,
        },
        previousValue: previous ? { id: previous } : undefined,
      } as const);
      event.target = this;
      event.currentTarget = this;
      this.emit("select", event);
      this.invalidate("sidebar:select");
      return;
    }

    if (row.kind === "footer" && row.actionId) {
      const event = createSyntheticEvent({
        type: "submit",
        value: {
          id: row.actionId,
        },
      } as const);
      event.target = this;
      event.currentTarget = this;
      this.emit("action", event);
      this.invalidate("sidebar:action");
    }
  }

  private rowAt(x: number, y: number): SidebarRow | null {
    const { innerBounds } = this.layoutState;
    if (
      x < innerBounds.x ||
      y < innerBounds.y ||
      x >= innerBounds.x + innerBounds.width ||
      y >= innerBounds.y + innerBounds.height
    ) {
      return null;
    }

    const footerRows = this.footerRows();
    const footerStart = innerBounds.y + innerBounds.height - footerRows.length;
    if (y >= footerStart) {
      return footerRows[y - footerStart] ?? null;
    }

    const subtitleOffset = this.subtitle && !this.collapsed ? 1 : 0;
    const bodyIndex = y - innerBounds.y - subtitleOffset;
    if (bodyIndex < 0) {
      return null;
    }

    return this.bodyRows()[bodyIndex] ?? null;
  }

  private resolveRowColors(row: SidebarRow) {
    if (row.disabled) {
      return {
        fg: defaultComponentTheme.muted,
        bg: this.styleProps.bg,
      };
    }

    if (this.focused && row.key === this.focusedKey) {
      return {
        fg: defaultComponentTheme.ink,
        bg: this.styleProps.titleFg ?? defaultComponentTheme.borderStrong,
      };
    }

    if (row.active) {
      return {
        fg: this.styleProps.titleFg ?? defaultComponentTheme.borderStrong,
        bg: this.styleProps.bg,
      };
    }

    if (row.kind === "group-label" || row.kind === "group-toggle" || row.kind === "subtitle") {
      return {
        fg: defaultComponentTheme.muted,
        bg: this.styleProps.bg,
      };
    }

    return {
      fg: this.styleProps.fg,
      bg: this.styleProps.bg,
    };
  }

  private renderRowLabel(row: SidebarRow, width: number): string {
    const icon = row.icon ? `${row.icon} ` : "";

    if (this.collapsed && row.kind === "item") {
      return ` ${row.icon ?? row.label.charAt(0).toUpperCase()} `;
    }

    const badge = row.badge ? ` ${row.badge}` : "";
    const shortcut = row.shortcut ? ` ${row.shortcut}` : "";
    const text = `${icon}${row.label}${badge}${shortcut}`;

    if (measureTextWidth(text) <= width) {
      return text;
    }

    return text.slice(0, Math.max(1, width));
  }

  private emitCollapseChange(): void {
    const event = createSyntheticEvent({
      type: "change",
      value: {
        collapsed: this.collapsed,
      },
      previousValue: undefined,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("collapseChange", event);
  }

  private emitGroupCollapseChange(groupId: string, collapsed: boolean): void {
    const event = createSyntheticEvent({
      type: "change",
      value: {
        id: groupId,
        collapsed,
      },
      previousValue: undefined,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("groupCollapseChange", event);
  }
}

function formatSidebarTitle(title?: string, subtitle?: string): string | undefined {
  if (!title && !subtitle) {
    return undefined;
  }

  if (!title) {
    return subtitle;
  }

  if (!subtitle) {
    return title;
  }

  return `${title} | ${subtitle}`;
}
