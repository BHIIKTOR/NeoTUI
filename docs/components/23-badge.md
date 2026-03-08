# BadgeRenderable

## Purpose

Provide compact metadata chrome for statuses, counts, filters, and semantic
tags without requiring a full button or panel surface.

## Dependencies

- `@neotui/core`
- foundation modules:
  - `theme`

## Proposed Public API

```ts
export interface BadgeRenderableOptions {
  label: string;
  variant?: "default" | "secondary" | "success" | "warning" | "danger";
  emphasis?: "subtle" | "solid";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class BadgeRenderable extends Renderable {
  setLabel(label: string): this;
}
```

## Behavior Contract

- badges are display-only in the first pass
- color and emphasis variants must remain legible in low-contrast themes

## Deterministic Deliverable

- one example demonstrates badges in tabs, sidebars, and tables

## Passing Gate

- variant snapshots exist
- inline badge alignment is tested in text-heavy rows

## Non-Goals

- interactive chips, which should use toggle or button primitives
