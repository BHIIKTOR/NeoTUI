# DropdownMenuRenderable

## Purpose

Provide an anchored menu surface for action lists, small selection lists, and
overflow commands without forcing every app to hand-compose trigger buttons,
overlay cards, focus restore, and keyboard navigation.

This is distinct from the lower-level select widgets already present in
`@neotui/core`:

- `SelectRenderable` is primarily a value selector
- `TabSelectRenderable` is a segmented navigation primitive
- `DropdownMenuRenderable` is an anchored command surface with richer menu item
  semantics

## Status

`DropdownMenuRenderable` already exists in the package and is exercised through
examples plus components that build on the same anchored-menu model. This spec
tracks the behavior contract for the shipped component and the places where the
menu surface can still expand.

## Why It Matters

The project is moving from primitive demos toward application-grade UI. That
transition immediately needs a reusable dropdown layer for:

- toolbar overflow actions
- row action menus
- section or workspace action menus
- menu buttons in title bars and sidebars
- quick choice menus that should not be modeled as full form fields

Without this component, apps will keep rebuilding the same pattern badly:

- one trigger button
- one floating menu card
- one local array for items
- one local focus-restore hack
- one more copy of up/down/Enter/Escape handling

## Current Implementation Seeds

The current implementation is primarily informed by:

- `packages/components/src/dropdown-menu.ts`
- `examples/components-menus.ts`
- `apps/playground/src/component-catalog.ts`

The remaining work is about richer behavior and broader adoption, not about
proving the component should exist.

## Dependencies

- `@neotui/core`
- `ButtonRenderable`
- `PanelRenderable`
- `OverlayManagerRenderable`
- foundation modules:
  - `theme`
  - `interaction-state`
  - `activate`
  - `focus-trap`
  - `overlay-stack`
  - `roving-focus`

## Proposed Public API

```ts
export type DropdownMenuItem =
  | {
      type?: "item";
      id: string;
      label: string;
      description?: string;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      checked?: boolean;
    }
  | {
      type: "separator";
      id: string;
    }
  | {
      type: "label";
      id: string;
      label: string;
    };

export interface DropdownMenuRenderableOptions {
  triggerLabel?: string;
  items: DropdownItem[];
  open?: boolean;
  side?: "bottom" | "top" | "left" | "right";
  align?: "start" | "center" | "end";
  width?: number | "trigger" | "content";
  minWidth?: number;
  maxWidth?: number;
  closeOnSelect?: boolean;
  disabled?: boolean;
  restoreFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DropdownMenuRenderable extends Renderable {
  isOpen(): boolean;
  open(): this;
  close(): this;
  toggle(): this;
  setItems(items: DropdownItem[]): this;
  setActiveItem(id: string): this;
}
```

Optional construct helper:

```ts
export function DropdownMenu(
  props: DropdownMenuRenderableOptions,
): ConstructNode;
```

## Events

- `openChange`
- `select`
- `cancel`
- `focus`
- `blur`

Event payloads should include the selected item id and the item definition when
relevant.

## Structure

Core subregions:

- trigger surface
- anchored menu frame
- optional menu label rows
- menu items
- separators
- optional item description and shortcut columns

The trigger may be either internal or externally supplied later. For the first
pass, shipping an internal trigger is enough to keep the API simple.

## Layout Contract

- menu width may follow the trigger width or content width
- menu height must fit visible items without clipping borders
- anchored placement should prefer the requested side but clamp to viewport
- items with shortcuts must align the shortcut column consistently
- separators must not consume focus
- descriptions must wrap or truncate predictably rather than corrupt row
  alignment

## Interaction Contract

Open behavior:

- mouse click on the trigger opens the menu
- `Enter`, `Space`, or `ArrowDown` on the trigger opens the menu
- if the menu opens, focus moves into the first eligible item

Navigation behavior:

- `ArrowUp` and `ArrowDown` move through enabled items
- `Home` and `End` jump to the first and last enabled items
- typeahead should be supported if multiple items share a menu
- disabled items must be skipped by keyboard focus

Selection behavior:

- `Enter` activates the focused item
- mouse down plus mouse up inside an item activates it
- `closeOnSelect` determines whether the menu closes immediately

Close behavior:

- `Escape` closes the menu
- clicking outside closes the menu
- closing restores focus to the trigger when `restoreFocus` is enabled

## Visual Contract

Visual goals:

- menu frame should be quieter than a dialog and louder than a tooltip
- trigger state should visibly change when the menu is open
- danger items should be clearly marked but not visually noisy
- checked items should have a deterministic marker column
- shortcuts should read as metadata, not primary content

Default rendering should feel closer to an application menu than to a giant
form field.

## Deterministic Deliverable

- `DropdownMenuRenderable` exists in `packages/components`
- one example demonstrates an action menu with labels, separators, shortcuts,
  checked items, and disabled items
- one app surface uses it for a real overflow or action menu

## Passing Gate

- keyboard open, navigation, select, and cancel tests exist
- mouse trigger and item activation tests exist
- focus restore after close is verified
- anchored placement remains correct near viewport edges
- snapshots exist for closed, open, focused, and disabled states

## Good First Consumers

- a toolbar overflow menu in the playground
- a window title-bar actions menu
- a sidebar section-actions menu

## Future Extensions

Good follow-ons once the base menu is stable:

- externally supplied trigger renderables
- nested submenus
- checkbox and radio item groups
- context-menu specialization that shares the same menu body

## Non-Goals

The first pass should not try to solve everything:

- no cascading submenu system in v1
- no arbitrary rich-content rows
- no virtualization for very large menus
- no attempt to replace full form-select workflows
