# ToolbarRenderable

## Purpose

Standardize horizontal action and status rows.

Right now action rows are assembled ad hoc with `BoxRenderable` containers using
`flexDirection: "row"` and `gap: 1`. That is enough to prove layout, but not
enough to define a reusable toolbar contract.

## Current Extraction Seed

Primary seeds live in:

- `apps/playground/src/index.ts`

Extraction targets:

- dialog launcher row
- dialog footer action rows
- future window title bars

## Dependencies

- `@neotui/core`
- `ButtonRenderable`
- foundation modules:
  - `theme`
  - `chrome`

## Proposed Public API

```ts
export interface ToolbarRenderableOptions {
  align?: "start" | "center" | "end" | "between";
  density?: "compact" | "regular";
  gap?: number;
  wrap?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToolbarRenderable extends Renderable {}
```

Optional future construct helper:

```ts
export function Toolbar(
  props: ToolbarRenderableOptions,
  ...children: Array<ConstructNode | Renderable | string>
): ConstructNode;
```

## Behavior Contract

- toolbar is primarily a layout and chrome component
- it should not impose its own activation model
- it should support left-aligned, centered, right-aligned, and split layouts

## Layout Contract

- compact toolbars should minimize wasted vertical space
- regular toolbars should provide enough spacing for prominent action bars
- split alignment should support "leading actions + trailing status"

## Deterministic Deliverable

- `ToolbarRenderable` exists
- all dialog footer rows in the playground use it
- the launcher row uses it

## Passing Gate

- no dialog footer manually sets row gap and height in app code
- toolbar snapshots cover alignment modes
- toolbar remains stable under narrow widths
