# Final Drift Audit

Date: `2026-03-08`

## Goal

Compare the implemented repository against the active NeoTui workspace surface
and record any intentional deviations.

## Alignment Summary

- The forward codebase lives in `packages/`, `apps/`, `examples/`, and
  `skills/core/`.
- README, examples, docs, and skill docs describe the same active workspace
  surface.

## Intentional Deviations

1. React intrinsic naming
   The original plan described generic intrinsic names like `text` and `input`.
   The implemented binding keeps `box` and `scrollbox` simple, but uses prefixed
   names like `nb-text`, `nb-input`, `nb-textarea`, `nb-select`, `nb-code`,
   `nb-image`, and `nb-form` to avoid conflicts and ambiguity.

2. React resize behavior
   The React package now includes typed wrappers over a representative subset
   of `@neotui/components`, but fully reactive resize-driven rerendering is
   still a documented limitation. This is recorded in
   `artifacts/waivers/m12-react-resize-rerender.md`.

3. Performance thresholds
   The functional workspace is complete, but the current performance thresholds
   are not met by the benchmark suite. This is recorded in
   `artifacts/waivers/m14-performance-thresholds.md`.

4. Manual capability validation
   Kitty capability escape generation is well covered by transcript tests and
   live PTY smoke, and the live validation artifacts now cover desktop
   clipboard round-trip, image placement, and hyperlink rendering. The one
   remaining human check is browser-launch confirmation for a real hyperlink
   click. This is recorded in
   `artifacts/waivers/m10-manual-kitty-capabilities.md`.

## Conclusion

The repository is aligned with the active NeoTui workspace surface except for
the explicit deviations above. No unrecorded drift remains between the current
docs and the codebase.
