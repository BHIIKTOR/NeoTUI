# Scrollbar

## Problem

Some surfaces need explicit scroll affordances without adding bulky nested chrome.
The project already had partial scrollbar behavior in `core` and in
`ScrollAreaRenderable`, but it was not exposed as a reusable component and it
only covered part of the scrolling surface area.

## Goal

Provide a minimal `ScrollbarRenderable` that can:

- render vertical or horizontal indicators
- express viewport size, content size, and current offset deterministically
- sit on the border or outline of another surface without consuming extra space
- be reused by `ScrollAreaRenderable` and later by windows, panes, and other
  scrollable component families

## Proposed API

```ts
interface ScrollbarRenderableOptions {
  orientation?: "vertical" | "horizontal";
  viewportSize?: number;
  contentSize?: number;
  offset?: number;
  alwaysVisible?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}
```

Methods:

- `setMetrics(viewportSize, contentSize, offset)`
- `setOrientation(orientation)`
- `setAlwaysVisible(alwaysVisible)`
- `isOverflowing()`

## Behavior Contract

- The scrollbar is presentation-only. It does not own scrolling state.
- When `alwaysVisible` is false and content fits the viewport, it renders
  nothing.
- Vertical mode uses a one-column indicator.
- Horizontal mode uses a one-row indicator.
- The thumb size is proportional to `viewportSize / contentSize`.
- The thumb position is proportional to `offset / (contentSize - viewportSize)`.
- `ScrollAreaRenderable` should use this component for both vertical and
  horizontal indicators rather than maintaining a private painter.

## Deliverable

- `packages/components/src/scrollbar.ts`
- export from `packages/components/src/index.ts`
- integration inside `ScrollAreaRenderable`
- deterministic tests for standalone scrollbar rendering and both-axis scroll
  area behavior
- at least one example surface

## Passing Gate

- vertical and horizontal indicators render deterministically
- `ScrollAreaRenderable` can expose both-axis scrolling state
- scroll indicators can be shown on pane borders without changing layout width
  or height
- the example runs in snapshot mode and live mode
