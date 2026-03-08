# Kitty Manual Validation

Date: `2026-03-08T08:30:39.265Z`

## Environment

- `TERM=xterm-kitty`
- `KITTY_WINDOW_ID=6`
- validation window id: `20`

## Command

```bash
bun run verify:kitty
```

## Checks

- kitty environment detected: pass
- clipboard round-trip via OSC 52 and `xclip`: pass
- hyperlink text visible in captured live surface text: pass
- screenshot captured from dedicated kitty OS window: pass

## Artifacts

- screenshot: `artifacts/transcripts/m14/kitty-live-surface.png`
- captured text: `artifacts/transcripts/m14/kitty-live-surface.txt`

## Notes

- clipboard token written by the live surface: `NeoTui kitty validation 2026-03-08T08:30:34.970Z`
- clipboard token read back from the system clipboard: `NeoTui kitty validation 2026-03-08T08:30:34.970Z`
- The screenshot is the release-quality evidence for hyperlink rendering and image placement.
- Browser-launch click-through for the OSC 8 hyperlink still requires a human click in a desktop session and remains documented separately.
