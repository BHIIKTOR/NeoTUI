# EmptyRenderable

## Purpose

Provide a first-class empty-state surface for no-results, first-run, and
zero-data cases so apps stop falling back to sad one-line messages.

## Dependencies

- `@neotui/core`
- `ButtonRenderable`
- `BadgeRenderable`
- `KbdRenderable`

## Proposed Public API

```ts
export interface EmptyRenderableOptions {
  title: string;
  description?: string;
  hint?: string;
  actions?: Array<{
    id: string;
    label: string;
    variant?: "primary" | "secondary" | "ghost";
  }>;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class EmptyRenderable extends Renderable {}
```

## Behavior Contract

- actions should be keyboard and mouse reachable
- the empty state should remain visually centered or intentionally aligned as
  configured
- title, description, and hint hierarchy must be clear

## Deterministic Deliverable

- one example demonstrates no-results and first-run empty states
- one app surface uses it instead of ad hoc empty copy

## Passing Gate

- layout snapshots exist for narrow and wide widths
- action activation behavior is tested when actions are present

## Non-Goals

- onboarding tour orchestration
