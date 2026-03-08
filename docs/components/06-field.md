# FieldRenderable

## Purpose

Standardize labeled field composition around existing input primitives.

The project already has useful input primitives in `core`, but apps still have
to manually assemble:

- label
- description
- input control
- validation message
- required state

This component family should remove that repetition.

## Why It Matters

The project already has useful input primitives in `core`, but apps still have
to manually assemble:

- label
- description
- control chrome
- validation message
- required state
- disabled propagation

That duplication is manageable for one demo, but it becomes a liability as soon
as dialogs, settings panes, and data filters all need consistent field layout.

## Component Family

Planned family:

- `FieldRenderable`
- `InputFieldRenderable`
- `TextareaFieldRenderable`
- `SelectFieldRenderable`
- future specializations for checkbox groups, radio groups, and date fields

The wrapper and the concrete field variants should share the same layout model.

## Dependencies

- `@neotui/core`
- `PanelRenderable` only if grouped-field variants need it
- `ButtonRenderable` for future inline actions
- foundation modules:
  - `theme`
  - `chrome`

## Proposed Public API

```ts
export interface FieldRenderableOptions {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
  validationState?: "default" | "error" | "success" | "warning";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface InputFieldRenderableOptions extends FieldRenderableOptions {
  input: InputRenderable | TextareaRenderable | SelectRenderable;
}
```

Alternative construction style to support later:

```ts
export interface InputFieldOptions extends FieldRenderableOptions {
  value?: string;
  placeholder?: string;
}
```

## Behavior Contract

- clicking the label area should move focus to the field when possible
- validation state should not break layout
- required state should be visible but not noisy
- disabled state should propagate visually to the wrapped control
- supporting text must not fight the control for visual priority
- horizontal layout should remain usable for dense settings surfaces

## Layout Contract

- label row above control
- description row below label when present
- validation row below control when present
- field spacing should be consistent across input types

## Deterministic Deliverable

- the input dialog in the playground uses an input field component
- at least one example shows input, textarea, and select field variants

## Passing Gate

- field snapshots cover label-only, label-plus-description, and error states
- interaction tests prove focus reaches the underlying control correctly
- validation text does not overlap adjacent content during resize

## Non-Goals

- replacing the underlying `@neotui/core` editing buffers
- owning complex form submission orchestration
- becoming a schema-driven form framework in the first pass
