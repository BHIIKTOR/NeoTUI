# M12 React Resize Rerender Waiver

Date: `2026-03-08`

## Limitation

`@neotui/react` currently supports:

- root mount and unmount
- keyboard hook subscriptions
- initial terminal-dimension reads
- timeline-driven local rerendering
- typed wrappers over a representative subset of `@neotui/components`

It does not claim full resize-driven rerender parity for every React surface in
the way a mature DOM renderer would.

## Reason

The React milestone was scoped to expose the stable core and reusable component
layer through a separate binding without leaking private internals or creating
a second component system. The implemented binding now meets that bar through
typed wrappers, but the resize story remains intentionally narrow and is
documented as a current limitation rather than hidden behavior.

## Evidence

- binding implementation:
  `packages/react/src/index.tsx`
- wrapper implementation:
  `packages/react/src/wrappers.tsx`
- tests:
  `packages/test-utils/tests/react.test.tsx`
- examples:
  `examples/react-counter.tsx`
  `examples/react-login.tsx`
  `examples/react-workspace.tsx`
- docs:
  `README.md`
  `docs/react-components-mapping.md`

## Decision

`M12` and the current `R3` roadmap bar close with the documented limitation
accepted. Future work may broaden resize semantics, but it is not a blocker for
the current release candidate.
