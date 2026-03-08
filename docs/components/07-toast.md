# ToastRenderable

## Purpose

Provide an ephemeral notification surface for success, info, warning, and error
messages without forcing apps to reserve permanent layout space for status
strings.

The current playground status line is a useful debug tool, but it is not the
right long-term UX primitive for short-lived feedback.

## Dependencies

- `@neotui/core`
- `ButtonRenderable` for optional dismiss action
- `OverlayManagerRenderable`
- foundation modules:
  - `theme`
  - `overlay-stack`

## Proposed Public API

```ts
export interface ToastRenderableOptions {
  title?: string;
  message: string;
  kind?: "info" | "success" | "warning" | "danger";
  durationMs?: number;
  dismissible?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToastRenderable extends Renderable {
  show(): this;
  hide(): this;
  isVisible(): boolean;
}
```

## Behavior Contract

- toast may auto-dismiss after `durationMs`
- dismissible toasts should expose a close action
- keyboard and mouse behavior should be deterministic
- toast lifecycle should integrate with the overlay manager rather than being
  drawn as app-local text

## Layout Contract

- toast should size to content within a bounded width
- multiple toasts should stack predictably if the manager allows more than one

## Deterministic Deliverable

- at least one example shows timed toast and dismissible toast usage
- at least one app surface uses toast feedback in place of raw status text

## Passing Gate

- auto-dismiss tests exist
- dismiss interaction tests exist
- overlapping toasts do not corrupt the underlying frame
