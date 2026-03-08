# ContextMenuRenderable

## Purpose

Provide a reusable right-click or keyboard-invoked action menu tied to the
currently focused or targeted surface.

Context menus are a good fit for a TUI when the app exposes:

- table row actions
- file-tree item actions
- pane actions
- editor selection actions
- dock/workspace actions

## Dependencies

- `@neotui/core`
- `DropdownMenuRenderable`
- `OverlayManagerRenderable`
- foundation modules:
  - `anchored-positioning`
  - `overlay-stack`
  - `focus-trap`

## Proposed Public API

```ts
export interface ContextMenuRenderableOptions {
  items: DropdownMenuItem[];
  open?: boolean;
  anchorPoint?: { x: number; y: number };
  restoreFocus?: boolean;
  closeOnSelect?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ContextMenuRenderable extends Renderable {
  openAt(x: number, y: number): this;
  close(): this;
  setItems(items: DropdownMenuItem[]): this;
}
```

## Behavior Contract

- secondary mouse activation should open the menu at the click point
- keyboard invocation should open relative to the focused target
- `ArrowUp`, `ArrowDown`, `Home`, and `End` should behave like dropdown menus
- `Escape` should close and restore focus
- clicking outside should dismiss the menu

## Layout Contract

- menu origin should be the invocation point when mouse-opened
- near viewport edges, the menu must flip or clamp instead of spilling off
  screen
- point anchoring must remain stable after resize if the target still exists

## Deterministic Deliverable

- one example demonstrates row or pane context actions
- one app surface uses a context menu for item-specific commands

## Passing Gate

- mouse-open and keyboard-open tests exist
- edge-placement tests exist
- implementation reuses dropdown-menu body rendering and navigation internals

## Non-Goals

- browser-like long-press heuristics
- arbitrary rich content inside context menus
