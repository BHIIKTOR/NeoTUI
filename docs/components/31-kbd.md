# KbdRenderable

## Purpose

Provide a small presentational token for keyboard shortcuts, key hints, and
inline interaction help.

## Dependencies

- `@neotui/core`
- foundation modules:
  - `theme`

## Proposed Public API

```ts
export interface KbdRenderableOptions {
  label: string;
  compact?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class KbdRenderable extends Renderable {}
```

## Behavior Contract

- this is presentational, not focusable
- it must remain legible inline with body text and inside toolbars or badges

## Deterministic Deliverable

- one example demonstrates command hints and shortcut legends

## Passing Gate

- inline and standalone snapshots exist
- compact mode remains readable

## Non-Goals

- capturing keyboard input itself
