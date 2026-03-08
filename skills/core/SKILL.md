---
name: core
description: Use when the user asks how to use NeoTui, wants runnable Bun-and-kitty examples, needs help choosing between @neotui/core, @neotui/components, and @neotui/react, or wants guidance on composing modern component-based TUI apps.
---

# NeoTui Usage

Use this skill for the active NeoTui workspace.

## Read in this order

1. `README.md`
   Use for the current package map, command surface, limitations, and quick
   examples.
2. `examples/README.md`
   Use for the example index before opening individual examples.
3. `references/packages.md`
   Read when the user needs help choosing the right package or framework path.
4. `references/components.md`
   Read when the user wants to use the component layer, browse available UI
   surfaces, or map a feature request to existing components/examples.
5. The relevant package entrypoint:
   - `packages/core/src/index.ts`
   - `packages/components/src/index.ts`
   - `packages/react/src/index.tsx`
6. `docs/components-plan.md`
   Read for current roadmap, milestone-status, or design-intent questions.

## Pick the right package

- Use `@neotui/core` for all new Bun-and-kitty applications.
- Use `@neotui/components` for reusable app-level UI such as buttons, dialogs,
  sidebars, windows, tables, menus, and dock layouts.
- Use `@neotui/react` only when the user explicitly wants React or JSX.
- Treat `@neotui/test-utils` and `@neotui/fixtures` as internal support
  packages, not normal app runtime dependencies.

Do not assume the React package exposes the full component library unless the
code actually proves it.

## Current runnable surfaces

Reference apps:

- `apps/playground`
- `apps/ansi-viewer`
- `apps/multiplex`

Reference examples:

- `examples/basic-playground.ts`
- `examples/core-basic.ts`
- `examples/layout-dashboard.ts`
- `examples/widgets-form.ts`
- `examples/kitty-features.ts`
- `examples/advanced-components.ts`
- `examples/components-primitives.ts`
- `examples/components-fields.ts`
- `examples/components-menus.ts`
- `examples/components-dialogs.ts`
- `examples/components-choice.ts`
- `examples/components-feedback.ts`
- `examples/components-data.ts`
- `examples/components-command.ts`
- `examples/components-navigation-menu.ts`
- `examples/components-scrollbar.ts`
- `examples/components-calendar.ts`
- `examples/components-windows.ts`
- `examples/components-dock.ts`
- `examples/react-counter.tsx`
- `examples/react-login.tsx`
- `examples/react-workspace.tsx`

## Commands to prefer

```bash
bun run app:playground
bun run app:ansi-viewer
bun run app:multiplex
bun run verify:kitty
```

For isolated usage examples, prefer `bun run examples/<name>`.

The fastest live catalog for components is `bun run examples/basic-playground.ts`.

## React-specific rules

- The React binding currently targets the core renderer/primitives layer.
- It uses `box`, `scrollbox`, and `tab-select`, plus prefixed intrinsic names
  such as `nb-text`, `nb-input`, `nb-textarea`, `nb-select`, `nb-code`,
  `nb-image`, `nb-form`, and `nb-label`.
- Do not invent unimplemented intrinsic names.
- The React binding supports root mount and unmount, keyboard hooks, timeline
  helpers, and initial terminal-dimension reads.
- Fully reactive resize-driven rerendering is still a documented limitation.

## Important limitations

- The new core is kitty-only.
- The new runtime is Bun-first and Bun-primary.
- The component layer is imperative-first.
- Performance waivers exist for the current release candidate; do not oversell
  the benchmark story.

## Response pattern

When answering usage questions:

1. Start from the package the user should use: `core`, `components`, or `react`.
2. Prefer `@neotui/components` when the request is about app-level UI and the
   component already exists.
3. Give a runnable Bun example whenever practical.
4. Point to the closest existing example or app.
5. Call out limitations directly instead of implying broader support.
6. If the user asks about removed historical surfaces, point them back to the
   current NeoTui packages and examples.
