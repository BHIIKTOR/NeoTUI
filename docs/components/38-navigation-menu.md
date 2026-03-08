# NavigationMenuRenderable

## Purpose

Provide a structured navigation surface for grouped links or actions that need
more hierarchy than tabs but less persistence than a sidebar.

This is useful for:

- header navigation bars
- section jump menus
- docs or settings subnavigation
- grouped workspace destinations

## Dependencies

- `@neotui/core`
- `DropdownMenuRenderable`
- `ToolbarRenderable`
- `BadgeRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface NavigationMenuItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  disabled?: boolean;
  items?: Array<{
    id: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
}

export interface NavigationMenuRenderableOptions {
  items: NavigationMenuItem[];
  orientation?: "horizontal" | "vertical";
  activeItemId?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class NavigationMenuRenderable extends Renderable {
  setActiveItem(id: string): this;
  openItem(id: string): this;
  closeItem(id: string): this;
}
```

## Behavior Contract

- top-level items should support roving focus
- items with children should open a structured submenu or panel
- items without children should activate directly
- `Escape` closes an open child panel and returns focus to the parent item

## Layout Contract

- horizontal orientation should work in headers or toolbars
- vertical orientation should work in utility panels
- child panels must clamp to viewport bounds and remain aligned to their parent

## Deterministic Deliverable

- one example demonstrates grouped app navigation
- one app surface uses it for a real structured nav flow

## Passing Gate

- keyboard traversal tests exist
- parent-item open and close behavior is tested
- implementation reuses dropdown/menu foundations where possible

## Non-Goals

- full sitemap or file-tree navigation
- arbitrary mega-menu richness in the first pass
