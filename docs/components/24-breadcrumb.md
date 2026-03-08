# BreadcrumbRenderable

## Purpose

Provide a compact hierarchical path surface for navigation context without
making the header chrome heavier than necessary.

## Dependencies

- `@neotui/core`
- `SeparatorRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`

## Proposed Public API

```ts
export interface BreadcrumbItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface BreadcrumbRenderableOptions {
  items: BreadcrumbItem[];
  maxVisibleItems?: number;
  separator?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class BreadcrumbRenderable extends Renderable {
  setItems(items: BreadcrumbItem[]): this;
}
```

## Behavior Contract

- items should be keyboard-reachable when interactive
- collapsed path behavior must preserve the current location semantics
- separators should not be focusable

## Deterministic Deliverable

- one example demonstrates full and truncated breadcrumbs

## Passing Gate

- truncation behavior is tested
- keyboard and mouse activation are tested when interactive
- narrow-width rendering remains legible

## Non-Goals

- file-tree navigation
