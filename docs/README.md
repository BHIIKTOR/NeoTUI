# NeoTui Docs

This directory is the active design and planning surface for NeoTui.

## Contents

- `components-plan.md`
  Current-state roadmap for `@neotui/components`.
- `react-components-mapping.md`
  Current plan and status for exposing the component layer through
  `@neotui/react`.
- `shadcn-fit.md`
  Mapping from shadcn/ui concepts to the NeoTui component surface.
- `components/`
  Detailed component-family specs and completion gates.
- `components/README.md`
  Flat index of the tracked component set.

## Scope

- `@neotui/core` owns renderer, layout, input, text, and kitty protocol work.
- `@neotui/components` owns the reusable high-level UI layer.
- `@neotui/react` stays a binding layer over shipped NeoTui surfaces.
- `apps/` and `examples/` should exercise components, not become app-local
  replacement libraries.

## Rules

When a component family changes:

1. Update the relevant spec in `docs/components/`.
2. Update `docs/components-plan.md` if roadmap sequencing changes.
3. Keep tests, examples, and at least one real app usage aligned with the
   shipped behavior.

