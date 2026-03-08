# DrawerRenderable

## Purpose

Provide a compact transient tray surface, typically bottom-anchored, for quick
actions and lightweight workflows that should not claim as much space or chrome
as a full sheet.

Good uses:

- quick filters
- inspector snippets
- notifications with actions
- mobile-like compact settings or action trays

## Relationship To Sheet

- `SheetRenderable` is a broader edge-panel surface
- `DrawerRenderable` is deliberately compact and transient

The distinction matters because the interaction expectations are different.

## Dependencies

- `@neotui/core`
- `OverlayManagerRenderable`
- `PanelRenderable`
- `ButtonRenderable`
- foundation modules:
  - `overlay-stack`
  - `focus-trap`
  - `activate`

## Proposed Public API

```ts
export interface DrawerRenderableOptions {
  title?: string;
  open?: boolean;
  side?: "bottom" | "left" | "right";
  modal?: boolean;
  dismissible?: boolean;
  height?: number | `${number}%`;
  width?: number | `${number}%`;
  compact?: boolean;
  restoreFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DrawerRenderable extends Renderable {
  open(): this;
  close(): this;
  toggle(): this;
}
```

## Behavior Contract

- a bottom drawer should open from the bottom edge by default
- `Escape` and backdrop click dismiss when allowed
- focus should trap only while the drawer is modal
- compact drawers must remain usable in short terminal heights

## Layout Contract

- the drawer should not exceed the configured compact height
- body scrolling should be supported when content exceeds the tray height
- bottom drawers should feel attached to the lower edge, not randomly centered

## Deterministic Deliverable

- one example demonstrates a bottom action drawer
- one app surface uses a drawer for quick actions or compact details

## Passing Gate

- open and close behavior is tested
- compact height clamping is tested on short terminals
- modal and modeless variants are both documented

## Non-Goals

- physics-like pull handles
- gesture-driven drag-to-close behavior in the first pass
