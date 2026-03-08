# ProgressRenderable

## Purpose

Provide a determinate progress surface for long-running work, uploads,
processing stages, and installers.

## Dependencies

- `@neotui/core`
- `BadgeRenderable`
- foundation modules:
  - `theme`

## Proposed Public API

```ts
export interface ProgressRenderableOptions {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ProgressRenderable extends Renderable {
  setValue(value: number): this;
}
```

## Behavior Contract

- progress value must clamp deterministically
- the bar and any percentage label must stay in sync
- narrow widths must degrade gracefully

## Deterministic Deliverable

- one example demonstrates progress in forms, tasks, and empty-state recovery

## Passing Gate

- clamping and percentage rendering are tested
- narrow-width snapshots exist

## Non-Goals

- multi-segment timelines in the first pass
