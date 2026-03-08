# PanelRenderable

## Purpose

Provide a reusable titled surface for common application chrome such as cards,
inspectors, side panels, notes panes, dashboards, and contained sections.

The project currently duplicates the same pattern repeatedly:

- bordered `BoxRenderable`
- title text
- background color
- padding
- optional footer-like status text

That duplication should become one reusable panel primitive.

## Current Extraction Seed

Primary examples live in:

- `apps/playground/src/index.ts`

Good extraction targets include:

- overview summary panel
- dialog notes panel
- drag instructions panel
- drag workspace panes

## Dependencies

- `@neotui/core`
- foundation modules:
  - `theme`
  - `chrome`

## Proposed Public API

```ts
export interface PanelRenderableOptions {
  title?: string;
  subtitle?: string;
  content?: string;
  contentMode?: "fit" | "grow" | "scroll";
  scrollDirection?: "vertical" | "horizontal" | "both";
  showScrollbars?: boolean;
  scrollbarVisibility?: "always" | "hover" | "auto";
  tone?: "default" | "accent" | "info" | "success" | "danger";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class PanelRenderable extends Renderable {
  readonly body: BoxRenderable | ScrollAreaRenderable;
  setTitle(title?: string): this;
  setSubtitle(subtitle?: string): this;
  setTone(tone: ComponentTone): this;
  setContent(content: string): this;
  scrollTo(x: number, y: number): this;
  setScrollY(y: number): this;
}
```

Optional construct helper:

```ts
export function Panel(
  props: PanelRenderableOptions,
  ...children: Array<ConstructNode | Renderable | string>
): ConstructNode;
```

## Content Policies

Panels now need an explicit body policy instead of assuming one layout mode for
every surface:

- `fit`
  The pane keeps its assigned size and constrains child layout inside the inner
  bounds. This is the right default for dashboards, cards, and data panes.
- `grow`
  The pane measures its body and expands to fit the inner content instead of
  clipping or scrolling.
- `scroll`
  The pane keeps its assigned size and mounts an internal `ScrollAreaRenderable`
  so overflowing content can scroll inside the pane with minimal indicators.

## Layout Contract

- the panel border and title bar define the chrome
- the body viewport is the only child region that receives content
- `fit` must not let child bounds exceed the panel inner bounds
- `grow` must increase preferred size to include the body content
- `scroll` must keep the pane fixed while exposing inner scrolling

## Visual Contract

- panels should visually separate chrome from content
- title styling should be consistent across the component layer
- tone colors should tint the panel without making every panel look like a
  fully saturated button
- scroll indicators should stay minimal and not add a second heavy border

## Deterministic Deliverable

- `PanelRenderable` exists
- the playground replaces repeated titled `BoxRenderable` shells where sensible
- at least one example demonstrates `fit`, `grow`, and `scroll`

## Passing Gate

- a repeated panel style block is not duplicated across the playground
- panel snapshots cover the three content policies
- panel body layout does not corrupt on resize or overflow
- fitted children stay within the panel inner bounds
