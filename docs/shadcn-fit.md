# shadcn/ui Fit Map

## Purpose

Use the current shadcn/ui component catalog as a pressure test for which UI
patterns are a strong fit for a kitty-first terminal component library, which
patterns should be adapted later, and which patterns are low priority because
they depend too heavily on browser-native affordances.

The goal is not to clone shadcn literally. The goal is to borrow the right
product patterns and then implement them in ways that make sense for a TUI
renderer, keyboard-heavy workflows, and kitty-native capabilities.

Catalog reference:

- `https://ui.shadcn.com/docs/components`

## Strong Fits For This Project

These are high-value, terminal-appropriate patterns that map well to the
current direction of `@neotui/components`.

### Immediate targets

- `button`
- `button-group`
- `dropdown-menu`
- `sidebar`
- `dialog`
- `sheet`
- `popover`
- `command`
- `menubar`
- `context-menu`
- `resizable`
- `tabs`
- `toast`
- `separator`
- `scroll-area`
- `field`
- `input`
- `textarea`
- `select`
- `badge`
- `breadcrumb`
- `table`
- `data-table`
- `empty`
- `spinner`
- `progress`
- `skeleton`
- `kbd`

Why these fit:

- they translate well to keyboard-first interaction
- they improve real app workflows instead of just adding decoration
- they can leverage the current renderer, focus, and layout model directly
- several already have obvious seeds in the playground or core widgets

### Near-term mappings

- shadcn `button` -> `ButtonRenderable`
- shadcn `dropdown-menu` -> `DropdownMenuRenderable`
- shadcn `sidebar` -> `SidebarRenderable`
- shadcn `dialog` and `sheet` -> `DialogRenderable` and overlay family
- shadcn `command` -> `CommandRenderable`
- shadcn `resizable` -> `WindowRenderable` and `DockLayoutRenderable`
- shadcn `card` -> `PanelRenderable`
- shadcn `field` -> `FieldRenderable`

## Good Fits, But Not First-Wave Requirements

These are still useful, but they should follow the first-wave components rather
than block them.

- `accordion`
- `alert`
- `alert-dialog`
- `checkbox`
- `collapsible`
- `drawer`
- `navigation-menu`
- `pagination`
- `radio-group`
- `slider`
- `switch`
- `toggle`
- `toggle-group`
- `tooltip`

Why these are second-wave candidates:

- they are useful, but they do not unblock the main application shell as
  directly as windows, sidebars, dropdowns, dialogs, and command surfaces
- some depend on stronger overlay or focus-manager abstractions that should be
  proven first
- several are straightforward once the first-wave component infrastructure is
  stable

## Conditional Or Domain-Specific Fits

These can be valuable, but only for some apps or after more foundational work.

- `calendar`
- `date-picker`
- `chart`
- `carousel`
- `input-otp`
- `native-select`

Why they are conditional:

- some require higher-density visual rendering than the current component wave
  should prioritize
- some solve narrow product problems rather than broad application-shell needs
- some depend on interaction models that are awkward in a terminal unless the
  rest of the component stack is already mature

## Weak Fits Or Low Priority For Now

These are either mostly documentation aids, heavily browser-native, or not
worth spending early component budget on.

- `aspect-ratio`
- `avatar`
- `direction`
- `hover-card`
- `typography`

Why they are lower priority:

- `aspect-ratio` is mostly a web layout concern
- `avatar` only matters once richer media-heavy social surfaces exist
- `direction` is not a reusable app component
- `hover-card` depends on pointer-hover behavior that should not be a primary
  interaction model in a terminal
- `typography` is a docs/presentation concern, not a first-class UI primitive

## What This Means For The Roadmap

The strongest additions to the existing component plan are:

1. `DropdownMenuRenderable`
2. `SidebarRenderable`
3. a future `MenuBarRenderable`
4. a future `TabsRenderable`
5. a future `ContextMenuRenderable`
6. a future `TableRenderable` and `DataTableRenderable`

That sequence compounds well:

- dropdowns and sidebars improve shell navigation immediately
- menubars and context menus can reuse dropdown internals
- tabs become cleaner once toolbar and navigation patterns are standardized
- data-heavy surfaces make more sense after layout, overlays, and windows are
  already solid

## Constraint Reminder

The browser versions of these components often rely on:

- CSS hover as a primary feedback channel
- arbitrary pixel positioning
- browser focus delegation
- DOM measurement APIs

The terminal versions cannot assume any of that. For this project, a component
only counts as a real fit if it can be implemented cleanly with:

- roving focus
- explicit keyboard semantics
- deterministic mouse hit zones
- terminal-safe layout and clipping
- kitty-native rendering where richer output helps
