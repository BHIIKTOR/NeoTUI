# CalendarRenderable

## Purpose

Provide a reusable date-grid exploration surface with deterministic keyboard and
mouse navigation.

This should be a standalone component, not just a hidden implementation detail
of date-picker, because some apps need read-only or embedded calendar views.

## Dependencies

- `@neotui/core`
- `ButtonRenderable`
- `KbdRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface CalendarRenderableOptions {
  value?: string;
  visibleMonth?: string;
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  showOutsideDays?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class CalendarRenderable extends Renderable {
  setValue(value: string): this;
  setVisibleMonth(month: string): this;
  nextMonth(): this;
  previousMonth(): this;
}
```

## Behavior Contract

- arrow keys move day focus
- page navigation changes month
- `Home` and `End` can move within a week or month as documented
- disabled days remain visible but cannot be selected

## Layout Contract

- weekday headers must remain aligned with day cells
- outside-day rendering should be consistent when enabled
- month navigation controls must not collapse the grid at narrow widths

## Deterministic Deliverable

- one example demonstrates month navigation and disabled dates
- one app surface or date-picker composes the calendar in real use

## Passing Gate

- month and day navigation tests exist
- disabled-date behavior is tested
- selected, focused, and today states are visually distinct

## Non-Goals

- timezone conversion logic
- date-range selection in the first pass
