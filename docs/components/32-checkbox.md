# Checkbox

## Purpose

Provide a compact boolean control with consistent checked, unchecked,
indeterminate, disabled, and focused states.

## Dependencies

- `@neotui/core`
- `FieldRenderable`
- `BadgeRenderable` only for future metadata decorations
- foundation modules:
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface CheckboxRenderableOptions {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class CheckboxRenderable extends Renderable {
  isChecked(): boolean;
  setChecked(checked: boolean): this;
  setIndeterminate(indeterminate: boolean): this;
  toggle(): this;
}
```

## Behavior Contract

- `Space` toggles the checkbox
- mouse click toggles the checkbox
- indeterminate state should transition predictably when toggled
- disabled checkboxes must remain visible but inert

## Deterministic Deliverable

- one example demonstrates unchecked, checked, indeterminate, and disabled
  states
- one form surface uses checkbox controls via `FieldRenderable`

## Passing Gate

- keyboard and mouse toggle tests exist
- all visual states are snapshotted
- label click-to-toggle behavior is documented and tested when supported

## Non-Goals

- hierarchical tree-check behavior
