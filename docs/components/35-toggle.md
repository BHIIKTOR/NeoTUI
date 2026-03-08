# ToggleRenderable

## Purpose

Provide a single pressed/unpressed action chip for cases where a switch or
checkbox is too form-heavy and a regular button does not convey persistent
state.

## Dependencies

- `@neotui/core`
- `ButtonRenderable`
- foundation modules:
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface ToggleRenderableOptions {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToggleRenderable extends Renderable {
  isPressed(): boolean;
  setPressed(pressed: boolean): this;
  toggle(): this;
}
```

## Behavior Contract

- `Space` and `Enter` toggle the pressed state
- mouse click toggles the pressed state
- pressed state must be visibly distinct from focus and hover

## Deterministic Deliverable

- one example demonstrates formatting or filter toggles
- one app surface uses a real pressed-state action

## Passing Gate

- toggle tests exist for keyboard and mouse
- default, focused, pressed, and disabled states are snapshotted

## Non-Goals

- grouped exclusivity, which belongs to `ToggleGroupRenderable`
