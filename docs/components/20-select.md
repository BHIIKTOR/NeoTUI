# Select

## Purpose

Provide a themed selection control that composes a field, trigger, and option
list with consistent component-layer styling.

The library already has lower-level list and select primitives in `core`. The
component layer should provide a cleaner, reusable product surface.

## Dependencies

- `@neotui/core`
- `FieldRenderable`
- `DropdownMenuRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectControlRenderableOptions {
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  invalid?: boolean;
  open?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SelectControlRenderable extends Renderable {
  getValue(): string | undefined;
  setValue(value: string): this;
  open(): this;
  close(): this;
}

export function Select(
  props: SelectControlRenderableOptions,
): ConstructNode;
```

## Behavior Contract

- the closed control should render the selected label or placeholder
- `Enter`, `Space`, and `ArrowDown` should open the option list
- arrow keys navigate enabled options
- selection closes the list and restores focus to the trigger

## Layout Contract

- trigger width should be stable as labels change
- long labels must truncate without shifting the caret or disclosure affordance
- the options list should align to the trigger and clamp to the viewport

## Deterministic Deliverable

- one example demonstrates basic, disabled, and long-option selects
- one app surface uses the component rather than custom list composition

## Passing Gate

- open, navigation, selection, and close tests exist
- invalid and disabled states are snapshotted
- the component clearly documents when to prefer it over dropdown-menu

## Non-Goals

- multi-select in the first pass
- remote option virtualization
