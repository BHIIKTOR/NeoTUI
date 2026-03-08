# NeoTui

NeoTui is a Bun-first, TypeScript-first, kitty-only terminal UI toolkit.

The active workspace is entirely NeoTui:

- `@neotui/core`
- `@neotui/components`
- `@neotui/react`
- `@neotui/test-utils`
- `@neotui/fixtures`
- `apps/playground`
- `apps/ansi-viewer`
- `apps/multiplex`
- `examples`

## Quick Start

```bash
bun install
bun run build
bun run typecheck
bun run lint
bun test
bun run bench:all
bun run app:playground
bun run app:ansi-viewer
bun run app:multiplex
bun run verify:kitty
```

## Packages

### `@neotui/core`

Low-level renderer ownership, layout, event parsing, text primitives, widgets,
and kitty-native protocol helpers.

```ts
import {
  BoxRenderable,
  InputRenderable,
  createKittyRenderer,
} from "@neotui/core";

const renderer = createKittyRenderer({ appName: "demo", width: 60, height: 16 });
renderer.root.updateLayout({ padding: 1, gap: 1 });

renderer.add(
  new BoxRenderable({
    content: "NeoTui core",
    layout: { width: 24, height: 5 },
    style: { border: true, title: "hero" },
  }),
  new InputRenderable({
    value: "typed",
    layout: { width: 24, height: 3 },
  }),
);

console.log(renderer.renderToString());
```

### `@neotui/components`

Reusable app-level UI surfaces built on top of core: panels, buttons, dialogs,
menus, fields, tables, temporal input, windows, command palette, and dock
layouts.

```ts
import {
  ButtonRenderable,
  PanelRenderable,
  SidebarRenderable,
  TabsRenderable,
} from "@neotui/components";
import { TextRenderable, createKittyRenderer } from "@neotui/core";

const renderer = createKittyRenderer({ appName: "components-demo", width: 72, height: 18 });
renderer.root.updateLayout({ flexDirection: "column", gap: 1, padding: 1 });

const tabs = new TabsRenderable({
  tabs: [
    { id: "overview", label: "Overview" },
    { id: "release", label: "Release" },
  ],
  activeTabId: "overview",
});

const workspace = new PanelRenderable({
  title: "workspace",
  tone: "info",
  contentMode: "grow",
  layout: { flexDirection: "row", gap: 1, flexGrow: 1 },
});

workspace.add(
  new SidebarRenderable({
    title: "sections",
    groups: [{ id: "sections", items: [{ id: "home", label: "home" }, { id: "logs", label: "logs" }] }],
    activeItemId: "home",
    layout: { width: 18 },
  }),
  new PanelRenderable({
    title: "content",
    tone: "accent",
    contentMode: "grow",
    layout: { flexGrow: 1, gap: 1 },
  }).add(
    new TextRenderable({ content: "Reusable chrome lives in @neotui/components." }),
    new ButtonRenderable({ label: "Run", variant: "primary" }),
  ),
);

renderer.add(tabs, workspace);
console.log(renderer.renderToString());
```

### `@neotui/react`

React root integration, JSX intrinsic elements, typed wrappers over shipped
components, and hook helpers.

```tsx
import { createKittyRenderer } from "@neotui/core";
import { Button, Panel, Toolbar, createReactRoot } from "@neotui/react";

const renderer = createKittyRenderer({ appName: "react-demo", width: 48, height: 12 });
const root = createReactRoot(renderer);

root.render(
  <Panel title="react" tone="accent" layout={{ width: 30, height: 8, padding: 1, gap: 1 }}>
    <Toolbar>
      <Button label="rendered by @neotui/react" variant="primary" />
    </Toolbar>
  </Panel>,
);

console.log(renderer.renderToString());
```

## Feature Map

NeoTui currently includes:

- diffed renderer invalidation and live-mode session ownership
- flex-style layout with percentage sizing, clipping, overlays, borders, and gaps
- structured kitty-native keyboard, mouse, paste, focus, drag, and traversal semantics
- grapheme-aware text measurement, wrapping, selection, and editing primitives
- widgets for input, textarea, select, tab select, markdown, code, diff, line numbers, and image placeholders
- reusable components for panels, buttons, sidebars, tabs, dialogs, sheets, drawers, menus, fields, data tables, command palette, calendar/date picker, windows, and dock layouts
- React root integration plus typed wrappers over the component layer

## Apps and Examples

Reference apps:

- `apps/playground`
- `apps/ansi-viewer`
- `apps/multiplex`

Reference examples:

- `examples/core-basic.ts`
- `examples/layout-dashboard.ts`
- `examples/widgets-form.ts`
- `examples/kitty-features.ts`
- `examples/advanced-components.ts`
- `examples/components-primitives.ts`
- `examples/components-fields.ts`
- `examples/components-textarea.ts`
- `examples/components-dialogs.ts`
- `examples/components-command.ts`
- `examples/components-windows.ts`
- `examples/components-dock.ts`
- `examples/react-counter.tsx`
- `examples/react-login.tsx`
- `examples/react-workspace.tsx`

## Documentation

- `docs/README.md`
  Active docs index.
- `docs/components-plan.md`
  Current roadmap for the reusable component layer.
- `docs/react-components-mapping.md`
  Current React wrapper strategy and coverage notes.
- `docs/components/`
  Component family specs and completion gates.

## Current Limits

- kitty is the only supported terminal target
- Bun is the primary runtime
- React resize-driven rerender support is still limited and documented as a waiver
- performance thresholds are still documented as a waiver for the current release candidate
