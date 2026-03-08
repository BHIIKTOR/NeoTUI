# SeparatorRenderable

## Purpose

Provide a lightweight structural divider for rows, columns, menus, toolbars,
and dense panel chrome without forcing apps to hand-draw glyph runs.

## Dependencies

- `@neotui/core`
- foundation modules:
  - `theme`

## Proposed Public API

```ts
export interface SeparatorRenderableOptions {
  orientation?: "horizontal" | "vertical";
  inset?: boolean;
  label?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SeparatorRenderable extends Renderable {}
```

## Behavior Contract

- separators do not receive focus
- labeled separators remain readable without behaving like section headers

## Deterministic Deliverable

- one example demonstrates horizontal, vertical, and labeled separators

## Passing Gate

- separator rendering is snapshotted at multiple widths
- inset behavior is documented and tested

## Non-Goals

- interactive splitters, which belong to resizable or dock surfaces
