import { NavigationMenuRenderable, PanelRenderable } from "@neotui/components";
import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

function createNavigationRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-navigation-menu",
    width: process.stdout.columns ?? 90,
    height: process.stdout.rows ?? 20,
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

  const hero = new PanelRenderable({
    title: "components:navigation-menu",
    content:
      "Navigation menu sits between tabs and sidebar: grouped destinations, keyboard roving focus, and dropdown-backed child routes.",
    tone: "accent",
    layout: { height: 5 },
  });

  const nav = new NavigationMenuRenderable({
    items: [
      { id: "overview", label: "Overview" },
      {
        id: "docs",
        label: "Docs",
        items: [
          { id: "getting-started", label: "Getting Started" },
          { id: "components", label: "Components" },
          { id: "api", label: "API" },
        ],
      },
      { id: "settings", label: "Settings" },
    ],
    activeItemId: "components",
  });

  const content = new PanelRenderable({
    title: "workspace",
    tone: "info",
    layout: {
      flexGrow: 1,
      flexDirection: "column",
      gap: 1,
    },
  });
  content.add(
    new BoxRenderable({
      content: "Open the Docs item to inspect the grouped route menu.",
      layout: { height: 1 },
      style: {
        fg: "#c4b39d",
        bg: "#1d1916",
      },
    }),
    new TextRenderable({
      content:
        "Use Left/Right to move across top-level destinations.\nUse Down on Docs to open the grouped routes.\nEnter activates the selected destination.",
      wrapMode: "word",
      layout: { height: 3 },
    }),
  );

  renderer.add(hero, nav, content);
  return { renderer, nav };
}

function buildSnapshot(): string {
  const { renderer } = createNavigationRenderer();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, nav } = createNavigationRenderer();
  try {
    renderer.start();
    renderer.focus(nav);
    renderer.renderFrame();
    while (renderer.session.isActive() && !renderer.session.isDestroyed()) {
      await Bun.sleep(50);
    }
  } finally {
    await renderer.destroy();
  }
}

if (import.meta.main) {
  if (process.argv.includes("--print") || !isKittyInteractiveRuntime()) {
    process.stdout.write(`${buildSnapshot()}\n`);
  } else {
    await runLive();
  }
}

function isKittyInteractiveRuntime(
  env: Record<string, string | undefined> = process.env,
  stdoutIsTTY = process.stdout.isTTY,
): boolean {
  return stdoutIsTTY === true && (env.TERM === "xterm-kitty" || Boolean(env.KITTY_WINDOW_ID));
}
