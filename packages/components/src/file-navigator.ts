import { readdirSync, statSync } from "node:fs";
import path from "node:path";

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
  TextRenderable,
} from "@neotui/core";
import { type BreadcrumbItem, BreadcrumbRenderable } from "./breadcrumb";
import { defaultComponentTheme } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];

export type FileNavigatorMode = "directory" | "file" | "any";

export interface FileNavigatorEntry {
  kind: "parent" | "directory" | "file";
  name: string;
  path: string;
}

export interface FileNavigatorRenderableOptions {
  currentPath?: string;
  rootPath?: string;
  mode?: FileNavigatorMode;
  showHidden?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface FileNavigatorSelectDetail {
  entry: FileNavigatorEntry | null;
  path: string;
  currentPath: string;
}

class FileNavigatorListRenderable extends Renderable {
  entries: FileNavigatorEntry[] = [];
  selectedIndex = 0;
  scrollOffset = 0;
  errorMessage: string | null = null;

  constructor() {
    super(
      "file-navigator-list",
      {
        width: "100%",
        flexGrow: 1,
        minHeight: 6,
      },
      {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.fg,
      },
    );
  }

  setEntries(
    entries: FileNavigatorEntry[],
    selectedIndex: number,
    errorMessage: string | null,
  ): this {
    this.entries = entries;
    this.errorMessage = errorMessage;
    if (entries.length === 0) {
      this.selectedIndex = 0;
      this.scrollOffset = 0;
    } else {
      this.selectedIndex = Math.max(0, Math.min(selectedIndex, entries.length - 1));
      this.ensureSelectionVisible();
    }
    this.invalidate("file-navigator-list:entries");
    return this;
  }

  setSelectedIndex(index: number): this {
    if (this.entries.length === 0) {
      this.selectedIndex = 0;
      this.scrollOffset = 0;
      return this;
    }
    this.selectedIndex = Math.max(0, Math.min(index, this.entries.length - 1));
    this.ensureSelectionVisible();
    this.invalidate("file-navigator-list:selected-index");
    return this;
  }

  pageSelection(deltaPages: number): this {
    if (this.entries.length === 0) {
      return this;
    }
    const visibleHeight = Math.max(1, this.layoutState.bounds.height || 8);
    return this.setSelectedIndex(this.selectedIndex + deltaPages * visibleHeight);
  }

  scrollWheel(deltaRows: number): this {
    if (this.entries.length === 0) {
      return this;
    }
    const maxOffset = Math.max(
      0,
      this.entries.length - Math.max(1, this.layoutState.bounds.height),
    );
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + deltaRows, maxOffset));
    if (this.selectedIndex < this.scrollOffset) {
      this.selectedIndex = this.scrollOffset;
    } else if (
      this.selectedIndex >=
      this.scrollOffset + Math.max(1, this.layoutState.bounds.height)
    ) {
      this.selectedIndex = Math.max(
        0,
        this.scrollOffset + Math.max(1, this.layoutState.bounds.height) - 1,
      );
    }
    this.invalidate("file-navigator-list:wheel");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const width = this.entries.reduce((max, entry) => {
      const label = renderEntryLabel(entry);
      return Math.max(max, measureTextWidth(label));
    }, 18);
    return {
      width: Math.max(measured.width, width + 2),
      height: Math.max(measured.height, 8),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "mouse" && event.action === "wheel") {
      const step = Math.max(1, Math.floor(Math.max(1, this.layoutState.bounds.height) / 4));
      this.scrollWheel(event.wheelDelta > 0 ? -step : step);
      event.preventDefault();
      return;
    }

    if (event.type !== "mouse" || event.action !== "down" || event.button !== "left") {
      return;
    }

    const index = this.entryIndexAt(event.y);
    if (index === null) {
      return;
    }

    const entry = this.entries[index];
    if (!entry) {
      return;
    }

    this.selectedIndex = index;
    this.ensureSelectionVisible();
    if (entry.kind === "directory" || entry.kind === "parent") {
      this.emitActivate(entry, index);
    } else {
      this.emitSelect(entry, index);
    }
    event.preventDefault();
    this.invalidate("file-navigator-list:mouse-select");
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

    if (this.errorMessage) {
      renderTextBlock(buffer, bounds, this.errorMessage, {
        clip: clipRect,
        fg: defaultComponentTheme.danger,
        bg: defaultComponentTheme.surfaceBg,
        wrapMode: "word",
      });
      return;
    }

    if (this.entries.length === 0) {
      renderTextBlock(buffer, bounds, "No files or directories", {
        clip: clipRect,
        fg: defaultComponentTheme.muted,
        bg: defaultComponentTheme.surfaceBg,
        wrapMode: "none",
      });
      return;
    }

