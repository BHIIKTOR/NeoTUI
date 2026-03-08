# ScrollAreaRenderable

## Purpose

Provide a reusable scroll viewport with optional scrollbars so every longer
surface does not have to invent its own clipping and scroll chrome.

## Dependencies

- `@neotui/core`
- `SeparatorRenderable`
- foundation modules:
  - `scroll-controller`
  - `interaction-state`

## Proposed Public API

```ts
export interface ScrollAreaRenderableOptions {
  direction?: "vertical" | "horizontal" | "both";
  showScrollbars?: boolean;
  scrollbarVisibility?: "always" | "hover" | "auto";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ScrollAreaRenderable extends Renderable {
  scrollTo(x: number, y: number): this;
  scrollBy(dx: number, dy: number): this;
  getScrollPosition(): { x: number; y: number };
}
```

## Behavior Contract

- mouse wheel and keyboard scrolling should be supported
- scrollbars must reflect viewport position deterministically
- focusable content inside the scroll area must remain reachable

## Deterministic Deliverable

- one example demonstrates long-form content and a scrollable list
- at least one other component composes it directly

## Passing Gate

- vertical and horizontal scroll behavior are tested
- scrollbar rendering and clamping are tested
- resize behavior is verified

## Non-Goals

- virtualized rendering in the first pass
