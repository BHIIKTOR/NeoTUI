# Component System Roadmap

## Purpose

This file tracks the current state and next planned work for
`@neotui/components`.

The original future-tense extraction plan is no longer the right document for
this repository state. The first-wave component package has landed, the
playground has largely been converted to shared components, and the project is
now in a stabilization-and-expansion phase instead of a package-bootstrap
phase.

Individual component behavior and API details still live under
`docs/components/`. This document exists to answer a different question:

- what is already delivered
- what is still intentionally limited
- what should happen next

## Current State

The repository now has a real `@neotui/components` workspace package with:

- a stabilized public export surface in `packages/components/src/index.ts`
- broad test coverage under `packages/test-utils/tests/`
- reference examples under `examples/`
- active playground coverage in `apps/playground/`
- real non-playground app usage in `apps/ansi-viewer/` and `apps/multiplex/`

The renderer/runtime refactor program is effectively complete. The active work
has shifted to:

- component hardening
- higher-quality editing controls
- broader React adoption
- second-pass workspace features
- release-quality validation and performance follow-up

## Delivered Scope

The following tracks are already implemented at a first usable pass.

### Foundations and Primitives

- theme tokens and interaction helpers
- `ButtonRenderable`
- `BadgeRenderable`
- `PanelRenderable`
- `ToolbarRenderable`
- `SeparatorRenderable`
- `KbdRenderable`

### Navigation and Menus

- `ScrollAreaRenderable`
- `ScrollbarRenderable`
- `SidebarRenderable`
- `TabsRenderable`
- `BreadcrumbRenderable`
- `DropdownMenuRenderable`
- `MenuBarRenderable`
- `ContextMenuRenderable`
- `NavigationMenuRenderable`

### Overlays and Transient UI

- `DialogRenderable`
- `SheetRenderable`
- `DrawerRenderable`
- `OverlayManagerRenderable`
- `ToastRenderable`

### Fields and Controls

- `FieldRenderable`
- `InputControlRenderable`
- `TextareaControlRenderable`
- `SelectControlRenderable`
- `InputFieldRenderable`
- `TextareaFieldRenderable`
- `SelectFieldRenderable`
- `CheckboxRenderable`
- `SwitchRenderable`
- `RadioGroupRenderable`
- `ToggleRenderable`
- `ToggleGroupRenderable`
- `SliderRenderable`

### Discovery, Feedback, Data, and Temporal Input

- `CommandRenderable`
- `SpinnerRenderable`
- `SkeletonRenderable`
- `ProgressRenderable`
- `EmptyRenderable`
- `TableRenderable`
- `DataTableRenderable`
- `PaginationRenderable`
- `CalendarRenderable`
- `DatePickerRenderable`

### Windowing and Workspace

- `WindowRenderable`
- `WindowManagerRenderable`
- `DockLayoutRenderable`

## Status Of The Original Rollout

The original extraction rollout is no longer an active tracker, but its intent
has mostly been realized.

- `C0` through `C12` should be treated as delivered at the first-pass level.
- `C13` is functionally landed:
  exports exist, README usage exists, examples exist, and the React mapping
  plan is documented.
- the remaining work is not "finish creating the package"
  it is "turn the current package into a more stable product surface"

That distinction matters because future planning should optimize for hardening,
not for re-arguing whether the component layer should exist.

## Current Constraints

These are the important remaining limitations that shape the roadmap.

### Textarea Quality Is Still Below The Intended Bar

The current textarea control exists and is useful, but it is still not the
trustworthy multiline editor-like surface described in
`docs/components/19-textarea.md`.

Current work should treat textarea quality as an active product gap, not as a
closed item.

### React Resize Semantics Are Still Narrow

`@neotui/react` now exposes typed wrappers for a representative subset of
`@neotui/components`, but resize-driven rerendering is still intentionally
narrow compared with a mature DOM renderer.

The mapping strategy and current wrapper coverage are documented in
`docs/react-components-mapping.md`, while the remaining resize limitation is
tracked in `artifacts/waivers/m12-react-resize-rerender.md`.

### Performance Is Not Yet At The Original Target Thresholds

The refactor-era release candidate accepted a documented performance waiver.
Performance follow-up remains active engineering work rather than a completed
milestone.

### Manual Kitty Validation Still Has One Human Step Left

Protocol generation is well covered by tests and smoke sessions, and the live
kitty validation artifacts now cover clipboard round-trips, image placement,
and hyperlink rendering. The one remaining manual check is browser-launch
confirmation for a real OSC 8 hyperlink click in a desktop session.

## Roadmap Principles

The next phase should follow these rules.

1. Keep `@neotui/core` and `@neotui/components` separate.
   `core` owns rendering, layout, input, text, and kitty protocol.
   `components` owns reusable UI patterns.

2. Prefer hardening over surface-area sprawl.
   A component that exists but still needs app-local workarounds is not done.

3. Extract from real usage.
   Playground coverage is necessary but not sufficient. Important families
   should keep gaining usage in real apps and examples.

4. Treat tests, examples, and docs as part of the product surface.
   A component family is not healthy if its API, example, and tests tell
   different stories.

