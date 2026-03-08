# Examples

These examples document the forward NeoTui API surface.

## Core

- `basic-playground.ts`
  Launches the live playground in kitty by default. Use `--print` for a static snapshot.
- `core-basic.ts`
  Core boxes, text, and layout.
- `layout-dashboard.ts`
  Nested rows, columns, percentage sizing, and overlays.
- `widgets-form.ts`
  Input, textarea, select, and tab selection.
- `kitty-features.ts`
  Hyperlinks, clipboard, cursor state, and image placeholder usage.
- `advanced-components.ts`
  Markdown, code, diff, line numbers, and ASCII font surfaces.

## Components

- `components-primitives.ts`
  Buttons, badges, panels, toolbars, and baseline chrome.
- `components-fields.ts`
  Field composition, input, textarea, and select wrappers.
- `components-textarea.ts`
  Focused multiline editing lab with bounded and auto-resize modes.
- `components-menus.ts`
  Menubar, dropdown menu, and context menu surfaces.
- `components-dialogs.ts`
  Dialog, sheet, drawer, toast, and overlay-manager coordination flows.
- `components-choice.ts`
  Checkbox, switch, radio group, toggle, toggle group, slider, and kbd hints.
- `components-feedback.ts`
  Spinner, skeleton, progress, empty state, and toast surfaces.
- `components-data.ts`
  Pagination, presentational tables, and interactive data tables.
- `components-command.ts`
  Command palette filtering, selection, pinned items, and preview behavior.
- `components-navigation-menu.ts`
  Grouped top-level navigation with child routes.
- `components-scrollbar.ts`
  Minimal vertical and horizontal scroll indicators plus a both-axis scroll area.
- `components-calendar.ts`
  Standalone calendar and date picker.
- `components-windows.ts`
  Floating windows with manager-owned activation, resize, and chrome.
- `components-dock.ts`
  Dock workspace with center-swap and edge-insert pane drops.

## React

- `react-bootstrap.ts`
  React package bootstrap metadata.
- `react-counter.tsx`
  React root integration through typed wrappers.
- `react-login.tsx`
  React login form demo built on field and button wrappers.
- `react-workspace.tsx`
  React wrappers for windows, dialogs, and the command surface.

## Apps

- `terminal-session.ts`
  Session lifecycle shell.
- `apps-ansi-viewer.ts`
  Launch the ANSI viewer app surface.
- `apps-multiplex.ts`
  Launch the multiplex-style app surface.
