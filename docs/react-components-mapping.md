# React Components Mapping

This document closes the `C13` requirement to define how `@neotui/react`
should relate to `@neotui/components`.

## Current Surface

`@neotui/react` currently mounts the renderer-core intrinsics that already have
stable imperative renderables:

- `box`
- `scrollbox`
- `markdown`
- `code`
- `diff`
- `image`
- `nb-text`
- `nb-input`
- `nb-textarea`
- `nb-select`

This keeps the current React host narrow and aligned with the code in
`packages/react/src/index.tsx`.

On top of that host, `@neotui/react` now exposes typed wrapper components over
`@neotui/components` instead of expanding the intrinsic string surface.

## Landed Wrappers

The current wrapper pass covers a representative subset across the first-wave
families:

- primitives: `Panel`, `Button`, `Toolbar`, `Badge`
- navigation: `Tabs`, `Sidebar`, `Breadcrumb`, `ScrollArea`
- overlays and workspace command: `Dialog`, `Sheet`, `Drawer`, `Toast`,
  `Command`
- fields and choice controls: `InputField`, `TextareaField`, `SelectField`,
  `Checkbox`, `Switch`, `RadioGroup`, `Toggle`, `ToggleGroup`, `Slider`
- data and temporal surfaces: `Table`, `Pagination`, `Calendar`, `DatePicker`
- workspace shells: `Window`, `WindowManager`

These wrappers are exported from `packages/react/src/wrappers.tsx` and exercised
by `examples/react-counter.tsx`, `examples/react-login.tsx`, and
`examples/react-workspace.tsx`.

## Mapping Rule

The component package should not be exposed by adding dozens of new string
intrinsics. The intended shape is:

- keep low-level renderables as JSX intrinsics in `@neotui/react`
- expose `@neotui/components` as typed React wrapper components
- map React props to the existing imperative component constructors and public
  methods without leaking renderer internals

That split keeps the host config small while letting the higher-level component
APIs evolve in one place.

## Remaining Expansion Targets

The wrappers above are enough to satisfy the current roadmap exit bar, but they
do not cover every component in `@neotui/components` yet. The next additions
should follow the same pattern instead of adding more JSX intrinsic strings:

- primitives and navigation extras: `SeparatorRenderable`, `KbdRenderable`,
  `NavigationMenuRenderable`, `ScrollbarRenderable`
- overlay and data follow-ons: `OverlayManagerRenderable`,
  `DataTableRenderable`
- workspace follow-ons once the imperative API settles: `DockLayoutRenderable`

## Wrapper Expectations

Each React wrapper should follow the same rules:

- constructor options map directly from props
- controlled state is supported where the imperative component already exposes a
  setter, such as `open`, `value`, `activeTabId`, `activeItemId`, or page state
- imperative-only behaviors stay behind refs instead of becoming hidden magic
- focus, keyboard, and pointer semantics stay owned by the underlying
  renderable

## Constraints

- resize-driven rerender behavior remains limited as documented in
  `artifacts/waivers/m12-react-resize-rerender.md`
- no component wrapper should bypass `@neotui/components` and recreate app-local
  shell logic in React
- the React layer should prefer small, composable wrappers over a second,
  parallel component implementation