5. Close drift quickly.
   Planning docs, release artifacts, README guidance, and shipped code should
   describe the same repository state.

## Active Roadmap

### R1: Stabilization and Documentation Discipline

Status:
Delivered for the current roadmap bar.

Goal:
Make the current component package feel intentional and dependable to a
maintainer or early adopter.

Scope:

- fix interaction regressions uncovered by the playground and examples
- remove remaining misleading future-tense plan language
- keep examples, tests, and README usage aligned with the current exports
- expand non-playground app usage where it removes obvious duplication

Expected deliverables:

- current-state planning docs
- no known high-signal overlay, dialog, field, or dock regressions in the
  shipped demos
- examples and playground remain the consumer of components, not the place
  where components are invented ad hoc

Exit criteria:

- docs in `README.md`, `docs/README.md`, and this file agree on project state
- each first-wave component family has tests and at least one example
- representative families are exercised in real apps outside the playground

### R2: Textarea and Multiline Editing Rewrite

Goal:
Raise the textarea stack to the quality bar described in
`docs/components/19-textarea.md`.

Scope:

- stronger multiline cursor movement
- viewport and scroll model cleanup
- selection correctness
- fixed-height and auto-resize reliability
- mouse placement and drag selection
- better clipboard-oriented editing flows
- stronger test and example coverage

Expected deliverables:

- cleaner split between editor engine, viewport model, renderable surface, and
  themed wrapper
- predictable multiline behavior in dialogs, sheets, windows, and docked panels
- regression-resistant tests for wrapped and unwrapped editing

Exit criteria:

- textarea behavior no longer depends on app-local layout hacks
- multiline navigation and selection work reliably in real sessions
- the textarea spec can be treated as satisfied rather than aspirational

### R3: React Component Wrapper Expansion

Status:
Delivered for the current roadmap bar, with resize-driven rerendering still
explicitly limited.

Goal:
Expose `@neotui/components` through typed React wrappers instead of asking React
consumers to recreate imperative component composition manually.

Scope:

- wrappers for the first-wave component families described in
  `docs/react-components-mapping.md`
- prop-to-constructor mapping and controlled-state support where the imperative
  component already supports it
- ref-based escape hatches for imperative behaviors

Expected deliverables:

- first React-facing wrappers for primitives, navigation, overlays, fields, and
  data/workspace surfaces
- updated React examples that consume wrappers instead of only low-level
  intrinsics

Exit criteria:

- React consumers can use a representative subset of `@neotui/components`
  without app-local shell duplication
- resize limitations remain explicitly documented until they are fully solved

### R4: Workspace Shell Second Pass

Status:
Delivered at the current second-pass scope.

Goal:
Move the windowing, command, overlay, and dock features from first-pass demos
to richer application-shell primitives.

Scope:

- `DockLayoutRenderable` split insertion and richer docking targets
- improved command surface behaviors such as preview/grouping/pinned actions
- window-manager polish around stacking, activation, and utility-window flows
- clearer coordination between dialogs, sheets, drawers, toasts, and managed
  overlays when several coexist

Expected deliverables:

- stronger workspace demos
- clearer API boundaries for app-shell composition
- less bespoke workspace orchestration in app code

Exit criteria:

- the workspace layer feels reusable for real tooling-style apps
- second-pass features do not regress first-pass deterministic behavior

### R5: Release Hardening, Validation, and Performance Follow-Up

Status:
Delivered for the current release-candidate bar, with performance thresholds
still intentionally waived and hyperlink click-through still requiring a human
desktop confirmation.

Goal:
Reduce the gap between "feature complete enough for `rc.1`" and "well defended
for ongoing releases."

Scope:

- manual kitty capability validation follow-up
- benchmark baseline cleanup and fairer comparisons
- performance work on renderer and text hot paths
- artifact and documentation drift cleanup

Expected deliverables:

- updated benchmark and waiver documentation
- current artifact references that point at the live doc locations
- explicit release-quality evidence for the remaining kitty capability checks

Exit criteria:

- benchmark reporting is reproducible and compares like-for-like surfaces
- manual capability claims match the evidence on disk
- release docs no longer reference retired doc locations

## Definition Of Done For New Component Work

Any new component or major expansion should satisfy all of the following.

- public API is documented in `docs/components/`
- deterministic render tests exist
- keyboard tests exist if the component is interactive
- mouse tests exist if the component is interactive
- focus tests exist if it can receive focus
- at least one example exists
- at least one app surface uses it without app-local duplication
- default, focus, hover, active, disabled, and invalid states are defined where
  relevant
- the implementation does not push renderer concerns back into app code

## Non-Goals For This Roadmap

This roadmap still does not aim to deliver:

- native OS window integration
- a second parallel component system inside `@neotui/react`
- animation-heavy compositor work
- full code-editor scope inside textarea
- broad compatibility shims for unrelated historical APIs

## Historical Note

The original speculative extraction plan is intentionally superseded by this
document. Git history remains the archive for the earlier `C0` through `C13`
planning language, while this file tracks the current repository state and the
next sequence of work.
