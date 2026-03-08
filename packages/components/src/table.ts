import {
  type BaseLayoutProps,
  type BaseStyleProps,
  createSyntheticEvent,
  measureTextWidth,
  type Rect,
  Renderable,
  type RenderEvent,
  renderTextBlock,
  splitGraphemes,
} from "@neotui/core";
import { type ComponentTone, defaultComponentTheme, resolveToneColor } from "./theme";

type RenderContext = Parameters<Renderable["render"]>[0];
type CellAlign = "left" | "center" | "right";

export interface TableColumn {
  id: string;
  header: string;
  width?: number | "auto" | "fill";
  align?: CellAlign;
}

export interface TableCell {
  text: string;
  align?: CellAlign;
  fg?: string;
  bg?: string;
  tone?: ComponentTone;
}

export interface TableRow {
  id: string;
  cells: Record<string, string | number | boolean | TableCell | undefined>;
}

export interface TableRenderableOptions {
  columns: TableColumn[];
  rows: TableRow[];
  striped?: boolean;
  compact?: boolean;
  showHeader?: boolean;
  activeRowId?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface ColumnMetric {
  id: string;
  x: number;
  width: number;
  align: CellAlign;
}

export class TableRenderable extends Renderable {
  columns: TableColumn[];
  rows: TableRow[];
  striped: boolean;
  compact: boolean;
  showHeader: boolean;
  activeRowId?: string;

  constructor(options: TableRenderableOptions) {
    super(
      "table",
      {
        width: "100%",
        ...options.layout,
      },
      {
        border: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        borderFg: defaultComponentTheme.border,
        titleFg: defaultComponentTheme.title,
        ...options.style,
      },
    );
    this.columns = options.columns;
    this.rows = options.rows;
    this.striped = options.striped ?? true;
    this.compact = options.compact ?? false;
    this.showHeader = options.showHeader ?? true;
    this.activeRowId = options.activeRowId;
  }

  setColumns(columns: TableColumn[]): this {
    this.columns = columns;
    this.invalidate("table:columns");
    return this;
  }

  setRows(rows: TableRow[]): this {
    this.rows = rows;
    this.invalidate("table:rows");
    return this;
  }

