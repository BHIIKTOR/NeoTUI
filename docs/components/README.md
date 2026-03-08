# Component Catalog

This directory contains one specification per tracked component family for the
current `@neotui/components` package and its next-pass work.

## Index

- `00-foundations.md`
- `01-button.md`
- `02-panel.md`
- `03-toolbar.md`
- `04-dialog.md`
- `05-overlay-manager.md`
- `06-field.md`
- `07-toast.md`
- `08-command.md`
- `09-window.md`
- `10-window-manager.md`
- `11-dock-layout.md`
- `12-dropdown-menu.md`
- `13-sidebar.md`
- `14-sheet.md`
- `15-menubar.md`
- `16-context-menu.md`
- `17-tabs.md`
- `18-input.md`
- `19-textarea.md`
- `20-select.md`
- `21-separator.md`
- `22-scroll-area.md`
- `23-badge.md`
- `24-breadcrumb.md`
- `25-table.md`
- `26-data-table.md`
- `27-spinner.md`
- `28-skeleton.md`
- `29-progress.md`
- `30-empty.md`
- `31-kbd.md`
- `32-checkbox.md`
- `33-switch.md`
- `34-radio-group.md`
- `35-toggle.md`
- `36-toggle-group.md`
- `37-drawer.md`
- `38-navigation-menu.md`
- `39-pagination.md`
- `40-slider.md`
- `41-calendar.md`
- `42-date-picker.md`
- `43-scrollbar.md`

## How To Read These Files

Each spec is structured around the same questions:

- what problem the component solves
- what dependencies it has inside the component layer
- what public API exists now or is being tightened next
- how layout, focus, keyboard, and mouse behavior should work
- what deterministic deliverable proves the shipped implementation is real
- what passing gate proves it is complete enough to trust

The goal is to keep implementation honest. If a component cannot satisfy its
own spec, it should not be treated as production-ready.
