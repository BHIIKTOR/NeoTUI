# M14 Performance Threshold Waiver

Date: `2026-03-08`

## Waived Gates

- cold start to first paint at least `25%` faster than the original `M1`
  project baseline
- partial invalidation render time at least `40%` faster than the original
  `M1` project baseline
- keypress-to-paint latency `p95 <= 16ms`
- large-textarea edit latency `p95 <= 8ms`
- strict predecessor-regression accounting for every hot path

## Measured Values

From:

- `artifacts/benchmarks/m4/renderer-baseline.json`
- `artifacts/benchmarks/m11/advanced-components.json`
- `artifacts/benchmarks/m8/text-engine.json`

Key values:

- `renderer-empty-startup` `p50 = 9.046016ms`
- `renderer-partial-invalidation` `p50 = 12.160831ms`
- `advanced-code-render` `p50 = 10.155335ms`
- `text-edit-latency` `p95 = 190.828076ms`

## Reason

The benchmark reporting is now reproducible and compares like-for-like modern
surfaces, but the measured numbers still miss the stricter release thresholds,
especially in the text engine.

The repository now keeps two ideas separate:

- benchmark reporting should be honest and reproducible
- release thresholds can still be waived when the measured numbers remain above
  target

The repository now prioritizes:

- architectural completion
- deterministic renderer behavior
- kitty-native protocol coverage
- examples, apps, docs, and test coverage

over treating the current latency numbers as release-blocking today.

## Decision

`0.1.0-rc.1` may proceed with this waiver recorded. Performance remains an
explicit follow-up area after the architectural rewrite is stabilized, but the
artifact archive itself now uses reproducible, like-for-like comparisons.
