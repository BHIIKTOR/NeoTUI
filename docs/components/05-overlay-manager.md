# OverlayManagerRenderable

## Purpose

Own overlay stacking, top-most focus behavior, and z-order for dialogs, toasts,
command palettes, and future floating surfaces.

This component exists because app-local modal stacks are exactly the kind of
logic that should not keep appearing in every application.

## Current Extraction Seed

Primary seeds:

- `packages/components/src/overlay-manager.ts`
- the overlay workspace in `apps/playground/src/component-catalog.ts`

## Dependencies

- `@neotui/core`
- foundation modules:
  - `focus-trap`
  - `overlay-stack`

## Proposed Public API

```ts
export interface OverlayManagerRenderableOptions {
  closeTopOnEscape?: boolean;
  trapFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface OverlayRegistration {
  id: string;
  node: Renderable;
  modal: boolean;
  backdrop?: boolean;
  initialFocus?: Renderable | null;
  restoreFocus?: Renderable | null;
  manageFocus?: boolean;
  exclusiveGroup?: string;
  openOverlay?: () => void;
  closeOverlay?: (reason?: string) => void;
  isOverlayOpen?: () => boolean;
}

export class OverlayManagerRenderable extends Renderable {
  register(entry: OverlayRegistration): this;
  unregister(id: string): this;
  open(id: string): this;
  close(id: string): this;
  closeTop(reason?: string): this;
  getTopOverlayId(): string | null;
}
```

## Behavior Contract

- the manager owns overlay order
- the manager decides which overlay is top-most
- the manager traps focus to the top-most modal overlay
- the manager restores focus when overlays close
- the manager closes only the top-most overlay on `Escape`
- overlays in the same exclusive group replace each other without app-local
  `close everything else` glue
- built-in overlay components can participate through explicit open/close
  adapters without forcing a second overlay stack implementation in app code

## Visual Contract

- backdrop ownership should be consistent
- only the top-most modal should govern backdrop dismissal behavior
- built-in overlays that already own their own backdrop may opt out of manager
  backdrop and focus handling while still participating in stack order

## Deterministic Deliverable

- `OverlayManagerRenderable` exists
- the overlay workspace in the playground uses it to coordinate dialog, sheet,
  drawer, toast, and managed overlay launches
- the app no longer owns a raw modal stack array or a bespoke
  `closeOverlaySurfaces()` helper

## Passing Gate

- stacked dialogs are tested
- focus returns from top stacked dialog to the previous dialog surface
- closing the top modal does not leak focus to the base application
- built-in overlay surfaces can be replaced through one exclusive group without
  stale stack state
