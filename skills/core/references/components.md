# Component Usage

Use this reference when the user wants to build UI with `@neotui/components`.

## How to Guide Users

Default rule:

- Prefer `@neotui/components` for app-level UI.
- Keep `@neotui/core` for renderer setup, root layout, and custom low-level
  behavior.

Typical bootstrap:

```ts
import { ButtonRenderable, PanelRenderable } from "@neotui/components";
import { createKittyRenderer } from "@neotui/core";
```

Then:

1. Create the renderer with `createKittyRenderer()`
2. Configure the root layout/theme
3. Add component renderables to the tree
4. Start the renderer or print a snapshot

## Component Families

### Surfaces

- `ButtonRenderable`
- `PanelRenderable`
- `ToolbarRenderable`
- `BadgeRenderable`
- `SeparatorRenderable`
- `KbdRenderable`

Use these first for most new screens.

Reference example:

- `examples/components-primitives.ts`

### Navigation and Scroll

- `SidebarRenderable`
- `TabsRenderable`
- `BreadcrumbRenderable`
- `ScrollAreaRenderable`
- `ScrollbarRenderable`
- `NavigationMenuRenderable`
- `PaginationRenderable`

Reference examples:

- `examples/navigation-components.ts`
- `examples/components-scrollbar.ts`
- `examples/components-navigation-menu.ts`

### Menus and Overlays

- `DropdownMenuRenderable`
- `MenuBarRenderable`
- `ContextMenuRenderable`
- `DialogRenderable`
- `SheetRenderable`
- `DrawerRenderable`
- `OverlayManagerRenderable`
- `ToastRenderable`
- `CommandRenderable`

Reference examples:

- `examples/components-menus.ts`
- `examples/components-dialogs.ts`
- `examples/components-command.ts`
- `examples/components-feedback.ts`

Important:

- `CommandRenderable` is overlay-style and keyboard-first.
- `OverlayManagerRenderable` is for arbitrary stacked overlays.
- `DialogRenderable`, `SheetRenderable`, and `DrawerRenderable` already manage
  the common modal/edge-surface behavior directly.

### Fields and Input

- `FieldRenderable`
- `InputFieldRenderable`
- `SelectFieldRenderable`
- `TextareaFieldRenderable`
- `InputControlRenderable`
- `SelectControlRenderable`
- `TextareaControlRenderable`

Reference example:

- `examples/components-fields.ts`

Guidance:

- Use field wrappers for labeled app-facing forms.
- Use control renderables directly when the wrapper is too heavy or the layout
  needs tight manual composition.

### Choice Controls

- `CheckboxRenderable`
- `SwitchRenderable`
- `RadioGroupRenderable`
- `ToggleRenderable`
- `ToggleGroupRenderable`
- `SliderRenderable`

Reference example:

- `examples/components-choice.ts`

### Data and Feedback

- `TableRenderable`
- `DataTableRenderable`
- `SpinnerRenderable`
- `SkeletonRenderable`
- `ProgressRenderable`
- `EmptyRenderable`

Reference examples:

- `examples/components-data.ts`
- `examples/components-feedback.ts`

Guidance:

- Use `TableRenderable` for presentational rows.
- Use `DataTableRenderable` for sorting, row selection, and pagination.

### Temporal and Workspace

- `CalendarRenderable`
- `DatePickerRenderable`
- `WindowRenderable`
- `WindowManagerRenderable`
- `DockLayoutRenderable`

Reference examples:

- `examples/components-calendar.ts`
- `examples/components-windows.ts`
- `examples/components-dock.ts`

## Answering Pattern

When a user asks for a component example:

1. Confirm the right package is `@neotui/components`
2. Show the minimal renderer bootstrap from `@neotui/core`
3. Use the smallest component set that satisfies the request
4. Point to the nearest example file
5. Call out any current limitations directly

## Fastest Live Catalog

For interactive browsing or “what components exist?” questions, use:

- `bun run examples/basic-playground.ts`

That surface is the quickest way to inspect real component behavior in kitty.
