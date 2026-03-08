# Foundations

## Purpose

This file defines the shared substrate required before first-wave components are
implemented. It is intentionally not a user-facing component spec. It exists so
the component layer does not degenerate into one-off app-local patterns with
slightly different behavior and styling.

## Required Internal Modules

Planned internal modules:

- `internal/theme.ts`
- `internal/interaction-state.ts`
- `internal/activate.ts`
- `internal/focus-trap.ts`
- `internal/overlay-stack.ts`
- `internal/chrome.ts`

## Shared Theme Tokens

The component layer needs its own small token surface, independent from app
themes but compatible with them.

Minimum token groups:

- spacing: `xxs`, `xs`, `sm`, `md`, `lg`
- chrome sizes: compact row height, regular row height, title bar height
- radiance colors: focus, hover, active, disabled, danger
- surface variants: muted, default, accent, success, warning, danger
- text hierarchy: title, body, secondary, disabled

Rules:

- tokens are semantic, not app-specific
- components may accept overrides, but defaults should come from tokens
- no component should hard-code playground palette values internally

## Shared Interaction State

Interactive components should share the same state vocabulary:

- `default`
- `hover`
- `focus`
- `pressed`
- `active`
- `disabled`

Rules:

- state transitions should be event-driven and deterministic
- pressed state should not stick after `mouseup` outside activation rules
- disabled state must short-circuit activation

## Shared Activation Helper

The component layer should centralize button-like activation behavior.

Supported activation paths:

- mouse down plus mouse up inside target
- `Enter`
- `Space`
- optional pointer-cancel path when press begins on the component and ends
  outside it

This helper should emit a single normalized "press" action to component code.

## Shared Focus Trap

Modal surfaces and stacked overlays require a shared focus-trap helper.

Responsibilities:

- enumerate focusable descendants for the active modal surface
- cycle only within the active surface on `Tab` and `Shift+Tab`
- restore previous focus when the active surface closes
- avoid leaking focus to underlying app surfaces while modal state is active

## Shared Overlay Stack

Dialogs, toasts, command palettes, and windows all need consistent overlay
coordination.

The shared overlay stack should own:

- overlay registration
- stack order
- top-most overlay lookup
- backdrop visibility policy
- close-top behavior
- per-overlay z-index assignment

## Shared Chrome Helpers

Windows, panels, dialogs, and toolbars all need repeatable chrome patterns.

Shared helpers should cover:

- title bar layout
- footer action row layout
- compact versus regular density
- default border and header treatment

## Foundation Deliverable

Deterministic deliverable:

- the internal modules exist
- at least two components use each of the major helpers where applicable

Passing gate:

- no first-wave component duplicates activation logic
- no first-wave modal component hand-rolls its own focus trap
- no first-wave overlay component owns an app-local stack array
