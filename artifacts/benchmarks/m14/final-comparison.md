# M14 Final Benchmark Comparison

Date: `2026-03-08`

## Commands Run

```bash
bun run bench:all
```

## Source Artifacts

- `artifacts/benchmarks/m4/renderer-baseline.json`
- `artifacts/benchmarks/m11/advanced-components.json`
- `artifacts/benchmarks/m8/text-engine.json`

## Comparison Rule

This summary intentionally compares only like-for-like modern surfaces.

- Renderer scenarios are compared within the renderer family.
- Advanced component scenarios are compared within the advanced render family.
- Text-engine scenarios are compared within the text family.

The archived `m1` artifacts remain historical context only and are no
longer treated as the release-quality comparison baseline for the current
runtime.

## Current Snapshot

### Renderer

| Scenario | p50 | p95 |
| --- | --- | --- |
| `renderer-empty-startup` | `9.046016ms` | `11.538084ms` |
| `renderer-full-render` | `11.605661ms` | `15.569257ms` |
| `renderer-partial-invalidation` | `12.160831ms` | `15.867035ms` |

### Advanced Components

| Scenario | p50 | p95 |
| --- | --- | --- |
| `advanced-markdown-render` | `10.046631ms` | `21.279143ms` |
| `advanced-code-render` | `10.155335ms` | `12.149630ms` |
| `advanced-diff-render` | `10.474322ms` | `12.243998ms` |
| `advanced-large-text-render` | `11.132485ms` | `13.428656ms` |

### Text Engine

| Scenario | p50 | p95 |
| --- | --- | --- |
| `text-wrap-10k` | `250.068995ms` | `260.462045ms` |
| `text-edit-latency` | `178.453123ms` | `190.828076ms` |
| `text-selection-large` | `17.486118ms` | `19.583737ms` |

## Interpretation

- The benchmark workflow is now reproducible from one command and records
  modern surfaces without pretending they are equivalent to the narrow older
  `m1` module-load artifacts.
- Renderer and advanced-component scenarios are comfortably interactive for the
  current scope, but the textarea/text-engine path remains well above the
  long-term latency target.
- Performance follow-up is therefore still real work, but the reporting itself
  is now honest about what is and is not being compared.

## Decision

Performance thresholds remain waived through
`artifacts/waivers/m14-performance-thresholds.md`, but the benchmark archive
itself is now reproducible and like-for-like.
