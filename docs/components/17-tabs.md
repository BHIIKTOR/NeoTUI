# TabsRenderable

## Purpose

Provide a reusable tabbed navigation surface with associated panels so apps do
not keep using loosely related `TabSelectRenderable` plus hand-written panel
switching logic.

Tabs are one of the most common ways to split a medium-complexity TUI into
stable, keyboard-accessible views.

## Dependencies

- `@neotui/core`
- `ToolbarRenderable`
- `SeparatorRenderable`
- foundation modules:
  - `roving-focus`
  - `activate`
  - `interaction-state`

## Proposed Public API

```ts
export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
  badge?: string;
}

export interface TabsRenderableOptions {
  tabs: TabItem[];
  activeTabId: string;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class TabsRenderable extends Renderable {
  setActiveTab(id: string): this;
  focusTab(id: string): this;
}
```

## Structure

Planned regions:

- tab list
- active indicator or active chrome
- associated panel region managed by the consumer or a future tabs-shell helper

## Behavior Contract

- `ArrowLeft` and `ArrowRight` or `ArrowUp` and `ArrowDown` move focus between
  tabs depending on orientation
- `Enter` and `Space` activate the focused tab in manual mode
- automatic mode activates on focus movement
- mouse click activates a tab
- disabled tabs must remain visible but skip focus

## Layout Contract

- tab labels size to content but support truncation where needed
- badges and closers are future work, but badge metadata must not break spacing
- vertical tabs should align cleanly with content panes

## Deterministic Deliverable

- one example demonstrates horizontal and vertical tabs
- one app surface uses tabs instead of custom section toggles

## Passing Gate

- keyboard and mouse activation tests exist
- manual and automatic activation modes are both documented
- resize behavior is verified for long tab labels

## Non-Goals

- closable tabs in the first pass
- drag-to-reorder tabs in the first pass
