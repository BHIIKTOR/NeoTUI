# Input

## Purpose

Provide a themed, opinionated single-line text input control in
`@neotui/components` without forcing every consumer to work directly
against the lower-level `@neotui/core` input primitive.

The component layer should not replace `core` editing buffers. It should wrap
them with:

- stable chrome
- placeholder styling
- invalid and disabled states
- clear focus treatment
- consistent sizing rules

## Dependencies

- `@neotui/core`
- `FieldRenderable` for labeled composition
- foundation modules:
  - `theme`
  - `interaction-state`
  - `activate`

## Proposed Public API

```ts
export interface InputControlRenderableOptions {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  type?: "text" | "search" | "password";
  width?: number | "fill";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class InputControlRenderable extends Renderable {
  getValue(): string;
  setValue(value: string): this;
  focus(): this;
  blur(): this;
  clear(): this;
}

export function Input(
  props: InputControlRenderableOptions,
): ConstructNode;
```

## Behavior Contract

- single-line editing must remain delegated to the core text engine
- placeholder text must disappear as soon as value becomes non-empty
- password mode must mask visible text but preserve underlying value
- disabled and read-only states must both block editing, but read-only should
  remain focusable when useful

## Layout Contract

- compact and regular heights should share the same baseline alignment
- the control should support `fill` width in forms and toolbars
- long values must scroll horizontally without corrupting borders

## Deterministic Deliverable

- one example demonstrates text, search, and password variants
- one app surface uses the component instead of raw core input styling

## Passing Gate

- keyboard editing tests exist
- placeholder, disabled, read-only, and invalid states are snapshotted
- field composition with `FieldRenderable` is documented

## Non-Goals

- multiline editing
- autocomplete in the first pass
