# M2 Session Shell Boundaries

These transcript notes document the exact protocol boundary sequence asserted by
the M2 protocol tests and observed in manual kitty validation.

## Activate

1. `ESC[?1049h` enter alternate screen
2. `ESC[?25l` hide cursor
3. `ESC[?2004h` enable bracketed paste
4. `ESC[?1002h` enable drag mouse tracking
5. `ESC[?1006h` enable SGR mouse mode

## Cleanup

1. `ESC[?1002l` disable drag mouse tracking
2. `ESC[?1006l` disable SGR mouse mode
3. `ESC[?2004l` disable bracketed paste
4. `ESC[?25h` show cursor
5. `ESC[?1049l` exit alternate screen

## Manual Validation Notes

- Normal path validated with `bun run app:playground --session-demo` in kitty.
- Failure path validated with `bun run app:playground --session-demo --fail` in kitty.
- Cleanup ran before the failure stack trace was printed on the handled-failure path.
