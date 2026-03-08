# WindowRenderable

## Purpose

Provide a floating application window surface with a title bar, control buttons,
content area, and optional footer.

This is not the same thing as a dialog:

- dialogs are modal overlays with explicit close semantics
- windows are potentially non-modal, movable, resizable surfaces that can
  coexist in the same workspace

## Why It Matters

The project is aiming at richer kitty-first UI patterns. A proper terminal
window primitive unlocks:

- floating inspectors
- preview panes
- scratch windows
- transient tool panels
- multi-window demos without hard-coded box coordinates

## Dependencies

- `@neotui/core`
- `PanelRenderable`
- `ToolbarRenderable`
- `ButtonRenderable`
- foundation modules:
  - `chrome`
  - `interaction-state`
  - `activate`

## Proposed Public API

```ts
export type WindowRole = "document" | "utility";

export interface WindowRenderableOptions {
  title: string;
  subtitle?: string;
  role?: WindowRole;
  x?: number;
  y?: number;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  active?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class WindowRenderable extends Renderable {
  setActive(active: boolean): this;
  moveTo(x: number, y: number): this;
  resizeTo(width: number, height: number): this;
  maximize(): this;
  minimize(): this;
  restore(): this;
}
```

## Structure

Planned regions:

- title bar
- control cluster
- body
- optional footer or status bar

## Behavior Contract

- title bar drag should move the window
- window controls should emit close, maximize, and minimize actions
- active window should have stronger chrome than inactive windows
- utility-role windows should be usable for palettes and inspectors without app-local z-index hacks
- resizing should honor min and max bounds

## Layout Contract

- the title bar must reserve space for controls
- body must not overlap title bar or footer
- resize handles must not corrupt body layout

## Deterministic Deliverable

- `WindowRenderable` exists
- example demonstrates one movable and resizable window
- active and inactive windows render differently

## Passing Gate

- drag tests exist
- resize tests exist
- control button activation tests exist
- body layout remains correct after move and resize

## Non-Goals

- OS-native desktop window semantics
- external compositor integration

The terminal window component is an in-app UI surface only.
