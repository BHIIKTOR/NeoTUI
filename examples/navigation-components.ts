import {
  BreadcrumbRenderable,
  PanelRenderable,
  ScrollAreaRenderable,
  SeparatorRenderable,
  SidebarRenderable,
  TabsRenderable,
} from "@neotui/components";
import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

function createNavigationRenderer() {
  const renderer = createKittyRenderer({
    appName: "navigation-components",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 28,
  });

  renderer.root.updateLayout({
    flexDirection: "column",
    gap: 1,
    padding: 1,
  });
  renderer.root.updateStyle({
    bg: "#14110f",
    fg: "#f2e7d5",
  });

  const breadcrumb = new BreadcrumbRenderable({
    items: [
      { id: "root", label: "workspace" },
      { id: "docs", label: "docs" },
      { id: "components", label: "components" },
      { id: "c3", label: "c3" },
    ],
    maxVisibleItems: 3,
  });

  const tabs = new TabsRenderable({
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "logs", label: "Logs", badge: "9" },
      { id: "metrics", label: "Metrics" },
    ],
    activeTabId: "overview",
  });

  const body = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      flexGrow: 1,
    },
  });

  const sidebar = new SidebarRenderable({
    title: "navigation",
    subtitle: "c3 surfaces",
    collapsible: true,
    groups: [
      {
        id: "main",
        label: "Main",
        items: [
          { id: "overview", label: "Overview", badge: "3" },
          { id: "inputs", label: "Inputs" },
          { id: "docs", label: "Docs", shortcut: "g d" },
        ],
      },
      {
        id: "workspace",
        label: "Workspace",
        collapsible: true,
        items: [
          { id: "preview", label: "Preview" },
          { id: "inspector", label: "Inspector" },
        ],
      },
    ],
    activeItemId: "overview",
    footerActions: [{ id: "help", label: "Help" }],
    layout: { width: 24 },
  });

  const content = new PanelRenderable({
    title: "scroll area",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
      padding: 1,
    },
  });

  const scrollArea = new ScrollAreaRenderable({
    layout: {
      flexGrow: 1,
    },
    style: {
      borderFg: "#6caee8",
      titleFg: "#9ac6ff",
      title: "content",
    },
  });

  for (let index = 1; index <= 12; index += 1) {
    scrollArea.add(
      new TextRenderable({
        content: `Line ${index}: navigation primitives now exist outside the playground.`,
        layout: { height: 1 },
      }),
    );
  }

  content.add(
    new TextRenderable({
      content: "Sidebar, tabs, breadcrumb, separator, and scroll area are now real components.",
      layout: { height: 1 },
    }),
    new SeparatorRenderable({ label: "feed" }),
    scrollArea,
  );

  body.add(sidebar, content);
  renderer.add(breadcrumb, tabs, body);
  return renderer;
}

function buildSnapshot(): string {
  return createNavigationRenderer().renderToString();
}

async function runLive(): Promise<void> {
  const renderer = createNavigationRenderer();
  try {
    renderer.start();
    console.log("navigation components demo active | Ctrl-C exits");
    while (renderer.session.isActive() && !renderer.session.isDestroyed()) {
      await Bun.sleep(50);
    }
  } finally {
    await renderer.destroy();
  }
}

if (import.meta.main) {
  if (
    process.argv.includes("--print") ||
    process.stdout.isTTY !== true ||
    process.env.TERM !== "xterm-kitty"
  ) {
    process.stdout.write(`${buildSnapshot()}\n`);
  } else {
    await runLive();
  }
}
