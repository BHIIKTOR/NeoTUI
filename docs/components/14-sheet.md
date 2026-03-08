# SheetRenderable

## Purpose

Provide an edge-anchored overlay surface for secondary workflows that should
feel lighter than a centered dialog but more substantial than a dropdown menu
or popover.

In a kitty-first TUI, sheets are useful for:

- settings panels
- inspectors
- details panels
- command history or activity sidecars
- inline editors that should not replace the main workspace

## Relationship To Other Overlays

- `DialogRenderable` is centered and explicitly modal-first
- `SheetRenderable` is edge-anchored and can be modal or modeless
- `DrawerRenderable` is a more compact transient tray, usually from the bottom

The library should not collapse all three into one vague overlay primitive.

## Dependencies

- `@neotui/core`
- `OverlayManagerRenderable`
- `PanelRenderable`
- `ButtonRenderable`
- foundation modules:
  - `overlay-stack`
  - `focus-trap`
  - `activate`
  - `anchored-positioning`

## Proposed Public API

```ts
export interface SheetRenderableOptions {
  title?: string;
  description?: string;
  side?: "left" | "right" | "top" | "bottom";
  open?: boolean;
  modal?: boolean;
  dismissible?: boolean;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  minWidth?: number;
  minHeight?: number;
  showCloseButton?: boolean;
  restoreFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface SheetCloseDetail {
  reason: "escape" | "backdrop" | "action" | "programmatic";
}

export class SheetRenderable extends Renderable {
  open(): this;
  close(detail?: SheetCloseDetail): this;
  toggle(): this;
  setSide(side: "left" | "right" | "top" | "bottom"): this;
}
```

## Structure

Planned regions:

- optional backdrop
- anchored container
- header
- body
- optional footer actions

## Behavior Contract

- `Escape` closes the sheet when dismissible
- clicking the backdrop closes the sheet when modal and dismissible
- focus moves into the sheet on open and restores on close when enabled
- close and open state changes emit deterministic events so higher-level overlay
  coordination can observe sheet lifecycle without app-local polling
- edge placement must remain stable after terminal resize
- modeless sheets must not trap focus like dialogs do

## Layout Contract

- side sheets should reserve a stable width and fill available height
- top and bottom sheets should reserve a stable height and fill available width
- header and footer chrome must not overlap scrollable body content
- sheet bounds must clamp to the viewport if requested size exceeds it

## Deterministic Deliverable

- one example demonstrates left, right, and bottom sheet usage
- one app surface uses a sheet for a real secondary workflow

## Passing Gate

- open, close, and restore-focus tests exist
- side placement is tested at narrow and wide terminal widths
- modal and modeless sheet behavior are both documented and tested

## Non-Goals

- animation-first slide choreography
- replacing floating windows
- nested sheet orchestration in the first pass
