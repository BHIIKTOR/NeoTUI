# ButtonRenderable

## Purpose

Provide a real action primitive for the component layer so apps do not keep
faking buttons with `BoxRenderable`.

This is the first component to build because the current playground already
shows the cost of not having it: fixed-width, overly tall, fully filled,
hard-coded action boxes that are visually crude and behaviorally inconsistent.

## Current Extraction Seed

Current ad hoc button behavior lives in:

- `apps/playground/src/index.ts`

The local `createDialogButton()` helper is the canonical extraction source.

## Dependencies

- `@neotui/core`
- foundation modules:
  - `theme`
  - `interaction-state`
  - `activate`

## Proposed Public API

```ts
export interface ButtonRenderableOptions {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "compact" | "regular";
  width?: number | "auto" | "fill";
  minWidth?: number;
  disabled?: boolean;
  stretch?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ButtonRenderable extends Renderable {
  getLabel(): string;
  setLabel(label: string): this;
  setDisabled(disabled: boolean): this;
  press(): this;
}
```

Optional construct helper:

```ts
export function Button(props: ButtonRenderableOptions): ConstructNode;
```

## Events

- `press`
- `focus`
- `blur`

No `change` event is needed. Buttons are actions, not stateful selectors.

## Layout Contract

- default width should be `auto`
- text width should determine minimum width
- left and right padding should be applied automatically
- compact buttons should fit naturally in toolbars and dialog footers
- fill buttons should be allowed in forms and narrow layouts

## Interaction Contract

- mouse click should require down plus up in the button bounds
- `Enter` should activate
- `Space` should activate
- disabled buttons must not activate
- hover, focus, and pressed states must all render distinctly

## Visual Contract

Default styling targets:

- not all buttons should be fully filled by default
- secondary buttons should be quieter than primary buttons
- ghost buttons should rely on text and subtle focus chrome
- danger buttons should signal destructive actions clearly
- compact button height should not waste a full extra row of terminal space

## Deterministic Deliverable

- `ButtonRenderable` exists in `packages/components`
- the playground dialog launchers use it
- the playground dialog footer actions use it
- at least one example file demonstrates each variant

## Passing Gate

- no local `createDialogButton()` helper remains in app code
- keyboard and mouse activation tests exist
- disabled-state tests exist
- snapshots show distinct default, focus, and pressed states

## Non-Goals

- toggle-button behavior
- radio-button behavior
- split-button menus

Those can be built later once the base button primitive is stable.
