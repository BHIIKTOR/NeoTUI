# DatePickerRenderable

## Purpose

Provide a disciplined date-selection component by composing field, input-like
trigger, overlay behavior, and `CalendarRenderable`.

## Dependencies

- `@neotui/core`
- `FieldRenderable`
- `CalendarRenderable`
- `DialogRenderable` or `SheetRenderable` depending on presentation mode
- foundation modules:
  - `overlay-stack`
  - `focus-trap`
  - `activate`

## Proposed Public API

```ts
export interface DatePickerRenderableOptions {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  minDate?: string;
  maxDate?: string;
  open?: boolean;
  presentation?: "popover" | "dialog" | "sheet";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DatePickerRenderable extends Renderable {
  getValue(): string | undefined;
  setValue(value: string): this;
  open(): this;
  close(): this;
}
```

## Behavior Contract

- the closed control should show the selected date or placeholder
- opening the picker should move focus into the calendar
- date selection should close the picker unless configured otherwise
- `Escape` closes and restores focus to the trigger

## Deterministic Deliverable

- one example demonstrates a field-composed date picker
- one app surface uses it in a real filter or form flow

## Passing Gate

- open, select, close, and restore-focus tests exist
- invalid, disabled, and empty states are snapshotted
- the relationship to standalone calendar usage is documented

## Non-Goals

- freeform date parsing in the first pass
- full time-zone aware date-time picking
