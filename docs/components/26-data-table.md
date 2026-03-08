# DataTableRenderable

## Purpose

Provide an interactive table surface for dense application data: row selection,
sort hooks, column metadata, pagination composition, and action affordances.

## Dependencies

- `@neotui/core`
- `TableRenderable`
- `PaginationRenderable`
- `DropdownMenuRenderable`
- `CheckboxRenderable`
- `ScrollAreaRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`

## Proposed Public API

```ts
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
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DataTableRenderable extends Renderable {
  setRows(rows: TableRow[]): this;
  setPage(page: number): this;
  setSort(columnId: string, direction: "asc" | "desc"): this;
}
```

## Behavior Contract

- keyboard focus should move between rows and interactive header cells
- row selection must be deterministic
- sort affordances must not destabilize header layout
- pagination should compose cleanly rather than being hardwired

## Deterministic Deliverable

- one example demonstrates sorting, selection, and pagination
- one app surface uses data-table for real structured data

## Passing Gate

- selection and sort tests exist
- pagination integration tests exist
- narrow-width overflow behavior is documented and tested

## Non-Goals

- spreadsheet-grade editing
- infinite scrolling in the first pass
