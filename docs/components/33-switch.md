# Switch

## Purpose

Provide a more explicit on/off control for settings and feature toggles where a
checkbox would feel too form-like or semantically weak.

## Dependencies

- `@neotui/core`
- `FieldRenderable`
- foundation modules:
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface SwitchRenderableOptions {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SwitchRenderable extends Renderable {
  isChecked(): boolean;
  setChecked(checked: boolean): this;
  toggle(): this;
}
```

## Behavior Contract

- `Space` and `Enter` should toggle the switch
- mouse click toggles the switch
- disabled state blocks interaction but remains visually clear
- on/off state must be unambiguous even in monochrome fallback themes

## Deterministic Deliverable

- one example demonstrates settings-like switch rows
- one app surface uses it in a real preferences flow

## Passing Gate

- toggle tests exist for keyboard and mouse
- enabled, focused, and disabled states are snapshotted
- its semantic distinction from checkbox is documented

## Non-Goals

- animated thumb motion as a completion requirement
