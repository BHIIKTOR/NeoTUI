# MenuBarRenderable

## Purpose

Provide an application-level horizontal command bar composed from reusable menu
primitives rather than app-local rows of fake buttons and dropdowns.

This is the terminal equivalent of a desktop app menubar:

- `File`
- `Edit`
- `View`
- `Window`
- `Help`

In a TUI, it is especially valuable for discoverability when keyboard shortcuts
and global commands become too dense to remember.

## Dependencies

- `@neotui/core`
- `DropdownMenuRenderable`
- `ToolbarRenderable`
- `KbdRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface MenuBarMenu {
  id: string;
  label: string;
  items: DropdownMenuItem[];
  disabled?: boolean;
}

export interface MenuBarRenderableOptions {
  menus: MenuBarMenu[];
  activeMenuId?: string;
  openOnFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class MenuBarRenderable extends Renderable {
  openMenu(id: string): this;
  closeMenu(): this;
  setActiveMenu(id: string): this;
}
```

## Behavior Contract

- `ArrowLeft` and `ArrowRight` move between top-level menus
- `Enter`, `Space`, and `ArrowDown` open the active menu
- opening one menu closes the previous one
- mouse click activates and opens a menu
- when a menu is open, moving left or right switches to adjacent menus
- `Escape` closes the open menu and returns focus to the menubar

## Layout Contract

- top-level labels should size to content with consistent padding
- the active top-level label must remain visually distinct when its menu is
  open
- menu popups should align to their trigger label and clamp to the viewport

## Deterministic Deliverable

- one example demonstrates a full application menubar
- a flagship app uses it for real top-level commands

## Passing Gate

- keyboard top-level traversal tests exist
- mouse open and switch behavior tests exist
- the implementation reuses `DropdownMenuRenderable` instead of forking menu
  rendering logic

## Non-Goals

- native OS menu integration
- arbitrarily nested cascading menus in the first pass
