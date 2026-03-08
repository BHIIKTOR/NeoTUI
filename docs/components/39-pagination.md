# PaginationRenderable

## Purpose

Provide a reusable paging surface that composes into data tables, logs,
activity feeds, and any collection too large for a single viewport.

## Dependencies

- `@neotui/core`
- `ButtonRenderable`
- `InputControlRenderable`
- `SeparatorRenderable`
- foundation modules:
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface PaginationRenderableOptions {
  page: number;
  pageCount: number;
  siblingCount?: number;
  showEdges?: boolean;
  showJumpInput?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class PaginationRenderable extends Renderable {
  setPage(page: number): this;
  next(): this;
  previous(): this;
}
```

## Behavior Contract

- previous and next controls must clamp to valid pages
- page buttons or links should remain keyboard reachable
- jump-to-page input must validate deterministically if enabled

## Deterministic Deliverable

- one example demonstrates standalone pagination and data-table composition

## Passing Gate

- next, previous, and direct page selection tests exist
- page-range elision is documented and tested
- integration with data-table is verified

## Non-Goals

- infinite-scroll replacement
