# SliderRenderable

## Purpose

Provide a deterministic value-range control for settings like volume, opacity,
zoom, or thresholds.

## Dependencies

- `@neotui/core`
- `FieldRenderable`
- foundation modules:
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface SliderRenderableOptions {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  disabled?: boolean;
  showValue?: boolean;
  orientation?: "horizontal" | "vertical";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SliderRenderable extends Renderable {
  getValue(): number;
  setValue(value: number): this;
}
```

## Behavior Contract

- arrow keys adjust by step
- `Home` and `End` jump to min and max
- mouse click and drag should set and scrub the value if drag support exists
- disabled state blocks changes

## Deterministic Deliverable

- one example demonstrates horizontal and vertical sliders
- one settings surface uses slider-based adjustment

## Passing Gate

- keyboard adjustment tests exist
- clamping and step rounding are tested
- displayed value formatting is documented

## Non-Goals

- multi-thumb range sliders in the first pass
