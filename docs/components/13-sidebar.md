# SidebarRenderable

## Purpose

Provide a persistent navigation rail for section switching, workspace discovery,
and contextual actions so apps stop faking sidebars with raw list primitives.

The playground and multiplex app now use `SidebarRenderable` directly. This
spec tracks the current sidebar contract plus the follow-on capabilities that
would make it a stronger application-shell primitive.

## Why It Matters

For kitty-first TUIs, a sidebar is one of the highest-leverage application
surfaces:

- it gives the app durable information scent
- it reduces command discoverability problems
- it provides stable section switching without modal friction
- it gives room for counts, badges, shortcuts, and contextual actions

It also pairs well with the components already shipped:

- `DropdownMenuRenderable` for section actions
- `PanelRenderable` for shell styling
- `WindowRenderable` for app workspaces with tool rails
- `CommandRenderable` for global search and navigation

## Current Implementation Seeds

The current implementation is primarily informed by:

- `packages/components/src/sidebar.ts`
- `apps/playground/src/index.ts`
- `apps/multiplex/src/index.ts`

The remaining work is about richer structure and polish, not about initial
extraction from a playground-only rail.

## Dependencies

- `@neotui/core`
- `PanelRenderable`
- `ButtonRenderable`
- `DropdownMenuRenderable`
- foundation modules:
  - `theme`
  - `interaction-state`
  - `activate`
  - `roving-focus`
  - `chrome`

## Proposed Public API

```ts
export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
  shortcut?: string;
  disabled?: boolean;
  description?: string;
}

export interface SidebarGroup {
  id: string;
  label?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  items: SidebarItem[];
}

export interface SidebarRenderableOptions {
  title?: string;
  subtitle?: string;
  side?: "left" | "right";
  width?: number;
  collapsedWidth?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  groups: SidebarGroup[];
  activeItemId?: string;
  showBadges?: boolean;
  showShortcuts?: boolean;
  footerActions?: Array<{
    id: string;
    label: string;
    icon?: string;
  }>;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SidebarRenderable extends Renderable {
  setActiveItem(id: string): this;
  setCollapsed(collapsed: boolean): this;
  toggleCollapsed(): this;
  collapseGroup(id: string): this;
  expandGroup(id: string): this;
}
```

Optional construct helper:

```ts
export function Sidebar(props: SidebarRenderableOptions): ConstructNode;
```

## Events

- `select`
- `collapseChange`
- `groupCollapseChange`
- `focus`
- `blur`

If footer actions are supported in the first pass, they should emit a distinct
`action` event rather than overloading `select`.

## Structure

Planned regions:

- optional header with title and subtitle
- optional collapse toggle
- grouped navigation body
- optional footer action strip

Each item row should have stable columns for:

- icon or leading marker
- label
- badge or secondary metadata
- shortcut hint

## Layout Contract

- expanded width must be stable and predictable
- collapsed width must still permit a usable item indicator column
- long labels must truncate without breaking row alignment
- groups must not visually merge together when labels or separators are present
- footer actions must stay anchored even when the body scrolls

## Interaction Contract

Navigation:

- `ArrowUp` and `ArrowDown` move between enabled items
- `Home` and `End` jump to the first and last enabled item
- `Enter` activates the focused item
- mouse click activates the clicked item

Collapse:

- collapse toggle should work with keyboard and mouse
- collapsing should preserve the active item
- collapsed mode should keep enough identity to know where the user is

Group behavior:

- collapsible groups should respond to keyboard and mouse
- collapsed groups must remove their items from roving focus order

Focus behavior:

- the sidebar can take focus as a unit
- the active row and the keyboard-focused row must be distinguishable when they
  differ

## Visual Contract

Visual goals:

- the sidebar should read as application chrome, not as a generic form list
- active items should be obvious without becoming heavy blocks of color
- collapsed mode should look intentional, not like clipped content
- group labels should provide hierarchy without competing with actionable rows
- footer actions should feel like utility controls, not part of the main nav

## Deterministic Deliverable

- `SidebarRenderable` exists in `packages/components`
- the playground left rail migrates to it
- at least one example demonstrates expanded and collapsed modes, grouped
  sections, badges, shortcuts, and footer actions

## Passing Gate

- keyboard navigation and activation tests exist
- mouse item activation tests exist
- collapse and expand behavior tests exist
- group collapse behavior is tested
- resize behavior is tested so the sidebar stays stable across terminal width
  changes
- snapshots exist for expanded, collapsed, focused, and inactive states

## Good First Consumers

- the playground section rail
- a docs-browser example
- a multi-pane workspace shell with utility actions in the footer

## Future Extensions

Valuable follow-ons after the base rail lands:

- pinned and recent sections
- nested tree items for file or object explorers
- hover-peek or temporary expand behavior for collapsed rails
- integrated search entrypoint that opens `CommandRenderable`
- per-group dropdown actions

## Non-Goals

The first pass should stay disciplined:

- no full file-tree explorer
- no virtualization for thousands of rows
- no persistence layer for sidebar state yet
- no attempt to solve top nav, menubar, and sidebar in one component
