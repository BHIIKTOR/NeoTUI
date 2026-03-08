# WindowManagerRenderable

## Purpose

Own multi-window orchestration:

- z-order
- activation
- bring-to-front
- maximize and restore coordination
- minimized-window bookkeeping

Without a manager, `WindowRenderable` is still useful, but any non-trivial
multi-window surface immediately becomes app-local control logic again.

## Dependencies

- `@neotui/core`
- `WindowRenderable`
- `OverlayManagerRenderable` only if modal and non-modal windows need to
  coexist through one shared manager
- foundation modules:
  - `overlay-stack`
  - `focus-trap`

## Proposed Public API

```ts
export interface WindowManagerRenderableOptions {
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class WindowManagerRenderable extends Renderable {
  addWindow(window: WindowRenderable): this;
  removeWindow(windowId: string): this;
  activate(windowId: string): this;
  bringToFront(windowId: string): this;
  minimize(windowId: string): this;
  maximize(windowId: string): this;
  restore(windowId: string): this;
  getActiveWindowId(): string | null;
}
```

## Behavior Contract

- clicking a window should activate it
- activating a window should bring it to front
- only the active window should receive keyboard input by default
- utility-role windows should stay above document-role windows while still participating in activation
- closing the active window should choose a predictable next active window
- maximize and restore should preserve previous bounds

## Deterministic Deliverable

- multi-window demo exists
- active-window tracking is visible and testable

## Passing Gate

- z-order tests exist
- active-window tests exist
- close and focus-handoff tests exist
- maximize and restore tests exist

## Non-Goals

- first-pass tiling manager behavior
- persistent window layouts

Those can be added after the floating-window base is stable.
