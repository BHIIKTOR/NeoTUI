# M14 Manual Smoke

Date: `2026-03-08`

## Commands Run

```bash
TERM=xterm-kitty KITTY_WINDOW_ID=1 bun run app:playground --session-demo
TERM=xterm-kitty KITTY_WINDOW_ID=1 bun run app:ansi-viewer --session-demo
TERM=xterm-kitty KITTY_WINDOW_ID=1 bun run app:multiplex --session-demo
bun run examples/react-counter.tsx
bun run examples/react-workspace.tsx
bun run examples/kitty-features.ts
bun run verify:kitty
```

## Results

- `app:playground`
  Passed. Entered alternate screen, rendered the multi-panel playground, emitted kitty image payload output, and restored terminal state on exit.
- `app:ansi-viewer`
  Passed. Entered alternate screen, rendered the ANSI viewer layout, and restored terminal state on exit.
- `app:multiplex`
  Passed. Entered alternate screen, rendered the multiplex-style workspace, and restored terminal state on exit.
- `examples/react-counter.tsx`
  Passed. Rendered the React binding demo surface to a deterministic string output.
- `examples/react-workspace.tsx`
  Passed. Rendered the React wrapper workspace surface with windows, dialogs, and a command palette.
- `examples/kitty-features.ts`
  Passed. Emitted hyperlink text, clipboard protocol output, cursor state, and kitty image placeholder protocol output.
- `verify:kitty`
  Passed. Launched a dedicated kitty OS window, captured a screenshot of the live hyperlink/image surface, and verified OSC 52 clipboard round-trip through `xclip`.

## Notes

- These smoke runs validate session lifecycle, renderer output, React wrapper render output, and app startup/cleanup in a kitty-shaped PTY environment.
- Browser-launch click-through for the hyperlink still needs a human desktop click and remains the only narrowed kitty-capability waiver.
