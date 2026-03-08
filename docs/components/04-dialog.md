# DialogRenderable

## Purpose

Encapsulate a single modal dialog surface with a backdrop, focus management, and
structured body/footer content.

The dialog primitive should own "one modal" behavior. It should not also own the
entire overlay stack for every other modal in the app. That responsibility
belongs in `OverlayManagerRenderable`.

## Current Extraction Seed

Primary seeds live in:

- `apps/playground/src/index.ts`

Current real-world flows already present:

- basic close-only dialog
- input-first dialog

## Dependencies

- `@neotui/core`
- `PanelRenderable`
- `ToolbarRenderable`
- `ButtonRenderable`
- foundation modules:
  - `focus-trap`
  - `overlay-stack`
  - `chrome`

## Proposed Public API

```ts
export interface DialogRenderableOptions {
  title?: string;
  variant?: "default" | "info" | "danger";
  open?: boolean;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  initialFocus?: Renderable | null;
  restoreFocus?: Renderable | null;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface DialogCloseDetail {
  reason:
    | "escape"
    | "backdrop"
    | "action"
    | "programmatic"
    | "submit";
}

export class DialogRenderable extends Renderable {
  open(): this;
  close(detail?: DialogCloseDetail): this;
  isOpen(): boolean;
}
```

## Slots

- body
- footer actions

Optional future slot:

- supporting text or subtitle region under the title

## Behavior Contract

- when open, the dialog should register itself with the overlay system
- when open, focus should move to `initialFocus` if provided
- `Escape` should close when enabled
- backdrop click should close when enabled
- closing should restore focus if a restore target is available

## Layout Contract

- dialog width and height should be configurable without app-local absolute math
- body should grow naturally
- footer should reserve enough space for actions

## Deterministic Deliverable

- `DialogRenderable` exists
- the basic dialog and input dialog in the playground use it
- the dialog no longer manually wires a backdrop and a card in app code

## Passing Gate

- close reasons are tested
- focus trap works for a single modal dialog
- backdrop close is tested
- restore focus is tested

## Non-Goals

- stacked modal ownership
- non-modal floating windows

Those belong to the overlay and window layers.