    const visibleHeight = Math.max(1, bounds.height);
    for (let row = 0; row < visibleHeight; row += 1) {
      const entry = this.entries[this.scrollOffset + row];
      if (!entry) {
        continue;
      }

      const y = bounds.y + row;
      const selected = this.selectedIndex === this.scrollOffset + row;
      const bg = selected ? defaultComponentTheme.borderStrong : defaultComponentTheme.surfaceBg;
      const fg = selected ? defaultComponentTheme.ink : resolveEntryFg(entry);
      buffer.fill(
        { char: " ", fg, bg },
        {
          x: bounds.x,
          y,
          width: bounds.width,
          height: 1,
        },
      );

      renderTextBlock(
        buffer,
        { x: bounds.x, y, width: bounds.width, height: 1 },
        truncateText(renderEntryLabel(entry), bounds.width),
        {
          clip: clipRect,
          fg,
          bg,
          wrapMode: "none",
        },
      );
    }
  }

  private ensureSelectionVisible(): void {
    const visibleHeight = Math.max(1, this.layoutState.bounds.height || 8);
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
      return;
    }
    if (this.selectedIndex >= this.scrollOffset + visibleHeight) {
      this.scrollOffset = Math.max(0, this.selectedIndex - visibleHeight + 1);
    }
  }

  private entryIndexAt(y: number): number | null {
    if (!this.containsPoint(this.layoutState.bounds.x, y)) {
      return null;
    }
    const localY = y - this.layoutState.bounds.y;
    if (localY < 0 || localY >= this.layoutState.bounds.height) {
      return null;
    }
    return this.scrollOffset + localY;
  }

  private emitSelect(entry: FileNavigatorEntry, entryIndex: number): void {
    const event = createSyntheticEvent({
      type: "select",
      value: {
        entry,
        entryIndex,
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("select", event as never);
  }

  private emitActivate(entry: FileNavigatorEntry, entryIndex: number): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: {
        entry,
        entryIndex,
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("activate", event as never);
  }
}

export class FileNavigatorRenderable extends BoxRenderable {
  readonly breadcrumb: BreadcrumbRenderable;
  readonly list: FileNavigatorListRenderable;
  readonly hint: TextRenderable;

  mode: FileNavigatorMode;
  showHidden: boolean;
  rootPath: string | null;
  currentPath: string;
  private entries: FileNavigatorEntry[] = [];

  constructor(options: FileNavigatorRenderableOptions = {}) {
    super({
      layout: {
        width: "100%",
        height: 14,
        flexDirection: "column",
        gap: 1,
        ...options.layout,
      },
      style: {
        border: true,
        focusable: true,
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.fg,
        borderFg: defaultComponentTheme.border,
        ...options.style,
      },
    });

    this.mode = options.mode ?? "directory";
    this.showHidden = options.showHidden ?? false;
    this.rootPath = options.rootPath ? resolvePath(options.rootPath) : null;
    this.currentPath = resolveDirectoryPath(
      options.currentPath ?? options.rootPath ?? process.cwd(),
    );

    this.breadcrumb = new BreadcrumbRenderable({
      items: [],
      maxVisibleItems: 6,
      layout: { width: "100%", height: 1 },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        focusable: false,
      },
    });
    this.list = new FileNavigatorListRenderable();
    this.hint = new TextRenderable({
      content: "Enter opens | Backspace goes up | Click breadcrumbs to jump",
      wrapMode: "none",
      layout: { width: "100%", height: 1 },
      style: {
        fg: defaultComponentTheme.muted,
        bg: defaultComponentTheme.surfaceBg,
      },
    });

    super.add(this.breadcrumb, this.list, this.hint);

    this.breadcrumb.on("select", (event) => {
      const detail = event as { value: { id: string } };
      void this.setCurrentPath(detail.value.id);
      this.focus();
    });
    this.list.on("select", (event) => {
      const detail = (event as { value: { entryIndex: number } }).value;
      this.list.setSelectedIndex(detail.entryIndex);
      this.emitSelection();
      this.focus();
    });
    this.list.on("activate", (event) => {
      const detail = (event as { value: { entry: FileNavigatorEntry; entryIndex: number } }).value;
      this.list.setSelectedIndex(detail.entryIndex);
      void this.activateEntry(detail.entry);
      this.focus();
    });

    this.refresh();
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  getSelectedEntry(): FileNavigatorEntry | null {
    return this.entries[this.list.selectedIndex] ?? null;
  }

  getSelectionPath(): string {
    if (this.mode === "directory") {
      return this.currentPath;
    }

    const entry = this.getSelectedEntry();
    if (entry && entry.kind === "file") {
      return entry.path;
    }

    return this.currentPath;
  }

  setCurrentPath(nextPath: string): this {
    const resolved = resolveDirectoryPath(nextPath);
    this.currentPath = clampToRoot(resolved, this.rootPath);
    this.refresh();
    return this;
  }

  setMode(mode: FileNavigatorMode): this {
    this.mode = mode;
    this.refresh();
    return this;
  }

  setShowHidden(showHidden: boolean): this {
    this.showHidden = showHidden;
    this.refresh();
    return this;
  }

  refresh(): this {
    const previousPath = this.currentPath;
    const { directoryPath, selectionPath, entries, errorMessage } = readEntriesForNavigator(
      this.currentPath,
      this.rootPath,
      this.mode,
      this.showHidden,
    );
    const previousSelectionPath = this.getSelectedEntry()?.path ?? null;
    this.currentPath = directoryPath;
    this.entries = entries;

    const selectedIndex = resolveSelectedIndex(entries, selectionPath, previousSelectionPath);
    this.list.setEntries(entries, selectedIndex, errorMessage);
    this.breadcrumb.setItems(buildBreadcrumbItems(directoryPath, this.rootPath));
    this.emitSelection();
    if (previousPath !== directoryPath) {
      this.emitPathChange();
    }
    this.invalidate("file-navigator:refresh");
    return this;
  }

  focus(): this {
    this.renderer?.focus(this);
    return this;
  }

  chooseSelection(): this {
    const event = createSyntheticEvent({
      type: "submit",
      value: {
        entry: this.getSelectedEntry(),
        path: this.getSelectionPath(),
        currentPath: this.currentPath,
      } satisfies FileNavigatorSelectDetail,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus" || event.type === "blur") {
      this.invalidate(`file-navigator:${event.type}`);
      return;
    }

    if (event.type === "mouse") {
      return;
    }

    if (event.type !== "key") {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        this.list.setSelectedIndex(this.list.selectedIndex + 1);
        this.emitSelection();
        event.preventDefault();
        return;
      case "ArrowUp":
        this.list.setSelectedIndex(this.list.selectedIndex - 1);
        this.emitSelection();
        event.preventDefault();
        return;
      case "PageDown":
        this.list.pageSelection(1);
        this.emitSelection();
        event.preventDefault();
        return;
      case "PageUp":
        this.list.pageSelection(-1);
        this.emitSelection();
        event.preventDefault();
        return;
      case "Home":
        this.list.setSelectedIndex(0);
        this.emitSelection();
        event.preventDefault();
        return;
      case "End":
        this.list.setSelectedIndex(this.entries.length - 1);
        this.emitSelection();
        event.preventDefault();
        return;
      case "ArrowLeft":
      case "Backspace":
        this.navigateParent();
        event.preventDefault();
        return;
      case "ArrowRight":
      case "Enter": {
        const entry = this.getSelectedEntry();
        if (!entry) {
          return;
        }
        void this.activateEntry(entry);
        event.preventDefault();
        return;
      }
      default:
        return;
    }
  }

  private navigateParent(): void {
    const parent = dirnameWithinRoot(this.currentPath, this.rootPath);
    if (parent === this.currentPath) {
      return;
    }
    this.setCurrentPath(parent);
  }

  private async activateEntry(entry: FileNavigatorEntry): Promise<void> {
    if (entry.kind === "parent" || entry.kind === "directory") {
      this.setCurrentPath(entry.path);
      return;
    }

    this.chooseSelection();
  }

  private emitSelection(): void {
    const event = createSyntheticEvent({
      type: "change",
      value: {
        entry: this.getSelectedEntry(),
        path: this.getSelectionPath(),
        currentPath: this.currentPath,
      } satisfies FileNavigatorSelectDetail,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("select", event as never);
  }

  private emitPathChange(): void {
    const event = createSyntheticEvent({
      type: "change",
      value: {
        path: this.currentPath,
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("pathChange", event as never);
  }
}

function readEntriesForNavigator(
  requestedPath: string,
  rootPath: string | null,
  mode: FileNavigatorMode,
  showHidden: boolean,
): {
  directoryPath: string;
  selectionPath: string | null;
  entries: FileNavigatorEntry[];
  errorMessage: string | null;
} {
  const resolved = clampToRoot(resolvePath(requestedPath), rootPath);
  const stat = safeStat(resolved);

  let directoryPath = resolved;
  let selectionPath: string | null = null;
  if (stat?.isFile()) {
    selectionPath = resolved;
    directoryPath = clampToRoot(path.dirname(resolved), rootPath);
  }

  try {
    const dirents = readdirSync(directoryPath, { withFileTypes: true });
    const entries: FileNavigatorEntry[] = [];
    const parentPath = dirnameWithinRoot(directoryPath, rootPath);
    if (parentPath !== directoryPath) {
      entries.push({
        kind: "parent",
        name: "..",
        path: parentPath,
      });
    }

    const visibleEntries = dirents
      .filter((entry) => showHidden || !entry.name.startsWith("."))
      .filter((entry) => {
        if (entry.isDirectory()) {
          return true;
        }
        return mode !== "directory";
      })
      .map((entry) => {
        const entryPath = path.join(directoryPath, entry.name);
        return {
          kind: entry.isDirectory() ? "directory" : "file",
          name: entry.name,
          path: entryPath,
        } satisfies FileNavigatorEntry;
      })
      .sort(compareNavigatorEntries);

    entries.push(...visibleEntries);
    return {
      directoryPath,
      selectionPath,
      entries,
      errorMessage: null,
    };
  } catch (error) {
    return {
      directoryPath,
      selectionPath: null,
      entries: [],
      errorMessage: formatNavigatorError(directoryPath, error),
    };
  }
}

function buildBreadcrumbItems(currentPath: string, rootPath: string | null): BreadcrumbItem[] {
  const startPath = rootPath ?? path.parse(currentPath).root;
  const relative = path.relative(startPath, currentPath);
  const labels = relative && relative !== "." ? relative.split(path.sep).filter(Boolean) : [];
  const items: BreadcrumbItem[] = [
    {
      id: startPath,
      label: startPath === path.parse(startPath).root ? startPath : path.basename(startPath),
    },
  ];

  let cursor = startPath;
  for (const label of labels) {
    cursor = path.join(cursor, label);
    items.push({ id: cursor, label });
  }

  return items;
}

function resolveSelectedIndex(
  entries: FileNavigatorEntry[],
  preferredPath: string | null,
  previousSelectionPath: string | null,
): number {
  if (entries.length === 0) {
    return 0;
  }

  const candidatePaths = [preferredPath, previousSelectionPath].filter((value): value is string =>
    Boolean(value),
  );
  for (const candidate of candidatePaths) {
    const index = entries.findIndex((entry) => entry.path === candidate);
    if (index !== -1) {
      return index;
    }
  }

  const firstDirectory = entries.findIndex((entry) => entry.kind === "directory");
  if (firstDirectory !== -1) {
    return firstDirectory;
  }

  return 0;
}

function compareNavigatorEntries(left: FileNavigatorEntry, right: FileNavigatorEntry): number {
  if (left.kind !== right.kind) {
    if (left.kind === "directory") {
      return -1;
    }
    if (right.kind === "directory") {
      return 1;
    }
  }

  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function renderEntryLabel(entry: FileNavigatorEntry): string {
  switch (entry.kind) {
    case "parent":
      return "↖ ..";
    case "directory":
      return `▸ ${entry.name}/`;
    case "file":
      return `  ${entry.name}`;
  }
}

function resolveEntryFg(entry: FileNavigatorEntry): string {
  switch (entry.kind) {
    case "parent":
      return defaultComponentTheme.title;
    case "directory":
      return defaultComponentTheme.accent;
    case "file":
      return defaultComponentTheme.fg;
  }
}

function truncateText(value: string, width: number): string {
  if (measureTextWidth(value) <= width) {
    return value;
  }
  if (width <= 1) {
    return value.slice(0, width);
  }
  return `${value.slice(0, Math.max(0, width - 1))}…`;
}

function resolvePath(value: string): string {
  return path.resolve(value.trim() || process.cwd());
}

function resolveDirectoryPath(value: string): string {
  const resolved = resolvePath(value);
  const stat = safeStat(resolved);
  if (stat?.isDirectory()) {
    return resolved;
  }
  if (stat?.isFile()) {
    return path.dirname(resolved);
  }
  return resolved;
}

function safeStat(targetPath: string): ReturnType<typeof statSync> | null {
  try {
    return statSync(targetPath);
  } catch {
    return null;
  }
}

function clampToRoot(targetPath: string, rootPath: string | null): string {
  if (!rootPath) {
    return targetPath;
  }

  const relative = path.relative(rootPath, targetPath);
  if (!relative || relative === "." || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return targetPath;
  }
  return rootPath;
}

function dirnameWithinRoot(currentPath: string, rootPath: string | null): string {
  if (rootPath && currentPath === rootPath) {
    return currentPath;
  }
  const parent = path.dirname(currentPath);
  if (parent === currentPath) {
    return currentPath;
  }
  return clampToRoot(parent, rootPath);
}

function formatNavigatorError(targetPath: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Cannot read ${targetPath}\n${message}`;
}
