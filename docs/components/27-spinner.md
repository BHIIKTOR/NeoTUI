# SpinnerRenderable

## Purpose

Provide an indeterminate loading indicator that feels intentional instead of
forcing apps to print a rotating character by hand.

## Dependencies

- `@neotui/core`
- foundation modules:
  - `theme`

## Proposed Public API

```ts
export interface SpinnerRenderableOptions {
  label?: string;
  frameSet?: "dots" | "line" | "pulse";
  intervalMs?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SpinnerRenderable extends Renderable {
  start(): this;
  stop(): this;
}
```

## Behavior Contract

- frame progression must be deterministic in tests
- label text should remain aligned while frames change

## Deterministic Deliverable

- one example demonstrates spinners inside buttons, panels, and empty states

## Passing Gate

- frame progression tests exist
- snapshots cover labeled and unlabeled variants

## Non-Goals

- heavy animation systems
