import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Rect,
  type RenderEvent,
} from "@neotui/core";
import { PaginationRenderable } from "./pagination";
import { type TableColumn, TableRenderable, type TableRow } from "./table";
import { defaultComponentTheme } from "./theme";

export interface DataTableColumn extends TableColumn {
  sortable?: boolean;
  resizable?: boolean;
}

export interface DataTableRenderableOptions {
  columns: DataTableColumn[];
  rows: TableRow[];
  selectedRowIds?: string[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  totalRows?: number;
  selectable?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DataTableRenderable extends BoxRenderable {
  readonly table: TableRenderable;
  readonly summary: BoxRenderable;
  readonly pagination: PaginationRenderable;

  columns: DataTableColumn[];
  rows: TableRow[];
  selectedRowIds: Set<string>;
  sortBy?: string;
  sortDirection: NonNullable<DataTableRenderableOptions["sortDirection"]>;
  page: number;
  pageSize: number;
  totalRows?: number;
  selectable: boolean;
  focused = false;
  activeRowId?: string;

  constructor(options: DataTableRenderableOptions) {
    super({
      layout: {
        flexDirection: "column",
        gap: 0,
        ...options.layout,
      },
      style: {
        focusable: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    });
    this.columns = options.columns;
    this.rows = options.rows;
    this.selectedRowIds = new Set(options.selectedRowIds ?? []);
    this.sortBy = options.sortBy;
    this.sortDirection = options.sortDirection ?? "asc";
    this.page = Math.max(1, options.page ?? 1);
    this.pageSize = Math.max(1, options.pageSize ?? 5);
    this.totalRows = options.totalRows;
    this.selectable = options.selectable ?? true;

    this.table = new TableRenderable({
      columns: [],
      rows: [],
      striped: true,
      compact: true,
      layout: {
        flexGrow: 1,
        minHeight: 4,
      },
      style: {
        borderFg: defaultComponentTheme.info,
      },
    });
    this.summary = new BoxRenderable({
      layout: {
        height: 1,
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.muted,
      },
    });
    this.pagination = new PaginationRenderable({
      page: this.page,
      pageCount: this.resolvePageCount(),
      showJumpInput: true,
    });

    this.table.on("rowSelect", (event) => {
      const detail = (event as { value: { rowId: string; columnId: string } }).value;
      this.setActiveRow(detail.rowId);
      if (this.selectable && detail.columnId === "__select__") {
        this.toggleRowSelection(detail.rowId);
      }
    });
    this.table.on("headerSelect", (event) => {
      const detail = (event as { value: { columnId: string } }).value;
      if (detail.columnId === "__select__") {
        this.toggleVisibleRows();
        return;
      }

      const column = this.columns.find((entry) => entry.id === detail.columnId);
      if (!column?.sortable) {
        return;
      }

      const nextDirection =
        this.sortBy === column.id && this.sortDirection === "asc" ? "desc" : "asc";
      this.setSort(column.id, nextDirection);
    });
    this.pagination.on("change", (event) => {
      const detail = (event as { value: { page: number } }).value;
      this.setPage(detail.page);
    });

    this.add(this.table, this.summary, this.pagination);
    this.syncSurface();
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const tableSize = this.table.measurePreferredSize(parentBounds);
    const summarySize = this.summary.measurePreferredSize(parentBounds);
    const paginationSize = this.pagination.measurePreferredSize(parentBounds);
    const gap = this.layoutProps.gap ?? 0;

    return {
      width: Math.max(measured.width, tableSize.width, summarySize.width, paginationSize.width),
      height: Math.max(
        measured.height,
        tableSize.height + summarySize.height + paginationSize.height + gap * 2,
      ),
    };
  }

  getSelectedRowIds(): string[] {
    return [...this.selectedRowIds];
  }

  setRows(rows: TableRow[]): this {
    this.rows = rows;
    this.page = Math.min(this.page, this.resolvePageCount());
    this.syncSurface();
    return this;
  }

  setPage(page: number): this {
    const nextPage = Math.max(1, Math.min(this.resolvePageCount(), page));
    if (nextPage === this.page) {
      this.pagination.setPage(nextPage);
      return this;
    }

    const previousPage = this.page;
    this.page = nextPage;
    this.syncSurface();

    const event = createSyntheticEvent({
      type: "change",
      value: { page: this.page },
      previousValue: { page: previousPage },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("pageChange", event);
    return this;
  }

  setSort(columnId: string, direction: "asc" | "desc"): this {
    const previousSort = { sortBy: this.sortBy, sortDirection: this.sortDirection };
    this.sortBy = columnId;
    this.sortDirection = direction;
    this.page = 1;
    this.syncSurface();

    const event = createSyntheticEvent({
      type: "change",
      value: { sortBy: this.sortBy, sortDirection: this.sortDirection },
      previousValue: previousSort,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("sortChange", event);
    return this;
  }

  toggleRowSelection(rowId: string): this {
    const previousSelectedRowIds = [...this.selectedRowIds];

    if (this.selectedRowIds.has(rowId)) {
      this.selectedRowIds.delete(rowId);
    } else {
      this.selectedRowIds.add(rowId);
    }

    this.syncSurface();

    const event = createSyntheticEvent({
      type: "change",
      value: { selectedRowIds: [...this.selectedRowIds] },
      previousValue: { selectedRowIds: previousSelectedRowIds },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("selectionChange", event);
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.table.updateStyle({ borderFg: defaultComponentTheme.borderStrong });
      this.invalidate("data-table:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.table.updateStyle({ borderFg: defaultComponentTheme.info });
      this.invalidate("data-table:blur");
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const visibleRows = this.visibleRows();
    const activeIndex = visibleRows.findIndex((row) => row.id === this.activeRowId);
    const fallbackIndex = activeIndex === -1 ? 0 : activeIndex;

    switch (event.key) {
      case "ArrowDown": {
        const nextRow = visibleRows[Math.min(visibleRows.length - 1, fallbackIndex + 1)];
        if (nextRow) {
          this.setActiveRow(nextRow.id);
          event.preventDefault();
        }
        return;
      }
      case "ArrowUp": {
        const nextRow = visibleRows[Math.max(0, fallbackIndex - 1)];
        if (nextRow) {
          this.setActiveRow(nextRow.id);
          event.preventDefault();
        }
        return;
      }
      case "Home": {
        const nextRow = visibleRows[0];
        if (nextRow) {
          this.setActiveRow(nextRow.id);
          event.preventDefault();
        }
        return;
      }
      case "End": {
        const nextRow = visibleRows.at(-1);
        if (nextRow) {
          this.setActiveRow(nextRow.id);
          event.preventDefault();
        }
        return;
      }
      case "PageDown":
        this.setPage(this.page + 1);
        event.preventDefault();
        return;
      case "PageUp":
        this.setPage(this.page - 1);
        event.preventDefault();
        return;
      case " ":
      case "Space":
        if (this.selectable && this.activeRowId) {
          this.toggleRowSelection(this.activeRowId);
          event.preventDefault();
        }
        return;
      case "Enter":
        if (this.activeRowId) {
          this.emitRowSubmit(this.activeRowId);
          event.preventDefault();
        }
        return;
      default:
        return;
    }
  }

  private setActiveRow(rowId?: string): this {
    this.activeRowId = rowId;
    this.table.setActiveRowId(rowId);
    this.invalidate("data-table:active-row");
    return this;
  }

  private emitRowSubmit(rowId: string): void {
    const row = this.rows.find((entry) => entry.id === rowId) ?? null;
    const event = createSyntheticEvent({
      type: "submit",
      value: {
        rowId,
        row,
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("rowSubmit", event);
  }

  private syncSurface(): void {
    const visibleRows = this.visibleRows();
    const projectedColumns = this.projectColumns();
    const projectedRows = visibleRows.map((row) => ({
      id: row.id,
      cells: this.projectRowCells(row),
    }));

    if (!this.activeRowId || !visibleRows.some((row) => row.id === this.activeRowId)) {
      this.activeRowId = visibleRows[0]?.id;
    }

    this.table.setColumns(projectedColumns);
    this.table.setRows(projectedRows);
    this.table.setActiveRowId(this.activeRowId);

    const totalRows = this.totalRows ?? this.rows.length;
    const rangeStart = totalRows === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    const rangeEnd = Math.min(totalRows, rangeStart + visibleRows.length - 1);
    this.summary.setContent(
      `Showing ${rangeStart}-${rangeEnd} of ${totalRows} • ${this.selectedRowIds.size} selected`,
    );
    this.pagination.setPageCount(this.resolvePageCount());
    this.pagination.setPage(this.page);
    this.invalidate("data-table:sync");
  }

  private resolvePageCount(): number {
    return Math.max(1, Math.ceil((this.totalRows ?? this.rows.length) / this.pageSize));
  }

  private visibleRows(): TableRow[] {
    const sorted = this.sortedRows();
    const start = (this.page - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  private sortedRows(): TableRow[] {
    const sortBy = this.sortBy;
    if (!sortBy) {
      return [...this.rows];
    }

    return [...this.rows].sort((left, right) => {
      const leftValue = String(left.cells[sortBy] ?? "").toLowerCase();
      const rightValue = String(right.cells[sortBy] ?? "").toLowerCase();
      const result = leftValue.localeCompare(rightValue);
      return this.sortDirection === "asc" ? result : -result;
    });
  }

  private projectColumns(): TableColumn[] {
    const columns = this.columns.map((column) => ({
      ...column,
      header:
        column.sortable && this.sortBy === column.id
          ? `${column.header} ${this.sortDirection === "asc" ? "↑" : "↓"}`
          : column.header,
    }));

    if (!this.selectable) {
      return columns;
    }

    return [
      {
        id: "__select__",
        header: this.areVisibleRowsSelected() ? "[x]" : "[ ]",
        width: 5,
        align: "left",
      },
      ...columns,
    ];
  }

  private projectRowCells(row: TableRow): TableRow["cells"] {
    if (!this.selectable) {
      return row.cells;
    }

    return {
      __select__: this.selectedRowIds.has(row.id) ? "[x]" : "[ ]",
      ...row.cells,
    };
  }

  private areVisibleRowsSelected(): boolean {
    const visibleRows = this.visibleRows();
    return visibleRows.length > 0 && visibleRows.every((row) => this.selectedRowIds.has(row.id));
  }

  private toggleVisibleRows(): this {
    const visibleRows = this.visibleRows();
    const shouldSelect = !visibleRows.every((row) => this.selectedRowIds.has(row.id));

    for (const row of visibleRows) {
      if (shouldSelect) {
        this.selectedRowIds.add(row.id);
      } else {
        this.selectedRowIds.delete(row.id);
      }
    }

    this.syncSurface();
    return this;
  }
}
