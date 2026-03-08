# `0.1.0-rc.1` Release Notes Draft

## Summary

`NeoTui` now ships a Bun-first, TypeScript-first, kitty-only workspace with a
new renderer, layout system, text engine, reusable components, React bindings,
and flagship example apps.

## New Packages

- `@neotui/core`
- `@neotui/components`
- `@neotui/react`
- `@neotui/test-utils`
- `@neotui/fixtures`

## Major Features

- renderer kernel with explicit tree ownership, invalidation, diffed painting,
  overlays, and session lifecycle
- flex-style layout with percentage sizing, gap, clipping, overlays, and resize
  propagation
- kitty-native keyboard, mouse, paste, hyperlink, clipboard, cursor, graphics,
  and synchronized-update helpers
- grapheme-aware text measurement, wrapping, selection, and editing primitives
- interactive widgets for input, textarea, select, and tab selection
- reusable component families for navigation, overlays, forms, data, feedback,
  temporal input, and workspace shells
- advanced content surfaces for markdown, code, diff, line numbers, ASCII font,
  and image placeholder rendering
- React root integration plus typed wrappers over reusable component surfaces

## Reference Apps

- `apps/playground`
- `apps/ansi-viewer`
- `apps/multiplex`

## Migration Notes

- New code should target `@neotui/core` and `@neotui/components`.
- React integrations should target `@neotui/react`.
- The repository surface is now NeoTui-only; retired sidecar surfaces and
  historical runtime code are no longer shipped in-tree.

## Known Limitations

- kitty is the only first-class terminal target
- React resize-driven rerender support is intentionally limited
- release-plan performance thresholds are waived for this release candidate
- manual desktop validation for hyperlink click-through remains a narrow waiver
