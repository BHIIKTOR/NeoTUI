# RadioGroupRenderable

## Purpose

Provide a mutually exclusive selection group with clear focus order, selection
state, and label layout.

## Dependencies

- `@neotui/core`
- `FieldRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupRenderableOptions {
  options: RadioOption[];
  value?: string;
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class RadioGroupRenderable extends Renderable {
  getValue(): string | undefined;
  setValue(value: string): this;
}
```

## Behavior Contract

- arrow keys should move selection according to orientation
- mouse click selects a specific option
- disabled options remain visible and skip focus
- the selected option and the focused option must be distinguishable when they
  are temporarily different

## Deterministic Deliverable

- one example demonstrates vertical and horizontal radio groups
- one settings or filter surface uses it for real mutually exclusive choices

## Passing Gate

- keyboard traversal tests exist
- selection and disabled-option behavior are tested
- row layout remains stable when descriptions are present

## Non-Goals

- virtualized option sets
