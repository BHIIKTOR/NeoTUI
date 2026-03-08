# TableRenderable

## Purpose

Provide a presentational table surface for structured row and column data that
renders more honestly than padded text blocks.

## Dependencies

- `@neotui/core`
- `ScrollAreaRenderable`
- `BadgeRenderable`
- `SeparatorRenderable`

## Proposed Public API

```ts
export interface TableColumn {
  id: string;
  header: string;
  width?: number | "auto" | "fill";
  align?: "left" | "center" | "right";
}

export interface TableRow {
  id: string;
  cells: Record<string, string>;
}

export interface TableRenderableOptions {
  columns: TableColumn[];
  rows: TableRow[];
  striped?: boolean;
  compact?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class TableRenderable extends Renderable {
  setRows(rows: TableRow[]): this;
}
```

## Behavior Contract

- the first pass is presentational, not fully interactive
- column alignment must be deterministic
- long content must truncate or wrap according to documented rules

## Deterministic Deliverable

- one example demonstrates compact and regular tables
- one app surface uses a real table rather than ad hoc formatted text

## Passing Gate

- resize behavior is tested
- alignment and striping snapshots exist
- the boundary between `TableRenderable` and `DataTableRenderable` is explicit

## Non-Goals

- selection, sorting, and paging, which belong to data-table
