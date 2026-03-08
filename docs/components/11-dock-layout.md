# DockLayoutRenderable

## Purpose

Provide a reusable workspace layout surface that already supports deterministic
drag reorder and can grow into richer docking behavior.

This is the component that starts to convert the framework from "renderables and
widgets" into something closer to an application shell toolkit.

## Status

`DockLayoutRenderable` exists today and the playground drag workspace already
uses it. This spec now tracks two things:

- the quality bar for the shipped reorder behavior
- the next second-pass docking features that have not landed yet

## Current Implementation Seeds

Primary seed:

- `packages/components/src/dock-layout.ts`
- the drag workspace in `apps/playground/src/index.ts`
- the drag reorder coverage in `packages/test-utils/tests/components-windowing.test.ts`

## Dependencies

- `@neotui/core`
- `PanelRenderable`
- `WindowRenderable` in future integration scenarios
- foundation modules:
  - `interaction-state`
  - `activate`

## Proposed Public API

```ts
export interface DockItem {
  id: string;
  title: string;
  node: Renderable;
}

export type DockDropPlacement = "after" | "before" | "swap";

export interface DockLayoutRenderableOptions {
  items: DockItem[];
  direction?: "row" | "column";
  gap?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DockLayoutRenderable extends Renderable {
  setItems(items: DockItem[]): this;
  reorder(sourceId: string, targetId: string): this;
  move(sourceId: string, targetId: string, placement?: DockDropPlacement): this;
  serializeOrder(): string[];
}
```

## Current Behavior Contract

- panes can be reordered by drag and drop
- dragging over the leading or trailing edge inserts before or after the target
- dragging over the center keeps the simpler swap behavior
- target pane hover state is visible
- order mutation is deterministic
- layout updates after drop without manual child-array surgery in app code

## Future Behavior Contract

Not yet implemented:

- richer docking targets beyond the current before/after insertion bar
- pane undock into floating windows
- persisted workspace trees

## Deterministic Deliverable

- `DockLayoutRenderable` exists
- the playground drag workspace uses it
- order serialization can be tested directly

## Passing Gate

- drag reorder tests exist
- hover target tests exist
- resize does not corrupt pane borders
- application code no longer swaps `children` arrays directly
