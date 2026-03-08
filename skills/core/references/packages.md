# Package Selection

Use this reference when the user needs help choosing between NeoTui packages or
framework paths.

## Main Package Map

- `@neotui/core`
  Use for renderer ownership, terminal session control, input/event handling,
  text/layout primitives, low-level widgets, and custom renderables.
- `@neotui/components`
  Use for reusable app-level UI surfaces built on top of core: buttons, panels,
  dialogs, sheets, drawers, menus, sidebars, forms, tables, windows, docks,
  command palette, calendars, and feedback surfaces.
- `@neotui/react`
  Use when the user explicitly wants React or JSX. This currently targets the
  core primitive layer, not the full component library.
- `@neotui/test-utils`
  Internal verification helpers. Not a normal runtime dependency for user apps.
- `@neotui/fixtures`
  Internal fixture data and benchmark identifiers. Not a normal runtime
  dependency for user apps.

## Default Recommendations

- New app with imperative UI: `@neotui/core` + `@neotui/components`
- New app with custom renderer behavior or custom widgets: start from
  `@neotui/core`, add `@neotui/components` only where it reduces work
- React app: `@neotui/core` + `@neotui/react`

## Decision Guide

Choose `@neotui/core` when the user asks for:

- a minimal renderer bootstrap
- custom rendering behavior
- direct keyboard/mouse/paste handling
- low-level layout or text engine work
- custom widgets not already covered by the component layer

Choose `@neotui/components` when the user asks for:

- buttons, panels, toolbars, badges, separators, kbd hints
- dialogs, sheets, drawers, toasts, overlay manager
- dropdowns, menubars, context menus, tabs, sidebars, navigation menus
- fields, inputs, textareas, selects, toggles, switches, sliders
- tables, data tables, pagination, empty states, progress, skeletons, spinners
- command palettes
- calendars, date pickers
- windows, window managers, and dock layouts

Choose `@neotui/react` when the user asks for:

- React rendering
- JSX usage
- hooks such as keyboard or renderer/dimension helpers

Important:

- Do not promise React wrappers for the full component library unless the
  current repo explicitly contains them.
- Prefer core/imperative examples when React support is not clearly implemented
  for the requested surface.

## Example Map

- Core bootstrap: `examples/core-basic.ts`
- Core layout: `examples/layout-dashboard.ts`
- Core widgets: `examples/widgets-form.ts`
- Component catalog entrypoint: `examples/basic-playground.ts`
- React examples: `examples/react-counter.tsx`, `examples/react-login.tsx`
