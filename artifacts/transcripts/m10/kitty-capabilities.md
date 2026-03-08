# M10 Kitty Capability Transcript Archive

Date: `2026-03-08`

## Scope

This archive records where the repository proves the kitty-native protocol
features introduced for `M10`.

## Transcript-Covered Features

- synchronized updates
- kitty graphics payload emission
- OSC 8 hyperlinks
- OSC 52 clipboard writes
- cursor visibility, shape, color, and blink control

## Primary Evidence

- Protocol writer implementation:
  `packages/core/src/protocol.ts`
- Transcript-facing runtime integration:
  `packages/core/src/renderer.ts`
  `packages/core/src/terminal-session.ts`
- Transcript tests:
  `packages/test-utils/tests/protocol.test.ts`
- Example surface that emits hyperlink, clipboard, cursor, and image protocol
  output:
  `examples/kitty-features.ts`

## Verification Commands

```bash
bun run test:protocol
bun run examples/kitty-features.ts --print
bun run verify:kitty
```

## Notes

- `test:protocol` is the deterministic source of truth for exact escape
  ordering.
- `examples/kitty-features.ts --print` remains the deterministic transcript
  source for the current clipboard and image protocol output.
- `verify:kitty` captures live-session evidence for hyperlink rendering,
  clipboard round-trip, and image placement in a dedicated kitty window.
- Human validation of final browser-launch click-through is the only remaining
  manual step and is tracked separately in
  `artifacts/waivers/m10-manual-kitty-capabilities.md`.
