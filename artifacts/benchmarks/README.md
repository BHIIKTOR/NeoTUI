# Benchmark Artifacts

Milestone benchmark reports are archived under milestone-specific directories in this folder.

Current convention:

- `artifacts/benchmarks/m4/`
- `artifacts/benchmarks/m8/`
- `artifacts/benchmarks/m11/`
- `artifacts/benchmarks/m14/`

Each artifact must be machine-readable JSON and reference the milestone that
produced it.

## Reproduction

Run the full benchmark set from the repo root:

```bash
bun run bench:all
```

That command refreshes:

- `m4`: renderer startup and invalidation scenarios
- `m11`: advanced component render scenarios
- `m8`: text-engine scenarios

## Comparison Rule

Release summaries should compare like-for-like modern surfaces:

- renderer numbers against renderer numbers
- advanced component numbers against advanced component numbers
- text-engine numbers against text-engine numbers
