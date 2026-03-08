# ToggleGroupRenderable

## Purpose

Provide a grouped pressed-state control surface for filter bars, formatting
controls, and segmented stateful actions.

## Dependencies

- `@neotui/core`
- `ToggleRenderable`
- `ToolbarRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`

## Proposed Public API

```ts
export interface ToggleGroupItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface ToggleGroupRenderableOptions {
  items: ToggleGroupItem[];
  type?: "single" | "multiple";
  value?: string | string[];
  disabled?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToggleGroupRenderable extends Renderable {
  getValue(): string | string[] | undefined;
  setValue(value: string | string[]): this;
}
```

## Behavior Contract

- roving focus should move across items
- single mode behaves like exclusive segmented toggles
- multiple mode behaves like independent pressed-state filters
- disabled items remain visible and skip interaction

## Deterministic Deliverable

- one example demonstrates single and multiple selection groups
- one app surface uses grouped toggles for filters or formatting

## Passing Gate

- keyboard traversal and toggle tests exist
- single and multiple modes are both documented and tested
- layout remains stable at narrow widths

## Non-Goals

- arbitrary nested groups
