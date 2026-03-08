# SkeletonRenderable

## Purpose

Provide loading placeholders that preserve layout while real content is still
pending.

## Dependencies

- `@neotui/core`
- foundation modules:
  - `theme`

## Proposed Public API

```ts
export interface SkeletonRenderableOptions {
  width?: number | "fill";
  height?: number;
  variant?: "line" | "block" | "avatar";
  animated?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SkeletonRenderable extends Renderable {}
```

## Behavior Contract

- animated and static variants should both exist
- skeletons should preserve final layout footprints rather than behaving like
  unrelated decorative bars

## Deterministic Deliverable

- one example demonstrates realistic loading placeholders for lists and cards

## Passing Gate

- line and block variants are snapshotted
- animation stepping is deterministic when enabled

## Non-Goals

- arbitrary shimmer art