  setActiveRowId(activeRowId?: string): this {
    this.activeRowId = activeRowId;
    this.invalidate("table:active-row");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const contentWidth = this.columns.reduce(
      (total, column) => {
        const widestCell = this.rows.reduce((max, row) => {
          return Math.max(max, measureTextWidth(cellText(row.cells[column.id])));
        }, measureTextWidth(column.header));
        return total + widestCell + 2;
      },
      Math.max(0, this.columns.length - 1),
    );

    return {
      width:
        this.layoutProps.width !== undefined
          ? measured.width
          : Math.max(measured.width, contentWidth + 2),
      height: Math.max(measured.height, this.rows.length + (this.showHeader ? 3 : 2)),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type !== "mouse" || event.action !== "down" || event.button !== "left") {
      return;
    }

    const { innerBounds } = this.layoutState;
    if (
      event.x < innerBounds.x ||
      event.x >= innerBounds.x + innerBounds.width ||
      event.y < innerBounds.y ||
      event.y >= innerBounds.y + innerBounds.height
    ) {
      return;
    }

    const metrics = resolveColumnMetrics(this.columns, this.rows, innerBounds.width).map(
      (metric) => ({
        ...metric,
        x: innerBounds.x + metric.x,
      }),
    );
    const column = metrics.find(
      (metric) => event.x >= metric.x && event.x < metric.x + metric.width,
    );
    if (!column) {
      return;
    }

    if (this.showHeader && event.y === innerBounds.y) {
      const headerEvent = createSyntheticEvent({
        type: "select",
        value: {
          columnId: column.id,
          column: this.columns.find((entry) => entry.id === column.id) ?? null,
        },
      } as const);
      headerEvent.target = this;
      headerEvent.currentTarget = this;
      this.emit("headerSelect", headerEvent as never);
      event.preventDefault();
      return;
    }

    const bodyOffset = this.showHeader ? 1 : 0;
    const rowIndex = event.y - innerBounds.y - bodyOffset;
    const row = this.rows[rowIndex];
    if (!row) {
      return;
    }

    const rowEvent = createSyntheticEvent({
      type: "select",
      value: {
        rowId: row.id,
        rowIndex,
        columnId: column.id,
        row,
      },
    } as const);
    rowEvent.target = this;
    rowEvent.currentTarget = this;
    this.emit("rowSelect", rowEvent as never);
    event.preventDefault();
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, innerBounds, clipRect } = this.layoutState;
    buffer.fill(
      {
        char: " ",
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
    );

    if (this.hasBorder()) {
      buffer.drawBorder(bounds, this.styleProps.title, {
        fg: this.styleProps.borderFg ?? defaultComponentTheme.border,
        bg: this.styleProps.bg,
        titleFg: this.styleProps.titleFg ?? defaultComponentTheme.title,
      });
    }

    if (innerBounds.width <= 0 || innerBounds.height <= 0 || this.columns.length === 0) {
      return;
    }

    const metrics = resolveColumnMetrics(this.columns, this.rows, innerBounds.width).map(
      (metric) => ({
        ...metric,
        x: innerBounds.x + metric.x,
      }),
    );

    let y = innerBounds.y;

    if (this.showHeader && y < innerBounds.y + innerBounds.height) {
      buffer.fill(
        {
          char: " ",
          fg: defaultComponentTheme.title,
          bg: defaultComponentTheme.surfaceAltBg,
        },
        {
          x: innerBounds.x,
          y,
          width: innerBounds.width,
          height: 1,
        },
      );

      for (const metric of metrics) {
        const column = this.columns.find((entry) => entry.id === metric.id);
        if (!column) {
          continue;
        }

        renderTextBlock(
          buffer,
          { x: metric.x, y, width: metric.width, height: 1 },
          alignText(column.header, metric.width, column.align ?? "left"),
          {
            clip: clipRect,
            fg: defaultComponentTheme.title,
            bg: defaultComponentTheme.surfaceAltBg,
            wrapMode: "none",
          },
        );
      }

      y += 1;
    }

    const visibleRows = Math.max(0, innerBounds.y + innerBounds.height - y);
    for (let index = 0; index < this.rows.length && index < visibleRows; index += 1) {
      const row = this.rows[index];
      if (!row) {
        continue;
      }

      const rowY = y + index;
      const rowBg = resolveRowBackground(
        row.id === this.activeRowId,
        this.striped && index % 2 === 1,
      );
      buffer.fill(
        {
          char: " ",
          fg: this.styleProps.fg,
          bg: rowBg,
        },
        {
          x: innerBounds.x,
          y: rowY,
          width: innerBounds.width,
          height: 1,
        },
      );

      for (const metric of metrics) {
        const rawCell = row.cells[metric.id];
        const cell = normalizeCell(rawCell);
        const fg = cell.fg ?? (cell.tone ? resolveToneColor(cell.tone) : this.styleProps.fg);
        const bg = cell.bg ?? rowBg;
        renderTextBlock(
          buffer,
          { x: metric.x, y: rowY, width: metric.width, height: 1 },
          alignText(cell.text, metric.width, cell.align ?? metric.align),
          {
            clip: clipRect,
            fg,
            bg,
            wrapMode: "none",
          },
        );
      }
    }
  }
}

function resolveColumnMetrics(
  columns: readonly TableColumn[],
  rows: readonly TableRow[],
  availableWidth: number,
): ColumnMetric[] {
  const gapCount = Math.max(0, columns.length - 1);
  const contentWidth = Math.max(1, availableWidth - gapCount);
  const widths = columns.map((column) => {
    if (typeof column.width === "number") {
      return Math.max(3, column.width);
    }

    const measured = rows.reduce((max, row) => {
      return Math.max(max, measureTextWidth(cellText(row.cells[column.id])));
    }, measureTextWidth(column.header));

    if (column.width === "fill") {
      return Math.max(6, measured + 2);
    }

    return Math.max(4, measured + 2);
  });

  while (widths.reduce((total, width) => total + width, 0) > contentWidth) {
    const widestIndex = widths.reduce((index, width, candidateIndex, all) => {
      return width > (all[index] ?? 0) ? candidateIndex : index;
    }, 0);

    if ((widths[widestIndex] ?? 0) <= 3) {
      break;
    }

    widths[widestIndex] = Math.max(3, (widths[widestIndex] ?? 3) - 1);
  }

  const totalWidth = widths.reduce((total, width) => total + width, 0);
  const fillColumns = columns
    .map((column, index) => ({ column, index }))
    .filter((entry) => entry.column.width === "fill");

  if (fillColumns.length > 0 && totalWidth < contentWidth) {
    let remaining = contentWidth - totalWidth;
    let cursor = 0;

    while (remaining > 0) {
      const target = fillColumns[cursor % fillColumns.length];
      if (target) {
        widths[target.index] = (widths[target.index] ?? 0) + 1;
        remaining -= 1;
      }
      cursor += 1;
    }
  }

  let x = 0;
  return columns.map((column, index) => {
    const metric: ColumnMetric = {
      id: column.id,
      x,
      width: widths[index] ?? 3,
      align: column.align ?? "left",
    };
    x += metric.width + 1;
    return metric;
  });
}

function normalizeCell(value: TableRow["cells"][string]): TableCell {
  if (value && typeof value === "object" && "text" in value) {
    return {
      text: String(value.text),
      align: value.align,
      fg: value.fg,
      bg: value.bg,
      tone: value.tone,
    };
  }

  return {
    text: value === undefined ? "" : String(value),
  };
}

function cellText(value: TableRow["cells"][string]): string {
  return normalizeCell(value).text;
}

function resolveRowBackground(active: boolean, striped: boolean): string {
  if (active) {
    return "#2a241f";
  }

  if (striped) {
    return defaultComponentTheme.surfaceAltBg;
  }

  return defaultComponentTheme.surfaceBg;
}

function alignText(value: string, width: number, align: CellAlign): string {
  const truncated = truncateText(value, width);
  const truncatedWidth = measureTextWidth(truncated);
  const remaining = Math.max(0, width - truncatedWidth);

  if (align === "right") {
    return `${" ".repeat(remaining)}${truncated}`;
  }

  if (align === "center") {
    const left = Math.floor(remaining / 2);
    const right = remaining - left;
    return `${" ".repeat(left)}${truncated}${" ".repeat(right)}`;
  }

  return `${truncated}${" ".repeat(remaining)}`;
}

function truncateText(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }

  if (measureTextWidth(value) <= width) {
    return value;
  }

  if (width === 1) {
    return "…";
  }

  const graphemes = splitGraphemes(value);
  let result = "";

  for (const grapheme of graphemes) {
    const next = `${result}${grapheme}`;
    if (measureTextWidth(`${next}…`) > width) {
      break;
    }
    result = next;
  }

  return `${result}…`;
}
