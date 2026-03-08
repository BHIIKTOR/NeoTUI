# CommandRenderable

## Purpose

Provide a modern high-leverage command surface for keyboard-driven workflows.

This component is important because it proves the library can support real
application UX patterns instead of just primitive widget collections.

The first implementation can render like a command palette, but the component
name should stay broader than "palette" because the same interaction model can
also power embedded action launchers and scoped pickers.

## Dependencies

- `@neotui/core`
- `DialogRenderable`
- `OverlayManagerRenderable`
- `FieldRenderable` or direct input primitives
- `PanelRenderable`
- `ScrollAreaRenderable`
- foundation modules:
  - `focus-trap`
  - `overlay-stack`
  - `roving-focus`

## Proposed Public API

```ts
export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  group?: string;
  shortcut?: string;
  disabled?: boolean;
  pinned?: boolean;
}

export interface CommandRenderableOptions {
  items: CommandItem[];
  placeholder?: string;
  maxResults?: number;
  recentIds?: string[];
  recentLimit?: number;
  open?: boolean;
  variant?: "overlay" | "inline";
  previewTitle?: string;
  renderPreview?: (item: CommandItem | null) => string | null | undefined;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class CommandRenderable extends Renderable {
  open(): this;
  close(): this;
  setItems(items: CommandItem[]): this;
  setQuery(query: string): this;
  setRecentIds(ids: string[]): this;
  recordRecent(itemId: string): this;
  clearRecent(): this;
}
```

## Behavior Contract

- query input should receive initial focus
- result list should update deterministically as query changes
- `ArrowUp` and `ArrowDown` should move selection
- `Enter` should submit selection
- `Escape` should close and restore focus

## Current Optional Behaviors

- grouped results
- pinned actions via `item.pinned`
- recent actions via `recentIds` / `recordRecent()`
- optional preview panel via `renderPreview`

## Future Behaviors

- richer ranking beyond deterministic group + pinned + recent ordering
- app-defined persistence for recents across sessions

## Deterministic Deliverable

- example app or example file exists
- the palette can open, filter, submit, and close deterministically
- an inline variant or documented future path exists without changing the core
  command filtering model

## Passing Gate

- query filtering tests exist
- selection movement tests exist
- optional preview behavior is tested if enabled
- restore-focus tests exist
- the palette is documented as a real workflow surface, not a toy mockup

## Non-Goals

- fuzzy ranking beyond a deterministic first implementation
- omnibox-style freeform command parsing
- remote command execution or app-level permissioning
