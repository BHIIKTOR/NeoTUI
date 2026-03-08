# M10 Manual Kitty Capability Waiver

Date: `2026-03-08`

## Waived Checks

- manual browser-launch click-through verification for the OSC 8 hyperlink

## Reason

The repository now includes live kitty-session evidence for:

- OSC 52 clipboard round-trip through the system clipboard
- visual image placement inside a dedicated kitty OS window
- live hyperlink rendering plus captured OSC 8 text output

The one remaining gap is the final human browser-launch confirmation for a real
mouse click on the hyperlink. That last step still needs a person at the
desktop session and is intentionally recorded as a narrow waiver rather than
treated as already proven.

## Evidence Used Instead

- `packages/test-utils/tests/protocol.test.ts`
- `examples/kitty-features.ts`
- `artifacts/transcripts/m10/kitty-capabilities.md`
- `artifacts/transcripts/m14/manual-smoke.md`
- `artifacts/transcripts/m14/kitty-manual-validation.md`
- `artifacts/transcripts/m14/kitty-live-surface.png`
- `artifacts/transcripts/m14/kitty-live-surface.txt`

## Decision

`M10` and `M14` may close with this narrowed waiver recorded as long as
transcript tests, app smoke sessions, and the live kitty validation artifact
remain green.
